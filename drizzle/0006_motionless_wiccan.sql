CREATE TABLE `daily_challenge_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdByUserId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text,
	`questionIds` json NOT NULL,
	`durationMinutes` int NOT NULL,
	`marksPerCorrect` decimal(5,2) NOT NULL DEFAULT '1.00',
	`negativeMarkPerWrong` decimal(5,2) NOT NULL DEFAULT '0.00',
	`autoSubmitAfterWarnings` int NOT NULL DEFAULT 3,
	`cronExpression` varchar(60) NOT NULL,
	`timeZone` varchar(60) NOT NULL DEFAULT 'Asia/Dhaka',
	`scheduleCronTaskUid` varchar(65),
	`isEnabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_challenge_schedules_id` PRIMARY KEY(`id`),
	CONSTRAINT `daily_challenge_task_uid_unique` UNIQUE(`scheduleCronTaskUid`)
);
--> statement-breakpoint
ALTER TABLE `live_exam_rooms` ADD `dailyChallengeScheduleId` int;--> statement-breakpoint
ALTER TABLE `live_exam_rooms` ADD `challengeDate` varchar(10);--> statement-breakpoint
ALTER TABLE `live_exam_rooms` ADD CONSTRAINT `live_room_daily_challenge_date_unique` UNIQUE(`dailyChallengeScheduleId`,`challengeDate`);--> statement-breakpoint
ALTER TABLE `daily_challenge_schedules` ADD CONSTRAINT `daily_challenge_schedules_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `daily_challenge_enabled_idx` ON `daily_challenge_schedules` (`isEnabled`);--> statement-breakpoint
ALTER TABLE `live_exam_rooms` ADD CONSTRAINT `live_room_daily_schedule_fk` FOREIGN KEY (`dailyChallengeScheduleId`) REFERENCES `daily_challenge_schedules`(`id`) ON DELETE no action ON UPDATE no action;
