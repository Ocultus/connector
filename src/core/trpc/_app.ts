import {AuthRouter} from '../routes/auth.router';
import {GatewayRouter} from '../routes/gateway.router';
import {router} from './router';

export const appRouter = router({
	getaway: GatewayRouter,
	auth: AuthRouter,
});

export type AppRouter = typeof appRouter;
