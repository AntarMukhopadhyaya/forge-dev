# Presets

A preset is a reusable module that defines how to scaffold a project.

Presets are the core building block of Forge.

They define how a project is scaffolded, including commands, files, and runtime behavior.

Understanding presets is key to using Forge effectively.

## Quick Example

```bash
npx @antardev/forge-dev init next-saas-pro my-app
```

That single command works because Forge loads the preset, resolves variables, executes steps, and writes project files.

## Mental Model

Preset = Metadata + Variables + Steps + Templates

Forge = Executes Preset -> Produces Project

## Preset Structure

- Metadata (`name`, `description`, `version`)
- Optional aliases (`aliases`) for alternate init names
- Runtime metadata (`runtime`, optional `language`, optional `packageManager`)
- Variables to collect from users
- Ordered `steps` to execute
- Optional `postRun` next-step hints

## How Presets Work

1. Forge loads a preset by name or path.
2. It collects variable values (or defaults).
3. It executes steps in order (`run`, `cd`, `install`, `file`, `env`).
4. It prints optional post-run commands.

## Runtime-Agnostic Behavior

Presets are runtime-agnostic at the schema level.

This means the same system works for Node, Flutter, Go, and more.

- Use `runtime` to label the target stack (`node`, `flutter`, `python`, `go`, etc.)
- For Node presets, Forge resolves package manager behavior automatically.
- For non-Node stacks, presets can use runtime-specific `run` commands and custom install commands.

## Step Types

### run

Executes a shell command immediately.

### cd

Changes working directory for the next steps.

### install

Installs dependencies using runtime defaults or `install.command`.

### file

Renders a template into a target file path.

### env

Writes environment key/value pairs to `.env`.

### postRun

Does not execute commands.

It prints next-step instructions after scaffolding.

## Aliases

Aliases let users initialize with shorthand names.

```yaml
name: expo-nativewind-supabase
aliases:
  - ens
  - expo-nw
```

```bash
npx @antardev/forge-dev init ens my-app
```

## Resolution Order

When running `npx @antardev/forge-dev init <preset>` Forge resolves presets in this order:

1. Path-like input (`/`, `\\`, `.yaml`, `.yml`)
2. Workspace presets (`./presets` and `./presets/custom`)
3. Global custom presets (`~/.forge/presets/custom`)
4. Built-in preset modules

If a preset path is used, Forge caches it for short-name reuse.

## Template Path Rules

- `./templates/...` resolves relative to the preset YAML file.
- This keeps custom presets portable as self-contained modules.

## Conditional Steps

Any step can include `if` and runs only when the variable value matches.

```yaml
- run: echo "Using Postgres"
  if:
    database: postgres
```

## Node Package Manager Behavior

- Node install steps use detected/requested `npm`, `pnpm`, or `yarn`.
- Node run commands are rewritten when needed (`npm install`, `npm run --prefix`, `npx`, `npm create`).

## Minimal Preset Example

```yaml
name: my-team-api
description: "Team API starter"
version: "1.0"
runtime: node
packageManager: npm

variables:
  project:
    type: string
    prompt: "Project name"
    default: "my-api"

steps:
  - run: npm init -y
  - install:
      deps: [express, zod]
  - file:
      path: README.md
      template: ./templates/README.md.tpl

postRun:
  - npm run dev
```
