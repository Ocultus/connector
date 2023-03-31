import {inferAsyncReturnType} from '@trpc/server';
import {Bootstrap} from '../../common/bootstap.module';
import {configModule} from '../../common/config/config.module';
import * as trpcNext from '@trpc/server/adapters/next';
import _ from 'lodash';
import Jwt, {JwtPayload} from 'jsonwebtoken';
import {sql} from 'slonik';
import {AuthorizationUser} from '../types/employee.type';

const initDb = _.memoize(async () => {
	const bootstrap = new Bootstrap();
	return bootstrap.initDatabase(configModule.getDatabaseConfig());
});

const getUserFromHeader = async (authorization: string) => {
	if (!authorization) {
		return undefined;
	}

	const jwtToken = authorization.split(' ')[1];
	const {email} = Jwt.verify(jwtToken, '') as JwtPayload;
	if (!email) {
		return undefined;
	}

	return getUserByEmail(email);
};

const getUserByEmail = async (email: string) => {
	const db = await initDb();
	const user = await db.maybeOne(sql.type(AuthorizationUser)`
		Select id, email from users
		where email = ${email}
	`);

	return user ? AuthorizationUser.parse(user) : undefined;
};

export async function createContext({req}: trpcNext.CreateNextContextOptions) {
	const db = await initDb();
	const authorizationHeader = req.query.authorization;
	const user = getUserFromHeader(authorizationHeader);

	return {
		db,
		user,
	};
}

export type Context = inferAsyncReturnType<typeof createContext>;
