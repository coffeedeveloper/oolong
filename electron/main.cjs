const { app, BrowserWindow, clipboard, globalShortcut, ipcMain, Menu } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const { spawn } = require("node:child_process");

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

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
const allowedCodexReasoningEfforts = new Set(["low", "medium", "high", "xhigh"]);

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

function configureApplicationMenu() {
  const isMac = process.platform === "darwin";
  const settingsItem = {
    label: isMac ? "Preferences..." : "Settings...",
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
            label: "File",
            submenu: [settingsItem, { type: "separator" }, { role: "quit" }]
          }
        ]),
    {
      label: "Edit",
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

  const args = ["exec"];
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

function buildEnv(settings) {
  const home = app.getPath("home");
  const pathParts = [
    process.env.PATH,
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

function runCli(settings, prompt) {
  const { command, args, stdin } = providerCommand(settings, prompt);
  const timeoutMs = settings.providerTimeoutSeconds * 1000;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: buildEnv(settings),
      windowsHide: true,
      stdio: [stdin ? "pipe" : "ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      reject(
        new Error(
          `${command} timed out after ${settings.providerTimeoutSeconds} seconds. Check proxy/network settings or increase Provider timeout in Settings.`
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

ipcMain.handle("settings:get", async () => {
  const store = await readStore();
  return store.settings;
});

ipcMain.handle("settings:save", async (_, settings) => {
  const store = await readStore();
  store.settings = normalizeSettings(settings);
  await writeStore(store);
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

  if (!input) {
    throw new Error("Please enter text first.");
  }

  const store = await readStore();
  const settings = normalizeSettings(store.settings);
  const context = findContext(settings, requestedContextId);
  if (!context) {
    throw new Error("Please configure at least one context in Settings.");
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
  configureApplicationMenu();
  createWindow();
  await registerShortcut(store.settings);

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
