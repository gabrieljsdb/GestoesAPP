import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { localAuthRouter } from "./routers/localAuth";

const getLocalAdminId = (ctx: any) => {
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

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  timelines: router({
    list: adminProcedure.query(async ({ ctx }) => {
      const adminId = getLocalAdminId(ctx);
      if (!adminId) return [];


      // If super-admin (role 'admin' in users table, distinct from localAdmin), they might see all
      // But based on localAdmins table, we should filter by ownerId
      // Assuming 'ctx.user?.role' refers to the global user role. 
      // If we want strict isolation for local admins:
      return await db.getTimelinesByOwner(adminId);
    }),

    get: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const data = await db.getTimelineWithGestoesAndMembers(input.slug);
        if (!data) throw new TRPCError({ code: 'NOT_FOUND', message: 'Timeline not found' });
        return data;
      }),

    export: adminProcedure
      .input(z.object({ timelineId: z.number() }))
      .query(async ({ input, ctx }) => {
        const adminId = getLocalAdminId(ctx);
        // Owner check or permission check
        const timeline = await db.getTimelineWithGestoesAndMembers(input.timelineId.toString()); // verifying existence/ownership? 
        // For now, relying on checkPermission for legacy or direct ownership check
        // We should strictly check ownership if we want to enforce it.
        // But for backward compatibility with permissions:
        if (ctx.user?.role !== 'admin' && !(await db.checkPermission(adminId, input.timelineId))) {
          // Also check if owner
          const t = (await db.getAllTimelines()).find(t => t.id === input.timelineId);
          if (t?.ownerId !== adminId) {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
        }
        const gestoes = await db.getGestoesByTimelineId(input.timelineId);
        const data = await Promise.all(gestoes.map(async g => ({
          ...g,
          members: await db.getMembersByGestaoId(g.id)
        })));
        return { gestoes: data };
      }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const adminId = getLocalAdminId(ctx);
        if (!adminId) throw new TRPCError({ code: 'UNAUTHORIZED' });

        const id = await db.createTimeline({ ...input, ownerId: adminId });

        // Grant permissions as a fallback/redundancy
        await db.grantPermission({ adminId, timelineId: id, canEdit: true, canDelete: true });

        return { id };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        slug: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const adminId = getLocalAdminId(ctx);
        if (ctx.user?.role !== 'admin' && !(await db.checkPermission(adminId, input.id))) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        await db.updateTimeline(input.id, input);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const adminId = getLocalAdminId(ctx);
        if (ctx.user?.role !== 'admin' && !(await db.checkPermission(adminId, input.id))) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        await db.deleteTimeline(input.id);
        return { success: true };
      }),
  }),

  gestoes: router({
    list: publicProcedure
      .input(z.object({ timelineId: z.number() }))
      .query(async ({ input }) => {
        const allGestoes = await db.getGestoesByTimelineId(input.timelineId);
        return await Promise.all(allGestoes.map(async g => ({
          ...g,
          members: await db.getMembersByGestaoId(g.id)
        })));
      }),

    create: adminProcedure
      .input(z.object({
        timelineId: z.number(),
        period: z.string().min(1),
        startActive: z.boolean().optional(),
        displayOrder: z.number().optional(),
        members: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const adminId = getLocalAdminId(ctx);
        if (ctx.user?.role !== 'admin' && !(await db.checkPermission(adminId, input.timelineId))) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        if (input.startActive) await db.clearAllStartActive(input.timelineId);
        const gestaoId = await db.createGestao({
          timelineId: input.timelineId,
          period: input.period,
          startActive: input.startActive ?? false,
          displayOrder: input.displayOrder ?? 0,
        });
        if (input.members) {
          for (let i = 0; i < input.members.length; i++) {
            await db.createMember({ gestaoId, name: input.members[i], displayOrder: i });
          }
        }
        return { id: gestaoId };
      }),

    reorder: adminProcedure
      .input(z.object({
        timelineId: z.number(),
        items: z.array(z.object({ id: z.number(), displayOrder: z.number() }))
      }))
      .mutation(async ({ input, ctx }) => {
        const adminId = getLocalAdminId(ctx);
        if (ctx.user?.role !== 'admin' && !(await db.checkPermission(adminId, input.timelineId))) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        await Promise.all(input.items.map(item => db.updateGestao(item.id, { displayOrder: item.displayOrder })));
        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        period: z.string().optional(),
        startActive: z.boolean().optional(),
        displayOrder: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const gestao = await db.getGestaoById(input.id);
        if (!gestao) throw new TRPCError({ code: 'NOT_FOUND' });
        const adminId = getLocalAdminId(ctx);
        if (ctx.user?.role !== 'admin' && !(await db.checkPermission(adminId, gestao.timelineId))) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        if (input.startActive) await db.clearAllStartActive(gestao.timelineId);
        await db.updateGestao(input.id, input);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const gestao = await db.getGestaoById(input.id);
        if (!gestao) throw new TRPCError({ code: 'NOT_FOUND' });
        const adminId = getLocalAdminId(ctx);
        if (ctx.user?.role !== 'admin' && !(await db.checkPermission(adminId, gestao.timelineId))) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        await db.deleteGestao(input.id);
        return { success: true };
      }),
  }),

  members: router({
    create: adminProcedure
      .input(z.object({ gestaoId: z.number(), name: z.string().min(1), displayOrder: z.number().optional() }))
      .mutation(async ({ input }) => {
        const id = await db.createMember(input);
        return { id };
      }),
    update: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), displayOrder: z.number().optional() }))
      .mutation(async ({ input }) => {
        await db.updateMember(input.id, input);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteMember(input.id);
        return { success: true };
      }),
  }),

  permissions: router({
    grant: adminProcedure
      .input(z.object({ adminId: z.number(), timelineId: z.number(), canEdit: z.boolean().optional(), canDelete: z.boolean().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        await db.grantPermission(input);
        return { success: true };
      }),
    revoke: adminProcedure
      .input(z.object({ adminId: z.number(), timelineId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        await db.revokePermission(input.adminId, input.timelineId);
        return { success: true };
      }),
  }),

  localAuth: localAuthRouter,
});

export type AppRouter = typeof appRouter;
