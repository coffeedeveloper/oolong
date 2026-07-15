import type { HistoryEntry, PromptContext, UiLanguage } from "./types";

export const languageOptions: Array<{ value: UiLanguage; label: string }> = [
  { value: "en", label: "English" },
  { value: "zh", label: "中文" }
];

export function normalizeUiLanguage(value: unknown): UiLanguage {
  return value === "zh" ? "zh" : "en";
}

export const translations = {
  en: {
    tabs: {
      general: "General",
      shortcuts: "Shortcuts",
      provider: "Provider",
      contexts: "Contexts",
      proxy: "Proxy"
    },
    settings: {
      title: "Settings",
      description: "Provider, contexts, proxy, shortcuts, startup, language, and history size.",
      sectionsLabel: "Settings sections",
      closeLabel: "Close settings",
      cancel: "Cancel",
      save: "Save",
      saving: "Saving..."
    },
    general: {
      title: "General",
      description: "Language, startup, history, and timeout behavior.",
      launchAtLogin: "Open at login",
      language: "Language",
      historyLimit: "History limit",
      providerTimeout: "Provider timeout"
    },
    shortcuts: {
      title: "Shortcuts",
      description: "Set keyboard shortcuts for opening oolong and querying clipboard text.",
      globalShortcut: "Open oolong",
      clipboardShortcut: "Query clipboard text",
      pressShortcut: "Press shortcut keys...",
      clickToRecord: "Click to record",
      clear: "Clear"
    },
    provider: {
      title: "Provider",
      description: "Whitelisted CLI settings for Codex and Claude.",
      activeProvider: "Active provider",
      codexExecutable: "Codex executable",
      claudeExecutable: "Claude executable",
      model: "Model",
      defaultValue: "Default",
      customModel: "Custom",
      customModelPlaceholder: "Enter model ID",
      reasoningEffort: "Reasoning effort",
      profile: "Profile"
    },
    contexts: {
      title: "Contexts",
      description: "Main screen actions are generated from these contexts.",
      add: "Add",
      delete: "Delete",
      label: "Label",
      prompt: "Prompt",
      itemTitle: "Context {index}",
      labelPlaceholder: "translate",
      promptPlaceholder: "Describe how this context should transform the user text.",
      minimumRequired: "Keep at least one context.",
      cannotDeleteLast: "At least one context is required.",
      defaultLabel: "context",
      defaultPrompt: "Process the user text according to this context. Return only the result.",
      translate: "translate",
      optimize: "optimize",
      fallback: "context"
    },
    proxy: {
      title: "Proxy",
      description: "Proxy values are injected into provider CLI environment variables.",
      useProxy: "Use proxy",
      httpProxy: "HTTP proxy",
      allProxy: "All proxy"
    },
    updates: {
      title: "Update available",
      available: "oolong {version} is ready to download.",
      download: "Download",
      dismiss: "Dismiss update"
    },
    history: {
      title: "History",
      clear: "Clear",
      empty: "No history yet",
      untitled: "Untitled text",
      noOutput: "No output",
      settings: "Settings",
      resizeSidebar: "Resize history sidebar",
      hideSidebar: "Hide history sidebar",
      showSidebar: "Show history sidebar",
      toggleSidebarShortcut: "Cmd+\\"
    },
    main: {
      chooseContext: "Choose context",
      focusInput: "Focus input",
      pasteFor: "Paste or type text for {context}. Press / to focus here.",
      submit: "Submit",
      clear: "Clear",
      working: "Working...",
      output: "Output",
      result: "Result",
      contextResult: "{context} result",
      original: "Original",
      close: "Close",
      copy: "Copy",
      copied: "Copied",
      emptyResult: "Your result will appear here."
    },
    queryTools: {
      menuLabel: "Selection tools",
      dictionarySearch: "Dictionary: search",
      youdaoSearch: "Youdao: search",
      youdaoUnavailable:
        "Unable to query with Youdao Translation. Confirm it is installed and its macOS service is available."
    },
    loading: {
      running: "Running {provider}... elapsed {elapsed}.",
      slow:
        "{provider} is still running. Elapsed {elapsed}. Long text or provider network latency can take a while.",
      nearlyTimedOut:
        "{provider} is still running. Elapsed {elapsed}; timeout in {remaining}s. Check proxy/network settings if this keeps happening."
    }
  },
  zh: {
    tabs: {
      general: "通用",
      shortcuts: "快捷键",
      provider: "模型服务",
      contexts: "场景",
      proxy: "代理"
    },
    settings: {
      title: "设置",
      description: "配置模型服务、场景、代理、快捷键、开机启动、语言和历史记录。",
      sectionsLabel: "设置分区",
      closeLabel: "关闭设置",
      cancel: "取消",
      save: "保存",
      saving: "保存中..."
    },
    general: {
      title: "通用",
      description: "语言、开机启动、历史记录和超时行为。",
      launchAtLogin: "开机自启动",
      language: "界面语言",
      historyLimit: "历史记录上限",
      providerTimeout: "服务超时"
    },
    shortcuts: {
      title: "快捷键",
      description: "设置打开 oolong 和查询剪贴板文本的快捷键。",
      globalShortcut: "打开 oolong",
      clipboardShortcut: "查询剪贴板文本",
      pressShortcut: "按下快捷键...",
      clickToRecord: "点击录入",
      clear: "清除"
    },
    provider: {
      title: "模型服务",
      description: "Codex 和 Claude 的白名单 CLI 参数。",
      activeProvider: "当前服务",
      codexExecutable: "Codex 可执行文件",
      claudeExecutable: "Claude 可执行文件",
      model: "模型",
      defaultValue: "默认",
      customModel: "自定义",
      customModelPlaceholder: "输入模型 ID",
      reasoningEffort: "推理强度",
      profile: "Profile"
    },
    contexts: {
      title: "场景",
      description: "主界面的操作按钮会从这些场景生成。",
      add: "新增",
      delete: "删除",
      label: "标签",
      prompt: "提示词",
      itemTitle: "场景 {index}",
      labelPlaceholder: "翻译",
      promptPlaceholder: "描述这个场景应该如何处理用户输入。",
      minimumRequired: "至少需要保留一个场景。",
      cannotDeleteLast: "至少需要保留一个场景。",
      defaultLabel: "场景",
      defaultPrompt: "根据这个场景处理用户文本，只返回处理结果。",
      translate: "翻译",
      optimize: "润色",
      fallback: "context"
    },
    proxy: {
      title: "代理",
      description: "代理配置会注入到 Provider CLI 的环境变量中。",
      useProxy: "启用代理",
      httpProxy: "HTTP 代理",
      allProxy: "通用代理"
    },
    updates: {
      title: "发现新版本",
      available: "oolong {version} 已可下载。",
      download: "前往下载",
      dismiss: "暂不更新"
    },
    history: {
      title: "历史记录",
      clear: "清空",
      empty: "暂无历史记录",
      untitled: "未命名文本",
      noOutput: "无输出",
      settings: "设置",
      resizeSidebar: "调整历史记录侧边栏宽度",
      hideSidebar: "隐藏历史记录侧边栏",
      showSidebar: "显示历史记录侧边栏",
      toggleSidebarShortcut: "Cmd+\\"
    },
    main: {
      chooseContext: "选择场景",
      focusInput: "聚焦输入框",
      pasteFor: "粘贴或输入文本用于{context}。按 / 快速聚焦输入框。",
      submit: "提交",
      clear: "清空",
      working: "处理中...",
      output: "输出",
      result: "结果",
      contextResult: "{context}结果",
      original: "原文",
      close: "关闭",
      copy: "复制",
      copied: "已复制",
      emptyResult: "处理结果会显示在这里。"
    },
    queryTools: {
      menuLabel: "选区查询工具",
      dictionarySearch: "Dictionary: search",
      youdaoSearch: "Youdao: search",
      youdaoUnavailable: "无法调用网易有道翻译，请确认已安装应用且系统服务可用。"
    },
    loading: {
      running: "{provider} 正在运行...已耗时 {elapsed}。",
      slow: "{provider} 仍在运行。已耗时 {elapsed}。长文本或 Provider 网络延迟可能需要一些时间。",
      nearlyTimedOut:
        "{provider} 仍在运行。已耗时 {elapsed}；将在 {remaining}s 后超时。如果持续发生，请检查代理或网络设置。"
    }
  }
} as const;

type DeepString<T> = {
  readonly [K in keyof T]: T[K] extends string ? string : DeepString<T[K]>;
};

export type UiText = DeepString<(typeof translations)["en"]>;

export function getUiText(language: UiLanguage): UiText {
  return translations[language];
}

function template(value: string, params: Record<string, string | number>) {
  return Object.entries(params).reduce(
    (result, [key, replacement]) => result.split(`{${key}}`).join(String(replacement)),
    value
  );
}

export function formatText(value: string, params: Record<string, string | number>) {
  return template(value, params);
}

function isTranslateLabel(label: string) {
  return label.trim().toLowerCase() === "translate";
}

function isOptimizeLabel(label: string) {
  return label.trim().toLowerCase() === "optimize";
}

export function contextDisplayLabel(
  context: Pick<PromptContext, "id" | "label">,
  text: UiText
) {
  if (context.id === "translate" && isTranslateLabel(context.label)) {
    return text.contexts.translate;
  }

  if (context.id === "optimize" && isOptimizeLabel(context.label)) {
    return text.contexts.optimize;
  }

  return context.label || text.contexts.fallback;
}

export function historyDisplayLabel(entry: HistoryEntry, text: UiText) {
  const rawLabel = entry.contextLabel || entry.mode || "";

  if (entry.contextId === "translate" || entry.mode === "translate" || isTranslateLabel(rawLabel)) {
    return text.contexts.translate;
  }

  if (entry.contextId === "optimize" || entry.mode === "optimize" || isOptimizeLabel(rawLabel)) {
    return text.contexts.optimize;
  }

  return rawLabel || text.contexts.fallback;
}

export function formatDate(value: string, language: UiLanguage) {
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
