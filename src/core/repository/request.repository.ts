import {DatabasePool} from 'slonik';
import {sql} from '../types/db.type';
import {
	RequestEntityRow,
	RequestType,
	RequestWithGateway,
	RequestWithLastMessage,
	RequestWithMessageEntityRow,
} from '../types/request.type';

export class RequestRepository {
	static async insertOne(db: DatabasePool, gatewayId: number, chatId: number) {
		await db.query(sql.typeAlias('void')`
      INSERT INTO request(gateway_id, chat_id)
      VALUES (${gatewayId}, ${chatId})
    `);
	}

	static async checkNonClosed(
		db: DatabasePool,
		gatewayId: number,
		chatId: number,
	) {
		return db.exists(sql.typeAlias('void')`
      SELECT 1 FROM request
      WHERE gateway_id = ${gatewayId}
      AND chat_id = ${chatId}
			AND type != 'closed'
    `);
	}

	static async GetRequestsByGatewayAndChats(
		db: DatabasePool,
		gatewayId: number,
		chatIds: number[],
	) {
		const chatIdsSqlFragment = sql.join(chatIds, sql.fragment`, `);
		return db.any(sql.type(RequestEntityRow)`
      SELECT * FROM request
      WHERE gateway_id = ${gatewayId}
      AND chat_id IN (${chatIdsSqlFragment})
    `);
	}

	static async checkCustomerIdentity(
		db: DatabasePool,
		id: number,
		customerId: number,
	) {
		return db.exists(sql.typeAlias('void')`
			WITH gateway_ids as (
				SELECT id FROM gateway 
				WHERE customer_id = ${customerId}
			)
			SELECT 1 FROM request
			WHERE id = ${id} 
			AND gateway_id IN (SELECT id FROM gateway_ids)
		`);
	}

	static async findById(db: DatabasePool, id: number) {
		return db.maybeOne(sql.type(RequestEntityRow)`
			SELECT * FROM request
			WHERE id = ${id}
		`);
	}

	static async getWithGatewayAndClientId(db: DatabasePool, id: number) {
		return db.maybeOne(sql.type(RequestWithGateway)`
			SELECT r.id as id, g.type as gateway_type,
			r.created_at as created_at, r.updated_at as updated_at,
			r.gateway_id as gateway_id, r.type as type,
			r.chat_id as chat_id,
			cl.external_id as client_id
			FROM request r
			JOIN gateway g on r.id = ${id} 
			JOIN chat ch ON r.chat_id = ch.id
			JOIN client cl on cl.id = ch.client_id
			AND r.gateway_id = g.id
		`);
	}

	static async getWithMessagesById(db: DatabasePool, id: number) {
		return db.any(sql.type(RequestWithMessageEntityRow)`
			SELECT r.id as id, r.gateway_id as gateway_id,
			r.chat_id as chat_id, r.type as type, r.updated_at as updated_at,
			m.id as message_id, m.payload as payload, 
			m.created_at as message_created_at FROM request r
			JOIN message m on r.id =${id} 
			AND r.chat_id = m.chat_id
		`);
	}

	static async updateStatusById(
		db: DatabasePool,
		id: number,
		status: RequestType,
	) {
		await db.query(sql.typeAlias('void')`
			UPDATE request 
			SET type = ${status}
			WHERE id = ${id}
		`);
	}

	static getAllJoinFragment = (type?: RequestType, gatewayId?: number) => {
		const sqlFragments = [];

		if (gatewayId) {
			sqlFragments.push(sql.fragment`AND req.gateway_id = ${gatewayId}`);
		} else {
			sqlFragments.push(sql.fragment`AND req.gateway_id = g.id`);
		}

		if (type) {
			sqlFragments.push(sql.fragment`AND req.type = ${type}`);
		}

		return sql.join(sqlFragments, sql.fragment` `);
	};

	static async getAll(
		db: DatabasePool,
		customerId: number,
		type?: RequestType,
		gatewayId?: number,
	) {
		const getAllJoinFragment = this.getAllJoinFragment(type, gatewayId);

		return db.any(sql.type(RequestWithLastMessage)`
			SELECT req.id as id, req.gateway_id as gateway_id,
			req.chat_id as chat_id, req.type as type,
			req.created_at as created_at, req.updated_at as updated_at,
			m.id as message_id, m.type as message_type,
			m.payload as message_payload, 
			m.created_at as message_created_at
			FROM request req
			JOIN gateway g ON
			g.customer_id = ${customerId}
			${getAllJoinFragment}
			JOIN LATERAL (
    	SELECT * FROM message m
    	WHERE req.chat_id = m.chat_id
    	ORDER BY m.created_at DESC LIMIT 1
		) AS m ON TRUE
		`);
	}
}
