# Getting Started

Forge scaffolds projects from reusable presets.

## Requirements

- Node.js 20+
- npm

## Install

Global:

```bash
npm install -g @antardev/forge-dev
npx @antardev/forge-dev --help
```

Local development:

```bash
npm install
npm run dev -- --help
```

## First Project

```bash
npx @antardev/forge-dev init next-saas-pro my-app
cd my-app
npm run dev
```

## Try Aliases

Some presets expose aliases for faster usage.

```bash
npx @antardev/forge-dev init ens my-app
npx @antardev/forge-dev init expo-nw my-app
```

## Useful First Runs

Preview before writing files:

```bash
npx @antardev/forge-dev init mern-stack my-app --dry-run
```

List available presets:

```bash
npx @antardev/forge-dev list
```

Check local tooling:

```bash
npx @antardev/forge-dev doctor --refresh
```

Scaffold your own preset module:

```bash
npx @antardev/forge-dev scaffold my-team-api
```

Use a trusted remote preset:

```bash
npx @antardev/forge-dev init github.com/owner/custom-preset my-app --trust
```
