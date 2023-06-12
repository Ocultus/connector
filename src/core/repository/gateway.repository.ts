import {
	DatabasePool,
	IntegrityConstraintViolationError,
	NotFoundError,
	SlonikError,
} from 'slonik';
import {CredentialType, GatewayEntityRow} from '../types/gateway.type';
import {TRPCError} from '@trpc/server';
import {sql} from '../types/db.type';

export class GatewayRepository {
	static async insertOne(
		db: DatabasePool,
		credentials: any,
		type: CredentialType,
		userId: number,
		name: string,
	) {
		try {
			const credentialsJson = JSON.stringify(credentials);
			const gateway = await db.one(
				sql.type(GatewayEntityRow)`
      	INSERT INTO gateway (name, credentials, type, customer_id)
      	VALUES (${name}, ${credentialsJson}, ${type}, ${userId})
				RETURNING *
    	`,
			);
			return gateway;
		} catch (error) {
			if (error instanceof IntegrityConstraintViolationError) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Gateway with this credentials already exists',
				});
			}

			if (error instanceof SlonikError) {
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: error.message,
				});
			}
		}
	}

	static async countOfCustomerGateways(db: DatabasePool, customerId: number) {
		return db.one(sql.typeAlias('number')`
			SELECT count(id) as number FROM gateway
			WHERE customer_id = ${customerId}
		`);
	}

	static async getAll(db: DatabasePool, customerId: number, type?: CredentialType) {
		return db.any(
			sql.type(GatewayEntityRow)`
				SELECT * FROM gateway
				WHERE customer_id = ${customerId}
				${type ? sql.fragment`AND type = ${type}` : sql.fragment``}
			`,
		);
	}

	static async getById(db: DatabasePool, id: number) {
		return db.one(sql.type(GatewayEntityRow)`
			SELECT * FROM gateway
			WHERE id = ${id} 
		`);
	}

	static async checkCustomerIdentity(
		db: DatabasePool,
		id: number,
		customerId: number,
	) {
		return db.exists(sql.typeAlias('void')`
			SELECT 1 FROM gateway
			WHERE id = ${id} 
			AND customer_id = ${customerId}
		`);
	}

	static async findByType(db: DatabasePool, type: CredentialType) {
		try {
			const gateways = await db.any(
				sql.type(GatewayEntityRow)`
				SELECT * FROM gateway 
				WHERE type = ${type};
			`,
			);

			return gateways;
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

	static async pauseOne(db: DatabasePool, id: number) {
		return db.maybeOne(sql.typeAlias('void')`
      UPDATE gateway SET enabled = FALSE 
      WHERE id = ${id}
    `);
	}

	static async resumeOne(db: DatabasePool, id: number) {
		return db.query(sql.type(GatewayEntityRow)`
      UPDATE gateway SET enabled = TRUE 
      WHERE id = ${id}
			RETURNING *
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
