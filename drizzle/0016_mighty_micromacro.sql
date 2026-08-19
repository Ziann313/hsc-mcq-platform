CREATE TABLE `exam_blueprints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examPatternVersionId` int NOT NULL,
	`configuration` json NOT NULL,
	`validationReport` json NOT NULL,
	`status` enum('draft','validated','published','archived') NOT NULL DEFAULT 'draft',
	`createdByUserId` int NOT NULL,
	`validatedAt` timestamp,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exam_blueprints_id` PRIMARY KEY(`id`),
	CONSTRAINT `exam_blueprints_examPatternVersionId_unique` UNIQUE(`examPatternVersionId`)
);
--> statement-breakpoint
ALTER TABLE `exam_attempts` ADD `currentQuestionIndex` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `exam_attempts` ADD `resultSummary` json;--> statement-breakpoint
ALTER TABLE `exam_blueprints` ADD CONSTRAINT `exam_blueprint_pattern_fk` FOREIGN KEY (`examPatternVersionId`) REFERENCES `exam_pattern_versions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_blueprints` ADD CONSTRAINT `exam_blueprint_creator_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `exam_blueprint_status_idx` ON `exam_blueprints` (`status`,`createdAt`);
