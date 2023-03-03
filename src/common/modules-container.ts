import {Container, interfaces} from 'inversify';
import {
	InfrastructureModuleTypes,
	InfrastructureTypes,
} from './types/di/infrastructure.type';
import {AmqpFactoryModule} from './amqp';
import { Connection } from 'amqplib';

export class ModulesContainer {
	private container!: interfaces.Container;
	public init = (amqpConnection: Connection): interfaces.Container => {
		this.container = new Container();
		this.container
			.bind(InfrastructureTypes.AmqpConnection)
			.toConstantValue(amqpConnection);
		this.container
			.bind(InfrastructureModuleTypes.AmqpFactoryModule)
			.to(AmqpFactoryModule);
		return this.container;
	};
}
