import {Static, Type} from '@sinclair/typebox';

export type CloudStorageControllerOptions = {
	accessKeyId: string;
	secretAccessKey: string;
	endpoint: string;
	region: string;
	bucket: string;
};

export const UploadFile = Type.Object({
	buffer: Type.Optional(Type.Uint8Array()),
	url: Type.Optional(Type.String()),
	mimetype: Type.Optional(Type.String()),
	route: Type.String(),
});

export type UploadFileRequestBody = Static<typeof UploadFile>;

export const UploadedFile = Type.Object({
	url: Type.String(),
});

export type UploadFileResponseBody = Static<typeof UploadedFile>;
