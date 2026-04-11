# Commands

Forge command examples below use `npx @antardev/forge-dev`.

## `npx @antardev/forge-dev init <preset> <project>`

Create a project from a preset.

```bash
npx @antardev/forge-dev init <preset> <project-name>
```

Flags:

- `-d, --dry-run`: preview steps without writing files
- `-v, --verbose`: verbose logs
- `-y, --yes`: skip prompts and use defaults
- `--trust`: required for trusted remote GitHub presets

Examples:

```bash
npx @antardev/forge-dev init next-saas-pro my-saas-app
npx @antardev/forge-dev init express-ts-drizzle-postgres my-api
npx @antardev/forge-dev init ens my-app
npx @antardev/forge-dev init mern-stack my-app --dry-run
npx @antardev/forge-dev init ./presets/custom/team-api/preset.yaml team-app
npx @antardev/forge-dev init github.com/owner/custom-preset my-app --trust
```

## `npx @antardev/forge-dev scaffold <preset>`

Scaffold a workspace preset module under `./presets/custom/<name>/`.

```bash
npx @antardev/forge-dev scaffold <preset-name>
```

Flags:

- `-y, --yes`: skip prompts and use defaults
- `--runtime <runtime>`: runtime value for generated `preset.yaml`
- `--language <language>`: language value for generated `preset.yaml`
- `--package-manager <package-manager>`: package manager value for generated `preset.yaml`
- `--install-command <command>`: install command prefix for generated install steps

Examples:

```bash
npx @antardev/forge-dev scaffold my-team-api
npx @antardev/forge-dev scaffold flutter-supabase-riverpod --runtime flutter --language dart --package-manager pub --install-command "flutter pub add"
npx @antardev/forge-dev scaffold python-service --runtime python --language python --package-manager pip --install-command "pip install" --yes
```

## Related Commands

### `npx @antardev/forge-dev list`

Show available presets with source, aliases, and tags.

```bash
npx @antardev/forge-dev list
```

### `npx @antardev/forge-dev preset new <name>`

Create a global custom preset in `~/.forge/presets/custom`.

```bash
npx @antardev/forge-dev preset new team-api
```

### `npx @antardev/forge-dev preset scaffold <name>`

Scaffold a workspace-local preset in `./presets/custom`.

```bash
npx @antardev/forge-dev preset scaffold team-api
```

### `npx @antardev/forge-dev preset remove <name>`

Remove custom presets by name or alias.

```bash
npx @antardev/forge-dev preset remove team-api
npx @antardev/forge-dev preset remove ap
```

### `npx @antardev/forge-dev doctor`

Inspect environment and refresh cache.

```bash
npx @antardev/forge-dev doctor
npx @antardev/forge-dev doctor --refresh
```
