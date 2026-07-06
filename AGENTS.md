# Repository Guidelines

## Project Structure & Module Organization

This is a macOS Electron app built with React, Vite, TypeScript, and pnpm. UI source lives in `src/`: `App.tsx` is the main interface, `api.ts` is the browser-preview API shim, `i18n.ts` holds localized text, `types.ts` defines shared types, and `styles.css` contains styling. Electron runtime code lives in `electron/`; `main.cjs` owns windows, IPC, settings, shortcuts, and provider execution, while `preload.cjs` exposes the renderer API. Tooling is in `scripts/`, icons in `assets/`, docs images in `docs/images/`, and packaged output in `release/`.

## Build, Test, and Development Commands

Use pnpm, matching `packageManager` in `package.json`.

```bash
pnpm install    # install dependencies from pnpm-lock.yaml
pnpm dev        # start Vite and launch Electron
pnpm build      # type-check and build the renderer
pnpm lint       # run TypeScript checks without emitting files
pnpm package    # build and create macOS dmg/zip artifacts
```

Run commands from the repository root. `pnpm dev` uses Vite plus the real Electron shell.

## Coding Style & Naming Conventions

Use TypeScript for renderer code and CommonJS for Electron files. Follow the current style: two-space indentation, double quotes, semicolons, explicit shared types, and small helpers near their callers. React components and exported types use PascalCase; functions, variables, and settings keys use camelCase. Keep user-facing strings in `src/i18n.ts` or Electron `uiMessages`.

## Testing Guidelines

There is no dedicated test runner yet. Treat `pnpm lint` and `pnpm build` as required validation. For UI changes, run `pnpm dev` and manually verify input submission, context switching, copy/history behavior, settings persistence, and provider status. For Electron changes, check IPC, global shortcuts, CLI timeout/error paths, and packaging impact.

## Commit & Pull Request Guidelines

Use this commit message format:

```text
type(scope): title
```

Examples: `feat(app): add clipboard shortcut`, `fix(electron): handle provider timeout`, `docs(repo): update contributor guide`. Use lowercase `type` values such as `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `build`, or `ci`; keep `scope` lowercase, such as `app`, `electron`, `repo`, `settings`, or `release`.

Pull requests should include a concise summary, validation commands run, linked issues when applicable, and screenshots or screen recordings for visible UI changes. Note any release or packaging implications explicitly.

## Security & Configuration Tips

Provider executables and proxy values are user-controlled settings. Keep CLI argument handling restrictive, avoid exposing arbitrary flags, and never commit local secrets, tokens, or machine-specific paths.
