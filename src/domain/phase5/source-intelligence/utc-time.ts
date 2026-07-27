import { z } from "zod";

const utcTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export const UtcTimestampSchema = z.string()
  .length(24)
  .regex(utcTimestampPattern)
  .refine((value) => {
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
  }, { message: "Invalid UTC timestamp." })
  .brand<"UtcTimestamp">();

export type UtcTimestamp = z.infer<typeof UtcTimestampSchema>;

export function parseUtcTimestamp(value: unknown): UtcTimestamp {
  return UtcTimestampSchema.parse(value);
}

export function serializeUtcTimestamp(value: UtcTimestamp): string {
  return UtcTimestampSchema.parse(value);
}
