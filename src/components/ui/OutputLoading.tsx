import { LoaderCircle } from "lucide-react";

export function OutputLoading({
  message,
  elapsedSeconds,
  timeoutSeconds
}: {
  message: string;
  elapsedSeconds: number;
  timeoutSeconds: number;
}) {
  const progress = Math.min(100, Math.round((elapsedSeconds / Math.max(1, timeoutSeconds)) * 100));

  return (
    <div className="output-loading" role="status">
      <div className="output-loading-status">
        <LoaderCircle className="output-loading-spinner" size={18} aria-hidden="true" />
        <span>{message}</span>
      </div>
      <div className="output-loading-progress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="output-loading-lines" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
