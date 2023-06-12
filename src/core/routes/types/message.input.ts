import {z} from 'zod';
import {MessageEntityRow} from '../../types/message.type';

export const MessageInputRow = MessageEntityRow.pick({payload: true}).merge(
	z.object({
		requestId: z.number(),
	}),
);
