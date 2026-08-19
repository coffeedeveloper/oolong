(() => {
  const storageKey = "oolong-site-language";

  const messages = {
    en: {
      "meta.title": "oolong — Your words, steeped to clarity.",
      "meta.description":
        "oolong is a focused macOS workspace for translating, rewriting, and transforming short text with the AI CLIs already on your Mac.",
      "meta.socialDescription":
        "A focused macOS workspace for translation, rewriting, and repeatable text actions.",
      "a11y.skip": "Skip to content",
      "a11y.mainNav": "Main navigation",
      "a11y.home": "oolong home",
      "a11y.language": "Language",
      "a11y.highlights": "Product highlights",
      "a11y.providers": "Supported providers",
      "a11y.backToTop": "Back to top",
      "nav.features": "Features",
      "nav.privacy": "Privacy",
      "nav.download": "Download",
      "hero.eyebrow": "A native macOS text workspace",
      "hero.title": "Your words,<br><em>steeped to clarity.</em>",
      "hero.intro":
        "Translate, rewrite, and transform short text from one focused desktop app—powered by the AI tools already on your Mac.",
      "hero.download": "Download for Apple silicon",
      "hero.install": "Installation guide",
      "hero.noteOpen": "Free & open source",
      "hero.noteHistory": "Local history",
      "hero.noteAccount": "No oolong account",
      "hero.translate": "Translate",
      "hero.translateDetail": "Chinese → English",
      "hero.optimize": "Optimize",
      "hero.optimizeDetail": "Sound more natural",
      "providers.copy": "Works with the CLI you already use",
      "intro.kicker": "Why oolong",
      "intro.title": "Less chatting.<br>More getting the words right.",
      "intro.copy":
        "oolong turns the prompts you repeat every day into named, one-click contexts. It is built for the small text jobs that should take seconds—not a new conversation.",
      "features.contextsLabel": "01 / YOUR WORKFLOWS",
      "features.contextsTitle": "Turn prompts into reusable actions.",
      "features.contextsCopy":
        "Create contexts for translation, English polishing, release notes, or your team’s own writing style. Pick one and run it whenever you need it.",
      "features.shortcutsLabel": "02 / STAY IN FLOW",
      "features.shortcutsTitle": "Start from anywhere.",
      "features.shortcutsCopy":
        "Open oolong or transform the current clipboard with system-wide shortcuts. Send selected text through a macOS Service without breaking your train of thought.",
      "features.openOolong": "Open oolong",
      "features.runClipboard": "Run clipboard",
      "features.submitText": "Submit text",
      "features.menuLabel": "03 / CLOSE AT HAND",
      "features.menuTitle": "Ready from the menu bar.",
      "features.menuCopy":
        "Keep oolong tucked away until you need it, then translate or polish text from a compact popover.",
      "workflow.kicker": "The short-text loop",
      "workflow.title": "Three steps. Then back to work.",
      "workflow.chooseTitle": "Choose a context",
      "workflow.chooseCopy": "Pick the action and provider that fit the job.",
      "workflow.inputTitle": "Drop in your text",
      "workflow.inputCopy": "Paste, type, use the clipboard shortcut, or invoke a macOS Service.",
      "workflow.copyTitle": "Copy the result",
      "workflow.copyCopy": "Review the output now or return to it later in local history.",
      "privacy.kicker": "Local by design",
      "privacy.title": "Your workspace stays yours.",
      "privacy.copy":
        "oolong has no hosted backend. Settings and history stay on your Mac, and provider credentials remain with the CLI you installed and authenticated. Your chosen provider controls how prompts are processed.",
      "privacy.link": "Read the data & network notes",
      "cta.kicker": "Brew a better sentence",
      "cta.title": "Make your next words clearer.",
      "cta.download": "Download oolong",
      "cta.note": "macOS · Apple silicon · unsigned open-source build",
      "footer.tagline": "Made for words in motion.",
      "footer.source": "Source",
      "footer.releases": "Releases",
      "footer.docs": "Docs",
      "images.appMain": "oolong showing a Chinese-to-English translation with local history",
      "images.contexts": "oolong settings showing reusable translation and optimization contexts",
      "images.menu": "oolong compact menu bar popover",
    },
    zh: {
      "meta.title": "oolong — 让每一句话更清晰自然。",
      "meta.description":
        "oolong 是一款专注的 macOS 文本工作区，通过 Mac 上已有的 AI CLI 完成翻译、润色与可复用文本操作。",
      "meta.socialDescription": "专注于翻译、润色与可复用文本操作的 macOS 工作区。",
      "a11y.skip": "跳到主要内容",
      "a11y.mainNav": "主导航",
      "a11y.home": "oolong 首页",
      "a11y.language": "语言",
      "a11y.highlights": "产品亮点",
      "a11y.providers": "支持的服务商",
      "a11y.backToTop": "返回顶部",
      "nav.features": "功能",
      "nav.privacy": "隐私",
      "nav.download": "下载",
      "hero.eyebrow": "原生 macOS 文本工作区",
      "hero.title": "让每一句话，<br><em>更清晰自然。</em>",
      "hero.intro":
        "在一个专注的桌面应用里完成翻译、润色与文本转换——使用你 Mac 上已经安装的 AI 工具。",
      "hero.download": "下载 Apple 芯片版",
      "hero.install": "安装指南",
      "hero.noteOpen": "免费开源",
      "hero.noteHistory": "本地历史记录",
      "hero.noteAccount": "无需 oolong 账户",
      "hero.translate": "翻译",
      "hero.translateDetail": "中译英",
      "hero.optimize": "润色",
      "hero.optimizeDetail": "让表达更自然",
      "providers.copy": "支持你已经在用的 CLI",
      "intro.kicker": "为什么选择 oolong",
      "intro.title": "少一点对话，<br>更快把文字写对。",
      "intro.copy":
        "oolong 把你每天重复使用的提示词变成命名明确的一键上下文。它专为几秒钟就该完成的短文本任务而设计，不必每次新开一段对话。",
      "features.contextsLabel": "01 / 你的工作流",
      "features.contextsTitle": "把提示词变成可复用操作。",
      "features.contextsCopy":
        "为翻译、英文润色、发布说明或团队写作风格创建上下文。选择后即可随时运行。",
      "features.shortcutsLabel": "02 / 保持专注",
      "features.shortcutsTitle": "从任何地方开始。",
      "features.shortcutsCopy":
        "使用系统级快捷键打开 oolong 或处理当前剪贴板，也可以通过 macOS 服务发送选中的文字，不打断手头的思路。",
      "features.openOolong": "打开 oolong",
      "features.runClipboard": "处理剪贴板",
      "features.submitText": "提交文本",
      "features.menuLabel": "03 / 触手可及",
      "features.menuTitle": "常驻菜单栏，随时可用。",
      "features.menuCopy": "平时把 oolong 收在菜单栏，需要时从紧凑弹窗里快速翻译或润色文字。",
      "workflow.kicker": "短文本工作流",
      "workflow.title": "三步完成，然后继续工作。",
      "workflow.chooseTitle": "选择上下文",
      "workflow.chooseCopy": "选择适合当前任务的操作和服务商。",
      "workflow.inputTitle": "放入文本",
      "workflow.inputCopy": "粘贴、输入、使用剪贴板快捷键，或调用 macOS 服务。",
      "workflow.copyTitle": "复制结果",
      "workflow.copyCopy": "立即检查输出，或稍后从本地历史记录中重新打开。",
      "privacy.kicker": "本地优先",
      "privacy.title": "你的工作区只属于你。",
      "privacy.copy":
        "oolong 没有托管后端。设置和历史记录保存在 Mac 本地，服务商凭据仍由你已安装并登录的 CLI 管理。提示词的处理方式由你选择的服务商决定。",
      "privacy.link": "阅读数据与网络说明",
      "cta.kicker": "写出更好的下一句",
      "cta.title": "让下一段文字更清晰。",
      "cta.download": "下载 oolong",
      "cta.note": "macOS · Apple 芯片 · 未签名开源构建",
      "footer.tagline": "为流动的文字而作。",
      "footer.source": "源码",
      "footer.releases": "版本发布",
      "footer.docs": "文档",
      "images.appMain": "oolong 展示中译英结果与本地历史记录",
      "images.contexts": "oolong 设置中的翻译与润色上下文",
      "images.menu": "oolong 的紧凑菜单栏弹窗",
    },
  };

  const getSavedLanguage = () => {
    const queryLanguage = new URLSearchParams(window.location.search).get("lang");
    if (queryLanguage === "en" || queryLanguage === "zh") return queryLanguage;

    try {
      const savedLanguage = window.localStorage.getItem(storageKey);
      if (savedLanguage === "en" || savedLanguage === "zh") return savedLanguage;
    } catch {
      // Storage can be unavailable in strict privacy modes.
    }

    return window.navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
  };

  const applyLanguage = (language, persist = false) => {
    const copy = messages[language];
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    document.documentElement.dataset.language = language;
    document.title = copy["meta.title"];

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = copy[element.dataset.i18n];
    });

    document.querySelectorAll("[data-i18n-html]").forEach((element) => {
      element.innerHTML = copy[element.dataset.i18nHtml];
    });

    document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
      element.setAttribute("aria-label", copy[element.dataset.i18nAria]);
    });

    document.querySelectorAll("[data-i18n-alt]").forEach((element) => {
      element.setAttribute("alt", copy[element.dataset.i18nAlt]);
    });

    document.querySelectorAll("[data-i18n-content]").forEach((element) => {
      element.setAttribute("content", copy[element.dataset.i18nContent]);
    });

    document.querySelectorAll("[data-language]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.language === language));
    });

    if (persist) {
      try {
        window.localStorage.setItem(storageKey, language);
      } catch {
        // The switch still works for the current page when storage is unavailable.
      }

      const url = new URL(window.location.href);
      if (language === "zh") {
        url.searchParams.set("lang", "zh");
      } else {
        url.searchParams.delete("lang");
      }
      window.history.replaceState({}, "", url);
    }
  };

  document.querySelectorAll("[data-language]").forEach((button) => {
    button.addEventListener("click", () => applyLanguage(button.dataset.language, true));
  });

  applyLanguage(getSavedLanguage());
})();
