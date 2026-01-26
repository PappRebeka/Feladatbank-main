-- --------------------------------------------------------
-- Hoszt:                        193.227.198.214
-- Szerver verzió:               10.11.13-MariaDB-0ubuntu0.24.04.1 - Ubuntu 24.04
-- Szerver OS:                   debian-linux-gnu
-- HeidiSQL Verzió:              12.7.0.6850
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- Struktúra mentése tábla 2021SZ_reczeg_david. Alfeladat
CREATE TABLE IF NOT EXISTS `Alfeladat` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `Leiras` text NOT NULL,
  `FeladatId` int(11) NOT NULL,
  `FajlId` int(11) DEFAULT NULL,
  `Pont` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=281 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tábla adatainak mentése 2021SZ_reczeg_david.Alfeladat: ~0 rows (hozzávetőleg)

-- Struktúra mentése tábla 2021SZ_reczeg_david. Fajl
CREATE TABLE IF NOT EXISTS `Fajl` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `Meret` int(11) DEFAULT NULL,
  `BackendNev` text DEFAULT NULL,
  `AlapNev` text CHARACTER SET utf8mb3 COLLATE utf8mb3_hungarian_ci DEFAULT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB AUTO_INCREMENT=94 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tábla adatainak mentése 2021SZ_reczeg_david.Fajl: ~0 rows (hozzávetőleg)

-- Struktúra mentése tábla 2021SZ_reczeg_david. Feladatok
CREATE TABLE IF NOT EXISTS `Feladatok` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `Nev` text NOT NULL,
  `Leiras` text DEFAULT NULL,
  `Evfolyam` int(11) NOT NULL DEFAULT 0,
  `Tantargy` text NOT NULL,
  `Tema` text NOT NULL,
  `Nehezseg` int(11) DEFAULT NULL,
  `Tanar` int(11) NOT NULL DEFAULT 0,
  `Archivalva` int(11) DEFAULT 0,
  `Csillagozva` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=404 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tábla adatainak mentése 2021SZ_reczeg_david.Feladatok: ~0 rows (hozzávetőleg)

-- Struktúra mentése tábla 2021SZ_reczeg_david. Hibajelentes
CREATE TABLE IF NOT EXISTS `Hibajelentes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `Email` text NOT NULL,
  `Nev` text NOT NULL,
  `Ido` text NOT NULL,
  `Message` text NOT NULL,
  `Javitva` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tábla adatainak mentése 2021SZ_reczeg_david.Hibajelentes: ~0 rows (hozzávetőleg)

-- Struktúra mentése tábla 2021SZ_reczeg_david. Intezmenyek
CREATE TABLE IF NOT EXISTS `Intezmenyek` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `IntezmenyNev` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tábla adatainak mentése 2021SZ_reczeg_david.Intezmenyek: ~0 rows (hozzávetőleg)

-- Struktúra mentése tábla 2021SZ_reczeg_david. Kozzetett
CREATE TABLE IF NOT EXISTS `Kozzetett` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `FeladatId` int(11) DEFAULT 0,
  `Tanar` int(11) DEFAULT NULL,
  `kurzusNev` text DEFAULT NULL,
  `kurzusId` text DEFAULT NULL,
  `kurzusFeladatId` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=146 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tábla adatainak mentése 2021SZ_reczeg_david.Kozzetett: ~0 rows (hozzávetőleg)

-- Struktúra mentése tábla 2021SZ_reczeg_david. Megosztott
CREATE TABLE IF NOT EXISTS `Megosztott` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `FeladatId` int(11) NOT NULL DEFAULT 0,
  `FeladoId` int(11) NOT NULL DEFAULT 0,
  `VevoId` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tábla adatainak mentése 2021SZ_reczeg_david.Megosztott: ~0 rows (hozzávetőleg)

-- Struktúra mentése tábla 2021SZ_reczeg_david. Naplo
CREATE TABLE IF NOT EXISTS `Naplo` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `Tipus` text DEFAULT NULL,
  `TimeStamp` datetime DEFAULT NULL,
  `Message` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=587 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- Tábla adatainak mentése 2021SZ_reczeg_david.Naplo: ~0 rows (hozzávetőleg)

-- Struktúra mentése tábla 2021SZ_reczeg_david. Users
CREATE TABLE IF NOT EXISTS `Users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `Nev` text NOT NULL,
  `Email` text DEFAULT NULL,
  `Jelszo` text NOT NULL,
  `Jogosultsag` text NOT NULL,
  `AccessToken` text DEFAULT NULL,
  `RefreshToken` text DEFAULT NULL,
  `UserToken` text DEFAULT NULL,
  `AccessEletTartam` datetime DEFAULT '0000-00-00 00:00:00',
  `HatterSzin` text DEFAULT NULL,
  `IntezmenyId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=202 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tábla adatainak mentése 2021SZ_reczeg_david.Users: ~2 rows (hozzávetőleg)
INSERT INTO `Users` (`id`, `Nev`, `Email`, `Jelszo`, `Jogosultsag`, `AccessToken`, `RefreshToken`, `UserToken`, `AccessEletTartam`, `HatterSzin`, `IntezmenyId`) VALUES
	(1, '', 'sz7.cloudconsole@gmail.com', '', 'Mailsender', 'ya29.a0ATi6K2vGfIceI0HEy9G051-VmTJL-OvxnbKBtIOpUyoaSSW6WFjuGO1CapRs4szELHJtO7QaMON0e3I4DaC1SJTDTAgSIyD9d5Lur6djZF-VePYpcszfRdNCY0QF1vgQthxq1ZixY6ud7HJsPlCZQJM9B8F8gmDNsyI7LrOGvUfP6cqyIYS7cdSvdDX1QSIhc-yc_fcP7QaCgYKAQgSARcSFQHGX2MiWUsA8QIYjeK-4gc7tKVPwA0209', '1//03RBbpzbUtcFiCgYIARAAGAMSNwF-L9IrxDG3UFlJmq-HZQUN9KDeJGH1UEY4_AQoQlKtU1-hjm9acWbEbQAliRFZewzMZSs9hoQ', 'b3464r5a993dd4500455g787jub1727e', '2025-11-05 14:17:43', '', NULL),
	(2, 'admin', '', '21232f297a57a5a743894a0e4a801fc3', 'Főadmin', 'ya29.a0AUMWg_Ino3MMZLU5Lh7ioy_9w2B1T5C4PDBV_iyEzp83_hfAIBru34jmXsE5MwHhRV6zjOX6XVWuPZBVRywkbp9Yt9LZjKxcEBWJxHUsJ7HNnK0WHboCfSG9Dk9pYEzqNma3Pstrp-aTIoI3RsySXwnN-WL8D02FfXIbtimSLq1NzsdJxcSKesFh7FrA9DDQLnCRyHaMswaCgYKAQsSAQ4SFQHGX2MioY-UFWmYzaq83NqTxn810Q0209', '1//03I2Bo4Yf-HM_CgYIARAAGAMSNwF-L9IrOjbeRUm1CQ3SpbcdEV7_nvTcIJmJ0pHCk4BcsrrqwE1HrNlflLivpWwrZQv2LnSGs_U', 'bd9448ca99e4b450045c178283b1727e', '2026-01-20 14:54:28', 'rgb(119 241 205)', NULL);

INSERT INTO `Intezmenyek` (`id`, `IntezmenyNev`) VALUES
  (1,  'Zalaegerszegi SZC Csány László Technikum');
/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
