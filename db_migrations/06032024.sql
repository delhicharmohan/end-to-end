CREATE TABLE `bank_responses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `account_no` varchar(255) NOT NULL,
  `utr` varchar(255) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `recipt_code` varchar(255) NOT NULL,
  `status` tinyint(2) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8