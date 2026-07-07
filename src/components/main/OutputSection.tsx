import { Check, Copy } from "lucide-react";
import { getUiText } from "../../i18n";
import type { Settings } from "../../types";
import { loadingMessage } from "../../utils/loading";
import { MarkdownContent } from "../ui/MarkdownContent";
import { OutputLoading } from "../ui/OutputLoading";

export function OutputSection({
  output,
  selectedText,
  outputTitle,
  error,
  copied,
  loading,
  elapsedSeconds,
  settings,
  text,
  onCopy
}: {
  output: string;
  selectedText: string;
  outputTitle: string;
  error: string;
  copied: boolean;
  loading: boolean;
  elapsedSeconds: number;
  settings: Settings;
  text: ReturnType<typeof getUiText>;
  onCopy: () => void;
}) {
  return (
    <section className="output-section" aria-live="polite">
      <div className="output-header">
        <div>
          <span className="eyebrow">{outputTitle}</span>
          {error ? <p className="error-text">{error}</p> : null}
        </div>
        <button
          className="copy-button"
          type="button"
          onClick={onCopy}
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
  );
}
