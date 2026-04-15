CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipient_id` int NOT NULL,
	`type` enum('schedule_confirmed','off_approved','off_rejected','swap_approved','swap_rejected') NOT NULL,
	`title` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`related_schedule_id` int,
	`related_request_id` int,
	`is_read` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nurse_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`ward_id` int,
	`employee_id` varchar(50) NOT NULL,
	`career_years` decimal(3,1),
	`qualification` varchar(100),
	`preferred_shifts` json,
	`max_consecutive_nights` int DEFAULT 3,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nurse_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `nurse_profiles_employee_id_unique` UNIQUE(`employee_id`)
);
--> statement-breakpoint
CREATE TABLE `off_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schedule_id` int NOT NULL,
	`nurse_id` int NOT NULL,
	`requested_date` date NOT NULL,
	`reason` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`approved_by` int,
	`approved_at` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `off_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ward_id` int NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`status` enum('draft','pending','confirmed','archived') NOT NULL DEFAULT 'draft',
	`day_shift_required` int NOT NULL,
	`evening_shift_required` int NOT NULL,
	`night_shift_required` int NOT NULL,
	`weekend_day_shift_required` int NOT NULL,
	`weekend_evening_shift_required` int NOT NULL,
	`weekend_night_shift_required` int NOT NULL,
	`created_by` int NOT NULL,
	`confirmed_at` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shift_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schedule_id` int NOT NULL,
	`nurse_id` int NOT NULL,
	`date` date NOT NULL,
	`shift_type` enum('day','evening','night','off') NOT NULL,
	`is_weekend` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shift_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shift_swap_requests` (
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shift_swap_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`total_nurses` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wards_id` PRIMARY KEY(`id`)
);
