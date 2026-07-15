const { app, BrowserWindow, clipboard, globalShortcut, ipcMain, Menu, net, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const { spawn } = require("node:child_process");
const { normalizeExternalUrl } = require("./external-links.cjs");
const {
  createProviderRunner,
  historyPreview,
  makePrompt
} = require("./provider-runner.cjs");
const {
  defaultSettings,
  normalizeSettings,
  normalizeStore,
  normalizeUiLanguage
} = require("./settings.cjs");
const { createJsonStore } = require("./store.cjs");
const { createUpdateChecker, latestReleaseUrl } = require("./update-check.cjs");

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const serviceWorkflowName = "oolong.translate content";
const serviceWorkflowFileName = `${serviceWorkflowName}.workflow`;
const serviceContextId = "translate";
const pendingServiceUrls = [];

let mainWindow = null;
const updateChecker = createUpdateChecker({ app, net });

const uiMessages = {
  en: {
    preferences: "Preferences...",
    settings: "Settings...",
    file: "File",
    edit: "Edit",
    emptyInput: "Please enter text first.",
    missingContext: "Please configure at least one context in Settings.",
    timeout:
      "{command} timed out after {seconds} seconds. Check proxy/network settings or increase Provider timeout in Settings.",
    executableNotFound:
      "Could not find {command}. Set an absolute executable path in Settings > Provider, or install it in a standard user bin path."
  },
  zh: {
    preferences: "偏好设置...",
    settings: "设置...",
    file: "文件",
    edit: "编辑",
    emptyInput: "请先输入文本。",
    missingContext: "请先在设置中至少配置一个场景。",
    timeout: "{command} 在 {seconds} 秒后超时。请检查代理/网络设置，或在设置中调大服务超时时间。",
    executableNotFound:
      "找不到 {command}。请在设置 > 模型服务中配置绝对可执行文件路径，或将它安装到标准用户 bin 路径。"
  }
};

function messageText(settings) {
  return uiMessages[normalizeUiLanguage(settings?.uiLanguage)];
}

function formatMessage(value, params) {
  return Object.entries(params).reduce(
    (result, [key, replacement]) =>
      result.split(`{${key}}`).join(String(replacement)),
    value
  );
}

const providerRunner = createProviderRunner({ app, formatMessage, messageText });

const appStore = createJsonStore({
  getFilePath: () => path.join(app.getPath("userData"), "data", "store.json"),
  normalize: normalizeStore
});

function syncLoginItemState(settings) {
  if (process.platform !== "darwin" || !app.isPackaged) {
    return settings;
  }

  return {
    ...settings,
    launchAtLogin: app.getLoginItemSettings().openAtLogin
  };
}

function applyLoginItemSetting(settings) {
  if (process.platform !== "darwin" || !app.isPackaged) {
    return settings;
  }

  const current = app.getLoginItemSettings();
  if (current.openAtLogin !== settings.launchAtLogin) {
    app.setLoginItemSettings({ openAtLogin: settings.launchAtLogin });
  }

  return syncLoginItemState(settings);
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function writeFileIfChanged(filePath, content) {
  try {
    const current = await fs.readFile(filePath, "utf8");
    if (current === content) {
      return false;
    }
  } catch (error) {
    if (!error || error.code !== "ENOENT") {
      throw error;
    }
  }

  await fs.writeFile(filePath, content, "utf8");
  return true;
}

function serviceShellScript() {
  return [
    "set -e",
    "selected_text=\"$(cat)\"",
    "if [ -z \"$selected_text\" ]; then",
    "  exit 0",
    "fi",
    "tmp_file=\"${TMPDIR:-/tmp}/oolong-service-$(uuidgen).txt\"",
    "printf \"%s\" \"$selected_text\" > \"$tmp_file\"",
    "/usr/bin/open \"oolong://translate?source=service&file=$tmp_file\""
  ].join("\n");
}

function serviceInfoPlist() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en_US</string>
  <key>CFBundleIdentifier</key>
  <string>dev.oolong.app.service.translate</string>
  <key>CFBundleName</key>
  <string>${xmlEscape(serviceWorkflowName)}</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>NSServices</key>
  <array>
    <dict>
      <key>NSMenuItem</key>
      <dict>
        <key>default</key>
        <string>${xmlEscape(serviceWorkflowName)}</string>
      </dict>
      <key>NSMessage</key>
      <string>runWorkflowAsService</string>
      <key>NSSendTypes</key>
      <array>
        <string>public.utf8-plain-text</string>
      </array>
    </dict>
  </array>
</dict>
</plist>
`;
}

function serviceVersionPlist() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>BuildVersion</key>
  <string>1</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
</dict>
</plist>
`;
}

function serviceDocumentWorkflow() {
  const command = xmlEscape(serviceShellScript());

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>AMApplicationBuild</key>
  <string>346</string>
  <key>AMApplicationVersion</key>
  <string>2.3</string>
  <key>AMDocumentVersion</key>
  <string>2</string>
  <key>actions</key>
  <array>
    <dict>
      <key>action</key>
      <dict>
        <key>ActionBundlePath</key>
        <string>/System/Library/Automator/Run Shell Script.action</string>
        <key>ActionName</key>
        <string>Run Shell Script</string>
        <key>ActionParameters</key>
        <dict>
          <key>CheckedForUserDefaultShell</key>
          <true/>
          <key>COMMAND_STRING</key>
          <string>${command}</string>
          <key>inputMethod</key>
          <integer>0</integer>
          <key>shell</key>
          <string>/bin/bash</string>
          <key>source</key>
          <string></string>
        </dict>
        <key>AMAccepts</key>
        <dict>
          <key>Container</key>
          <string>List</string>
          <key>Optional</key>
          <true/>
          <key>Types</key>
          <array>
            <string>com.apple.cocoa.string</string>
          </array>
        </dict>
        <key>AMActionVersion</key>
        <string>2.0.3</string>
        <key>AMApplication</key>
        <array>
          <string>Automator</string>
        </array>
        <key>AMParameterProperties</key>
        <dict>
          <key>CheckedForUserDefaultShell</key>
          <dict/>
          <key>COMMAND_STRING</key>
          <dict/>
          <key>inputMethod</key>
          <dict/>
          <key>shell</key>
          <dict/>
          <key>source</key>
          <dict/>
        </dict>
        <key>AMProvides</key>
        <dict>
          <key>Container</key>
          <string>List</string>
          <key>Types</key>
          <array>
            <string>com.apple.cocoa.string</string>
          </array>
        </dict>
        <key>BundleIdentifier</key>
        <string>com.apple.RunShellScript</string>
        <key>CanShowSelectedItemsWhenRun</key>
        <false/>
        <key>CanShowWhenRun</key>
        <true/>
        <key>Category</key>
        <array>
          <string>AMCategoryUtilities</string>
        </array>
        <key>CFBundleVersion</key>
        <string>2.0.3</string>
        <key>Class Name</key>
        <string>RunShellScriptAction</string>
        <key>InputUUID</key>
        <string>4B4241FE-FC63-4F43-B503-A4EA5174F600</string>
        <key>Keywords</key>
        <array>
          <string>Shell</string>
          <string>Script</string>
          <string>Command</string>
          <string>Run</string>
          <string>Unix</string>
        </array>
        <key>OutputUUID</key>
        <string>51DC59D0-8885-4755-A61A-D060FD68325E</string>
        <key>UUID</key>
        <string>5AF8432C-BD56-44CD-9CE8-BD2E4F29C3D1</string>
        <key>UnlocalizedApplications</key>
        <array>
          <string>Automator</string>
        </array>
        <key>isViewVisible</key>
        <true/>
        <key>location</key>
        <string>309.500000:631.000000</string>
        <key>nibPath</key>
        <string>/System/Library/Automator/Run Shell Script.action/Contents/Resources/en.lproj/main.nib</string>
      </dict>
      <key>isViewVisible</key>
      <true/>
    </dict>
  </array>
  <key>connectors</key>
  <dict/>
  <key>workflowMetaData</key>
  <dict>
    <key>serviceApplicationBundleID</key>
    <string></string>
    <key>serviceApplicationPath</key>
    <string></string>
    <key>serviceInputTypeIdentifier</key>
    <string>com.apple.Automator.text</string>
    <key>serviceOutputTypeIdentifier</key>
    <string>com.apple.Automator.nothing</string>
    <key>serviceProcessesInput</key>
    <integer>1</integer>
    <key>workflowTypeIdentifier</key>
    <string>com.apple.Automator.servicesMenu</string>
  </dict>
</dict>
</plist>
`;
}

function registerProtocolClient() {
  if (process.platform !== "darwin") {
    return;
  }

  if (isDev) {
    app.setAsDefaultProtocolClient("oolong", process.execPath, [path.resolve(__dirname, "..")]);
    return;
  }

  app.setAsDefaultProtocolClient("oolong");
}

async function flushServicesMenu() {
  if (process.platform !== "darwin") {
    return;
  }

  await new Promise((resolve) => {
    const child = spawn("/System/Library/CoreServices/pbs", ["-flush"], {
      stdio: "ignore",
      windowsHide: true
    });
    child.on("error", resolve);
    child.on("close", resolve);
  });
}

async function installMacTextService() {
  if (process.platform !== "darwin") {
    return;
  }

  const servicesDir = path.join(app.getPath("home"), "Library", "Services");
  const workflowDir = path.join(servicesDir, serviceWorkflowFileName);
  const contentsDir = path.join(workflowDir, "Contents");
  const resourcesDir = path.join(contentsDir, "Resources");
  await fs.mkdir(resourcesDir, { recursive: true });

  const didChange = [
    await writeFileIfChanged(path.join(contentsDir, "Info.plist"), serviceInfoPlist()),
    await writeFileIfChanged(path.join(contentsDir, "version.plist"), serviceVersionPlist()),
    await writeFileIfChanged(path.join(resourcesDir, "document.wflow"), serviceDocumentWorkflow())
  ].some(Boolean);

  if (didChange) {
    await flushServicesMenu();
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 620,
    minHeight: 560,
    title: "oolong",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: {
      x: 18,
      y: 18
    },
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.webContents.on("will-navigate", (event) => {
    event.preventDefault();
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  mainWindow.webContents.on("before-input-event", (event, input) => {
    if ((input.meta || input.control) && input.key === ",") {
      event.preventDefault();
      openSettingsWindow();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();

  return mainWindow;
}

function sendToMainWindow(channel, payload) {
  const window = showMainWindow();
  const deliver = () => {
    if (!window.isDestroyed()) {
      window.webContents.send(channel, payload);
    }
  };

  if (window.webContents.isLoading()) {
    window.webContents.once("did-finish-load", deliver);
    return;
  }

  deliver();
}

function focusMainWindow() {
  sendToMainWindow("focus-input");
}

function queryClipboardFromShortcut() {
  const input = clipboard.readText();
  if (!input.trim()) {
    focusMainWindow();
    return;
  }

  sendToMainWindow("clipboard-query", {
    source: "global-shortcut",
    input
  });
}

function openSettingsWindow() {
  sendToMainWindow("open-settings");
}

function configureApplicationMenu(settings = defaultSettings) {
  const isMac = process.platform === "darwin";
  const text = messageText(settings);
  const settingsItem = {
    label: isMac ? text.preferences : text.settings,
    accelerator: "CommandOrControl+,",
    click: openSettingsWindow
  };
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              settingsItem,
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" }
            ]
          }
        ]
      : [
          {
            label: text.file,
            submenu: [settingsItem, { type: "separator" }, { role: "quit" }]
          }
        ]),
    {
      label: text.edit,
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function registerShortcut(settings) {
  globalShortcut.unregisterAll();
  const normalizedSettings = normalizeSettings(settings);
  const shortcuts = [
    {
      accelerator: normalizedSettings.globalShortcut,
      label: "focus global shortcut",
      handler: focusMainWindow
    },
    {
      accelerator: normalizedSettings.clipboardShortcut,
      label: "clipboard global shortcut",
      handler: queryClipboardFromShortcut
    }
  ];
  const registeredShortcuts = new Set();
  let registeredAll = true;

  for (const item of shortcuts) {
    const shortcut = item.accelerator.trim();
    if (!shortcut) {
      continue;
    }

    const shortcutKey = shortcut.toLowerCase();
    if (registeredShortcuts.has(shortcutKey)) {
      console.warn(`Skipped duplicate ${item.label}: ${shortcut}`);
      registeredAll = false;
      continue;
    }

    if (!globalShortcut.register(shortcut, item.handler)) {
      console.warn(`Failed to register ${item.label}: ${shortcut}`);
      registeredAll = false;
      continue;
    }

    registeredShortcuts.add(shortcutKey);
  }

  return registeredAll;
}

function findContext(settings, contextId) {
  return (
    settings.contexts.find((context) => context.id === contextId) ??
    settings.contexts.find((context) => context.id === "translate") ??
    settings.contexts[0]
  );
}

function sendServiceInput(request) {
  sendToMainWindow("service-input", request);
}

async function handleServiceUrl(rawUrl) {
  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch (error) {
    console.warn("Ignoring invalid service URL:", rawUrl, error);
    return;
  }

  if (parsedUrl.protocol !== "oolong:") {
    return;
  }

  const action = parsedUrl.hostname || parsedUrl.pathname.replace(/^\/+/, "");
  if (action !== "translate") {
    return;
  }

  const filePath = parsedUrl.searchParams.get("file");
  const text = parsedUrl.searchParams.get("text");
  let input = typeof text === "string" ? text : "";

  if (filePath) {
    try {
      input = await fs.readFile(filePath, "utf8");
      await fs.unlink(filePath).catch(() => undefined);
    } catch (error) {
      console.warn("Failed to read service input file:", filePath, error);
      return;
    }
  }

  if (!input.trim()) {
    return;
  }

  sendServiceInput({
    source: "macos-service",
    contextId: serviceContextId,
    input
  });
}

app.on("open-url", (event, url) => {
  event.preventDefault();
  if (app.isReady()) {
    void handleServiceUrl(url);
    return;
  }

  pendingServiceUrls.push(url);
});

ipcMain.handle("settings:get", async () => {
  const store = await appStore.read();
  return syncLoginItemState(store.settings);
});

ipcMain.handle("settings:save", async (_, settings) => {
  const savedSettings = applyLoginItemSetting(normalizeSettings(settings));
  await appStore.update((store) => {
    store.settings = savedSettings;
  });
  configureApplicationMenu(savedSettings);
  await registerShortcut(savedSettings);
  return savedSettings;
});

ipcMain.handle("updates:check", () => updateChecker.checkForUpdates());

ipcMain.handle("updates:open-download", async () => {
  await shell.openExternal(latestReleaseUrl);
  return true;
});

ipcMain.handle("external-link:open", async (_, value) => {
  const url = normalizeExternalUrl(value);
  if (!url) {
    return false;
  }

  await shell.openExternal(url);
  return true;
});

ipcMain.handle("history:list", async () => {
  const store = await appStore.read();
  return store.history;
});

ipcMain.handle("history:clear", () =>
  appStore.update((store) => {
    store.history = [];
    return [];
  })
);

ipcMain.handle("history:delete", (_, id) =>
  appStore.update((store) => {
    store.history = store.history.filter((entry) => entry.id !== id);
    return store.history;
  })
);

ipcMain.handle("clipboard:copy", async (_, text) => {
  clipboard.writeText(String(text ?? ""));
  return true;
});

const macTextServiceScript = `
ObjC.import("AppKit");

function run(argv) {
  const serviceName = argv[0];
  const text = argv[1];
  const pasteboard = $.NSPasteboard.pasteboardWithUniqueName;
  pasteboard.clearContents;

  if (!pasteboard.setStringForType($(text), $.NSPasteboardTypeString)) {
    throw new Error("Could not write the query text to the service pasteboard.");
  }

  return Boolean($.NSPerformService($(serviceName), pasteboard));
}
`;

function performMacTextService(serviceName, text) {
  if (process.platform !== "darwin") {
    return Promise.resolve(false);
  }

  return new Promise((resolve, reject) => {
    const child = spawn(
      "/usr/bin/osascript",
      ["-l", "JavaScript", "-e", macTextServiceScript, "--", serviceName, text],
      {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
      }
    );
    let stdout = "";
    let stderr = "";
    let settled = false;
    let timeout = null;

    const finish = (callback) => {
      if (settled) {
        return;
      }

      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      callback();
    };

    child.stdout.on("data", (chunk) => {
      stdout = `${stdout}${chunk}`.slice(-8192);
    });
    child.stderr.on("data", (chunk) => {
      stderr = `${stderr}${chunk}`.slice(-8192);
    });
    child.on("error", (error) => finish(() => reject(error)));
    child.on("close", (code) => {
      finish(() => {
        if (code !== 0) {
          reject(new Error(stderr.trim() || `macOS service exited with code ${code}.`));
          return;
        }

        resolve(stdout.trim() === "true");
      });
    });

    timeout = setTimeout(() => {
      child.kill();
      finish(() => reject(new Error("macOS service timed out.")));
    }, 5000);
  });
}

const queryToolHandlers = new Map([
  [
    "dictionary",
    async (text) => {
      await shell.openExternal(`dict://${encodeURIComponent(text)}`);
      return true;
    }
  ],
  [
    "youdao",
    (text) => performMacTextService("有道翻译 \u2022 查询选中内容", text)
  ]
]);

ipcMain.handle("query-tool:open", async (_, request) => {
  const toolId = String(request?.toolId ?? "").trim();
  const text = String(request?.text ?? "").trim();
  const handler = queryToolHandlers.get(toolId);

  if (!handler || !text || text.length > 500) {
    return false;
  }

  return handler(text);
});

ipcMain.handle("action:run", async (_, request) => {
  const input = String(request?.input ?? "").trim();
  const requestedContextId = String(request?.contextId ?? request?.mode ?? "").trim();
  const store = await appStore.read();
  const settings = normalizeSettings(store.settings);
  const text = messageText(settings);

  if (!input) {
    throw new Error(text.emptyInput);
  }

  const context = findContext(settings, requestedContextId);
  if (!context) {
    throw new Error(text.missingContext);
  }

  const prompt = makePrompt({ context, input });
  const output = await providerRunner.runCli(settings, prompt);
  const now = new Date().toISOString();
  const entry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    contextId: context.id,
    contextLabel: context.label,
    provider: settings.provider,
    input,
    output,
    inputPreview: historyPreview(input),
    outputPreview: historyPreview(output),
    createdAt: now
  };

  await appStore.update((latestStore) => {
    latestStore.history = [entry, ...latestStore.history].slice(
      0,
      latestStore.settings.historyLimit
    );
  });
  return entry;
});

app.whenReady().then(async () => {
  const store = await appStore.read();
  registerProtocolClient();
  configureApplicationMenu(store.settings);
  createWindow();
  void installMacTextService().catch((error) => {
    console.warn("Failed to install macOS text service:", error);
  });
  await registerShortcut(store.settings);
  for (const url of pendingServiceUrls.splice(0)) {
    void handleServiceUrl(url);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      focusMainWindow();
    }
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
