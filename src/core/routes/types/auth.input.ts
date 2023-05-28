import { z } from "zod";

export const SignUpInput = z.object({
  name: z.string(),
	email: z.string().email(),
	password: z.string(),
});

export const SignInInput = z.object({
	email: z.string().email(),
	password: z.string(),
});