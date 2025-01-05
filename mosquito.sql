-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- 主機： 127.0.0.1
-- 產生時間： 2025-01-04 17:03:54
-- 伺服器版本： 10.4.28-MariaDB
-- PHP 版本： 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- 資料庫： `mosquito`
--

-- --------------------------------------------------------

--
-- 資料表結構 `data`
--

CREATE TABLE `data` (
  `data_id` varchar(255) NOT NULL,
  `photo_id` varchar(255) DEFAULT NULL,
  `device_id` varchar(255) NOT NULL,
  `photo_time` varchar(50) NOT NULL,
  `m0` int(11) DEFAULT NULL,
  `m1` int(11) DEFAULT NULL,
  `m2` int(11) DEFAULT NULL,
  `m3` int(11) DEFAULT NULL,
  `m4` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- 傾印資料表的資料 `data`
--

INSERT INTO `data` (`data_id`, `photo_id`, `device_id`, `photo_time`, `m0`, `m1`, `m2`, `m3`, `m4`) VALUES
('0', '0', 'A1', '20250101024529', 0, 0, 0, 0, 1),
('1', '1', 'A1', '20250101034529', 0, 0, 0, 0, 2),
('10', '4', 'A2', '20250101084529', 0, 0, 0, 90, 0),
('2', '2', 'A1', '20250101044529', 0, 0, 0, 0, 3),
('3', '3', 'A1', '20250101054529', 0, 0, 0, 0, 4),
('4', '4', 'A1', '20250101064529', 0, 0, 0, 0, 5),
('5', '5', 'A1', '20250101074529', 0, 0, 0, 0, 6);

-- --------------------------------------------------------

--
-- 資料表結構 `device`
--

CREATE TABLE `device` (
  `device_id` varchar(255) NOT NULL,
  `device_name` varchar(255) NOT NULL,
  `device_network` varchar(255) DEFAULT NULL,
  `device_temperature` float DEFAULT NULL,
  `device_humidity` float DEFAULT NULL,
  `take_time` int(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- 傾印資料表的資料 `device`
--

INSERT INTO `device` (`device_id`, `device_name`, `device_network`, `device_temperature`, `device_humidity`, `take_time`) VALUES
('A1', 'Device1', '1', NULL, NULL, 250);

-- --------------------------------------------------------

--
-- 資料表結構 `mosquito`
--

CREATE TABLE `mosquito` (
  `mosquito_id` varchar(255) NOT NULL,
  `mosquito_name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- 傾印資料表的資料 `mosquito`
--

INSERT INTO `mosquito` (`mosquito_id`, `mosquito_name`) VALUES
('0', 'H'),
('1', 'IG'),
('2', 'W'),
('3', 'WH'),
('4', 'GR');

-- --------------------------------------------------------

--
-- 資料表結構 `photo`
--

CREATE TABLE `photo` (
  `photo_id` varchar(255) NOT NULL,
  `photo_address` varchar(255) DEFAULT NULL,
  `photo_location` varchar(255) DEFAULT NULL,
  `photo_time` varchar(255) DEFAULT NULL,
  `photo_storage` varchar(255) DEFAULT NULL,
  `device_id` varchar(255) DEFAULT NULL,
  `msg` varchar(10) NOT NULL,
  `count` int(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- 傾印資料表的資料 `photo`
--

INSERT INTO `photo` (`photo_id`, `photo_address`, `photo_location`, `photo_time`, `photo_storage`, `device_id`, `msg`, `count`) VALUES
('0', '25.0340,121.5645', 'new abc', '20250101024529', 'uploads/Device1/20250101024529/detected_Device1_20250101024529_image.jpg', 'A1', '1', 1),
('1', '25.0340,121.5645', 'new abc', '20250101034529', 'uploads/Device1/20250101034529/detected_Device1_20250101034529_image.jpg', 'A1', '1', 2),
('2', '25.0340,121.5645', 'new abc', '20250101044529', 'uploads/Device1/20250101044529/detected_Device1_20250101044529_image.jpg', 'A1', '1', 3),
('3', '25.0340,120.5645', 'new abc', '20250101054529', 'uploads/Device1/20250101054529/detected_Device1_20250101054529_image.jpg', 'A1', '1', 4),
('4', '24.0340,120.5645', 'new abc', '20250101064529', 'uploads/Device1/20250101064529/detected_Device1_20250101064529_image.jpg', 'A1', '1', 5),
('5', '25.0340,121.5645', 'new abc', '20250101074529', 'uploads/Device1/20250101074529/detected_Device1_20250101074529_image.jpg', 'A1', '1', 6);

-- --------------------------------------------------------

--
-- 資料表結構 `photo_trans`
--

CREATE TABLE `photo_trans` (
  `take_photo` varchar(255) NOT NULL,
  `photo_take` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- 傾印資料表的資料 `photo_trans`
--

INSERT INTO `photo_trans` (`take_photo`, `photo_take`) VALUES
('1', '0');

-- --------------------------------------------------------

--
-- 資料表結構 `refresh`
--

CREATE TABLE `refresh` (
  `device_id` varchar(255) NOT NULL,
  `refresh_time` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- 資料表結構 `seg_photo`
--

CREATE TABLE `seg_photo` (
  `SP_id` int(30) NOT NULL,
  `photo_id` varchar(255) DEFAULT NULL,
  `mosquito_id` varchar(255) DEFAULT NULL,
  `SP_storage` varchar(255) DEFAULT NULL,
  `x1` float DEFAULT NULL,
  `y1` float DEFAULT NULL,
  `x2` float DEFAULT NULL,
  `y2` float DEFAULT NULL,
  `new` int(1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- 傾印資料表的資料 `seg_photo`
--

INSERT INTO `seg_photo` (`SP_id`, `photo_id`, `mosquito_id`, `SP_storage`, `x1`, `y1`, `x2`, `y2`, `new`) VALUES
(1, '0', '4', 'GR_1', 906, 1211, 993, 1300, 2),
(2, '1', '4', 'GR_1', 907, 1211, 993, 1299, 0),
(3, '1', '4', 'GR_2', 1105, 990, 1164, 1050, 2),
(4, '2', '4', 'GR_1', 1257, 814, 1326, 869, 2),
(5, '2', '4', 'GR_2', 907, 1211, 993, 1299, 0),
(6, '2', '4', 'GR_3', 1105, 990, 1164, 1050, 0),
(7, '3', '4', 'GR_1', 906, 1211, 993, 1299, 0),
(8, '3', '4', 'GR_2', 1806, 734, 1882, 837, 2),
(9, '3', '4', 'GR_3', 1257, 814, 1326, 870, 0),
(10, '3', '4', 'GR_4', 1105, 990, 1164, 1050, 0),
(11, '4', '4', 'GR_1', 1773, 1132, 1846, 1223, 2),
(12, '4', '4', 'GR_2', 907, 1211, 993, 1299, 0),
(13, '4', '4', 'GR_3', 1257, 814, 1325, 869, 0),
(14, '4', '4', 'GR_4', 1806, 734, 1882, 836, 0),
(15, '4', '4', 'GR_5', 1105, 989, 1164, 1050, 0),
(16, '5', '4', 'GR_1', 1773, 1132, 1846, 1223, 0),
(17, '5', '4', 'GR_2', 907, 1211, 993, 1299, 0),
(18, '5', '4', 'GR_3', 1257, 814, 1326, 869, 0),
(19, '5', '4', 'GR_4', 1806, 734, 1882, 836, 0),
(20, '5', '4', 'GR_5', 971, 675, 1031, 734, 2),
(21, '5', '4', 'GR_6', 1105, 990, 1164, 1050, 0);

-- --------------------------------------------------------

--
-- 資料表結構 `user`
--

CREATE TABLE `user` (
  `user_line` varchar(255) NOT NULL,
  `user_name` varchar(255) NOT NULL,
  `device_id` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- 傾印資料表的資料 `user`
--

INSERT INTO `user` (`user_line`, `user_name`, `device_id`) VALUES
('U4920d2c5579fd42a803dfce7f313bd40', '001', NULL),
('U8dbaf7b9bc56970a63202016d92cc4bd', '123', NULL);

-- --------------------------------------------------------

--
-- 資料表結構 `user_relation`
--

CREATE TABLE `user_relation` (
  `user_line` varchar(255) DEFAULT NULL,
  `device_id` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- 傾印資料表的資料 `user_relation`
--

INSERT INTO `user_relation` (`user_line`, `device_id`) VALUES
('U8dbaf7b9bc56970a63202016d92cc4bd', 'A1'),
('	\r\nU4920d2c5579fd42a803dfce7f313bd40', 'A1');

--
-- 已傾印資料表的索引
--

--
-- 資料表索引 `data`
--
ALTER TABLE `data`
  ADD PRIMARY KEY (`data_id`),
  ADD KEY `photo_id` (`photo_id`);

--
-- 資料表索引 `device`
--
ALTER TABLE `device`
  ADD PRIMARY KEY (`device_id`);

--
-- 資料表索引 `mosquito`
--
ALTER TABLE `mosquito`
  ADD PRIMARY KEY (`mosquito_id`);

--
-- 資料表索引 `photo`
--
ALTER TABLE `photo`
  ADD PRIMARY KEY (`photo_id`),
  ADD KEY `device_id` (`device_id`);

--
-- 資料表索引 `photo_trans`
--
ALTER TABLE `photo_trans`
  ADD PRIMARY KEY (`take_photo`);

--
-- 資料表索引 `refresh`
--
ALTER TABLE `refresh`
  ADD PRIMARY KEY (`device_id`,`refresh_time`);

--
-- 資料表索引 `seg_photo`
--
ALTER TABLE `seg_photo`
  ADD PRIMARY KEY (`SP_id`),
  ADD KEY `photo_id` (`photo_id`),
  ADD KEY `mosquito_id` (`mosquito_id`);

--
-- 資料表索引 `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`user_line`),
  ADD KEY `device_id` (`device_id`);

--
-- 已傾印資料表的限制式
--

--
-- 資料表的限制式 `data`
--
ALTER TABLE `data`
  ADD CONSTRAINT `data_ibfk_1` FOREIGN KEY (`photo_id`) REFERENCES `photo` (`photo_id`);

--
-- 資料表的限制式 `photo`
--
ALTER TABLE `photo`
  ADD CONSTRAINT `photo_ibfk_1` FOREIGN KEY (`device_id`) REFERENCES `device` (`device_id`);

--
-- 資料表的限制式 `refresh`
--
ALTER TABLE `refresh`
  ADD CONSTRAINT `refresh_ibfk_1` FOREIGN KEY (`device_id`) REFERENCES `device` (`device_id`);

--
-- 資料表的限制式 `seg_photo`
--
ALTER TABLE `seg_photo`
  ADD CONSTRAINT `seg_photo_ibfk_1` FOREIGN KEY (`photo_id`) REFERENCES `photo` (`photo_id`),
  ADD CONSTRAINT `seg_photo_ibfk_2` FOREIGN KEY (`mosquito_id`) REFERENCES `mosquito` (`mosquito_id`);

--
-- 資料表的限制式 `user`
--
ALTER TABLE `user`
  ADD CONSTRAINT `user_ibfk_1` FOREIGN KEY (`device_id`) REFERENCES `device` (`device_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
