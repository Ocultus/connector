export type ImageAttachment = {
	url: string;
	type: 'image';
};

export type AudioAttachment = {
	url: string;
	type: 'audio';
	title?: string;
};

export type DocumentAttachment = {
	url: string;
	type: 'document';
	title?: string;
	extension?: string;
};

export type Attachment = ImageAttachment | AudioAttachment | DocumentAttachment;

export type MessagePayload = {
	text?: string;
	attachments: Attachment[];
};

export type EventType = 'new_message' | 'edit_message';

export type Envelope = {
	chatId: number;
	getawayId: number;
	payload: MessagePayload;
} & (
	| {
			id: string;
			name: string;
			type: 'incoming';
			eventType: EventType;
			externalMessageId: number;
			sentAt: string;
			parentMessageId?: string;
			parentExternalMessageId? : number; 
	  }
	| {
			type: 'outgoing';
	  }
);
