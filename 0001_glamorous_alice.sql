CREATE TABLE `priceAnalyses` (
        `id` int AUTO_INCREMENT NOT NULL,
        `userId` int NOT NULL,
        `fileName` varchar(255) NOT NULL,
        `fileContent` text NOT NULL,               `recordCount` int NOT NULL,
        `dateRangeStart` varchar(10),              `dateRangeEnd` varchar(10),
        `createdAt` timestamp NOT NULL DEFAULT (now()),
        `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT `priceAnalyses_id` PRIMARY KEY(`id`)                               );                                         --> statement-breakpoint                   ALTER TABLE `priceAnalyses` ADD CONSTRAINT `priceAnalyses_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON 
