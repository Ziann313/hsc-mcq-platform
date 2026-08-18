ALTER TABLE `books` ADD `languageVersion` enum('bn','en','bilingual') DEFAULT 'bn' NOT NULL;--> statement-breakpoint
ALTER TABLE `questions` ADD `contentLanguage` enum('bn','en','bilingual') DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE `sources` ADD `languageVersion` enum('bn','en','bilingual','not_applicable') DEFAULT 'not_applicable' NOT NULL;--> statement-breakpoint
ALTER TABLE `sources` ADD `accessClassification` enum('official_public','licensed_public','permission_required','unverified') DEFAULT 'official_public' NOT NULL;--> statement-breakpoint
