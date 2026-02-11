import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Gestões (Management Periods) table
 * Stores information about each management period of the organization
 */
export const gestoes = mysqlTable("gestoes", {
  id: int("id").autoincrement().primaryKey(),
  period: varchar("period", { length: 50 }).notNull(), // e.g., "2016/2018"
  startActive: boolean("startActive").default(false).notNull(), // Marks which period should be shown first
  displayOrder: int("displayOrder").notNull().default(0), // For custom ordering
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Gestao = typeof gestoes.$inferSelect;
export type InsertGestao = typeof gestoes.$inferInsert;

/**
 * Members table
 * Stores individual members (directors, council members) for each gestão
 */
export const members = mysqlTable("members", {
  id: int("id").autoincrement().primaryKey(),
  gestaoId: int("gestaoId").notNull(), // Foreign key to gestoes table
  name: text("name").notNull(), // Full member entry, e.g., "Presidente: Dr. João Silva"
  displayOrder: int("displayOrder").notNull().default(0), // Order within the gestão
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Member = typeof members.$inferSelect;
export type InsertMember = typeof members.$inferInsert;

/**
 * Local Admins table
 * Stores local administrator credentials for the panel
 */
export const localAdmins = mysqlTable("localAdmins", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 320 }),
  passwordHash: text("passwordHash").notNull(),
  fullName: varchar("fullName", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  lastLogin: timestamp("lastLogin"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LocalAdmin = typeof localAdmins.$inferSelect;
export type InsertLocalAdmin = typeof localAdmins.$inferInsert;
