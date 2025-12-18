CREATE TABLE `gameProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`currentLevel` int NOT NULL DEFAULT 1,
	`highScore` int NOT NULL DEFAULT 0,
	`totalScore` int NOT NULL DEFAULT 0,
	`gleafBalance` int NOT NULL DEFAULT 100,
	`gamesPlayed` int NOT NULL DEFAULT 0,
	`pestsKilled` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gameProgress_id` PRIMARY KEY(`id`),
	CONSTRAINT `gameProgress_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `ownedItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`itemId` varchar(64) NOT NULL,
	`itemType` enum('seed','boost','cosmetic') NOT NULL,
	`purchasedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ownedItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`paypalOrderId` varchar(64) NOT NULL,
	`paypalPayerId` varchar(64),
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`status` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
	`productType` varchar(64) NOT NULL DEFAULT 'premium',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_paypalOrderId_unique` UNIQUE(`paypalOrderId`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `isPremium` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `premiumSince` timestamp;