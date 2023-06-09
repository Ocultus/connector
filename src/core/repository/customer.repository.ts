import {TRPCError} from '@trpc/server';
import {DatabasePool} from 'slonik';
import {PasswordInput} from '../routes/types/auth.input';
import {sql} from '../types/db.type';
import {AuthorizationUser} from '../types/customer.type';

export class CustomerRepository {
	static findByEmail(db: DatabasePool, email: string) {
		return db.maybeOne(sql.type(AuthorizationUser)`
			SELECT id from customer
			WHERE email = ${email}
		`);
	}

	static getPasswordByEmail(db: DatabasePool, email: string) {
		return db.maybeOne(sql.type(PasswordInput)`
			SELECT password FROM customer 
			WHERE email = ${email}
		`);
	}

	static checkExist(db: DatabasePool, email: string): Promise<boolean> {
		return db.exists(sql.typeAlias('void')`
			SELECT 1 FROM customer 
			WHERE email = ${email} 
		`);
	}

	static async insertOne(
		db: DatabasePool,
		name: string,
		email: string,
		password: string,
	) {
		try {
			await db.query(sql.typeAlias('void')`
			  INSERT INTO customer (name, email, password) VALUES
			  (${name}, ${email}, ${password})
		  `);
		} catch (e) {
			throw new TRPCError({code: 'BAD_REQUEST'});
		}
	}
}
