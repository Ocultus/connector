import {Bootstrap} from '../common/bootstap.module';
import {configModule} from '../common/config/config.module';
import {EmployeeRepository} from '../common/repository/employee.repository';
import {EmployeeAlreadyExistException} from '../common/types/exceptions/user-exception.type';

export class ApplicationModule {
	private bootstrap: Bootstrap;
	constructor() {
		this.bootstrap = new Bootstrap();
	}

	public init = async () => {
		const databaseConfig = configModule.getDatabaseConfig();
		const pgClient = await this.bootstrap.initDatabase(databaseConfig);
		console.debug('database initialize finished');

		const employeeRepository = new EmployeeRepository(pgClient);
		//test
		try {
			await employeeRepository.insertOne('test', 'test', 'test');
		} catch (e) {
			if (e instanceof EmployeeAlreadyExistException) {
				console.log(e.message);
			}
		}
		console.log(await employeeRepository.findOneByCredentials('test', 'test'));
	};
}

(async () => {
	const app = new ApplicationModule();
	await app.init();
})();
