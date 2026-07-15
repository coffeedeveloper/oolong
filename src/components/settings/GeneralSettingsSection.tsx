import { languageOptions } from "../../i18n";
import type { Settings } from "../../types";
import type { SetSettingsDraft, SettingsText } from "./settingsTypes";

export function GeneralSettingsSection({
  draft,
  setDraft,
  text
}: {
  draft: Settings;
  setDraft: SetSettingsDraft;
  text: SettingsText;
}) {
  return (
    <section className="settings-section">
      <div className="section-heading">
        <div>
          <h3>{text.general.title}</h3>
          <p>{text.general.description}</p>
        </div>
      </div>

      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={draft.launchAtLogin}
          onChange={(event) =>
            setDraft((current) => ({ ...current, launchAtLogin: event.target.checked }))
          }
        />
        <span>{text.general.launchAtLogin}</span>
      </label>

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
  );
}
