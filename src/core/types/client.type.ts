import {z} from 'zod';
import {BaseEntityRow} from './base.type';
import {SocialNetworkRow} from '../../common/types/payload';

export const ClientEntityRow = BaseEntityRow.merge(
	z.object({
		external_id: z.number(),
		name: z.string(),
		socialNetwork: SocialNetworkRow,
	}),
);

export type ClientEntity = z.output<typeof ClientEntityRow>;
