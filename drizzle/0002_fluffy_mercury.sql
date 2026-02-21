CREATE TABLE `weekly_goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`weekDate` date NOT NULL,
	`targetWeight` float NOT NULL,
	`notes` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `weekly_goals_id` PRIMARY KEY(`id`)
);
