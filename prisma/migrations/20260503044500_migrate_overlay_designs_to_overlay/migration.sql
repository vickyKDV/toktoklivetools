INSERT INTO `Overlay` (`id`, `workspaceId`, `name`, `key`, `type`, `theme`, `schemaJson`, `isActive`, `createdAt`, `updatedAt`)
SELECT
  `OverlayDesign`.`id`,
  `OverlayDesign`.`workspaceId`,
  `OverlayDesign`.`name`,
  CONCAT('builder_', `OverlayDesign`.`id`),
  'BUILDER',
  JSON_OBJECT('kind', 'BUILDER', 'schema', `OverlayDesign`.`schema`),
  `OverlayDesign`.`schema`,
  `OverlayDesign`.`isActive`,
  `OverlayDesign`.`createdAt`,
  `OverlayDesign`.`updatedAt`
FROM `OverlayDesign`
WHERE NOT EXISTS (
  SELECT 1
  FROM `Overlay`
  WHERE `Overlay`.`id` = `OverlayDesign`.`id`
);
