-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 14, 2026 at 11:49 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `fastcanteen_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `detail_pesanan`
--

CREATE TABLE `detail_pesanan` (
  `id_detail` int(11) NOT NULL,
  `id_pesanan` int(11) NOT NULL,
  `id_menu` int(11) NOT NULL,
  `jumlah_pesanan` int(11) NOT NULL,
  `sub_harga` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `detail_pesanan`
--

INSERT INTO `detail_pesanan` (`id_detail`, `id_pesanan`, `id_menu`, `jumlah_pesanan`, `sub_harga`) VALUES
(1, 1, 1, 1, 13000.00),
(2, 1, 2, 1, 12000.00),
(3, 2, 12, 1, 8000.00),
(4, 3, 4, 1, 4000.00),
(5, 3, 3, 1, 6000.00),
(6, 3, 2, 1, 12000.00);

-- --------------------------------------------------------

--
-- Table structure for table `menu`
--

CREATE TABLE `menu` (
  `id` int(11) NOT NULL,
  `id_tenant` int(11) NOT NULL,
  `nama_menu` varchar(100) NOT NULL,
  `harga` decimal(10,2) NOT NULL,
  `foto` varchar(255) DEFAULT NULL,
  `status_tersedia` enum('tersedia','habis') DEFAULT 'tersedia'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `menu`
--

INSERT INTO `menu` (`id`, `id_tenant`, `nama_menu`, `harga`, `foto`, `status_tersedia`) VALUES
(1, 1, 'Ayam Geprek Sambal Bawang + Nasi', 13000.00, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&auto=format&fit=crop&q=60', 'tersedia'),
(2, 1, 'Soto Ayam Lamongan Komplit Koya', 12000.00, 'https://images.unsplash.com/photo-1572656631137-7935297eff55?w=500&auto=format&fit=crop&q=60', 'tersedia'),
(3, 1, 'Tahu & Tempe Crispy Sambal Korek', 6000.00, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60', 'tersedia'),
(4, 1, 'Es Teh Manis Jumbo', 4000.00, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=60', 'tersedia'),
(5, 2, 'Bebek Goreng Sambal Ijo + Nasi', 18000.00, 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=500&auto=format&fit=crop&q=60', 'tersedia'),
(6, 2, 'Nasi Goreng Spesial Telur UINSA', 12000.00, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=60', 'tersedia'),
(7, 2, 'Mie Dok-Dok Kuah Pedas Gurih', 11000.00, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop&q=60', 'tersedia'),
(8, 2, 'Ayam Penyet Sambal Terasi + Nasi', 14000.00, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=500&auto=format&fit=crop&q=60', 'tersedia'),
(9, 3, 'Jus Alpukat Kental Cokelat', 8000.00, 'https://images.unsplash.com/photo-1638176066666-ffb2f5d22a59?w=500&auto=format&fit=crop&q=60', 'tersedia'),
(10, 3, 'Jus Mangga Harum Manis Dingin', 8000.00, 'https://images.unsplash.com/photo-1546173159-315724a31696?w=500&auto=format&fit=crop&q=60', 'tersedia'),
(11, 3, 'Es Jeruk Peras Murni', 5000.00, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&auto=format&fit=crop&q=60', 'tersedia'),
(12, 3, 'Es Kopi Susu Gula Aren Mahasiswa', 8000.00, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop&q=60', 'tersedia');

-- --------------------------------------------------------

--
-- Table structure for table `pengguna`
--

CREATE TABLE `pengguna` (
  `id` int(11) NOT NULL,
  `nama` varchar(100) NOT NULL,
  `nim` varchar(20) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `kata_sandi` varchar(255) NOT NULL,
  `peran` enum('mahasiswa','tenant','admin') NOT NULL,
  `no_hp` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pengguna`
--

INSERT INTO `pengguna` (`id`, `nama`, `nim`, `email`, `kata_sandi`, `peran`, `no_hp`) VALUES
(1, 'Rayhan Akmal Azhari', '09020625073', 'rayhan@uinsa.ac.id', '123456', 'admin', '081234567891'),
(2, 'Putra Mahardhika Surasa', '09040625094', 'putra@uinsa.ac.id', '123456', 'admin', '081234567892'),
(3, 'Elka Putra Prasetiyo', '09010625007', 'elka@uinsa.ac.id', '123456', 'admin', '081234567890'),
(4, 'Rizki Ridhwan Arif S.', '09030625107', 'rizki@uinsa.ac.id', '123456', 'admin', '081234567893'),
(5, 'Ahmad Mahasiswa Demo', '09010625088', 'mahasiswa@uinsa.ac.id', '123456', 'mahasiswa', '081211112222'),
(6, 'Siti Aisyah Mahasiswi', '09020625055', 'aisyah@uinsa.ac.id', '123456', 'mahasiswa', '081233334444'),
(7, 'Bu Siti Fatimah', NULL, 'siti@fastcanteen.com', '123456', 'tenant', '081298765432'),
(8, 'Cak Slamet', NULL, 'slamet@fastcanteen.com', '123456', 'tenant', '081298765433'),
(9, 'Pak Joko Barokah', NULL, 'barokah@fastcanteen.com', '123456', 'tenant', '081298765434');

-- --------------------------------------------------------

--
-- Table structure for table `pesanan`
--

CREATE TABLE `pesanan` (
  `id` int(11) NOT NULL,
  `id_mahasiswa` int(11) NOT NULL,
  `id_tenant` int(11) NOT NULL,
  `jam_pengambilan` varchar(20) NOT NULL,
  `total_harga` decimal(10,2) NOT NULL,
  `metode_pembayaran` varchar(50) NOT NULL,
  `status` varchar(50) DEFAULT 'Diproses',
  `bukti_pembayaran` varchar(255) DEFAULT NULL,
  `catatan` text DEFAULT NULL,
  `waktu_transaksi` datetime DEFAULT current_timestamp(),
  `waktu_perubahan_status` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pesanan`
--

INSERT INTO `pesanan` (`id`, `id_mahasiswa`, `id_tenant`, `jam_pengambilan`, `total_harga`, `metode_pembayaran`, `status`, `bukti_pembayaran`, `catatan`, `waktu_transaksi`, `waktu_perubahan_status`) VALUES
(1, 5, 1, '11:45 WIB', 25000.00, 'QRIS', 'Diproses', 'https://via.placeholder.com/300?text=Bukti+QRIS+Lunas', 'Pedas sedang, koya dipisah', '2026-10-11 21:22:11', '2026-10-11 21:22:11'),
(2, 5, 3, '11:45 WIB (Istirahat', 8000.00, 'QRIS', 'Diproses', 'https://via.placeholder.com/400?text=Bukti+QRIS+Terverifikasi+FastCanteen', NULL, '2026-10-12 22:52:30', '2026-10-12 22:52:30'),
(3, 5, 1, '11:45 WIB (Istirahat', 22000.00, 'QRIS', 'Diproses', 'https://via.placeholder.com/400?text=Bukti+QRIS+Terverifikasi+FastCanteen', NULL, '2026-10-12 22:53:11', '2026-10-12 22:53:11');

-- --------------------------------------------------------

--
-- Table structure for table `tenant`
--

CREATE TABLE `tenant` (
  `id` int(11) NOT NULL,
  `nama_tenant` varchar(100) NOT NULL,
  `lokasi_stan` varchar(100) NOT NULL,
  `id_admin_pendaftar` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tenant`
--

INSERT INTO `tenant` (`id`, `nama_tenant`, `lokasi_stan`, `id_admin_pendaftar`) VALUES
(1, 'Kantin Mbak Siti (Ayam Geprek & Soto)', 'Stan 01 - Lantai 1 Kantin Belakang UINSA Kampus 2', 7),
(2, 'Kantin Berkah Cak Slamet (Penyetan & Nasgor)', 'Stan 02 - Lantai 1 Kantin Belakang UINSA Kampus 2', 8),
(3, 'Kedai Barokah (Jus Buah & Kopi Segar)', 'Stan 03 - Lantai 1 Kantin Belakang UINSA Kampus 2', 9);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `detail_pesanan`
--
ALTER TABLE `detail_pesanan`
  ADD PRIMARY KEY (`id_detail`),
  ADD KEY `fk_detail_pesanan` (`id_pesanan`),
  ADD KEY `fk_detail_menu` (`id_menu`);

--
-- Indexes for table `menu`
--
ALTER TABLE `menu`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_menu_tenant` (`id_tenant`);

--
-- Indexes for table `pengguna`
--
ALTER TABLE `pengguna`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `pesanan`
--
ALTER TABLE `pesanan`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_pesanan_mahasiswa` (`id_mahasiswa`),
  ADD KEY `fk_pesanan_tenant` (`id_tenant`);

--
-- Indexes for table `tenant`
--
ALTER TABLE `tenant`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_tenant_admin` (`id_admin_pendaftar`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `detail_pesanan`
--
ALTER TABLE `detail_pesanan`
  MODIFY `id_detail` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `menu`
--
ALTER TABLE `menu`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `pengguna`
--
ALTER TABLE `pengguna`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `pesanan`
--
ALTER TABLE `pesanan`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tenant`
--
ALTER TABLE `tenant`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `detail_pesanan`
--
ALTER TABLE `detail_pesanan`
  ADD CONSTRAINT `fk_detail_menu` FOREIGN KEY (`id_menu`) REFERENCES `menu` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_detail_pesanan` FOREIGN KEY (`id_pesanan`) REFERENCES `pesanan` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `menu`
--
ALTER TABLE `menu`
  ADD CONSTRAINT `fk_menu_tenant` FOREIGN KEY (`id_tenant`) REFERENCES `tenant` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `pesanan`
--
ALTER TABLE `pesanan`
  ADD CONSTRAINT `fk_pesanan_mahasiswa` FOREIGN KEY (`id_mahasiswa`) REFERENCES `pengguna` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pesanan_tenant` FOREIGN KEY (`id_tenant`) REFERENCES `tenant` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `tenant`
--
ALTER TABLE `tenant`
  ADD CONSTRAINT `fk_tenant_admin` FOREIGN KEY (`id_admin_pendaftar`) REFERENCES `pengguna` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
