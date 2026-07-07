import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CSSProperties,
  FocusEvent,
  FormEvent,
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent
} from "react";
import ReactMarkdown from "react-markdown";
import {
  Check,
  Copy,
  LoaderCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  Settings as SettingsIcon,
  Trash2
} from "lucide-react";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
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
  clipboardShortcut: "CommandOrControl+Alt+O",
  historyLimit: 100,
  providerTimeoutSeconds: 120,
  proxyEnabled: false,
  httpProxy: "http://127.0.0.1:7890",
  allProxy: "socks5://127.0.0.1:7890",
  contexts: defaultContexts
};

type ModelOption = {
  value: string;
  label: string;
};

type TooltipPlacement = "top" | "right" | "bottom" | "left";

type TooltipState = {
  text: string;
  placement: TooltipPlacement;
  x: number;
  y: number;
};

type TooltipTargetProps = {
  onMouseEnter: (event: ReactMouseEvent<HTMLElement>) => void;
  onMouseLeave: () => void;
  onFocus: (event: FocusEvent<HTMLElement>) => void;
  onBlur: (event: FocusEvent<HTMLElement>) => void;
};

type TooltipPropsFactory = (text: string, placement?: TooltipPlacement) => TooltipTargetProps;

const customModelValue = "__custom__";
const defaultHistoryWidth = 236;
const minHistoryWidth = 150;
const maxHistoryWidth = 420;
const minMainWidth = 360;
const submitShortcutLabel = "Cmd+Enter";
const focusInputShortcutLabel = "/";
const settingsShortcutLabel = "Cmd+,";
const sidebarToggleAriaShortcut = "Meta+\\";
const submitAriaShortcut = "Meta+Enter";

const codexModelOptions: ModelOption[] = [
  { value: "gpt-5.5", label: "GPT-5.5" },
  { value: "gpt-5.4", label: "GPT-5.4" },
  { value: "gpt-5.4-mini", label: "GPT-5.4 mini" },
  { value: "gpt-5.4-nano", label: "GPT-5.4 nano" }
];

const claudeModelOptions: ModelOption[] = [
  { value: "claude-fable-5", label: "Claude Fable 5" },
  { value: "claude-opus-4-8", label: "Claude Opus 4.8" },
  { value: "claude-sonnet-5", label: "Claude Sonnet 5" },
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5" }
];

function clampHistoryWidth(value: number) {
  const availableWidth =
    typeof window === "undefined" ? maxHistoryWidth : window.innerWidth - minMainWidth - 1;
  const responsiveMaxWidth = Math.max(minHistoryWidth, Math.min(maxHistoryWidth, availableWidth));
  return Math.min(responsiveMaxWidth, Math.max(minHistoryWidth, Math.round(value)));
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest("input, textarea, select, button, [contenteditable='true'], [role='textbox']")
  );
}

function contextShortcutIndex(event: globalThis.KeyboardEvent) {
  if (/^Digit[1-9]$/.test(event.code)) {
    return Number(event.code.slice(5)) - 1;
  }

  if (/^[1-9]$/.test(event.key)) {
    return Number(event.key) - 1;
  }

  return -1;
}

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

function providerStatusText(settings: Settings) {
  const model =
    settings.provider === "claude" ? settings.claudeModel.trim() : settings.codexModel.trim();
  const modelText = model || "default";

  if (settings.provider === "codex") {
    const effort = settings.codexReasoningEffort || "default";
    return `codex - ${modelText} - ${effort}`;
  }

  return `claude - ${modelText}`;
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} skipHtml>
        {content}
      </ReactMarkdown>
    </div>
  );
}

function OutputLoading({
  message,
  elapsedSeconds,
  timeoutSeconds
}: {
  message: string;
  elapsedSeconds: number;
  timeoutSeconds: number;
}) {
  const progress = Math.min(100, Math.round((elapsedSeconds / Math.max(1, timeoutSeconds)) * 100));

  return (
    <div className="output-loading" role="status">
      <div className="output-loading-status">
        <LoaderCircle className="output-loading-spinner" size={18} aria-hidden="true" />
        <span>{message}</span>
      </div>
      <div className="output-loading-progress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="output-loading-lines" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
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

function shortcutTitle(label: string, shortcut: string) {
  return `${label} (${shortcut})`;
}

function contextShortcutLabel(index: number) {
  return `Cmd+${index + 1}`;
}

function contextAriaShortcut(index: number) {
  return `Meta+${index + 1}`;
}

function tooltipPosition(element: HTMLElement, placement: TooltipPlacement): TooltipState {
  const rect = element.getBoundingClientRect();
  const gap = 10;
  const horizontalMargin = 154;
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const clampX = (value: number) =>
    Math.min(window.innerWidth - horizontalMargin, Math.max(horizontalMargin, value));
  const clampY = (value: number) =>
    Math.min(window.innerHeight - 24, Math.max(24, value));

  if (placement === "bottom") {
    return {
      text: "",
      placement,
      x: clampX(x),
      y: clampY(rect.bottom + gap)
    };
  }

  if (placement === "right") {
    return {
      text: "",
      placement,
      x: rect.right + gap,
      y: clampY(y)
    };
  }

  if (placement === "left") {
    return {
      text: "",
      placement,
      x: rect.left - gap,
      y: clampY(y)
    };
  }

  return {
    text: "",
    placement,
    x: clampX(x),
    y: clampY(rect.top - gap)
  };
}

function TooltipOverlay({ tooltip }: { tooltip: TooltipState | null }) {
  if (!tooltip) {
    return null;
  }

  return (
    <div
      className={`app-tooltip ${tooltip.placement}`}
      style={{ left: tooltip.x, top: tooltip.y } as CSSProperties}
      role="tooltip"
    >
      {tooltip.text}
    </div>
  );
}

function ModelPicker({
  value,
  options,
  text,
  onChange
}: {
  value: string;
  options: ModelOption[];
  text: ReturnType<typeof getUiText>;
  onChange: (value: string) => void;
}) {
  const [customMode, setCustomMode] = useState(
    Boolean(value) && !options.some((option) => option.value === value)
  );
  const isKnownValue = options.some((option) => option.value === value);
  const selectValue = customMode || (value && !isKnownValue) ? customModelValue : value || "";

  return (
    <div className="model-picker">
      <select
        value={selectValue}
        onChange={(event) => {
          if (event.target.value === customModelValue) {
            setCustomMode(true);
            return;
          }

          setCustomMode(false);
          onChange(event.target.value);
        }}
      >
        <option value="">{text.provider.defaultValue}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        <option value={customModelValue}>{text.provider.customModel}</option>
      </select>

      {selectValue === customModelValue ? (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={text.provider.customModelPlaceholder}
        />
      ) : null}
    </div>
  );
}

type SettingsTab = "general" | "shortcuts" | "provider" | "contexts" | "proxy";
type ShortcutSetting = "globalShortcut" | "clipboardShortcut";

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
  const [recordingShortcut, setRecordingShortcut] = useState<ShortcutSetting | null>(null);
  const [saving, setSaving] = useState(false);
  const [contextError, setContextError] = useState("");
  const globalShortcutButtonRef = useRef<HTMLButtonElement>(null);
  const clipboardShortcutButtonRef = useRef<HTMLButtonElement>(null);
  const text = getUiText(draft.uiLanguage);
  const settingsTabs: Array<{ id: SettingsTab; label: string }> = [
    { id: "general", label: text.tabs.general },
    { id: "shortcuts", label: text.tabs.shortcuts },
    { id: "provider", label: text.tabs.provider },
    { id: "contexts", label: text.tabs.contexts },
    { id: "proxy", label: text.tabs.proxy }
  ];

  useEffect(() => {
    if (recordingShortcut === "globalShortcut") {
      globalShortcutButtonRef.current?.focus();
      return;
    }

    if (recordingShortcut === "clipboardShortcut") {
      clipboardShortcutButtonRef.current?.focus();
    }
  }, [recordingShortcut]);

  function updateShortcut(key: ShortcutSetting, shortcut: string) {
    setDraft((current) => ({ ...current, [key]: shortcut }));
  }

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

  function handleShortcutKeyDown(event: KeyboardEvent<HTMLButtonElement>, key: ShortcutSetting) {
    if (recordingShortcut !== key) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.key === "Escape") {
      setRecordingShortcut(null);
      return;
    }

    if (event.key === "Backspace" || event.key === "Delete") {
      updateShortcut(key, "");
      setRecordingShortcut(null);
      return;
    }

    const shortcut = shortcutFromKeyboardEvent(event);
    if (!shortcut) {
      return;
    }

    updateShortcut(key, shortcut);
    setRecordingShortcut(null);
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

            {activeTab === "shortcuts" ? (
              <section className="settings-section">
                <div className="section-heading">
                  <div>
                    <h3>{text.shortcuts.title}</h3>
                    <p>{text.shortcuts.description}</p>
                  </div>
                </div>

                <div className="settings-grid">
                  <label className="field shortcut-field">
                    <span>{text.shortcuts.globalShortcut}</span>
                    <div className="shortcut-recorder">
                      <button
                        type="button"
                        ref={globalShortcutButtonRef}
                        className={`shortcut-capture ${
                          recordingShortcut === "globalShortcut" ? "recording" : ""
                        }`}
                        onClick={() => setRecordingShortcut("globalShortcut")}
                        onKeyDown={(event) => handleShortcutKeyDown(event, "globalShortcut")}
                        onBlur={() => setRecordingShortcut(null)}
                      >
                        {recordingShortcut === "globalShortcut"
                          ? text.shortcuts.pressShortcut
                          : draft.globalShortcut || text.shortcuts.clickToRecord}
                      </button>
                      <button
                        type="button"
                        className="shortcut-clear"
                        onClick={() => updateShortcut("globalShortcut", "")}
                      >
                        {text.shortcuts.clear}
                      </button>
                    </div>
                  </label>

                  <label className="field shortcut-field">
                    <span>{text.shortcuts.clipboardShortcut}</span>
                    <div className="shortcut-recorder">
                      <button
                        type="button"
                        ref={clipboardShortcutButtonRef}
                        className={`shortcut-capture ${
                          recordingShortcut === "clipboardShortcut" ? "recording" : ""
                        }`}
                        onClick={() => setRecordingShortcut("clipboardShortcut")}
                        onKeyDown={(event) => handleShortcutKeyDown(event, "clipboardShortcut")}
                        onBlur={() => setRecordingShortcut(null)}
                      >
                        {recordingShortcut === "clipboardShortcut"
                          ? text.shortcuts.pressShortcut
                          : draft.clipboardShortcut || text.shortcuts.clickToRecord}
                      </button>
                      <button
                        type="button"
                        className="shortcut-clear"
                        onClick={() => updateShortcut("clipboardShortcut", "")}
                      >
                        {text.shortcuts.clear}
                      </button>
                    </div>
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
                        <ModelPicker
                          value={draft.codexModel}
                          options={codexModelOptions}
                          text={text}
                          onChange={(model) =>
                            setDraft((current) => ({ ...current, codexModel: model }))
                          }
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
                      <ModelPicker
                        value={draft.claudeModel}
                        options={claudeModelOptions}
                        text={text}
                        onChange={(model) =>
                          setDraft((current) => ({ ...current, claudeModel: model }))
                        }
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
  onOpenSettings,
  tooltipProps
}: {
  history: HistoryEntry[];
  selectedId?: string;
  language: Settings["uiLanguage"];
  text: ReturnType<typeof getUiText>;
  onSelect: (entry: HistoryEntry) => void;
  onClear: () => void;
  onOpenSettings: () => void;
  tooltipProps: TooltipPropsFactory;
}) {
  const settingsTitle = shortcutTitle(text.history.settings, settingsShortcutLabel);

  return (
    <aside className="history-pane">
      <div className="history-header">
        <h2>{text.history.title}</h2>
        <button type="button" onClick={onClear} disabled={history.length === 0}>
          <Trash2 size={15} aria-hidden="true" />
          <span>{text.history.clear}</span>
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

      <button
        className="settings-button"
        type="button"
        aria-keyshortcuts="Meta+,"
        {...tooltipProps(settingsTitle)}
        onClick={onOpenSettings}
      >
        <SettingsIcon size={16} aria-hidden="true" />
        <span>{text.history.settings}</span>
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
  const [historyWidth, setHistoryWidth] = useState(defaultHistoryWidth);
  const [resizingHistory, setResizingHistory] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const resizeStartRef = useRef({ x: 0, width: defaultHistoryWidth });
  const activeContextIdRef = useRef("translate");

  const text = getUiText(settings.uiLanguage);
  const selectedText = selectedEntry ? selectedEntry.output : output;
  const activeContext =
    settings.contexts.find((context) => context.id === selectedContextId) ??
    settings.contexts[0] ??
    defaultContexts[0];
  const canSubmit = input.trim().length > 0 && !loading && Boolean(activeContext);
  const canClear = Boolean(input || output || error || selectedEntry) && !loading;
  const providerStatus = providerStatusText(settings);
  const sidebarToggleLabel = historyCollapsed ? text.history.showSidebar : text.history.hideSidebar;
  const sidebarToggleTitle = shortcutTitle(sidebarToggleLabel, text.history.toggleSidebarShortcut);
  const inputShortcutTitle = shortcutTitle(text.main.focusInput, focusInputShortcutLabel);
  const submitButtonLabel = loading ? text.main.working : text.main.submit;
  const submitButtonTitle = shortcutTitle(submitButtonLabel, submitShortcutLabel);

  function getTooltipProps(text: string, placement: TooltipPlacement = "top"): TooltipTargetProps {
    const show = (element: HTMLElement) => {
      setTooltip({
        ...tooltipPosition(element, placement),
        text
      });
    };

    return {
      onMouseEnter: (event) => show(event.currentTarget),
      onMouseLeave: () => setTooltip(null),
      onFocus: (event) => {
        if (event.currentTarget === event.target) {
          show(event.currentTarget);
        }
      },
      onBlur: (event) => {
        if (event.currentTarget === event.target) {
          setTooltip(null);
        }
      }
    };
  }

  useEffect(() => {
    activeContextIdRef.current = activeContext.id;
  }, [activeContext.id]);

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
      setSettingsOpen(false);
      setSelectedContextId(request.contextId);
      setInput(request.input);
      requestAnimationFrame(() => textAreaRef.current?.focus());
      void submitRequest(request.contextId, request.input);
    });
    const disposeClipboardQuery = api.onClipboardQuery((request) => {
      const contextId = activeContextIdRef.current;
      setSelectedEntry(null);
      setSettingsOpen(false);
      setInput(request.input);
      requestAnimationFrame(() => textAreaRef.current?.focus());
      void submitRequest(contextId, request.input);
    });

    return () => {
      mounted = false;
      dispose();
      disposeSettings();
      disposeServiceInput();
      disposeClipboardQuery();
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
    if (!tooltip) {
      return undefined;
    }

    const hideTooltip = () => setTooltip(null);
    window.addEventListener("resize", hideTooltip);
    window.addEventListener("scroll", hideTooltip, true);

    return () => {
      window.removeEventListener("resize", hideTooltip);
      window.removeEventListener("scroll", hideTooltip, true);
    };
  }, [tooltip]);

  useEffect(() => {
    if (settingsOpen) {
      setTooltip(null);
    }
  }, [settingsOpen]);

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

  useEffect(() => {
    function handleSlashFocus(event: globalThis.KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (settingsOpen || selectedEntry || isTypingTarget(event.target)) {
        return;
      }

      event.preventDefault();
      textAreaRef.current?.focus();
    }

    window.addEventListener("keydown", handleSlashFocus);
    return () => window.removeEventListener("keydown", handleSlashFocus);
  }, [selectedEntry, settingsOpen]);

  useEffect(() => {
    function handleContextShortcut(event: globalThis.KeyboardEvent) {
      if (!event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || settingsOpen) {
        return;
      }

      const shortcutIndex = contextShortcutIndex(event);
      if (shortcutIndex < 0) {
        return;
      }

      const nextContext = settings.contexts[shortcutIndex];
      if (!nextContext) {
        return;
      }

      event.preventDefault();
      setSelectedEntry(null);
      setSelectedContextId(nextContext.id);
      requestAnimationFrame(() => textAreaRef.current?.focus());
    }

    window.addEventListener("keydown", handleContextShortcut);
    return () => window.removeEventListener("keydown", handleContextShortcut);
  }, [settings.contexts, settingsOpen]);

  useEffect(() => {
    function handleSidebarShortcut(event: globalThis.KeyboardEvent) {
      const isSidebarToggleKey = event.key === "\\" || event.code === "Backslash";

      if (
        !isSidebarToggleKey ||
        !event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        settingsOpen
      ) {
        return;
      }

      event.preventDefault();
      setResizingHistory(false);
      setHistoryCollapsed((current) => !current);
    }

    window.addEventListener("keydown", handleSidebarShortcut);
    return () => window.removeEventListener("keydown", handleSidebarShortcut);
  }, [settingsOpen]);

  useEffect(() => {
    if (!resizingHistory) {
      return undefined;
    }

    const originalCursor = document.body.style.cursor;
    const originalUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function handlePointerMove(event: PointerEvent) {
      const nextWidth = resizeStartRef.current.width + event.clientX - resizeStartRef.current.x;
      setHistoryWidth(clampHistoryWidth(nextWidth));
    }

    function handlePointerEnd() {
      setResizingHistory(false);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd, { once: true });
    window.addEventListener("pointercancel", handlePointerEnd, { once: true });

    return () => {
      document.body.style.cursor = originalCursor;
      document.body.style.userSelect = originalUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
    };
  }, [resizingHistory]);

  function handleHistoryResizePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (historyCollapsed) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    resizeStartRef.current = {
      x: event.clientX,
      width: historyWidth
    };
    setResizingHistory(true);
  }

  function handleHistoryResizeKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (historyCollapsed) {
      return;
    }

    const step = event.shiftKey ? 32 : 12;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setHistoryWidth((current) => clampHistoryWidth(current - step));
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      setHistoryWidth((current) => clampHistoryWidth(current + step));
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setHistoryWidth(minHistoryWidth);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setHistoryWidth(maxHistoryWidth);
    }
  }

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
    if (!canSubmit) {
      return;
    }

    await submitRequest(activeContext.id, input);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key !== "Enter" ||
      !event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }

    event.preventDefault();
    if (canSubmit) {
      event.currentTarget.form?.requestSubmit();
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

  function handleClearMain() {
    setInput("");
    setOutput("");
    setError("");
    setCopied(false);
    setSelectedEntry(null);
    requestAnimationFrame(() => textAreaRef.current?.focus());
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
        <div className="titlebar-left">
          <div className="traffic-spacer" />
          <button
            className="titlebar-button"
            type="button"
            aria-label={sidebarToggleLabel}
            aria-keyshortcuts={sidebarToggleAriaShortcut}
            aria-expanded={!historyCollapsed}
            {...getTooltipProps(sidebarToggleTitle, "bottom")}
            onClick={() => {
              setHistoryCollapsed((current) => !current);
              setResizingHistory(false);
            }}
          >
            {historyCollapsed ? (
              <PanelLeftOpen size={16} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={16} aria-hidden="true" />
            )}
          </button>
        </div>
        <h1>oolong</h1>
        <div className="provider-pill" {...getTooltipProps(providerStatus, "bottom")}>
          <span>{providerStatus}</span>
        </div>
      </header>

      <div
        className={`workspace ${resizingHistory ? "resizing-sidebar" : ""} ${
          historyCollapsed ? "history-collapsed" : ""
        }`}
        style={{ "--history-width": `${historyWidth}px` } as CSSProperties}
      >
        {!historyCollapsed ? (
          <>
            <HistoryList
              history={history}
              selectedId={selectedEntry?.id}
              language={settings.uiLanguage}
              text={text}
              onSelect={setSelectedEntry}
              onClear={handleClearHistory}
              onOpenSettings={() => setSettingsOpen(true)}
              tooltipProps={getTooltipProps}
            />

            <div
              className="sidebar-resizer"
              role="separator"
              aria-label={text.history.resizeSidebar}
              aria-orientation="vertical"
              aria-valuemin={minHistoryWidth}
              aria-valuemax={maxHistoryWidth}
              aria-valuenow={historyWidth}
              tabIndex={0}
              {...getTooltipProps(text.history.resizeSidebar, "right")}
              onPointerDown={handleHistoryResizePointerDown}
              onKeyDown={handleHistoryResizeKeyDown}
            />
          </>
        ) : null}

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
                  <MarkdownContent content={selectedEntry.output} />
                </section>
              </div>

              <button className="copy-button detail-copy" type="button" onClick={handleCopy}>
                {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                <span>{copied ? text.main.copied : text.main.copy}</span>
              </button>
            </section>
          ) : (
            <>
              <form className="composer" onSubmit={handleSubmit}>
                <div className="segmented mode-switch" role="group" aria-label={text.main.chooseContext}>
                  {settings.contexts.map((context, index) => {
                    const contextLabel = contextDisplayLabel(context, text);
                    const hasShortcut = index < 9;

                    return (
                      <button
                        type="button"
                        key={context.id}
                        className={context.id === activeContext.id ? "active" : ""}
                        aria-keyshortcuts={hasShortcut ? contextAriaShortcut(index) : undefined}
                        {...getTooltipProps(
                          hasShortcut
                            ? shortcutTitle(contextLabel, contextShortcutLabel(index))
                            : contextLabel,
                          "bottom"
                        )}
                        onClick={() => setSelectedContextId(context.id)}
                      >
                        {contextLabel}
                      </button>
                    );
                  })}
                </div>

                <div className="input-wrap">
                  <div className="input-field" {...getTooltipProps(inputShortcutTitle)}>
                    <textarea
                      ref={textAreaRef}
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={handleInputKeyDown}
                      placeholder={formatText(text.main.pasteFor, {
                        context: contextDisplayLabel(activeContext, text)
                      })}
                      autoFocus
                    />
                  </div>
                  <div className="input-actions">
                    <button
                      className="input-clear-button"
                      type="button"
                      onClick={handleClearMain}
                      disabled={!canClear}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                      <span>{text.main.clear}</span>
                    </button>
                    <button
                      className="submit-button"
                      type="submit"
                      aria-keyshortcuts={submitAriaShortcut}
                      {...getTooltipProps(submitButtonTitle)}
                      disabled={!canSubmit}
                    >
                      {loading ? (
                        <LoaderCircle className="button-spinner" size={16} aria-hidden="true" />
                      ) : (
                        <Send size={16} aria-hidden="true" />
                      )}
                      <span>{submitButtonLabel}</span>
                    </button>
                  </div>
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
                    {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                    <span>{copied ? text.main.copied : text.main.copy}</span>
                  </button>
                </div>

                <div className={`output-body ${!output && !loading ? "muted" : ""}`}>
                  {loading ? (
                    <OutputLoading
                      message={loadingMessage(
                        settings.provider,
                        elapsedSeconds,
                        settings.providerTimeoutSeconds,
                        text
                      )}
                      elapsedSeconds={elapsedSeconds}
                      timeoutSeconds={settings.providerTimeoutSeconds}
                    />
                  ) : output ? (
                    <MarkdownContent content={output} />
                  ) : (
                    text.main.emptyResult
                  )}
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

      <TooltipOverlay tooltip={tooltip} />
    </div>
  );
}

export default App;
