import test from "node:test";
import assert from "node:assert/strict";
import { rewriteNodeRunCommand } from "../src/core/runtime.js";
import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { loadPreset } from "../src/core/engine.js";

test("rewriteNodeRunCommand keeps npm commands unchanged", () => {
  const original =
    "cd backend && npm install express cors dotenv && npm run dev --prefix backend";

  const rewritten = rewriteNodeRunCommand(original, "npm");

  assert.equal(rewritten, original);
});

test("rewriteNodeRunCommand rewrites npm install and npm run for pnpm", () => {
  const original =
    "cd backend && npm install express cors dotenv && npm run dev --prefix backend";

  const rewritten = rewriteNodeRunCommand(original, "pnpm");

  assert.equal(
    rewritten,
    "cd backend && pnpm add express cors dotenv && pnpm -C backend run dev",
  );
});

test("rewriteNodeRunCommand rewrites npx and npm create for pnpm", () => {
  const original =
    "npx create-next-app@latest . --yes && npm create vite@latest frontend -- --template react-ts --no-install";

  const rewritten = rewriteNodeRunCommand(original, "pnpm");

  assert.equal(
    rewritten,
    "pnpm dlx create-next-app@latest . --yes && pnpm create vite@latest frontend -- --template react-ts --no-install",
  );
});

test("rewriteNodeRunCommand rewrites npm install and run for yarn", () => {
  const original = "npm install -D typescript @types/node && npm run test";

  const rewritten = rewriteNodeRunCommand(original, "yarn");

  assert.equal(rewritten, "yarn add -D typescript @types/node && yarn run test");
});

test("rewriteNodeRunCommand rewrites npm run with --prefix for yarn", () => {
  const original = "npm run dev --prefix frontend";

  const rewritten = rewriteNodeRunCommand(original, "yarn");

  assert.equal(rewritten, "yarn --cwd frontend run dev");
});

test("loadPreset accepts non-node runtime and custom install command", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-runtime-schema-"));

  try {
    const presetPath = path.join(tempDir, "flutter-supabase.yaml");
    await fs.writeFile(
      presetPath,
      `name: flutter-supabase\nruntime: flutter\nlanguage: dart\nsteps:\n  - install:\n      command: flutter pub add\n      deps:\n        - supabase_flutter\n        - flutter_riverpod\n`,
      "utf-8",
    );

    const preset = await loadPreset(presetPath);

    assert.equal(preset.runtime, "flutter");
    assert.equal(preset.language, "dart");
    assert.equal(preset.steps[0] && "install" in preset.steps[0], true);
  } finally {
    await fs.remove(tempDir);
  }
});
