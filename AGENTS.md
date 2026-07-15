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

## Commit, Branch & Pull Request Guidelines

Start feature and fix work from an up-to-date `main` branch. Use a short, kebab-case branch name under the `agent/` prefix. Do not put feature work directly on `main`.

```bash
git switch main
git pull --ff-only origin main
git switch -c agent/<short-description>
```

Keep each commit limited to one logical change. Inspect `git status`, review the complete diff, and stage explicit paths so unrelated local work is not included. Never commit generated `dist/` or `release/` output, local settings, credentials, tokens, or machine-specific paths.

Use this commit message format:

```text
type(scope): title
```

Use a lowercase Conventional Commit type: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `build`, or `ci`. Keep scopes lowercase and aligned with the affected area, such as `app`, `electron`, `repo`, `settings`, or `release`. Write a concise imperative title without a trailing period.

Examples:

- `feat(app): add clipboard shortcut`
- `fix(electron): handle provider timeout`
- `docs(repo): document release workflow`
- `chore(release): publish 0.5.0`

Before pushing code, run the checks appropriate to the change:

```bash
pnpm lint
pnpm build
git diff --check
```

Run `node --check electron/main.cjs` when Electron runtime code changes. Run `pnpm dev` and manually verify affected workflows for visible UI or IPC changes. Run `pnpm package` when changing packaging, Electron startup behavior, release configuration, or before publishing a release.

Push the branch with upstream tracking and open a GitHub pull request targeting `main`:

```bash
git push -u origin agent/<short-description>
```

Pull requests must include:

- a concise summary of the behavior changed;
- why the change is needed, including the root cause for fixes;
- user, security, and packaging impact where applicable;
- the exact validation commands run;
- linked issues when applicable;
- screenshots or recordings for visible UI changes.

Do not merge a draft PR, a PR with failing required checks, or a PR whose merge state is not clean. The current repository convention is to squash merge feature PRs, use the PR title as the final commit title, and delete the remote feature branch after merging. Confirm the merged commit exists on `origin/main` before starting release work.

## Release Process

Use Semantic Versioning. Increment `PATCH` for backward-compatible fixes, `MINOR` for backward-compatible features, and `MAJOR` for breaking changes. All new release tags use the `vX.Y.Z` form; do not create new unprefixed version tags.

Release only from an up-to-date, clean `main` after all intended PRs are merged:

```bash
git switch main
git pull --ff-only origin main
git status --short
```

The release-only metadata commit described below is the current exception to the feature-branch rule. Keep that direct `main` commit limited to the version and release notes; use a PR for any code or workflow change.

Prepare the release in two files:

1. Update `version` in `package.json`.
2. Prepend a matching `vX.Y.Z` section to `RELEASE.md`.

The release notes section should include the published release URL, expected DMG and ZIP names, a concise overview, included features, architecture or maintenance changes, fixes and reliability notes, and any installation or compatibility constraints. Include all user-visible changes since the previous tag. Update `pnpm-lock.yaml` only when dependency or lockfile content actually changes.

Validate the exact release contents before committing:

```bash
pnpm lint
node --check electron/main.cjs
git diff --check
pnpm package
```

Confirm that local packaging creates both `release/oolong-X.Y.Z-arm64.dmg` and `release/oolong-X.Y.Z-arm64-mac.zip`. The app is currently an unsigned Apple Silicon build, so the signing warning is expected. Do not stage the generated `release/` directory.

Commit and push the release metadata, then create an annotated tag on that exact commit:

```bash
git add package.json RELEASE.md
git commit -m "chore(release): publish X.Y.Z"
git push origin main
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin vX.Y.Z
```

Pushing `v*` triggers `.github/workflows/release.yml`. The workflow installs dependencies with the frozen pnpm lockfile, builds the renderer, packages the macOS application, creates a non-draft GitHub Release with generated notes, and uploads the DMG and ZIP assets.

Monitor the workflow until completion and verify the published release rather than treating a successful tag push as completion:

```bash
gh run list --workflow release.yml --limit 5
gh run watch <run-id> --exit-status
gh release view vX.Y.Z
```

Confirm the workflow succeeded, the release is neither a draft nor a prerelease, both assets are uploaded, the release is the repository's latest release, and the tag and `origin/main` point to the intended release commit. Never move or reuse a published version tag. Rerun a transiently failed workflow; if code or release metadata must change after publication, prepare the next patch release instead.

## Security & Configuration Tips

Provider executables and proxy values are user-controlled settings. Keep CLI argument handling restrictive, avoid exposing arbitrary flags, and never commit local secrets, tokens, or machine-specific paths.
