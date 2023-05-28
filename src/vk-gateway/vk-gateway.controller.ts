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
	AudioAttachment as InternalAudioAttachment,
	EventType,
	DocumentAttachment as InternalDocumentAttachment,
} from '../common/types/payload';
import {AmqpConsumerModule, AmqpPublisherModule} from '../common/amqp';
import {Envelope} from '../common/types/payload';
import {randomUUID} from 'crypto';
import {EndpointsConfig} from '../common/config/config.module';
import {
	CreateTRPCProxyClient,
	createTRPCProxyClient,
	httpBatchLink,
} from '@trpc/client';
import {AppRouter as CloudStorageRouter} from '../cloud-storage/trpc/router';

type MessageCtx = MessageContext<ContextDefaultState>;

export class VkGatewayController {
	private vkApi: VK;
	private cloudStorageClient: CreateTRPCProxyClient<CloudStorageRouter>;

	constructor(
		private readonly id: number,
		private readonly group: number,
		private readonly token: string,
		private readonly consumer: AmqpConsumerModule,
		private readonly publisher: AmqpPublisherModule,
		private readonly reportPublisher: AmqpPublisherModule,
		readonly endpoints: EndpointsConfig,
	) {
		this.vkApi = new VK({
			token: this.token,
			pollingGroupId: this.group,
		});
		this.cloudStorageClient = createTRPCProxyClient<CloudStorageRouter>({
			links: [
				httpBatchLink({
					url: endpoints.cloudStorageUrl,
				}),
			],
		});
	}

	public getMessageQueueName = () => {
		return 'core.messages.gateway.' + this.id;
	};

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

	public pause = async () => {
		await this.vkApi.updates.stop();
	};

	public enable = async () => {
		await this.vkApi.updates.start();
	};

	private sendMessage = async (envelope: Envelope) => {
		if (envelope.type !== 'outgoing') {
			return;
		}

		try {
			const {attachments: envelopeAttachments} = envelope.payload;
			let attachment:
				| AudioAttachment
				| PhotoAttachment
				| DocumentAttachment
				| undefined;
			if (envelopeAttachments.length) {
				const documentAttachmnts: ({
					url: string;
				} & InternalDocumentAttachment)[] = [];
				const photoUrls: string[] = [];
				const audioAttachments: ({
					url: string;
				} & InternalAudioAttachment)[] = [];
				let attachment;

				envelopeAttachments.forEach(value => {
					if (value.type === 'document') {
						documentAttachmnts.push(value);
					} else if (value.type === 'image') {
						photoUrls.push(value.url);
					} else if (value.type === 'audio') {
						audioAttachments.push(value);
					}
				});

				if (documentAttachmnts.length) {
					attachment = await this.vkApi.upload.document({
						source: {
							values: documentAttachmnts.map(value => {
								return {
									value: value.url,
									filename: value.title,
								};
							}),
						},
					});
				}

				if (photoUrls.length) {
					attachment = await this.vkApi.upload.messagePhoto({
						source: {
							values: photoUrls.map(value => {
								return {
									value,
								};
							}),
						},
					});
				}

				if (audioAttachments.length) {
					attachment = await this.vkApi.upload.audio({
						source: {
							values: audioAttachments.map(value => {
								return {
									filename: value.title,
									value: value.url,
								};
							}),
						},
					});
				}
			}

			await this.vkApi.api.messages.send({
				peer_id: envelope.chatId,
				message: envelope.payload.text,
				random_id: Math.random(),
				attachment: attachment,
			});
		} catch (err) {
			//TODO
			throw Error()
		}
	};

	private handleNewMessage = async (ctx: MessageCtx) => {
		const messages = await this.handleMessage(ctx, 'new_message');
		this.publisher.publish(messages, this.getMessageQueueName());
	};

	private handleEditMessage = async (ctx: MessageCtx) => {
		const messages = await this.handleMessage(ctx, 'edit_message');
		this.publisher.publish(messages, this.getMessageQueueName());
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

		const client = await this.vkApi.api.users.get({
			user_ids: [ctx.peerId],
		});

		if (!client){
			//TODO
			throw new Error()
		}

		const messageId = randomUUID();
		let envelope: Envelope = {
			id: messageId,
			externalMessageId: id,
			getawayId: id,
			eventType,
			parentMessageId: parentMessageId,
			type: 'incoming',
			sentAt: new Date(createdAt).toISOString(),
			chatId: $groupId,
			name: client[0].first_name + client[0].last_name,
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
			const url = await this.cloudStorageClient.object.upload.mutate({
				route,
				url: attachment.url,
			});

			return {
				...attachment,
				url,
			};
		});

		return Promise.all(attachmentsPromises);
	};
}
