CREATE TABLE `apontamentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numeroApontamento` int NOT NULL,
	`data` timestamp NOT NULL,
	`edificacao` varchar(255) NOT NULL,
	`pavimento` varchar(50) NOT NULL,
	`setor` varchar(50) NOT NULL,
	`sala` varchar(255) NOT NULL,
	`disciplina` varchar(100) NOT NULL,
	`divergencia` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `apontamentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ifcFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`filePath` varchar(500) NOT NULL,
	`edificacao` varchar(255),
	`uploadedBy` int NOT NULL,
	`fileSize` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ifcFiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `salas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`edificacao` varchar(255) NOT NULL,
	`pavimento` varchar(50) NOT NULL,
	`setor` varchar(50) NOT NULL,
	`nome` varchar(255) NOT NULL,
	`numeroSala` varchar(50) NOT NULL,
	`augin` int DEFAULT 0,
	`status` varchar(100) NOT NULL DEFAULT 'PENDENTE',
	`dataVerificada` timestamp,
	`faltouDisciplina` varchar(255),
	`revisar` varchar(255),
	`obs` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `salas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileSize` int NOT NULL,
	`uploadedBy` int NOT NULL,
	`totalSalas` int DEFAULT 0,
	`totalApontamentos` int DEFAULT 0,
	`status` varchar(50) NOT NULL DEFAULT 'PROCESSADO',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `uploads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
