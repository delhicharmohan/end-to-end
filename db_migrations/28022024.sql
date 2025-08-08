CREATE TABLE `app_auth` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `salt` varchar(128) DEFAULT NULL,
  `vendor` varchar(128) DEFAULT NULL,
  `public_key` text,
  `private_key` text,
  `status` tinyint(4) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `salt` (`salt`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8


CREATE TABLE `app_licence` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `vendor` varchar(128) DEFAULT NULL,
  `code` varchar(128) DEFAULT NULL,
  `status` tinyint(4) NOT NULL COMMENT '0->unused,1->used,2->unlinked',
  `unique_id` varchar(128) DEFAULT NULL,
  `type` enum('ios','android') DEFAULT NULL,
  `licence_token` varchar(36) DEFAULT NULL,
  `valid_till` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8