import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import {
  ensureDoctorProfile,
  readDoctorCache,
  resolveNodePackageManager,
} from "../src/core/doctor.js";
import { getForgeDoctorCachePath } from "../src/core/preset-paths.js";

test("doctor cache is created and can be read", async () => {
  const originalForgeHome = process.env.FORGE_HOME;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-doctor-cache-"));

  try {
    process.env.FORGE_HOME = tempDir;

    const profile = await ensureDoctorProfile({ force: true });
    const cachePath = getForgeDoctorCachePath();

    assert.equal(await fs.pathExists(cachePath), true);
    assert.equal(profile.schemaVersion, 2);
    assert.equal(typeof profile.formatters.prettier.installed, "boolean");
    assert.equal(typeof profile.formatters.black.installed, "boolean");
    assert.equal(typeof profile.formatters.gofmt.installed, "boolean");
    assert.equal(typeof profile.formatters["google-java-format"].installed, "boolean");

    const cached = await readDoctorCache();
    assert.notEqual(cached, null);
    assert.equal(cached?.schemaVersion, 2);
  } finally {
    if (originalForgeHome === undefined) {
      delete process.env.FORGE_HOME;
    } else {
      process.env.FORGE_HOME = originalForgeHome;
    }

    await fs.remove(tempDir);
  }
});

test("doctor resolves requested and default package manager", async () => {
  const manager = await resolveNodePackageManager();
  assert.ok(["npm", "pnpm", "yarn"].includes(manager));

  const npmManager = await resolveNodePackageManager("npm");
  assert.equal(npmManager, "npm");
});
