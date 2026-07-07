import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { sidebarToggleAriaShortcut } from "../../config/ui";
import type { TooltipPropsFactory } from "../ui/Tooltip";

export function Titlebar({
  historyCollapsed,
  sidebarToggleLabel,
  sidebarToggleTitle,
  providerStatus,
  tooltipProps,
  onToggleSidebar
}: {
  historyCollapsed: boolean;
  sidebarToggleLabel: string;
  sidebarToggleTitle: string;
  providerStatus: string;
  tooltipProps: TooltipPropsFactory;
  onToggleSidebar: () => void;
}) {
  return (
    <header className="titlebar">
      <div className="titlebar-left">
        <div className="traffic-spacer" />
        <button
          className="titlebar-button"
          type="button"
          aria-label={sidebarToggleLabel}
          aria-keyshortcuts={sidebarToggleAriaShortcut}
          aria-expanded={!historyCollapsed}
          {...tooltipProps(sidebarToggleTitle, "bottom")}
          onClick={onToggleSidebar}
        >
          {historyCollapsed ? (
            <PanelLeftOpen size={16} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={16} aria-hidden="true" />
          )}
        </button>
      </div>
      <h1>oolong</h1>
      <div className="provider-pill" {...tooltipProps(providerStatus, "bottom")}>
        <span>{providerStatus}</span>
      </div>
    </header>
  );
}
