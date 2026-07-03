CREATE TYPE "EquipmentClassLinkRole" AS ENUM ('BASE', 'PLAYABLE');

CREATE TABLE "GameCharacter" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "minSeason" INTEGER NOT NULL DEFAULT 1,
  "isSeasonSixBase" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GameCharacter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GameClass" (
  "id" TEXT NOT NULL,
  "characterId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "tier" INTEGER NOT NULL DEFAULT 1,
  "minSeason" INTEGER NOT NULL DEFAULT 1,
  "isSeasonSixBase" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GameClass_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EquipmentClassLink" (
  "equipmentId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "characterId" TEXT NOT NULL,
  "role" "EquipmentClassLinkRole" NOT NULL DEFAULT 'PLAYABLE',
  "source" TEXT NOT NULL DEFAULT 'remap',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EquipmentClassLink_pkey" PRIMARY KEY ("equipmentId","classId","role")
);

CREATE TABLE "EquipmentSeason" (
  "id" TEXT NOT NULL,
  "equipmentId" TEXT NOT NULL,
  "season" INTEGER NOT NULL,
  "visibility" "KnowledgeScope" NOT NULL DEFAULT 'NEEDS_REVIEW',
  "source" TEXT NOT NULL DEFAULT 'remap',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EquipmentSeason_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GameCharacter_key_key" ON "GameCharacter"("key");
CREATE INDEX "GameCharacter_sortOrder_idx" ON "GameCharacter"("sortOrder");
CREATE INDEX "GameCharacter_minSeason_idx" ON "GameCharacter"("minSeason");
CREATE INDEX "GameCharacter_isSeasonSixBase_idx" ON "GameCharacter"("isSeasonSixBase");

CREATE UNIQUE INDEX "GameClass_key_key" ON "GameClass"("key");
CREATE INDEX "GameClass_characterId_idx" ON "GameClass"("characterId");
CREATE INDEX "GameClass_tier_idx" ON "GameClass"("tier");
CREATE INDEX "GameClass_minSeason_idx" ON "GameClass"("minSeason");
CREATE INDEX "GameClass_isSeasonSixBase_idx" ON "GameClass"("isSeasonSixBase");

CREATE INDEX "EquipmentClassLink_classId_idx" ON "EquipmentClassLink"("classId");
CREATE INDEX "EquipmentClassLink_characterId_idx" ON "EquipmentClassLink"("characterId");
CREATE INDEX "EquipmentClassLink_role_idx" ON "EquipmentClassLink"("role");

CREATE UNIQUE INDEX "EquipmentSeason_equipmentId_season_key" ON "EquipmentSeason"("equipmentId", "season");
CREATE INDEX "EquipmentSeason_season_idx" ON "EquipmentSeason"("season");
CREATE INDEX "EquipmentSeason_visibility_idx" ON "EquipmentSeason"("visibility");

ALTER TABLE "GameClass" ADD CONSTRAINT "GameClass_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "GameCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EquipmentClassLink" ADD CONSTRAINT "EquipmentClassLink_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "EquipmentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EquipmentClassLink" ADD CONSTRAINT "EquipmentClassLink_classId_fkey" FOREIGN KEY ("classId") REFERENCES "GameClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EquipmentClassLink" ADD CONSTRAINT "EquipmentClassLink_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "GameCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EquipmentSeason" ADD CONSTRAINT "EquipmentSeason_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "EquipmentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
