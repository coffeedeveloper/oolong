const defaultSettings = require("../shared/settings-defaults.json");
const defaultContexts = defaultSettings.contexts;

const allowedCodexReasoningEfforts = new Set(["low", "medium", "high", "xhigh"]);
const allowedThemes = new Set(["cream", "light", "dark"]);

function normalizeUiLanguage(value) {
  return value === "zh" ? "zh" : "en";
}

function normalizeTheme(value) {
  return allowedThemes.has(value) ? value : defaultSettings.theme;
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

  return { id, label, prompt };
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
      return { ...context, id };
    });

  return contexts.length > 0 ? contexts : defaultContexts;
}

function normalizeSettings(value = {}) {
  value = value && typeof value === "object" ? value : {};
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
    theme: normalizeTheme(value.theme),
    launchAtLogin: Boolean(value.launchAtLogin),
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
    clipboardShortcut:
      typeof value.clipboardShortcut === "string" && value.clipboardShortcut.trim()
        ? value.clipboardShortcut.trim()
        : defaultSettings.clipboardShortcut,
    proxyEnabled: Boolean(value.proxyEnabled),
    httpProxy:
      typeof value.httpProxy === "string" ? value.httpProxy.trim() : defaultSettings.httpProxy,
    allProxy: typeof value.allProxy === "string" ? value.allProxy.trim() : defaultSettings.allProxy,
    contexts: normalizeContexts(value.contexts, value.systemPrompt)
  };
}

function normalizeStore(value = {}) {
  value = value && typeof value === "object" ? value : {};
  return {
    settings: normalizeSettings(value.settings),
    history: Array.isArray(value.history) ? value.history : []
  };
}

module.exports = {
  defaultContexts,
  defaultSettings,
  normalizeSettings,
  normalizeStore,
  normalizeTheme,
  normalizeUiLanguage
};
