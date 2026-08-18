ALTER TABLE `diet_uploads` ADD `importBatch` int;--> statement-breakpoint
ALTER TABLE `menu_days` ADD `importBatch` int;--> statement-breakpoint
ALTER TABLE `menu_days` ADD `menuCode` varchar(16);