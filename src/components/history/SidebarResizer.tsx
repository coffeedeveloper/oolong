import { getUiText } from "../../i18n";
import type { KeyboardEventHandler, PointerEventHandler } from "react";

export function SidebarResizer({
  text,
  minWidth,
  maxWidth,
  width,
  onPointerDown,
  onKeyDown
}: {
  text: ReturnType<typeof getUiText>;
  minWidth: number;
  maxWidth: number;
  width: number;
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
}) {
  return (
    <div
      className="sidebar-resizer"
      role="separator"
      aria-label={text.history.resizeSidebar}
      aria-orientation="vertical"
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      aria-valuenow={width}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    />
  );
}
