CREATE TABLE `academic_groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`academicYearId` int NOT NULL,
	`slug` varchar(40) NOT NULL,
	`nameEn` varchar(80) NOT NULL,
	`nameBn` varchar(120) NOT NULL,
	CONSTRAINT `academic_groups_id` PRIMARY KEY(`id`),
	CONSTRAINT `academic_group_year_slug` UNIQUE(`academicYearId`,`slug`)
);
--> statement-breakpoint
CREATE TABLE `academic_years` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(20) NOT NULL,
	`status` enum('active','superseded','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `academic_years_id` PRIMARY KEY(`id`),
	CONSTRAINT `academic_years_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `ai_conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(220) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`retrievalMetadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attempt_answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attemptId` int NOT NULL,
	`questionId` int NOT NULL,
	`selectedOptionId` int,
	`markedForReview` boolean NOT NULL DEFAULT false,
	`answeredAt` timestamp,
	CONSTRAINT `attempt_answers_id` PRIMARY KEY(`id`),
	CONSTRAINT `attempt_question_unique` UNIQUE(`attemptId`,`questionId`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int,
	`action` varchar(160) NOT NULL,
	`entityType` varchar(100) NOT NULL,
	`entityId` varchar(80),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bookmarks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`questionId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bookmarks_id` PRIMARY KEY(`id`),
	CONSTRAINT `bookmark_user_question_unique` UNIQUE(`userId`,`questionId`)
);
--> statement-breakpoint
CREATE TABLE `books` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectId` int NOT NULL,
	`titleEn` varchar(220) NOT NULL,
	`titleBn` varchar(260) NOT NULL,
	`paper` enum('first','second','combined') NOT NULL DEFAULT 'combined',
	`edition` varchar(80) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `books_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chapters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookId` int NOT NULL,
	`chapterNo` varchar(40) NOT NULL,
	`titleEn` varchar(220) NOT NULL,
	`titleBn` varchar(260) NOT NULL,
	CONSTRAINT `chapters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `concepts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`topicId` int NOT NULL,
	`titleEn` varchar(220) NOT NULL,
	`titleBn` varchar(260) NOT NULL,
	CONSTRAINT `concepts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exam_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`examId` int,
	`titleSnapshot` varchar(180) NOT NULL,
	`examVersionSnapshot` varchar(60) NOT NULL,
	`patternVersionSnapshot` varchar(60) NOT NULL,
	`questionSetSnapshot` json NOT NULL,
	`markingSchemeSnapshot` json NOT NULL,
	`startedAt` timestamp NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`submittedAt` timestamp,
	`status` enum('in_progress','submitted','expired') NOT NULL DEFAULT 'in_progress',
	`score` decimal(8,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exam_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exam_pattern_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examProfileId` int NOT NULL,
	`versionLabel` varchar(80) NOT NULL,
	`configuration` json NOT NULL,
	`status` enum('draft','under_review','active','superseded','archived') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exam_pattern_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `exam_pattern_version_unique` UNIQUE(`examProfileId`,`versionLabel`)
);
--> statement-breakpoint
CREATE TABLE `exam_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`examType` enum('hsc','medical','engineering','university') NOT NULL,
	`institution` varchar(180),
	`unit` varchar(120),
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exam_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examProfileId` int,
	`patternVersionId` int,
	`title` varchar(180) NOT NULL,
	`examVersion` varchar(60) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_chunks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceVersionId` int NOT NULL,
	`academicYearId` int,
	`bookId` int,
	`chapterId` int,
	`pageReference` varchar(100) NOT NULL,
	`content` text NOT NULL,
	`contentHash` varchar(128) NOT NULL,
	`embeddingReference` varchar(260),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `knowledge_chunks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mistakes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`questionId` int NOT NULL,
	`sourceAttemptId` int,
	`personalNote` text,
	`status` enum('open','reviewing','mastered') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mistakes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `practice_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`selectionSnapshot` json NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`score` decimal(8,2),
	CONSTRAINT `practice_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `question_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionId` int NOT NULL,
	`optionKey` varchar(5) NOT NULL,
	`text` text NOT NULL,
	`isCorrect` boolean NOT NULL DEFAULT false,
	CONSTRAINT `question_options_id` PRIMARY KEY(`id`),
	CONSTRAINT `question_option_key` UNIQUE(`questionId`,`optionKey`)
);
--> statement-breakpoint
CREATE TABLE `question_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionId` int NOT NULL,
	`sourceVersionId` int NOT NULL,
	`pageReference` varchar(100) NOT NULL,
	CONSTRAINT `question_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `question_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionId` int NOT NULL,
	`version` int NOT NULL,
	`snapshot` json NOT NULL,
	`createdByUserId` int,
	`reviewStatus` enum('draft','human_review','approved','superseded') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `question_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `question_version_unique` UNIQUE(`questionId`,`version`)
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`academicYearId` int NOT NULL,
	`subjectId` int NOT NULL,
	`bookId` int,
	`chapterId` int,
	`topicId` int,
	`conceptId` int,
	`prompt` text NOT NULL,
	`explanation` text,
	`difficulty` enum('easy','medium','hard') NOT NULL,
	`status` enum('draft','ai_validated','human_review','approved','published','needs_review','superseded','archived') NOT NULL DEFAULT 'draft',
	`currentVersion` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `source_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceId` int NOT NULL,
	`versionLabel` varchar(80) NOT NULL,
	`contentHash` varchar(128) NOT NULL,
	`status` enum('draft','under_review','active','superseded','archived') NOT NULL DEFAULT 'draft',
	`supersedesVersionId` int,
	`retrievedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `source_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `source_hash_unique` UNIQUE(`sourceId`,`contentHash`)
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization` varchar(180) NOT NULL,
	`title` varchar(300) NOT NULL,
	`sourceUrl` varchar(1000) NOT NULL,
	`sourceType` enum('nctb','official_syllabus','official_admission','licensed') NOT NULL,
	`licenseNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`preferredLanguage` enum('bn','en') NOT NULL DEFAULT 'bn',
	`academicYear` varchar(20) NOT NULL,
	`session` varchar(40) NOT NULL,
	`group` enum('science','business','humanities') NOT NULL,
	`targetExam` enum('hsc','medical','engineering','university','multiple') NOT NULL,
	`institution` varchar(160),
	`dailyStudyMinutes` int NOT NULL,
	`onboardingCompletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `student_profiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `study_plan_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studyPlanId` int NOT NULL,
	`scheduledFor` timestamp NOT NULL,
	`title` varchar(240) NOT NULL,
	`itemType` enum('learn','practice','exam','review') NOT NULL,
	`estimatedMinutes` int NOT NULL,
	`completedAt` timestamp,
	CONSTRAINT `study_plan_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `study_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`targetExam` varchar(80) NOT NULL,
	`examDate` timestamp,
	`status` enum('active','completed','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `study_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`academicYearId` int NOT NULL,
	`groupId` int,
	`code` varchar(40) NOT NULL,
	`nameEn` varchar(120) NOT NULL,
	`nameBn` varchar(160) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subjects_id` PRIMARY KEY(`id`),
	CONSTRAINT `subject_year_code` UNIQUE(`academicYearId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `topics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chapterId` int NOT NULL,
	`titleEn` varchar(220) NOT NULL,
	`titleBn` varchar(260) NOT NULL,
	CONSTRAINT `topics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','student','reviewer','content_admin','super_admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `academic_groups` ADD CONSTRAINT `academic_groups_academicYearId_academic_years_id_fk` FOREIGN KEY (`academicYearId`) REFERENCES `academic_years`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_conversations` ADD CONSTRAINT `ai_conversations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_messages` ADD CONSTRAINT `ai_messages_conversationId_ai_conversations_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `ai_conversations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attempt_answers` ADD CONSTRAINT `attempt_answers_attemptId_exam_attempts_id_fk` FOREIGN KEY (`attemptId`) REFERENCES `exam_attempts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bookmarks` ADD CONSTRAINT `bookmarks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bookmarks` ADD CONSTRAINT `bookmarks_questionId_questions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `books` ADD CONSTRAINT `books_subjectId_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chapters` ADD CONSTRAINT `chapters_bookId_books_id_fk` FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `concepts` ADD CONSTRAINT `concepts_topicId_topics_id_fk` FOREIGN KEY (`topicId`) REFERENCES `topics`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_attempts` ADD CONSTRAINT `exam_attempts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_attempts` ADD CONSTRAINT `exam_attempts_examId_exams_id_fk` FOREIGN KEY (`examId`) REFERENCES `exams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_pattern_versions` ADD CONSTRAINT `exam_pattern_versions_examProfileId_exam_profiles_id_fk` FOREIGN KEY (`examProfileId`) REFERENCES `exam_profiles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exams` ADD CONSTRAINT `exams_examProfileId_exam_profiles_id_fk` FOREIGN KEY (`examProfileId`) REFERENCES `exam_profiles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exams` ADD CONSTRAINT `exams_patternVersionId_exam_pattern_versions_id_fk` FOREIGN KEY (`patternVersionId`) REFERENCES `exam_pattern_versions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `knowledge_chunks` ADD CONSTRAINT `knowledge_chunks_sourceVersionId_source_versions_id_fk` FOREIGN KEY (`sourceVersionId`) REFERENCES `source_versions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `knowledge_chunks` ADD CONSTRAINT `knowledge_chunks_academicYearId_academic_years_id_fk` FOREIGN KEY (`academicYearId`) REFERENCES `academic_years`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `knowledge_chunks` ADD CONSTRAINT `knowledge_chunks_bookId_books_id_fk` FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `knowledge_chunks` ADD CONSTRAINT `knowledge_chunks_chapterId_chapters_id_fk` FOREIGN KEY (`chapterId`) REFERENCES `chapters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mistakes` ADD CONSTRAINT `mistakes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mistakes` ADD CONSTRAINT `mistakes_questionId_questions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mistakes` ADD CONSTRAINT `mistakes_sourceAttemptId_exam_attempts_id_fk` FOREIGN KEY (`sourceAttemptId`) REFERENCES `exam_attempts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practice_sessions` ADD CONSTRAINT `practice_sessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_options` ADD CONSTRAINT `question_options_questionId_questions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_sources` ADD CONSTRAINT `question_sources_questionId_questions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_sources` ADD CONSTRAINT `question_sources_sourceVersionId_source_versions_id_fk` FOREIGN KEY (`sourceVersionId`) REFERENCES `source_versions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_versions` ADD CONSTRAINT `question_versions_questionId_questions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_versions` ADD CONSTRAINT `question_versions_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `questions` ADD CONSTRAINT `questions_academicYearId_academic_years_id_fk` FOREIGN KEY (`academicYearId`) REFERENCES `academic_years`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `questions` ADD CONSTRAINT `questions_subjectId_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `questions` ADD CONSTRAINT `questions_bookId_books_id_fk` FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `questions` ADD CONSTRAINT `questions_chapterId_chapters_id_fk` FOREIGN KEY (`chapterId`) REFERENCES `chapters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `questions` ADD CONSTRAINT `questions_topicId_topics_id_fk` FOREIGN KEY (`topicId`) REFERENCES `topics`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `questions` ADD CONSTRAINT `questions_conceptId_concepts_id_fk` FOREIGN KEY (`conceptId`) REFERENCES `concepts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `source_versions` ADD CONSTRAINT `source_versions_sourceId_sources_id_fk` FOREIGN KEY (`sourceId`) REFERENCES `sources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_profiles` ADD CONSTRAINT `student_profiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `study_plan_items` ADD CONSTRAINT `study_plan_items_studyPlanId_study_plans_id_fk` FOREIGN KEY (`studyPlanId`) REFERENCES `study_plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `study_plans` ADD CONSTRAINT `study_plans_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subjects` ADD CONSTRAINT `subjects_academicYearId_academic_years_id_fk` FOREIGN KEY (`academicYearId`) REFERENCES `academic_years`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subjects` ADD CONSTRAINT `subjects_groupId_academic_groups_id_fk` FOREIGN KEY (`groupId`) REFERENCES `academic_groups`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `topics` ADD CONSTRAINT `topics_chapterId_chapters_id_fk` FOREIGN KEY (`chapterId`) REFERENCES `chapters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `audit_logs` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `audit_actor_idx` ON `audit_logs` (`actorUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `book_subject_idx` ON `books` (`subjectId`);--> statement-breakpoint
CREATE INDEX `chapter_book_idx` ON `chapters` (`bookId`);--> statement-breakpoint
CREATE INDEX `concept_topic_idx` ON `concepts` (`topicId`);--> statement-breakpoint
CREATE INDEX `attempt_user_status_idx` ON `exam_attempts` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `knowledge_source_idx` ON `knowledge_chunks` (`sourceVersionId`);--> statement-breakpoint
CREATE INDEX `knowledge_academic_idx` ON `knowledge_chunks` (`academicYearId`,`bookId`,`chapterId`);--> statement-breakpoint
CREATE INDEX `mistake_user_status_idx` ON `mistakes` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `practice_user_idx` ON `practice_sessions` (`userId`,`startedAt`);--> statement-breakpoint
CREATE INDEX `question_source_idx` ON `question_sources` (`questionId`,`sourceVersionId`);--> statement-breakpoint
CREATE INDEX `question_catalog_idx` ON `questions` (`academicYearId`,`subjectId`,`chapterId`,`topicId`);--> statement-breakpoint
CREATE INDEX `question_status_idx` ON `questions` (`status`);--> statement-breakpoint
CREATE INDEX `source_version_status_idx` ON `source_versions` (`status`);--> statement-breakpoint
CREATE INDEX `study_item_plan_date_idx` ON `study_plan_items` (`studyPlanId`,`scheduledFor`);--> statement-breakpoint
CREATE INDEX `subject_group_idx` ON `subjects` (`groupId`);--> statement-breakpoint
CREATE INDEX `topic_chapter_idx` ON `topics` (`chapterId`);