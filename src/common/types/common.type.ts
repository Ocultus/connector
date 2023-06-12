import {GatewayCredentials} from '../../core/types/gateway.type';

export type Promisify<T> = T | Promise<T>;

type GatewayCreateAction = {
	action: 'create';
} & GatewayCredentials;

export type GatewayActionMessage = {
	id: number;
} & (
	| {
			action: 'stop';
	  }
	| GatewayCreateAction
);
