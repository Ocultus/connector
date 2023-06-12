import {
	Attachment as InternalAttachment,
	EventType,
} from '../common/types/payload';
import {AmqpPublisherModule} from '../common/amqp';
import {Envelope} from '../common/types/payload';
import {Telegraf} from 'telegraf';
import {EndpointsConfig} from '../common/config/config.module';
import {
	EditMessageCtx,
	NewMessageCtx,
	TgAttachment,
	TgMessage,
} from './tg-gateway.type';
import {
	InputMediaDocument,
	InputMediaPhoto,
} from 'telegraf/typings/core/types/typegram';
import {CreateTRPCProxyClient} from '@trpc/client';
import {AppRouter as CloudStorageRouter} from '../cloud-storage/trpc/router';
import {DestinationStream, Logger, LoggerOptions} from 'pino';

export class TgGatewayController {
	private telegaf: Telegraf;

	constructor(
		readonly id: number,
		readonly token: string,
		private readonly publisher: AmqpPublisherModule,
		readonly endpoints: EndpointsConfig,
		readonly logger: Logger<LoggerOptions | DestinationStream>,
		private cloudStorageClient: CreateTRPCProxyClient<CloudStorageRouter>,
	) {
		this.telegaf = new Telegraf(token);
	}

	public init = async () => {
		try {
			this.telegaf.on('message', ctx => {
				this.handleNewMessage(ctx);
			});

			this.telegaf.on('edited_message', ctx => {
				this.handleEditMessage(ctx);
			});

			this.telegaf.launch();
		} catch (error) {
			this.logger.error(error);
		}
	};

	public pause = async () => {
		this.telegaf.stop();
	};

	public enable = async () => {
		await this.telegaf.launch();
	};

	public sendMessage = async (envelope: Envelope) => {
		if (envelope.type !== 'outgoing') {
			return;
		}

		const attachmentsRaw = envelope.payload.attachments;
		const chatId = envelope.clientId;
		if (attachmentsRaw.length === 1) {
			const attachment = attachmentsRaw[0];
			if (attachment.type === 'audio') {
				const audio = {
					filename: attachment.title,
					url: attachment.url,
				};

				await this.telegaf.telegram.sendAudio(chatId, audio, {
					caption: envelope.payload.text,
				});
			} else if (attachment.type === 'document') {
				const document = {
					filename: attachment.title,
					url: attachment.url,
				};

				await this.telegaf.telegram.sendDocument(chatId, document, {
					caption: envelope.payload.text,
				});
			} else if (attachment.type === 'image') {
				await this.telegaf.telegram.sendPhoto(chatId, attachment.url, {
					caption: envelope.payload.text,
				});
			}
		} else if (attachmentsRaw.length) {
			const photos: InputMediaPhoto[] = [];
			const documents: InputMediaDocument[] = [];

			attachmentsRaw.forEach(attachment => {
				if (attachment.type === 'image') {
					photos.push({
						type: 'photo',
						media: attachment.url,
					});
				} else if (
					attachment.type === 'document' ||
					attachment.type === 'audio'
				) {
					documents.push({
						media: {
							url: attachment.url,
							filename: attachment.title,
						},
						type: 'document',
					});
				}
			});

			if (photos.length) {
				photos[photos.length - 1] = {
					...photos[photos.length - 1],
					caption: envelope.payload.text,
				};

				if (documents.length) {
					await Promise.all([
						this.telegaf.telegram.sendMediaGroup(chatId, photos),
						this.telegaf.telegram.sendMediaGroup(chatId, documents),
					]);
				} else {
					await this.telegaf.telegram.sendMediaGroup(chatId, photos);
				}
			} else if (documents.length) {
				documents[documents.length - 1] = {
					...documents[documents.length - 1],
					caption: envelope.payload.text,
				};
				await this.telegaf.telegram.sendMediaGroup(chatId, documents);
			}
		} else if (envelope.payload.text) {
			await this.telegaf.telegram.sendMessage(chatId, envelope.payload.text);
		}
	};

	private handleNewMessage = async (ctx: NewMessageCtx) => {
		const messages = await this.handleMessage(ctx.message, 'new_message');
		this.publisher.publish(messages, 'core.messages.core');
	};

	private handleEditMessage = async (ctx: EditMessageCtx) => {
		const messages = await this.handleMessage(
			ctx.update.edited_message,
			'edit_message',
		);
		this.publisher.publish(messages, 'core.messages.core');
	};

	private fileIdToUrl = async (fileId: string): Promise<URL> => {
		return this.telegaf.telegram.getFileLink(fileId);
	};

	private handleMessage = async (
		ctx: TgMessage,
		eventType: EventType,
		messageId: number = 0,
		parentMessageId?: number,
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

		let envelope: Envelope = {
			id: messageId,
			externalId: ctx.message_id,
			eventType,
			gatewayId: this.id,
			parentMessageId: parentMessageId,
			type: 'incoming',
			sentAt: new Date(ctx.date).toISOString(),
			clientId: ctx.from.id,
			socialNetwork: 'tg',
			clientName: ctx.from.first_name + ctx.from.last_name,
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

			const attachment = await this.handleMessageAttachments(
				rawAttachments,
				ctx.from.id,
			);

			envelope.payload.attachments = attachment ? [attachment] : [];
		}

		if (ctx.reply_to_message) {
			const message = await this.handleMessage(
				ctx.reply_to_message as TgMessage,
				eventType,
				messageId + 1,
				messageId,
			);
			return [...message, envelope];
		}

		return [envelope];
	};

	private handleMessageAttachments = async (
		attachments: TgAttachment,
		userId: number,
	): Promise<InternalAttachment | undefined> => {
		let attachment;
		if (attachments.audio) {
			const {file_id, title, mime_type} = attachments.audio;
			attachment = {
				id: file_id,
				title,
				mime_type,
				type: 'audio',
			};
		}

		if (attachments.document) {
			const {file_id, file_name, mime_type} = attachments.document;
			attachment = {
				id: file_id,
				file_name,
				mime_type,
				type: 'document',
			};
		}

		if (attachments.photo?.length) {
			const {file_id} = attachments.photo[attachments.photo.length - 1];
			attachment = {
				id: file_id,
				type: 'image',
			};
		}

		if (attachments.voice) {
			const {file_id, mime_type} = attachments.voice;
			attachment = {
				id: file_id,
				mime_type,
				type: 'voice',
			};
		}

		if (attachment) {
			const tgFileUrl = await this.fileIdToUrl(attachment.id);
			const tgFileUrlString = tgFileUrl.toString();
			const route = ['tg', userId, attachment.type].join('/');
			const fileUrlOnCloud = await this.cloudStorageClient.object.upload.mutate(
				{
					route,
					url: tgFileUrlString,
				},
			);

			const {type} = attachment;
			switch (type) {
				case 'document':
					return {
						type,
						url: fileUrlOnCloud,
						title: attachment.title ?? 'title.txt',
						extension: attachment.mime_type ?? 'txt',
					};
				case 'image':
					return {
						type,
						url: fileUrlOnCloud,
					};
				case 'audio' || 'voice':
					return {
						type,
						url: fileUrlOnCloud,
						title: attachment.title ?? 'title.mp3',
					};
			}
		}

		return undefined;
	};
}
