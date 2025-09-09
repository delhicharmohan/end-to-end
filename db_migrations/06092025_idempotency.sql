-- Migration: Idempotency support for create-payin against payout
-- Date: 2025-09-06

CREATE TABLE IF NOT EXISTS `instant_payout_idempotency` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `idempotency_key` VARCHAR(128) NOT NULL,
  `vendor` VARCHAR(64) NOT NULL,
  `payout_ref_id` VARCHAR(64) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `payin_ref_id` VARCHAR(64) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_idempotency_key` (`idempotency_key`)
);
