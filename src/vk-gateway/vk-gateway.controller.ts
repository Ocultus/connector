import {
	Upload,
	Updates,
	ExternalAttachment,
	Attachment,
	DocumentAttachment,
	PhotoAttachment,
	AudioAttachment,
	AttachmentType,
	VK,
	MessageContext,
	ContextDefaultState,
} from 'vk-io';

import {
	Attachment as InternalAttachment,
	EventType,
} from '../common/types/payload';
import {AmqpConsumerModule, AmqpPublisherModule} from '../common/amqp';
import {Envelope} from '../common/types/payload';
import {randomUUID} from 'crypto';
import {EndpointsConfig} from '../common/config/config.module';
import {Post} from '../common/http/request';

type MessageCtx = MessageContext<ContextDefaultState>;

export class VkGatewayController {
	private vkApi: VK;

	constructor(
		private readonly group: number,
		private readonly token: string,
		private readonly consumer: AmqpConsumerModule,
		private readonly publisher: AmqpPublisherModule,
		private readonly endpoints: EndpointsConfig,
	) {
		this.vkApi = new VK({
			token: this.token,
			pollingGroupId: this.group,
		});
	}

	public init = async () => {
		const upload = new Upload({
			api: this.vkApi.api,
		});

		const updates = new Updates({
			api: this.vkApi.api,
			upload,
		});

		updates.start();
		updates.on('message_new', this.handleNewMessage);
		updates.on('message_edit', this.handleEditMessage);

		await this.consumer.consume<Envelope>(this.sendMessage);
	};

	private sendMessage = (envelope: Envelope) => {
		this.vkApi.api.messages.send({
			peer_id: envelope.chatId,
			message: envelope.payload.text,
			random_id: Math.random(),
		});
	};

	private handleNewMessage = async (ctx: MessageCtx) => {
		const messages = await this.handleMessage(ctx, 'new_message');
	};

	private handleEditMessage = async (ctx: MessageCtx) => {
		const messages = await this.handleMessage(ctx, 'edit_message');
	};

	private handleMessage = async (
		ctx: MessageCtx,
		eventType: EventType,
		parentMessageId: string | null = null,
	): Promise<Envelope[]> => {
		console.log('ctx:', ctx);
		console.log('forwards:', ctx.forwards);
		const {peerId, id, $groupId, text, attachments, createdAt, forwards} = ctx;
		const isValidMessage =
			!!peerId && !!id && !!$groupId && (!!text || !!attachments.length);

		if (!isValidMessage) {
			return [];
		}

		const messageId = randomUUID();
		let envelope: Envelope = {
			id: messageId,
			externalMessageId: id,
			eventType,
			parentMessageId: parentMessageId,
			type: 'incoming',
			sentAt: new Date(createdAt).toISOString(),
			chatId: $groupId,
			payload: {
				text: text ?? undefined,
				attachments: [],
			},
		};

		if (attachments.length) {
			const handledAttachments = await this.handleMessageAttachments(
				ctx.attachments,
				ctx.senderId,
				ctx.$groupId!,
			);

			envelope.payload.attachments = handledAttachments;
		}

		if (forwards.length) {
			const messagesFromForwards = await Promise.all(
				ctx.forwards.map(forward => {
					return this.handleMessage(forward, eventType, messageId);
				}),
			);
			const messages = messagesFromForwards.flat();

			return [...messages, envelope];
		}

		return [envelope];
	};

	private handleMessageAttachments = async (
		attachments: (Attachment | ExternalAttachment)[],
		userId: number,
		chatId: number,
	): Promise<InternalAttachment[]> => {
		const attachmentsPromises = attachments.map(async rawAttachment => {
			let attachment: InternalAttachment | undefined;
			const attachmentType = rawAttachment.type;
			if (attachmentType === AttachmentType.DOCUMENT) {
				const {url, title, extension} = rawAttachment as DocumentAttachment;
				attachment = {
					type: 'document',
					url: url ?? 'none',
					title,
					extension,
				};
			} else if (attachmentType === AttachmentType.PHOTO) {
				attachment = {
					type: 'image',
					url: (rawAttachment as PhotoAttachment).largeSizeUrl ?? 'none',
				};
			} else if (
				attachmentType === AttachmentType.AUDIO ||
				attachmentType === AttachmentType.AUDIO_MESSAGE
			) {
				const {url, title} = rawAttachment as AudioAttachment;
				attachment = {
					type: 'audio',
					url: url ?? 'none',
					title,
				};
			}

			if (!attachment?.url || attachment.url === 'none') {
				throw new Error('invalid attachment');
			}

			const route = ['vk', chatId, userId, attachment.type].join('/');
			const {url} = await Post<{url: string}>(this.endpoints.cloudStorageUrl, {
				url: attachment.url,
				route,
			});

			return {
				...attachment,
				url,
			};
		});

		return Promise.all(attachmentsPromises);
	};
}
