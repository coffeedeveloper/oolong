import { formatText } from "../../i18n";
import type { PromptContext, Settings } from "../../types";
import type { SettingsText } from "./settingsTypes";

export function ContextsSettingsSection({
  contexts,
  contextError,
  text,
  onAdd,
  onDelete,
  onUpdate
}: {
  contexts: Settings["contexts"];
  contextError: string;
  text: SettingsText;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: Partial<PromptContext>) => void;
}) {
  return (
    <section className="settings-section contexts-settings">
      <div className="section-heading">
        <div>
          <h3>{text.contexts.title}</h3>
          <p>{text.contexts.description}</p>
          <p className="setting-note">{text.contexts.minimumRequired}</p>
          {contextError ? <p className="settings-error">{contextError}</p> : null}
        </div>
        <button className="secondary-button" type="button" onClick={onAdd}>
          {text.contexts.add}
        </button>
      </div>

      <div className="context-list">
        {contexts.map((context, index) => (
          <section className="context-editor" key={context.id}>
            <div className="context-editor-header">
              <span>{formatText(text.contexts.itemTitle, { index: index + 1 })}</span>
              <button
                type="button"
                onClick={() => onDelete(context.id)}
                disabled={contexts.length <= 1}
              >
                {text.contexts.delete}
              </button>
            </div>

            <label className="field">
              <span>{text.contexts.label}</span>
              <input
                value={context.label}
                onChange={(event) => onUpdate(context.id, { label: event.target.value })}
                placeholder={text.contexts.labelPlaceholder}
              />
            </label>

            <label className="field">
              <span>{text.contexts.prompt}</span>
              <textarea
                value={context.prompt}
                onChange={(event) => onUpdate(context.id, { prompt: event.target.value })}
                rows={5}
                placeholder={text.contexts.promptPlaceholder}
              />
            </label>
          </section>
        ))}
      </div>
    </section>
  );
}
