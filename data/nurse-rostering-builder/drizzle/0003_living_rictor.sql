CREATE TABLE `nurses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`ward_id` int NOT NULL,
	`career_years` int DEFAULT 0,
	`position` varchar(50) DEFAULT '간호사',
	`email` varchar(100),
	`phone` varchar(20),
	`preferred_shifts` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nurses_id` PRIMARY KEY(`id`)
);
