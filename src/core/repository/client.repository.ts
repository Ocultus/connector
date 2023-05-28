import {DatabaseTransactionConnection, sql} from 'slonik';
import {ClientEntityRow} from '../types/client.type';

export class ClientRepository {
	static async getClient(
		t: DatabaseTransactionConnection,
		name: string,
		external_id: number,
	) {
		await t.query(
			sql.typeAlias('void')`
			INSERT INTO clients (name,extenral_id) 
			VALUES ($1,$2) ON CONFLICT (extenral_id) DO NOTHING`,
			[name, external_id],
		);

		return t.maybeOne(
			sql.type(ClientEntityRow)`
    	SELECT * FROM clients 
    	WHERE extenral_id = $1
  `,
			[external_id],
		);
	}
}