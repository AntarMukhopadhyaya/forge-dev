# Forge CLI

Scaffold modern app stacks in seconds using reusable preset modules.

No boilerplate. No lock-in. Just clean, repeatable setup.

Docs: https://antarmukhopadhyaya.github.io/forge-dev/

---

## Demo

![Forge Demo](./images/demo.gif)

## Quick Start

```bash
npx @antardev/forge-dev init next-saas-pro my-app
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
- Detecting your environment automatically with `npx @antardev/forge-dev doctor`

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
- Workspace custom preset modules under `./presets/custom/<preset>/preset.yaml`.
- Custom preset modules under `~/.forge/presets/custom`.
- Trusted remote preset import via `npx @antardev/forge-dev init <github-url> --trust`.
- Variable prompts with defaults and choice options.
- Conditional steps via `if` in preset steps.
- Generic runtime metadata for non-Node presets, including `language` and custom install commands.
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
npm install -g @antardev/forge-dev
npx @antardev/forge-dev --help
```

### Local development

```bash
npm install
npx @antardev/forge-dev list
```

Dry run first when trying a new preset:

```bash
npx @antardev/forge-dev init mern-stack my-app --dry-run
```

## Commands

### `npx @antardev/forge-dev init <preset> [project-name]`

Scaffold a project from a preset.

Options:

- `-d, --dry-run`: preview steps without writing files.
- `-v, --verbose`: verbose logs.
- `-y, --yes`: skip prompts and use defaults.
- `--trust`: required for trusted remote preset sources.

Examples:

```bash
npx @antardev/forge-dev init next-saas-pro my-saas-app
npx @antardev/forge-dev init express-ts-drizzle-postgres my-api
npx @antardev/forge-dev init expo-nativewind-supabase my-app
npx @antardev/forge-dev init ens my-app
npx @antardev/forge-dev init expo-nw my-app
npx @antardev/forge-dev init mern-stack my-app
npx @antardev/forge-dev init ./presets/my-team/preset.yaml team-app
npx @antardev/forge-dev init github.com/owner/custom-preset my-app --trust
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

### `npx @antardev/forge-dev list`

Shows available presets with source and optional tags.

### `npx @antardev/forge-dev preset new <name>`

Creates a custom preset module at:

- `~/.forge/presets/custom/<name>/preset.yaml`
- `~/.forge/presets/custom/<name>/meta.json`
- `~/.forge/presets/custom/<name>/templates/README.md.tpl`

### `npx @antardev/forge-dev scaffold <name>`

Top-level shortcut to bring your own preset by scaffolding a local preset module.

When run in an interactive terminal, Forge prompts for the runtime and related
stack settings. Use `--yes` to skip prompts and accept defaults.

Flags:

- `-y, --yes`: skip prompts and use defaults.
- `--runtime <runtime>`: record the target runtime in the starter YAML.
- `--language <language>`: record the language in the starter YAML.
- `--package-manager <package-manager>`: record the package manager in the starter YAML.
- `--install-command <command>`: set a custom installer command prefix for install steps.

Creates:

- `./presets/custom/<name>/preset.yaml`
- `./presets/custom/<name>/meta.json`
- `./presets/custom/<name>/templates/README.md.tpl`

Example:

```bash
npx @antardev/forge-dev scaffold my-team-api
npx @antardev/forge-dev init my-team-api app-name
```

### `npx @antardev/forge-dev preset scaffold <name>`

Scaffolds a project-local preset module so you can edit templates and YAML in the same repo without context switching.

This command remains available; it is equivalent to `npx @antardev/forge-dev scaffold <name>`.

Creates:

- `./presets/custom/<name>/preset.yaml`
- `./presets/custom/<name>/meta.json`
- `./presets/custom/<name>/templates/README.md.tpl`

Example:

```bash
npx @antardev/forge-dev preset scaffold my-team-api
npx @antardev/forge-dev init my-team-api app-name
```

### `npx @antardev/forge-dev preset remove <name>`

Removes matching custom preset entries by preset name or alias from custom preset directories.

Important:

- Built-in presets cannot be removed.
- Only custom presets are removable.

Examples:

```bash
npx @antardev/forge-dev preset remove next-app
npx @antardev/forge-dev preset remove my-team-starter
```

### `npx @antardev/forge-dev doctor`

Shows detected local environment and writes cache to `~/.forge/doctor.json`.

```bash
npx @antardev/forge-dev doctor
npx @antardev/forge-dev doctor --refresh
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

Custom presets follow the same structure in either:

- `./presets/custom/<preset>/`
- `~/.forge/presets/custom/<preset>/`

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

When running `npx @antardev/forge-dev init <preset>`:

1. explicit path-like value (`/`, `\\`, `.yaml`, `.yml`)
2. `./presets/<name>.yaml`
3. `./presets/custom/<name>.yaml`
4. `~/.forge/presets/custom/**` (recursive)
5. built-in module: `src/presets/builtins/<name>/preset.yaml`

If a preset path is used, Forge caches it for reuse by short name.

## `preset.yaml` Reference

Minimal example:

```yaml
name: my-team-api
description: "Express + Drizzle API scaffold"
version: "1.0"
runtime: node
packageManager: npm

aliases:
  - mta

variables:
  project:
    type: string
    prompt: "Project name"
    default: "my-api"
  database:
    type: choice
    prompt: "Database"
    options: [postgres, mysql]
    default: postgres

steps:
  - run: npm init -y
  - install:
      deps: [express, zod]
  - install:
      deps: [typescript, tsx]
      dev: true
  - file:
      path: src/index.ts
      template: ./templates/index.ts.tpl
      vars:
        appName: "{{project}}"
  - env:
      PORT: "3000"
  - run: echo "Using Postgres"
    if:
      database: postgres

postRun:
  - npm run dev
```

Top-level fields:

- `name`: Preset identifier.
- `aliases`: Optional alternate names users can pass to `npx @antardev/forge-dev init`.
- `description`: Human-friendly description used in listing and metadata.
- `version`: Optional preset version string for your own tracking.
- `runtime`: Required runtime. Supported: `node`, `python`, `go`.
- `packageManager`: Optional Node package manager override (`npm`, `pnpm`, `yarn`).
- `variables`: Optional input variables collected before steps execute.
- `steps`: Required ordered execution plan.
- `postRun`: Optional commands shown as next-step hints.

Variable formats:

- `type: string`: Free-text input. Supports optional `prompt` and `default`.
- `type: choice`: Select from `options`. Supports `prompt` and optional `default`.

Supported `steps` entries:

- `run`: Execute a shell command.
- `cd`: Change working directory.
- `install`: Install dependencies. Use `deps` array and optional `dev: true`.
- `file`: Render a template file. Use `template` and optional `vars` map.
- `env`: Set environment variables used by later steps.

Conditional execution:

- Any step can include an `if` object to match variable values before running.
- Example: `if: { database: postgres }`.

Template path behavior:

- Paths beginning with `./` are resolved relative to the preset YAML file.
- This keeps custom presets portable as self-contained modules.

`meta.json` (optional but recommended):

```json
{
  "name": "my-team-api",
  "description": "Express + Drizzle API scaffold",
  "tags": ["custom", "api"]
}
```

- `name`: Display name override for list output.
- `description`: Description override for list output.
- `tags`: Optional tags shown in `npx @antardev/forge-dev list`.

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
npx @antardev/forge-dev list
```

## Troubleshooting

### `Preset not found`

- Run `npx @antardev/forge-dev list`.
- Verify preset name/path.
- Validate YAML syntax.

### Missing formatter warnings

Expected when formatter tools are not installed globally.
Install the formatter you want, then run `npx @antardev/forge-dev doctor --refresh`.

### Remote preset blocked

You must pass `--trust` for GitHub preset URLs.

### Build works but built-ins not found

Ensure `npm run build` completed and copied assets into `dist`.

## License

MIT
