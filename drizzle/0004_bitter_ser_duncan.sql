CREATE TABLE `student_notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`studyEnabled` boolean NOT NULL DEFAULT true,
	`admissionEnabled` boolean NOT NULL DEFAULT true,
	`contentEnabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_notification_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `student_notification_preferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `student_notification_preferences` ADD CONSTRAINT `student_notification_preferences_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;