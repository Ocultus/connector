import {Context, NarrowedContext} from 'telegraf';
import {
	Audio,
	CommonMessageBundle,
	Document,
	Message,
	PhotoSize,
	ReplyMessage,
	Update,
	Voice,
} from 'telegraf/typings/core/types/typegram';

type MessageAttachmentFields =
	| 'audio'
	| 'document'
	| 'photo'
	| 'text'
	| 'voice'
	| 'caption'
	| 'reply_to_message';

type MessageAttachmentUnion = Message.AudioMessage &
	Message.DocumentMessage &
	Message.PhotoMessage &
	Message.TextMessage &
	Message.VoiceMessage;

type PartialMessageAttachmentFields = Partial<
	Pick<MessageAttachmentUnion, MessageAttachmentFields>
>;

export type NewMessageCtx = NarrowedContext<
	Context<Update>,
	Update.MessageUpdate<Message & PartialMessageAttachmentFields>
>;

export type EditMessageCtx = NarrowedContext<
	Context<Update>,
	Update.EditedMessageUpdate<
		CommonMessageBundle & PartialMessageAttachmentFields
	>
>;

export type TgMessage = (Update.Edited | Update.New) &
	ReplyMessage &
 	Update.NonChannel &
	PartialMessageAttachmentFields;

export type TgAttachment = {
	photo?: PhotoSize[];
	document?: Document;
	voice?: Voice;
	audio?: Audio;
};
