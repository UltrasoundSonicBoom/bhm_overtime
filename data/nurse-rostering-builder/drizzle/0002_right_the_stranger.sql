CREATE TABLE `nurse_unavailable_dates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nurse_id` int NOT NULL,
	`schedule_id` int NOT NULL,
	`date` date NOT NULL,
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nurse_unavailable_dates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedule_confirmations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schedule_id` int NOT NULL,
	`nurse_id` int NOT NULL,
	`status` enum('pending','confirmed','auto_confirmed') NOT NULL DEFAULT 'pending',
	`confirmed_at` timestamp,
	`confirm_deadline` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedule_confirmations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedule_deployments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schedule_id` int NOT NULL,
	`deployed_by` int NOT NULL,
	`status` enum('draft','pending_confirmation','confirmed','deployed','archived') NOT NULL DEFAULT 'draft',
	`total_nurses` int,
	`confirmed_nurses` int DEFAULT 0,
	`auto_confirmed_nurses` int DEFAULT 0,
	`deployed_at` timestamp,
	`deploy_deadline` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedule_deployments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shift_swap_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schedule_id` int NOT NULL,
	`requesting_nurse_id` int NOT NULL,
	`target_nurse_id` int NOT NULL,
	`requested_date` date NOT NULL,
	`target_date` date NOT NULL,
	`reason` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`approved_by` int,
	`approved_at` timestamp,
	`notification_sent` boolean DEFAULT false,
	`notification_method` enum('email','sms','both'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shift_swap_logs_id` PRIMARY KEY(`id`)
);
