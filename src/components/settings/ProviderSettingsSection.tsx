import { claudeModelOptions, codexModelOptions } from "../../config/providerModels";
import type { Settings } from "../../types";
import { ModelPicker } from "./ModelPicker";
import type { SetSettingsDraft, SettingsText } from "./settingsTypes";

export function ProviderSettingsSection({
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
                onChange={(model) => setDraft((current) => ({ ...current, codexModel: model }))}
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
              onChange={(model) => setDraft((current) => ({ ...current, claudeModel: model }))}
            />
          </label>
        </section>
      )}
    </section>
  );
}
