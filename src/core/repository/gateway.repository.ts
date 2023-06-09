import {DatabasePool, NotFoundError, SlonikError} from 'slonik';
import {CredentialType, GatewayEntityRow} from '../types/gateway.type';
import {TRPCError} from '@trpc/server';
import {sql} from '../types/db.type';

export class GatewayRepository {
	static async getAll(db: DatabasePool) {
		try {
			const getaways = await db.many(
				sql.type(GatewayEntityRow)`
				SELECT * FROM gateway
			`,
			);

			return getaways;
		} catch (error) {
			if (error instanceof NotFoundError) {
				return [];
			}

			throw new Error('gateways not found');
		}
	}

	static async getById(db: DatabasePool, id: number) {
		return db.one(sql.type(GatewayEntityRow)`
			SELECT * FROM gateway
			WHERE id = ${id} 
		`)
	}

	static async checkIsCustomerGetaway(db: DatabasePool, id: number, customerId: number) {
		return db.exists(sql.typeAlias('void')`
			SELECT 1 FROM gateway
			WHERE id = ${id} 
			AND customer_id = ${customerId}
		`)
	}

	static async findByType(db: DatabasePool, type: CredentialType) {
		try {
			const getaways = await db.many(
				sql.type(GatewayEntityRow)`
				SELECT * FROM gateway 
				WHERE type = ${type};
			`,
			);

			return getaways;
		} catch (error) {
			if (error instanceof NotFoundError) {
				return [];
			} else if (error instanceof SlonikError) {
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: error.message,
				});
			}

			throw new TRPCError({code: 'INTERNAL_SERVER_ERROR'});
		}
	}

	static async insertOne(
		db: DatabasePool,
		credentials: any,
		type: CredentialType,
		userId: number,
		name?: string,
	) {
		try {
			let getawayName = name;
			if (!getawayName) {
				const countOfCustomerGateways = await db.one(sql.typeAlias('number')`
					SELECT count(id) as number FROM gateway
					WHERE customer_id = ${userId}
				`);
				getawayName = `Проект ${countOfCustomerGateways.number}`;
			}
			const credentialsJson = JSON.stringify(credentials);
			const getaway = await db.one(
				sql.type(GatewayEntityRow)`
      	INSERT INTO gateway (name, credentials, type, customer_id)
      	VALUES (${getawayName}, ${credentialsJson}, ${type}, ${userId})
				RETURNING *
    	`,
			);
			return getaway;
		} catch (error) {
			if (error instanceof SlonikError) {
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: error.message,
				});
			}
		}
	}

	static async pauseOne(db: DatabasePool, id: number) {
		try {
			await db.query(sql.typeAlias('void')`
      	UPDATE gateway SET enabled = FALSE 
      	WHERE id = ${id}
    	`);
		} catch (error) {
			if (error instanceof SlonikError) {
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: error.message,
				});
			}

			throw new TRPCError({code: 'INTERNAL_SERVER_ERROR'});
		}
	}

	static async resumeOne(db: DatabasePool, id: number) {
		db.query(sql.typeAlias('void')`
      UPDATE gateway SET enabled = TRUE 
      WHERE id = ${id}
    `);
	}

	static async removeOne(db: DatabasePool, id: number) {
		return db.query(sql.typeAlias('void')`
      DELETE FROM gateway
      WHERE id = ${id}
    `);
	}

	static createUpdateWhereFragment(
		name?: string,
		type?: CredentialType,
		credentials?: any,
	) {
		const whereExpressions = [];
		if (name) {
			whereExpressions.push(sql.fragment`name = {$name}`);
		}

		if (type) {
			whereExpressions.push(sql.fragment`type = ${type}`);
		}

		if (credentials) {
			whereExpressions.push(sql.fragment`credenials = ${credentials}`);
		}

		return sql.join(whereExpressions, sql.fragment` AND `);
	}

	static async updateOne(
		db: DatabasePool,
		id: number,
		credentials?: any,
		name?: string,
		type?: CredentialType,
	) {
		return db.query(sql.typeAlias('void')`
			UPDATE gateway
			${this.createUpdateWhereFragment(name, type, credentials)}
			WHERE id = ${id}
		`);
	}
}
