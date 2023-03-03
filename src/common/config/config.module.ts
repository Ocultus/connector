import * as dotenv from 'dotenv';
dotenv.config();

export type DatabaseConfig = {
	user: string;
	password: string;
	host: string;
	port: number;
	database: string;
};

export type RabbitMqConfig = {
	username: string;
	password: string;
	hostname: string;
	vhost: string;
};

export type CloudStorageConfig = {
	port: number;
	key: string;
	keyId: string;
	bucket: string;
	region: string;
	endpoint: string;
};

export type EndpointsConfig = {
	cloudStorageUrl: string;
}

export type ConfigGetter<T> = () => T;

export const getValueFromProcessEnv = (key: string) => {
	const env = process.env[key];
	if (!env) {
		throw new Error(`env ${key} must be not empty string`);
	}

	return env;
};

export const getDatabaseConfig: ConfigGetter<DatabaseConfig> = () => ({
	database: getValueFromProcessEnv('PG_DB'),
	user: getValueFromProcessEnv('PG_USER'),
	password: getValueFromProcessEnv('PG_PASS'),
	host: getValueFromProcessEnv('PG_HOST'),
	port: Number.parseInt(getValueFromProcessEnv('PG_PORT')),
});

export const getRabbitMQConfig: ConfigGetter<RabbitMqConfig> = () => ({
	username: getValueFromProcessEnv('AMQP_USERNAME'),
	password: getValueFromProcessEnv('AMQP_PASS'),
	hostname: getValueFromProcessEnv('AMQP_HOSTNAME'),
	vhost: '/',
});

export const getCloudStorageConfig: ConfigGetter<CloudStorageConfig> = () => ({
	port: Number.parseInt(getValueFromProcessEnv('CLOUD_STORAGE_PORT')),
	key: getValueFromProcessEnv('CLOUD_STORAGE_KEY'),
	keyId: getValueFromProcessEnv('CLOUD_STORAGE_KEY_ID'),
	bucket: getValueFromProcessEnv('CLOUD_STORAGE_BUCKET'),
	region: getValueFromProcessEnv('CLOUD_STORAGE_REGION'),
	endpoint: getValueFromProcessEnv('CLOUD_STORAGE_ENDPOINT_URL'),
});

export const getEndpointsConfig: ConfigGetter<EndpointsConfig> = () => ({
	cloudStorageUrl: getValueFromProcessEnv('ENDPOINTS_CLOUD_STORAGE_URL'),
})

class ConfigModule {
	private database?: DatabaseConfig;
	private amqp?: RabbitMqConfig;
	private cloudStorage?: CloudStorageConfig;
	private endpoints?: EndpointsConfig;

	public getDatabaseConfig = () => {
		if (!this.database) {
			this.database = getDatabaseConfig();
		}

		return this.database;
	};

	public getAmqpConfig = () => {
		if (!this.amqp) {
			this.amqp = getRabbitMQConfig();
		}

		return this.amqp;
	};

	public getCloudStorageConfig = () => {
		if (!this.cloudStorage) {
			this.cloudStorage = getCloudStorageConfig();
		}

		return this.cloudStorage;
	};

	public getEndpointsConfig = () => {
		if (!this.endpoints) {
			this.endpoints = getEndpointsConfig();
		}

		return this.endpoints;
	}
}

export const configModule = new ConfigModule();
