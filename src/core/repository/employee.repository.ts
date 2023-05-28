import {TRPCError} from '@trpc/server';
import {DatabasePool, sql} from 'slonik';

export class EmployeeRepository {
  static getPasswordByEmail(db: DatabasePool, email: string) {
    return db.maybeOne(sql.typeAlias('string')`
			SELECT password FROM employee 
			WHERE email = ${email}
		`);
  }

	static checkExist(db: DatabasePool, email: string): Promise<boolean> {
		return db.exists(sql.typeAlias('void')`
			SELECT 1 FROM employee 
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
			  INSERT INTO employee (name, email, password) VALUES
			  (${name}, ${email}, ${password})
		  `);
		} catch (e) {
			throw new TRPCError({code: 'BAD_REQUEST'});
		}
	}
}
