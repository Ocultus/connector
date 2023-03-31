import { z } from "zod";

export const SignUpCredentials = z.object({
  name: z.string(),
	email: z.string().email(),
	password: z.string(),
});

export const SignInCredentials = z.object({
	email: z.string().email(),
	password: z.string(),
});