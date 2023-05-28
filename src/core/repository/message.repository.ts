import {DatabasePool, DatabaseTransactionConnection, sql} from 'slonik';
import {MessagePayload} from '../../common/types/payload';

export class MessageRepository {
	static async insertOne(
		t: DatabaseTransactionConnection | DatabasePool,
		parentId: number | null,
		chatId: number,
		payload: MessagePayload,
		type: 'incoming' | 'outgoing',
	) {
		await t.query(
			sql.unsafe`INSERT INTO messages (
        parent_id, 
        chat_id,
        payload,
        type,
      )
       VALUES ($1,$2,$3,$4)`,
			[parentId, chatId, JSON.stringify(payload), type],
		);
	}
}
