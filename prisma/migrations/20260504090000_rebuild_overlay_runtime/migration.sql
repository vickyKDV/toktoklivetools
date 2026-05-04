SET FOREIGN_KEY_CHECKS=0;

DROP TABLE IF EXISTS `OverlayDesign`;
DROP TABLE IF EXISTS `Overlay`;

CREATE TABLE `Overlay` (
  `id` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `kind` ENUM('CHAT', 'GIFT', 'LEADERBOARD', 'DOCK', 'CUSTOM') NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `draftSchema` JSON NOT NULL,
  `publishedSchema` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `publishedAt` DATETIME(3) NULL,

  INDEX `Overlay_workspaceId_kind_idx`(`workspaceId`, `kind`),
  INDEX `Overlay_updatedAt_idx`(`updatedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Overlay`
  ADD CONSTRAINT `Overlay_workspaceId_fkey`
  FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

SET FOREIGN_KEY_CHECKS=1;
