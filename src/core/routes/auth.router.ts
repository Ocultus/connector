import Jwt from 'jsonwebtoken';
import {configModule} from '../../common/config/config.module';
import * as bcrypt from 'bcrypt';
import {TRPCError} from '@trpc/server';
import {t} from '../trpc/router';
import {SignInInput, SignUpInput} from './types/auth.input';
import {CustomerRepository} from '../repository/customer.repository';

export const AuthRouter = t.router({
	signIn: t.procedure.input(SignInInput).mutation(async ({ctx, input}) => {
		const {email, password} = input;
		const {secret} = configModule.getAuthConfig();

		const passwordFromDb = await CustomerRepository.getPasswordByEmail(
			ctx.db,
			email,
		);
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

	signUp: t.procedure.input(SignUpInput).mutation(async ({ctx, input}) => {
		const {name, email, password} = input;
		const {secret} = configModule.getAuthConfig();
		const userWithThisEmailExist = await CustomerRepository.checkExist(
			ctx.db,
			email,
		);
		if (userWithThisEmailExist) {
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: 'Email already exists',
			});
		}

		const hashedPassword = await bcrypt.hash(password, 10);
		await CustomerRepository.insertOne(ctx.db, name, email, hashedPassword);

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
