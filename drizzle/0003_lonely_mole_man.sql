CREATE TABLE `chapter_cheat_sheets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chapterId` int NOT NULL,
	`title` varchar(220) NOT NULL,
	`markdownContent` text NOT NULL,
	`sourceVersionId` int,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chapter_cheat_sheets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leaderboard_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`periodType` enum('global','weekly') NOT NULL,
	`periodKey` varchar(30) NOT NULL,
	`netMarks` decimal(9,2) NOT NULL DEFAULT '0.00',
	`attemptsCount` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leaderboard_scores_id` PRIMARY KEY(`id`),
	CONSTRAINT `leaderboard_user_period_unique` UNIQUE(`userId`,`periodType`,`periodKey`)
);
--> statement-breakpoint
CREATE TABLE `question_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionId` int NOT NULL,
	`userId` int NOT NULL,
	`parentCommentId` int,
	`content` text NOT NULL,
	`status` enum('visible','flagged','removed') NOT NULL DEFAULT 'visible',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `question_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `question_import_batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`importedByUserId` int NOT NULL,
	`fileName` varchar(260) NOT NULL,
	`fileType` enum('json','csv') NOT NULL,
	`totalRows` int NOT NULL DEFAULT 0,
	`acceptedRows` int NOT NULL DEFAULT 0,
	`rejectedRows` int NOT NULL DEFAULT 0,
	`validationReport` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `question_import_batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `question_stems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(240),
	`contextParagraph` text NOT NULL,
	`subjectId` int NOT NULL,
	`chapterId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `question_stems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `attempt_answers` ADD `selectedOptionIds` json;--> statement-breakpoint
ALTER TABLE `attempt_answers` ADD `isCorrect` boolean;--> statement-breakpoint
ALTER TABLE `attempt_answers` ADD `awardedMarks` decimal(7,2);--> statement-breakpoint
ALTER TABLE `mistakes` ADD `lastReviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `mistakes` ADD `reviewCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `questions` ADD `stemId` int;--> statement-breakpoint
ALTER TABLE `questions` ADD `questionType` enum('single_mcq','multi_statement','stem_subquestion') DEFAULT 'single_mcq' NOT NULL;--> statement-breakpoint
ALTER TABLE `questions` ADD `boardStandard` enum('board_standard','varsity_admission_standard') DEFAULT 'board_standard' NOT NULL;--> statement-breakpoint
ALTER TABLE `questions` ADD `boardName` varchar(100);--> statement-breakpoint
ALTER TABLE `questions` ADD `boardExamYear` int;--> statement-breakpoint
ALTER TABLE `questions` ADD `collegePaper` varchar(180);--> statement-breakpoint
ALTER TABLE `questions` ADD `chapterTags` json;--> statement-breakpoint
ALTER TABLE `questions` ADD `solutionImageUrl` varchar(1000);--> statement-breakpoint
ALTER TABLE `questions` ADD `negativeMarkWeight` decimal(4,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `chapter_cheat_sheets` ADD CONSTRAINT `chapter_cheat_sheets_chapterId_chapters_id_fk` FOREIGN KEY (`chapterId`) REFERENCES `chapters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chapter_cheat_sheets` ADD CONSTRAINT `chapter_cheat_sheets_sourceVersionId_source_versions_id_fk` FOREIGN KEY (`sourceVersionId`) REFERENCES `source_versions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leaderboard_scores` ADD CONSTRAINT `leaderboard_scores_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_comments` ADD CONSTRAINT `question_comments_questionId_questions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_comments` ADD CONSTRAINT `question_comments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_import_batches` ADD CONSTRAINT `question_import_batches_importedByUserId_users_id_fk` FOREIGN KEY (`importedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_stems` ADD CONSTRAINT `question_stems_subjectId_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_stems` ADD CONSTRAINT `question_stems_chapterId_chapters_id_fk` FOREIGN KEY (`chapterId`) REFERENCES `chapters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `cheat_sheet_chapter_status_idx` ON `chapter_cheat_sheets` (`chapterId`,`status`);--> statement-breakpoint
CREATE INDEX `leaderboard_period_score_idx` ON `leaderboard_scores` (`periodType`,`periodKey`,`netMarks`);--> statement-breakpoint
CREATE INDEX `question_comment_idx` ON `question_comments` (`questionId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `question_comment_parent_idx` ON `question_comments` (`parentCommentId`);--> statement-breakpoint
CREATE INDEX `stem_subject_idx` ON `question_stems` (`subjectId`,`chapterId`);