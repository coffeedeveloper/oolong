import { getUiText } from "../../i18n";
import type { TooltipPropsFactory } from "../ui/Tooltip";
import type { KeyboardEventHandler, PointerEventHandler } from "react";

export function SidebarResizer({
  text,
  minWidth,
  maxWidth,
  width,
  tooltipProps,
  onPointerDown,
  onKeyDown
}: {
  text: ReturnType<typeof getUiText>;
  minWidth: number;
  maxWidth: number;
  width: number;
  tooltipProps: TooltipPropsFactory;
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
      {...tooltipProps(text.history.resizeSidebar, "right")}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    />
  );
}
