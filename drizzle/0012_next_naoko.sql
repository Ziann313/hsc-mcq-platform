CREATE TABLE `attempt_integrity_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attemptId` int NOT NULL,
	`userId` int NOT NULL,
	`eventType` enum('tab_blur','visibility_hidden','fullscreen_exit') NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attempt_integrity_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `attempt_integrity_events` ADD CONSTRAINT `attempt_integrity_events_attemptId_exam_attempts_id_fk` FOREIGN KEY (`attemptId`) REFERENCES `exam_attempts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attempt_integrity_events` ADD CONSTRAINT `attempt_integrity_events_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `attempt_integrity_attempt_idx` ON `attempt_integrity_events` (`attemptId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `attempt_integrity_user_idx` ON `attempt_integrity_events` (`userId`,`createdAt`);