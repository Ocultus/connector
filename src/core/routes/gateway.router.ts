import {sql} from '../types/db.type';
import {CredentialType, GatewayEntityRow} from '../types/gateway.type';
import {protectedProcedure} from '../trpc/middleware';
import { t } from '../trpc/router';

export const GatewayRouter = t.router({
	findByType: protectedProcedure
		.input(CredentialType)
		.mutation(async ({ctx, input}) => {
			const {type} = input;
			const gatewaysRaw = await ctx.db.many(
				sql.type(GatewayEntityRow)`
    		SELECT * FROM gateway 
				WHERE type = ${type};
    	`,
			);

			return gatewaysRaw.map(gateway => {
				return GatewayEntityRow.parse(gateway);
			});
		}),
});
