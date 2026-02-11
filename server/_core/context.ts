import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { COOKIE_NAME } from "@shared/const";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Check if this is a local admin session first
    const cookie = opts.req.headers.cookie;
    if (cookie) {
      const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
      if (match) {
        try {
          const sessionData = JSON.parse(decodeURIComponent(match[1]));
          // If it's a local admin session, skip OAuth authentication
          if (sessionData.isLocalAdmin) {
            // Local admin sessions don't populate the user field
            // They are handled separately in localAuth router
            return {
              req: opts.req,
              res: opts.res,
              user: null,
            };
          }
        } catch (e) {
          // Not a JSON session, continue with OAuth flow
        }
      }
    }

    // Regular OAuth authentication flow
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
