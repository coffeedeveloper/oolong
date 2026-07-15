const path = require("node:path");
const { constants: fsConstants } = require("node:fs");
const fs = require("node:fs/promises");
const { spawn } = require("node:child_process");

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

function historyPreview(text) {
  return text.replace(/\s+/g, " ").trim().slice(0, 140);
}

function createProviderRunner({ app, formatMessage, messageText }) {
  let userBinPathsCache = null;

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
      PATH: Array.from(new Set(pathParts.flatMap((entry) => entry.split(":"))).filter(Boolean)).join(
        ":"
      )
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

  return { runCli };
}

module.exports = {
  applyProxyEnv,
  createProviderRunner,
  historyPreview,
  makePrompt,
  providerCommand
};
