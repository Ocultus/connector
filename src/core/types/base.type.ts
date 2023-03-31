import {z} from 'zod';

export const BaseEntityRow = z.object({
	id: z.number(),
	createdAt: z.number().transform(value => new Date(value)),
});

export type BaseEntity = z.output<typeof BaseEntityRow>;
