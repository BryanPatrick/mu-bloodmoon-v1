-- A pending encrypted credential must reserve its legacy login before the MU write.
CREATE UNIQUE INDEX `GameAccountCredential_legacyLogin_key` ON `GameAccountCredential`(`legacyLogin`);
