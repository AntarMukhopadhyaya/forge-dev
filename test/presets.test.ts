import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { executeSteps, getAvailablePresets, loadPreset } from "../src/core/engine.js";
import { createPresetCommand } from "../src/commands/preset.js";

test("built-in presets include the new starters", () => {
  const presets = getAvailablePresets();

  assert.ok(presets.includes("expo"));
  assert.ok(presets.includes("next-supabase-drizzle"));
  assert.ok(presets.includes("next-saas-pro"));
  assert.ok(presets.includes("tanstack-start"));
  assert.ok(presets.includes("mern-stack"));
});

test("new starter presets load successfully", async () => {
  const expo = await loadPreset("expo");
  const nextSaasPro = await loadPreset("next-saas-pro");
  const nextSupabase = await loadPreset("next-supabase-drizzle");
  const tanstack = await loadPreset("tanstack-start");
  const mern = await loadPreset("mern-stack");

  assert.equal(expo.name, "expo");
  assert.equal(nextSaasPro.name, "next-saas-pro");
  assert.equal(nextSupabase.name, "next-supabase-drizzle");
  assert.equal(tanstack.name, "tanstack-start");
  assert.equal(mern.name, "mern-stack");
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
      template: ./templates/hello.txt.hbs
`,
      "utf-8",
    );
    await fs.writeFile(
      path.join(tempDir, "templates", "hello.txt.hbs"),
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

test("next preset still loads", async () => {
  const preset = await loadPreset("next");

  assert.equal(preset.name, "next-app");
  assert.ok(preset.steps.length > 0);
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
      "README.md.hbs",
    );
    const exists = await fs.pathExists(filePath);
    const templateExists = await fs.pathExists(templateFile);
    assert.equal(exists, true);
    assert.equal(templateExists, true);

    const content = await fs.readFile(filePath, "utf-8");
    assert.match(content, /name: my-team-starter/);
    assert.match(content, /template: \.\/templates\/README\.md\.hbs/);
    assert.match(content, /runtime: node/);
  } finally {
    if (originalForgeHome === undefined) {
      delete process.env.FORGE_HOME;
    } else {
      process.env.FORGE_HOME = originalForgeHome;
    }
    await fs.remove(tempDir);
  }
});
