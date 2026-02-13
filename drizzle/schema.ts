import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
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
 * Timelines table
 * Allows creating multiple separate timelines
 */
export const timelines = mysqlTable("timelines", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(), // Used in the URL
  description: text("description"),
  ownerId: int("ownerId"), // ID of the localAdmin who owns this timeline
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Timeline = typeof timelines.$inferSelect;
export type InsertTimeline = typeof timelines.$inferInsert;

/**
 * Gestões (Management Periods) table
 * Now linked to a specific timeline
 */
export const gestoes = mysqlTable("gestoes", {
  id: int("id").autoincrement().primaryKey(),
  timelineId: int("timelineId").notNull(), // Linked to timelines table
  period: varchar("period", { length: 50 }).notNull(),
  startActive: boolean("startActive").default(false).notNull(),
  displayOrder: int("displayOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Gestao = typeof gestoes.$inferSelect;
export type InsertGestao = typeof gestoes.$inferInsert;

/**
 * Members table
 */
export const members = mysqlTable("members", {
  id: int("id").autoincrement().primaryKey(),
  gestaoId: int("gestaoId").notNull(),
  name: text("name").notNull(),
  role: varchar("role", { length: 50 }), // presidente, vice_presidente, etc.
  photoUrl: text("photoUrl"), // URL for member image
  displayOrder: int("displayOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Member = typeof members.$inferSelect;
export type InsertMember = typeof members.$inferInsert;

/**
 * Local Admins table
 */
export const localAdmins = mysqlTable("localAdmins", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 320 }),
  passwordHash: text("passwordHash").notNull(),
  fullName: varchar("fullName", { length: 255 }),
  role: mysqlEnum("role", ["admin", "superadmin"]).default("admin").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  lastLogin: timestamp("lastLogin"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LocalAdmin = typeof localAdmins.$inferSelect;
export type InsertLocalAdmin = typeof localAdmins.$inferInsert;

/**
 * Permissions table
 * Designates which local admin can manage which timeline
 */
export const timelinePermissions = mysqlTable("timelinePermissions", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull(), // Linked to localAdmins
  timelineId: int("timelineId").notNull(), // Linked to timelines
  canEdit: boolean("canEdit").default(true).notNull(),
  canDelete: boolean("canDelete").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TimelinePermission = typeof timelinePermissions.$inferSelect;
export type InsertTimelinePermission = typeof timelinePermissions.$inferInsert;
