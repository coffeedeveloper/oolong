const { app, BrowserWindow, clipboard, globalShortcut, ipcMain, Menu } = require("electron");
const path = require("node:path");
const { constants: fsConstants } = require("node:fs");
const fs = require("node:fs/promises");
const { spawn } = require("node:child_process");

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const serviceWorkflowName = "oolong.translate content";
const serviceWorkflowFileName = `${serviceWorkflowName}.workflow`;
const serviceContextId = "translate";
const pendingServiceUrls = [];

const defaultContexts = [
  {
    id: "translate",
    label: "translate",
    prompt: [
      "You are oolong, a precise Chinese-English translation engine.",
      "If the user text is Chinese, translate it into fluent English.",
      "If the user text is English, translate it into accurate, natural Chinese.",
      "Preserve meaning, names, numbers, code, markdown, and line breaks where appropriate.",
      "Return only the translated text. Do not explain your translation."
    ].join("\n")
  },
  {
    id: "optimize",
    label: "optimize",
    prompt: [
      "You are oolong, a precise English writing editor.",
      "Rewrite the user's English text so it sounds natural, idiomatic, and native.",
      "Preserve meaning, names, numbers, code, markdown, and line breaks where appropriate.",
      "Return only the optimized text. Do not explain your changes."
    ].join("\n")
  }
];

const defaultSettings = {
  uiLanguage: "en",
  provider: "codex",
  codexExecutable: "codex",
  codexModel: "",
  codexReasoningEffort: "low",
  codexProfile: "",
  claudeExecutable: "claude",
  claudeModel: "",
  globalShortcut: "CommandOrControl+Shift+O",
  historyLimit: 100,
  providerTimeoutSeconds: 120,
  proxyEnabled: false,
  httpProxy: "http://127.0.0.1:7890",
  allProxy: "socks5://127.0.0.1:7890",
  contexts: defaultContexts
};

let mainWindow = null;
let storePath = "";
let userBinPathsCache = null;
const allowedCodexReasoningEfforts = new Set(["low", "medium", "high", "xhigh"]);

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

function normalizeUiLanguage(value) {
  return value === "zh" ? "zh" : "en";
}

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

function appendLegacySystemPrompt(prompt, systemPrompt) {
  const legacyPrompt = typeof systemPrompt === "string" ? systemPrompt.trim() : "";
  if (!legacyPrompt) {
    return prompt;
  }

  return `${prompt}\n\nAdditional context from the user:\n${legacyPrompt}`;
}

function normalizeContext(value, index) {
  const fallback = defaultContexts[index] ?? {
    id: `context-${index + 1}`,
    label: `context ${index + 1}`,
    prompt: "Process the user text according to this context. Return only the result."
  };
  const id =
    typeof value?.id === "string" && value.id.trim() ? value.id.trim() : fallback.id;
  const label =
    typeof value?.label === "string" && value.label.trim()
      ? value.label.trim()
      : fallback.label;
  const prompt =
    typeof value?.prompt === "string" && value.prompt.trim()
      ? value.prompt.trim()
      : fallback.prompt;

  return {
    id,
    label,
    prompt
  };
}

function normalizeContexts(value, legacySystemPrompt) {
  if (!Array.isArray(value) || value.length === 0) {
    return defaultContexts.map((context) => ({
      ...context,
      prompt: appendLegacySystemPrompt(context.prompt, legacySystemPrompt)
    }));
  }

  const seenIds = new Set();
  const contexts = value
    .slice(0, 20)
    .map(normalizeContext)
    .map((context, index) => {
      let id = context.id;
      let suffix = index + 1;
      while (seenIds.has(id)) {
        suffix += 1;
        id = `${context.id}-${suffix}`;
      }
      seenIds.add(id);
      return {
        ...context,
        id
      };
    });

  return contexts.length > 0 ? contexts : defaultContexts;
}

function normalizeSettings(value = {}) {
  const provider = value.provider === "claude" ? "claude" : "codex";
  const historyLimit = Number.isFinite(Number(value.historyLimit))
    ? Math.min(500, Math.max(1, Number(value.historyLimit)))
    : defaultSettings.historyLimit;
  const providerTimeoutSeconds = Number.isFinite(Number(value.providerTimeoutSeconds))
    ? Math.min(600, Math.max(10, Number(value.providerTimeoutSeconds)))
    : defaultSettings.providerTimeoutSeconds;

  return {
    ...defaultSettings,
    ...value,
    uiLanguage: normalizeUiLanguage(value.uiLanguage),
    provider,
    codexExecutable:
      typeof value.codexExecutable === "string" && value.codexExecutable.trim()
        ? value.codexExecutable.trim()
        : defaultSettings.codexExecutable,
    codexModel: typeof value.codexModel === "string" ? value.codexModel.trim() : "",
    codexReasoningEffort:
      typeof value.codexReasoningEffort === "string" &&
      allowedCodexReasoningEfforts.has(value.codexReasoningEffort)
        ? value.codexReasoningEffort
        : defaultSettings.codexReasoningEffort,
    codexProfile: typeof value.codexProfile === "string" ? value.codexProfile.trim() : "",
    claudeExecutable:
      typeof value.claudeExecutable === "string" && value.claudeExecutable.trim()
        ? value.claudeExecutable.trim()
        : defaultSettings.claudeExecutable,
    claudeModel: typeof value.claudeModel === "string" ? value.claudeModel.trim() : "",
    historyLimit,
    providerTimeoutSeconds,
    globalShortcut:
      typeof value.globalShortcut === "string" && value.globalShortcut.trim()
        ? value.globalShortcut.trim()
        : defaultSettings.globalShortcut,
    proxyEnabled: Boolean(value.proxyEnabled),
    httpProxy:
      typeof value.httpProxy === "string" ? value.httpProxy.trim() : defaultSettings.httpProxy,
    allProxy: typeof value.allProxy === "string" ? value.allProxy.trim() : defaultSettings.allProxy,
    contexts: normalizeContexts(value.contexts, value.systemPrompt)
  };
}

function normalizeStore(value = {}) {
  return {
    settings: normalizeSettings(value.settings),
    history: Array.isArray(value.history) ? value.history : []
  };
}

async function ensureStorePath() {
  const dir = path.join(app.getPath("userData"), "data");
  await fs.mkdir(dir, { recursive: true });
  storePath = path.join(dir, "store.json");
}

async function readStore() {
  await ensureStorePath();
  try {
    const raw = await fs.readFile(storePath, "utf8");
    return normalizeStore(JSON.parse(raw));
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      console.warn("Failed to read store:", error);
    }
    return normalizeStore();
  }
}

async function writeStore(store) {
  await ensureStorePath();
  await fs.writeFile(storePath, `${JSON.stringify(normalizeStore(store), null, 2)}\n`, "utf8");
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
    minWidth: 920,
    minHeight: 640,
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
      sandbox: false
    }
  });

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

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send("focus-input");
}

function openSettingsWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
  if (mainWindow.webContents.isLoading()) {
    mainWindow.webContents.once("did-finish-load", () => {
      mainWindow?.webContents.send("open-settings");
    });
    return;
  }

  mainWindow.webContents.send("open-settings");
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
  const shortcut = normalizeSettings(settings).globalShortcut;

  if (!globalShortcut.register(shortcut, focusMainWindow)) {
    console.warn(`Failed to register global shortcut: ${shortcut}`);
    return false;
  }

  return true;
}

function findContext(settings, contextId) {
  return (
    settings.contexts.find((context) => context.id === contextId) ??
    settings.contexts.find((context) => context.id === "translate") ??
    settings.contexts[0]
  );
}

function makePrompt({ context, input }) {
  return `${context.prompt.trim()}\n\nUser text:\n${input}`;
}

function providerCommand(settings, prompt) {
  if (settings.provider === "claude") {
    const args = ["-p"];
    if (settings.claudeModel) {
      args.push("--model", settings.claudeModel);
    }
    args.push(prompt);

    return {
      command: settings.claudeExecutable,
      args,
      stdin: null
    };
  }

  const args = ["exec", "--skip-git-repo-check"];
  if (settings.codexReasoningEffort) {
    args.push("-c", `model_reasoning_effort="${settings.codexReasoningEffort}"`);
  }
  if (settings.codexModel) {
    args.push("--model", settings.codexModel);
  }
  if (settings.codexProfile) {
    args.push("--profile", settings.codexProfile);
  }
  args.push("--ephemeral", "--color", "never", "-");

  return {
    command: settings.codexExecutable,
    args,
    stdin: prompt
  };
}

function applyProxyEnv(env, settings) {
  if (!settings.proxyEnabled) {
    return env;
  }

  const httpProxy = settings.httpProxy.trim();
  const allProxy = settings.allProxy.trim();

  if (httpProxy) {
    env.http_proxy = httpProxy;
    env.https_proxy = httpProxy;
    env.HTTP_PROXY = httpProxy;
    env.HTTPS_PROXY = httpProxy;
  }

  if (allProxy) {
    env.all_proxy = allProxy;
    env.ALL_PROXY = allProxy;
  }

  return env;
}

function expandHomePath(value, home) {
  if (value === "~") {
    return home;
  }
  if (value.startsWith("~/")) {
    return path.join(home, value.slice(2));
  }
  return value;
}

async function listChildBinPaths(root, segments) {
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
      .map((entry) => path.join(root, entry.name, ...segments));
  } catch {
    return [];
  }
}

async function discoverUserBinPaths(home) {
  if (userBinPathsCache) {
    return userBinPathsCache;
  }

  const fnmRoot = path.join(home, ".local", "share", "fnm");
  const fnmAliasBins = await listChildBinPaths(path.join(fnmRoot, "aliases"), ["bin"]);
  const fnmVersionBins = await listChildBinPaths(path.join(fnmRoot, "node-versions"), [
    "installation",
    "bin"
  ]);
  const nvmVersionBins = await listChildBinPaths(path.join(home, ".nvm", "versions", "node"), [
    "bin"
  ]);

  userBinPathsCache = [
    ...fnmAliasBins,
    ...fnmVersionBins.sort((a, b) => b.localeCompare(a, undefined, { numeric: true })),
    ...nvmVersionBins.sort((a, b) => b.localeCompare(a, undefined, { numeric: true })),
    path.join(home, ".volta", "bin"),
    path.join(home, ".asdf", "shims"),
    path.join(home, ".nodenv", "shims"),
    path.join(home, ".bun", "bin"),
    path.join(home, "Library", "pnpm"),
    path.join(home, ".npm-global", "bin"),
    path.join(home, ".yarn", "bin")
  ];

  return userBinPathsCache;
}

async function buildEnv(settings) {
  const home = app.getPath("home");
  const userBinPaths = await discoverUserBinPaths(home);
  const pathParts = [
    process.env.PATH,
    ...userBinPaths,
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
    path.join(home, ".local", "bin"),
    path.join(home, ".cargo", "bin")
  ].filter(Boolean);

  const env = {
    ...process.env,
    PATH: Array.from(new Set(pathParts.flatMap((entry) => entry.split(":")).filter(Boolean))).join(":")
  };

  return applyProxyEnv(env, settings);
}

async function canExecute(filePath) {
  try {
    await fs.access(filePath, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

async function resolveFromLoginShell(command, env) {
  return new Promise((resolve) => {
    const child = spawn("/bin/zsh", ["-lic", `command -v -- ${shellQuote(command)}`], {
      env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"]
    });
    let stdout = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      resolve("");
    }, 4000);

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    child.on("error", () => {
      clearTimeout(timeout);
      resolve("");
    });
    child.on("close", async () => {
      clearTimeout(timeout);
      const matches = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      for (const match of matches.reverse()) {
        if (await canExecute(match)) {
          resolve(match);
          return;
        }
      }

      resolve("");
    });
  });
}

async function findExecutable(command, env, settings) {
  const home = app.getPath("home");
  const expandedCommand = expandHomePath(command, home);
  const hasPathSeparator = expandedCommand.includes(path.sep);
  const text = messageText(settings);

  if (hasPathSeparator) {
    if (await canExecute(expandedCommand)) {
      return expandedCommand;
    }
    throw new Error(formatMessage(text.executableNotFound, { command }));
  }

  const pathEntries = String(env.PATH || "")
    .split(path.delimiter)
    .filter(Boolean);
  for (const entry of pathEntries) {
    const candidate = path.join(entry, expandedCommand);
    if (await canExecute(candidate)) {
      return candidate;
    }
  }

  const shellResolved = await resolveFromLoginShell(expandedCommand, env);
  if (shellResolved) {
    return shellResolved;
  }

  throw new Error(formatMessage(text.executableNotFound, { command }));
}

async function runCli(settings, prompt) {
  const { command, args, stdin } = providerCommand(settings, prompt);
  const timeoutMs = settings.providerTimeoutSeconds * 1000;
  const env = await buildEnv(settings);
  const executable = await findExecutable(command, env, settings);

  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      env,
      windowsHide: true,
      stdio: [stdin ? "pipe" : "ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      const text = messageText(settings);
      reject(
        new Error(
          formatMessage(text.timeout, {
            command,
            seconds: settings.providerTimeoutSeconds
          })
        )
      );
    }, timeoutMs);

    if (stdin && child.stdin) {
      child.stdin.on("error", () => undefined);
      child.stdin.end(stdin);
    }

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (timedOut) {
        return;
      }

      if (code === 0) {
        resolve(stdout.trim());
        return;
      }

      const detail = stderr.trim() || stdout.trim() || `${command} exited with code ${code}`;
      reject(new Error(detail));
    });
  });
}

function historyPreview(text) {
  return text.replace(/\s+/g, " ").trim().slice(0, 140);
}

function sendServiceInput(request) {
  focusMainWindow();

  const deliver = () => {
    mainWindow?.webContents.send("service-input", request);
  };

  if (mainWindow?.webContents.isLoading()) {
    mainWindow.webContents.once("did-finish-load", deliver);
    return;
  }

  deliver();
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
  const store = await readStore();
  return store.settings;
});

ipcMain.handle("settings:save", async (_, settings) => {
  const store = await readStore();
  store.settings = normalizeSettings(settings);
  await writeStore(store);
  configureApplicationMenu(store.settings);
  await registerShortcut(store.settings);
  return store.settings;
});

ipcMain.handle("history:list", async () => {
  const store = await readStore();
  return store.history;
});

ipcMain.handle("history:clear", async () => {
  const store = await readStore();
  store.history = [];
  await writeStore(store);
  return [];
});

ipcMain.handle("history:delete", async (_, id) => {
  const store = await readStore();
  store.history = store.history.filter((entry) => entry.id !== id);
  await writeStore(store);
  return store.history;
});

ipcMain.handle("clipboard:copy", async (_, text) => {
  clipboard.writeText(String(text ?? ""));
  return true;
});

ipcMain.handle("action:run", async (_, request) => {
  const input = String(request?.input ?? "").trim();
  const requestedContextId = String(request?.contextId ?? request?.mode ?? "").trim();
  const store = await readStore();
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
  const output = await runCli(settings, prompt);
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

  store.history = [entry, ...store.history].slice(0, settings.historyLimit);
  await writeStore(store);
  return entry;
});

app.whenReady().then(async () => {
  const store = await readStore();
  registerProtocolClient();
  await installMacTextService();
  configureApplicationMenu(store.settings);
  createWindow();
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
