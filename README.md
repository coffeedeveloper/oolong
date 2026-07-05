# oolong

oolong is a macOS desktop client for translation and English writing optimization.

The product can run either `codex exec` or `claude -p` under the hood, keeps a local history, and exposes a global shortcut that brings the main window to the text input.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run package
```

## Release

GitHub Actions creates a macOS release package when a version tag is pushed.

```bash
git tag v0.1.0
git push origin v0.1.0
```

The release workflow uploads `.dmg` and `.zip` artifacts from `release/`.

## Features

- Configure reusable contexts such as translation, optimization, or project-specific rewrites.
- Store the latest history entries locally, with a configurable limit.
- Configure provider, executable paths, model/profile options, timeout, proxy, contexts, global shortcut, and history size.
