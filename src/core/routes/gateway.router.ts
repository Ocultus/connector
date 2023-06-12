import {GatewayEntity, GatewayEntityRow} from '../types/gateway.type';
import {protectedProcedure} from '../trpc/middleware';
import {GatewayRepository} from '../repository/gateway.repository';
import {
	CreateGatewayInput,
	FindByTypeGatewayInput,
	GetAllGetawayInput,
	UpdateGatewayInput,
} from './types/gateway.input';
import {t} from '../trpc/router';
import {IdInput} from './types/base.input';
import {DatabasePool} from 'slonik';
import {AmqpPublisherModule} from '../../common/amqp';
import {TRPCError} from '@trpc/server';
import {isCustomerGatewayGuard} from '../guards/isCustomerGetaway.guard';

const actionQueryHandler = async (
	db: DatabasePool,
	actionPublisher: AmqpPublisherModule,
	action: 'create' | 'pause' | 'resume' | 'stop',
	gateway?: GatewayEntity,
	id?: number,
) => {
	if (!gateway && !id) {
		throw new TRPCError({code: 'BAD_REQUEST'});
	}

	if (!gateway) {
		gateway = await GatewayRepository.getById(db, id!);
	}

	const routingKey = gateway.type;
	let payload: {} = {
		id: gateway.id,
		action,
	};

	if (action === 'create') {
		payload = {
			...payload,
			credentials: gateway.credentials,
			type: gateway.type,
		};
		actionPublisher.publish(payload, routingKey);
	} else {
		actionPublisher.publish(payload, routingKey);
	}
};

export const GatewayRouter = t.router({
	create: protectedProcedure
		.input(CreateGatewayInput)
		.mutation(async ({ctx, input}) => {
			const {credentials, type, name} = input;
			const {db, user, actionPublisher} = ctx;

			let gatewayName = name;
			if (!name) {
				const countOfCustomerGateways =
					await GatewayRepository.countOfCustomerGateways(db, user.id);
				gatewayName = `Проект ${countOfCustomerGateways.number + 1}`;
			}

			const gateway = await GatewayRepository.insertOne(
				db,
				credentials,
				type,
				user.id,
				gatewayName!,
			);
			if (!gateway) {
				throw new TRPCError({code: 'BAD_REQUEST'});
			}

			await actionQueryHandler(db, actionPublisher, 'create', gateway);
			return GatewayEntityRow.parse(gateway);
		}),
	findByType: t.procedure
		.input(FindByTypeGatewayInput)
		.mutation(async ({ctx, input}) => {
			const {type} = input;
			const gatewaysRaw = await GatewayRepository.findByType(ctx.db, type);

			return gatewaysRaw.map(gateway => {
				return GatewayEntityRow.parse(gateway);
			});
		}),
	getAll: protectedProcedure
		.input(GetAllGetawayInput)
		.mutation(async ({ctx, input}) => {
			const {db, user} = ctx;
			const {type} = input;

			const getaways = await GatewayRepository.getAll(db, user.id, type);

			return getaways;
		}),
	pauseById: protectedProcedure
		.input(IdInput)
		.use(isCustomerGatewayGuard)
		.mutation(async ({ctx, input}) => {
			const {id} = input;
			const {db, actionPublisher} = ctx;

			await Promise.all([
				GatewayRepository.pauseOne(db, id),
				actionQueryHandler(db, actionPublisher, 'stop', undefined, id),
			]);
		}),
	resumeById: protectedProcedure
		.input(IdInput)
		.use(isCustomerGatewayGuard)
		.mutation(async ({ctx, input}) => {
			const {id} = input;
			const {db, actionPublisher} = ctx;

			const gateway = await GatewayRepository.resumeOne(db, id);
			if (!gateway) {
				throw new TRPCError({code: 'BAD_REQUEST'});
			}

			await actionQueryHandler(db, actionPublisher, 'create', undefined, id);
		}),
	deleteById: protectedProcedure
		.input(IdInput)
		.use(isCustomerGatewayGuard)
		.mutation(async ({ctx, input}) => {
			const {id} = input;
			const {db, actionPublisher} = ctx;

			await Promise.all([
				GatewayRepository.removeOne(ctx.db, id),
				actionQueryHandler(db, actionPublisher, 'stop', undefined, id),
			]);
		}),
	updateById: protectedProcedure
		.input(UpdateGatewayInput)
		.use(isCustomerGatewayGuard)
		.mutation(async ({ctx, input}) => {
			const {id, credenials, name, type} = input;

			await GatewayRepository.updateOne(ctx.db, id, credenials, name, type);
		}),
});
