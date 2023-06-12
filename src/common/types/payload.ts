import {z} from 'zod';

const ImageAttachmentRow = z.object({
	url: z.string(),
	type: z.literal('image'),
});

export type ImageAttachment = z.infer<typeof ImageAttachmentRow>;

const AudioAttachmentRow = z.object({
	url: z.string(),
	type: z.literal('audio'),
	title: z.string().optional(),
});

export type AudioAttachment = z.infer<typeof AudioAttachmentRow>;

const DocumentAttachmentRow = z.object({
	url: z.string(),
	type: z.literal('document'),
	title: z.string().optional(),
	extension: z.string().optional(),
});

export type DocumentAttachment = z.infer<typeof DocumentAttachmentRow>;

export const AttachmentRow = z.union([
	ImageAttachmentRow,
	AudioAttachmentRow,
	DocumentAttachmentRow,
]);

export type Attachment = z.infer<typeof AttachmentRow>;

export const MessagePayloadRow = z.object({
	text: z.string().optional(),
	attachments: z.array(AttachmentRow),
});

export type MessagePayload = z.infer<typeof MessagePayloadRow>;

const EventTypeRow = z.enum(['new_message', 'edit_message']);

export type EventType = z.infer<typeof EventTypeRow>;

export const SocialNetworkRow = z.enum(['vk', 'tg']);

export type SocialNetwork = z.infer<typeof SocialNetworkRow>;

const EnvelopeRow = z.intersection(
	z.object({
		clientId: z.number(),
		payload: MessagePayloadRow,
		eventType: EventTypeRow,
		gatewayId: z.number(),
	}),
	z
		.object({
			id: z.number(),
			type: z.literal('incoming'),
			socialNetwork: SocialNetworkRow,
			clientName: z.string(),
			externalId: z.number(),
			sentAt: z.string(),
			parentMessageId: z.number().optional(),
			parentExternalMessageId: z.number().optional(),
		})
		.or(z.object({type: z.literal('outgoing')})),
);

export type Envelope = z.infer<typeof EnvelopeRow>;
