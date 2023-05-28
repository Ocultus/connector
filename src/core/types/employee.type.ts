import {z} from 'zod';
import {BaseEntityRow} from './base.type';

export const EmployeeEntityRow = BaseEntityRow.merge(
	z.object({
		email: z.string(),
		password: z.string(),
		name: z.string(),
	}),
);

export const AuthorizationUser = EmployeeEntityRow.omit({password: true});

export type EmployeeEntity = z.output<typeof EmployeeEntityRow>;
