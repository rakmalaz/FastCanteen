-- ========================================================
-- FastCanteen Database Schema & Seed Data v2
-- Kampus 2 UIN Sunan Ampel Surabaya
-- ========================================================

CREATE DATABASE IF NOT EXISTS `fastcanteen_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `fastcanteen_db`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `notifikasi`;
DROP TABLE IF EXISTS `detail_pesanan`;
DROP TABLE IF EXISTS `pesanan`;
DROP TABLE IF EXISTS `menu`;
DROP TABLE IF EXISTS `tenant`;
DROP TABLE IF EXISTS `pengguna`;
SET FOREIGN_KEY_CHECKS = 1;

-- --------------------------------------------------------
-- 1. Tabel: `pengguna`
-- --------------------------------------------------------
CREATE TABLE `pengguna` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nama` varchar(100) NOT NULL,
  `nim` varchar(20) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `kata_sandi` varchar(255) NOT NULL,
  `peran` enum('mahasiswa','tenant','admin') NOT NULL,
  `no_hp` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 2. Tabel: `tenant`
-- --------------------------------------------------------
CREATE TABLE `tenant` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nama_tenant` varchar(100) NOT NULL,
  `lokasi_stan` varchar(100) NOT NULL,
  `id_admin_pendaftar` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_tenant_admin` (`id_admin_pendaftar`),
  CONSTRAINT `fk_tenant_admin` FOREIGN KEY (`id_admin_pendaftar`) REFERENCES `pengguna` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 3. Tabel: `menu`
-- --------------------------------------------------------
CREATE TABLE `menu` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_tenant` int(11) NOT NULL,
  `nama_menu` varchar(100) NOT NULL,
  `harga` decimal(10,2) NOT NULL,
  `foto` varchar(255) DEFAULT NULL,
  `status_tersedia` enum('tersedia','habis') DEFAULT 'tersedia',
  PRIMARY KEY (`id`),
  KEY `fk_menu_tenant` (`id_tenant`),
  CONSTRAINT `fk_menu_tenant` FOREIGN KEY (`id_tenant`) REFERENCES `tenant` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 4. Tabel: `pesanan`
-- (Revisi: jam_pengambilan dihapus, status dipecah menjadi status_pembayaran & status_pesanan)
-- --------------------------------------------------------
CREATE TABLE `pesanan` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_mahasiswa` int(11) NOT NULL,
  `id_tenant` int(11) NOT NULL,
  `total_harga` decimal(10,2) NOT NULL,
  `metode_pembayaran` varchar(50) NOT NULL,
  `status_pembayaran` enum('Belum Dibayar','Sudah Dibayar','Dikembalikan') NOT NULL DEFAULT 'Sudah Dibayar' COMMENT 'Status Pembayaran: Belum Dibayar (Menunggu upload bukti/verifikasi), Sudah Dibayar (Lunas terverifikasi/QRIS), Dikembalikan (Dana di-refund jika pesanan dibatalkan)',
  `status_pesanan` enum('Menunggu','Diproses','Siap Diambil','Selesai','Dibatalkan') NOT NULL DEFAULT 'Menunggu' COMMENT 'Status Pemesanan: Menunggu (Pesanan masuk belum diproses), Diproses (Sedang dimasak/disiapkan oleh stan tenant), Siap Diambil (Pesanan matang siap diambil mahasiswa), Selesai (Pesanan telah diambil pembeli), Dibatalkan (Pesanan ditolak/dibatalkan tenant atau pembeli)',
  `bukti_pembayaran` varchar(255) DEFAULT NULL,
  `catatan` text DEFAULT NULL,
  `waktu_transaksi` datetime DEFAULT current_timestamp(),
  `waktu_perubahan_status` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_pesanan_mahasiswa` (`id_mahasiswa`),
  KEY `fk_pesanan_tenant` (`id_tenant`),
  CONSTRAINT `fk_pesanan_mahasiswa` FOREIGN KEY (`id_mahasiswa`) REFERENCES `pengguna` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pesanan_tenant` FOREIGN KEY (`id_tenant`) REFERENCES `tenant` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 5. Tabel: `detail_pesanan`
-- --------------------------------------------------------
CREATE TABLE `detail_pesanan` (
  `id_detail` int(11) NOT NULL AUTO_INCREMENT,
  `id_pesanan` int(11) NOT NULL,
  `id_menu` int(11) NOT NULL,
  `jumlah_pesanan` int(11) NOT NULL,
  `sub_harga` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id_detail`),
  KEY `fk_detail_pesanan` (`id_pesanan`),
  KEY `fk_detail_menu` (`id_menu`),
  CONSTRAINT `fk_detail_menu` FOREIGN KEY (`id_menu`) REFERENCES `menu` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_detail_pesanan` FOREIGN KEY (`id_pesanan`) REFERENCES `pesanan` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 6. Tabel: `notifikasi` (BARU)
-- --------------------------------------------------------
CREATE TABLE `notifikasi` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_penerima` int(11) NOT NULL,
  `id_pengirim` int(11) DEFAULT NULL,
  `id_pesanan` int(11) DEFAULT NULL,
  `judul` varchar(150) NOT NULL,
  `pesan` text NOT NULL,
  `tipe` enum('pesanan_baru','status_diproses','siap_diambil','selesai','dibatalkan','promo','info') NOT NULL DEFAULT 'info',
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_penerima` (`id_penerima`),
  KEY `idx_pesanan` (`id_pesanan`),
  CONSTRAINT `fk_notif_penerima` FOREIGN KEY (`id_penerima`) REFERENCES `pengguna` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notif_pengirim` FOREIGN KEY (`id_pengirim`) REFERENCES `pengguna` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_notif_pesanan` FOREIGN KEY (`id_pesanan`) REFERENCES `pesanan` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ========================================================
-- DATA SEEDING (Lengkap & Terverifikasi)
-- ========================================================

-- Seed: pengguna (5 baris)
INSERT INTO `pengguna` (`id`, `nama`, `nim`, `email`, `kata_sandi`, `peran`, `no_hp`) VALUES
(1, 'Elka Putra Prasetiyo', '09010625007', 'elka@uinsa.ac.id', '123456', 'mahasiswa', '081234567890'),
(2, 'Rayhan Akmal Azhari', '09020625073', 'rayhan@uinsa.ac.id', '123456', 'mahasiswa', '081234567891'),
(3, 'Bu Siti Fatimah', NULL, 'siti@fastcanteen.com', '123456', 'tenant', '081298765432'),
(4, 'Cak Slamet', NULL, 'slamet@fastcanteen.com', '123456', 'tenant', '081298765433'),
(5, 'Super Admin Kantin', NULL, 'admin@fastcanteen.com', '123456', 'admin', '081299998888');

-- Seed: tenant (3 baris)
INSERT INTO `tenant` (`id`, `nama_tenant`, `lokasi_stan`, `id_admin_pendaftar`) VALUES
(1, 'Kantin Mbak Siti (Ayam Geprek & Soto)', 'Stan 01 - Lantai 1 Kantin Belakang UINSA Kampus 2', 3),
(2, 'Kantin Berkah Cak Slamet (Penyetan & Nasgor)', 'Stan 02 - Lantai 1 Kantin Belakang UINSA Kampus 2', 4),
(3, 'Kedai Barokah (Jus Buah & Kopi Segar)', 'Stan 03 - Lantai 1 Kantin Belakang UINSA Kampus 2', 5);

-- Seed: menu (12 baris)
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

-- Seed: pesanan (tanpa jam_pengambilan, dengan status_pembayaran & status_pesanan)
INSERT INTO `pesanan` (`id`, `id_mahasiswa`, `id_tenant`, `total_harga`, `metode_pembayaran`, `status_pembayaran`, `status_pesanan`, `bukti_pembayaran`, `catatan`, `waktu_transaksi`, `waktu_perubahan_status`) VALUES
(1, 1, 1, 25000.00, 'QRIS', 'Sudah Dibayar', 'Diproses', 'https://via.placeholder.com/300?text=Bukti+QRIS+Lunas', 'Pedas sedang, koya dipisah', '2026-10-11 16:45:20', '2026-10-11 16:45:20'),
(2, 1, 1, 16000.00, 'QRIS', 'Sudah Dibayar', 'Siap Diambil', NULL, 'Kuah dipisah ya bu', '2026-10-11 16:57:21', '2026-10-11 16:57:21');

-- Seed: detail_pesanan
INSERT INTO `detail_pesanan` (`id_detail`, `id_pesanan`, `id_menu`, `jumlah_pesanan`, `sub_harga`) VALUES
(1, 1, 1, 1, 13000.00),
(2, 1, 2, 1, 12000.00),
(3, 2, 4, 1, 4000.00),
(4, 2, 2, 1, 12000.00);

-- Seed: notifikasi
INSERT INTO `notifikasi` (`id`, `id_penerima`, `id_pengirim`, `id_pesanan`, `judul`, `pesan`, `tipe`, `is_read`, `created_at`) VALUES
(1, 1, 3, 1, 'Pesanan Sedang Dimasak 👨‍🍳', 'Pesanan #1 Anda sedang dimasak oleh Kantin Mbak Siti. Mohon ditunggu ya!', 'status_diproses', 0, '2026-10-11 16:46:00'),
(2, 1, 3, 2, 'Makanan Siap! Segera Ambil 🎉', 'Pesanan #2 sudah matang dan siap diambil di stan Kantin Mbak Siti.', 'siap_diambil', 0, '2026-10-11 17:05:00');
