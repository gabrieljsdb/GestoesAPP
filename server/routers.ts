import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import * as authLocal from "./auth-local";
import { localAdmins } from "../drizzle/schema";
import { localAuthRouter } from "./routers/localAuth";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  gestoes: router({
    // Public route - get all gestoes with members for timeline display
    list: publicProcedure.query(async () => {
      return await db.getGestoesWithMembers();
    }),

    // Public route - export as JSON
    export: publicProcedure.query(async () => {
      const gestoes = await db.getGestoesWithMembers();
      return {
        gestoes: gestoes.map(g => ({
          period: g.period,
          members: g.members.map(m => m.name),
          ...(g.startActive ? { startActive: true } : {}),
        })),
      };
    }),

    // Admin routes
    create: adminProcedure
      .input(z.object({
        period: z.string().min(1),
        startActive: z.boolean().optional(),
        displayOrder: z.number().optional(),
        members: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        // If startActive is true, clear all other startActive flags
        if (input.startActive) {
          await db.clearAllStartActive();
        }

        const gestaoId = await db.createGestao({
          period: input.period,
          startActive: input.startActive ?? false,
          displayOrder: input.displayOrder ?? 0,
        });

        // Add members if provided
        if (input.members && input.members.length > 0) {
          for (let i = 0; i < input.members.length; i++) {
            await db.createMember({
              gestaoId: Number(gestaoId),
              name: input.members[i],
              displayOrder: i,
            });
          }
        }

        return { id: gestaoId };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        period: z.string().min(1).optional(),
        startActive: z.boolean().optional(),
        displayOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;

        // If startActive is true, clear all other startActive flags
        if (data.startActive) {
          await db.clearAllStartActive();
        }

        await db.updateGestao(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteGestao(input.id);
        return { success: true };
      }),
  }),

  members: router({
    // Get members for a specific gestao
    list: publicProcedure
      .input(z.object({ gestaoId: z.number() }))
      .query(async ({ input }) => {
        return await db.getMembersByGestaoId(input.gestaoId);
      }),

    // Admin routes
    create: adminProcedure
      .input(z.object({
        gestaoId: z.number(),
        name: z.string().min(1),
        displayOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const memberId = await db.createMember({
          gestaoId: input.gestaoId,
          name: input.name,
          displayOrder: input.displayOrder ?? 0,
        });
        return { id: memberId };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        displayOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateMember(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteMember(input.id);
        return { success: true };
      }),

    // Bulk update for reordering
    reorder: adminProcedure
      .input(z.object({
        updates: z.array(z.object({
          id: z.number(),
          displayOrder: z.number(),
        })),
      }))
      .mutation(async ({ input }) => {
        for (const update of input.updates) {
          await db.updateMember(update.id, { displayOrder: update.displayOrder });
        }
        return { success: true };
      }),
   }),

  localAuth: localAuthRouter,
});
export type AppRouter = typeof appRouter;
