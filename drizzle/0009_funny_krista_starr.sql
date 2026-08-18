CREATE TABLE `catalog_book_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`academicYearId` int NOT NULL,
	`catalogSourceLeadId` int NOT NULL,
	`catalogSubjectId` int,
	`groupSlug` varchar(40) NOT NULL,
	`subjectLabel` varchar(180) NOT NULL,
	`paperScope` varchar(100) NOT NULL,
	`titleEn` varchar(300) NOT NULL,
	`titleBn` varchar(360) NOT NULL,
	`languageVersion` enum('bn','en','bilingual') NOT NULL,
	`listingType` enum('official','commercial') NOT NULL,
	`edition` varchar(100) NOT NULL,
	`attribution` varchar(300) NOT NULL,
	`sourceUrl` varchar(1000) NOT NULL,
	`useStatus` enum('official_metadata','commercial_discovery_only','pending_verification') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `catalog_book_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalog_book_source_title_attribution_unique` UNIQUE(`sourceUrl`,`titleEn`,`attribution`)
);
--> statement-breakpoint
CREATE TABLE `catalog_source_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`academicYearId` int NOT NULL,
	`linkedSourceId` int,
	`organization` varchar(180) NOT NULL,
	`title` varchar(300) NOT NULL,
	`sourceUrl` varchar(1000) NOT NULL,
	`sourceCategory` enum('official_catalog','official_governance','instructional_reference','commercial_catalog') NOT NULL,
	`languageVersion` enum('bn','en','bilingual','not_applicable') NOT NULL DEFAULT 'not_applicable',
	`eligibility` enum('official_evidence','supplementary_reference','discovery_only','blocked_unverified') NOT NULL,
	`permittedUse` enum('curriculum_alignment','chapter_discovery','catalogue_discovery','governance_reference','none') NOT NULL,
	`reusePermission` enum('not_required_for_metadata','not_granted','requires_written_permission','unknown') NOT NULL,
	`reviewNotes` text NOT NULL,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `catalog_source_leads_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalog_source_url_unique` UNIQUE(`sourceUrl`)
);
--> statement-breakpoint
CREATE TABLE `catalog_subjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`academicYearId` int NOT NULL,
	`subjectId` int,
	`groupSlug` varchar(40) NOT NULL,
	`subjectCode` varchar(20) NOT NULL,
	`paperLabel` varchar(60) NOT NULL,
	`nameEn` varchar(160) NOT NULL,
	`nameBn` varchar(220) NOT NULL,
	`englishVersionAvailability` enum('verified','not_verified','none') NOT NULL DEFAULT 'not_verified',
	`verificationStatus` enum('verified','needs_review') NOT NULL DEFAULT 'needs_review',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `catalog_subjects_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalog_subject_year_group_code_paper` UNIQUE(`academicYearId`,`groupSlug`,`subjectCode`,`paperLabel`)
);
--> statement-breakpoint
ALTER TABLE `catalog_book_entries` ADD CONSTRAINT `cbe_year_fk` FOREIGN KEY (`academicYearId`) REFERENCES `academic_years`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `catalog_book_entries` ADD CONSTRAINT `cbe_lead_fk` FOREIGN KEY (`catalogSourceLeadId`) REFERENCES `catalog_source_leads`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `catalog_book_entries` ADD CONSTRAINT `cbe_subject_fk` FOREIGN KEY (`catalogSubjectId`) REFERENCES `catalog_subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `catalog_source_leads` ADD CONSTRAINT `csl_year_fk` FOREIGN KEY (`academicYearId`) REFERENCES `academic_years`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `catalog_source_leads` ADD CONSTRAINT `csl_source_fk` FOREIGN KEY (`linkedSourceId`) REFERENCES `sources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `catalog_subjects` ADD CONSTRAINT `cs_year_fk` FOREIGN KEY (`academicYearId`) REFERENCES `academic_years`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `catalog_subjects` ADD CONSTRAINT `cs_subject_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `catalog_book_subject_idx` ON `catalog_book_entries` (`academicYearId`,`catalogSubjectId`);--> statement-breakpoint
CREATE INDEX `catalog_source_eligibility_idx` ON `catalog_source_leads` (`academicYearId`,`eligibility`);--> statement-breakpoint
CREATE INDEX `catalog_subject_platform_idx` ON `catalog_subjects` (`subjectId`);
