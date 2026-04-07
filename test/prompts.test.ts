import test from "node:test";
import assert from "node:assert/strict";
import { collectVariables } from "../src/utils/prompts.js";

test("collectVariables uses defaults when prompts are skipped", async () => {
  const result = await collectVariables(
    {
      project: { type: "string", default: "my-app", prompt: "Project name" },
      database: {
        type: "choice",
        options: ["postgres", "sqlite"],
        default: "postgres",
        prompt: "Database",
      },
    },
    { skipPrompts: true },
  );

  assert.equal(result.project, "my-app");
  assert.equal(result.database, "postgres");
});
