-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- 主機： 127.0.0.1
-- 產生時間： 2025-01-09 09:40:34
-- 伺服器版本： 10.4.32-MariaDB
-- PHP 版本： 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- 資料庫： `mosquito2`
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

-- --------------------------------------------------------

--
-- 資料表結構 `device`
--

CREATE TABLE `device` (
  `device_id` varchar(255) NOT NULL,
  `device_name` varchar(255) NOT NULL,
  `device_network` varchar(255) DEFAULT NULL,
  `device_address` varchar(255) DEFAULT NULL,
  `device_temperature` float DEFAULT NULL,
  `device_humidity` float DEFAULT NULL,
  `take_time` int(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- 傾印資料表的資料 `device`
--

INSERT INTO `device` (`device_id`, `device_name`, `device_network`, `device_address`, `device_temperature`, `device_humidity`, `take_time`) VALUES
('A1', 'Device1', '1', '24.9937,121.2970', NULL, NULL, 50000),
('A2', 'Device2', '1', '25.0340,121.564', NULL, NULL, 333),
('A3', 'Device3', '1', '25.0340,121.564', NULL, NULL, 333),
('A4', 'Device4', '1', '25.0340,121.5645', NULL, NULL, 333),
('A5', 'Device5', '1', '25.0340,121.5645', NULL, NULL, 333),
('A6', 'Device6', '1', '25.0340,121.564', NULL, NULL, 333),
('A7', 'Device7', '1', '25.0340,121.5645', NULL, NULL, 333);

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
('0', '25.0340,121.5645', 'new abc', '20250103094529', 'uploads/Device1/20250103094529/detected_A1.jpg', 'A1', '1', 2),
('1', '25.0340,121.5645', 'new abc', '20250103114529', 'uploads/Device1/20250103114529/detected_A2.jpg', 'A1', '1', 3),
('10', '25.0340,121.5645', 'new abc', '20250103134529', 'uploads/Device3/20250103134529/detected_A3.jpg', 'A3', '1', 5),
('11', '25.0340,121.5645', 'new abc', '20250103154529', 'uploads/Device3/20250103154529/detected_A4.jpg', 'A3', '1', 1),
('12', '25.0340,121.5645', 'new abc', '20250103094529', 'uploads/Device6/20250103094529/detected_A1.jpg', 'A6', '1', 2),
('13', '25.0340,121.5645', 'new abc', '20250103114529', 'uploads/Device6/20250103114529/detected_A2.jpg', 'A6', '1', 3),
('14', '25.0340,121.5645', 'new abc', '20250103134529', 'uploads/Device6/20250103134529/detected_A3.jpg', 'A6', '1', 5),
('15', '25.0340,121.5645', 'new abc', '20250103154529', 'uploads/Device6/20250103154529/detected_A4.jpg', 'A6', '1', 1),
('16', '25.0340,121.5645', 'new abc', '20250103094529', 'uploads/Device4/20250103094529/detected_A1.jpg', 'A4', '0', 2),
('17', '25.0340,121.5645', 'new abc', '20250103114529', 'uploads/Device4/20250103114529/detected_A2.jpg', 'A4', '0', 3),
('18', '25.0340,121.5645', 'new abc', '20250103134529', 'uploads/Device4/20250103134529/detected_A3.jpg', 'A4', '0', 5),
('19', '25.0340,121.5645', 'new abc', '20250103154529', 'uploads/Device4/20250103154529/detected_A4.jpg', 'A4', '0', 1),
('2', '25.0340,121.5645', 'new abc', '20250103134529', 'uploads/Device1/20250103134529/detected_A3.jpg', 'A1', '1', 5),
('20', '25.0340,121.5645', 'new abc', '20250103094529', 'uploads/Device5/20250103094529/detected_A1.jpg', 'A5', '0', 2),
('21', '25.0340,121.5645', 'new abc', '20250103114529', 'uploads/Device5/20250103114529/detected_A2.jpg', 'A5', '0', 3),
('22', '25.0340,121.5645', 'new abc', '20250103134529', 'uploads/Device5/20250103134529/detected_A3.jpg', 'A5', '0', 5),
('23', '25.0340,121.5645', 'new abc', '20250103154529', 'uploads/Device5/20250103154529/detected_A4.jpg', 'A5', '0', 1),
('24', '25.0340,121.5645', 'new abc', '20250103094529', 'uploads/Device7/20250103094529/detected_A1.jpg', 'A7', '0', 2),
('25', '25.0340,121.5645', 'new abc', '20250103114529', 'uploads/Device7/20250103114529/detected_A2.jpg', 'A7', '0', 3),
('26', '25.0340,121.5645', 'new abc', '20250103134529', 'uploads/Device7/20250103134529/detected_A3.jpg', 'A7', '0', 5),
('27', '25.0340,121.5645', 'new abc', '20250103154529', 'uploads/Device7/20250103154529/detected_A4.jpg', 'A7', '0', 1),
('28', '24.9937,121.2970', 'Taoyuan City', '20250109133316', 'uploads/Device1/20250109133316/detected_202519133312.jpg', 'A1', '1', 0),
('29', '24.9937,121.2970', 'Taoyuan City', '20250109133532', 'uploads/Device1/20250109133532/detected_202519133529.jpg', 'A1', '1', 1),
('3', '25.0340,121.5645', 'new abc', '20250103154529', 'uploads/Device1/20250103154529/detected_A4.jpg', 'A1', '1', 1),
('30', '24.9937,121.2970', 'Taoyuan City', '20250109142301', 'uploads/Device1/20250109142301/detected_202519142258.jpg', 'A1', '1', 0),
('31', '24.9937,121.2970', 'Taoyuan City', '20250109142324', 'uploads/Device1/20250109142324/detected_202519142320.jpg', 'A1', '1', 0),
('32', '24.9937,121.2970', 'Taoyuan City', '20250109142346', 'uploads/Device1/20250109142346/detected_202519142342.jpg', 'A1', '1', 0),
('33', '24.9937,121.2970', 'Taoyuan City', '20250109142538', 'uploads/Device1/20250109142538/detected_202519142535.jpg', 'A1', '1', 0),
('34', '24.9937,121.2970', 'Taoyuan City', '20250109143708', 'uploads/Device1/20250109143708/detected_20251914374.jpg', 'A1', '1', 0),
('35', '24.9937,121.2970', 'Taoyuan City', '20250109143824', 'uploads/Device1/20250109143824/detected_202519143820.jpg', 'A1', '1', 0),
('36', '24.9937,121.2970', 'Taoyuan City', '20250109144321', 'uploads/Device1/20250109144321/detected_202519144318.jpg', 'A1', '1', 0),
('37', '24.9937,121.2970', 'Taoyuan City', '20250109151704', 'uploads/Device1/20250109151704/detected_20251915170.jpg', 'A1', '1', 7),
('38', '24.9937,121.2970', 'Taoyuan City', '20250109151757', 'uploads/Device1/20250109151757/detected_202519151754.jpg', 'A1', '1', 9),
('39', '24.9937,121.2970', 'Taoyuan City', '20250109151806', 'uploads/Device1/20250109151806/detected_20251915182.jpg', 'A1', '1', 9),
('4', '25.0340,121.5645', 'new abc', '20250103094529', 'uploads/Device2/20250103094529/detected_A1.jpg', 'A2', '1', 2),
('40', '24.9937,121.2970', 'Taoyuan City', '20250109151938', 'uploads/Device1/20250109151938/detected_202519151934.jpg', 'A1', '1', 11),
('41', '24.9937,121.2970', 'Taoyuan City', '20250109152659', 'uploads/Device1/20250109152659/detected_202519152655.jpg', 'A1', '1', 11),
('42', '24.9937,121.2970', 'Taoyuan City', '20250109152721', 'uploads/Device1/20250109152721/detected_202519152717.jpg', 'A1', '1', 8),
('43', '24.9937,121.2970', 'Taoyuan City', '20250109153935', 'uploads/Device1/20250109153935/detected_202519153931.jpg', 'A1', '1', 9),
('44', '24.9937,121.2970', 'Taoyuan City', '20250109160335', 'uploads/Device1/20250109160335/detected_20251916331.jpg', 'A1', '1', 1),
('45', '24.9937,121.2970', 'Taoyuan City', '20250109160429', 'uploads/Device1/20250109160429/detected_20251916426.jpg', 'A1', '1', 1),
('46', '24.9937,121.2970', 'Taoyuan City', '20250109160524', 'uploads/Device1/20250109160524/detected_20251916521.jpg', 'A1', '1', 1),
('47', '24.9937,121.2970', 'Taoyuan City', '20250109162158', 'uploads/Device1/20250109162158/detected_202519162155.jpg', 'A1', '1', 0),
('48', '24.9937,121.2970', 'Taoyuan City', '20250109162345', 'uploads/Device1/20250109162345/detected_202519162342.jpg', 'A1', '1', 2),
('5', '25.0340,121.5645', 'new abc', '20250103114529', 'uploads/Device2/20250103114529/detected_A2.jpg', 'A2', '1', 3),
('6', '25.0340,121.5645', 'new abc', '20250103134529', 'uploads/Device2/20250103134529/detected_A3.jpg', 'A2', '1', 5),
('7', '25.0340,121.5645', 'new abc', '20250103154529', 'uploads/Device2/20250103154529/detected_A4.jpg', 'A2', '1', 1),
('8', '25.0340,121.5645', 'new abc', '20250103094529', 'uploads/Device3/20250103094529/detected_A1.jpg', 'A3', '1', 2),
('9', '25.0340,121.5645', 'new abc', '20250103114529', 'uploads/Device3/20250103114529/detected_A2.jpg', 'A3', '1', 3);

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
('0', '1');

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
(1, '0', '4', 'GR_0', 906, 1211, 993, 1299, 1),
(2, '0', '4', 'GR_1', 1103, 994, 1171, 1091, 1),
(3, '1', '2', 'W_0', 1461, 1156, 1545, 1240, 1),
(4, '1', '2', 'W_1', 909, 1213, 991, 1297, 0),
(5, '1', '2', 'W_2', 1107, 994, 1169, 1094, 0),
(6, '2', '2', 'W_0', 1461, 1156, 1545, 1239, 0),
(7, '2', '2', 'W_1', 1792, 826, 1871, 915, 1),
(8, '2', '2', 'W_2', 1438, 665, 1505, 771, 1),
(9, '2', '2', 'W_3', 1107, 996, 1169, 1095, 0),
(10, '2', '2', 'W_4', 909, 1213, 991, 1297, 0),
(11, '3', '2', 'W_0', 909, 1214, 991, 1297, 0),
(12, '4', '4', 'GR_0', 906, 1211, 993, 1299, 1),
(13, '4', '4', 'GR_1', 1103, 994, 1171, 1091, 1),
(14, '5', '2', 'W_0', 1461, 1156, 1545, 1240, 1),
(15, '5', '2', 'W_1', 909, 1213, 991, 1297, 0),
(16, '5', '2', 'W_2', 1107, 994, 1169, 1094, 0),
(17, '6', '2', 'W_0', 1461, 1156, 1545, 1239, 0),
(18, '6', '2', 'W_1', 1792, 826, 1871, 915, 1),
(19, '6', '2', 'W_2', 1438, 665, 1505, 771, 1),
(20, '6', '2', 'W_3', 1107, 996, 1169, 1095, 0),
(21, '6', '2', 'W_4', 909, 1213, 991, 1297, 0),
(22, '7', '2', 'W_0', 909, 1214, 991, 1297, 0),
(23, '8', '4', 'GR_0', 906, 1211, 993, 1299, 1),
(24, '8', '4', 'GR_1', 1103, 994, 1171, 1091, 1),
(25, '9', '2', 'W_0', 1461, 1156, 1545, 1240, 1),
(26, '9', '2', 'W_1', 909, 1213, 991, 1297, 0),
(27, '9', '2', 'W_2', 1107, 994, 1169, 1094, 0),
(28, '10', '2', 'W_0', 1461, 1156, 1545, 1239, 0),
(29, '10', '2', 'W_1', 1792, 826, 1871, 915, 1),
(30, '10', '2', 'W_2', 1438, 665, 1505, 771, 1),
(31, '10', '2', 'W_3', 1107, 996, 1169, 1095, 0),
(32, '10', '2', 'W_4', 909, 1213, 991, 1297, 0),
(33, '11', '2', 'W_0', 909, 1214, 991, 1297, 0),
(34, '12', '4', 'GR_0', 906, 1211, 993, 1299, 1),
(35, '12', '4', 'GR_1', 1103, 994, 1171, 1091, 1),
(36, '13', '2', 'W_0', 1461, 1156, 1545, 1240, 1),
(37, '13', '2', 'W_1', 909, 1213, 991, 1297, 0),
(38, '13', '2', 'W_2', 1107, 994, 1169, 1094, 0),
(39, '14', '2', 'W_0', 1461, 1156, 1545, 1239, 0),
(40, '14', '2', 'W_1', 1792, 826, 1871, 915, 1),
(41, '14', '2', 'W_2', 1438, 665, 1505, 771, 1),
(42, '14', '2', 'W_3', 1107, 996, 1169, 1095, 0),
(43, '14', '2', 'W_4', 909, 1213, 991, 1297, 0),
(44, '15', '2', 'W_0', 909, 1214, 991, 1297, 0),
(45, '16', '4', 'GR_0', 906, 1211, 993, 1299, 1),
(46, '16', '4', 'GR_1', 1103, 994, 1171, 1091, 1),
(47, '17', '2', 'W_0', 1461, 1156, 1545, 1240, 1),
(48, '17', '2', 'W_1', 909, 1213, 991, 1297, 0),
(49, '17', '2', 'W_2', 1107, 994, 1169, 1094, 0),
(50, '18', '2', 'W_0', 1461, 1156, 1545, 1239, 0),
(51, '18', '2', 'W_1', 1792, 826, 1871, 915, 1),
(52, '18', '2', 'W_2', 1438, 665, 1505, 771, 1),
(53, '18', '2', 'W_3', 1107, 996, 1169, 1095, 0),
(54, '18', '2', 'W_4', 909, 1213, 991, 1297, 0),
(55, '19', '2', 'W_0', 909, 1214, 991, 1297, 0),
(56, '20', '4', 'GR_0', 906, 1211, 993, 1299, 1),
(57, '20', '4', 'GR_1', 1103, 994, 1171, 1091, 1),
(58, '21', '2', 'W_0', 1461, 1156, 1545, 1240, 1),
(59, '21', '2', 'W_1', 909, 1213, 991, 1297, 0),
(60, '21', '2', 'W_2', 1107, 994, 1169, 1094, 0),
(61, '22', '2', 'W_0', 1461, 1156, 1545, 1239, 0),
(62, '22', '2', 'W_1', 1792, 826, 1871, 915, 1),
(63, '22', '2', 'W_2', 1438, 665, 1505, 771, 1),
(64, '22', '2', 'W_3', 1107, 996, 1169, 1095, 0),
(65, '22', '2', 'W_4', 909, 1213, 991, 1297, 0),
(66, '23', '2', 'W_0', 909, 1214, 991, 1297, 0),
(67, '24', '4', 'GR_0', 906, 1211, 993, 1299, 1),
(68, '24', '4', 'GR_1', 1103, 994, 1171, 1091, 1),
(69, '25', '2', 'W_0', 1461, 1156, 1545, 1240, 1),
(70, '25', '2', 'W_1', 909, 1213, 991, 1297, 0),
(71, '25', '2', 'W_2', 1107, 994, 1169, 1094, 0),
(72, '26', '2', 'W_0', 1461, 1156, 1545, 1239, 0),
(73, '26', '2', 'W_1', 1792, 826, 1871, 915, 1),
(74, '26', '2', 'W_2', 1438, 665, 1505, 771, 1),
(75, '26', '2', 'W_3', 1107, 996, 1169, 1095, 0),
(76, '26', '2', 'W_4', 909, 1213, 991, 1297, 0),
(77, '27', '2', 'W_0', 909, 1214, 991, 1297, 0),
(78, '29', '0', 'H_0', 652, 532, 827, 617, 1),
(79, '37', '0', 'H_0', 1239, 1115, 1327, 1168, 1),
(80, '37', '0', 'H_1', 1784, 721, 1869, 776, 1),
(81, '37', '0', 'H_2', 857, 986, 936, 1037, 1),
(82, '37', '0', 'H_3', 2172, 371, 2264, 468, 1),
(83, '37', '0', 'H_4', 1264, 497, 1342, 546, 1),
(84, '37', '0', 'H_5', 660, 381, 738, 425, 1),
(85, '37', '0', 'H_6', 1479, 295, 1505, 359, 1),
(86, '38', '0', 'H_0', 601, 348, 665, 418, 1),
(87, '38', '0', 'H_1', 1239, 1115, 1327, 1169, 0),
(88, '38', '0', 'H_2', 855, 986, 935, 1040, 0),
(89, '38', '0', 'H_3', 1784, 721, 1868, 778, 0),
(90, '38', '0', 'H_4', 2171, 370, 2263, 476, 0),
(91, '38', '0', 'H_5', 1208, 311, 1276, 370, 1),
(92, '38', '0', 'H_6', 1495, 107, 1550, 139, 1),
(93, '38', '0', 'H_7', 1478, 296, 1504, 358, 0),
(94, '38', '0', 'H_8', 2080, 690, 2111, 746, 1),
(95, '39', '0', 'H_0', 600, 350, 664, 419, 0),
(96, '39', '0', 'H_1', 1239, 1116, 1324, 1168, 0),
(97, '39', '0', 'H_2', 1784, 720, 1867, 777, 0),
(98, '39', '0', 'H_3', 856, 986, 935, 1041, 0),
(99, '39', '0', 'H_4', 2169, 371, 2265, 477, 0),
(100, '39', '0', 'H_5', 1207, 310, 1277, 372, 0),
(101, '39', '0', 'H_6', 1495, 108, 1551, 139, 0),
(102, '39', '0', 'H_7', 1478, 295, 1505, 358, 0),
(103, '39', '0', 'H_8', 2082, 691, 2110, 746, 0),
(104, '40', '0', 'H_0', 1883, 392, 1975, 477, 1),
(105, '40', '0', 'H_1', 601, 355, 665, 419, 0),
(106, '40', '0', 'H_2', 1239, 1115, 1326, 1169, 0),
(107, '40', '0', 'H_3', 2169, 416, 2204, 475, 1),
(108, '40', '0', 'H_4', 1207, 304, 1284, 372, 1),
(109, '40', '0', 'H_5', 1317, 808, 1369, 881, 1),
(110, '40', '0', 'H_6', 1020, 615, 1067, 665, 1),
(111, '40', '0', 'H_7', 588, 966, 652, 1030, 1),
(112, '40', '0', 'H_8', 2081, 690, 2111, 746, 0),
(113, '40', '0', 'H_9', 1495, 108, 1552, 139, 0),
(114, '40', '0', 'H_10', 1478, 295, 1504, 358, 0),
(115, '41', '0', 'H_0', 2183, 342, 2235, 428, 1),
(116, '41', '0', 'H_1', 1105, 933, 1189, 977, 1),
(117, '41', '0', 'H_2', 2028, 1038, 2176, 1139, 1),
(118, '41', '0', 'H_3', 2028, 1033, 2102, 1104, 1),
(119, '41', '0', 'H_4', 1019, 617, 1068, 666, 0),
(120, '41', '0', 'H_5', 2092, 1066, 2175, 1138, 1),
(121, '41', '0', 'H_6', 2174, 340, 2235, 476, 1),
(122, '41', '0', 'H_7', 2076, 1041, 2174, 1140, 1),
(123, '41', '0', 'H_8', 2027, 1033, 2128, 1129, 1),
(124, '41', '0', 'H_9', 2044, 2, 2152, 111, 1),
(125, '41', '0', 'H_10', 2100, 350, 2142, 432, 1),
(126, '42', '0', 'H_0', 1104, 933, 1188, 977, 0),
(127, '42', '0', 'H_1', 2183, 342, 2236, 442, 0),
(128, '42', '0', 'H_2', 2024, 1036, 2178, 1139, 0),
(129, '42', '0', 'H_3', 2089, 1065, 2176, 1139, 0),
(130, '42', '0', 'H_4', 2173, 340, 2236, 477, 0),
(131, '42', '0', 'H_5', 2028, 1031, 2103, 1110, 0),
(132, '42', '0', 'H_6', 1020, 619, 1069, 666, 0),
(133, '42', '0', 'H_7', 2054, 7, 2153, 110, 0),
(134, '43', '0', 'H_0', 1279, 812, 1352, 897, 1),
(135, '43', '0', 'H_1', 1079, 581, 1147, 624, 1),
(136, '43', '3', 'WH_2', 2096, 348, 2144, 432, 0),
(137, '43', '0', 'H_3', 1035, 993, 1114, 1038, 1),
(138, '43', '0', 'H_4', 899, 557, 998, 653, 1),
(139, '43', '3', 'WH_5', 2168, 422, 2205, 477, 0),
(140, '43', '0', 'H_6', 1021, 771, 1129, 845, 1),
(141, '43', '0', 'H_7', 1249, 387, 1292, 466, 1),
(142, '43', '0', 'H_8', 887, 243, 995, 308, 1),
(143, '44', '4', 'GR_0', 1131, 900, 1172, 990, 1),
(144, '45', '4', 'GR_0', 1130, 899, 1171, 990, 0),
(145, '46', '4', 'GR_0', 1130, 900, 1170, 990, 0),
(146, '48', '0', 'H_0', 962, 869, 1041, 960, 1),
(147, '48', '2', 'W_1', 2163, 414, 2202, 482, 1);

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
('323', '002', 'A2'),
('U201f6f1df6d28b73aab28c10cca83ed6', '001', 'A1');

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
