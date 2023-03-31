import {z} from 'zod';
import {BaseEntityRow} from './base.type';

const EmployeeStatus = z.enum(['online', 'offline']);

export const EmployeeEntityRow = BaseEntityRow.merge(
	z.object({
		email: z.string(),
		password: z.string(),
		name: z.string(),
		status: EmployeeStatus,
	}),
);



export const AuthorizationUser = EmployeeEntityRow.omit({password: true});

export type EmployeeEntity = z.output<typeof EmployeeEntityRow>;
