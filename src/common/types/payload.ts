export type ImageAttachment = {
	type: 'image';
};

export type AudioAttachment = {
	type: 'audio';
	title?: string;
};

export type DocumentAttachment = {
	type: 'document';
	title?: string;
	extension?: string;
};

export type Attachment = {
	url: string;
} & (ImageAttachment | AudioAttachment | DocumentAttachment);

export type MessagePayload = {
	text?: string;
	attachments: Attachment[];
};

export type EventType = 'new_message' | 'edit_message';

export type Envelope = {
	id: string;
	chatId: number;
	payload: MessagePayload;
} & (
	| {
			type: 'incoming';
			eventType: EventType;
			externalMessageId: number;
			sentAt: string;
			parentMessageId: string | null;
	  }
	| {
			type: 'outgoing';
	  }
);