import { z } from 'zod';

/** Structured reply for `/api/chat/respond` (matches prior Gemini JSON contract). */
export const bilingualResponseSchema = z.object({
  content: z.string(),
  translation: z.string(),
});

/** Coordinator output for `/api/chat/decide`. */
export const decideResponseSchema = z.object({
  ids: z.array(z.string()),
});

export type BilingualResponse = z.infer<typeof bilingualResponseSchema>;
export type DecideResponse = z.infer<typeof decideResponseSchema>;
