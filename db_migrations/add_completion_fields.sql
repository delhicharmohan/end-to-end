-- Add completion tracking fields to instant_payout_batches table
ALTER TABLE instant_payout_batches 
ADD COLUMN completion_method VARCHAR(50) DEFAULT NULL COMMENT 'Method used for completion: webhook, utr_verification, admin_approval, screenshot_upload, etc.',
ADD COLUMN confirmed_by VARCHAR(255) DEFAULT NULL COMMENT 'Who/what confirmed the completion';

-- Add completion tracking field to orders table
ALTER TABLE orders 
ADD COLUMN completion_method VARCHAR(50) DEFAULT NULL COMMENT 'Method used for completion';

-- Create indexes for better performance
CREATE INDEX idx_completion_method ON instant_payout_batches(completion_method);
CREATE INDEX idx_confirmed_by ON instant_payout_batches(confirmed_by);
CREATE INDEX idx_orders_completion_method ON orders(completion_method);

-- Create completion_logs table for detailed audit trail
CREATE TABLE `completion_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `payin_order_id` int(11) NOT NULL,
  `batch_id` int(11) DEFAULT NULL,
  `completion_method` varchar(50) NOT NULL,
  `confirmed_by` varchar(255) DEFAULT NULL,
  `transaction_id` varchar(255) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` enum('success','failed','pending') NOT NULL DEFAULT 'pending',
  `additional_data` text COMMENT 'JSON data with additional completion details',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payin_order` (`payin_order_id`),
  KEY `idx_batch` (`batch_id`),
  KEY `idx_method` (`completion_method`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Audit trail for completion events';

