import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";

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
  isPremium: boolean("isPremium").default(false).notNull(),
  premiumSince: timestamp("premiumSince"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * PayPal payments table for tracking premium purchases
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  paypalOrderId: varchar("paypalOrderId", { length: 64 }).notNull().unique(),
  paypalPayerId: varchar("paypalPayerId", { length: 64 }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  status: mysqlEnum("status", ["pending", "completed", "failed", "refunded"]).default("pending").notNull(),
  productType: varchar("productType", { length: 64 }).default("premium").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * Game progress table for tracking user game state
 */
export const gameProgress = mysqlTable("gameProgress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  currentLevel: int("currentLevel").default(1).notNull(),
  highScore: int("highScore").default(0).notNull(),
  totalScore: int("totalScore").default(0).notNull(),
  gleafBalance: int("gleafBalance").default(100).notNull(),
  gamesPlayed: int("gamesPlayed").default(0).notNull(),
  pestsKilled: int("pestsKilled").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GameProgress = typeof gameProgress.$inferSelect;
export type InsertGameProgress = typeof gameProgress.$inferInsert;

/**
 * Owned items table for tracking user purchases
 */
export const ownedItems = mysqlTable("ownedItems", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  itemId: varchar("itemId", { length: 64 }).notNull(),
  itemType: mysqlEnum("itemType", ["seed", "boost", "cosmetic"]).notNull(),
  purchasedAt: timestamp("purchasedAt").defaultNow().notNull(),
});

export type OwnedItem = typeof ownedItems.$inferSelect;
export type InsertOwnedItem = typeof ownedItems.$inferInsert;
