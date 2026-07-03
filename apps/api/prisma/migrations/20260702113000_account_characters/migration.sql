CREATE TYPE "CharacterRuntimeStatus" AS ENUM ('ONLINE', 'OFFLINE', 'BLOCKED');

CREATE TABLE "AccountCharacter" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "className" TEXT NOT NULL,
  "level" INTEGER NOT NULL DEFAULT 1,
  "reset" INTEGER NOT NULL DEFAULT 0,
  "masterReset" INTEGER NOT NULL DEFAULT 0,
  "map" TEXT NOT NULL DEFAULT 'Lorencia',
  "guild" TEXT NOT NULL DEFAULT '-',
  "pkStatus" TEXT NOT NULL DEFAULT 'Commoner',
  "status" "CharacterRuntimeStatus" NOT NULL DEFAULT 'OFFLINE',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AccountCharacter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountCharacter_key_key" ON "AccountCharacter"("key");
CREATE UNIQUE INDEX "AccountCharacter_name_key" ON "AccountCharacter"("name");
CREATE INDEX "AccountCharacter_accountId_idx" ON "AccountCharacter"("accountId");
CREATE INDEX "AccountCharacter_className_idx" ON "AccountCharacter"("className");
CREATE INDEX "AccountCharacter_status_idx" ON "AccountCharacter"("status");

ALTER TABLE "AccountCharacter" ADD CONSTRAINT "AccountCharacter_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
