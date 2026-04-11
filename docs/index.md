---
layout: home

hero:
  name: "Forge"
  text: "Define your stack once. Reuse it everywhere."
  tagline: "Runtime-agnostic preset scaffolding for modern teams."
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: Commands
      link: /commands

features:
  - title: Preset-Driven Scaffolding
    details: Create projects from reusable YAML presets and templates.
  - title: Runtime-Agnostic Workflow
    details: Define stacks for Node, Flutter, Python, Go, or custom runtimes.
  - title: Local + Remote Presets
    details: Use built-in presets, custom local modules, or trusted remote presets.
  - title: Safe by Default
    details: Dry runs, explicit trust for remote sources, and environment doctor checks.
---

Forge is a CLI for scaffolding app foundations quickly and consistently.
Define setup logic once in a preset, then reuse it across repos and teams.

## Quick Start

```bash
npx @antardev/forge-dev init next-saas-pro my-app
cd my-app
npm run dev
```

## Key Features

- Reusable preset modules with `preset.yaml` + `templates/`
- Variable prompts and conditional step execution
- Runtime-aware install/run behavior for Node, plus generic runtime metadata
- Custom preset scaffolding with runtime/language/package-manager options
- Remote preset support via `--trust`

## Why Forge?

Manual setup is repetitive and inconsistent across projects.
Forge gives you a single, versionable source of truth for project bootstrapping.
