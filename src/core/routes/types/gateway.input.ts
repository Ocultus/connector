import {z} from 'zod';
import {
	CredentialTypeRow,
	GatewayCredentialsRow,
} from '../../types/gateway.type';
import {IdInput} from './base.input';

export const FindByTypeGatewayInput = z.object({
	type: CredentialTypeRow,
});

export const CreateGatewayInput = z.intersection(
	GatewayCredentialsRow,
	z.object({
		name: z.string().optional(),
	}),
);

export const UpdateGatewayInput = IdInput.merge(
	z.object({
		credenials: GatewayCredentialsRow,
		name: z.string().optional(),
		type: CredentialTypeRow.optional(),
	}),
);

export const GetAllGetawayInput = z.object({
	type: CredentialTypeRow.optional(),
})
