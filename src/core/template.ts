import fs from "fs-extra";
import Handlebars from "handlebars";

// Register helpers if needed
Handlebars.registerHelper("eq", (a, b) => a === b);
Handlebars.registerHelper("neq", (a, b) => a !== b);
Handlebars.registerHelper("uppercase", (str: string) => str.toUpperCase());
Handlebars.registerHelper("lowercase", (str: string) => str.toLowerCase());

export async function renderTemplate(
  templatePath: string,
  variables: Record<string, any>,
): Promise<string> {
  const templateContent = await fs.readFile(templatePath, "utf-8");
  const compiled = Handlebars.compile(templateContent);
  // Handlebars expects variables as a single object
  return compiled(variables);
}
