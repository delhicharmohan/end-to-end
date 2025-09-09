-- Migration: Add expires_at to orders and create instant_payout_chats table
-- Date: 2025-09-06

-- Up: add nullable expires_at to orders for payin expiry tracking
ALTER TABLE `orders`
  ADD COLUMN `expires_at` DATETIME NULL AFTER `updatedAt`;

-- Up: persistent chat messages for payout-based chats
CREATE TABLE IF NOT EXISTS `instant_payout_chats` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `order_id` BIGINT NOT NULL,
  `ref_id` VARCHAR(64) NOT NULL,
  `sender_type` ENUM('payer','payee','admin') NOT NULL,
  `sender_vendor` VARCHAR(64) NULL,
  `message` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_order_id_created_at` (`order_id`, `created_at`),
  INDEX `idx_ref_id_created_at` (`ref_id`, `created_at`)
);

-- Down (commented):
-- ALTER TABLE `orders` DROP COLUMN `expires_at`;
-- DROP TABLE `instant_payout_chats`;
