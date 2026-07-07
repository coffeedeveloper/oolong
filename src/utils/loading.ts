import { formatText, getUiText } from "../i18n";

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function loadingMessage(
  provider: string,
  elapsedSeconds: number,
  timeoutSeconds: number,
  text: ReturnType<typeof getUiText>
) {
  const elapsed = formatDuration(elapsedSeconds);
  const remainingSeconds = Math.max(0, timeoutSeconds - elapsedSeconds);

  if (elapsedSeconds >= Math.floor(timeoutSeconds * 0.75)) {
    return formatText(text.loading.nearlyTimedOut, {
      provider,
      elapsed,
      remaining: remainingSeconds
    });
  }

  if (elapsedSeconds >= 15) {
    return formatText(text.loading.slow, { provider, elapsed });
  }

  return formatText(text.loading.running, { provider, elapsed });
}
