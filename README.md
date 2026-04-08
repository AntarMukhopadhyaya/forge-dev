# Forge CLI

Scaffold modern app stacks in seconds using reusable preset modules.

No boilerplate. No lock-in. Just clean, repeatable setup.

---

## Demo

![Forge Demo](./demo.gif)

## Quick Start

```bash
npx forge-dev init next-saas-pro my-app
cd my-app
npm run dev
```

> Forge generates structure, not business logic.

## Why Forge

Setting up the same project foundations repeatedly is slow and inconsistent.

Forge solves this by:

- Running preset-driven scaffolding flows
- Keeping presets portable and versionable
- Supporting local and remote preset modules
- Detecting your environment automatically with `forge-dev doctor`

## Built-in Presets

- express-ts-prisma-postgres
- express-ts-drizzle-postgres
- next-saas-pro
- expo-nativewind-supabase
- tanstack-start
- mern-stack

## Remote Presets

Remote presets require the `--trust` flag to prevent accidental execution of untrusted code.

## Core Features

- Built-in preset modules under `src/presets/builtins/<preset>/preset.yaml`.
- Custom preset modules under `~/.forge/presets/custom`.
- Trusted remote preset import via `forge-dev init <github-url> --trust`.
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
npm install -g forge-dev
forge-dev --help
```

### Local development

```bash
npm install
npm run dev -- list
```

Dry run first when trying a new preset:

```bash
forge-dev init mern-stack my-app --dry-run
```

## Commands

### `forge-dev init <preset> [project-name]`

Scaffold a project from a preset.

Options:

- `-d, --dry-run`: preview steps without writing files.
- `-v, --verbose`: verbose logs.
- `-y, --yes`: skip prompts and use defaults.
- `--trust`: required for trusted remote preset sources.

Examples:

```bash
forge-dev init next-saas-pro my-saas-app
forge-dev init express-ts-drizzle-postgres my-api
forge-dev init expo-nativewind-supabase my-app
forge-dev init ens my-app
forge-dev init expo-nw my-app
forge-dev init mern-stack my-app
forge-dev init ./presets/my-team/preset.yaml team-app
forge-dev init github.com/owner/custom-preset my-app --trust
```

Example output:

```text
✔ Project ready

Next steps:
1. Configure environment variables
2. Run auth setup
3. Run database setup
4. Start development
```

### `forge-dev list`

Shows available presets with source and optional tags.

### `forge-dev preset new <name>`

Creates a custom preset module at:

- `~/.forge/presets/custom/<name>/preset.yaml`
- `~/.forge/presets/custom/<name>/templates/README.md.tpl`

### `forge-dev preset remove <name>`

Removes matching custom preset entries by preset name or alias from custom preset directories.

Important:

- Built-in presets cannot be removed.
- Only custom presets are removable.

Examples:

```bash
forge-dev preset remove next-app
forge-dev preset remove my-team-starter
```

### `forge-dev doctor`

Shows detected local environment and writes cache to `~/.forge/doctor.json`.

```bash
forge-dev doctor
forge-dev doctor --refresh
```

Doctor tracks:

- Node and package managers (`npm`, `pnpm`, `yarn`)
- Languages: Python, Go
- Tools: Git
- Formatters: `prettier`, `black`, `gofmt`, `google-java-format`

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

Preset aliases can be declared directly in `preset.yaml`:

```yaml
name: expo-nativewind-supabase
aliases:
  - ens
  - expo-nw
  - expo-nativewind
```

Benefits:

- Portable and publishable as a unit.
- Cleaner template resolution (`./templates/...`).
- Easier plugin ecosystem evolution.

## Preset Resolution Order

When running `forge-dev init <preset>`:

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

## Troubleshooting

### `Preset not found`

- Run `forge-dev list`.
- Verify preset name/path.
- Validate YAML syntax.

### Missing formatter warnings

Expected when formatter tools are not installed globally.
Install the formatter you want, then run `forge-dev doctor --refresh`.

### Remote preset blocked

You must pass `--trust` for GitHub preset URLs.

### Build works but built-ins not found

Ensure `npm run build` completed and copied assets into `dist`.

## License

MIT
