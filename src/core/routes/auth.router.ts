import Jwt from 'jsonwebtoken';
import {configModule} from '../../common/config/config.module';
import {t} from './gateway.router';
import * as bcrypt from 'bcrypt';
import {TRPCError} from '@trpc/server';
import {sql} from '../types/db.type';
import {SignInCredentials, SignUpCredentials} from '../types/auth.type';
import {z} from 'zod';

export const AuthRouter = t.router({
	signIn: t.procedure
		.input(SignInCredentials)
		.mutation(async ({ctx, input}) => {
			const {email, password} = input;
			const {secret} = configModule.getAuthConfig();

			const passwordFromDb = await ctx.db.maybeOne(sql.type(
				z.object({
					password: z.string(),
				}),
			)`
				SELECT password FROM employee 
				WHERE email = ${email}
			`);
			if (!passwordFromDb) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
				});
			}

			const isCorrectPassword = await bcrypt.compare(
				password,
				passwordFromDb.password,
			);
			if (!isCorrectPassword) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
				});
			}

			return {
				token: Jwt.sign(
					{
						email,
					},
					secret,
				),
			};
		}),
	signUp: t.procedure
		.input(SignUpCredentials)
		.mutation(async ({ctx, input}) => {
			const {name, email, password} = input;
			const {secret} = configModule.getAuthConfig();

			const userWithThisEmailExist = await ctx.db.exists(sql.typeAlias('void')`
				SELECT 1 FROM employee 
				WHERE email = ${email} 
			`);
			if (userWithThisEmailExist) {
				throw new TRPCError({code: 'BAD_REQUEST'});
			}

			const hashedPassword = await bcrypt.hash(password, 10);
			await ctx.db.query(sql.typeAlias('void')`
				INSERT INTO employee (name, email, password) VALUES
				(${name}, ${email}, ${hashedPassword})
			`);

			return {
				token: Jwt.sign(
					{
						email,
					},
					secret,
				),
			};
		}),
});
