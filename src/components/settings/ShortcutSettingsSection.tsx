import type {
  KeyboardEventHandler,
  RefObject
} from "react";
import type { Settings } from "../../types";
import type {
  SetSettingsDraft,
  SettingsText,
  ShortcutSetting
} from "./settingsTypes";

export function ShortcutSettingsSection({
  draft,
  text,
  recordingShortcut,
  globalShortcutButtonRef,
  clipboardShortcutButtonRef,
  setDraft,
  setRecordingShortcut,
  onShortcutKeyDown
}: {
  draft: Settings;
  text: SettingsText;
  recordingShortcut: ShortcutSetting | null;
  globalShortcutButtonRef: RefObject<HTMLButtonElement | null>;
  clipboardShortcutButtonRef: RefObject<HTMLButtonElement | null>;
  setDraft: SetSettingsDraft;
  setRecordingShortcut: (shortcut: ShortcutSetting | null) => void;
  onShortcutKeyDown: (key: ShortcutSetting) => KeyboardEventHandler<HTMLButtonElement>;
}) {
  function updateShortcut(key: ShortcutSetting, shortcut: string) {
    setDraft((current) => ({ ...current, [key]: shortcut }));
  }

  return (
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
              onKeyDown={onShortcutKeyDown("globalShortcut")}
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
              onKeyDown={onShortcutKeyDown("clipboardShortcut")}
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
  );
}
