import { eq, desc, asc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users, gestoes, members, timelines, timelinePermissions, localAdmins,
  InsertGestao, InsertMember, InsertTimeline, InsertTimelinePermission,
  Gestao, Member, Timeline, TimelinePermission
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) return;

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    textFields.forEach(field => {
      if (user[field] !== undefined) {
        const val = user[field] ?? null;
        values[field] = val;
        updateSet[field] = val;
      }
    });

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

// ===== TIMELINES HELPERS =====

export async function getAllTimelines() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(timelines).orderBy(desc(timelines.createdAt));
}

export async function getTimelinesWithAuthor() {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    id: timelines.id,
    name: timelines.name,
    slug: timelines.slug,
    description: timelines.description,
    ownerId: timelines.ownerId,
    createdAt: timelines.createdAt,
    updatedAt: timelines.updatedAt,
    authorName: localAdmins.fullName
  })
    .from(timelines)
    .leftJoin(localAdmins, eq(timelines.ownerId, localAdmins.id))
    .orderBy(desc(timelines.createdAt));
}

export async function getTimelinesByOwnerWithAuthor(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    id: timelines.id,
    name: timelines.name,
    slug: timelines.slug,
    description: timelines.description,
    ownerId: timelines.ownerId,
    createdAt: timelines.createdAt,
    updatedAt: timelines.updatedAt,
    authorName: localAdmins.fullName
  })
    .from(timelines)
    .leftJoin(localAdmins, eq(timelines.ownerId, localAdmins.id))
    .where(eq(timelines.ownerId, ownerId))
    .orderBy(desc(timelines.createdAt));
}

export async function getTimelineBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(timelines).where(eq(timelines.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getTimelinesByOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(timelines).where(eq(timelines.ownerId, ownerId)).orderBy(desc(timelines.createdAt));
}

export async function createTimeline(data: InsertTimeline) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(timelines).values(data);
  return Number(result[0].insertId);
}

export async function updateTimeline(id: number, data: Partial<InsertTimeline>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(timelines).set(data).where(eq(timelines.id, id));
}

export async function deleteTimeline(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete associated gestoes and members would normally be handled by FK cascade or manually
  const timelineGestoes = await db.select().from(gestoes).where(eq(gestoes.timelineId, id));
  for (const g of timelineGestoes) {
    await deleteGestao(g.id);
  }
  await db.delete(timelines).where(eq(timelines.id, id));
}

// ===== GESTÕES HELPERS =====

export async function getGestoesByTimelineId(timelineId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(gestoes).where(eq(gestoes.timelineId, timelineId)).orderBy(asc(gestoes.displayOrder), asc(gestoes.period));
}

export async function getGestaoById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(gestoes).where(eq(gestoes.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createGestao(data: InsertGestao) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(gestoes).values(data);
  return Number(result[0].insertId);
}

export async function updateGestao(id: number, data: Partial<InsertGestao>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(gestoes).set(data).where(eq(gestoes.id, id));
}

export async function deleteGestao(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(members).where(eq(members.gestaoId, id));
  await db.delete(gestoes).where(eq(gestoes.id, id));
}

export async function clearAllStartActive(timelineId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(gestoes).set({ startActive: false }).where(eq(gestoes.timelineId, timelineId));
}

// ===== MEMBERS HELPERS =====

export async function getMembersByGestaoId(gestaoId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(members).where(eq(members.gestaoId, gestaoId)).orderBy(asc(members.displayOrder));
}

// Note: InsertMember type is inferred from schema, which now has 'role'.

export async function createMember(data: InsertMember) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(members).values(data);
  return Number(result[0].insertId);
}

export async function updateMember(id: number, data: Partial<InsertMember>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(members).set(data).where(eq(members.id, id));
}

export async function deleteMember(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(members).where(eq(members.id, id));
}

// ===== PERMISSIONS HELPERS =====

export async function getPermissionsByAdminId(adminId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(timelinePermissions).where(eq(timelinePermissions.adminId, adminId));
}

export async function checkPermission(adminId: number, timelineId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(timelinePermissions).where(
    and(
      eq(timelinePermissions.adminId, adminId),
      eq(timelinePermissions.timelineId, timelineId)
    )
  ).limit(1);
  return result.length > 0;
}

export async function grantPermission(data: InsertTimelinePermission) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(timelinePermissions).values(data);
}

export async function revokePermission(adminId: number, timelineId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(timelinePermissions).where(
    and(
      eq(timelinePermissions.adminId, adminId),
      eq(timelinePermissions.timelineId, timelineId)
    )
  );
}

export async function getLocalAdminById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(localAdmins).where(eq(localAdmins.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ===== COMBINED HELPERS =====

export async function getTimelineWithGestoesAndMembers(slug: string) {
  const timeline = await getTimelineBySlug(slug);
  if (!timeline) return undefined;

  const allGestoes = await getGestoesByTimelineId(timeline.id);
  const gestoesWithMembers = await Promise.all(
    allGestoes.map(async (gestao) => {
      const gestaoMembers = await getMembersByGestaoId(gestao.id);
      return { ...gestao, members: gestaoMembers };
    })
  );

  return { ...timeline, gestoes: gestoesWithMembers };
}
