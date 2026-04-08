import type { NextFunction, Request, Response } from "express";
export class HttpError extends Error {
  statusCode: number;
  details?: unknown;
  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}
export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof HttpError) {
    return res
      .status(err.statusCode)
      .json({ error: err.message, details: err.details });
  }

  console.error(err);

  return res.status(500).json({ error: "Internal server error" });
}
