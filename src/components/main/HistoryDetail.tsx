import { Check, Copy } from "lucide-react";
import { formatDate, getUiText, historyDisplayLabel } from "../../i18n";
import type { HistoryEntry, Settings } from "../../types";
import { MarkdownContent } from "../ui/MarkdownContent";

export function HistoryDetail({
  entry,
  language,
  text,
  copied,
  onClose,
  onCopy
}: {
  entry: HistoryEntry;
  language: Settings["uiLanguage"];
  text: ReturnType<typeof getUiText>;
  copied: boolean;
  onClose: () => void;
  onCopy: () => void;
}) {
  return (
    <section className="detail-view">
      <div className="detail-header">
        <div>
          <span className="eyebrow">{historyDisplayLabel(entry, text)}</span>
          <h2>{formatDate(entry.createdAt, language)}</h2>
        </div>
        <button className="secondary-button" type="button" onClick={onClose}>
          {text.main.close}
        </button>
      </div>

      <div className="detail-columns">
        <section>
          <h3>{text.main.original}</h3>
          <pre>{entry.input}</pre>
        </section>
        <section>
          <h3>{text.main.output}</h3>
          <MarkdownContent content={entry.output} />
        </section>
      </div>

      <button className="copy-button detail-copy" type="button" onClick={onCopy}>
        {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
        <span>{copied ? text.main.copied : text.main.copy}</span>
      </button>
    </section>
  );
}
