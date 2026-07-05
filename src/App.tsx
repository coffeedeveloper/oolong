import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function legacyModeLabel(mode?: string) {
  if (mode === "translate") {
    return "translate";
  }

  if (mode === "optimize") {
    return "optimize";
  }

  return mode || "context";
}

function historyContextLabel(entry: HistoryEntry) {
  return entry.contextLabel || legacyModeLabel(entry.mode);
}

function createContextId() {
  return `context-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function loadingMessage(provider: string, elapsedSeconds: number, timeoutSeconds: number) {
  const elapsed = formatDuration(elapsedSeconds);
  const remainingSeconds = Math.max(0, timeoutSeconds - elapsedSeconds);

  if (elapsedSeconds >= Math.floor(timeoutSeconds * 0.75)) {
    return `${provider} is still running. Elapsed ${elapsed}; timeout in ${remainingSeconds}s. Check proxy/network settings if this keeps happening.`;
  }

  if (elapsedSeconds >= 15) {
    return `${provider} is still running. Elapsed ${elapsed}. Long text or provider network latency can take a while.`;
  }

  return `Running ${provider}... elapsed ${elapsed}.`;
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

const settingsTabs: Array<{ id: SettingsTab; label: string }> = [
  { id: "general", label: "General" },
  { id: "provider", label: "Provider" },
  { id: "contexts", label: "Contexts" },
  { id: "proxy", label: "Proxy" }
];

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
  const shortcutButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (recordingShortcut) {
      shortcutButtonRef.current?.focus();
    }
  }, [recordingShortcut]);

  function updateContext(id: string, patch: Partial<PromptContext>) {
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
    const contextNumber = draft.contexts.length + 1;
    const nextContext: PromptContext = {
      id: createContextId(),
      label: `context ${contextNumber}`,
      prompt: "Process the user text according to this context. Return only the result."
    };

    setDraft((current) => ({
      ...current,
      contexts: [...current.contexts, nextContext]
    }));
  }

  function deleteContext(id: string) {
    setDraft((current) => ({
      ...current,
      contexts:
        current.contexts.length > 1
          ? current.contexts.filter((context) => context.id !== id)
          : current.contexts
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
            <h2>Settings</h2>
            <p>Provider, contexts, proxy, shortcut, and history size.</p>
          </div>
          <button className="icon-button" type="button" aria-label="Close settings" onClick={onClose}>
            x
          </button>
        </div>

        <div className="settings-layout">
          <nav className="settings-tabs" aria-label="Settings sections">
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
                    <h3>General</h3>
                    <p>Shortcuts, history, and timeout behavior.</p>
                  </div>
                </div>

                <div className="settings-grid">
                  <label className="field">
                    <span>Global shortcut</span>
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
                          ? "Press shortcut keys..."
                          : draft.globalShortcut || "Click to record"}
                      </button>
                      <button
                        type="button"
                        className="shortcut-clear"
                        onClick={() =>
                          setDraft((current) => ({ ...current, globalShortcut: "" }))
                        }
                      >
                        Clear
                      </button>
                    </div>
                  </label>

                  <label className="field">
                    <span>History limit</span>
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
                    <span>Provider timeout</span>
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
                    <h3>Provider</h3>
                    <p>Whitelisted CLI settings for Codex and Claude.</p>
                  </div>
                </div>

                <label className="field">
                  <span>Active provider</span>
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
                      <span>Codex executable</span>
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
                        <span>Model</span>
                        <input
                          value={draft.codexModel}
                          onChange={(event) =>
                            setDraft((current) => ({ ...current, codexModel: event.target.value }))
                          }
                          placeholder="Default"
                        />
                      </label>

                      <label className="field">
                        <span>Reasoning effort</span>
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
                      <span>Profile</span>
                      <input
                        value={draft.codexProfile}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, codexProfile: event.target.value }))
                        }
                        placeholder="Default"
                      />
                    </label>
                  </section>
                ) : (
                  <section className="provider-settings">
                    <label className="field">
                      <span>Claude executable</span>
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
                      <span>Model</span>
                      <input
                        value={draft.claudeModel}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, claudeModel: event.target.value }))
                        }
                        placeholder="Default"
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
                    <h3>Contexts</h3>
                    <p>Main screen actions are generated from these contexts.</p>
                  </div>
                  <button className="secondary-button" type="button" onClick={addContext}>
                    Add
                  </button>
                </div>

                <div className="context-list">
                  {draft.contexts.map((context, index) => (
                    <section className="context-editor" key={context.id}>
                      <div className="context-editor-header">
                        <span>Context {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => deleteContext(context.id)}
                          disabled={draft.contexts.length <= 1}
                        >
                          Delete
                        </button>
                      </div>

                      <label className="field">
                        <span>Label</span>
                        <input
                          value={context.label}
                          onChange={(event) =>
                            updateContext(context.id, { label: event.target.value })
                          }
                          placeholder="translate"
                        />
                      </label>

                      <label className="field">
                        <span>Prompt</span>
                        <textarea
                          value={context.prompt}
                          onChange={(event) =>
                            updateContext(context.id, { prompt: event.target.value })
                          }
                          rows={5}
                          placeholder="Describe how this context should transform the user text."
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
                    <h3>Proxy</h3>
                    <p>Proxy values are injected into provider CLI environment variables.</p>
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
                  <span>Use proxy</span>
                </label>

                <div className="proxy-grid">
                  <label className="field">
                    <span>HTTP proxy</span>
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
                    <span>All proxy</span>
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
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

function HistoryList({
  history,
  selectedId,
  onSelect,
  onClear,
  onOpenSettings
}: {
  history: HistoryEntry[];
  selectedId?: string;
  onSelect: (entry: HistoryEntry) => void;
  onClear: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <aside className="history-pane">
      <div className="history-header">
        <h2>History</h2>
        <button type="button" onClick={onClear} disabled={history.length === 0}>
          Clear
        </button>
      </div>

      <div className="history-list">
        {history.length === 0 ? (
          <div className="empty-history">
            <span>No history yet</span>
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
                {historyContextLabel(entry)} · {formatDate(entry.createdAt)}
              </span>
              <strong>{entry.inputPreview || "Untitled text"}</strong>
              <span>{entry.outputPreview || "No output"}</span>
            </button>
          ))
        )}
      </div>

      <button className="settings-button" type="button" onClick={onOpenSettings}>
        Settings
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

    return () => {
      mounted = false;
      dispose();
      disposeSettings();
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setCopied(false);
    setElapsedSeconds(0);
    setLoading(true);
    setSelectedEntry(null);

    try {
      const entry = await api.runAction({ contextId: activeContext.id, input });
      setOutput(entry.output);
      setHistory((current) => [entry, ...current.filter((item) => item.id !== entry.id)]);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : String(runError));
    } finally {
      setLoading(false);
    }
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
      return `${historyContextLabel(selectedEntry)} result`;
    }

    return output ? "Result" : "Output";
  }, [output, selectedEntry]);

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
          onSelect={setSelectedEntry}
          onClear={handleClearHistory}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <main className="main-pane">
          {selectedEntry ? (
            <section className="detail-view">
              <div className="detail-header">
                <div>
                  <span className="eyebrow">{historyContextLabel(selectedEntry)}</span>
                  <h2>{formatDate(selectedEntry.createdAt)}</h2>
                </div>
                <button className="secondary-button" type="button" onClick={() => setSelectedEntry(null)}>
                  Close
                </button>
              </div>

              <div className="detail-columns">
                <section>
                  <h3>Original</h3>
                  <pre>{selectedEntry.input}</pre>
                </section>
                <section>
                  <h3>Output</h3>
                  <pre>{selectedEntry.output}</pre>
                </section>
              </div>

              <button className="copy-button detail-copy" type="button" onClick={handleCopy}>
                {copied ? "Copied" : "Copy"}
              </button>
            </section>
          ) : (
            <>
              <form className="composer" onSubmit={handleSubmit}>
                <div className="segmented mode-switch" role="group" aria-label="Choose context">
                  {settings.contexts.map((context) => (
                    <button
                      type="button"
                      key={context.id}
                      className={context.id === activeContext.id ? "active" : ""}
                      onClick={() => setSelectedContextId(context.id)}
                    >
                      {context.label}
                    </button>
                  ))}
                </div>

                <div className="input-wrap">
                  <textarea
                    ref={textAreaRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={`Paste text for ${activeContext.label}...`}
                    autoFocus
                  />
                  <button className="submit-button" type="submit" disabled={!canSubmit}>
                    {loading ? "Working..." : "Submit"}
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
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>

                <div className={`output-body ${!output && !loading ? "muted" : ""}`}>
                  {loading
                    ? loadingMessage(
                        settings.provider,
                        elapsedSeconds,
                        settings.providerTimeoutSeconds
                      )
                    : output || "Your result will appear here."}
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
