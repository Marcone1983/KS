import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, json } from "drizzle-orm/mysql-core";

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
  avatarUrl: text("avatarUrl"),
  bio: text("bio"),
  level: int("level").default(1).notNull(),
  xp: int("xp").default(0).notNull(),
  prestigeLevel: int("prestigeLevel").default(0).notNull(),
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
  wavesCompleted: int("wavesCompleted").default(0).notNull(),
  perfectWaves: int("perfectWaves").default(0).notNull(),
  longestStreak: int("longestStreak").default(0).notNull(),
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
  itemType: mysqlEnum("itemType", ["seed", "boost", "cosmetic", "tool", "decoration", "recipe"]).notNull(),
  quantity: int("quantity").default(1).notNull(),
  purchasedAt: timestamp("purchasedAt").defaultNow().notNull(),
});

export type OwnedItem = typeof ownedItems.$inferSelect;
export type InsertOwnedItem = typeof ownedItems.$inferInsert;

/**
 * Plants table - user's plant collection with genetics
 */
export const plants = mysqlTable("plants", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  species: varchar("species", { length: 64 }).notNull(),
  modelType: mysqlEnum("modelType", ["plant03", "plant04"]).default("plant03").notNull(),
  growthStage: mysqlEnum("growthStage", ["seed", "seedling", "vegetative", "flowering", "mature"]).default("seed").notNull(),
  health: int("health").default(100).notNull(),
  genetics: json("genetics").$type<PlantGenetics>(),
  parentA: int("parentA"),
  parentB: int("parentB"),
  generation: int("generation").default(1).notNull(),
  rarity: mysqlEnum("rarity", ["common", "uncommon", "rare", "epic", "legendary"]).default("common").notNull(),
  lastWatered: timestamp("lastWatered"),
  lastFed: timestamp("lastFed"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export interface PlantGenetics {
  resistance: number;
  growth: number;
  yield: number;
  potency: number;
  color: string;
  traits: string[];
}

export type Plant = typeof plants.$inferSelect;
export type InsertPlant = typeof plants.$inferInsert;

/**
 * Garden table - user's 3D garden configuration
 */
export const gardens = mysqlTable("gardens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  name: varchar("name", { length: 128 }).default("My Garden").notNull(),
  layout: json("layout").$type<GardenLayout>(),
  decorations: json("decorations").$type<GardenDecoration[]>(),
  lighting: json("lighting").$type<GardenLighting>(),
  isPublic: boolean("isPublic").default(false).notNull(),
  likes: int("likes").default(0).notNull(),
  visits: int("visits").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export interface GardenLayout {
  width: number;
  height: number;
  terrain: string;
  plantPositions: { plantId: number; x: number; y: number; z: number }[];
}

export interface GardenDecoration {
  id: string;
  type: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: number;
}

export interface GardenLighting {
  ambientIntensity: number;
  sunPosition: { x: number; y: number; z: number };
  timeOfDay: string;
}

export type Garden = typeof gardens.$inferSelect;
export type InsertGarden = typeof gardens.$inferInsert;

/**
 * Breeding records table
 */
export const breedingRecords = mysqlTable("breedingRecords", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  parentAId: int("parentAId").notNull(),
  parentBId: int("parentBId").notNull(),
  offspringId: int("offspringId"),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "failed"]).default("pending").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type BreedingRecord = typeof breedingRecords.$inferSelect;
export type InsertBreedingRecord = typeof breedingRecords.$inferInsert;

/**
 * Crafting recipes table
 */
export const craftingRecipes = mysqlTable("craftingRecipes", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["fertilizer", "pesticide", "tool", "decoration", "potion"]).notNull(),
  ingredients: json("ingredients").$type<CraftingIngredient[]>().notNull(),
  result: json("result").$type<CraftingResult>().notNull(),
  craftingTime: int("craftingTime").default(60).notNull(),
  requiredLevel: int("requiredLevel").default(1).notNull(),
  rarity: mysqlEnum("rarity", ["common", "uncommon", "rare", "epic", "legendary"]).default("common").notNull(),
});

export interface CraftingIngredient {
  itemId: string;
  quantity: number;
}

export interface CraftingResult {
  itemId: string;
  quantity: number;
}

export type CraftingRecipe = typeof craftingRecipes.$inferSelect;
export type InsertCraftingRecipe = typeof craftingRecipes.$inferInsert;

/**
 * User crafting queue
 */
export const craftingQueue = mysqlTable("craftingQueue", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  recipeId: int("recipeId").notNull(),
  status: mysqlEnum("status", ["queued", "crafting", "completed", "cancelled"]).default("queued").notNull(),
  startedAt: timestamp("startedAt"),
  completesAt: timestamp("completesAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CraftingQueueItem = typeof craftingQueue.$inferSelect;
export type InsertCraftingQueueItem = typeof craftingQueue.$inferInsert;

/**
 * Research tree table
 */
export const researchNodes = mysqlTable("researchNodes", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["genetics", "cultivation", "defense", "crafting", "efficiency"]).notNull(),
  tier: int("tier").default(1).notNull(),
  prerequisites: json("prerequisites").$type<number[]>(),
  benefits: json("benefits").$type<ResearchBenefit[]>(),
  cost: int("cost").default(100).notNull(),
  researchTime: int("researchTime").default(3600).notNull(),
});

export interface ResearchBenefit {
  type: string;
  value: number;
  description: string;
}

export type ResearchNode = typeof researchNodes.$inferSelect;
export type InsertResearchNode = typeof researchNodes.$inferInsert;

/**
 * User research progress
 */
export const userResearch = mysqlTable("userResearch", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  nodeId: int("nodeId").notNull(),
  status: mysqlEnum("status", ["locked", "available", "researching", "completed"]).default("locked").notNull(),
  progress: int("progress").default(0).notNull(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
});

export type UserResearchProgress = typeof userResearch.$inferSelect;
export type InsertUserResearchProgress = typeof userResearch.$inferInsert;

/**
 * Achievements table
 */
export const achievements = mysqlTable("achievements", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["combat", "breeding", "crafting", "social", "collection", "mastery"]).notNull(),
  iconUrl: text("iconUrl"),
  requirement: json("requirement").$type<AchievementRequirement>(),
  reward: json("reward").$type<AchievementReward>(),
  rarity: mysqlEnum("rarity", ["common", "uncommon", "rare", "epic", "legendary"]).default("common").notNull(),
  points: int("points").default(10).notNull(),
});

export interface AchievementRequirement {
  type: string;
  target: number;
  condition?: string;
}

export interface AchievementReward {
  xp: number;
  gleaf?: number;
  items?: { itemId: string; quantity: number }[];
}

export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = typeof achievements.$inferInsert;

/**
 * User achievements
 */
export const userAchievements = mysqlTable("userAchievements", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  achievementId: int("achievementId").notNull(),
  progress: int("progress").default(0).notNull(),
  unlockedAt: timestamp("unlockedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = typeof userAchievements.$inferInsert;

/**
 * Challenges table
 */
export const challenges = mysqlTable("challenges", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["daily", "weekly", "seasonal", "special"]).notNull(),
  requirement: json("requirement").$type<ChallengeRequirement>(),
  reward: json("reward").$type<ChallengeReward>(),
  startsAt: timestamp("startsAt").notNull(),
  endsAt: timestamp("endsAt").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
});

export interface ChallengeRequirement {
  type: string;
  target: number;
  conditions?: string[];
}

export interface ChallengeReward {
  xp: number;
  gleaf: number;
  items?: { itemId: string; quantity: number }[];
}

export type Challenge = typeof challenges.$inferSelect;
export type InsertChallenge = typeof challenges.$inferInsert;

/**
 * User challenge progress
 */
export const userChallenges = mysqlTable("userChallenges", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  challengeId: int("challengeId").notNull(),
  progress: int("progress").default(0).notNull(),
  completed: boolean("completed").default(false).notNull(),
  claimedReward: boolean("claimedReward").default(false).notNull(),
  completedAt: timestamp("completedAt"),
});

export type UserChallenge = typeof userChallenges.$inferSelect;
export type InsertUserChallenge = typeof userChallenges.$inferInsert;

/**
 * Leaderboard entries
 */
export const leaderboardEntries = mysqlTable("leaderboardEntries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  category: mysqlEnum("category", ["score", "pests_killed", "plants_bred", "crafts_made", "garden_likes"]).notNull(),
  score: int("score").default(0).notNull(),
  rank: int("rank"),
  period: mysqlEnum("period", ["daily", "weekly", "monthly", "all_time"]).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LeaderboardEntry = typeof leaderboardEntries.$inferSelect;
export type InsertLeaderboardEntry = typeof leaderboardEntries.$inferInsert;

/**
 * Garden visits/likes
 */
export const gardenInteractions = mysqlTable("gardenInteractions", {
  id: int("id").autoincrement().primaryKey(),
  visitorId: int("visitorId").notNull(),
  gardenId: int("gardenId").notNull(),
  type: mysqlEnum("type", ["visit", "like", "comment"]).notNull(),
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GardenInteraction = typeof gardenInteractions.$inferSelect;
export type InsertGardenInteraction = typeof gardenInteractions.$inferInsert;

/**
 * Trading marketplace listings
 */
export const marketListings = mysqlTable("marketListings", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(),
  itemId: varchar("itemId", { length: 64 }).notNull(),
  itemType: varchar("itemType", { length: 64 }).notNull(),
  quantity: int("quantity").default(1).notNull(),
  price: int("price").notNull(),
  status: mysqlEnum("status", ["active", "sold", "cancelled", "expired"]).default("active").notNull(),
  buyerId: int("buyerId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
  soldAt: timestamp("soldAt"),
});

export type MarketListing = typeof marketListings.$inferSelect;
export type InsertMarketListing = typeof marketListings.$inferInsert;

/**
 * Skills table
 */
export const skills = mysqlTable("skills", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  skillType: mysqlEnum("skillType", ["combat", "breeding", "crafting", "gardening", "research"]).notNull(),
  level: int("level").default(1).notNull(),
  xp: int("xp").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Skill = typeof skills.$inferSelect;
export type InsertSkill = typeof skills.$inferInsert;

/**
 * Lore entries
 */
export const loreEntries = mysqlTable("loreEntries", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 256 }).notNull(),
  content: text("content").notNull(),
  category: mysqlEnum("category", ["history", "creatures", "plants", "characters", "locations"]).notNull(),
  chapter: int("chapter").default(1).notNull(),
  unlockRequirement: json("unlockRequirement").$type<{ type: string; value: number }>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LoreEntry = typeof loreEntries.$inferSelect;
export type InsertLoreEntry = typeof loreEntries.$inferInsert;

/**
 * User unlocked lore
 */
export const userLore = mysqlTable("userLore", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  loreId: int("loreId").notNull(),
  unlockedAt: timestamp("unlockedAt").defaultNow().notNull(),
});

export type UserLore = typeof userLore.$inferSelect;
export type InsertUserLore = typeof userLore.$inferInsert;
