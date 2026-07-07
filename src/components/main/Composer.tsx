import { LoaderCircle, Send, Trash2 } from "lucide-react";
import type {
  FormEventHandler,
  KeyboardEventHandler,
  RefObject
} from "react";
import { submitAriaShortcut } from "../../config/ui";
import { contextDisplayLabel, formatText, getUiText } from "../../i18n";
import type { PromptContext } from "../../types";
import type { TooltipPropsFactory } from "../ui/Tooltip";
import {
  contextAriaShortcut,
  contextShortcutLabel,
  shortcutTitle
} from "../../utils/shortcuts";

export function Composer({
  contexts,
  activeContext,
  input,
  loading,
  canSubmit,
  canClear,
  text,
  textAreaRef,
  inputShortcutTitle,
  submitButtonTitle,
  submitButtonLabel,
  tooltipProps,
  onSubmit,
  onInputChange,
  onInputKeyDown,
  onSelectContext,
  onClear
}: {
  contexts: PromptContext[];
  activeContext: PromptContext;
  input: string;
  loading: boolean;
  canSubmit: boolean;
  canClear: boolean;
  text: ReturnType<typeof getUiText>;
  textAreaRef: RefObject<HTMLTextAreaElement | null>;
  inputShortcutTitle: string;
  submitButtonTitle: string;
  submitButtonLabel: string;
  tooltipProps: TooltipPropsFactory;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onInputChange: (value: string) => void;
  onInputKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
  onSelectContext: (contextId: string) => void;
  onClear: () => void;
}) {
  return (
    <form className="composer" onSubmit={onSubmit}>
      <div className="segmented mode-switch" role="group" aria-label={text.main.chooseContext}>
        {contexts.map((context, index) => {
          const contextLabel = contextDisplayLabel(context, text);
          const hasShortcut = index < 9;

          return (
            <button
              type="button"
              key={context.id}
              className={context.id === activeContext.id ? "active" : ""}
              aria-keyshortcuts={hasShortcut ? contextAriaShortcut(index) : undefined}
              {...tooltipProps(
                hasShortcut
                  ? shortcutTitle(contextLabel, contextShortcutLabel(index))
                  : contextLabel,
                "bottom"
              )}
              onClick={() => onSelectContext(context.id)}
            >
              {contextLabel}
            </button>
          );
        })}
      </div>

      <div className="input-wrap">
        <div className="input-field" {...tooltipProps(inputShortcutTitle)}>
          <textarea
            ref={textAreaRef}
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={onInputKeyDown}
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
            onClick={onClear}
            disabled={!canClear}
          >
            <Trash2 size={16} aria-hidden="true" />
            <span>{text.main.clear}</span>
          </button>
          <button
            className="submit-button"
            type="submit"
            aria-keyshortcuts={submitAriaShortcut}
            {...tooltipProps(submitButtonTitle)}
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
  );
}
