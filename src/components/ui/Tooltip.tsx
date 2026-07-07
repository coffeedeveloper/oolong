import type {
  CSSProperties,
  FocusEvent,
  MouseEvent as ReactMouseEvent
} from "react";

export type TooltipPlacement = "top" | "right" | "bottom" | "left";

export type TooltipState = {
  text: string;
  placement: TooltipPlacement;
  x: number;
  y: number;
};

export type TooltipTargetProps = {
  onMouseEnter: (event: ReactMouseEvent<HTMLElement>) => void;
  onMouseLeave: () => void;
  onFocus: (event: FocusEvent<HTMLElement>) => void;
  onBlur: (event: FocusEvent<HTMLElement>) => void;
};

export type TooltipPropsFactory = (
  text: string,
  placement?: TooltipPlacement
) => TooltipTargetProps;

export function tooltipPosition(element: HTMLElement, placement: TooltipPlacement): TooltipState {
  const rect = element.getBoundingClientRect();
  const gap = 10;
  const horizontalMargin = 154;
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const clampX = (value: number) =>
    Math.min(window.innerWidth - horizontalMargin, Math.max(horizontalMargin, value));
  const clampY = (value: number) => Math.min(window.innerHeight - 24, Math.max(24, value));

  if (placement === "bottom") {
    return {
      text: "",
      placement,
      x: clampX(x),
      y: clampY(rect.bottom + gap)
    };
  }

  if (placement === "right") {
    return {
      text: "",
      placement,
      x: rect.right + gap,
      y: clampY(y)
    };
  }

  if (placement === "left") {
    return {
      text: "",
      placement,
      x: rect.left - gap,
      y: clampY(y)
    };
  }

  return {
    text: "",
    placement,
    x: clampX(x),
    y: clampY(rect.top - gap)
  };
}

export function TooltipOverlay({ tooltip }: { tooltip: TooltipState | null }) {
  if (!tooltip) {
    return null;
  }

  return (
    <div
      className={`app-tooltip ${tooltip.placement}`}
      style={{ left: tooltip.x, top: tooltip.y } as CSSProperties}
      role="tooltip"
    >
      {tooltip.text}
    </div>
  );
}
