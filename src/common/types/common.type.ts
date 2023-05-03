export type Promisify<T> = T | Promise<T>;

export type GetawayAction = 'pause' | 'resume' | 'stop';

export type GatewayActionMessage = {
	id: number;
	action: GetawayAction;
};