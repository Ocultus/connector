import {z} from 'zod';
import {BaseEntityRow} from './base.type';

const MessageType = z.enum(['incoming', 'outgoing']);

export const MessageEntityRow = z.intersection(
	BaseEntityRow,
	z.object({
		type: MessageType,
		chatId: z.string(),
		text: z.string().optional(),
		parentMessageId: z.string().optional(),
		externalMessageId: z.string().optional(),
	}),
);

export type MessageEntity = z.output<typeof MessageEntityRow>;
