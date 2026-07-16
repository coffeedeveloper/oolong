# Release Notes

## v0.7.0

Published release: https://github.com/coffeedeveloper/oolong/releases/tag/v0.7.0

oolong v0.7.0 adds a compact macOS menu-bar translator for quick access without opening the main window. It also expands keyboard navigation, keeps popover translations synchronized with history, and fixes a provider PATH error that could prevent actions from running.

### Downloads

- `oolong-0.7.0-arm64.dmg`
- `oolong-0.7.0-arm64-mac.zip`

### Included Features

- Added a solid monochrome Oolong status-bar icon that adapts to light and dark macOS menu bars.
- Added a compact popover for translate, optimize, and custom contexts using the existing provider settings and action pipeline.
- Added icon-only clear, submit, and copy actions with inline results, loading state, and error feedback.
- Added Command+1 through Command+9 context switching, Command+Enter submission, and Escape dismissal in the popover.
- Added an Escape shortcut in history details to return to the main input.
- Added immediate history synchronization so popover translations appear in an open main-window history list without duplicate entries.

### Architecture And Maintenance

- Added a focused Electron menu-bar controller and a dedicated popover renderer while keeping shared contexts, settings, and history in the existing application model.
- Added preload events for popover activation and history synchronization.
- Added coverage for menu-bar positioning, display work areas, toggle behavior, application activation, history persistence, and provider PATH construction.
- Added a menu-bar popover screenshot to the project documentation.

### Fixes And Reliability

- Fixed provider PATH construction calling `.filter()` on a `Set`, which caused `TypeError: (intermediate value).filter is not a function` when running an action.
- Prevented status-bar clicks from opening the main window; they now toggle only the popover.
- Positioned the popover closer to the status icon and kept it within the active display's work area.
- Closed the popover on blur and prevented history load races from losing or duplicating new popover entries.

### Notes

- The status-bar popover is available on macOS.
- This is an unsigned macOS build. macOS may require allowing the app manually from System Settings when opening it for the first time.
- The current release targets Apple Silicon macOS (`arm64`).
- oolong depends on locally installed provider CLIs. Install and authenticate Codex or Claude before using the corresponding provider.

## v0.6.0

Published release: https://github.com/coffeedeveloper/oolong/releases/tag/v0.6.0

oolong v0.6.0 adds macOS startup controls and lightweight update notifications while improving the reliability, security, and maintainability of the Electron runtime. It also refreshes the built-in Codex model presets.

### Downloads

- `oolong-0.6.0-arm64.dmg`
- `oolong-0.6.0-arm64-mac.zip`

### Included Features

- Added a General setting for launching oolong automatically when the user signs in to macOS.
- Added a startup check against GitHub Releases with an in-app notice when a newer version is available.
- Added a safe action for opening the matching GitHub Release page to download an update manually.
- Added Codex presets for GPT-5.6 Sol, GPT-5.6 Terra, and GPT-5.6 Luna, and removed the GPT-5.4 nano preset.

### Architecture And Maintenance

- Split settings, storage, provider execution, external-link handling, and update checks into focused Electron modules.
- Moved renderer and Electron setting defaults into a shared serializable source to keep both processes aligned.
- Added Node test coverage for Electron core modules and included it in the documented validation workflow.
- Updated contributor and user documentation for launch-at-login, update checks, runtime modules, and release safeguards.

### Fixes And Reliability

- Serialized and atomically replaced JSON store writes to prevent stale concurrent updates and partially written settings or history files.
- Restricted renderer navigation and new-window behavior while routing approved HTTP and HTTPS destinations through the system browser.
- Enabled Electron renderer sandboxing and tightened external URL validation.
- Kept macOS Service registration from blocking application startup and preserved bounded provider process output and timeout handling.

### Notes

- Update notifications require access to GitHub's public Releases API. Updates are downloaded and installed manually from the release page.
- Launch at login is available in the packaged macOS application.
- This is an unsigned macOS build. macOS may require allowing the app manually from System Settings when opening it for the first time.
- The current release targets Apple Silicon macOS (`arm64`).
- oolong depends on locally installed provider CLIs. Install and authenticate Codex or Claude before using the corresponding provider.

## v0.5.0

Published release: https://github.com/coffeedeveloper/oolong/releases/tag/v0.5.0

oolong v0.5.0 adds fast, local word lookup directly from selected text. It introduces a keyboard-accessible context menu that can open macOS Dictionary or query 网易有道翻译 while keeping the integration layer ready for more lookup tools.

### Downloads

- `oolong-0.5.0-arm64.dmg`
- `oolong-0.5.0-arm64-mac.zip`

### Included Features

- Added a custom context menu for selected text that matches the existing oolong interface.
- Added `Dictionary: search` for opening selected words in the built-in macOS Dictionary app.
- Added `Youdao: search` for sending selected words to 网易有道翻译 through its registered macOS text service.
- Added keyboard navigation, viewport-aware positioning, focus restoration, and dismissal behavior to the selection menu.
- Added localized failure notices when an external query tool is unavailable.

### Architecture And Maintenance

- Added typed query-tool identifiers and a shared renderer-to-Electron API contract.
- Registered query tools through handler maps so additional lookup providers can be added without changing the menu component.
- Passed Youdao query text through a private service pasteboard without replacing the user's general clipboard contents.
- Added timeout and bounded-output handling around macOS service execution.

### Fixes And Reliability

- Replaced the legacy Youdao deep link, which opened current Youdao clients without carrying the query text, with the supported macOS service integration.
- Simplified shortcut tooltips and kept tooltip content inside the visible viewport.
- Prevented query-tool errors from leaving the selection menu open or failing without user feedback.

### Notes

- 网易有道翻译 must be installed for the Youdao query tool to work.
- This is an unsigned macOS build. macOS may require allowing the app manually from System Settings when opening it for the first time.
- The current release targets Apple Silicon macOS (`arm64`).
- oolong depends on locally installed provider CLIs. Install and authenticate Codex or Claude before using the corresponding provider.

## v0.4.0

Published release: https://github.com/coffeedeveloper/oolong/releases/tag/v0.4.0

oolong v0.4.0 focuses on maintainability and keyboard-driven daily use. It splits the large renderer entry point into focused modules, improves history navigation and shortcut hints, and tightens the release packaging flow so local release output starts cleanly.

### Downloads

- `oolong-0.4.0-arm64.dmg`
- `oolong-0.4.0-arm64-mac.zip`

### Included Features

- Added keyboard navigation for selected history entries with `Ctrl+N` and `Ctrl+P`.
- Added custom tooltip support for titlebar, sidebar, context, settings, and submit controls.
- Updated the history sidebar toggle shortcut to `Cmd+\`.
- Added clearer shortcut hints for context switching, sidebar toggling, settings, and submit actions.

### Architecture And Maintenance

- Split `App.tsx` into focused renderer modules for main UI, history, settings, shared UI, hooks, utilities, and config.
- Moved renderer defaults, provider model options, UI constants, shortcut helpers, loading copy, and provider status formatting into dedicated modules.
- Updated the browser preview API to reuse shared renderer defaults instead of carrying a duplicate copy.
- Added `scripts/clean-release.mjs` and wired `pnpm package` to clear stale release artifacts before packaging.
- Expanded repository contributor guidance with project structure, validation commands, style conventions, and security notes.

### Fixes And Reliability

- Kept the settings button pinned at the bottom of the history sidebar while long history lists scroll independently.
- Improved provider pill truncation so long provider/model status text stays contained.
- Removed the textarea hover tooltip for the `/` focus shortcut while keeping the keyboard shortcut itself.
- Preserved existing CSS class names and IPC/storage behavior during the renderer architecture split.

### Notes

- This is an unsigned macOS build. macOS may require allowing the app manually from System Settings when opening it for the first time.
- The current release targets Apple Silicon macOS (`arm64`).
- oolong depends on locally installed provider CLIs. Install and authenticate Codex or Claude before using the corresponding provider.

## v0.3.0

Published release: https://github.com/coffeedeveloper/oolong/releases/tag/v0.3.0

oolong v0.3.0 focuses on faster system-wide capture, clearer keyboard controls, and more polished main-screen output. It adds a global clipboard query shortcut, organizes shortcut settings into their own tab, and improves the readability and alignment of the composer output area.

### Downloads

- `oolong-0.3.0-arm64.dmg`
- `oolong-0.3.0-arm64-mac.zip`

### Included Features

- Added a configurable global shortcut for reading the current clipboard, opening oolong, filling the textarea, and immediately running the selected query context.
- Added a dedicated Shortcuts settings tab for configuring the `Open oolong` and `Query clipboard text` shortcuts.
- Added `Cmd/Ctrl+B` to collapse or expand the history sidebar from the main window.
- Added visible shortcut metadata to the sidebar toggle control.
- Improved textarea placeholder copy with clearer paste/type guidance and the `/` focus shortcut hint.
- Updated README settings documentation for the new Shortcuts tab and clipboard query workflow.

### Fixes And Reliability

- Improved window event delivery so focus, settings, service input, and clipboard query events wait for the renderer to finish loading when a window is recreated.
- Prevented duplicate shortcut registration when two configured global shortcuts use the same accelerator.
- Kept empty clipboard shortcut activation from submitting an empty query; it now only opens and focuses oolong.
- Kept the clipboard query workflow on the currently selected context.
- Improved output layout by aligning loading state width with the textarea.
- Wrapped output results in a consistent bordered panel for better readability.
- Refined shortcut labels to use action-oriented names instead of implementation-oriented labels.

### Notes

- This is an unsigned macOS build. macOS may require allowing the app manually from System Settings when opening it for the first time.
- The current release targets Apple Silicon macOS (`arm64`).
- oolong depends on locally installed provider CLIs. Install and authenticate Codex or Claude before using the corresponding provider.

## v0.2.0

Published release: https://github.com/coffeedeveloper/oolong/releases/tag/v0.2.0

oolong v0.2.0 focuses on interaction polish, settings usability, and a more flexible main window layout. It improves provider model selection, adds faster main-screen actions, and makes the history sidebar more ergonomic on narrow window widths.

### Downloads

- `oolong-0.2.0-arm64.dmg`
- `oolong-0.2.0-arm64-mac.zip`

### Included Features

- Added preset model pickers for Codex and Claude provider settings.
- Added custom model input support when the desired model is not in the preset list.
- Added main-screen `Clear` action for clearing input, output, error, and copied state.
- Added icons for Clear, Submit, Copy, Copied, Settings, History Clear, and loading states.
- Added hover states across primary, secondary, segmented, icon, history, shortcut, and settings buttons.
- Added draggable history sidebar resizing with minimum and maximum width constraints.
- Added keyboard support for sidebar resizing with arrow keys, Home, and End.
- Added titlebar control for collapsing and expanding the history sidebar.
- Added `/` keyboard shortcut to focus the main textarea when the user is not already typing in another control.
- Allowed the main textarea and output area to fill the available main-pane width.
- Reduced the minimum app window width for a more compact desktop layout.

### Fixes And Reliability

- Fixed settings model layout so custom model input no longer stretches the Codex reasoning-effort control.
- Fixed segmented control selected colors to better match the app palette.
- Fixed sidebar divider visual artifacts by rendering a 1px divider with a wider invisible drag target.
- Fixed sidebar divider stacking so it no longer appears above the Settings modal.
- Fixed narrow-width layout behavior so the main screen keeps the left/right structure instead of switching to a vertical layout.
- Reduced narrow-width layout jitter by removing breakpoint-driven spacing changes in the main screen.
- Kept the History Clear button aligned to the right of the History title at narrow sidebar widths.

### Notes

- This is an unsigned macOS build. macOS may require allowing the app manually from System Settings when opening it for the first time.
- The current release targets Apple Silicon macOS (`arm64`).
- oolong depends on locally installed provider CLIs. Install and authenticate Codex or Claude before using the corresponding provider.

## v0.1.0

Published release: https://github.com/coffeedeveloper/oolong/releases/tag/v0.1.0

oolong v0.1.0 is the first packaged macOS release. It provides a desktop workflow for translating text, optimizing English writing, and running reusable prompt contexts through local AI CLIs.

### Downloads

- `oolong-0.1.0-arm64.dmg`
- `oolong-0.1.0-arm64-mac.zip`

### Included Features

- macOS desktop client built with Electron and React.
- Context-based actions with configurable labels and prompts.
- Default `translate` context for Chinese-English bidirectional translation.
- Default `optimize` context for making English writing more natural and native.
- Provider selection between Codex and Claude.
- Codex execution through `codex exec`.
- Claude execution through `claude -p`.
- Provider settings for executable path, model, Codex reasoning effort, and Codex profile.
- Proxy settings for injecting `http_proxy`, `https_proxy`, `all_proxy`, and uppercase variants into provider CLI processes.
- Provider timeout handling with progress messages and clearer timeout errors.
- Local history for recent input/output pairs, with configurable history limit.
- History item selection, deletion, and full history clearing.
- Copy action for generated output.
- Settings modal with vertical tabs.
- Keyboard-driven global shortcut recorder.
- `Command+,` shortcut for opening Settings.
- Global shortcut for opening oolong and focusing the input text area.
- Bilingual UI support for English and Chinese.
- macOS Services integration through `oolong.translate content`, allowing selected text to be sent to oolong from the system Services menu.
- `oolong://` URL scheme handling for service input.
- App icon and packaged macOS release assets.
- README screenshots and improved first-run project presentation.
- Tag-based GitHub Actions workflow for building and publishing macOS `.dmg` and `.zip` packages.

### Fixes And Reliability

- Fixed packaged app blank page by using relative Vite asset paths.
- Improved Codex and Claude executable lookup for macOS GUI and Services launches, where terminal `PATH` is not always available.
- Added common user binary paths for fnm, nvm, volta, asdf, nodenv, bun, pnpm, npm, and yarn setups.
- Added `--skip-git-repo-check` to Codex provider calls because oolong uses Codex for text processing rather than repository work.
- Added clearer provider-not-found and timeout messages.
- Ensured at least one context remains configured.
- Improved release workflow action versions to use Node 24 runtime.
- Added generated GitHub release notes support for future releases.

### Notes

- This is an unsigned macOS build. macOS may require allowing the app manually from System Settings when opening it for the first time.
- The current release targets Apple Silicon macOS (`arm64`).
- oolong depends on locally installed provider CLIs. Install and authenticate Codex or Claude before using the corresponding provider.
