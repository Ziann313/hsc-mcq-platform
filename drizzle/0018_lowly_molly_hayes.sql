CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`subscriptionId` int,
	`planId` int NOT NULL,
	`gateway` enum('sslcommerz') NOT NULL DEFAULT 'sslcommerz',
	`internalTransactionId` varchar(64) NOT NULL,
	`gatewayTransactionId` varchar(160),
	`amountBDT` decimal(10,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'BDT',
	`status` enum('pending','success','failed','cancelled','refunded') NOT NULL DEFAULT 'pending',
	`gatewayPayload` json,
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_internalTransactionId_unique` UNIQUE(`internalTransactionId`)
);
--> statement-breakpoint
CREATE TABLE `subscription_maintenance_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscription_maintenance_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscription_maintenance_settings_scheduleCronTaskUid_unique` UNIQUE(`scheduleCronTaskUid`)
);
--> statement-breakpoint
CREATE TABLE `subscription_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(40) NOT NULL,
	`name` varchar(80) NOT NULL,
	`nameBn` varchar(120) NOT NULL,
	`description` text NOT NULL,
	`descriptionBn` text NOT NULL,
	`priceBDT` decimal(10,2) NOT NULL,
	`durationDays` int NOT NULL,
	`features` json NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscription_plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscription_plans_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planId` int,
	`planType` enum('free','premium') NOT NULL DEFAULT 'free',
	`status` enum('trial','active','expired','cancelled') NOT NULL DEFAULT 'trial',
	`trialStartedAt` timestamp NOT NULL,
	`trialEndsAt` timestamp NOT NULL,
	`subscriptionStartedAt` timestamp,
	`subscriptionEndsAt` timestamp,
	`autoRenew` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptions_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `usage_limits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`limitType` enum('practice_questions','exams','tutor_questions','image_solves') NOT NULL,
	`periodKey` varchar(20) NOT NULL,
	`usedCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `usage_limits_id` PRIMARY KEY(`id`),
	CONSTRAINT `usage_limit_user_type_period_unique` UNIQUE(`userId`,`limitType`,`periodKey`)
);
--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_subscriptionId_subscriptions_id_fk` FOREIGN KEY (`subscriptionId`) REFERENCES `subscriptions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_planId_subscription_plans_id_fk` FOREIGN KEY (`planId`) REFERENCES `subscription_plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_planId_subscription_plans_id_fk` FOREIGN KEY (`planId`) REFERENCES `subscription_plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `usage_limits` ADD CONSTRAINT `usage_limits_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `payment_user_created_idx` ON `payments` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `payment_status_created_idx` ON `payments` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `subscription_plan_active_idx` ON `subscription_plans` (`isActive`);--> statement-breakpoint
CREATE INDEX `subscription_status_expiry_idx` ON `subscriptions` (`status`,`trialEndsAt`);--> statement-breakpoint
CREATE INDEX `subscription_premium_expiry_idx` ON `subscriptions` (`planType`,`subscriptionEndsAt`);--> statement-breakpoint
CREATE INDEX `usage_limit_period_idx` ON `usage_limits` (`periodKey`);