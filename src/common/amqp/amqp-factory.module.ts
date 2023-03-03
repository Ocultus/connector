import {inject, injectable} from 'inversify';
import 'reflect-metadata';
import {AmqpConsumerModule} from './amqp-consumer.module';
import {AmqpPublisherModule} from './amqp-publisher.module';
import {InfrastructureTypes} from '../types/di/infrastructure.type';
import { Connection } from 'amqplib';

@injectable()
export class AmqpFactoryModule {
	constructor(
		@inject(InfrastructureTypes.AmqpConnection)
		private readonly amqpConnection: Connection,
	) {}

	public makeConsumer = async (
		exchange: string,
		queueName: string,
		topic: string,
		prefetch: number = 1,
		withDeadLetter: boolean = false,
	) => {
		const consumer = new AmqpConsumerModule(
			this.amqpConnection,
			exchange,
			queueName,
			topic,
			prefetch,
			withDeadLetter,
		);
		await consumer.init();

		return consumer;
	};

	public makePublisher = async (exchange: string) => {
		const publisher = new AmqpPublisherModule(this.amqpConnection, exchange);
		await publisher.init();

		return publisher;
	};
}
