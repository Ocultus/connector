import {
	Attachment as InternalAttachment,
	EventType,
} from '../common/types/payload';
import {AmqpConsumerModule, AmqpPublisherModule} from '../common/amqp';
import {Envelope} from '../common/types/payload';
import {randomUUID} from 'crypto';
import {Telegraf} from 'telegraf';
import {EndpointsConfig} from '../common/config/config.module';
import {
	EditMessageCtx,
	NewMessageCtx,
	TgAttachment,
	TgMessage,
} from './tg-gateway.type';
import {Post} from '../common/http/request';
import {InputMediaDocument} from 'telegraf/typings/core/types/typegram';

export class TgGatewayController {
	private telegaf: Telegraf;

	constructor(
		readonly id: number,
		readonly token: string,
		private readonly consumer: AmqpConsumerModule,
		private readonly publisher: AmqpPublisherModule,
		private readonly reportPublisher: AmqpPublisherModule,
		private readonly endpoints: EndpointsConfig,
	) {
		this.telegaf = new Telegraf(token);
	}

	public init = async () => {
		this.telegaf.on('message', ctx => {
			this.handleNewMessage(ctx);
		});

		this.telegaf.on('edited_message', ctx => {
			this.handleEditMessage(ctx);
		});

		this.telegaf.launch();
		await this.consumer.consume<Envelope>(this.sendMessage);
	};

	public getMessageQueueName = () => {
		return 'tg.in.bot' + this.id;
	};

	public pause = async () => {
		this.telegaf.stop();
	};

	public enable = async () => {
		this.telegaf.launch();
	};

	private sendMessage = async (envelope: Envelope) => {
		if (envelope.type !== 'outgoing') {
			return;
		}

		const attachmentsRaw = envelope.payload.attachments;
		if (attachmentsRaw.length === 1) {
			const attachment = attachmentsRaw[0];
			if (attachment.type === 'audio' && this.telegaf.context.sendAudio) {
				const audio = {
					filename: attachment.title,
					url: attachment.url,
				};
				await this.telegaf.context.sendAudio(audio, {
					caption: envelope.payload.text,
				});
			} else if (
				attachment.type === 'document' &&
				this.telegaf.context.sendDocument
			) {
				const document = {
					filename: attachment.title,
					url: attachment.url,
				};

				await this.telegaf.context.sendDocument(document, {
					caption: envelope.payload.text,
				});
			} else if (
				attachment.type === 'image' &&
				this.telegaf.context.sendPhoto
			) {
				await this.telegaf.context.sendPhoto(attachment.url, {
					caption: envelope.payload.text,
				});
			}
		} else if (attachmentsRaw.length && this.telegaf.context.sendMediaGroup) {
			const attachments = attachmentsRaw.map(attachment => {
				let document: InputMediaDocument = {
					type: 'document',
					media: {
						url: attachment.url,
					},
				};

				if (attachment.type === 'audio' || attachment.type === 'document') {
					document.media = {
						url: attachment.url,
						filename: attachment.title,
					};
				}

				return document;
			});

			if (envelope.payload.text) {
				attachments[0].caption = envelope.payload.text;
			}

			await this.telegaf.context.sendMediaGroup(attachments);
		} else if (envelope.payload.text && this.telegaf.context.sendMessage) {
			await this.telegaf.context.sendMessage(envelope.payload.text);
		}
	};

	private handleNewMessage = async (ctx: NewMessageCtx) => {
		const messages = await this.handleMessage(ctx.message, 'new_message');
		this.publisher.publish(messages, this.getMessageQueueName());
	};

	private handleEditMessage = async (ctx: EditMessageCtx) => {
		const messages = await this.handleMessage(
			ctx.update.edited_message,
			'edit_message',
		);
		this.publisher.publish(messages, this.getMessageQueueName());
	};

	private fileIdToUrl = async (fileId: string): Promise<URL> => {
		return this.telegaf.telegram.getFileLink(fileId);
	};

	private handleMessage = async (
		ctx: TgMessage,
		eventType: EventType,
		parentMessageId: string | null = null,
	): Promise<Envelope[]> => {
		const containsAttachmetnts =
			!!ctx.document || !!ctx.photo?.length || !!ctx.audio || !!ctx.voice;
		const isValidMessage =
			!!ctx.from &&
			!!ctx.message_id &&
			!!ctx.date &&
			!!this.telegaf.botInfo?.id &&
			(!!ctx.text || containsAttachmetnts);

		if (!isValidMessage) {
			return [];
		}

		const messageId = randomUUID();
		let envelope: Envelope = {
			id: messageId,
			externalMessageId: ctx.message_id,
			eventType,
			parentMessageId: parentMessageId,
			type: 'incoming',
			sentAt: new Date(ctx.date).toISOString(),
			chatId: this.telegaf.botInfo!.id,
			payload: {
				text: ctx.text ?? ctx.caption ?? undefined,
				attachments: [],
			},
		};

		if (containsAttachmetnts) {
			const {photo, document, voice, audio} = ctx;
			const rawAttachments = {
				photo,
				document,
				voice,
				audio,
			};

			const attachments = await this.handleMessageAttachments(
				rawAttachments,
				ctx.from.id,
				ctx.chat.id,
			);

			envelope.payload.attachments = attachments;
		}

		if (ctx.reply_to_message) {
			const message = await this.handleMessage(
				ctx.reply_to_message as TgMessage,
				eventType,
				messageId,
			);
			return [...message, envelope];
		}

		return [envelope];
	};

	private handleMessageAttachments = async (
		attachments: TgAttachment,
		userId: number,
		chatId: number,
	): Promise<InternalAttachment[]> => {
		const files = [];
		if (attachments.audio) {
			const {file_id, title, mime_type} = attachments.audio;
			files.push({
				id: file_id,
				title,
				mime_type,
				type: 'audio',
			});
		}

		if (attachments.document) {
			const {file_id, file_name, mime_type} = attachments.document;
			files.push({
				id: file_id,
				file_name,
				mime_type,
				type: 'document',
			});
		}

		if (attachments.photo?.length) {
			const {file_id} = attachments.photo[attachments.photo.length - 1];
			files.push({
				id: file_id,
				type: 'image',
			});
		}

		if (attachments.voice) {
			const {file_id, mime_type} = attachments.voice;
			files.push({
				id: file_id,
				mime_type,
				type: 'voice',
			});
		}

		const promises = files.map(async file => {
			const fileUrl = await this.fileIdToUrl(file.id);

			const fileRouteOnCloud = ['tg', chatId, userId, file.type].join('/');
			const uploadedFileResponse = await Post<{url: string}>(
				this.endpoints.cloudStorageUrl,
				{
					url: fileUrl,
					route: fileRouteOnCloud,
				},
			);
			const uploadedFileUrl = uploadedFileResponse.url;

			switch (file.type) {
				case 'document':
					return {
						type: file.type,
						url: uploadedFileUrl,
						title: file.title ?? '',
						extension: file.mime_type ?? 'txt',
					};
				case 'image':
					return {
						type: file.type,
						url: uploadedFileUrl,
					};
				case 'audio' || 'voice':
					return {
						type: file.type,
						url: uploadedFileUrl,
						title: file.title ?? '',
					};
				default:
					throw new Error(`Unknown attachment type`);
			}
		});

		return Promise.all(promises);
	};
}
