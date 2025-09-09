-- Migration: Add per-order callback URL storage
-- Date: 2025-09-06

-- Up: add nullable callback_url to orders
ALTER TABLE `orders`
  ADD COLUMN `callback_url` VARCHAR(2048) NULL AFTER `returnUrl`;

-- Down: remove callback_url from orders
-- NOTE: Execute only if you need to rollback this migration
-- ALTER TABLE `orders` DROP COLUMN `callback_url`;
