import {z} from 'zod';
import {BaseEntityRow} from './base.type';
import {AttachmentRow} from '../../common/types/payload';

export const MessagePayload = z.object({
	text: z.string().optional(),
	attachments: z.array(AttachmentRow),
});

export const MessageType = z.enum(['incoming', 'outgoing']);

export const MessageEntityRow = BaseEntityRow.merge(
	z.object({
		type: MessageType,
		chatId: z.string(),
		payload: MessagePayload,
		parentId: z.number().optional(),
		externalId: z.number(),
	}),
);

const InsertMessageRow = MessageEntityRow.pick({
	payload: true,
	externalId: true,
});

export type InsertMessage = z.infer<typeof InsertMessageRow>;
export type UpdateMessage = InsertMessage;

export type MessageEntity = z.output<typeof MessageEntityRow>;
