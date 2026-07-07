import { useEffect, useState } from "react";
import type {
  TooltipPlacement,
  TooltipPropsFactory,
  TooltipState
} from "../components/ui/Tooltip";
import { tooltipPosition } from "../components/ui/Tooltip";

export function useTooltip() {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const hideTooltip = () => setTooltip(null);

  const getTooltipProps: TooltipPropsFactory = (text, placement: TooltipPlacement = "top") => {
    const show = (element: HTMLElement) => {
      setTooltip({
        ...tooltipPosition(element, placement),
        text
      });
    };

    return {
      onMouseEnter: (event) => show(event.currentTarget),
      onMouseLeave: hideTooltip,
      onFocus: (event) => {
        if (event.currentTarget === event.target) {
          show(event.currentTarget);
        }
      },
      onBlur: (event) => {
        if (event.currentTarget === event.target) {
          hideTooltip();
        }
      }
    };
  };

  useEffect(() => {
    if (!tooltip) {
      return undefined;
    }

    window.addEventListener("resize", hideTooltip);
    window.addEventListener("scroll", hideTooltip, true);

    return () => {
      window.removeEventListener("resize", hideTooltip);
      window.removeEventListener("scroll", hideTooltip, true);
    };
  }, [tooltip]);

  return {
    tooltip,
    hideTooltip,
    getTooltipProps
  };
}
