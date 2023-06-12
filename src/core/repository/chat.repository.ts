import {DatabasePool} from 'slonik';
import {ChatEntityRow} from '../types/chat.type';
import {sql} from '../types/db.type';

export class ChatRepository {
	static insertOne(db: DatabasePool, clientId: number, gatewayId: number) {
		return db.one(
			sql.type(ChatEntityRow)`
			INSERT INTO chat (client_id, gateway_id)
			VALUES (${clientId}, ${gatewayId})
			RETURNING *
			`,
		);
	}

	static findById(db: DatabasePool, id: number) {
		return db.maybeOne(sql.type(ChatEntityRow)`
			SELECT * FROM chat
			WHERE id = ${id}
		`);
	}

	static async getByClientAndGateway(db: DatabasePool, clientId: number, gatewayId: number) {
		return db.maybeOne(sql.type(ChatEntityRow)`
			SELECT * FROM chat 
			WHERE chat.gateway_id = ${gatewayId} 
			AND chat.client_id = ${clientId}
		`);
	}
}
