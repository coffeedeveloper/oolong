import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent, KeyboardEvent } from "react";
import { BookOpen } from "lucide-react";
import { api } from "./api";
import { Composer } from "./components/main/Composer";
import { HistoryDetail } from "./components/main/HistoryDetail";
import { OutputSection } from "./components/main/OutputSection";
import { Titlebar } from "./components/main/Titlebar";
import { HistoryList } from "./components/history/HistoryList";
import { SidebarResizer } from "./components/history/SidebarResizer";
import { SettingsModal } from "./components/settings/SettingsModal";
import { SelectionContextMenu } from "./components/ui/SelectionContextMenu";
import { TooltipOverlay } from "./components/ui/Tooltip";
import { defaultContexts, fallbackSettings } from "./config/defaults";
import { submitShortcutLabel } from "./config/ui";
import { useAppShortcuts } from "./hooks/useAppShortcuts";
import { useElapsedTimer } from "./hooks/useElapsedTimer";
import { useHistorySidebar } from "./hooks/useHistorySidebar";
import { useTooltip } from "./hooks/useTooltip";
import { formatText, getUiText, historyDisplayLabel } from "./i18n";
import type { HistoryEntry, Settings } from "./types";
import { providerStatusText } from "./utils/provider";
import { shortcutTitle } from "./utils/shortcuts";

function App() {
  const [selectedContextId, setSelectedContextId] = useState("translate");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [settings, setSettings] = useState<Settings>(fallbackSettings);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const activeContextIdRef = useRef("translate");

  const {
    historyWidth,
    resizingHistory,
    historyCollapsed,
    minHistoryWidth,
    maxHistoryWidth,
    toggleHistoryCollapsed,
    handleHistoryResizePointerDown,
    handleHistoryResizeKeyDown
  } = useHistorySidebar();
  const { elapsedSeconds, resetElapsedSeconds } = useElapsedTimer(loading);
  const { tooltip, hideTooltip, getTooltipProps } = useTooltip();

  const text = getUiText(settings.uiLanguage);
  const selectedText = selectedEntry ? selectedEntry.output : output;
  const activeContext =
    settings.contexts.find((context) => context.id === selectedContextId) ??
    settings.contexts[0] ??
    defaultContexts[0];
  const canSubmit = input.trim().length > 0 && !loading && Boolean(activeContext);
  const canClear = Boolean(input || output || error || selectedEntry) && !loading;
  const providerStatus = providerStatusText(settings);
  const sidebarToggleLabel = historyCollapsed ? text.history.showSidebar : text.history.hideSidebar;
  const sidebarToggleTitle = shortcutTitle(sidebarToggleLabel, text.history.toggleSidebarShortcut);
  const submitButtonLabel = loading ? text.main.working : text.main.submit;
  const submitButtonTitle = shortcutTitle(submitButtonLabel, submitShortcutLabel);
  const queryToolActions = useMemo(
    () => [
      {
        id: "dictionary",
        label: text.queryTools.dictionarySearch,
        icon: BookOpen,
        onSelect: (selectedText: string) =>
          api.openQueryTool({ toolId: "dictionary", text: selectedText })
      }
    ],
    [text.queryTools.dictionarySearch]
  );

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => textAreaRef.current?.focus());
  }, []);

  const submitRequest = useCallback(
    async (contextId: string, requestInput: string) => {
      setError("");
      setCopied(false);
      resetElapsedSeconds();
      setLoading(true);
      setSelectedEntry(null);

      try {
        const entry = await api.runAction({ contextId, input: requestInput });
        setOutput(entry.output);
        setHistory((current) => [entry, ...current.filter((item) => item.id !== entry.id)]);
      } catch (runError) {
        setError(runError instanceof Error ? runError.message : String(runError));
      } finally {
        setLoading(false);
      }
    },
    [resetElapsedSeconds]
  );

  useEffect(() => {
    activeContextIdRef.current = activeContext.id;
  }, [activeContext.id]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const [loadedSettings, loadedHistory] = await Promise.all([
        api.getSettings(),
        api.getHistory()
      ]);

      if (!mounted) {
        return;
      }

      setSettings(loadedSettings);
      setHistory(loadedHistory);
      setSelectedContextId((current) =>
        loadedSettings.contexts.some((context) => context.id === current)
          ? current
          : loadedSettings.contexts[0]?.id ?? "translate"
      );
    }

    void load();

    const dispose = api.onFocusInput(() => {
      setSelectedEntry(null);
      focusInput();
    });
    const disposeSettings = api.onOpenSettings(() => {
      setSettingsOpen(true);
    });
    const disposeServiceInput = api.onServiceInput((request) => {
      setSelectedEntry(null);
      setSettingsOpen(false);
      setSelectedContextId(request.contextId);
      setInput(request.input);
      focusInput();
      void submitRequest(request.contextId, request.input);
    });
    const disposeClipboardQuery = api.onClipboardQuery((request) => {
      const contextId = activeContextIdRef.current;
      setSelectedEntry(null);
      setSettingsOpen(false);
      setInput(request.input);
      focusInput();
      void submitRequest(contextId, request.input);
    });

    return () => {
      mounted = false;
      dispose();
      disposeSettings();
      disposeServiceInput();
      disposeClipboardQuery();
    };
  }, [focusInput, submitRequest]);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timer = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (settingsOpen) {
      hideTooltip();
    }
  }, [hideTooltip, settingsOpen]);

  useEffect(() => {
    if (settings.contexts.some((context) => context.id === selectedContextId)) {
      return;
    }

    setSelectedContextId(settings.contexts[0]?.id ?? "translate");
  }, [selectedContextId, settings.contexts]);

  useAppShortcuts({
    contexts: settings.contexts,
    history,
    selectedEntry,
    settingsOpen,
    focusInput,
    toggleHistoryCollapsed,
    setCopied,
    setSelectedContextId,
    setSelectedEntry
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    await submitRequest(activeContext.id, input);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key !== "Enter" ||
      !event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }

    event.preventDefault();
    if (canSubmit) {
      event.currentTarget.form?.requestSubmit();
    }
  }

  async function handleSaveSettings(nextSettings: Settings) {
    const saved = await api.saveSettings(nextSettings);
    setSettings(saved);
    setSelectedContextId((current) =>
      saved.contexts.some((context) => context.id === current)
        ? current
        : saved.contexts[0]?.id ?? "translate"
    );
    const nextHistory = await api.getHistory();
    setHistory(nextHistory);
  }

  async function handleClearHistory() {
    const nextHistory = await api.clearHistory();
    setHistory(nextHistory);
    setSelectedEntry(null);
  }

  function handleClearMain() {
    setInput("");
    setOutput("");
    setError("");
    setCopied(false);
    setSelectedEntry(null);
    focusInput();
  }

  async function handleCopy() {
    if (!selectedText.trim()) {
      return;
    }

    await api.copyText(selectedText);
    setCopied(true);
  }

  const outputTitle = useMemo(() => {
    if (selectedEntry) {
      return formatText(text.main.contextResult, {
        context: historyDisplayLabel(selectedEntry, text)
      });
    }

    return output ? text.main.result : text.main.output;
  }, [output, selectedEntry, text]);

  return (
    <div className="shell">
      <Titlebar
        historyCollapsed={historyCollapsed}
        sidebarToggleLabel={sidebarToggleLabel}
        sidebarToggleTitle={sidebarToggleTitle}
        providerStatus={providerStatus}
        tooltipProps={getTooltipProps}
        onToggleSidebar={toggleHistoryCollapsed}
      />

      <div
        className={`workspace ${resizingHistory ? "resizing-sidebar" : ""} ${
          historyCollapsed ? "history-collapsed" : ""
        }`}
        style={{ "--history-width": `${historyWidth}px` } as CSSProperties}
      >
        {!historyCollapsed ? (
          <>
            <HistoryList
              history={history}
              selectedId={selectedEntry?.id}
              language={settings.uiLanguage}
              text={text}
              onSelect={setSelectedEntry}
              onClear={handleClearHistory}
              onOpenSettings={() => setSettingsOpen(true)}
              tooltipProps={getTooltipProps}
            />

            <SidebarResizer
              text={text}
              minWidth={minHistoryWidth}
              maxWidth={maxHistoryWidth}
              width={historyWidth}
              onPointerDown={handleHistoryResizePointerDown}
              onKeyDown={handleHistoryResizeKeyDown}
            />
          </>
        ) : null}

        <main className="main-pane">
          {selectedEntry ? (
            <HistoryDetail
              entry={selectedEntry}
              language={settings.uiLanguage}
              text={text}
              copied={copied}
              onClose={() => setSelectedEntry(null)}
              onCopy={handleCopy}
            />
          ) : (
            <>
              <Composer
                contexts={settings.contexts}
                activeContext={activeContext}
                input={input}
                loading={loading}
                canSubmit={canSubmit}
                canClear={canClear}
                text={text}
                textAreaRef={textAreaRef}
                submitButtonTitle={submitButtonTitle}
                submitButtonLabel={submitButtonLabel}
                tooltipProps={getTooltipProps}
                onSubmit={handleSubmit}
                onInputChange={setInput}
                onInputKeyDown={handleInputKeyDown}
                onSelectContext={setSelectedContextId}
                onClear={handleClearMain}
              />

              <OutputSection
                output={output}
                selectedText={selectedText}
                outputTitle={outputTitle}
                error={error}
                copied={copied}
                loading={loading}
                elapsedSeconds={elapsedSeconds}
                settings={settings}
                text={text}
                onCopy={handleCopy}
              />
            </>
          )}
        </main>
      </div>

      {settingsOpen ? (
        <SettingsModal
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onSave={handleSaveSettings}
        />
      ) : null}

      <TooltipOverlay tooltip={tooltip} />
      <SelectionContextMenu actions={queryToolActions} menuLabel={text.queryTools.menuLabel} />
    </div>
  );
}

export default App;
