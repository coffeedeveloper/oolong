# Release Notes

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
