# Examples

## Next.js + Supabase

Use built-in `next-saas-pro`:

```bash
npx @antardev/forge-dev init next-saas-pro my-saas-app
cd my-saas-app
npm run dev
```

Preview first:

```bash
npx @antardev/forge-dev init next-saas-pro my-saas-app --dry-run
```

Alias usage example:

```bash
npx @antardev/forge-dev init ens my-app
```

## Flutter + Riverpod (Custom Preset)

Scaffold a runtime-specific preset module:

```bash
npx @antardev/forge-dev scaffold flutter-supabase-riverpod --runtime flutter --language dart --package-manager pub --install-command "flutter pub add"
```

Then edit `preset.yaml` and templates, and run:

```bash
npx @antardev/forge-dev init flutter-supabase-riverpod my-flutter-app
```

## Express + Drizzle + Postgres

Use built-in preset:

```bash
npx @antardev/forge-dev init express-ts-drizzle-postgres my-api
cd my-api
npm run dev
```

## Local Preset by Path

```bash
npx @antardev/forge-dev init ./presets/custom/my-team-api/preset.yaml team-app
```

## Remote Preset (Trusted)

```bash
npx @antardev/forge-dev init github.com/owner/custom-preset my-app --trust
```

## Environment Check Before Scaffolding

```bash
npx @antardev/forge-dev doctor --refresh
npx @antardev/forge-dev init mern-stack my-app --dry-run
```
