import {GatewayEntityRow} from '../types/gateway.type';
import {protectedProcedure} from '../trpc/middleware';
import {t} from '../trpc/router';
import {GatewayRepository} from '../repository/gateway.repository';
import {
	CreateGetawayInput,
	FindByTypeGetawayInput,
	UpdateGetawayInput,
} from './types/gateway.input';
import {IdInput, PaginationInput} from './types/base.input';

export const GatewayRouter = t.router({
	findByType: protectedProcedure
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

	create: protectedProcedure
		.input(CreateGetawayInput)
		.mutation(async ({ctx, input}) => {
			const {credentials, type, projectId} = input;
			await GatewayRepository.insertOne(ctx.db, projectId, credentials, type);

			
		}),

	pauseById: protectedProcedure
		.input(IdInput)
		.mutation(async ({ctx, input}) => {
			const {id} = input;

			GatewayRepository.pauseOne(ctx.db, id);
		}),

	resumeById: protectedProcedure
		.input(IdInput)
		.mutation(async ({ctx, input}) => {}),

	deleteById: protectedProcedure
		.input(IdInput)
		.mutation(async ({ctx, input}) => {
			const {id} = input;

			GatewayRepository.removeOne(ctx.db, id);
		}),

	updateById: protectedProcedure
		.input(UpdateGetawayInput)
		.mutation(async ({ctx, input}) => {
			const {id, credenials, name, type} = input;
			
			GatewayRepository.updateOne(ctx.db, id, credenials, name, type);
		}),
});
