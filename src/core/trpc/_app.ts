import { AuthRouter } from "../routes/auth.router";
import { GatewayRouter } from "../routes/gateway.router";
import { router } from "./router";

export const appRouter = router({
  auth: AuthRouter,
  gateway: GatewayRouter,
});

export type AppRouter = typeof appRouter;

