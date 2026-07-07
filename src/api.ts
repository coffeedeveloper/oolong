import type { HistoryEntry, OolongApi, PromptContext, RunRequest, Settings } from "./types";
import { defaultContexts, fallbackSettings } from "./config/defaults";
import { contextDisplayLabel, getUiText, normalizeUiLanguage } from "./i18n";

const storageKey = "oolong-preview-store";

interface PreviewStore {
  settings: Settings;
  history: HistoryEntry[];
}

const allowedCodexReasoningEfforts = new Set(["low", "medium", "high", "xhigh"]);

function normalizeContexts(value: unknown): PromptContext[] {
  if (!Array.isArray(value) || value.length === 0) {
    return defaultContexts;
  }

  const seenIds = new Set<string>();
  const contexts = value.slice(0, 20).map((item, index) => {
    const fallback = defaultContexts[index] ?? {
      id: `context-${index + 1}`,
      label: `context ${index + 1}`,
      prompt: "Process the user text according to this context. Return only the result."
    };
    const candidate = item as Partial<PromptContext>;
    const baseId =
      typeof candidate.id === "string" && candidate.id.trim() ? candidate.id.trim() : fallback.id;
    let id = baseId;
    let suffix = index + 1;
    while (seenIds.has(id)) {
      suffix += 1;
      id = `${baseId}-${suffix}`;
    }
    seenIds.add(id);

    return {
      id,
      label:
        typeof candidate.label === "string" && candidate.label.trim()
          ? candidate.label.trim()
          : fallback.label,
      prompt:
        typeof candidate.prompt === "string" && candidate.prompt.trim()
          ? candidate.prompt.trim()
          : fallback.prompt
    };
  });

  return contexts.length > 0 ? contexts : defaultContexts;
}

function normalizeSettings(value: Partial<Settings> = {}): Settings {
  return {
    ...fallbackSettings,
    ...value,
    uiLanguage: normalizeUiLanguage(value.uiLanguage),
    provider: value.provider === "claude" ? "claude" : "codex",
    codexExecutable:
      typeof value.codexExecutable === "string" && value.codexExecutable.trim()
        ? value.codexExecutable.trim()
        : fallbackSettings.codexExecutable,
    codexModel: typeof value.codexModel === "string" ? value.codexModel.trim() : "",
    codexReasoningEffort:
      typeof value.codexReasoningEffort === "string" &&
      allowedCodexReasoningEfforts.has(value.codexReasoningEffort)
        ? value.codexReasoningEffort
        : fallbackSettings.codexReasoningEffort,
    codexProfile: typeof value.codexProfile === "string" ? value.codexProfile.trim() : "",
    claudeExecutable:
      typeof value.claudeExecutable === "string" && value.claudeExecutable.trim()
        ? value.claudeExecutable.trim()
        : fallbackSettings.claudeExecutable,
    claudeModel: typeof value.claudeModel === "string" ? value.claudeModel.trim() : "",
    globalShortcut:
      typeof value.globalShortcut === "string" && value.globalShortcut.trim()
        ? value.globalShortcut.trim()
        : fallbackSettings.globalShortcut,
    clipboardShortcut:
      typeof value.clipboardShortcut === "string" && value.clipboardShortcut.trim()
        ? value.clipboardShortcut.trim()
        : fallbackSettings.clipboardShortcut,
    historyLimit: Math.min(500, Math.max(1, Number(value.historyLimit) || 100)),
    providerTimeoutSeconds: Math.min(
      600,
      Math.max(10, Number(value.providerTimeoutSeconds) || 120)
    ),
    proxyEnabled: Boolean(value.proxyEnabled),
    httpProxy: typeof value.httpProxy === "string" ? value.httpProxy.trim() : fallbackSettings.httpProxy,
    allProxy: typeof value.allProxy === "string" ? value.allProxy.trim() : fallbackSettings.allProxy,
    contexts: normalizeContexts(value.contexts)
  };
}

function readPreviewStore(): PreviewStore {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return {
        settings: fallbackSettings,
        history: []
      };
    }

    const parsed = JSON.parse(raw) as PreviewStore;
    return {
      settings: normalizeSettings(parsed.settings),
      history: Array.isArray(parsed.history) ? parsed.history : []
    };
  } catch {
    return {
      settings: fallbackSettings,
      history: []
    };
  }
}

function writePreviewStore(store: PreviewStore) {
  window.localStorage.setItem(storageKey, JSON.stringify(store));
}

function findContext(settings: Settings, contextId: string) {
  return (
    settings.contexts.find((context) => context.id === contextId) ??
    settings.contexts.find((context) => context.id === "translate") ??
    settings.contexts[0]
  );
}

function previewText(context: PromptContext, input: string, settings: Settings) {
  const text = getUiText(settings.uiLanguage);
  const label = contextDisplayLabel(context, text);
  const prefix = settings.uiLanguage === "zh" ? `【预览 ${label}】` : `[Preview ${label}]`;

  return `${prefix}\n${input.trim()}`;
}

const previewApi: OolongApi = {
  async getSettings() {
    return readPreviewStore().settings;
  },
  async saveSettings(settings) {
    const store = readPreviewStore();
    const nextSettings = normalizeSettings(settings);
    writePreviewStore({
      ...store,
      settings: nextSettings,
      history: store.history.slice(0, nextSettings.historyLimit)
    });
    return nextSettings;
  },
  async getHistory() {
    return readPreviewStore().history;
  },
  async clearHistory() {
    const store = readPreviewStore();
    writePreviewStore({
      ...store,
      history: []
    });
    return [];
  },
  async deleteHistoryEntry(id) {
    const store = readPreviewStore();
    const history = store.history.filter((entry) => entry.id !== id);
    writePreviewStore({
      ...store,
      history
    });
    return history;
  },
  async runAction(request) {
    const store = readPreviewStore();
    const context = findContext(store.settings, request.contextId);
    const output = previewText(context, request.input, store.settings);
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      contextId: context.id,
      contextLabel: context.label,
      provider: store.settings.provider,
      input: request.input.trim(),
      output,
      inputPreview: request.input.trim().replace(/\s+/g, " ").slice(0, 140),
      outputPreview: output.replace(/\s+/g, " ").slice(0, 140),
      createdAt: new Date().toISOString()
    };
    const history = [entry, ...store.history].slice(0, store.settings.historyLimit);
    writePreviewStore({
      ...store,
      history
    });
    return entry;
  },
  async copyText(text) {
    await navigator.clipboard?.writeText(text);
    return true;
  },
  onFocusInput() {
    return () => undefined;
  },
  onOpenSettings() {
    return () => undefined;
  },
  onServiceInput() {
    return () => undefined;
  },
  onClipboardQuery() {
    return () => undefined;
  }
};

export const api = window.oolong ?? previewApi;
