import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import {
  cacheCustomPresetBundle,
  isGitHubPresetSpecifier,
} from "../src/core/remote-presets.js";
import { loadPreset } from "../src/core/engine.js";

test("detects GitHub preset specifier format", () => {
  assert.equal(
    isGitHubPresetSpecifier("github.com/AntarMukhopadhyaya/custom-preset"),
    true,
  );
  assert.equal(isGitHubPresetSpecifier("https://github.com/owner/repo"), true);
  assert.equal(isGitHubPresetSpecifier("./presets/team.yaml"), false);
  assert.equal(isGitHubPresetSpecifier("next"), false);
});

test("cacheCustomPresetBundle stores preset and local templates", async () => {
  const originalForgeHome = process.env.FORGE_HOME;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-cache-bundle-"));

  try {
    process.env.FORGE_HOME = tempDir;

    const sourceDir = path.join(tempDir, "source");
    await fs.ensureDir(path.join(sourceDir, "templates"));

    const sourcePreset = path.join(sourceDir, "preset.yaml");
    await fs.writeFile(
      sourcePreset,
      `name: cached-team
runtime: node
steps:
  - file:
      path: README.md
      template: ./templates/README.md.tpl
`,
      "utf-8",
    );

    await fs.writeFile(
      path.join(sourceDir, "templates", "README.md.tpl"),
      "# {{project}}",
      "utf-8",
    );

    const cached = await cacheCustomPresetBundle(sourcePreset);

    const cachedTemplate = path.join(
      path.dirname(cached.storedPresetPath),
      "templates",
      "README.md.tpl",
    );

    assert.equal(await fs.pathExists(cached.storedPresetPath), true);
    assert.equal(await fs.pathExists(cachedTemplate), true);

    const loaded = await loadPreset(cached.storedPresetPath);
    assert.equal(loaded.name, "cached-team");
  } finally {
    if (originalForgeHome === undefined) {
      delete process.env.FORGE_HOME;
    } else {
      process.env.FORGE_HOME = originalForgeHome;
    }

    await fs.remove(tempDir);
  }
});
