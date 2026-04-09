import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { executeSteps, getAvailablePresets, loadPreset } from "../src/core/engine.js";
import {
  createPresetCommand,
  isBuiltinPresetIdentifier,
  removePresetCommand,
  scaffoldPresetCommand,
} from "../src/commands/preset.js";

async function getBuiltInPresetAliases(): Promise<string[]> {
  const builtinsDir = path.join(process.cwd(), "src", "presets", "builtins");
  const entries = await fs.readdir(builtinsDir, { withFileTypes: true });
  const aliases: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const presetYaml = path.join(builtinsDir, entry.name, "preset.yaml");
    const presetYml = path.join(builtinsDir, entry.name, "preset.yml");
    const hasPresetFile =
      (await fs.pathExists(presetYaml)) || (await fs.pathExists(presetYml));

    if (hasPresetFile) {
      aliases.push(entry.name);
    }
  }

  return aliases.sort((a, b) => a.localeCompare(b));
}

test("built-in preset aliases are discoverable", async () => {
  const aliases = await getBuiltInPresetAliases();
  const presets = getAvailablePresets();

  assert.ok(aliases.length > 0);

  for (const alias of aliases) {
    assert.ok(
      presets.includes(alias),
      `Expected available presets to include built-in alias '${alias}'`,
    );
  }
});

test("all built-in preset aliases load successfully", async () => {
  const aliases = await getBuiltInPresetAliases();

  for (const alias of aliases) {
    const preset = await loadPreset(alias);
    assert.equal(typeof preset.name, "string");
    assert.ok(preset.steps.length > 0, `Preset '${alias}' should include steps`);
  }
});

test("next-saas-pro auto-generates drizzle schema file", async () => {
  const preset = await loadPreset("next-saas-pro");

  const hasSchemaTemplate = preset.steps.some(
    (step) =>
      "file" in step &&
      step.file.path === "src/lib/schema.ts" &&
      step.file.template === "./templates/schema.ts.tpl",
  );

  const hasAuthGenerateStep = preset.steps.some(
    (step) =>
      "run" in step &&
      step.run === "npx auth@latest generate --output ./src/lib/schema.ts --yes",
  );

  assert.equal(hasSchemaTemplate, true);
  assert.equal(hasAuthGenerateStep, true);
  assert.ok(
    !preset.postRun?.includes("npx auth@latest generate"),
    "postRun should no longer require manual auth schema generation",
  );
});

test("expo-nativewind-supabase layout template returns Stack", async () => {
  const builtinDir = path.join(
    process.cwd(),
    "src",
    "presets",
    "builtins",
    "expo-nativewind-supabase",
    "templates",
  );
  const layoutTemplatePath = path.join(builtinDir, "layout.tsx.tpl");
  const content = await fs.readFile(layoutTemplatePath, "utf-8");

  assert.match(content, /return\s*<Stack\s*\/>\s*;/);
  assert.ok(!content.includes("return;"));
});

test("expo-nativewind-supabase writes supabase client to lib path", async () => {
  const preset = await loadPreset("expo-nativewind-supabase");

  const hasLibSupabaseStep = preset.steps.some(
    (step) =>
      "file" in step &&
      step.file.path === "lib/supabase.ts" &&
      step.file.template === "./templates/supabase.ts.tpl",
  );

  assert.equal(hasLibSupabaseStep, true);
});

test("expo-nativewind-supabase resolves from aliases", async () => {
  const presetByEns = await loadPreset("ens");
  const presetByExpoNw = await loadPreset("expo-nw");
  const presetByExpoNativewind = await loadPreset("expo-nativewind");

  assert.equal(presetByEns.name, "expo-nativewind-supabase");
  assert.equal(presetByExpoNw.name, "expo-nativewind-supabase");
  assert.equal(presetByExpoNativewind.name, "expo-nativewind-supabase");
});

test("preset aliases appear in discoverable preset list", () => {
  const presets = getAvailablePresets();

  assert.ok(presets.includes("ens"));
  assert.ok(presets.includes("expo-nw"));
  assert.ok(presets.includes("expo-nativewind"));
});

test("expo-nativewind-supabase includes eslint override template for node config files", async () => {
  const templatesDir = path.join(
    process.cwd(),
    "src",
    "presets",
    "builtins",
    "expo-nativewind-supabase",
    "templates",
  );

  const eslintConfig = await fs.readFile(
    path.join(templatesDir, "eslint.config.js.tpl"),
    "utf-8",
  );
  const babelConfig = await fs.readFile(
    path.join(templatesDir, "babel.config.js.tpl"),
    "utf-8",
  );
  const metroConfig = await fs.readFile(
    path.join(templatesDir, "metro.config.js.tpl"),
    "utf-8",
  );
  const tailwindConfig = await fs.readFile(
    path.join(templatesDir, "tailwind.config.js.tpl"),
    "utf-8",
  );

  assert.ok(eslintConfig.includes("babel.config.js"));
  assert.ok(eslintConfig.includes("metro.config.js"));
  assert.ok(eslintConfig.includes("tailwind.config.js"));
  assert.ok(eslintConfig.includes("@typescript-eslint/no-require-imports"));
  assert.ok(!babelConfig.includes("eslint-env node"));
  assert.ok(!metroConfig.includes("eslint-env node"));
  assert.ok(!tailwindConfig.includes("eslint-env node"));
});

test("express-ts-drizzle-postgres includes Drizzle schema/config and env wiring", async () => {
  const preset = await loadPreset("express-ts-drizzle-postgres");

  const hasSchemaStep = preset.steps.some(
    (step) =>
      "file" in step &&
      step.file.path === "src/db/schema.ts" &&
      step.file.template === "./templates/schema.ts.tpl",
  );

  const hasDrizzleConfigStep = preset.steps.some(
    (step) =>
      "file" in step &&
      step.file.path === "drizzle.config.ts" &&
      step.file.template === "./templates/drizzle.config.ts.tpl",
  );

  const hasEnvStep = preset.steps.some(
    (step) =>
      "env" in step &&
      step.env.DATABASE_URL === "{{databaseUrl}}" &&
      step.env.PORT === "{{port}}",
  );

  assert.equal(hasSchemaStep, true);
  assert.equal(hasDrizzleConfigStep, true);
  assert.equal(hasEnvStep, true);
});

test("express-ts-drizzle-postgres users route template includes zod validation and drizzle insert", async () => {
  const templatesDir = path.join(
    process.cwd(),
    "src",
    "presets",
    "builtins",
    "express-ts-drizzle-postgres",
    "templates",
  );

  const usersRoute = await fs.readFile(path.join(templatesDir, "users.ts.tpl"), "utf-8");

  assert.ok(usersRoute.includes("z.object("));
  assert.ok(usersRoute.includes("validate(createUserSchema)"));
  assert.ok(usersRoute.includes("db.insert(users)"));
});

test("express-ts-drizzle-postgres package template is valid JSON", async () => {
  const packageTemplatePath = path.join(
    process.cwd(),
    "src",
    "presets",
    "builtins",
    "express-ts-drizzle-postgres",
    "templates",
    "package.json.tpl",
  );

  const packageTemplate = await fs.readFile(packageTemplatePath, "utf-8");
  const concrete = packageTemplate.replace("{{project}}", "my-api");

  assert.doesNotThrow(() => JSON.parse(concrete));
});

test("express-ts-drizzle-postgres installs Drizzle packages and avoids Prisma", async () => {
  const preset = await loadPreset("express-ts-drizzle-postgres");

  const hasDrizzleRuntimeDeps = preset.steps.some(
    (step) =>
      "install" in step &&
      step.install.deps.includes("drizzle-orm") &&
      step.install.deps.includes("pg"),
  );

  const hasDrizzleKitDevDep = preset.steps.some(
    (step) => "install" in step && step.install.deps.includes("drizzle-kit"),
  );

  const hasPgTypesDevDep = preset.steps.some(
    (step) => "install" in step && step.install.deps.includes("@types/pg"),
  );

  const hasPrismaDep = preset.steps.some(
    (step) =>
      "install" in step && step.install.deps.some((dep) => dep.includes("prisma")),
  );

  assert.equal(hasDrizzleRuntimeDeps, true);
  assert.equal(hasDrizzleKitDevDep, true);
  assert.equal(hasPgTypesDevDep, true);
  assert.equal(hasPrismaDep, false);
});

test("mern-stack root package template is valid JSON", async () => {
  const templatePath = path.join(
    process.cwd(),
    "src",
    "presets",
    "builtins",
    "mern-stack",
    "templates",
    "root.package.json.tpl",
  );

  const template = await fs.readFile(templatePath, "utf-8");
  const concrete = template.replace("{{project}}", "my-app");

  assert.doesNotThrow(() => JSON.parse(concrete));
});

test("mern-stack vite bootstrap command is non-interactive", async () => {
  const preset = await loadPreset("mern-stack");
  const firstRunStep = preset.steps.find((step) => "run" in step);

  assert.ok(firstRunStep && "run" in firstRunStep);
  if (!firstRunStep || !("run" in firstRunStep)) {
    return;
  }

  assert.ok(firstRunStep.run.includes("npx create-vite@latest frontend"));
  assert.ok(firstRunStep.run.includes("--no-install"));
  assert.ok(firstRunStep.run.includes("--no-interactive"));
});

test("mern-stack vite proxy template keeps API base path quoted", async () => {
  const templatePath = path.join(
    process.cwd(),
    "src",
    "presets",
    "builtins",
    "mern-stack",
    "templates",
    "vite.config.ts.tpl",
  );

  const template = await fs.readFile(templatePath, "utf-8");
  assert.ok(template.includes('"{{viteApiBaseUrl}}":'));
});

test("custom preset can use local templates next to the yaml", async () => {
  const originalCwd = process.cwd();
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-local-template-"));

  try {
    await fs.ensureDir(path.join(tempDir, "templates"));
    await fs.writeFile(
      path.join(tempDir, "preset.yaml"),
      `name: local-template
runtime: node
steps:
  - file:
      path: output.txt
      template: ./templates/hello.txt.tpl
`,
      "utf-8",
    );
    await fs.writeFile(
      path.join(tempDir, "templates", "hello.txt.tpl"),
      "Hello {{name}}!",
      "utf-8",
    );

    const preset = await loadPreset(path.join(tempDir, "preset.yaml"));
    process.chdir(tempDir);

    await executeSteps(preset, { name: "Forge" }, { dryRun: false });

    const content = await fs.readFile(path.join(tempDir, "output.txt"), "utf-8");
    assert.equal(content, "Hello Forge!");
  } finally {
    process.chdir(originalCwd);
    await fs.remove(tempDir);
  }
});

test("custom preset can be loaded by short name from presets directory", async () => {
  const originalCwd = process.cwd();
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-custom-load-"));

  try {
    await fs.ensureDir(path.join(tempDir, "presets"));
    await fs.writeFile(
      path.join(tempDir, "presets", "my-custom.yaml"),
      `name: my-custom
runtime: node
steps:
  - run: echo hello
`,
      "utf-8",
    );

    process.chdir(tempDir);
    const preset = await loadPreset("my-custom");
    assert.equal(preset.name, "my-custom");
    assert.equal(preset.steps.length, 1);
  } finally {
    process.chdir(originalCwd);
    await fs.remove(tempDir);
  }
});

test("custom preset can be loaded by short name from global forge preset directory", async () => {
  const originalForgeHome = process.env.FORGE_HOME;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-global-custom-load-"));

  try {
    process.env.FORGE_HOME = tempDir;

    const presetDir = path.join(tempDir, "presets", "custom", "team-stack");
    await fs.ensureDir(presetDir);
    await fs.writeFile(
      path.join(presetDir, "preset.yaml"),
      `name: team-stack
runtime: node
steps:
  - run: echo hello
`,
      "utf-8",
    );

    const preset = await loadPreset("team-stack");
    assert.equal(preset.name, "team-stack");
    assert.equal(preset.steps.length, 1);
  } finally {
    if (originalForgeHome === undefined) {
      delete process.env.FORGE_HOME;
    } else {
      process.env.FORGE_HOME = originalForgeHome;
    }
    await fs.remove(tempDir);
  }
});

test("preset scaffold command creates yaml file under presets", async () => {
  const originalForgeHome = process.env.FORGE_HOME;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-preset-new-"));

  try {
    process.env.FORGE_HOME = tempDir;
    await createPresetCommand("My Team Starter");

    const filePath = path.join(
      tempDir,
      "presets",
      "custom",
      "my-team-starter",
      "preset.yaml",
    );
    const templateFile = path.join(
      tempDir,
      "presets",
      "custom",
      "my-team-starter",
      "templates",
      "README.md.tpl",
    );
    const metaFile = path.join(
      tempDir,
      "presets",
      "custom",
      "my-team-starter",
      "meta.json",
    );
    const exists = await fs.pathExists(filePath);
    const templateExists = await fs.pathExists(templateFile);
    const metaExists = await fs.pathExists(metaFile);
    assert.equal(exists, true);
    assert.equal(templateExists, true);
    assert.equal(metaExists, true);

    const content = await fs.readFile(filePath, "utf-8");
    const metaContent = await fs.readFile(metaFile, "utf-8");
    assert.match(content, /name: my-team-starter/);
    assert.match(content, /template: \.\/templates\/README\.md\.tpl/);
    assert.match(content, /runtime: node/);
    assert.match(metaContent, /"name": "my-team-starter"/);
  } finally {
    if (originalForgeHome === undefined) {
      delete process.env.FORGE_HOME;
    } else {
      process.env.FORGE_HOME = originalForgeHome;
    }
    await fs.remove(tempDir);
  }
});

test("preset scaffold command creates workspace-local preset module", async () => {
  const originalCwd = process.cwd();
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-preset-scaffold-"));

  try {
    process.chdir(tempDir);
    await scaffoldPresetCommand("Workspace Starter");

    const presetDir = path.join(tempDir, "presets", "custom", "workspace-starter");
    const presetFile = path.join(presetDir, "preset.yaml");
    const templateFile = path.join(presetDir, "templates", "README.md.tpl");
    const metaFile = path.join(presetDir, "meta.json");

    assert.equal(await fs.pathExists(presetFile), true);
    assert.equal(await fs.pathExists(templateFile), true);
    assert.equal(await fs.pathExists(metaFile), true);

    const loaded = await loadPreset("workspace-starter");
    assert.equal(loaded.name, "workspace-starter");
  } finally {
    process.chdir(originalCwd);
    await fs.remove(tempDir);
  }
});

test("built-in preset identifiers are protected from remove", () => {
  assert.equal(isBuiltinPresetIdentifier("expo-nativewind-supabase"), true);
  assert.equal(isBuiltinPresetIdentifier("ens"), true);
  assert.equal(isBuiltinPresetIdentifier("not-a-real-preset"), false);
});

test("preset remove command deletes custom preset directory", async () => {
  const originalForgeHome = process.env.FORGE_HOME;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-preset-remove-"));

  try {
    process.env.FORGE_HOME = tempDir;
    await createPresetCommand("Removable Preset");

    const presetDir = path.join(tempDir, "presets", "custom", "removable-preset");
    const existsBefore = await fs.pathExists(presetDir);
    assert.equal(existsBefore, true);

    await removePresetCommand("removable-preset");

    const existsAfter = await fs.pathExists(presetDir);
    assert.equal(existsAfter, false);
  } finally {
    if (originalForgeHome === undefined) {
      delete process.env.FORGE_HOME;
    } else {
      process.env.FORGE_HOME = originalForgeHome;
    }
    await fs.remove(tempDir);
  }
});
