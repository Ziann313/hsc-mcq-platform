CREATE TABLE `payment_proofs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`paymentId` int NOT NULL,
	`submittedByUserId` int NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`contentType` enum('image/jpeg','image/png','image/webp') NOT NULL,
	`originalFilename` varchar(180) NOT NULL,
	`byteSize` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payment_proofs_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_proofs_paymentId_unique` UNIQUE(`paymentId`),
	CONSTRAINT `payment_proofs_storageKey_unique` UNIQUE(`storageKey`)
);
--> statement-breakpoint
ALTER TABLE `payment_proofs` ADD CONSTRAINT `payment_proofs_paymentId_payments_id_fk` FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_proofs` ADD CONSTRAINT `payment_proofs_submittedByUserId_users_id_fk` FOREIGN KEY (`submittedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `payment_proof_submitter_idx` ON `payment_proofs` (`submittedByUserId`,`createdAt`);