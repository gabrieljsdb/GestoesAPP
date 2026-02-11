CREATE TABLE `localAdmins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(100) NOT NULL,
	`email` varchar(320),
	`passwordHash` text NOT NULL,
	`fullName` varchar(255),
	`isActive` boolean NOT NULL DEFAULT true,
	`lastLogin` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `localAdmins_id` PRIMARY KEY(`id`),
	CONSTRAINT `localAdmins_username_unique` UNIQUE(`username`)
);
