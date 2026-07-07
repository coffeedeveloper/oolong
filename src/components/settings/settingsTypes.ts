import type { Dispatch, SetStateAction } from "react";
import type { Settings } from "../../types";
import type { UiText } from "../../i18n";

export type SettingsTab = "general" | "shortcuts" | "provider" | "contexts" | "proxy";
export type ShortcutSetting = "globalShortcut" | "clipboardShortcut";
export type SetSettingsDraft = Dispatch<SetStateAction<Settings>>;
export type SettingsText = UiText;
