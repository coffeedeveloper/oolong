import { Download, X } from "lucide-react";
import { formatText } from "../../i18n";
import type { UiText } from "../../i18n";

export function UpdateNotice({
  version,
  text,
  onDownload,
  onDismiss
}: {
  version: string;
  text: UiText;
  onDownload: () => void;
  onDismiss: () => void;
}) {
  return (
    <section className="update-notice" role="status" aria-live="polite">
      <div className="update-notice-copy">
        <strong>{text.updates.title}</strong>
        <span>{formatText(text.updates.available, { version: `v${version}` })}</span>
      </div>

      <div className="update-notice-actions">
        <button className="update-download-button" type="button" onClick={onDownload}>
          <Download size={15} aria-hidden="true" />
          <span>{text.updates.download}</span>
        </button>
        <button
          className="update-dismiss-button"
          type="button"
          aria-label={text.updates.dismiss}
          title={text.updates.dismiss}
          onClick={onDismiss}
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
