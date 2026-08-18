CREATE TABLE `daily_challenge_notification_deliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dailyChallengeScheduleId` int NOT NULL,
	`liveExamRoomId` int NOT NULL,
	`userId` int NOT NULL,
	`notificationId` int,
	`challengeDate` varchar(10) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `daily_challenge_notification_deliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `daily_challenge_notify_once` UNIQUE(`dailyChallengeScheduleId`,`challengeDate`,`userId`)
);
ALTER TABLE `student_notification_preferences` ADD `dailyChallengeEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `daily_challenge_notification_deliveries` ADD CONSTRAINT `daily_notify_schedule_fk` FOREIGN KEY (`dailyChallengeScheduleId`) REFERENCES `daily_challenge_schedules`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `daily_challenge_notification_deliveries` ADD CONSTRAINT `daily_notify_room_fk` FOREIGN KEY (`liveExamRoomId`) REFERENCES `live_exam_rooms`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `daily_challenge_notification_deliveries` ADD CONSTRAINT `daily_notify_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `daily_challenge_notification_deliveries` ADD CONSTRAINT `daily_notify_notification_fk` FOREIGN KEY (`notificationId`) REFERENCES `notifications`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `daily_challenge_delivery_room_idx` ON `daily_challenge_notification_deliveries` (`liveExamRoomId`);
