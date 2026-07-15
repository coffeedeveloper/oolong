import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";

const viewportMargin = 8;

interface MenuState {
  anchorX: number;
  anchorY: number;
  left: number;
  top: number;
  selectedText: string;
}

export interface SelectionContextMenuAction {
  id: string;
  label: string;
  icon: LucideIcon;
  failureMessage?: string;
  onSelect: (selectedText: string) => unknown | Promise<unknown>;
}

async function runAction(action: SelectionContextMenuAction, selectedText: string) {
  try {
    const result = await action.onSelect(selectedText);
    return result === false ? action.failureMessage ?? null : null;
  } catch (error) {
    console.error(`Failed to open query tool ${action.id}:`, error);
    return action.failureMessage ?? null;
  }
}

function selectedTextFromTarget(target: EventTarget | null) {
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
    const start = target.selectionStart;
    const end = target.selectionEnd;

    if (start !== null && end !== null && start !== end) {
      return target.value.slice(start, end).trim();
    }
  }

  const selection = window.getSelection();
  return selection && !selection.isCollapsed ? selection.toString().trim() : "";
}

export function SelectionContextMenu({
  actions,
  menuLabel
}: {
  actions: SelectionContextMenuAction[];
  menuLabel: string;
}) {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function handleContextMenu(event: MouseEvent) {
      if (menuRef.current?.contains(event.target as Node)) {
        event.preventDefault();
        return;
      }

      const selectedText = selectedTextFromTarget(event.target);
      if (!selectedText) {
        setMenu(null);
        return;
      }

      event.preventDefault();
      triggerRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setMenu({
        anchorX: event.clientX,
        anchorY: event.clientY,
        left: event.clientX,
        top: event.clientY,
        selectedText
      });
    }

    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  useLayoutEffect(() => {
    if (!menu || !menuRef.current) {
      return;
    }

    const bounds = menuRef.current.getBoundingClientRect();
    const left = Math.max(
      viewportMargin,
      Math.min(menu.anchorX, window.innerWidth - bounds.width - viewportMargin)
    );
    const top = Math.max(
      viewportMargin,
      Math.min(menu.anchorY, window.innerHeight - bounds.height - viewportMargin)
    );

    if (left !== menu.left || top !== menu.top) {
      setMenu((current) => (current ? { ...current, left, top } : null));
    }
  }, [menu]);

  useEffect(() => {
    if (!menu) {
      return undefined;
    }

    const focusTimer = window.requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLButtonElement>("[role='menuitem']")?.focus();
    });

    function closeMenu() {
      setMenu(null);
    }

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        window.requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
        return;
      }

      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        return;
      }

      const items = Array.from(
        menuRef.current?.querySelectorAll<HTMLButtonElement>("[role='menuitem']") ?? []
      );
      if (items.length === 0) {
        return;
      }

      event.preventDefault();
      const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
      const nextIndex =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? items.length - 1
            : event.key === "ArrowUp"
              ? (currentIndex - 1 + items.length) % items.length
              : (currentIndex + 1) % items.length;
      items[nextIndex]?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("scroll", closeMenu, true);
    window.addEventListener("blur", closeMenu);
    window.addEventListener("resize", closeMenu);

    return () => {
      window.cancelAnimationFrame(focusTimer);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("blur", closeMenu);
      window.removeEventListener("resize", closeMenu);
    };
  }, [menu]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (!menu && !notice) {
    return null;
  }

  return (
    <>
      {menu ? (
        <div
          ref={menuRef}
          className="selection-context-menu"
          role="menu"
          aria-label={menuLabel}
          style={{ left: menu.left, top: menu.top }}
        >
          {actions.map((action) => {
            const Icon = action.icon;

            return (
              <button
                key={action.id}
                className="selection-context-menu-item"
                type="button"
                role="menuitem"
                onClick={() => {
                  const selectedText = menu.selectedText;
                  setMenu(null);
                  void runAction(action, selectedText).then(setNotice);
                }}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {notice ? (
        <div className="query-tool-notice" role="status">
          {notice}
        </div>
      ) : null}
    </>
  );
}
