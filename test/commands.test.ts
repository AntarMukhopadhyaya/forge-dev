import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";

const workspaceRoot = process.cwd();
const tsxBin = path.join(
  workspaceRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsx.cmd" : "tsx",
);
const entryPoint = path.join(workspaceRoot, "src", "index.ts");

async function runCli(
  args: string[],
  options: { cwd: string; forgeHome?: string },
): Promise<{ code: number; stdout: string; stderr: string }> {
  const env = { ...process.env };
  if (options.forgeHome) {
    env.FORGE_HOME = options.forgeHome;
  }

  const result = await execa(tsxBin, [entryPoint, ...args], {
    cwd: options.cwd,
    env,
    reject: false,
  });

  return {
    code: result.exitCode ?? 0,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

test("cli top-level scaffold creates local preset module", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-cli-scaffold-"));
  const forgeHome = path.join(tempDir, "forge-home");

  try {
    const result = await runCli(["scaffold", "team-api"], {
      cwd: tempDir,
      forgeHome,
    });

    assert.equal(result.code, 0);
    assert.match(result.stdout, /Created workspace preset/);

    const presetDir = path.join(tempDir, "presets", "custom", "team-api");
    assert.equal(await fs.pathExists(path.join(presetDir, "preset.yaml")), true);
    assert.equal(await fs.pathExists(path.join(presetDir, "meta.json")), true);
    assert.equal(
      await fs.pathExists(path.join(presetDir, "templates", "README.md.tpl")),
      true,
    );
  } finally {
    await fs.remove(tempDir);
  }
});

test("cli preset scaffold fails when preset already exists", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-cli-scaffold-dup-"));
  const forgeHome = path.join(tempDir, "forge-home");

  try {
    const first = await runCli(["preset", "scaffold", "team-api"], {
      cwd: tempDir,
      forgeHome,
    });
    assert.equal(first.code, 0);

    const second = await runCli(["preset", "scaffold", "team-api"], {
      cwd: tempDir,
      forgeHome,
    });

    assert.equal(second.code, 1);
    assert.match(second.stderr, /Preset already exists/);
  } finally {
    await fs.remove(tempDir);
  }
});

test("cli init dry-run works with scaffolded preset", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-cli-init-dry-"));
  const forgeHome = path.join(tempDir, "forge-home");

  try {
    const scaffold = await runCli(["preset", "scaffold", "simple-preset"], {
      cwd: tempDir,
      forgeHome,
    });
    assert.equal(scaffold.code, 0);

    const init = await runCli(
      ["init", "simple-preset", "demo-app", "--dry-run", "--yes"],
      {
        cwd: tempDir,
        forgeHome,
      },
    );

    assert.equal(init.code, 0);
    assert.match(init.stdout, /Dry Run Preview/);
    assert.match(init.stdout, /Done \(preview only\)/);
    assert.equal(await fs.pathExists(path.join(tempDir, "demo-app")), false);
  } finally {
    await fs.remove(tempDir);
  }
});

test("cli init blocks remote presets without trust", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-cli-init-trust-"));

  try {
    const result = await runCli(["init", "github.com/owner/repo", "demo-app"], {
      cwd: tempDir,
    });

    assert.equal(result.code, 1);
    assert.match(result.stderr, /require --trust/);
  } finally {
    await fs.remove(tempDir);
  }
});

test("cli init fails with helpful error for unknown preset", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-cli-init-missing-"));

  try {
    const result = await runCli(
      ["init", "does-not-exist", "demo-app", "--dry-run", "--yes"],
      { cwd: tempDir },
    );

    assert.equal(result.code, 1);
    assert.match(result.stderr, /Preset not found/);
  } finally {
    await fs.remove(tempDir);
  }
});

test("cli list uses custom preset meta.json name and tags", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-cli-list-meta-"));
  const forgeHome = path.join(tempDir, "forge-home");

  try {
    const scaffold = await runCli(["preset", "scaffold", "local-api"], {
      cwd: tempDir,
      forgeHome,
    });
    assert.equal(scaffold.code, 0);

    const metaPath = path.join(tempDir, "presets", "custom", "local-api", "meta.json");
    await fs.writeFile(
      metaPath,
      JSON.stringify(
        {
          name: "Local API Preset",
          description: "Local preset for command test",
          tags: ["custom", "local"],
        },
        null,
        2,
      ),
      "utf-8",
    );

    const list = await runCli(["list"], { cwd: tempDir, forgeHome });
    assert.equal(list.code, 0);
    assert.match(list.stdout, /Local API Preset/);
    assert.match(list.stdout, /\[custom\]/);
    assert.match(list.stdout, /\[custom, local\]/);
  } finally {
    await fs.remove(tempDir);
  }
});

test("cli doctor succeeds and writes doctor cache", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-cli-doctor-"));
  const forgeHome = path.join(tempDir, "forge-home");

  try {
    const doctor = await runCli(["doctor", "--refresh"], {
      cwd: tempDir,
      forgeHome,
    });

    assert.equal(doctor.code, 0);
    assert.match(doctor.stdout, /Forge Doctor/);
    assert.equal(await fs.pathExists(path.join(forgeHome, "doctor.json")), true);
  } finally {
    await fs.remove(tempDir);
  }
});

test("cli preset new creates global custom preset in FORGE_HOME", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-cli-new-"));
  const forgeHome = path.join(tempDir, "forge-home");

  try {
    const result = await runCli(["preset", "new", "Global Starter"], {
      cwd: tempDir,
      forgeHome,
    });

    assert.equal(result.code, 0);

    const presetDir = path.join(forgeHome, "presets", "custom", "global-starter");
    assert.equal(await fs.pathExists(path.join(presetDir, "preset.yaml")), true);
    assert.equal(await fs.pathExists(path.join(presetDir, "meta.json")), true);
  } finally {
    await fs.remove(tempDir);
  }
});

test("cli preset new fails for invalid preset names", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-cli-new-invalid-"));
  const forgeHome = path.join(tempDir, "forge-home");

  try {
    const result = await runCli(["preset", "new", "!!!"], {
      cwd: tempDir,
      forgeHome,
    });

    assert.equal(result.code, 1);
    assert.match(result.stderr, /Preset name must include at least one letter or number/);
  } finally {
    await fs.remove(tempDir);
  }
});

test("cli preset remove rejects built-in presets", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-cli-remove-builtin-"));

  try {
    const result = await runCli(["preset", "remove", "ens"], {
      cwd: tempDir,
    });

    assert.equal(result.code, 1);
    assert.match(result.stderr, /Built-in presets cannot be removed/);
  } finally {
    await fs.remove(tempDir);
  }
});

test("cli preset remove fails for missing custom preset", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-cli-remove-missing-"));
  const forgeHome = path.join(tempDir, "forge-home");

  try {
    const result = await runCli(["preset", "remove", "missing-preset"], {
      cwd: tempDir,
      forgeHome,
    });

    assert.equal(result.code, 1);
    assert.match(result.stderr, /Custom preset not found/);
  } finally {
    await fs.remove(tempDir);
  }
});

test("cli preset remove deletes a custom preset by alias", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-cli-remove-alias-"));
  const forgeHome = path.join(tempDir, "forge-home");

  try {
    const presetDir = path.join(tempDir, "presets", "custom", "alias-preset");
    await fs.ensureDir(path.join(presetDir, "templates"));
    await fs.writeFile(
      path.join(presetDir, "preset.yaml"),
      `name: alias-preset\naliases:\n  - ap\nruntime: node\nsteps:\n  - run: echo hello\n`,
      "utf-8",
    );

    const result = await runCli(["preset", "remove", "ap"], {
      cwd: tempDir,
      forgeHome,
    });

    assert.equal(result.code, 0);
    assert.equal(await fs.pathExists(presetDir), false);
  } finally {
    await fs.remove(tempDir);
  }
});

test("cli with no command shows getting started fallback", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-cli-fallback-"));

  try {
    const result = await runCli([], { cwd: tempDir });

    assert.ok([0, 1].includes(result.code));
    assert.match(result.stdout, /Get started/);
    assert.match(result.stdout, /Browse presets/);
  } finally {
    await fs.remove(tempDir);
  }
});

test("cli help includes top-level scaffold and bring-your-own-preset copy", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-cli-help-"));

  try {
    const result = await runCli(["--help"], { cwd: tempDir });

    assert.ok([0, 1].includes(result.code));
    assert.match(result.stdout, /scaffold/);
    assert.match(result.stdout, /Bring your own preset/);
  } finally {
    await fs.remove(tempDir);
  }
});

test("cli list displays built-in presets with builtin marker", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-cli-list-builtin-"));

  try {
    const result = await runCli(["list"], { cwd: tempDir });

    assert.equal(result.code, 0);
    assert.match(result.stdout, /\[builtin\]/);
    assert.match(result.stdout, /next-saas-pro|mern-stack|express-ts-drizzle-postgres/);
  } finally {
    await fs.remove(tempDir);
  }
});

test("cli preset scaffold normalizes name to kebab-case", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-cli-scaffold-kebab-"));
  const forgeHome = path.join(tempDir, "forge-home");

  try {
    const result = await runCli(["preset", "scaffold", "My Team Preset"], {
      cwd: tempDir,
      forgeHome,
    });

    assert.equal(result.code, 0);
    assert.equal(
      await fs.pathExists(
        path.join(tempDir, "presets", "custom", "my-team-preset", "preset.yaml"),
      ),
      true,
    );
  } finally {
    await fs.remove(tempDir);
  }
});

test("cli preset scaffold records custom runtime metadata", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-cli-scaffold-runtime-"));
  const forgeHome = path.join(tempDir, "forge-home");

  try {
    const result = await runCli(
      [
        "preset",
        "scaffold",
        "flutter-supabase-riverpod",
        "--runtime",
        "flutter",
        "--language",
        "dart",
        "--package-manager",
        "pub",
        "--install-command",
        "flutter pub add",
      ],
      { cwd: tempDir, forgeHome },
    );

    assert.equal(result.code, 0);

    const presetYaml = await fs.readFile(
      path.join(tempDir, "presets", "custom", "flutter-supabase-riverpod", "preset.yaml"),
      "utf-8",
    );

    assert.match(presetYaml, /runtime: flutter/);
    assert.match(presetYaml, /language: dart/);
    assert.match(presetYaml, /packageManager: pub/);
    assert.match(presetYaml, /command: "flutter pub add"/);
  } finally {
    await fs.remove(tempDir);
  }
});

test("cli init can load a preset from explicit yaml path", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-cli-init-path-"));
  const forgeHome = path.join(tempDir, "forge-home");

  try {
    const presetPath = path.join(tempDir, "my-preset.yaml");
    await fs.writeFile(
      presetPath,
      `name: my-preset\nruntime: node\nvariables:\n  project:\n    type: string\n    default: app\nsteps:\n  - run: echo hello\n`,
      "utf-8",
    );

    const result = await runCli(["init", presetPath, "demo-app", "--dry-run", "--yes"], {
      cwd: tempDir,
      forgeHome,
    });

    assert.equal(result.code, 0);
    assert.match(result.stdout, /Dry Run Preview/);
  } finally {
    await fs.remove(tempDir);
  }
});

test("cli init fails when project name is missing and no default exists", async () => {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "forge-cli-init-project-required-"),
  );
  const forgeHome = path.join(tempDir, "forge-home");

  try {
    const presetPath = path.join(tempDir, "no-project.yaml");
    await fs.writeFile(
      presetPath,
      `name: no-project\nruntime: node\nsteps:\n  - run: echo hello\n`,
      "utf-8",
    );

    const result = await runCli(["init", presetPath, "--dry-run", "--yes"], {
      cwd: tempDir,
      forgeHome,
    });

    assert.equal(result.code, 1);
    assert.match(result.stderr, /Project name is required/);
  } finally {
    await fs.remove(tempDir);
  }
});

test("cli init with --yes uses default project variable", async () => {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "forge-cli-init-default-project-"),
  );
  const forgeHome = path.join(tempDir, "forge-home");

  try {
    const scaffold = await runCli(["preset", "scaffold", "defaults-preset"], {
      cwd: tempDir,
      forgeHome,
    });
    assert.equal(scaffold.code, 0);

    const result = await runCli(["init", "defaults-preset", "--dry-run", "--yes"], {
      cwd: tempDir,
      forgeHome,
    });

    assert.equal(result.code, 0);
    assert.match(result.stdout, /cd my-app/);
  } finally {
    await fs.remove(tempDir);
  }
});

test("cli preset new then remove by name deletes global preset directory", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-cli-new-remove-"));
  const forgeHome = path.join(tempDir, "forge-home");

  try {
    const created = await runCli(["preset", "new", "Delete Me"], {
      cwd: tempDir,
      forgeHome,
    });
    assert.equal(created.code, 0);

    const presetDir = path.join(forgeHome, "presets", "custom", "delete-me");
    assert.equal(await fs.pathExists(presetDir), true);

    const removed = await runCli(["preset", "remove", "delete-me"], {
      cwd: tempDir,
      forgeHome,
    });
    assert.equal(removed.code, 0);
    assert.equal(await fs.pathExists(presetDir), false);
  } finally {
    await fs.remove(tempDir);
  }
});

test("cli preset remove can delete non-module yaml custom entries", async () => {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "forge-cli-remove-loose-yaml-"),
  );
  const forgeHome = path.join(tempDir, "forge-home");

  try {
    const looseDir = path.join(tempDir, "presets", "custom", "loose");
    await fs.ensureDir(looseDir);
    const looseYaml = path.join(looseDir, "quick.yaml");
    await fs.writeFile(
      looseYaml,
      `name: quick\nruntime: node\nsteps:\n  - run: echo quick\n`,
      "utf-8",
    );

    const removed = await runCli(["preset", "remove", "quick"], {
      cwd: tempDir,
      forgeHome,
    });
    assert.equal(removed.code, 0);
    assert.equal(await fs.pathExists(looseYaml), false);
  } finally {
    await fs.remove(tempDir);
  }
});

test("cli doctor without refresh reuses existing cache", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-cli-doctor-cache-"));
  const forgeHome = path.join(tempDir, "forge-home");
  const cachePath = path.join(forgeHome, "doctor.json");

  try {
    const first = await runCli(["doctor", "--refresh"], {
      cwd: tempDir,
      forgeHome,
    });
    assert.equal(first.code, 0);

    const initialContent = await fs.readFile(cachePath, "utf-8");
    const second = await runCli(["doctor"], {
      cwd: tempDir,
      forgeHome,
    });
    assert.equal(second.code, 0);

    const secondContent = await fs.readFile(cachePath, "utf-8");
    assert.equal(secondContent, initialContent);
  } finally {
    await fs.remove(tempDir);
  }
});
