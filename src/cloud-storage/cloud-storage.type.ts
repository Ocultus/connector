import {z} from 'zod';

export type CloudStorageControllerOptions = {
	accessKeyId: string;
	secretAccessKey: string;
	endpoint: string;
	region: string;
	bucket: string;
};

export const UploadFile = z.object({
	buffer: z.instanceof(Uint8Array).optional(),
	url: z.string().optional(),
	mimetype: z.string().optional(),
	route: z.string(),
});
