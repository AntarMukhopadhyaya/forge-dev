import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "node:path";
import { findYamlFilesRecursive } from "../src/core/preset-paths.js";

const workspaceRoot = process.cwd();

test("MERN root template does not pin npm dependency versions", async () => {
  const templatePath = path.join(
    workspaceRoot,
    "src",
    "presets",
    "builtins",
    "mern-stack",
    "templates",
    "root.package.json.tpl",
  );

  const content = await fs.readFile(templatePath, "utf-8");

  // Prevent pinned or ranged semver literals in package templates.
  const semverLiteral = /"[~^]?\d+\.\d+\.\d+"/;
  assert.equal(semverLiteral.test(content), false);
});

test("MERN preset install steps avoid explicit package versions", async () => {
  const presetPath = path.join(
    workspaceRoot,
    "src",
    "presets",
    "builtins",
    "mern-stack",
    "preset.yaml",
  );

  const content = await fs.readFile(presetPath, "utf-8");

  // Guard against package@1.2.3 style pinning in install commands.
  const explicitVersion = /npm install[^\n]*@[0-9]+(?:\.[0-9]+){1,2}/;
  assert.equal(explicitVersion.test(content), false);
});

test("built-in preset modules avoid pinned semver dependency literals", async () => {
  const builtinsDir = path.join(workspaceRoot, "src", "presets", "builtins");
  const yamlFiles = findYamlFilesRecursive(builtinsDir, 8);

  const semverLiteral = /"[~^]?\d+\.\d+\.\d+"/;

  for (const yamlFile of yamlFiles) {
    const content = await fs.readFile(yamlFile, "utf-8");
    assert.equal(semverLiteral.test(content), false, `Pinned semver in ${yamlFile}`);
  }
});
