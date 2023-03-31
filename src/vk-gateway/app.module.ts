import {AmqpFactoryModule} from '../common/amqp';
import {Bootstrap} from '../common/bootstap.module';
import {configModule} from '../common/config/config.module';

export class ApplicationModule {
	private bootsrap: Bootstrap;
	constructor() {
		this.bootsrap = new Bootstrap();
	}

	public init = async () => {
		const amqpConfig = configModule.getAmqpConfig();
		const amqpConnection = await this.bootsrap.initAmqpConnection(amqpConfig);
		const amqpFactory = new AmqpFactoryModule(amqpConnection);
		const endpoints = configModule.getEndpointsConfig();

		console.log('finish init');
	};
}

(async () => {
	const app = new ApplicationModule();
	await app.init();
})();
