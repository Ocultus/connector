export type Promisify<T> = T | Promise<T>;

export type GetawayExistAction = 'pause' | 'resume' | 'stop';

type GetawayCreateAction = {
	action: 'create';
	credentials: {
		token: string;
		group: number;
	};
};

export type GatewayActionMessage = {
	id: number;
} & (
	| {
			action: GetawayExistAction;
	  }
	| GetawayCreateAction
);
