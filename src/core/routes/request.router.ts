import { protectedProcedure } from '../trpc/middleware';
import { t } from '../trpc/router';


export const RequestRouter = t.router({
  //getAll: protectedProcedure.query(),
  //editStatusById: protectedProcedure.input().mutation(async ({ctx, input}) => {}),
})