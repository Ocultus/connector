import {Client, DatabaseError} from 'pg';
import {EmployeeEntity, EmployeeEntityRow} from '../entities/employee.entity';
import {EmployeeAlreadyExistException} from '../types/exceptions/user-exception.type';
import {createHmac} from 'crypto';

export class EmployeeRepository {
	constructor(private readonly pg: Client) {}

	public insertOne = async (
		email: string,
		password: string,
		name: string,
	): Promise<EmployeeEntity> => {
		try {
			const cryptoPassword = createHmac('sha256', password).digest('hex');

			const insertedEmployeeRaw = await this.pg.query<EmployeeEntityRow>(
				`
        INSERT INTO employee(email,password,name) 
				VALUES ($1,$2,$3) 
				RETURNING *;
      `,
				[email, cryptoPassword, name],
			);
			const {created_at, ...insertedEmployee} = insertedEmployeeRaw.rows[0];

			return {
				...insertedEmployee,
				createdAt: new Date(created_at),
			};
		} catch (e) {
			if ((e as DatabaseError).routine === '_bt_check_unique') {
				throw new EmployeeAlreadyExistException();
			}

			throw e;
		}
	};

	public findOneByCredentials = async (
		email: string,
		password: string,
	): Promise<EmployeeEntity | undefined> => {
		const cryptoPassword = createHmac('sha256', password).digest('hex');

		const employeeRaw = await this.pg.query<EmployeeEntityRow>(
			`
      SELECT * FROM employee WHERE email = $1 AND password = $2
			LIMIT 1
    `,
			[email, cryptoPassword],
		);
		const employee = employeeRaw.rows[0];
		if (!employee) {
			return undefined;
		}

		const {created_at, ...otherEmployeeData} = employee;
		return {
			...otherEmployeeData,
			createdAt: new Date(created_at),
		};
	};
}
