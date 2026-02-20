CREATE TABLE `activity_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`logDate` date NOT NULL,
	`activityType` varchar(255) NOT NULL,
	`duration` int,
	`intensity` enum('baja','media','alta') DEFAULT 'media',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `day_ingredients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`scheduledDayId` int NOT NULL,
	`ingredientName` varchar(255) NOT NULL,
	`isAvailable` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `day_ingredients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `diet_uploads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fileName` varchar(255),
	`fileUrl` text,
	`fileType` enum('image','pdf') NOT NULL,
	`rawText` text,
	`extractedDays` json,
	`status` enum('pending','processed','error') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `diet_uploads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ingredients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`unit` varchar(50),
	`category` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ingredients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `menu_days` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`lunch1` varchar(500) NOT NULL,
	`lunch2` varchar(500),
	`dinner1` varchar(500) NOT NULL,
	`dinner2` varchar(500),
	`breakfast` varchar(500),
	`contentHash` varchar(64) NOT NULL,
	`notes` text,
	`source` enum('manual','ocr','imported') NOT NULL DEFAULT 'manual',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `menu_days_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`mealType` enum('almuerzo','cena','desayuno','snack') NOT NULL,
	`instructions` text,
	`ingredientsList` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recipes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scheduled_days` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`menuDayId` int NOT NULL,
	`scheduledDate` date NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`status` enum('pending','completed','skipped') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduled_days_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shopping_list` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`ingredientName` varchar(255) NOT NULL,
	`quantity` varchar(100),
	`isPurchased` boolean NOT NULL DEFAULT false,
	`scheduledDayId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shopping_list_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weight_goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`targetDate` date NOT NULL,
	`targetWeight` float NOT NULL,
	`label` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `weight_goals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weight_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`weight` float NOT NULL,
	`logDate` date NOT NULL,
	`targetWeight` float,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `weight_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `targetWeight` float;--> statement-breakpoint
ALTER TABLE `users` ADD `initialWeight` float;--> statement-breakpoint
ALTER TABLE `users` ADD `height` float;--> statement-breakpoint
ALTER TABLE `users` ADD `birthDate` date;