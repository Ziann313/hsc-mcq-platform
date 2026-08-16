CREATE TABLE `admission_notices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceId` int NOT NULL,
	`examProfileId` int,
	`institution` varchar(180) NOT NULL,
	`title` varchar(260) NOT NULL,
	`session` varchar(80) NOT NULL,
	`noticeType` enum('application','schedule','result','pattern','other') NOT NULL,
	`sourceUrl` varchar(1000) NOT NULL,
	`summary` text,
	`status` enum('under_review','published','archived') NOT NULL DEFAULT 'under_review',
	`retrievedAt` timestamp NOT NULL DEFAULT (now()),
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admission_notices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('study','admission','content','account','system') NOT NULL DEFAULT 'system',
	`priority` enum('normal','high','critical') NOT NULL DEFAULT 'normal',
	`title` varchar(220) NOT NULL,
	`body` text NOT NULL,
	`actionUrl` varchar(500),
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `admission_notices` ADD CONSTRAINT `admission_notices_sourceId_sources_id_fk` FOREIGN KEY (`sourceId`) REFERENCES `sources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admission_notices` ADD CONSTRAINT `admission_notices_examProfileId_exam_profiles_id_fk` FOREIGN KEY (`examProfileId`) REFERENCES `exam_profiles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `admission_notice_status_idx` ON `admission_notices` (`status`,`retrievedAt`);--> statement-breakpoint
CREATE INDEX `admission_notice_source_idx` ON `admission_notices` (`sourceId`);--> statement-breakpoint
CREATE INDEX `notification_user_read_idx` ON `notifications` (`userId`,`readAt`,`createdAt`);