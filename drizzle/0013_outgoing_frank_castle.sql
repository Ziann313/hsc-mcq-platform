ALTER TABLE `questions` ADD `admissionTrack` enum('du','buet','medical');--> statement-breakpoint
CREATE INDEX `question_admission_track_idx` ON `questions` (`admissionTrack`,`status`);