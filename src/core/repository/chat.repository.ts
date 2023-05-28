import {DatabasePool, DatabaseTransactionConnection, sql} from 'slonik';
import {ChatEntityRow} from '../types/chat.type';

export class ChatRepository {
	static getChatById(db: DatabasePool, id: number) {
		return db.maybeOne(sql.type(ChatEntityRow)`
			SELECT * FROM chats 
			WHERE id = ${id}
		`);
	}

	static async getChat(
		t: DatabaseTransactionConnection,
		gatewayId: number,
		clientId: number,
	) {
		await t.query(
			sql.typeAlias('void')`
			INSERT INTO chats (client_id,gateway_id) 
			VALUES ($1,$2) 
			ON CONFLICT (client_id,gateway_id) DO NOTHING`,
			[clientId, gatewayId],
		);

		return t.maybeOne(
			sql.type(ChatEntityRow)`
			SELECT * FROM chats 
			WHERE client_id = $1 AND gateway_id = $2
		`,
			[clientId, gatewayId],
		);
	}
}
