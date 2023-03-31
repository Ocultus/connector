import {BaseEntityRow} from './base.type';
import {z} from 'zod';

export const CredentialType = z.object({
	type: z.enum(['vk', 'tg'])
})

const VkCredentialsRow = z.object({
	type: z.enum(['vk']),
	credentials: z.object({
		token: z.string(),
		group: z.number(),
	}),
});

const TgCredentialsRow = z.object({
	type: z.enum(['tg']),
	credentials: z.object({
		token: z.string(),
	}),
});

const GatewayCredentialsRow = z.union([TgCredentialsRow, VkCredentialsRow]);

export type GatewayCredentials = z.infer<typeof GatewayCredentialsRow>;

export const GatewayEntityRow = z.intersection(
	BaseEntityRow,
	z.intersection(
		z.object({
			enabled: z.boolean(),
			projectId: z.number(),
		}),
		z.union([VkCredentialsRow, TgCredentialsRow]),
	),
);

export type GatewayEntity = z.output<typeof GatewayEntityRow>;
