import { router } from "./_app";
import { ObjectRouter } from "../file-object.router";

export const appRouter = router({
  object: ObjectRouter,
});

export type AppRouter = typeof appRouter;