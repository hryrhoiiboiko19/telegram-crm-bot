import type { Middleware } from "grammy";
import { isAdmin } from "../helpers/index.js";
import { BotContext } from "../types/index.js";

/**
 * Middleware that restricts access to admin-only callback queries.
 * If the user is not an admin, the request is rejected via `isAdmin`
 * (which already replies with `admin_access_denied`) and the chain stops.
 */
export const adminGuardMiddleware: Middleware<BotContext> = async (ctx, next) => {
  if (!(await isAdmin(ctx))) return;
  return next();
};