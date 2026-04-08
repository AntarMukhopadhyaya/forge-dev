import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "./error-handler.js";

type Source = "body" | "params" | "query";

export function validate(schema: z.ZodTypeAny, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return next(
        new HttpError(400, "Validation failed", result.error.flatten()),
      );
    }

    (req as Request & Record<Source, unknown>)[source] = result.data;
    return next();
  };
}
