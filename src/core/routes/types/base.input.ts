import {z} from 'zod';

export const IdInput = z.object({
	id: z.number(),
});

export const PaginationInput = z.object({
  limit: z.number().min(1).max(100).nullish(),
  cursor: z.number().nullish(),
})
