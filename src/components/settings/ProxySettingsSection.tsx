import type { Settings } from "../../types";
import type { SetSettingsDraft, SettingsText } from "./settingsTypes";

export function ProxySettingsSection({
  draft,
  setDraft,
  text
}: {
  draft: Settings;
  setDraft: SetSettingsDraft;
  text: SettingsText;
}) {
  return (
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
  );
}
