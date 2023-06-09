import {DatabasePool, DatabaseTransactionConnection} from 'slonik';
import {MessagePayload} from '../../common/types/payload';
import {sql} from '../types/db.type';

export class MessageRepository {
	static async insertOne(
		t: DatabaseTransactionConnection | DatabasePool,
		parentId: number | null,
		chatId: number,
		payload: MessagePayload,
		type: 'incoming' | 'outgoing',
	) {
		await t.query(sql.typeAlias('void')`
			INSERT INTO messages (
        parent_id, 
        chat_id,
        payload,
        type,
      )
      VALUES (${parentId},${chatId},${JSON.stringify(payload)}, ${type})`);
	}
}
