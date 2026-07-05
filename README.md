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

## Features

- Configure reusable contexts such as translation, optimization, or project-specific rewrites.
- Store the latest history entries locally, with a configurable limit.
- Configure provider, executable paths, model/profile options, timeout, proxy, contexts, global shortcut, and history size.
