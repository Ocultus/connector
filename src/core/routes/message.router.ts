import {protectedProcedure} from '../trpc/middleware';
import {t} from '../trpc/router';

export const ChatRouter = t.router({
	//sendMessage: protectedProcedure.input().mutation(async ({ctx, input}) => {})
});
