ALTER TABLE `exam_attempts` ADD `activeSessionKey` varchar(180);--> statement-breakpoint
ALTER TABLE `exam_attempts` ADD COLUMN `activeSessionKey` varchar(180);
--> statement-breakpoint
ALTER TABLE `exam_attempts` ADD CONSTRAINT `attempt_active_session_unique` UNIQUE(`activeSessionKey`);
