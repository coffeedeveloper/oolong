import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
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
  onClear: () => void | Promise<void>;
  onOpenSettings: () => void;
  tooltipProps: TooltipPropsFactory;
}) {
  const settingsTitle = shortcutTitle(text.history.settings, settingsShortcutLabel);
  const historyListRef = useRef<HTMLDivElement>(null);
  const clearButtonRef = useRef<HTMLButtonElement>(null);
  const cancelClearButtonRef = useRef<HTMLButtonElement>(null);
  const confirmClearButtonRef = useRef<HTMLButtonElement>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    const selectedItem = historyListRef.current?.querySelector(".history-item.selected");
    if (selectedItem instanceof HTMLElement) {
      selectedItem.scrollIntoView({ block: "nearest" });
    }
  }, [selectedId]);

  useEffect(() => {
    if (confirmingClear) {
      cancelClearButtonRef.current?.focus();
    }
  }, [confirmingClear]);

  useEffect(() => {
    if (history.length === 0) {
      setConfirmingClear(false);
    }
  }, [history.length]);

  function cancelClear() {
    setConfirmingClear(false);
    requestAnimationFrame(() => clearButtonRef.current?.focus());
  }

  async function confirmClear() {
    setClearing(true);
    try {
      await onClear();
      setConfirmingClear(false);
    } finally {
      setClearing(false);
    }
  }

  function handleConfirmKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && !clearing) {
      event.preventDefault();
      cancelClear();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    if (event.shiftKey && document.activeElement === cancelClearButtonRef.current) {
      event.preventDefault();
      confirmClearButtonRef.current?.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === confirmClearButtonRef.current) {
      event.preventDefault();
      cancelClearButtonRef.current?.focus();
    }
  }

  return (
    <aside className="history-pane">
      <div className="history-header">
        <h2>{text.history.title}</h2>
        <button
          ref={clearButtonRef}
          type="button"
          onClick={() => setConfirmingClear(true)}
          disabled={history.length === 0}
        >
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

      {confirmingClear ? (
        <div
          className="history-clear-backdrop"
          role="presentation"
          onClick={clearing ? undefined : cancelClear}
        >
          <div
            className="history-clear-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="history-clear-title"
            aria-describedby="history-clear-description"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={handleConfirmKeyDown}
          >
            <Trash2 size={22} aria-hidden="true" />
            <h3 id="history-clear-title">{text.history.clearConfirmTitle}</h3>
            <p id="history-clear-description">{text.history.clearConfirmDescription}</p>
            <div className="history-clear-actions">
              <button
                ref={cancelClearButtonRef}
                type="button"
                onClick={cancelClear}
                disabled={clearing}
              >
                {text.history.cancelClear}
              </button>
              <button
                ref={confirmClearButtonRef}
                className="history-clear-confirm-button"
                type="button"
                onClick={() => void confirmClear()}
                disabled={clearing}
              >
                {clearing ? text.history.clearing : text.history.confirmClear}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
