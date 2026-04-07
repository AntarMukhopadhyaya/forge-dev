import { Step } from "../types/schema.js";

export class ForgeError extends Error {
  public step?: Step;
  public cause?: Error;
  constructor(message: string, options?: { step?: Step; cause?: Error }) {
    super(message);
    this.name = "ForgeError";
    this.cause = options?.cause;
    this.step = options?.step;
  }
}
