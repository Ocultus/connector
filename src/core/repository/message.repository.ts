import {DatabasePool, DatabaseTransactionConnection} from 'slonik';
import {MessagePayload} from '../../common/types/payload';
import {sql} from '../types/db.type';
import {InsertMessage} from '../types/message.type';

export class MessageRepository {
	static async insertOne(
		db: DatabasePool,
		chatId: number,
		payload: MessagePayload,
		parentId: number | null = null,
		type = 'outgoing',
	) {
		db.query(sql.typeAlias('void')`
			INSERT INTO message (chat_id, parent_id, payload, type) 
			VALUES (${chatId}, ${parentId}, ${JSON.stringify(payload)}, ${type})
		`);
	}

	static async batchInsert(
		db: DatabasePool,
		chatId: number,
		messages: InsertMessage[],
		type = 'incoming',
	) {
		const payloadValuesFragments = messages.map(({payload, externalId}) => {
			return sql.fragment`(${sql.join(
				[chatId, JSON.stringify(payload), type, externalId],
				sql.fragment`, `,
			)})`;
		});

		await db.query(sql.typeAlias('void')`
			INSERT INTO message (
				chat_id, payload, type, external_id
			) VALUES 
			${sql.join(payloadValuesFragments, sql.fragment`, `)}
		`);
	}

	static async batchUpdate(
		db: DatabasePool,
		chatId: number,
		messages: InsertMessage[],
		type = 'incoming',
	) {
		const internalMessageIds = messages.map(({externalId}) => {
			return externalId;
		});

		await db.query(sql.typeAlias('void')`
			DELETE FROM message
			WHERE external_id IN (${sql.join(internalMessageIds, sql.fragment`, `)})
		`);

		await this.batchInsert(db, chatId, messages, type);
	}
}
