import {GatewayEntity, GatewayEntityRow} from '../types/gateway.type';
import {protectedProcedure} from '../trpc/middleware';
import {GatewayRepository} from '../repository/gateway.repository';
import {
	CreateGetawayInput,
	FindByTypeGetawayInput,
	UpdateGetawayInput,
} from './types/gateway.input';
import {t} from '../trpc/router';
import {IdInput, PaginationInput} from './types/base.input';
import {isUserGetawayGuard} from '../guards/isUserGetaway.guard';
import {DatabasePool} from 'slonik';
import {AmqpPublisherModule} from '../../common/amqp';
import {TRPCError} from '@trpc/server';

const actionQueryHandler = async (
	db: DatabasePool,
	actionsPublisher: AmqpPublisherModule,
	action: 'create' | 'pause' | 'resume' | 'stop',
	getaway?: GatewayEntity,
	id?: number,
) => {
	if (!getaway || !id) {
		throw new TRPCError({code: 'BAD_REQUEST'});
	}

	if (!getaway) {
		getaway = await GatewayRepository.getById(db, id);
	}

	const routingKey = getaway.type + '.actions';
	let payload: {} = {
		id: getaway.id,
		action,
	};

	if (action === 'create') {
		payload = {
			...payload,
			credentials: getaway.credentials,
			type: getaway.type,
		};
		actionsPublisher.publish(payload, routingKey);
	} else {
		actionsPublisher.publish(payload, routingKey);
	}
};

export const GatewayRouter = t.router({
	create: protectedProcedure
		.input(CreateGetawayInput)
		.mutation(async ({ctx, input}) => {
			const {credentials, type} = input;
			const {db, user, actionsPublisher} = ctx;

			const getaway = await GatewayRepository.insertOne(
				db,
				credentials,
				type,
				user.id,
			);
			if (!getaway) {
				throw new TRPCError({code: 'BAD_REQUEST'});
			}

			await actionQueryHandler(db, actionsPublisher, 'create', getaway);
			return GatewayEntityRow.parse(getaway);
		}),
	findByType: t.procedure
		.input(FindByTypeGetawayInput)
		.mutation(async ({ctx, input}) => {
			const {type} = input;
			const gatewaysRaw = await GatewayRepository.findByType(ctx.db, type);

			return gatewaysRaw.map(gateway => {
				return GatewayEntityRow.parse(gateway);
			});
		}),

	getAll: protectedProcedure
		.input(PaginationInput)
		.query(async ({ctx, input}) => {
			const {limit, cursor} = input;
		}),

	pauseById: protectedProcedure
		.input(IdInput)
		.use(isUserGetawayGuard)
		.mutation(async ({ctx, input}) => {
			const {id} = input;
			const {db, actionsPublisher} = ctx;

			await Promise.all([
				await GatewayRepository.pauseOne(db, id),
				actionQueryHandler(db, actionsPublisher, 'resume', undefined, id),
			]);
		}),

	resumeById: protectedProcedure
		.input(IdInput)
		.use(isUserGetawayGuard)
		.mutation(async ({ctx, input}) => {
			const {id} = input;
			const {db, actionsPublisher} = ctx;

			await Promise.all([
				GatewayRepository.resumeOne(db, id),
				actionQueryHandler(db, actionsPublisher, 'resume', undefined, id),
			]);
		}),

	deleteById: protectedProcedure
		.input(IdInput)
		.use(isUserGetawayGuard)
		.mutation(async ({ctx, input}) => {
			const {id} = input;
			const {db, actionsPublisher} = ctx;

			await Promise.all([
				GatewayRepository.removeOne(ctx.db, id),
				actionQueryHandler(db, actionsPublisher, 'stop', undefined, id),
			]);
		}),

	updateById: protectedProcedure
		.input(UpdateGetawayInput)
		.use(isUserGetawayGuard)
		.mutation(async ({ctx, input}) => {
			const {id, credenials, name, type} = input;

			await GatewayRepository.updateOne(ctx.db, id, credenials, name, type);
		}),
});
