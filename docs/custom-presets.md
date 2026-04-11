# Custom Presets

Create custom presets to standardize your team setup.

## Create a Preset Module

Workspace-local preset:

```bash
npx @antardev/forge-dev scaffold my-team-api
```

Runtime-specific scaffold:

```bash
npx @antardev/forge-dev scaffold flutter-supabase-riverpod --runtime flutter --language dart --package-manager pub --install-command "flutter pub add"
```

Global custom preset:

```bash
npx @antardev/forge-dev preset new my-team-api
```

## Generated Structure

```text
presets/custom/my-team-api/
  preset.yaml
  meta.json
  templates/
    README.md.tpl
```

Built-in presets use the same module style under `src/presets/builtins/<preset>/`.

## preset.yaml Basics

`preset.yaml` defines runtime metadata, variables, and execution steps.

```yaml
name: flutter-supabase-riverpod
runtime: flutter
language: dart
packageManager: pub

steps:
  - install:
      command: "flutter pub add"
      deps:
        - supabase_flutter
        - flutter_riverpod
  - file:
      path: README.md
      template: ./templates/README.md.tpl
```

## Templates

Templates are rendered with Handlebars variables.

Example template (`templates/README.md.tpl`):

```md
# {{project}}

Generated with Forge.
```

Template values come from variables and optional `file.vars`.

## Step Behavior Quick Guide

- `run` executes immediately.
- `install` installs dependencies and can use `install.command`.
- `file` writes rendered files.
- `env` writes `.env` entries.
- `postRun` prints suggested next commands only.

## Optional meta.json

`meta.json` improves list output.

```json
{
  "name": "Flutter Supabase Riverpod",
  "description": "Flutter starter with Supabase and Riverpod",
  "tags": ["flutter", "supabase", "riverpod"]
}
```

## Formatting Notes

Forge formats generated files by extension when formatter tools are available.
If a formatter is missing, Forge warns and continues.
