import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as authLocal from "../auth-local";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { getDb } from "../db";
import { localAdmins } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Helper: extract local admin ID from cookie
 */
const getLocalAdminId = (ctx: any): number | null => {
  const cookie = ctx.req.headers.cookie;
  if (!cookie) return null;
  try {
    const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
    if (!match) return null;
    const sessionData = JSON.parse(decodeURIComponent(match[1]));
    return sessionData.isLocalAdmin ? sessionData.adminId : null;
  } catch (e) {
    return null;
  }
};

/**
 * Helper: verify caller is a superadmin, throws FORBIDDEN otherwise
 */
const requireSuperAdmin = async (ctx: any) => {
  const adminId = getLocalAdminId(ctx);
  if (!adminId) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Não autenticado' });

  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const result = await db
    .select()
    .from(localAdmins)
    .where(eq(localAdmins.id, adminId))
    .limit(1);

  if (result.length === 0 || result[0].role !== 'superadmin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas superadmins podem realizar esta ação' });
  }

  return result[0];
};

export const localAuthRouter = router({
  // Check if any admins exist
  hasAdmins: publicProcedure.query(async () => {
    const hasAdmins = await authLocal.hasAnyAdmins();
    return { hasAdmins };
  }),

  // Create first admin (only if no admins exist) — always superadmin
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

      const adminId = await authLocal.createLocalAdminWithRole({
        ...input,
        role: 'superadmin',
      });
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

      // Set session cookie (now includes role)
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, JSON.stringify({
        adminId: admin.id,
        username: admin.username,
        fullName: admin.fullName,
        role: admin.role,
        isLocalAdmin: true,
      }), cookieOptions);

      return {
        success: true,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          fullName: admin.fullName,
          role: admin.role,
        },
      };
    }),

  // Get current local admin session (now returns role from DB)
  meLocal: publicProcedure.query(async ({ ctx }) => {
    const cookie = ctx.req.headers.cookie;
    if (!cookie) return null;

    try {
      const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
      if (!match) return null;

      const sessionData = JSON.parse(decodeURIComponent(match[1]));
      if (sessionData.isLocalAdmin) {
        // Fetch fresh role from database
        const db = await getDb();
        if (db) {
          const result = await db
            .select()
            .from(localAdmins)
            .where(eq(localAdmins.id, sessionData.adminId))
            .limit(1);

          if (result.length > 0) {
            return {
              ...sessionData,
              role: result[0].role,
              email: result[0].email,
            };
          }
        }
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

  // ===== SUPERADMIN: User Management Endpoints =====

  // List all admins (superadmin only)
  listAdmins: publicProcedure.query(async ({ ctx }) => {
    await requireSuperAdmin(ctx);

    const admins = await authLocal.getAllAdmins();
    // Strip passwordHash from response
    return admins.map(({ passwordHash, ...rest }) => rest);
  }),

  // Create a new admin (superadmin only)
  createAdmin: publicProcedure
    .input(z.object({
      username: z.string().min(3).max(100),
      password: z.string().min(6),
      email: z.string().email().optional(),
      fullName: z.string().optional(),
      role: z.enum(['admin', 'superadmin']),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireSuperAdmin(ctx);

      // Check if username already exists
      const existing = await authLocal.getAdminByUsername(input.username);
      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Já existe um administrador com este nome de usuário',
        });
      }

      const adminId = await authLocal.createLocalAdminWithRole(input);
      return { success: true, adminId };
    }),

  // Update an admin profile (superadmin only)
  updateAdmin: publicProcedure
    .input(z.object({
      id: z.number(),
      username: z.string().min(3).max(100).optional(),
      email: z.string().email().optional(),
      fullName: z.string().optional(),
      role: z.enum(['admin', 'superadmin']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireSuperAdmin(ctx);

      const { id, ...data } = input;

      // If changing username, check uniqueness
      if (data.username) {
        const existing = await authLocal.getAdminByUsername(data.username);
        if (existing && existing.id !== id) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Já existe um administrador com este nome de usuário',
          });
        }
      }

      await authLocal.updateAdminProfile(id, data);
      return { success: true };
    }),

  // Toggle active status (superadmin only)
  toggleActive: publicProcedure
    .input(z.object({
      id: z.number(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const caller = await requireSuperAdmin(ctx);

      // Cannot deactivate yourself
      if (caller.id === input.id && !input.isActive) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Você não pode desativar sua própria conta',
        });
      }

      if (input.isActive) {
        await authLocal.activateAdmin(input.id);
      } else {
        await authLocal.deactivateAdmin(input.id);
      }

      return { success: true };
    }),

  // Delete an admin (superadmin only)
  deleteAdmin: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const caller = await requireSuperAdmin(ctx);

      // Cannot delete yourself
      if (caller.id === input.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Você não pode deletar sua própria conta',
        });
      }

      await authLocal.deleteAdmin(input.id);
      return { success: true };
    }),
});
