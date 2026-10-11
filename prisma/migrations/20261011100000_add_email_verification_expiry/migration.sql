-- Store an expiry for the hashed, one-time email verification code.
ALTER TABLE `User` ADD COLUMN `verificationTokenExpires` DATETIME(3) NULL;
