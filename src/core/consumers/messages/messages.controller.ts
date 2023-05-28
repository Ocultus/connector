import _ from 'lodash';
import {Envelope} from '../../../common/types/payload';
import {ChatRepository} from '../../repository/chat.repository';
import {DatabasePool} from 'slonik';
import {ClientRepository} from '../../repository/client.repository';
import {MessageRepository} from '../../repository/message.repository';

export class MessageConsumer {
	constructor(
		private readonly db: DatabasePool,
	) {}

	recieveMessage = async (envelopes: Envelope[]) => {
		const partitionedEnvelopesByChat = _.partition(envelopes, e => e.chatId);

		for (const part of partitionedEnvelopesByChat) {
			if (!part.length) {
				continue;
			}
			const {chatId, name, getawayId} = part[0];
			const chat = await ChatRepository.getChatById(this.db, chatId);

      let db = this.db as any
			if (!chat) {
				const transaction = await this.db.transaction(async t => {
					const client = await ClientRepository.getClient(t, name, chatId);
					const chat = await ChatRepository.getChat(t, getawayId, chatId);
				});
        db = transaction
			}

			for (const env of part) {
				let parentId = null;
				if (env.type === 'incoming') {
					parentId = env.parentMessageId;
				}
				await MessageRepository.insertOne(
					db,
					parentId ? Number(parentId) : null,
					env.chatId,
					env.payload,
					env.type,
				);
			}
		}
	};
}
