CREATE TABLE `live_exam_integrity_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`liveExamRoomId` int NOT NULL,
	`participantId` int NOT NULL,
	`eventType` enum('tab_blur','visibility_hidden','disconnect','manual_flag') NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `live_exam_integrity_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `live_exam_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`liveExamRoomId` int NOT NULL,
	`userId` int NOT NULL,
	`attemptId` int,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`submittedAt` timestamp,
	`finalScore` decimal(8,2),
	`timeTakenSeconds` int,
	`warningCount` int NOT NULL DEFAULT 0,
	`status` enum('joined','submitted','expired','disqualified') NOT NULL DEFAULT 'joined',
	CONSTRAINT `live_exam_participants_id` PRIMARY KEY(`id`),
	CONSTRAINT `live_participant_room_user_unique` UNIQUE(`liveExamRoomId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `live_exam_rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdByUserId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text,
	`mode` enum('scheduled','daily_challenge') NOT NULL DEFAULT 'scheduled',
	`status` enum('draft','scheduled','live','closed','archived') NOT NULL DEFAULT 'draft',
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`durationMinutes` int NOT NULL,
	`questionIds` json NOT NULL,
	`marksPerCorrect` decimal(5,2) NOT NULL DEFAULT '1.00',
	`negativeMarkPerWrong` decimal(5,2) NOT NULL DEFAULT '0.00',
	`maxParticipants` int,
	`autoSubmitAfterWarnings` int NOT NULL DEFAULT 3,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `live_exam_rooms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `live_exam_integrity_events` ADD CONSTRAINT `live_int_room_fk` FOREIGN KEY (`liveExamRoomId`) REFERENCES `live_exam_rooms`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `live_exam_integrity_events` ADD CONSTRAINT `live_int_participant_fk` FOREIGN KEY (`participantId`) REFERENCES `live_exam_participants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `live_exam_participants` ADD CONSTRAINT `live_part_room_fk` FOREIGN KEY (`liveExamRoomId`) REFERENCES `live_exam_rooms`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `live_exam_participants` ADD CONSTRAINT `live_part_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `live_exam_participants` ADD CONSTRAINT `live_part_attempt_fk` FOREIGN KEY (`attemptId`) REFERENCES `exam_attempts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `live_exam_rooms` ADD CONSTRAINT `live_room_creator_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `live_integrity_participant_idx` ON `live_exam_integrity_events` (`participantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `live_integrity_room_idx` ON `live_exam_integrity_events` (`liveExamRoomId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `live_participant_room_score_idx` ON `live_exam_participants` (`liveExamRoomId`,`finalScore`,`submittedAt`);--> statement-breakpoint
CREATE INDEX `live_room_status_time_idx` ON `live_exam_rooms` (`status`,`startsAt`,`endsAt`);--> statement-breakpoint
CREATE INDEX `live_room_creator_idx` ON `live_exam_rooms` (`createdByUserId`);
