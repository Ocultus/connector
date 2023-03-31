import {BaseEntityRow} from './base.type';
import {z} from 'zod';

export const AttachmentEntityRow = z.intersection(
	BaseEntityRow,
	z.object({
		type: z.enum(['audio', 'document', 'image']),
		url: z.string(),
		key: z.string(),
		extension: z.string(),
	}),
);

export type AttachmentEntity = z.output<typeof AttachmentEntityRow>;
