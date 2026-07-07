import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { getUiText } from "../../i18n";
import type { PromptContext, Settings } from "../../types";
import { createContextId } from "../../utils/context";
import { shortcutFromKeyboardEvent } from "../../utils/shortcuts";
import { ContextsSettingsSection } from "./ContextsSettingsSection";
import { GeneralSettingsSection } from "./GeneralSettingsSection";
import { ProviderSettingsSection } from "./ProviderSettingsSection";
import { ProxySettingsSection } from "./ProxySettingsSection";
import { ShortcutSettingsSection } from "./ShortcutSettingsSection";
import type { SettingsTab, ShortcutSetting } from "./settingsTypes";

export function SettingsModal({
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
          <button
            className="icon-button"
            type="button"
            aria-label={text.settings.closeLabel}
            onClick={onClose}
          >
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
              <GeneralSettingsSection draft={draft} setDraft={setDraft} text={text} />
            ) : null}

            {activeTab === "shortcuts" ? (
              <ShortcutSettingsSection
                draft={draft}
                text={text}
                recordingShortcut={recordingShortcut}
                globalShortcutButtonRef={globalShortcutButtonRef}
                clipboardShortcutButtonRef={clipboardShortcutButtonRef}
                setDraft={setDraft}
                setRecordingShortcut={setRecordingShortcut}
                onShortcutKeyDown={(key) => (event) => handleShortcutKeyDown(event, key)}
              />
            ) : null}

            {activeTab === "provider" ? (
              <ProviderSettingsSection draft={draft} setDraft={setDraft} text={text} />
            ) : null}

            {activeTab === "contexts" ? (
              <ContextsSettingsSection
                contexts={draft.contexts}
                contextError={contextError}
                text={text}
                onAdd={addContext}
                onDelete={deleteContext}
                onUpdate={updateContext}
              />
            ) : null}

            {activeTab === "proxy" ? (
              <ProxySettingsSection draft={draft} setDraft={setDraft} text={text} />
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
