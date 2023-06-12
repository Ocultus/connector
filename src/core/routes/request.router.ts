import {TRPCError} from '@trpc/server';
import {isCustomerRequestGuard} from '../guards/isCustomerRequest.guard';
import {RequestRepository} from '../repository/request.repository';
import {protectedProcedure} from '../trpc/middleware';
import {t} from '../trpc/router';
import {IdInput} from './types/base.input';
import {
	GetAllRequestInput,
	UpdateRequestStatusInput,
} from './types/request.input';

export const RequestRouter = t.router({
	getById: protectedProcedure
		.input(IdInput)
		.use(isCustomerRequestGuard)
		.mutation(async ({ctx, input}) => {
			const {db} = ctx;
			const {id} = input;

			const requestWithMessages = await RequestRepository.getWithMessagesById(
				db,
				id,
			);
			if (requestWithMessages.length) {
				const {id, chatId, createdAt, gatewayId, type} = requestWithMessages[0];
				const messages = requestWithMessages.map(
					({payload, messageId, messageCreatedAt}) => {
						return {
							id: messageId,
							payload,
							createdAt: new Date(messageCreatedAt),
						};
					},
				);

				const request = {
					id,
					chatId,
					createdAt,
					gatewayId,
					type,
					messages,
				};
				return request;
			} else {
				throw new TRPCError({code: 'NOT_FOUND'});
			}
		}),
	editStatusById: protectedProcedure
		.input(UpdateRequestStatusInput)
		.use(isCustomerRequestGuard)
		.mutation(async ({ctx, input}) => {
			const {db} = ctx;
			const {id, status} = input;

			await RequestRepository.updateStatusById(db, id, status);
		}),
	getAll: protectedProcedure
		.input(GetAllRequestInput)
		.mutation(async ({ctx, input}) => {
			const {db, user} = ctx;
			const {type, getawayId} = input;

			const requestsRaw = await RequestRepository.getAll(
				db,
				user.id,
				type,
				getawayId,
			);
			const requests = requestsRaw.map(request => {
				const {
					messageId,
					messageType,
					messageCreatedAt,
					messagePayload,
					...otherRequestData
				} = request;
				return {
					...otherRequestData,
					lastMessage: {
						id: messageId,
						type: messageType,
						payload: messagePayload,
						createdAt: new Date(messageCreatedAt),
					},
				};
			});

			return requests;
		}),
});
