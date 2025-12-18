CREATE TABLE `achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`category` enum('combat','breeding','crafting','social','collection','mastery') NOT NULL,
	`iconUrl` text,
	`requirement` json,
	`reward` json,
	`rarity` enum('common','uncommon','rare','epic','legendary') NOT NULL DEFAULT 'common',
	`points` int NOT NULL DEFAULT 10,
	CONSTRAINT `achievements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `breedingRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`parentAId` int NOT NULL,
	`parentBId` int NOT NULL,
	`offspringId` int,
	`status` enum('pending','in_progress','completed','failed') NOT NULL DEFAULT 'pending',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `breedingRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`type` enum('daily','weekly','seasonal','special') NOT NULL,
	`requirement` json,
	`reward` json,
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	CONSTRAINT `challenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `craftingQueue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`recipeId` int NOT NULL,
	`status` enum('queued','crafting','completed','cancelled') NOT NULL DEFAULT 'queued',
	`startedAt` timestamp,
	`completesAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `craftingQueue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `craftingRecipes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`category` enum('fertilizer','pesticide','tool','decoration','potion') NOT NULL,
	`ingredients` json NOT NULL,
	`result` json NOT NULL,
	`craftingTime` int NOT NULL DEFAULT 60,
	`requiredLevel` int NOT NULL DEFAULT 1,
	`rarity` enum('common','uncommon','rare','epic','legendary') NOT NULL DEFAULT 'common',
	CONSTRAINT `craftingRecipes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gardenInteractions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`visitorId` int NOT NULL,
	`gardenId` int NOT NULL,
	`type` enum('visit','like','comment') NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gardenInteractions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gardens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(128) NOT NULL DEFAULT 'My Garden',
	`layout` json,
	`decorations` json,
	`lighting` json,
	`isPublic` boolean NOT NULL DEFAULT false,
	`likes` int NOT NULL DEFAULT 0,
	`visits` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gardens_id` PRIMARY KEY(`id`),
	CONSTRAINT `gardens_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `leaderboardEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`category` enum('score','pests_killed','plants_bred','crafts_made','garden_likes') NOT NULL,
	`score` int NOT NULL DEFAULT 0,
	`rank` int,
	`period` enum('daily','weekly','monthly','all_time') NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leaderboardEntries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loreEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(256) NOT NULL,
	`content` text NOT NULL,
	`category` enum('history','creatures','plants','characters','locations') NOT NULL,
	`chapter` int NOT NULL DEFAULT 1,
	`unlockRequirement` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loreEntries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketListings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sellerId` int NOT NULL,
	`itemId` varchar(64) NOT NULL,
	`itemType` varchar(64) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`price` int NOT NULL,
	`status` enum('active','sold','cancelled','expired') NOT NULL DEFAULT 'active',
	`buyerId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	`soldAt` timestamp,
	CONSTRAINT `marketListings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`species` varchar(64) NOT NULL,
	`modelType` enum('plant03','plant04') NOT NULL DEFAULT 'plant03',
	`growthStage` enum('seed','seedling','vegetative','flowering','mature') NOT NULL DEFAULT 'seed',
	`health` int NOT NULL DEFAULT 100,
	`genetics` json,
	`parentA` int,
	`parentB` int,
	`generation` int NOT NULL DEFAULT 1,
	`rarity` enum('common','uncommon','rare','epic','legendary') NOT NULL DEFAULT 'common',
	`lastWatered` timestamp,
	`lastFed` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `researchNodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`category` enum('genetics','cultivation','defense','crafting','efficiency') NOT NULL,
	`tier` int NOT NULL DEFAULT 1,
	`prerequisites` json,
	`benefits` json,
	`cost` int NOT NULL DEFAULT 100,
	`researchTime` int NOT NULL DEFAULT 3600,
	CONSTRAINT `researchNodes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `skills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`skillType` enum('combat','breeding','crafting','gardening','research') NOT NULL,
	`level` int NOT NULL DEFAULT 1,
	`xp` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `skills_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userAchievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`achievementId` int NOT NULL,
	`progress` int NOT NULL DEFAULT 0,
	`unlockedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userAchievements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userChallenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`challengeId` int NOT NULL,
	`progress` int NOT NULL DEFAULT 0,
	`completed` boolean NOT NULL DEFAULT false,
	`claimedReward` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	CONSTRAINT `userChallenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userLore` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`loreId` int NOT NULL,
	`unlockedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userLore_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userResearch` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`nodeId` int NOT NULL,
	`status` enum('locked','available','researching','completed') NOT NULL DEFAULT 'locked',
	`progress` int NOT NULL DEFAULT 0,
	`startedAt` timestamp,
	`completedAt` timestamp,
	CONSTRAINT `userResearch_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ownedItems` MODIFY COLUMN `itemType` enum('seed','boost','cosmetic','tool','decoration','recipe') NOT NULL;--> statement-breakpoint
ALTER TABLE `gameProgress` ADD `wavesCompleted` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `gameProgress` ADD `perfectWaves` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `gameProgress` ADD `longestStreak` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `ownedItems` ADD `quantity` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `users` ADD `level` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `xp` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `prestigeLevel` int DEFAULT 0 NOT NULL;