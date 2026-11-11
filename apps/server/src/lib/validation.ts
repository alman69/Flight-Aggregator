import type { InvalidRequestResponse } from '@flight/core';
import type { Response } from 'express';
import type { z } from 'zod';

/** Parses a body with a zod schema, or sends a 400 with readable details and returns null. */
export function parseOr400<T extends z.ZodType>(
  schema: T,
  input: unknown,
  res: Response,
): z.output<T> | null {
  const parsed = schema.safeParse(input);
  if (parsed.success) return parsed.data;
  const body: InvalidRequestResponse = {
    error: 'invalid_request',
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
  res.status(400).json(body);
  return null;
}
