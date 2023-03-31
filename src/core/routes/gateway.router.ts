import {initTRPC} from '@trpc/server';
import {sql} from '../types/db.type';
import {CredentialType, GatewayEntityRow} from '../types/gateway.type';
import {Context} from '../trpc/context';
import {protectedProcedure} from '../trpc/middleware';

export const t = initTRPC.context<Context>().create();

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
