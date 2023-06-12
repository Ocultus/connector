import {z} from 'zod';
import {BaseEntityRow} from './base.type';

export const ChatEntityRow = BaseEntityRow.merge(
	z.object({
		client_id: z.number(),
		gateway_id: z.number(),
	}),
);

export type ChatEntity = z.output<typeof ChatEntityRow>;
