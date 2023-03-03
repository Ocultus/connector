import {BaseEntity, BaseEntityRow} from './base.entity';

export type VkGatewayCredentials = {
	group: number;
	token: string;
};

export type TGGatewayCredentials = {
	token: string;
};

export type GatewayType = 'vk' | 'tg';

type VkCredentials = {
	type: 'vk';
	credentials: VkGatewayCredentials;
};

type TgCredentials = {
	type: 'tg';
	credentials: TGGatewayCredentials;
};

export type GatewayCredentials = VkCredentials | TgCredentials;

export type GatewayEntityRow = BaseEntityRow & {
	project_id: number;
	type: GatewayType;
	credentials: string;
	enabled: boolean;
};

export type GatewayEntity = BaseEntity &
	GatewayCredentials & {
		enabled: boolean;
		projectId: number;
	};
