import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG, COOKIE_NAME } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Middleware to check if the request is from a local admin
 */
const isLocalAdmin = (ctx: TrpcContext) => {
  const cookie = ctx.req.headers.cookie;
  if (!cookie) return false;

  try {
    const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
    if (!match) return false;

    const sessionData = JSON.parse(decodeURIComponent(match[1]));
    return sessionData.isLocalAdmin === true;
  } catch (e) {
    return false;
  }
};

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  // Allow if it's a Manus user OR a local admin
  if (!ctx.user && !isLocalAdmin(ctx)) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      isLocalAdmin: isLocalAdmin(ctx),
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    // Allow if it's a Manus admin OR a local admin
    const isManusAdmin = ctx.user && ctx.user.role === 'admin';
    const localAdmin = isLocalAdmin(ctx);

    if (!isManusAdmin && !localAdmin) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        isLocalAdmin: localAdmin,
      },
    });
  }),
);
