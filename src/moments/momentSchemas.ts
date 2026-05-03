import { z } from 'zod';

export const momentPostRawSchema = z.object({
  id: z.string(),
  year: z.number().int(),
  month: z.number().int().min(1).max(12).optional(),
  content: z.string(),
  translation: z.string(),
  images: z.array(z.string()).optional(),
});

export const advisorMomentsFileSchema = z.object({
  posts: z.array(momentPostRawSchema),
});
