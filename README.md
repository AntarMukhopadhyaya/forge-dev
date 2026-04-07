# Forge CLI

Forge is a TypeScript CLI that scaffolds modern projects from reusable, self-contained preset modules.
It is designed for speed, repeatability, and low setup friction.

## Why Forge

Creating the same project foundations repeatedly costs time and introduces inconsistency.
Forge solves this by:

- Running preset-driven scaffolding flows.
- Keeping preset logic portable and versionable.
- Supporting local custom presets and trusted remote preset sources.
- Detecting local tooling automatically with `forge doctor`.

## Core Features

- Built-in preset modules under `src/presets/builtins/<preset>/preset.yaml`.
- Custom preset modules under `~/.forge/presets/custom`.
- Trusted remote preset import via `forge init <github-url> --trust`.
- Variable prompts with defaults and choice options.
- Conditional steps via `if` in preset steps.
- Template rendering via Handlebars.
- Per-language formatter routing with graceful fallback.
- Doctor cache for runtime/package manager/formatter detection.
- Dry run mode for safe previews.

## Requirements

- Node.js 20+
- npm

## Installation

### From npm (global)

```bash
npm install -g forge-cli
forge --help
```

### Local development

```bash
npm install
npm run dev -- list
```

## Quick Start

```bash
forge list
forge init next my-app
cd my-app
npm run dev
```

Dry run first when trying a new preset:

```bash
forge init mern-stack my-app --dry-run
```

## Commands

### `forge init <preset> [project-name]`

Scaffold a project from a preset.

Options:

- `-d, --dry-run`: preview steps without writing files.
- `-v, --verbose`: verbose logs.
- `-y, --yes`: skip prompts and use defaults.
- `--trust`: required for trusted remote preset sources.

Examples:

```bash
forge init next my-app
forge init next-saas-pro my-saas-app
forge init mern-stack my-app
forge init ./presets/my-team/preset.yaml team-app
forge init github.com/owner/custom-preset my-app --trust
```

### `forge list`

Shows available presets with source and optional tags.

### `forge preset new <name>`

Creates a custom preset module at:

- `~/.forge/presets/custom/<name>/preset.yaml`
- `~/.forge/presets/custom/<name>/templates/README.md.hbs`

### `forge doctor`

Shows detected local environment and writes cache to `~/.forge/doctor.json`.

```bash
forge doctor
forge doctor --refresh
```

Doctor tracks:

- Node and package managers (`npm`, `pnpm`, `yarn`)
- languages (`python`, `go`)
- tools (`git`)
- formatters (`prettier`, `black`, `gofmt`, `google-java-format`)

## Built-in Presets

Current built-ins include:

- `next`
- `next-saas-pro`
- `next-supabase-drizzle`
- `expo`
- `tanstack-start`
- `mern-stack`

### `next-saas-pro` setup scope

`next-saas-pro` is intentionally setup-only (no business logic), including:

- Next.js TS app base
- Better Auth
- Better Auth Drizzle adapter
- Better Auth organizations plugin
- Drizzle ORM (Postgres)
- API route handler for `/api/auth/[...all]`
- env placeholders and drizzle config

Installed by preset:

- dependencies: `better-auth`, `@better-auth/drizzle-adapter`, `drizzle-orm`, `pg`, `dotenv`
- devDependencies: `drizzle-kit`, `@types/pg`

## Preset Architecture

Each preset is a self-contained module:

```text
src/presets/builtins/<preset>/
  preset.yaml
  templates/
  meta.json (optional)
```

Benefits:

- Portable and publishable as a unit.
- Cleaner template resolution (`./templates/...`).
- Easier plugin ecosystem evolution.

## Preset Resolution Order

When running `forge init <preset>`:

1. explicit path-like value (`/`, `\\`, `.yaml`, `.yml`)
2. `./presets/<name>.yaml`
3. `./presets/custom/<name>.yaml`
4. `~/.forge/presets/custom/**` (recursive)
5. built-in module: `src/presets/builtins/<name>/preset.yaml`

If a preset path is used, Forge caches it for reuse by short name.

## Formatter Routing (Per Language)

Forge applies formatter-by-language on generated files:

- JS/TS: `prettier --write`
- Python: `black`
- Go: `gofmt -w`
- Java: `google-java-format --replace`

Important behavior:

- Forge does not auto-install formatter tools.
- If formatter is missing, Forge logs a warning and continues.
- Scaffolding never hard-fails due to missing formatter binaries.

## Package Manager Resolution

For Node runtime presets:

- Install steps use detected/requested manager (`npm`, `pnpm`, `yarn`).
- Run commands are rewritten at execution time when needed.
  Examples: `npm install`, `npm run --prefix`, `npx`, `npm create`.

## Development Scripts

```bash
npm run lint
npm test
npm run build
npm run dev -- list
```

## Publishing to npm

### Preflight checklist

Run this before every publish:

```bash
npm run lint
npm test
npm run build
npm pack --dry-run
npm publish --dry-run
```

What to verify:

- no lint/type/test failures
- tarball includes only intended files
- CLI bin path is valid (`dist/index.js`)
- no stale artifacts in `dist`

### Version and publish

```bash
npm version patch
npm publish --access public
```

Use `minor` or `major` as needed.

## Troubleshooting

### `Preset not found`

- Run `forge list`.
- Verify preset name/path.
- Validate YAML syntax.

### Missing formatter warnings

Expected when formatter tools are not installed globally.
Install the formatter you want, then run `forge doctor --refresh`.

### Remote preset blocked

You must pass `--trust` for GitHub preset URLs.

### Build works but built-ins not found

Ensure `npm run build` completed and copied assets into `dist`.

## License

MIT
