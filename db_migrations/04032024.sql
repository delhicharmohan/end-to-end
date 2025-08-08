ALTER TABLE `orders` ADD `automation_type` VARCHAR(50) NULL DEFAULT NULL AFTER `txnFee`;
-- bank_data => 'As bank Data scrapping'
-- bank_sms => 'As bank SMS notificaton'