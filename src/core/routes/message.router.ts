import {TRPCError} from '@trpc/server';
import {MessageRepository} from '../repository/message.repository';
import {protectedProcedure} from '../trpc/middleware';
import {t} from '../trpc/router';
import {MessageInputRow} from './types/message.input';
import {RequestRepository} from '../repository/request.repository';
import {Envelope} from '../../common/types/payload';

export const ChatRouter = t.router({
	sendMessage: protectedProcedure
		.input(MessageInputRow)
		.mutation(async ({ctx, input}) => {
			const {db, messagePublisher} = ctx;
			const {requestId, payload} = input;

			if (!payload.text && !payload.attachments.length) {
				throw new TRPCError({code: 'BAD_REQUEST'});
			}

			const requestWithGateway =
				await RequestRepository.getWithGatewayAndClientId(db, requestId);
			if (!requestWithGateway) {
				throw new TRPCError({code: 'NOT_FOUND'});
			}

			await MessageRepository.insertOne(db, requestWithGateway.chatId, payload);

			const envelope: Envelope = {
				type: 'outgoing',
				payload: payload,
				clientId: requestWithGateway.clientId,
				eventType: 'new_message',
				gatewayId: requestWithGateway.gatewayId,
			};
			const topic = requestWithGateway.gatewayType;
			messagePublisher.publish(envelope, topic);
		}),
});
