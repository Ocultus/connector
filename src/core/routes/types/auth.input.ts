import {z} from 'zod';

export const CredentialsInput = z.object({
	email: z.string().email(),
	password: z.string().min(8),
});

export const SignUpInput = CredentialsInput.merge(
	z.object({
		name: z.string(),
	}),
);

export const PasswordInput = CredentialsInput.pick({password: true});

export const SignInInput = z.object({
	email: z.string().email(),
	password: z.string(),
});
