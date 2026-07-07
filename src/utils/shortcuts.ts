import type { KeyboardEvent } from "react";

const modifierKeys = new Set(["Alt", "Control", "Meta", "Shift"]);

export function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest("input, textarea, select, button, [contenteditable='true'], [role='textbox']")
  );
}

export function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest("input, textarea, select, [contenteditable='true'], [role='textbox']"));
}

export function contextShortcutIndex(event: globalThis.KeyboardEvent) {
  if (/^Digit[1-9]$/.test(event.code)) {
    return Number(event.code.slice(5)) - 1;
  }

  if (/^[1-9]$/.test(event.key)) {
    return Number(event.key) - 1;
  }

  return -1;
}

function keyFromKeyboardEvent(event: KeyboardEvent<HTMLElement>) {
  if (modifierKeys.has(event.key)) {
    return "";
  }

  if (/^F\d{1,2}$/.test(event.key)) {
    return event.key;
  }

  if (/^Key[A-Z]$/.test(event.code)) {
    return event.code.slice(3);
  }

  if (/^Digit\d$/.test(event.code)) {
    return event.code.slice(5);
  }

  const keyMap: Record<string, string> = {
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    ArrowUp: "Up",
    Backquote: "`",
    Backslash: "\\",
    BracketLeft: "[",
    BracketRight: "]",
    Comma: ",",
    Enter: "Enter",
    Equal: "=",
    Escape: "Escape",
    Home: "Home",
    End: "End",
    Insert: "Insert",
    Minus: "-",
    PageDown: "PageDown",
    PageUp: "PageUp",
    Period: ".",
    Quote: "'",
    Semicolon: ";",
    Slash: "/",
    Space: "Space",
    Tab: "Tab"
  };

  return keyMap[event.code] ?? keyMap[event.key] ?? "";
}

export function shortcutFromKeyboardEvent(event: KeyboardEvent<HTMLElement>) {
  const key = keyFromKeyboardEvent(event);
  if (!key || key === "Escape") {
    return "";
  }

  const parts: string[] = [];
  if (event.metaKey) {
    parts.push("CommandOrControl");
  } else if (event.ctrlKey) {
    parts.push("Control");
  }
  if (event.altKey) {
    parts.push("Alt");
  }
  if (event.shiftKey) {
    parts.push("Shift");
  }

  const isFunctionKey = /^F\d{1,2}$/.test(key);
  if (parts.length === 0 && !isFunctionKey) {
    return "";
  }

  return [...parts, key].join("+");
}

export function shortcutTitle(label: string, shortcut: string) {
  return `${label} (${shortcut})`;
}

export function contextShortcutLabel(index: number) {
  return `Cmd+${index + 1}`;
}

export function contextAriaShortcut(index: number) {
  return `Meta+${index + 1}`;
}
