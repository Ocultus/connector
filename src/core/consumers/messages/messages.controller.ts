import _ from 'lodash';
import {Envelope} from '../../../common/types/payload';
import {ChatRepository} from '../../repository/chat.repository';
import {DatabasePool} from 'slonik';
import {ClientRepository} from '../../repository/client.repository';
import {MessageRepository} from '../../repository/message.repository';
import {RequestRepository} from '../../repository/request.repository';
import {ChatEntity} from '../../types/chat.type';
import {InsertMessage, UpdateMessage} from '../../types/message.type';

export class MessageConsumer {
	constructor(private readonly db: DatabasePool) {}

	recieveMessage = async (envelopes: Envelope[]) => {
		const partitionedEnvelopesByChat = _.partition(envelopes, e => e.clientId);
		for (const part of partitionedEnvelopesByChat) {
			if (!part.length) {
				continue;
			}

			if (part[0].type === 'outgoing') {
				continue;
			}

			const {gatewayId, clientId, socialNetwork, clientName} = part[0];
			const client = await ClientRepository.findByExternalId(
				this.db,
				clientId,
				socialNetwork,
			);
			let chat: ChatEntity | null | undefined;

			const newMessages: InsertMessage[] = [];
			const editMessages: UpdateMessage[] = [];
			part.forEach(envelope => {
				if (
					envelope.type === 'incoming' &&
					envelope.eventType === 'new_message'
				) {
					const {payload, externalId} = envelope;
					const message = {
						payload,
						externalId,
					};
					newMessages.push(message);
				}
			});

			part.forEach(envelope => {
				if (
					envelope.type == 'incoming' &&
					envelope.eventType === 'edit_message'
				) {
					const {payload, externalId} = envelope;
					const message = {
						payload,
						externalId,
					};
					editMessages.push(message);
				}
			});
		
			if (!client) {
				const {id} = await ClientRepository.insertOne(
					this.db,
					clientId,
					clientName,
					socialNetwork,
				);
				chat = await ChatRepository.insertOne(this.db, id, gatewayId);
				await RequestRepository.insertOne(this.db, gatewayId, chat.id);
			} else {
				chat = await ChatRepository.getByClientAndGateway(this.db, client.id, gatewayId);

				if (!chat) {
					chat = await ChatRepository.insertOne(this.db, client.id, gatewayId);
				} else {
					const gatewayHasNonClosedRequests =
						await RequestRepository.checkNonClosed(this.db, gatewayId, chat.id);
					if (!gatewayHasNonClosedRequests) {
						await RequestRepository.insertOne(this.db, gatewayId, chat.id);
					}
				}
			}

			if (!chat) {
				continue;
			}

			if (newMessages.length) {
				await MessageRepository.batchInsert(this.db, chat.id, newMessages);
			}

			if (editMessages.length) {
				await MessageRepository.batchUpdate(this.db, chat.id, editMessages);
			}
		}
	};
}
