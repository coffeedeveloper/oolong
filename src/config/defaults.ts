import settingsDefaults from "../../shared/settings-defaults.json";
import type { PromptContext, Settings } from "../types";

export const fallbackSettings = settingsDefaults as Settings;
export const defaultContexts = fallbackSettings.contexts as PromptContext[];
