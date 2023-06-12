import {z} from 'zod';
import {BaseEntityRow} from './base.type';
import {MessagePayload, MessageType} from './message.type';

export const RequestTypeRow = z.enum(['open', 'pending', 'closed']);

export type RequestType = z.infer<typeof RequestTypeRow>;

export const RequestEntityRow = BaseEntityRow.merge(
	z.object({
		chatId: z.number(),
		gatewayId: z.number(),
		type: RequestTypeRow,
	}),
);

export const RequestWithGateway = RequestEntityRow.merge(
	z.object({
		gatewayType: z.enum(['vk', 'tg']),
		clientId: z.number(),
	}),
);

export const RequestWithMessageEntityRow = RequestEntityRow.merge(
	z.object({
		type: MessageType,
		messageId: z.number(),
		payload: MessagePayload,
		messageCreatedAt: z.number().transform(value => new Date(value)),
	}),
);

export const RequestWithLastMessage = RequestEntityRow.merge(
	z.object({
		messageId: z.number(),
		messageType: MessageType,
		messagePayload: MessagePayload,
		messageCreatedAt: z.number().transform(value => new Date(value)),
	}),
);
