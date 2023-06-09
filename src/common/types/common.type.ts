import {GatewayCredentials} from '../../core/types/gateway.type';

export type Promisify<T> = T | Promise<T>;

export type GetawayExistAction = 'pause' | 'resume' | 'stop';

type GetawayCreateAction = {
	action: 'create';
} & GatewayCredentials;

export type GatewayActionMessage = {
	id: number;
} & (
	| {
			action: GetawayExistAction;
	  }
	| GetawayCreateAction
);
