import { Check, Copy, LoaderCircle, Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { api } from "../../api";
import { defaultContexts, fallbackSettings } from "../../config/defaults";
import { submitAriaShortcut } from "../../config/ui";
import { contextDisplayLabel, formatText, getUiText } from "../../i18n";
import type { Settings } from "../../types";
import {
  contextAriaShortcut,
  contextShortcutIndex,
  contextShortcutLabel
} from "../../utils/shortcuts";
import { applyTheme } from "../../utils/theme";
import { MarkdownContent } from "../ui/MarkdownContent";

export function MenuBarApp() {
  const [settings, setSettings] = useState<Settings>(fallbackSettings);
  const [selectedContextId, setSelectedContextId] = useState("translate");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const mountedRef = useRef(true);
  const text = getUiText(settings.uiLanguage);
  const activeContext =
    settings.contexts.find((context) => context.id === selectedContextId) ??
    settings.contexts[0] ??
    defaultContexts[0];
  const canSubmit = Boolean(activeContext) && input.trim().length > 0 && !loading;

  function focusInput() {
    window.requestAnimationFrame(() => textAreaRef.current?.focus());
  }

  async function refreshSettings() {
    const nextSettings = await api.getSettings();
    if (!mountedRef.current) {
      return;
    }

    setSettings(nextSettings);
    setSelectedContextId((current) =>
      nextSettings.contexts.some((context) => context.id === current)
        ? current
        : nextSettings.contexts[0]?.id ?? "translate"
    );
  }

  useEffect(() => {
    mountedRef.current = true;
    void refreshSettings();
    const dispose = api.onMenuBarOpen(() => {
      void refreshSettings();
      focusInput();
    });

    return () => {
      mountedRef.current = false;
      dispose();
    };
  }, []);

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timer = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    function handleContextShortcut(event: globalThis.KeyboardEvent) {
      if (
        !event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        loading
      ) {
        return;
      }

      const shortcutIndex = contextShortcutIndex(event);
      const nextContext = settings.contexts[shortcutIndex];
      if (shortcutIndex < 0 || !nextContext) {
        return;
      }

      event.preventDefault();
      setSelectedContextId(nextContext.id);
      focusInput();
    }

    window.addEventListener("keydown", handleContextShortcut);
    return () => window.removeEventListener("keydown", handleContextShortcut);
  }, [loading, settings.contexts]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setError("");
    setOutput("");
    setCopied(false);
    setLoading(true);
    try {
      const entry = await api.runAction({ contextId: activeContext.id, input });
      setOutput(entry.output);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : String(runError));
    } finally {
      setLoading(false);
    }
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

  function handleClear() {
    setInput("");
    setOutput("");
    setError("");
    setCopied(false);
    focusInput();
  }

  async function handleCopy() {
    if (!output.trim()) {
      return;
    }

    await api.copyText(output);
    setCopied(true);
  }

  return (
    <div className="menu-bar-popover">
      <div className="menu-bar-card">
        <form className="menu-bar-form" onSubmit={handleSubmit}>
          <textarea
            ref={textAreaRef}
            value={input}
            aria-label={text.main.focusInput}
            placeholder={formatText(text.main.pasteFor, {
              context: contextDisplayLabel(activeContext, text)
            })}
            autoFocus
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleInputKeyDown}
          />

          <div className="menu-bar-controls">
            <div
              className="menu-bar-contexts"
              role="group"
              aria-label={text.main.chooseContext}
            >
              {settings.contexts.map((context, index) => {
                const hasShortcut = index < 9;
                const contextLabel = contextDisplayLabel(context, text);

                return (
                  <button
                    type="button"
                    key={context.id}
                    className={context.id === activeContext.id ? "active" : ""}
                    aria-keyshortcuts={hasShortcut ? contextAriaShortcut(index) : undefined}
                    title={hasShortcut ? contextShortcutLabel(index) : contextLabel}
                    disabled={loading}
                    onClick={() => {
                      setSelectedContextId(context.id);
                      focusInput();
                    }}
                  >
                    {contextLabel}
                  </button>
                );
              })}
            </div>

            <div className="menu-bar-actions">
              <button
                type="button"
                aria-label={text.main.clear}
                title={text.main.clear}
                onClick={handleClear}
                disabled={loading || (!input && !output && !error)}
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
              <button
                className="primary"
                type="submit"
                aria-label={loading ? text.main.working : text.main.submit}
                aria-keyshortcuts={submitAriaShortcut}
                title={loading ? text.main.working : text.main.submit}
                disabled={!canSubmit}
              >
                {loading ? (
                  <LoaderCircle className="button-spinner" size={15} aria-hidden="true" />
                ) : (
                  <Send size={15} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </form>

        <section className="menu-bar-result" aria-live="polite">
          <div className="menu-bar-result-header">
            <span>{text.main.result}</span>
            <button
              type="button"
              aria-label={copied ? text.main.copied : text.main.copy}
              title={copied ? text.main.copied : text.main.copy}
              onClick={() => void handleCopy()}
              disabled={!output.trim()}
            >
              {copied ? (
                <Check size={15} aria-hidden="true" />
              ) : (
                <Copy size={15} aria-hidden="true" />
              )}
            </button>
          </div>
          <div className={`menu-bar-result-body ${!output && !error ? "muted" : ""}`}>
            {loading ? (
              <div className="menu-bar-loading">
                <LoaderCircle className="button-spinner" size={18} aria-hidden="true" />
                <span>{text.main.working}</span>
              </div>
            ) : error ? (
              <p className="error-text">{error}</p>
            ) : output ? (
              <MarkdownContent content={output} />
            ) : (
              text.main.emptyResult
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
