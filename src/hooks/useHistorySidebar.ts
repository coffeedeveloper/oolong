import { useCallback, useEffect, useRef, useState } from "react";
import type {
  KeyboardEvent,
  PointerEvent as ReactPointerEvent
} from "react";
import { defaultHistoryWidth, maxHistoryWidth, minHistoryWidth } from "../config/ui";
import { clampHistoryWidth } from "../utils/historyLayout";

export function useHistorySidebar() {
  const [historyWidth, setHistoryWidth] = useState(defaultHistoryWidth);
  const [resizingHistory, setResizingHistory] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const resizeStartRef = useRef({ x: 0, width: defaultHistoryWidth });

  useEffect(() => {
    if (!resizingHistory) {
      return undefined;
    }

    const originalCursor = document.body.style.cursor;
    const originalUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function handlePointerMove(event: PointerEvent) {
      const nextWidth = resizeStartRef.current.width + event.clientX - resizeStartRef.current.x;
      setHistoryWidth(clampHistoryWidth(nextWidth));
    }

    function handlePointerEnd() {
      setResizingHistory(false);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd, { once: true });
    window.addEventListener("pointercancel", handlePointerEnd, { once: true });

    return () => {
      document.body.style.cursor = originalCursor;
      document.body.style.userSelect = originalUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
    };
  }, [resizingHistory]);

  const toggleHistoryCollapsed = useCallback(() => {
    setHistoryCollapsed((current) => !current);
    setResizingHistory(false);
  }, []);

  function handleHistoryResizePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (historyCollapsed) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    resizeStartRef.current = {
      x: event.clientX,
      width: historyWidth
    };
    setResizingHistory(true);
  }

  function handleHistoryResizeKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (historyCollapsed) {
      return;
    }

    const step = event.shiftKey ? 32 : 12;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setHistoryWidth((current) => clampHistoryWidth(current - step));
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      setHistoryWidth((current) => clampHistoryWidth(current + step));
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setHistoryWidth(minHistoryWidth);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setHistoryWidth(maxHistoryWidth);
    }
  }

  return {
    historyWidth,
    resizingHistory,
    historyCollapsed,
    minHistoryWidth,
    maxHistoryWidth,
    setResizingHistory,
    toggleHistoryCollapsed,
    handleHistoryResizePointerDown,
    handleHistoryResizeKeyDown
  };
}
