import {z} from 'zod';
import {BaseEntityRow} from './base.type';

export const CustomerEntityRow = BaseEntityRow.merge(
	z.object({
		email: z.string(),
		password: z.string(),
		name: z.string(),
	}),
);

export const AuthorizationUser = CustomerEntityRow.pick({id: true});

export type EmployeeEntity = z.output<typeof CustomerEntityRow>;
