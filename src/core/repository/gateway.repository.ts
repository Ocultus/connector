import {DatabasePool, NotFoundError, SlonikError, sql} from 'slonik';
import {CredentialType, GatewayEntityRow} from '../types/gateway.type';
import {TRPCError} from '@trpc/server';

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
		projectId: number,
		credentials: any,
		type: CredentialType,
	) {
		try {
			await db.query(sql.typeAlias('void')`
      INSERT INTO gateway (project_id, credentials, gateway_type)
      VALUES (${projectId}, ${credentials}, ${type})
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
		await db.query(sql.typeAlias('void')`
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
