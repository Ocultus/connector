import {z} from 'zod';
import {
	CredentialTypeRow,
	GatewayCredentialsRow,
} from '../../types/gateway.type';
import {IdInput} from './base.input';

export const FindByTypeGetawayInput = z.object({
	type: CredentialTypeRow,
});

export const CreateGetawayInput = z.intersection(
	GatewayCredentialsRow,
	z.object({projectId: z.number()}),
);

export const UpdateGetawayInput = IdInput.merge(
	z.object({
		credenials: GatewayCredentialsRow.optional(),
		name: z.string().optional(),
		type: CredentialTypeRow.optional(),
	}),
);

type q = z.infer<typeof UpdateGetawayInput>