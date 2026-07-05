export type Provider = "codex" | "claude";

export interface PromptContext {
  id: string;
  label: string;
  prompt: string;
}

export interface Settings {
  provider: Provider;
  codexExecutable: string;
  codexModel: string;
  codexReasoningEffort: string;
  codexProfile: string;
  claudeExecutable: string;
  claudeModel: string;
  globalShortcut: string;
  historyLimit: number;
  providerTimeoutSeconds: number;
  proxyEnabled: boolean;
  httpProxy: string;
  allProxy: string;
  contexts: PromptContext[];
}

export interface HistoryEntry {
  id: string;
  contextId?: string;
  contextLabel?: string;
  mode?: string;
  provider: Provider;
  input: string;
  output: string;
  inputPreview: string;
  outputPreview: string;
  createdAt: string;
}

export interface RunRequest {
  contextId: string;
  input: string;
}

export interface OolongApi {
  getSettings: () => Promise<Settings>;
  saveSettings: (settings: Settings) => Promise<Settings>;
  getHistory: () => Promise<HistoryEntry[]>;
  clearHistory: () => Promise<HistoryEntry[]>;
  deleteHistoryEntry: (id: string) => Promise<HistoryEntry[]>;
  runAction: (request: RunRequest) => Promise<HistoryEntry>;
  copyText: (text: string) => Promise<boolean>;
  onFocusInput: (callback: () => void) => () => void;
  onOpenSettings: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    oolong?: OolongApi;
  }
}
