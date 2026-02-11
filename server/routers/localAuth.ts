import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as authLocal from "../auth-local";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { getDb } from "../db";
import { localAdmins } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const localAuthRouter = router({
  // Check if any admins exist
  hasAdmins: publicProcedure.query(async () => {
    const hasAdmins = await authLocal.hasAnyAdmins();
    return { hasAdmins };
  }),

  // Create first admin (only if no admins exist)
  createFirstAdmin: publicProcedure
    .input(z.object({
      username: z.string().min(3).max(100),
      password: z.string().min(6),
      email: z.string().email().optional(),
      fullName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const hasAdmins = await authLocal.hasAnyAdmins();
      if (hasAdmins) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Admins already exist. Use login instead.',
        });
      }

      const adminId = await authLocal.createLocalAdmin(input);
      return { success: true, adminId };
    }),

  // Login with username and password
  login: publicProcedure
    .input(z.object({
      username: z.string(),
      password: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const admin = await authLocal.verifyAdminCredentials(input.username, input.password);

      if (!admin) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid username or password',
        });
      }

      // Update last login
      await authLocal.updateAdminLastLogin(admin.id);

      // Set session cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, JSON.stringify({
        adminId: admin.id,
        username: admin.username,
        fullName: admin.fullName,
        isLocalAdmin: true,
      }), cookieOptions);

      return {
        success: true,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          fullName: admin.fullName,
        },
      };
    }),

  // Get current local admin session
  meLocal: publicProcedure.query(async ({ ctx }) => {
    const cookie = ctx.req.headers.cookie;
    if (!cookie) return null;

    try {
      const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
      if (!match) return null;

      const sessionData = JSON.parse(decodeURIComponent(match[1]));
      if (sessionData.isLocalAdmin) {
        return sessionData;
      }
    } catch (e) {
      // Invalid cookie
    }
    return null;
  }),

  // Logout local admin
  logoutLocal: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true };
  }),

  // Change password
  changePassword: publicProcedure
    .input(z.object({
      adminId: z.number(),
      oldPassword: z.string(),
      newPassword: z.string().min(6),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const admin = await db
        .select()
        .from(localAdmins)
        .where(eq(localAdmins.id, input.adminId))
        .limit(1);

      if (admin.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Admin not found',
        });
      }

      const isValid = await authLocal.verifyPassword(input.oldPassword, admin[0].passwordHash);
      if (!isValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid current password',
        });
      }

      await authLocal.changeAdminPassword(input.adminId, input.newPassword);
      return { success: true };
    }),
});
