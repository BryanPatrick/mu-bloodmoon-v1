-- Blood Moon currently operates exclusively on Season 6 through Rage Fighter.
-- Remove dependent knowledge rows explicitly because the legacy relations were
-- created without ON DELETE CASCADE in production.

DELETE FROM `EquipmentRecord`
WHERE `minSeason` > 6;

DELETE FROM `EquipmentSeason`
WHERE `season` > 6 OR `visibility` = 'FUTURE_SEASON';

DELETE FROM `EquipmentVariant`
WHERE `minSeason` > 6;

UPDATE `KnowledgeEntry` AS `entry`
INNER JOIN `KnowledgeEntry` AS `futureEntry`
        ON `entry`.`duplicateOfId` = `futureEntry`.`id`
SET `entry`.`duplicateOfId` = NULL
WHERE `futureEntry`.`scope` = 'FUTURE_SEASON'
   OR `futureEntry`.`seasonMin` > 6;

DELETE `entryAsset`
FROM `KnowledgeEntryAsset` AS `entryAsset`
INNER JOIN `KnowledgeEntry` AS `entry`
        ON `entry`.`id` = `entryAsset`.`entryId`
WHERE `entry`.`scope` = 'FUTURE_SEASON'
   OR `entry`.`seasonMin` > 6;

DELETE FROM `KnowledgeEntry`
WHERE `scope` = 'FUTURE_SEASON'
   OR `seasonMin` > 6;

UPDATE `KnowledgeEntry`
SET `scope` = 'SEASON_6',
    `seasonMax` = LEAST(COALESCE(`seasonMax`, 6), 6)
WHERE `scope` = 'ALL_SEASONS';

DELETE FROM `GameClass`
WHERE `minSeason` > 6
   OR `key` IN (
     'dragon-knight',
     'soul-wizard',
     'noble-elf',
     'magic-knight',
     'empire-lord',
     'grow-lancer',
     'mirage-lancer',
     'rune-mage',
     'rune-spell-master',
     'grand-rune-master',
     'slayer',
     'royal-slayer',
     'master-slayer',
     'gun-crusher',
     'gun-breaker',
     'master-gun-breaker',
     'white-wizard',
     'light-wizard',
     'shine-wizard',
     'lemuria',
     'warmage',
     'archmage',
     'illusion-knight',
     'mirage-knight',
     'illusion-master',
     'alchemist'
   );

DELETE FROM `GameCharacter`
WHERE `minSeason` > 6
   OR `key` IN (
     'grow-lancer',
     'rune-mage',
     'slayer',
     'gun-crusher',
     'white-wizard',
     'lemuria',
     'illusion-knight',
     'alchemist'
   );
