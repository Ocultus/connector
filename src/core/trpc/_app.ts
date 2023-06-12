import {AuthRouter} from '../routes/auth.router';
import {GatewayRouter} from '../routes/gateway.router';
import {ChatRouter} from '../routes/message.router';
import {RequestRouter} from '../routes/request.router';
import {router} from './router';

export const appRouter = router({
	gateway: GatewayRouter,
	auth: AuthRouter,
	chat: ChatRouter,
	request: RequestRouter,
});

export type AppRouter = typeof appRouter;
