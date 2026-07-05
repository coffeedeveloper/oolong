# oolong

<p align="center">
  <img src="assets/icon.png" width="96" alt="oolong app icon" />
</p>

oolong is a macOS desktop client for fast text translation, rewriting, and context-aware polishing through local AI CLIs such as `codex exec` and `claude -p`.

It is built for short daily writing workflows: paste text, choose a context, submit, copy the result, and keep recent work in history.

![oolong main window](docs/images/main.png)

## Highlights

- **Context-based actions**: configure reusable contexts for translation, native English polishing, release notes, or project-specific rewrites.
- **Provider choice**: switch between Codex and Claude from the app.
- **Bilingual interface**: switch the app UI, status messages, and default action labels between English and Chinese.
- **CLI-powered output**: run `codex exec` or `claude -p` locally instead of depending on a hosted app backend.
- **Local history**: keep recent input/output pairs locally with a configurable limit.
- **Global shortcut**: bring oolong forward and focus the text area from anywhere on macOS.
- **macOS Service**: install `oolong.translate content` for translating selected text from the Services menu.
- **Proxy and timeout controls**: inject proxy environment variables and avoid silent long-running provider calls.
- **Release automation**: tag-based GitHub Actions workflow builds macOS `.dmg` and `.zip` packages.

## Settings

Settings are organized into focused tabs for day-to-day configuration and provider tuning.

![oolong context settings](docs/images/settings-contexts.png)

| Tab | What it controls |
| --- | --- |
| General | App language, global shortcut, history limit, provider timeout |
| Provider | Codex/Claude executable path, model, Codex reasoning effort, Codex profile |
| Contexts | User-facing action labels and prompts |
| Proxy | `http_proxy`, `https_proxy`, `all_proxy`, and uppercase variants for provider processes |

## Development

```bash
pnpm install
pnpm dev
```

The browser preview uses a local mock API for UI work. The Electron app uses the real IPC and CLI execution path.

## Build

```bash
pnpm build
pnpm package
```

Packaged macOS artifacts are written to `release/`.

## Release

GitHub Actions creates a macOS release package when a version tag is pushed.

```bash
git tag v0.1.0
git push origin v0.1.0
```

The release workflow uploads `.dmg` and `.zip` artifacts from `release/`.

Unsigned macOS builds may show a Gatekeeper warning. Notarization can be added later with an Apple Developer ID certificate.

## Notes

- Default Codex runs with `model_reasoning_effort="low"` for faster translation-style work.
- Codex prompts are passed through stdin and closed immediately to avoid hanging on pipe input.
- Provider arguments are intentionally whitelisted; arbitrary CLI arguments and permission bypass flags are not exposed.
