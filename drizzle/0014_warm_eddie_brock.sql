CREATE TABLE `exam_pattern_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examPatternVersionId` int NOT NULL,
	`sourceVersionId` int NOT NULL,
	`evidenceRole` enum('pattern','schedule','eligibility','cutoff','notice') NOT NULL DEFAULT 'pattern',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exam_pattern_sources_id` PRIMARY KEY(`id`),
	CONSTRAINT `exam_pattern_source_unique` UNIQUE(`examPatternVersionId`,`sourceVersionId`,`evidenceRole`)
);
--> statement-breakpoint
CREATE TABLE `historical_pattern_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examProfileId` int NOT NULL,
	`sourceVersionId` int NOT NULL,
	`academicYearId` int,
	`boardName` varchar(100),
	`examYear` int,
	`subjectId` int,
	`bookId` int,
	`chapterId` int,
	`topicId` int,
	`conceptId` int,
	`appearanceCount` int NOT NULL DEFAULT 0,
	`importanceScore` int,
	`questionTypeDistribution` json,
	`difficultyDistribution` json,
	`notes` text,
	`verificationStatus` enum('under_review','verified','archived') NOT NULL DEFAULT 'under_review',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `historical_pattern_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `question_intelligence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionId` int NOT NULL,
	`examProfileId` int,
	`provenance` enum('historical_official','historical_verified','historical_unverified','generated_from_curriculum','generated_from_historical_analysis','generated_from_exam_pattern','original_source_linked') NOT NULL DEFAULT 'original_source_linked',
	`verificationStatus` enum('unverified','source_linked','human_reviewed','approved') NOT NULL DEFAULT 'source_linked',
	`cognitiveLevel` enum('recall','understanding','application','analysis','evaluation') NOT NULL DEFAULT 'understanding',
	`reasoningMode` enum('conceptual','numerical','mixed') NOT NULL DEFAULT 'conceptual',
	`difficultyScore` int,
	`examDifficultyProfile` varchar(80),
	`historicalFrequency` int NOT NULL DEFAULT 0,
	`chapterFrequency` int NOT NULL DEFAULT 0,
	`topicFrequency` int NOT NULL DEFAULT 0,
	`importanceScore` int,
	`recurrenceScore` int,
	`formulaUsed` varchar(360),
	`commonMistake` text,
	`generationBasis` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `question_intelligence_id` PRIMARY KEY(`id`),
	CONSTRAINT `question_intelligence_questionId_unique` UNIQUE(`questionId`)
);
--> statement-breakpoint
ALTER TABLE `exam_pattern_sources` ADD CONSTRAINT `eps_pattern_fk` FOREIGN KEY (`examPatternVersionId`) REFERENCES `exam_pattern_versions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_pattern_sources` ADD CONSTRAINT `eps_source_fk` FOREIGN KEY (`sourceVersionId`) REFERENCES `source_versions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `historical_pattern_metrics` ADD CONSTRAINT `hpm_profile_fk` FOREIGN KEY (`examProfileId`) REFERENCES `exam_profiles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `historical_pattern_metrics` ADD CONSTRAINT `hpm_source_fk` FOREIGN KEY (`sourceVersionId`) REFERENCES `source_versions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `historical_pattern_metrics` ADD CONSTRAINT `hpm_year_fk` FOREIGN KEY (`academicYearId`) REFERENCES `academic_years`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `historical_pattern_metrics` ADD CONSTRAINT `hpm_subject_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `historical_pattern_metrics` ADD CONSTRAINT `hpm_book_fk` FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `historical_pattern_metrics` ADD CONSTRAINT `hpm_chapter_fk` FOREIGN KEY (`chapterId`) REFERENCES `chapters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `historical_pattern_metrics` ADD CONSTRAINT `hpm_topic_fk` FOREIGN KEY (`topicId`) REFERENCES `topics`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `historical_pattern_metrics` ADD CONSTRAINT `hpm_concept_fk` FOREIGN KEY (`conceptId`) REFERENCES `concepts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_intelligence` ADD CONSTRAINT `qi_question_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_intelligence` ADD CONSTRAINT `qi_profile_fk` FOREIGN KEY (`examProfileId`) REFERENCES `exam_profiles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `exam_pattern_source_version_idx` ON `exam_pattern_sources` (`sourceVersionId`);--> statement-breakpoint
CREATE INDEX `historical_pattern_scope_idx` ON `historical_pattern_metrics` (`examProfileId`,`subjectId`,`chapterId`,`topicId`);--> statement-breakpoint
CREATE INDEX `historical_pattern_source_idx` ON `historical_pattern_metrics` (`sourceVersionId`,`verificationStatus`);--> statement-breakpoint
CREATE INDEX `question_intelligence_profile_idx` ON `question_intelligence` (`examProfileId`);--> statement-breakpoint
CREATE INDEX `question_intelligence_provenance_idx` ON `question_intelligence` (`provenance`,`verificationStatus`);
