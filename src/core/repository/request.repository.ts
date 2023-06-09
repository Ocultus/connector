import {DatabasePool} from 'slonik';
import {sql} from '../types/db.type';

export class RequestRepository {
	static async insertOne(db: DatabasePool, gatewayId: number, chatId: number) {
		await db.query(sql.typeAlias('void')`
      INSERT INTO request(gateway_id, chat_id)
      VALUES (${gatewayId}, ${chatId})
    `);
	}
}
