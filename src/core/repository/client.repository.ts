import {DatabasePool, DatabaseTransactionConnection} from 'slonik';
import {ClientEntityRow} from '../types/client.type';
import {sql} from '../types/db.type';
import {SocialNetwork} from '../../common/types/payload';

export class ClientRepository {
	static async findByExternalId(
		db: DatabasePool,
		externalId: number,
		socialNetwork: SocialNetwork,
	) {
		return db.maybeOne(
			sql.type(ClientEntityRow)`
    	SELECT * FROM client
    	WHERE external_id = ${externalId}
			AND social_network = ${socialNetwork}
  	`,
		);
	}

	static async insertOne(
		db: DatabasePool,
		externalId: number,
		name: string,
		socialNetwork: SocialNetwork,
	) {
		return db.one(
			sql.type(ClientEntityRow)`
			INSERT INTO client (external_id, name, social_network)
			VALUES (${externalId}, ${name}, ${socialNetwork})
			RETURNING *
			`,
		);
	}

	static async getByChatId(db: DatabasePool, chatId: number) {
		return db.one(sql.type(ClientEntityRow)`
			WITH client_id AS (
				SELECT client_id as id FROM chat
				WHERE chat_id = ${chatId}
			)
			SELECT * FROM client
			WHERE id = (SELECT id FROM client_id)
		`);
	}

	static async findClientByGateway(db: DatabasePool, gatewayId: number) {
		const client = db.one;
	}
}
