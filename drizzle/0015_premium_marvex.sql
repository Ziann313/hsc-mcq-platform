CREATE TABLE `ai_generation_job_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`sourceVersionId` int NOT NULL,
	`pageReference` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_generation_job_sources_id` PRIMARY KEY(`id`),
	CONSTRAINT `ai_generation_job_source_unique` UNIQUE(`jobId`,`sourceVersionId`,`pageReference`)
);
--> statement-breakpoint
CREATE TABLE `ai_question_generation_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestedByUserId` int NOT NULL,
	`reviewedByUserId` int,
	`academicYearId` int NOT NULL,
	`examProfileId` int,
	`subjectId` int NOT NULL,
	`bookId` int NOT NULL,
	`chapterId` int NOT NULL,
	`topicId` int,
	`conceptId` int,
	`contentLanguage` enum('bn','en') NOT NULL,
	`difficulty` enum('easy','medium','hard') NOT NULL,
	`pageReference` varchar(100) NOT NULL,
	`requestInstructions` text NOT NULL,
	`status` enum('draft','generation_running','generated','answer_verification_running','answer_verified','answer_verification_failed','human_review','rejected','archived') NOT NULL DEFAULT 'draft',
	`generationModel` varchar(120),
	`verificationModel` varchar(120),
	`generatedCandidate` json,
	`verificationResult` json,
	`failureReason` text,
	`submittedQuestionId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_question_generation_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `historical_analysis_import_batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`importedByUserId` int NOT NULL,
	`sourceVersionId` int NOT NULL,
	`fileName` varchar(260) NOT NULL,
	`fileType` enum('json','csv') NOT NULL,
	`totalRows` int NOT NULL,
	`acceptedRows` int NOT NULL,
	`rejectedRows` int NOT NULL,
	`validationReport` json NOT NULL,
	`status` enum('under_review','verified','rejected','archived') NOT NULL DEFAULT 'under_review',
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `historical_analysis_import_batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `historical_pattern_metrics` ADD `importBatchId` int;--> statement-breakpoint
ALTER TABLE `historical_pattern_metrics` ADD `pageReference` varchar(100);--> statement-breakpoint
ALTER TABLE `ai_generation_job_sources` ADD CONSTRAINT `aigs_job_fk` FOREIGN KEY (`jobId`) REFERENCES `ai_question_generation_jobs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_generation_job_sources` ADD CONSTRAINT `aigs_source_fk` FOREIGN KEY (`sourceVersionId`) REFERENCES `source_versions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_question_generation_jobs` ADD CONSTRAINT `aigj_requester_fk` FOREIGN KEY (`requestedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_question_generation_jobs` ADD CONSTRAINT `aigj_reviewer_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_question_generation_jobs` ADD CONSTRAINT `aigj_year_fk` FOREIGN KEY (`academicYearId`) REFERENCES `academic_years`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_question_generation_jobs` ADD CONSTRAINT `aigj_profile_fk` FOREIGN KEY (`examProfileId`) REFERENCES `exam_profiles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_question_generation_jobs` ADD CONSTRAINT `aigj_subject_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_question_generation_jobs` ADD CONSTRAINT `aigj_book_fk` FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_question_generation_jobs` ADD CONSTRAINT `aigj_chapter_fk` FOREIGN KEY (`chapterId`) REFERENCES `chapters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_question_generation_jobs` ADD CONSTRAINT `aigj_topic_fk` FOREIGN KEY (`topicId`) REFERENCES `topics`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_question_generation_jobs` ADD CONSTRAINT `aigj_concept_fk` FOREIGN KEY (`conceptId`) REFERENCES `concepts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_question_generation_jobs` ADD CONSTRAINT `aigj_question_fk` FOREIGN KEY (`submittedQuestionId`) REFERENCES `questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `historical_analysis_import_batches` ADD CONSTRAINT `haib_importer_fk` FOREIGN KEY (`importedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `historical_analysis_import_batches` ADD CONSTRAINT `haib_source_fk` FOREIGN KEY (`sourceVersionId`) REFERENCES `source_versions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `historical_analysis_import_batches` ADD CONSTRAINT `haib_reviewer_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ai_generation_source_idx` ON `ai_generation_job_sources` (`sourceVersionId`);--> statement-breakpoint
CREATE INDEX `ai_generation_status_idx` ON `ai_question_generation_jobs` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `ai_generation_scope_idx` ON `ai_question_generation_jobs` (`academicYearId`,`subjectId`,`chapterId`);--> statement-breakpoint
CREATE INDEX `historical_import_status_idx` ON `historical_analysis_import_batches` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `historical_import_source_idx` ON `historical_analysis_import_batches` (`sourceVersionId`);--> statement-breakpoint
ALTER TABLE `historical_pattern_metrics` ADD CONSTRAINT `hpm_import_fk` FOREIGN KEY (`importBatchId`) REFERENCES `historical_analysis_import_batches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `historical_pattern_import_idx` ON `historical_pattern_metrics` (`importBatchId`);
