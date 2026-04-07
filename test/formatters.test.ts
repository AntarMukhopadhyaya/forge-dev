import test from "node:test";
import assert from "node:assert/strict";
import { getFormatterForFile } from "../src/core/formatters.js";

test("maps JS and TS files to prettier", () => {
  assert.equal(getFormatterForFile("src/app.ts"), "prettier");
  assert.equal(getFormatterForFile("src/app.tsx"), "prettier");
  assert.equal(getFormatterForFile("src/app.js"), "prettier");
});

test("maps language-specific files to expected formatter", () => {
  assert.equal(getFormatterForFile("main.py"), "black");
  assert.equal(getFormatterForFile("main.go"), "gofmt");
  assert.equal(getFormatterForFile("Main.java"), "google-java-format");
});

test("returns null when file has no configured formatter", () => {
  assert.equal(getFormatterForFile("README.md"), null);
  assert.equal(getFormatterForFile("config.env"), null);
});
