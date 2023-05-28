import {z} from 'zod';
import {BaseEntityRow} from './base.type';

export const ClientEntityRow = BaseEntityRow.merge(
	z.object({
		external_id: z.number(),
		name: z.string(),
	}),
);

export type ClientEntity = z.output<typeof ClientEntityRow>;
