import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { HistoryEntry, PromptContext } from "../types";
import {
  contextShortcutIndex,
  isEditableTarget,
  isTypingTarget
} from "../utils/shortcuts";

type AppShortcutsOptions = {
  contexts: PromptContext[];
  history: HistoryEntry[];
  selectedEntry: HistoryEntry | null;
  settingsOpen: boolean;
  focusInput: () => void;
  toggleHistoryCollapsed: () => void;
  setCopied: (copied: boolean) => void;
  setSelectedContextId: Dispatch<SetStateAction<string>>;
  setSelectedEntry: Dispatch<SetStateAction<HistoryEntry | null>>;
};

export function useAppShortcuts({
  contexts,
  history,
  selectedEntry,
  settingsOpen,
  focusInput,
  toggleHistoryCollapsed,
  setCopied,
  setSelectedContextId,
  setSelectedEntry
}: AppShortcutsOptions) {
  useEffect(() => {
    function handleSlashFocus(event: globalThis.KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (settingsOpen || selectedEntry || isTypingTarget(event.target)) {
        return;
      }

      event.preventDefault();
      focusInput();
    }

    window.addEventListener("keydown", handleSlashFocus);
    return () => window.removeEventListener("keydown", handleSlashFocus);
  }, [focusInput, selectedEntry, settingsOpen]);

  useEffect(() => {
    function handleContextShortcut(event: globalThis.KeyboardEvent) {
      if (!event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || settingsOpen) {
        return;
      }

      const shortcutIndex = contextShortcutIndex(event);
      if (shortcutIndex < 0) {
        return;
      }

      const nextContext = contexts[shortcutIndex];
      if (!nextContext) {
        return;
      }

      event.preventDefault();
      setSelectedEntry(null);
      setSelectedContextId(nextContext.id);
      focusInput();
    }

    window.addEventListener("keydown", handleContextShortcut);
    return () => window.removeEventListener("keydown", handleContextShortcut);
  }, [contexts, focusInput, setSelectedContextId, setSelectedEntry, settingsOpen]);

  useEffect(() => {
    function handleSidebarShortcut(event: globalThis.KeyboardEvent) {
      const isSidebarToggleKey = event.key === "\\" || event.code === "Backslash";

      if (
        !isSidebarToggleKey ||
        !event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        settingsOpen
      ) {
        return;
      }

      event.preventDefault();
      toggleHistoryCollapsed();
    }

    window.addEventListener("keydown", handleSidebarShortcut);
    return () => window.removeEventListener("keydown", handleSidebarShortcut);
  }, [settingsOpen, toggleHistoryCollapsed]);

  useEffect(() => {
    function handleHistoryCloseShortcut(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape" || !selectedEntry || settingsOpen || event.defaultPrevented) {
        return;
      }

      event.preventDefault();
      setCopied(false);
      setSelectedEntry(null);
      focusInput();
    }

    window.addEventListener("keydown", handleHistoryCloseShortcut);
    return () => window.removeEventListener("keydown", handleHistoryCloseShortcut);
  }, [focusInput, selectedEntry, setCopied, setSelectedEntry, settingsOpen]);

  useEffect(() => {
    function handleHistorySelectionShortcut(event: globalThis.KeyboardEvent) {
      const key = event.key.toLowerCase();
      if (
        !selectedEntry ||
        (key !== "n" && key !== "p") ||
        !event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey ||
        settingsOpen ||
        isEditableTarget(event.target)
      ) {
        return;
      }

      const selectedIndex = history.findIndex((entry) => entry.id === selectedEntry.id);
      if (selectedIndex < 0) {
        return;
      }

      const nextIndex = key === "n" ? selectedIndex + 1 : selectedIndex - 1;
      const nextEntry = history[nextIndex];
      if (!nextEntry) {
        return;
      }

      event.preventDefault();
      setCopied(false);
      setSelectedEntry(nextEntry);
    }

    window.addEventListener("keydown", handleHistorySelectionShortcut);
    return () => window.removeEventListener("keydown", handleHistorySelectionShortcut);
  }, [history, selectedEntry, setCopied, setSelectedEntry, settingsOpen]);
}
