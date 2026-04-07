import prompts from "prompts";
import { logger } from "../core/logger.js";

interface VariableDef {
  type: "string" | "choice";
  options?: string[]; // for choice type
  default?: any;
  prompt?: string;
}

export async function collectVariables(
  variableDefs: Record<string, VariableDef> | undefined,
  initialValues: Record<string, any> & { skipPrompts?: boolean },
) {
  const variables: Record<string, any> = { ...initialValues };
  const skipPrompts = Boolean(variables.skipPrompts);
  delete variables.skipPrompts;

  if (!variableDefs) return variables;

  const questions: prompts.PromptObject[] = [];
  for (const [name, def] of Object.entries(variableDefs)) {
    if (variables[name] !== undefined) continue; // already have a value (e.g., from CLI args)
    const message = def.prompt || `Enter ${name}`;

    if (skipPrompts) {
      if (def.default !== undefined) {
        variables[name] = def.default;
        continue;
      }

      if (def.type === "choice" && def.options?.length) {
        variables[name] = def.options[0];
      }

      continue;
    }

    if (def.type === "string") {
      questions.push({
        type: "text",
        name,
        message,
        initial: def.default,
      });
    } else if (def.type === "choice") {
      questions.push({
        type: "select",
        name,
        message,
        choices: def.options!.map((opt) => ({ title: opt, value: opt })),
        initial: def.default ? def.options!.indexOf(def.default) : 0,
      });
    }
  }
  if (questions.length > 0) {
    logger.info("Please provide the following information:");
    const answers = await prompts(questions);
    Object.assign(variables, answers);
  }

  // Fill defaults for missing
  for (const [name, def] of Object.entries(variableDefs)) {
    if (variables[name] === undefined && def.default !== undefined) {
      variables[name] = def.default;
    }

    if (variables[name] === undefined && def.type === "choice" && def.options?.length) {
      variables[name] = def.options[0];
    }
  }

  return variables;
}
