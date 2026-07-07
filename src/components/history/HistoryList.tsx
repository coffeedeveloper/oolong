import { useEffect, useRef } from "react";
import { Settings as SettingsIcon, Trash2 } from "lucide-react";
import { settingsShortcutLabel } from "../../config/ui";
import { formatDate, getUiText, historyDisplayLabel } from "../../i18n";
import type { TooltipPropsFactory } from "../ui/Tooltip";
import type { HistoryEntry, Settings } from "../../types";
import { shortcutTitle } from "../../utils/shortcuts";

export function HistoryList({
  history,
  selectedId,
  language,
  text,
  onSelect,
  onClear,
  onOpenSettings,
  tooltipProps
}: {
  history: HistoryEntry[];
  selectedId?: string;
  language: Settings["uiLanguage"];
  text: ReturnType<typeof getUiText>;
  onSelect: (entry: HistoryEntry) => void;
  onClear: () => void;
  onOpenSettings: () => void;
  tooltipProps: TooltipPropsFactory;
}) {
  const settingsTitle = shortcutTitle(text.history.settings, settingsShortcutLabel);
  const historyListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    const selectedItem = historyListRef.current?.querySelector(".history-item.selected");
    if (selectedItem instanceof HTMLElement) {
      selectedItem.scrollIntoView({ block: "nearest" });
    }
  }, [selectedId]);

  return (
    <aside className="history-pane">
      <div className="history-header">
        <h2>{text.history.title}</h2>
        <button type="button" onClick={onClear} disabled={history.length === 0}>
          <Trash2 size={15} aria-hidden="true" />
          <span>{text.history.clear}</span>
        </button>
      </div>

      <div className="history-list" ref={historyListRef}>
        {history.length === 0 ? (
          <div className="empty-history">
            <span>{text.history.empty}</span>
          </div>
        ) : (
          history.map((entry) => (
            <button
              type="button"
              key={entry.id}
              className={`history-item ${entry.id === selectedId ? "selected" : ""}`}
              onClick={() => onSelect(entry)}
            >
              <span className="history-meta">
                {historyDisplayLabel(entry, text)} · {formatDate(entry.createdAt, language)}
              </span>
              <strong>{entry.inputPreview || text.history.untitled}</strong>
              <span>{entry.outputPreview || text.history.noOutput}</span>
            </button>
          ))
        )}
      </div>

      <button
        className="settings-button"
        type="button"
        aria-keyshortcuts="Meta+,"
        {...tooltipProps(settingsTitle)}
        onClick={onOpenSettings}
      >
        <SettingsIcon size={16} aria-hidden="true" />
        <span>{text.history.settings}</span>
      </button>
    </aside>
  );
}
