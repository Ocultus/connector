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
	ImageAttachment as InternalImageAttachment,
	EventType,
	DocumentAttachment as InternalDocumentAttachment,
} from '../common/types/payload';
import {AmqpPublisherModule} from '../common/amqp';
import {Envelope} from '../common/types/payload';
import {EndpointsConfig} from '../common/config/config.module';
import {
	CreateTRPCProxyClient,
	createTRPCProxyClient,
	httpBatchLink,
} from '@trpc/client';
import {AppRouter as CloudStorageRouter} from '../cloud-storage/trpc/router';
import {DestinationStream, Logger, LoggerOptions} from 'pino';

type MessageCtx = MessageContext<ContextDefaultState>;

export class VkGatewayController {
	private vkApi: VK;
	private cloudStorageClient: CreateTRPCProxyClient<CloudStorageRouter>;

	constructor(
		private readonly id: number,
		private readonly group: number,
		private readonly token: string,
		private readonly publisher: AmqpPublisherModule,
		readonly endpoints: EndpointsConfig,
		readonly logger: Logger<LoggerOptions | DestinationStream>,
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

	public init = async () => {
		try {
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
		} catch (error) {
			this.logger.error(error);
		}
	};

	public pause = async () => {
		const upload = new Upload({
			api: this.vkApi.api,
		});

		const updates = new Updates({
			api: this.vkApi.api,
			upload,
		});

		updates.stop();
	};

	public enable = async () => {
		await this.vkApi.updates.start();
	};

	public sendMessage = async (envelope: Envelope) => {
		if (envelope.type !== 'outgoing') {
			return;
		}

		try {
			const {attachments} = envelope.payload;

			const vkAttachments = [];
			if (attachments.length) {
				const documents: InternalDocumentAttachment[] = []
				const photos: InternalImageAttachment[] = [];
				const audios: InternalAudioAttachment[] = [];
				attachments.forEach((attachment) => {
					if (attachment.type === 'image') {
						photos.push(attachment)
					} else if (attachment.type === 'audio') {
						audios.push(attachment) 
					} else {
						documents.push(attachment)
					}
				})	
				
				if (photos.length) {
					const photoEntitiesPromises = photos.map((photo) => {
						return this.vkApi.upload.messagePhoto({
							source: {
								value: photo.url
							},
							peer_id: envelope.clientId,
						})
					})
					const photoEntities = await Promise.all(photoEntitiesPromises);
					vkAttachments.push(...photoEntities);
				} 

				if (audios.length) {
					const audioEntitiesPromises = audios.map((audio) => {
						return this.vkApi.upload.messageDocument({
							source: {
								value: audio.url,
							},
							title: audio.title,
							peer_id: envelope.clientId,
						})
					})
					const audioEntities = await Promise.all(audioEntitiesPromises);
					vkAttachments.push(...audioEntities);
				}

				if (documents.length) {
					const documentEntitiesPromises = documents.map((document) => {
						return this.vkApi.upload.messageDocument({
							source: {
								value: document.url,
							},
							title: document.title,
							peer_id: envelope.clientId,
						})
					})
					const documentEntities = await Promise.all(documentEntitiesPromises);
					vkAttachments.push(...documentEntities);
				}
			}

			await this.vkApi.api.messages.send({
				peer_id: envelope.clientId,
				message: envelope.payload.text,
				random_id: Math.random(),
				attachment: vkAttachments,
			});
		} catch (err) {
			this.logger.error('Imposible to send message in vk', envelope);
		}
	};

	private handleNewMessage = async (ctx: MessageCtx) => {
		const messages = await this.handleMessage(ctx, 'new_message');
		this.publisher.publish(messages, 'core.messages.core');
	};

	private handleEditMessage = async (ctx: MessageCtx) => {
		const messages = await this.handleMessage(ctx, 'edit_message');
		this.publisher.publish(messages, 'core.messages.core');
	};

	private handleMessage = async (
		ctx: MessageCtx,
		eventType: EventType,
		messageId: number = 0,
		parentMessageId?: number,
	): Promise<Envelope[]> => {
		const {peerId, id, text, attachments, createdAt, forwards} = ctx;
		const isValidMessage = !!peerId && !!id && (!!text || !!attachments.length);

		if (!isValidMessage) {
			return [];
		}

		const client = await this.vkApi.api.users.get({
			user_ids: [ctx.peerId],
		});

		if (!client) {
			this.logger.error('Imposible to get vk client info', ctx.peerId);
			return [];
		}

		let envelope: Envelope = {
			id: messageId,
			externalId: id,
			gatewayId: this.id,
			socialNetwork: 'vk',
			eventType,
			parentMessageId: parentMessageId,
			type: 'incoming',
			sentAt: new Date(createdAt).toISOString(),
			clientId: peerId,
			clientName: client[0].first_name + client[0].last_name,
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
					return this.handleMessage(
						forward,
						eventType,
						messageId + 1,
						messageId,
					);
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
				this.logger.error('Invalid attachment', attachment);
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
