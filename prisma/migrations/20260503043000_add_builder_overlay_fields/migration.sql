SET FOREIGN_KEY_CHECKS=0;

RENAME TABLE `Overlay` TO `Overlay_migration_old`;

CREATE TABLE `Overlay` (
  `id` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `key` VARCHAR(191) NOT NULL,
  `type` VARCHAR(191) NOT NULL DEFAULT 'LEGACY',
  `theme` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL CHECK (json_valid(`theme`)),
  `schemaJson` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL CHECK (json_valid(`schemaJson`)),
  `isActive` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `Overlay_key_key`(`key`),
  INDEX `Overlay_workspaceId_idx`(`workspaceId`),
  INDEX `Overlay_workspaceId_isActive_idx`(`workspaceId`, `isActive`),
  INDEX `Overlay_workspaceId_type_idx`(`workspaceId`, `type`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `Overlay` (`id`, `workspaceId`, `name`, `key`, `type`, `theme`, `schemaJson`, `isActive`, `createdAt`, `updatedAt`)
SELECT `id`, `workspaceId`, `name`, `key`, 'LEGACY', `theme`, NULL, false, `createdAt`, `updatedAt`
FROM `Overlay_migration_old`;

DROP TABLE `Overlay_migration_old`;

ALTER TABLE `Overlay` ADD CONSTRAINT `Overlay_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

SET FOREIGN_KEY_CHECKS=1;
