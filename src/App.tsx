import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import {
  contextDisplayLabel,
  formatDate,
  formatText,
  getUiText,
  historyDisplayLabel,
  languageOptions
} from "./i18n";
import type { HistoryEntry, PromptContext, Settings } from "./types";

const defaultContexts: PromptContext[] = [
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

const fallbackSettings: Settings = {
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

function createContextId() {
  return `context-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function loadingMessage(
  provider: string,
  elapsedSeconds: number,
  timeoutSeconds: number,
  text: ReturnType<typeof getUiText>
) {
  const elapsed = formatDuration(elapsedSeconds);
  const remainingSeconds = Math.max(0, timeoutSeconds - elapsedSeconds);

  if (elapsedSeconds >= Math.floor(timeoutSeconds * 0.75)) {
    return formatText(text.loading.nearlyTimedOut, {
      provider,
      elapsed,
      remaining: remainingSeconds
    });
  }

  if (elapsedSeconds >= 15) {
    return formatText(text.loading.slow, { provider, elapsed });
  }

  return formatText(text.loading.running, { provider, elapsed });
}

const modifierKeys = new Set(["Alt", "Control", "Meta", "Shift"]);

function keyFromKeyboardEvent(event: KeyboardEvent<HTMLElement>) {
  if (modifierKeys.has(event.key)) {
    return "";
  }

  if (/^F\d{1,2}$/.test(event.key)) {
    return event.key;
  }

  if (/^Key[A-Z]$/.test(event.code)) {
    return event.code.slice(3);
  }

  if (/^Digit\d$/.test(event.code)) {
    return event.code.slice(5);
  }

  const keyMap: Record<string, string> = {
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    ArrowUp: "Up",
    Backquote: "`",
    Backslash: "\\",
    BracketLeft: "[",
    BracketRight: "]",
    Comma: ",",
    Enter: "Enter",
    Equal: "=",
    Escape: "Escape",
    Home: "Home",
    End: "End",
    Insert: "Insert",
    Minus: "-",
    PageDown: "PageDown",
    PageUp: "PageUp",
    Period: ".",
    Quote: "'",
    Semicolon: ";",
    Slash: "/",
    Space: "Space",
    Tab: "Tab"
  };

  return keyMap[event.code] ?? keyMap[event.key] ?? "";
}

function shortcutFromKeyboardEvent(event: KeyboardEvent<HTMLElement>) {
  const key = keyFromKeyboardEvent(event);
  if (!key || key === "Escape") {
    return "";
  }

  const parts: string[] = [];
  if (event.metaKey) {
    parts.push("CommandOrControl");
  } else if (event.ctrlKey) {
    parts.push("Control");
  }
  if (event.altKey) {
    parts.push("Alt");
  }
  if (event.shiftKey) {
    parts.push("Shift");
  }

  const isFunctionKey = /^F\d{1,2}$/.test(key);
  if (parts.length === 0 && !isFunctionKey) {
    return "";
  }

  return [...parts, key].join("+");
}

type SettingsTab = "general" | "provider" | "contexts" | "proxy";

function SettingsModal({
  settings,
  onClose,
  onSave
}: {
  settings: Settings;
  onClose: () => void;
  onSave: (settings: Settings) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Settings>(settings);
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [recordingShortcut, setRecordingShortcut] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contextError, setContextError] = useState("");
  const shortcutButtonRef = useRef<HTMLButtonElement>(null);
  const text = getUiText(draft.uiLanguage);
  const settingsTabs: Array<{ id: SettingsTab; label: string }> = [
    { id: "general", label: text.tabs.general },
    { id: "provider", label: text.tabs.provider },
    { id: "contexts", label: text.tabs.contexts },
    { id: "proxy", label: text.tabs.proxy }
  ];

  useEffect(() => {
    if (recordingShortcut) {
      shortcutButtonRef.current?.focus();
    }
  }, [recordingShortcut]);

  function updateContext(id: string, patch: Partial<PromptContext>) {
    setContextError("");
    setDraft((current) => ({
      ...current,
      contexts: current.contexts.map((context) =>
        context.id === id
          ? {
              ...context,
              ...patch
            }
          : context
      )
    }));
  }

  function addContext() {
    setContextError("");
    const contextNumber = draft.contexts.length + 1;
    const nextContext: PromptContext = {
      id: createContextId(),
      label: `${text.contexts.defaultLabel} ${contextNumber}`,
      prompt: text.contexts.defaultPrompt
    };

    setDraft((current) => ({
      ...current,
      contexts: [...current.contexts, nextContext]
    }));
  }

  function deleteContext(id: string) {
    if (draft.contexts.length <= 1) {
      setContextError(text.contexts.cannotDeleteLast);
      return;
    }

    setContextError("");
    setDraft((current) => ({
      ...current,
      contexts: current.contexts.filter((context) => context.id !== id)
    }));
  }

  function handleShortcutKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!recordingShortcut) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.key === "Escape") {
      setRecordingShortcut(false);
      return;
    }

    if (event.key === "Backspace" || event.key === "Delete") {
      setDraft((current) => ({ ...current, globalShortcut: "" }));
      setRecordingShortcut(false);
      return;
    }

    const shortcut = shortcutFromKeyboardEvent(event);
    if (!shortcut) {
      return;
    }

    setDraft((current) => ({ ...current, globalShortcut: shortcut }));
    setRecordingShortcut(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (draft.contexts.length < 1) {
      setActiveTab("contexts");
      setContextError(text.contexts.minimumRequired);
      return;
    }

    setSaving(true);
    try {
      await onSave(draft);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="settings-modal" onSubmit={handleSubmit}>
        <div className="modal-header">
          <div>
            <h2>{text.settings.title}</h2>
            <p>{text.settings.description}</p>
          </div>
          <button className="icon-button" type="button" aria-label={text.settings.closeLabel} onClick={onClose}>
            x
          </button>
        </div>

        <div className="settings-layout">
          <nav className="settings-tabs" aria-label={text.settings.sectionsLabel}>
            {settingsTabs.map((tab) => (
              <button
                type="button"
                key={tab.id}
                className={activeTab === tab.id ? "active" : ""}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="settings-panel">
            {activeTab === "general" ? (
              <section className="settings-section">
                <div className="section-heading">
                  <div>
                    <h3>{text.general.title}</h3>
                    <p>{text.general.description}</p>
                  </div>
                </div>

                <div className="settings-grid">
                  <label className="field">
                    <span>{text.general.language}</span>
                    <select
                      value={draft.uiLanguage}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          uiLanguage: event.target.value === "zh" ? "zh" : "en"
                        }))
                      }
                    >
                      {languageOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field shortcut-field">
                    <span>{text.general.globalShortcut}</span>
                    <div className="shortcut-recorder">
                      <button
                        type="button"
                        ref={shortcutButtonRef}
                        className={`shortcut-capture ${recordingShortcut ? "recording" : ""}`}
                        onClick={() => setRecordingShortcut(true)}
                        onKeyDown={handleShortcutKeyDown}
                        onBlur={() => setRecordingShortcut(false)}
                      >
                        {recordingShortcut
                          ? text.general.pressShortcut
                          : draft.globalShortcut || text.general.clickToRecord}
                      </button>
                      <button
                        type="button"
                        className="shortcut-clear"
                        onClick={() =>
                          setDraft((current) => ({ ...current, globalShortcut: "" }))
                        }
                      >
                        {text.general.clear}
                      </button>
                    </div>
                  </label>

                  <label className="field">
                    <span>{text.general.historyLimit}</span>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={draft.historyLimit}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          historyLimit: Number(event.target.value)
                        }))
                      }
                    />
                  </label>

                  <label className="field">
                    <span>{text.general.providerTimeout}</span>
                    <input
                      type="number"
                      min={10}
                      max={600}
                      value={draft.providerTimeoutSeconds}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          providerTimeoutSeconds: Number(event.target.value)
                        }))
                      }
                    />
                  </label>
                </div>
              </section>
            ) : null}

            {activeTab === "provider" ? (
              <section className="settings-section">
                <div className="section-heading">
                  <div>
                    <h3>{text.provider.title}</h3>
                    <p>{text.provider.description}</p>
                  </div>
                </div>

                <label className="field">
                  <span>{text.provider.activeProvider}</span>
                  <div className="segmented compact">
                    <button
                      type="button"
                      className={draft.provider === "codex" ? "active" : ""}
                      onClick={() => setDraft((current) => ({ ...current, provider: "codex" }))}
                    >
                      codex
                    </button>
                    <button
                      type="button"
                      className={draft.provider === "claude" ? "active" : ""}
                      onClick={() => setDraft((current) => ({ ...current, provider: "claude" }))}
                    >
                      claude
                    </button>
                  </div>
                </label>

                {draft.provider === "codex" ? (
                  <section className="provider-settings">
                    <label className="field">
                      <span>{text.provider.codexExecutable}</span>
                      <input
                        value={draft.codexExecutable}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            codexExecutable: event.target.value
                          }))
                        }
                        placeholder="codex"
                      />
                    </label>

                    <div className="provider-grid">
                      <label className="field">
                        <span>{text.provider.model}</span>
                        <input
                          value={draft.codexModel}
                          onChange={(event) =>
                            setDraft((current) => ({ ...current, codexModel: event.target.value }))
                          }
                          placeholder={text.provider.defaultValue}
                        />
                      </label>

                      <label className="field">
                        <span>{text.provider.reasoningEffort}</span>
                        <select
                          value={draft.codexReasoningEffort}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              codexReasoningEffort: event.target.value
                            }))
                          }
                        >
                          <option value="low">low</option>
                          <option value="medium">medium</option>
                          <option value="high">high</option>
                          <option value="xhigh">xhigh</option>
                        </select>
                      </label>
                    </div>

                    <label className="field">
                      <span>{text.provider.profile}</span>
                      <input
                        value={draft.codexProfile}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, codexProfile: event.target.value }))
                        }
                        placeholder={text.provider.defaultValue}
                      />
                    </label>
                  </section>
                ) : (
                  <section className="provider-settings">
                    <label className="field">
                      <span>{text.provider.claudeExecutable}</span>
                      <input
                        value={draft.claudeExecutable}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            claudeExecutable: event.target.value
                          }))
                        }
                        placeholder="claude"
                      />
                    </label>

                    <label className="field">
                      <span>{text.provider.model}</span>
                      <input
                        value={draft.claudeModel}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, claudeModel: event.target.value }))
                        }
                        placeholder={text.provider.defaultValue}
                      />
                    </label>
                  </section>
                )}
              </section>
            ) : null}

            {activeTab === "contexts" ? (
              <section className="settings-section contexts-settings">
                <div className="section-heading">
                  <div>
                    <h3>{text.contexts.title}</h3>
                    <p>{text.contexts.description}</p>
                    <p className="setting-note">{text.contexts.minimumRequired}</p>
                    {contextError ? <p className="settings-error">{contextError}</p> : null}
                  </div>
                  <button className="secondary-button" type="button" onClick={addContext}>
                    {text.contexts.add}
                  </button>
                </div>

                <div className="context-list">
                  {draft.contexts.map((context, index) => (
                    <section className="context-editor" key={context.id}>
                      <div className="context-editor-header">
                        <span>{formatText(text.contexts.itemTitle, { index: index + 1 })}</span>
                        <button
                          type="button"
                          onClick={() => deleteContext(context.id)}
                          disabled={draft.contexts.length <= 1}
                        >
                          {text.contexts.delete}
                        </button>
                      </div>

                      <label className="field">
                        <span>{text.contexts.label}</span>
                        <input
                          value={context.label}
                          onChange={(event) =>
                            updateContext(context.id, { label: event.target.value })
                          }
                          placeholder={text.contexts.labelPlaceholder}
                        />
                      </label>

                      <label className="field">
                        <span>{text.contexts.prompt}</span>
                        <textarea
                          value={context.prompt}
                          onChange={(event) =>
                            updateContext(context.id, { prompt: event.target.value })
                          }
                          rows={5}
                          placeholder={text.contexts.promptPlaceholder}
                        />
                      </label>
                    </section>
                  ))}
                </div>
              </section>
            ) : null}

            {activeTab === "proxy" ? (
              <section className="settings-section proxy-settings">
                <div className="section-heading">
                  <div>
                    <h3>{text.proxy.title}</h3>
                    <p>{text.proxy.description}</p>
                  </div>
                </div>

                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={draft.proxyEnabled}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, proxyEnabled: event.target.checked }))
                    }
                  />
                  <span>{text.proxy.useProxy}</span>
                </label>

                <div className="proxy-grid">
                  <label className="field">
                    <span>{text.proxy.httpProxy}</span>
                    <input
                      value={draft.httpProxy}
                      disabled={!draft.proxyEnabled}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, httpProxy: event.target.value }))
                      }
                      placeholder="http://127.0.0.1:7890"
                    />
                  </label>

                  <label className="field">
                    <span>{text.proxy.allProxy}</span>
                    <input
                      value={draft.allProxy}
                      disabled={!draft.proxyEnabled}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, allProxy: event.target.value }))
                      }
                      placeholder="socks5://127.0.0.1:7890"
                    />
                  </label>
                </div>
              </section>
            ) : null}
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            {text.settings.cancel}
          </button>
          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? text.settings.saving : text.settings.save}
          </button>
        </div>
      </form>
    </div>
  );
}

function HistoryList({
  history,
  selectedId,
  language,
  text,
  onSelect,
  onClear,
  onOpenSettings
}: {
  history: HistoryEntry[];
  selectedId?: string;
  language: Settings["uiLanguage"];
  text: ReturnType<typeof getUiText>;
  onSelect: (entry: HistoryEntry) => void;
  onClear: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <aside className="history-pane">
      <div className="history-header">
        <h2>{text.history.title}</h2>
        <button type="button" onClick={onClear} disabled={history.length === 0}>
          {text.history.clear}
        </button>
      </div>

      <div className="history-list">
        {history.length === 0 ? (
          <div className="empty-history">
            <span>{text.history.empty}</span>
          </div>
        ) : (
          history.map((entry) => (
            <button
              type="button"
              key={entry.id}
              className={`history-item ${entry.id === selectedId ? "selected" : ""}`}
              onClick={() => onSelect(entry)}
            >
              <span className="history-meta">
                {historyDisplayLabel(entry, text)} · {formatDate(entry.createdAt, language)}
              </span>
              <strong>{entry.inputPreview || text.history.untitled}</strong>
              <span>{entry.outputPreview || text.history.noOutput}</span>
            </button>
          ))
        )}
      </div>

      <button className="settings-button" type="button" onClick={onOpenSettings}>
        {text.history.settings}
      </button>
    </aside>
  );
}

function App() {
  const [selectedContextId, setSelectedContextId] = useState("translate");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [settings, setSettings] = useState<Settings>(fallbackSettings);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const text = getUiText(settings.uiLanguage);
  const selectedText = selectedEntry ? selectedEntry.output : output;
  const activeContext =
    settings.contexts.find((context) => context.id === selectedContextId) ??
    settings.contexts[0] ??
    defaultContexts[0];
  const canSubmit = input.trim().length > 0 && !loading && Boolean(activeContext);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const [loadedSettings, loadedHistory] = await Promise.all([
        api.getSettings(),
        api.getHistory()
      ]);

      if (!mounted) {
        return;
      }

      setSettings(loadedSettings);
      setHistory(loadedHistory);
      setSelectedContextId((current) =>
        loadedSettings.contexts.some((context) => context.id === current)
          ? current
          : loadedSettings.contexts[0]?.id ?? "translate"
      );
    }

    void load();

    const dispose = api.onFocusInput(() => {
      setSelectedEntry(null);
      requestAnimationFrame(() => textAreaRef.current?.focus());
    });
    const disposeSettings = api.onOpenSettings(() => {
      setSettingsOpen(true);
    });
    const disposeServiceInput = api.onServiceInput((request) => {
      setSelectedEntry(null);
      setSelectedContextId(request.contextId);
      setInput(request.input);
      requestAnimationFrame(() => textAreaRef.current?.focus());
      void submitRequest(request.contextId, request.input);
    });

    return () => {
      mounted = false;
      dispose();
      disposeSettings();
      disposeServiceInput();
    };
  }, []);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timer = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (!loading) {
      setElapsedSeconds(0);
      return undefined;
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    if (settings.contexts.some((context) => context.id === selectedContextId)) {
      return;
    }

    setSelectedContextId(settings.contexts[0]?.id ?? "translate");
  }, [selectedContextId, settings.contexts]);

  async function submitRequest(contextId: string, requestInput: string) {
    setError("");
    setCopied(false);
    setElapsedSeconds(0);
    setLoading(true);
    setSelectedEntry(null);

    try {
      const entry = await api.runAction({ contextId, input: requestInput });
      setOutput(entry.output);
      setHistory((current) => [entry, ...current.filter((item) => item.id !== entry.id)]);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : String(runError));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await submitRequest(activeContext.id, input);
  }

  async function handleSaveSettings(nextSettings: Settings) {
    const saved = await api.saveSettings(nextSettings);
    setSettings(saved);
    setSelectedContextId((current) =>
      saved.contexts.some((context) => context.id === current)
        ? current
        : saved.contexts[0]?.id ?? "translate"
    );
    const nextHistory = await api.getHistory();
    setHistory(nextHistory);
  }

  async function handleClearHistory() {
    const nextHistory = await api.clearHistory();
    setHistory(nextHistory);
    setSelectedEntry(null);
  }

  async function handleCopy() {
    if (!selectedText.trim()) {
      return;
    }

    await api.copyText(selectedText);
    setCopied(true);
  }

  const outputTitle = useMemo(() => {
    if (selectedEntry) {
      return formatText(text.main.contextResult, {
        context: historyDisplayLabel(selectedEntry, text)
      });
    }

    return output ? text.main.result : text.main.output;
  }, [output, selectedEntry, text]);

  return (
    <div className="shell">
      <header className="titlebar">
        <div className="traffic-spacer" />
        <h1>oolong</h1>
        <div className="provider-pill">{settings.provider}</div>
      </header>

      <div className="workspace">
        <HistoryList
          history={history}
          selectedId={selectedEntry?.id}
          language={settings.uiLanguage}
          text={text}
          onSelect={setSelectedEntry}
          onClear={handleClearHistory}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <main className="main-pane">
          {selectedEntry ? (
            <section className="detail-view">
              <div className="detail-header">
                <div>
                  <span className="eyebrow">{historyDisplayLabel(selectedEntry, text)}</span>
                  <h2>{formatDate(selectedEntry.createdAt, settings.uiLanguage)}</h2>
                </div>
                <button className="secondary-button" type="button" onClick={() => setSelectedEntry(null)}>
                  {text.main.close}
                </button>
              </div>

              <div className="detail-columns">
                <section>
                  <h3>{text.main.original}</h3>
                  <pre>{selectedEntry.input}</pre>
                </section>
                <section>
                  <h3>{text.main.output}</h3>
                  <pre>{selectedEntry.output}</pre>
                </section>
              </div>

              <button className="copy-button detail-copy" type="button" onClick={handleCopy}>
                {copied ? text.main.copied : text.main.copy}
              </button>
            </section>
          ) : (
            <>
              <form className="composer" onSubmit={handleSubmit}>
                <div className="segmented mode-switch" role="group" aria-label={text.main.chooseContext}>
                  {settings.contexts.map((context) => (
                    <button
                      type="button"
                      key={context.id}
                      className={context.id === activeContext.id ? "active" : ""}
                      onClick={() => setSelectedContextId(context.id)}
                    >
                      {contextDisplayLabel(context, text)}
                    </button>
                  ))}
                </div>

                <div className="input-wrap">
                  <textarea
                    ref={textAreaRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={formatText(text.main.pasteFor, {
                      context: contextDisplayLabel(activeContext, text)
                    })}
                    autoFocus
                  />
                  <button className="submit-button" type="submit" disabled={!canSubmit}>
                    {loading ? text.main.working : text.main.submit}
                  </button>
                </div>
              </form>

              <section className="output-section" aria-live="polite">
                <div className="output-header">
                  <div>
                    <span className="eyebrow">{outputTitle}</span>
                    {error ? <p className="error-text">{error}</p> : null}
                  </div>
                  <button
                    className="copy-button"
                    type="button"
                    onClick={handleCopy}
                    disabled={!selectedText.trim()}
                  >
                    {copied ? text.main.copied : text.main.copy}
                  </button>
                </div>

                <div className={`output-body ${!output && !loading ? "muted" : ""}`}>
                  {loading
                    ? loadingMessage(
                        settings.provider,
                        elapsedSeconds,
                        settings.providerTimeoutSeconds,
                        text
                      )
                    : output || text.main.emptyResult}
                </div>
              </section>
            </>
          )}
        </main>
      </div>

      {settingsOpen ? (
        <SettingsModal
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onSave={handleSaveSettings}
        />
      ) : null}
    </div>
  );
}

export default App;
