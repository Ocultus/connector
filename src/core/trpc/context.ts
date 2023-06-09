import {inferAsyncReturnType} from '@trpc/server';
import {Bootstrap} from '../../common/bootstap.module';
import {configModule} from '../../common/config/config.module';
import * as trpcNext from '@trpc/server/adapters/next';
import _ from 'lodash';
import Jwt, {JwtPayload} from 'jsonwebtoken';
import {AuthorizationUser} from '../types/customer.type';
import {CustomerRepository} from '../repository/customer.repository';
import { AmqpFactoryModule } from '../../common/amqp';

const initDb = _.memoize(async () => {
	const bootstrap = new Bootstrap();
	return bootstrap.initDatabase(configModule.getDatabaseConfig());
});

const getUserFromHeader = async (authorization: string) => {
	const {secret} = configModule.getAuthConfig();
	if (!authorization) {
		return undefined;
	}

	const jwtToken = authorization.split(' ')[1];
	const {email} = Jwt.verify(jwtToken, secret) as JwtPayload;
	if (!email) {
		return undefined;
	}

	return getUserByEmail(email);
};

const getUserByEmail = async (email: string) => {
	const db = await initDb();
	const user = await CustomerRepository.findByEmail(db, email);

	return user ? AuthorizationUser.parse(user) : undefined;
};

const initActionsPublisher = _.memoize(async () => {
	const bootstrap = new Bootstrap();
	const amqp = await bootstrap.initAmqpConnection(
		configModule.getAmqpConfig(),
	);
	const amqpFactory = new AmqpFactoryModule(amqp);
	const {coreActionsExchange} = configModule.getRabbitMQExchange();
	return amqpFactory.makePublisher(coreActionsExchange)
})

export async function createContext({req}: trpcNext.CreateNextContextOptions) {
	const db = await initDb();
	const authorizationHeader = req.headers.authorization;
	const user = await getUserFromHeader(authorizationHeader);
	const actionsPublisher = await initActionsPublisher() 

	return {
		db,
		user,
		actionsPublisher,
	};
}

export type Context = inferAsyncReturnType<typeof createContext>;
