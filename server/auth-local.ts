import { eq } from "drizzle-orm";
import { localAdmins } from "../drizzle/schema";
import { getDb } from "./db";
import bcryptjs from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Hash a password using bcryptjs
 */
export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, SALT_ROUNDS);
}

/**
 * Compare a password with its hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

/**
 * Create a new local admin
 */
export async function createLocalAdmin(data: {
  username: string;
  email?: string;
  password: string;
  fullName?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const passwordHash = await hashPassword(data.password);

  const result = await db.insert(localAdmins).values({
    username: data.username,
    email: data.email,
    passwordHash,
    fullName: data.fullName,
    isActive: true,
  });

  return Number(result[0].insertId);
}

/**
 * Find admin by username
 */
export async function getAdminByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(localAdmins)
    .where(eq(localAdmins.username, username))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Verify admin credentials
 */
export async function verifyAdminCredentials(username: string, password: string) {
  const admin = await getAdminByUsername(username);

  if (!admin || !admin.isActive) {
    return null;
  }

  const isValid = await verifyPassword(password, admin.passwordHash);

  if (!isValid) {
    return null;
  }

  return admin;
}

/**
 * Update admin last login
 */
export async function updateAdminLastLogin(adminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(localAdmins)
    .set({ lastLogin: new Date() })
    .where(eq(localAdmins.id, adminId));
}

/**
 * Change admin password
 */
export async function changeAdminPassword(adminId: number, newPassword: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const passwordHash = await hashPassword(newPassword);

  await db
    .update(localAdmins)
    .set({ passwordHash })
    .where(eq(localAdmins.id, adminId));
}

/**
 * Get all admins
 */
export async function getAllAdmins() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(localAdmins);
}

/**
 * Deactivate admin
 */
export async function deactivateAdmin(adminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(localAdmins)
    .set({ isActive: false })
    .where(eq(localAdmins.id, adminId));
}

/**
 * Activate admin
 */
export async function activateAdmin(adminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(localAdmins)
    .set({ isActive: true })
    .where(eq(localAdmins.id, adminId));
}

/**
 * Delete admin
 */
export async function deleteAdmin(adminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(localAdmins).where(eq(localAdmins.id, adminId));
}

/**
 * Check if any admins exist
 */
export async function hasAnyAdmins(): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db.select({ id: localAdmins.id }).from(localAdmins).limit(1);
  return result.length > 0;
}
