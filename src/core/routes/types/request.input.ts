import {z} from 'zod';
import {IdInput} from './base.input';
import {RequestTypeRow} from '../../types/request.type';

export const UpdateRequestStatusInput = IdInput.merge(
	z.object({
		status: RequestTypeRow,
	}),
);

export const GetAllRequestInput = z.object({
	type: RequestTypeRow.optional(),
	getawayId: z.number().optional(),
});
