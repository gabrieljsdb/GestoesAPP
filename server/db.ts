import { eq, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, gestoes, members, InsertGestao, InsertMember, Gestao, Member } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
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
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

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

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ===== GESTÕES HELPERS =====

export async function getAllGestoes() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(gestoes).orderBy(asc(gestoes.displayOrder), asc(gestoes.period));
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
  
  // Delete all members first
  await db.delete(members).where(eq(members.gestaoId, id));
  // Then delete the gestao
  await db.delete(gestoes).where(eq(gestoes.id, id));
}

export async function clearAllStartActive() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(gestoes).set({ startActive: false });
}

// ===== MEMBERS HELPERS =====

export async function getMembersByGestaoId(gestaoId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(members).where(eq(members.gestaoId, gestaoId)).orderBy(asc(members.displayOrder));
}

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

// ===== COMBINED HELPERS =====

export async function getGestoesWithMembers() {
  const db = await getDb();
  if (!db) return [];
  
  const allGestoes = await getAllGestoes();
  
  const result = await Promise.all(
    allGestoes.map(async (gestao) => {
      const gestaoMembers = await getMembersByGestaoId(gestao.id);
      return {
        ...gestao,
        members: gestaoMembers,
      };
    })
  );
  
  return result;
}
