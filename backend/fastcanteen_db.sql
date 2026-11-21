-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3307
-- Generation Time: Nov 21, 2026 at 01:55 AM
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
(3, 2, 12, 2, 16000.00),
(5, 4, 12, 1, 8000.00),
(6, 4, 11, 1, 5000.00),
(7, 5, 3, 1, 6000.00),
(8, 6, 12, 1, 8000.00),
(9, 7, 9, 1, 8000.00),
(10, 8, 8, 1, 14000.00),
(11, 9, 7, 1, 11000.00),
(12, 10, 2, 1, 12000.00),
(13, 11, 12, 1, 8000.00),
(14, 12, 12, 1, 8000.00),
(15, 13, 6, 1, 12000.00),
(17, 15, 12, 1, 8000.00),
(18, 16, 8, 1, 14000.00),
(19, 17, 6, 1, 12000.00),
(20, 18, 12, 1, 8000.00),
(21, 19, 12, 1, 8000.00),
(22, 20, 12, 1, 8000.00),
(23, 21, 12, 1, 8000.00),
(24, 22, 12, 1, 8000.00),
(25, 23, 12, 1, 8000.00),
(28, 26, 12, 1, 8000.00),
(29, 27, 11, 1, 5000.00),
(30, 28, 12, 1, 8000.00),
(32, 30, 9, 1, 8000.00),
(34, 32, 12, 1, 8000.00),
(35, 33, 8, 1, 14000.00),
(36, 34, 5, 1, 18000.00),
(37, 35, 10, 1, 8000.00),
(38, 36, 8, 1, 14000.00),
(39, 37, 6, 1, 12000.00),
(40, 38, 11, 1, 5000.00),
(41, 39, 9, 1, 8000.00),
(42, 40, 12, 1, 8000.00);

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
(9, 3, 'Jus Alpukat Kental Cokelat', 8000.00, '/uploads/menu-9-1794685479034.jpg', 'tersedia'),
(10, 3, 'Jus Mangga Harum Manis Dingin', 8000.00, 'https://images.unsplash.com/photo-1546173159-315724a31696?w=500&auto=format&fit=crop&q=60', 'tersedia'),
(11, 3, 'Es Jeruk Peras Murni', 5000.00, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&auto=format&fit=crop&q=60', 'tersedia'),
(12, 3, 'Es Kopi Susu Gula Aren Mahasiswa', 8000.00, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop&q=60', 'tersedia');

-- --------------------------------------------------------

--
-- Table structure for table `notifikasi`
--

CREATE TABLE `notifikasi` (
  `id` int(11) NOT NULL,
  `id_penerima` int(11) NOT NULL,
  `id_pengirim` int(11) DEFAULT NULL,
  `id_pesanan` int(11) DEFAULT NULL,
  `judul` varchar(150) NOT NULL,
  `pesan` text NOT NULL,
  `tipe` enum('pesanan_baru','status_diproses','siap_diambil','selesai','dibatalkan','promo','info') NOT NULL DEFAULT 'info',
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifikasi`
--

INSERT INTO `notifikasi` (`id`, `id_penerima`, `id_pengirim`, `id_pesanan`, `judul`, `pesan`, `tipe`, `is_read`, `created_at`) VALUES
(1, 3, 2, 5, 'Pesanan Baru Masuk! 🛎️', 'Pesanan #5 dari Rayhan Akmal Azhari sebesar Rp 6.000 telah masuk. Mohon segera diproses.', 'pesanan_baru', 0, '2026-11-05 05:51:45'),
(2, 5, 2, 6, 'Pesanan Baru Masuk! 🛎️', 'Pesanan #6 dari Rayhan Akmal Azhari sebesar Rp 8.000 telah masuk. Mohon segera diproses.', 'pesanan_baru', 0, '2026-11-05 05:52:13'),
(3, 1, 3, 1, 'Pesanan Sedang Dimasak 👨‍🍳', 'Pesanan #1 Anda sedang dimasak oleh Kantin Mbak Siti (Ayam Geprek & Soto). Mohon ditunggu ya!', 'status_diproses', 0, '2026-11-05 05:54:25'),
(4, 1, 3, 1, 'Makanan Siap! Segera Ambil 🎉', 'Pesanan #1 sudah matang dan siap diambil di stan Kantin Mbak Siti (Ayam Geprek & Soto).', 'siap_diambil', 1, '2026-11-05 05:54:37'),
(5, 1, 3, 1, 'Update Pesanan #1 dari Kantin Mbak Siti (Ayam Geprek & Soto)', 'Mohon untuk segera diambil', 'info', 0, '2026-11-05 05:56:16'),
(6, 1, 3, 1, 'Pesanan Selesai ✅', 'Terima kasih! Pesanan #1 dari Kantin Mbak Siti (Ayam Geprek & Soto) telah selesai. Selamat menikmati hidangan Anda!', 'selesai', 1, '2026-11-05 05:56:18'),
(7, 5, 2, 7, 'Pesanan Baru Masuk! 🛎️', 'Pesanan #7 dari Rayhan Akmal Azhari sebesar Rp 8.000 telah masuk. Mohon segera diproses.', 'pesanan_baru', 0, '2026-11-05 06:14:53'),
(8, 4, 2, 8, 'Pesanan Baru Masuk! 🛎️', 'Pesanan #8 dari Rayhan Akmal Azhari sebesar Rp 14.000 telah masuk. Mohon segera diproses.', 'pesanan_baru', 0, '2026-11-05 11:03:20'),
(9, 4, 2, 9, 'Pesanan Baru Masuk! 🛎️', 'Pesanan #9 dari Rayhan Akmal Azhari sebesar Rp 11.000 telah masuk. Mohon segera diproses.', 'pesanan_baru', 0, '2026-11-05 11:13:00'),
(10, 3, 2, 10, 'Pesanan Baru Masuk! 🛎️', 'Pesanan #10 dari Rayhan Akmal Azhari sebesar Rp 12.000 telah masuk. Mohon segera diproses.', 'pesanan_baru', 0, '2026-11-05 11:25:09'),
(11, 5, 2, 11, 'Pesanan Baru Masuk! 🛎️', 'Pesanan #11 dari Rayhan Akmal Azhari sebesar Rp 8.000 telah masuk. Mohon segera diproses.', 'pesanan_baru', 0, '2026-11-05 11:26:09'),
(12, 5, 2, 12, 'Pesanan Baru Masuk! 🛎️', 'Pesanan #12 dari Rayhan Akmal Azhari sebesar Rp 8.000 telah masuk. Mohon segera diproses.', 'pesanan_baru', 0, '2026-11-05 11:33:19'),
(13, 4, 2, 13, 'Pesanan Baru - Perlu Verifikasi 🧾', 'Pesanan #13 dari Rayhan Akmal Azhari sebesar Rp 12.000 menunggu verifikasi pembayaran. Cek bukti dan mutasi Anda.', 'pesanan_baru', 0, '2026-11-05 22:31:33'),
(15, 2, 3, 10, 'Pesanan Sedang Dimasak 👨‍🍳', 'Pesanan #10 Anda sedang dimasak oleh Kantin Mbak Siti (Ayam Geprek & Soto). Mohon ditunggu ya!', 'status_diproses', 1, '2026-11-05 22:33:13'),
(16, 2, 3, 10, 'Makanan Siap! Segera Ambil 🎉', 'Pesanan #10 sudah matang dan siap diambil di stan Kantin Mbak Siti (Ayam Geprek & Soto).', 'siap_diambil', 0, '2026-11-05 22:33:18'),
(17, 1, 3, 2, 'Pesanan Sedang Dimasak 👨‍🍳', 'Pesanan #2 Anda sedang dimasak oleh Kantin Mbak Siti (Ayam Geprek & Soto). Mohon ditunggu ya!', 'status_diproses', 0, '2026-11-05 22:33:27'),
(18, 2, 3, 5, 'Pesanan Sedang Dimasak 👨‍🍳', 'Pesanan #5 Anda sedang dimasak oleh Kantin Mbak Siti (Ayam Geprek & Soto). Mohon ditunggu ya!', 'status_diproses', 0, '2026-11-05 22:33:29'),
(19, 2, 3, 10, 'Pesanan Selesai ✅', 'Terima kasih! Pesanan #10 dari Kantin Mbak Siti (Ayam Geprek & Soto) telah selesai. Selamat menikmati hidangan Anda!', 'selesai', 0, '2026-11-05 22:33:33'),
(20, 2, 3, 5, 'Makanan Siap! Segera Ambil 🎉', 'Pesanan #5 sudah matang dan siap diambil di stan Kantin Mbak Siti (Ayam Geprek & Soto).', 'siap_diambil', 0, '2026-11-05 22:33:35'),
(21, 2, 3, 5, 'Pesanan Selesai ✅', 'Terima kasih! Pesanan #5 dari Kantin Mbak Siti (Ayam Geprek & Soto) telah selesai. Selamat menikmati hidangan Anda!', 'selesai', 0, '2026-11-05 22:33:37'),
(22, 1, 3, 2, 'Makanan Siap! Segera Ambil 🎉', 'Pesanan #2 sudah matang dan siap diambil di stan Kantin Mbak Siti (Ayam Geprek & Soto).', 'siap_diambil', 0, '2026-11-05 22:33:40'),
(23, 1, 3, 2, 'Pesanan Selesai ✅', 'Terima kasih! Pesanan #2 dari Kantin Mbak Siti (Ayam Geprek & Soto) telah selesai. Selamat menikmati hidangan Anda!', 'selesai', 0, '2026-11-05 22:33:41'),
(24, 2, 4, 13, 'Pesanan Dibatalkan Otomatis ⏰', 'Pesanan #13 dibatalkan karena pembayaran tidak terverifikasi dalam 30 menit.', 'dibatalkan', 0, '2026-11-05 23:02:17'),
(25, 5, 2, 15, 'Pesanan Baru - Perlu Verifikasi 🧾', 'Pesanan #15 dari Rayhan Akmal Azhari sebesar Rp 8.000 menunggu verifikasi pembayaran. Cek bukti dan mutasi Anda.', 'pesanan_baru', 1, '2026-11-06 06:07:44'),
(26, 2, 4, 9, 'Pesanan Dibatalkan ❌', 'Pesanan #9 Anda dari Kantin Berkah Cak Slamet (Penyetan & Nasgor) telah dibatalkan.', 'dibatalkan', 0, '2026-11-06 06:12:19'),
(27, 2, 8, 15, 'Pesanan Dibatalkan Otomatis ⏰', 'Pesanan #15 dibatalkan karena pembayaran tidak terverifikasi dalam 30 menit.', 'dibatalkan', 0, '2026-11-06 06:38:10'),
(28, 4, 2, 16, 'Pesanan Baru - Perlu Verifikasi 🧾', 'Pesanan #16 dari Rayhan Akmal Azhari sebesar Rp 14.000 menunggu verifikasi pembayaran. Cek bukti dan mutasi Anda.', 'pesanan_baru', 0, '2026-11-09 02:22:36'),
(29, 4, 2, 17, 'Pesanan Baru - Perlu Verifikasi 🧾', 'Pesanan #17 dari Rayhan Akmal Azhari sebesar Rp 12.000 menunggu verifikasi pembayaran. Cek bukti dan mutasi Anda.', 'pesanan_baru', 0, '2026-11-09 02:23:01'),
(30, 2, 4, 16, 'Bukti Pembayaran Ditolak ⚠️', 'Bukti pembayaran pesanan #16 ditolak. Silakan unggah ulang bukti yang benar (kesempatan ke-1 dari 3).', 'info', 0, '2026-11-09 02:27:26'),
(31, 2, 4, 17, 'Pesanan Dibatalkan ❌', 'Pesanan #17 dibatalkan karena bukti pembayaran tidak valid.', 'dibatalkan', 0, '2026-11-09 02:27:46'),
(32, 8, 2, 18, 'Pesanan Baru - Perlu Verifikasi 🧾', 'Pesanan #18 dari Rayhan Akmal Azhari sebesar Rp 8.000 menunggu verifikasi pembayaran. Cek bukti dan mutasi Anda.', 'pesanan_baru', 0, '2026-11-09 02:36:56'),
(33, 8, 2, 19, 'Pesanan Baru - Perlu Verifikasi 🧾', 'Pesanan #19 dari Rayhan Akmal Azhari sebesar Rp 8.000 menunggu verifikasi pembayaran. Cek bukti dan mutasi Anda.', 'pesanan_baru', 0, '2026-11-09 02:37:09'),
(34, 8, 2, 20, 'Pesanan Baru - Perlu Verifikasi 🧾', 'Pesanan #20 dari Rayhan Akmal Azhari sebesar Rp 8.000 menunggu verifikasi pembayaran. Cek bukti dan mutasi Anda.', 'pesanan_baru', 0, '2026-11-09 02:37:20'),
(35, 8, 2, 21, 'Pesanan Baru - Perlu Verifikasi 🧾', 'Pesanan #21 dari Rayhan Akmal Azhari sebesar Rp 8.000 menunggu verifikasi pembayaran. Cek bukti dan mutasi Anda.', 'pesanan_baru', 0, '2026-11-09 02:37:31'),
(36, 2, 8, 21, 'Pembayaran Terverifikasi ✅', 'Pembayaran pesanan #21 telah diverifikasi oleh Kedai Barokah (Jus Buah & Kopi Segar). Pesanan Anda akan segera diproses.', 'info', 0, '2026-11-09 02:39:05'),
(37, 2, 8, 21, 'Pesanan Sedang Dimasak 👨‍🍳', 'Pesanan #21 Anda sedang dimasak oleh Kedai Barokah (Jus Buah & Kopi Segar). Mohon ditunggu ya!', 'status_diproses', 0, '2026-11-09 02:39:13'),
(38, 2, 8, 21, 'Makanan Siap! Segera Ambil 🎉', 'Pesanan #21 sudah matang dan siap diambil di stan Kedai Barokah (Jus Buah & Kopi Segar).', 'siap_diambil', 0, '2026-11-09 02:39:18'),
(39, 2, 8, 21, 'Pesanan Selesai ✅', 'Terima kasih! Pesanan #21 dari Kedai Barokah (Jus Buah & Kopi Segar) telah selesai. Selamat menikmati hidangan Anda!', 'selesai', 0, '2026-11-09 02:39:21'),
(40, 2, 8, 20, 'Bukti Pembayaran Ditolak ⚠️', 'Bukti pembayaran pesanan #20 ditolak: Gambar buram atau tidak jelas Silakan unggah ulang bukti yang benar (kesempatan ke-1 dari 3).', 'info', 0, '2026-11-09 02:39:31'),
(41, 2, 8, 19, 'Pesanan Dibatalkan ❌', 'Pesanan #19 dibatalkan karena bukti pembayaran tidak valid.', 'dibatalkan', 0, '2026-11-09 02:39:41'),
(42, 2, 4, 16, 'Pesanan Dibatalkan Otomatis ⏰', 'Pesanan #16 dibatalkan karena pembayaran tidak terverifikasi dalam 30 menit.', 'dibatalkan', 0, '2026-11-09 02:58:02'),
(43, 2, 8, 18, 'Pesanan Dibatalkan Otomatis ⏰', 'Pesanan #18 dibatalkan karena pembayaran tidak terverifikasi dalam 30 menit.', 'dibatalkan', 0, '2026-11-09 03:07:02'),
(44, 2, 8, 20, 'Pesanan Dibatalkan Otomatis ⏰', 'Pesanan #20 dibatalkan karena pembayaran tidak terverifikasi dalam 30 menit.', 'dibatalkan', 0, '2026-11-09 03:10:02'),
(45, 8, 9, 22, 'Pesanan Baru - Perlu Verifikasi 🧾', 'Pesanan #22 dari Nazril Febry Fadli sebesar Rp 8.000 menunggu verifikasi pembayaran. Cek bukti dan mutasi Anda.', 'pesanan_baru', 0, '2026-11-11 09:22:55'),
(46, 8, 9, 23, 'Pesanan Baru - Perlu Verifikasi 🧾', 'Pesanan #23 dari Nazril Febry Fadli sebesar Rp 8.000 menunggu verifikasi pembayaran. Cek bukti dan mutasi Anda.', 'pesanan_baru', 0, '2026-11-11 09:23:08'),
(48, 9, 8, 23, 'Bukti Pembayaran Ditolak ⚠️', 'Bukti pembayaran pesanan #23 ditolak: Gambar buram atau tidak jelas Silakan unggah ulang bukti yang benar (kesempatan ke-1 dari 3).', 'info', 0, '2026-11-11 09:24:05'),
(49, 9, 8, 22, 'Pesanan Dibatalkan ❌', 'Pesanan #22 dibatalkan karena bukti pembayaran tidak valid.', 'dibatalkan', 0, '2026-11-11 09:24:11'),
(53, 1, 8, 4, 'Makanan Siap! Segera Ambil 🎉', 'Pesanan #4 sudah matang dan siap diambil di stan Kedai Barokah (Jus Buah & Kopi Segar).', 'siap_diambil', 0, '2026-11-11 09:24:31'),
(56, 1, 8, 4, 'Pesanan Selesai ✅', 'Terima kasih! Pesanan #4 dari Kedai Barokah (Jus Buah & Kopi Segar) telah selesai. Selamat menikmati hidangan Anda!', 'selesai', 0, '2026-11-11 09:24:36'),
(57, 2, 8, 6, 'Pesanan Sedang Dimasak 👨‍🍳', 'Pesanan #6 Anda sedang dimasak oleh Kedai Barokah (Jus Buah & Kopi Segar). Mohon ditunggu ya!', 'status_diproses', 0, '2026-11-11 09:24:39'),
(58, 2, 8, 7, 'Pesanan Sedang Dimasak 👨‍🍳', 'Pesanan #7 Anda sedang dimasak oleh Kedai Barokah (Jus Buah & Kopi Segar). Mohon ditunggu ya!', 'status_diproses', 0, '2026-11-11 09:24:43'),
(59, 2, 8, 7, 'Makanan Siap! Segera Ambil 🎉', 'Pesanan #7 sudah matang dan siap diambil di stan Kedai Barokah (Jus Buah & Kopi Segar).', 'siap_diambil', 0, '2026-11-11 09:24:45'),
(60, 2, 8, 6, 'Makanan Siap! Segera Ambil 🎉', 'Pesanan #6 sudah matang dan siap diambil di stan Kedai Barokah (Jus Buah & Kopi Segar).', 'siap_diambil', 0, '2026-11-11 09:24:46'),
(62, 2, 8, 12, 'Pesanan Sedang Dimasak 👨‍🍳', 'Pesanan #12 Anda sedang dimasak oleh Kedai Barokah (Jus Buah & Kopi Segar). Mohon ditunggu ya!', 'status_diproses', 0, '2026-11-11 09:24:54'),
(69, 2, 8, 12, 'Makanan Siap! Segera Ambil 🎉', 'Pesanan #12 sudah matang dan siap diambil di stan Kedai Barokah (Jus Buah & Kopi Segar).', 'siap_diambil', 0, '2026-11-11 09:26:54'),
(70, 2, 8, 12, 'Pesanan Selesai ✅', 'Terima kasih! Pesanan #12 dari Kedai Barokah (Jus Buah & Kopi Segar) telah selesai. Selamat menikmati hidangan Anda!', 'selesai', 0, '2026-11-11 09:26:56'),
(71, 2, 8, 11, 'Pesanan Sedang Dimasak 👨‍🍳', 'Pesanan #11 Anda sedang dimasak oleh Kedai Barokah (Jus Buah & Kopi Segar). Mohon ditunggu ya!', 'status_diproses', 0, '2026-11-11 09:26:57'),
(72, 2, 8, 11, 'Makanan Siap! Segera Ambil 🎉', 'Pesanan #11 sudah matang dan siap diambil di stan Kedai Barokah (Jus Buah & Kopi Segar).', 'siap_diambil', 0, '2026-11-11 09:26:59'),
(73, 2, 8, 11, 'Pesanan Selesai ✅', 'Terima kasih! Pesanan #11 dari Kedai Barokah (Jus Buah & Kopi Segar) telah selesai. Selamat menikmati hidangan Anda!', 'selesai', 0, '2026-11-11 09:27:00'),
(74, 2, 8, 7, 'Pesanan Selesai ✅', 'Terima kasih! Pesanan #7 dari Kedai Barokah (Jus Buah & Kopi Segar) telah selesai. Selamat menikmati hidangan Anda!', 'selesai', 1, '2026-11-11 09:27:03'),
(75, 2, 8, 6, 'Pesanan Selesai ✅', 'Terima kasih! Pesanan #6 dari Kedai Barokah (Jus Buah & Kopi Segar) telah selesai. Selamat menikmati hidangan Anda!', 'selesai', 1, '2026-11-11 09:27:05'),
(76, 8, 9, 23, 'Bukti Pembayaran Baru 🧾', 'Pembeli mengunggah ulang bukti untuk pesanan #23. Mohon verifikasi kembali.', 'info', 0, '2026-11-11 09:27:29'),
(77, 2, 4, 8, 'Update Pesanan #8 dari Kantin Berkah Cak Slamet (Penyetan & Nasgor)', '...', 'info', 1, '2026-11-11 09:33:05'),
(78, 9, 8, 23, 'Pesanan Dibatalkan Otomatis ⏰', 'Pesanan #23 dibatalkan karena pembayaran tidak terverifikasi dalam 30 menit.', 'dibatalkan', 0, '2026-11-11 09:57:50'),
(79, 8, 2, 26, 'Pesanan Baru - Perlu Verifikasi 🧾', 'Pesanan #26 dari Rayhan Akmal Azhari sebesar Rp 8.000 menunggu verifikasi pembayaran. Cek bukti dan mutasi Anda.', 'pesanan_baru', 0, '2026-11-14 13:59:21'),
(80, 8, 2, 27, 'Pesanan Baru - Perlu Verifikasi 🧾', 'Pesanan #27 dari Rayhan Akmal Azhari sebesar Rp 5.000 menunggu verifikasi pembayaran. Cek bukti dan mutasi Anda.', 'pesanan_baru', 0, '2026-11-15 02:51:40'),
(81, 8, 2, 28, 'Pesanan Baru - Perlu Verifikasi 🧾', 'Pesanan #28 dari Rayhan Akmal Azhari sebesar Rp 8.000 menunggu verifikasi pembayaran. Cek bukti dan mutasi Anda.', 'pesanan_baru', 0, '2026-11-15 02:52:03'),
(83, 8, 2, 30, 'Pesanan Baru - Perlu Verifikasi 🧾', 'Pesanan #30 dari Rayhan Akmal Azhari sebesar Rp 8.000 menunggu verifikasi pembayaran. Cek bukti dan mutasi Anda.', 'pesanan_baru', 0, '2026-11-15 07:08:44'),
(84, 2, 8, 30, 'Bukti Pembayaran Ditolak ⚠️', 'Bukti pembayaran pesanan #30 ditolak: Nominal tidak sesuai Silakan unggah ulang bukti yang benar (kesempatan ke-1 dari 3).', 'info', 1, '2026-11-15 07:09:07'),
(85, 2, 8, 28, 'Pembayaran Terverifikasi ✅', 'Pembayaran pesanan #28 telah diverifikasi oleh Kedai Barokah (Jus Buah & Kopi Segar). Pesanan Anda akan segera diproses.', 'info', 1, '2026-11-15 07:09:37'),
(86, 2, 8, 30, 'Pesanan Dibatalkan Otomatis ⏰', 'Pesanan #30 dibatalkan karena pembayaran tidak terverifikasi dalam 30 menit.', 'dibatalkan', 1, '2026-11-15 07:39:30'),
(88, 8, 2, 32, 'Pesanan Baru - Perlu Verifikasi 🧾', 'Pesanan #32 dari Rayhan Akmal Azhari sebesar Rp 8.000 menunggu verifikasi pembayaran. Cek bukti dan mutasi Anda.', 'pesanan_baru', 0, '2026-11-19 10:11:21'),
(89, 2, 8, 32, 'Pembayaran Terverifikasi ✅', 'Pembayaran pesanan #32 telah diverifikasi oleh Kedai Barokah (Jus Buah & Kopi Segar). Pesanan Anda akan segera diproses.', 'info', 1, '2026-11-19 10:13:54'),
(90, 4, 2, 33, 'Pesanan Baru - Perlu Verifikasi 🧾', 'Pesanan #33 dari Rayhan Akmal Azhari sebesar Rp 14.000 menunggu verifikasi pembayaran. Cek bukti dan mutasi Anda.', 'pesanan_baru', 0, '2026-11-19 12:13:55'),
(91, 2, 4, 33, 'Pembayaran Terverifikasi ✅', 'Pembayaran pesanan #33 telah diverifikasi oleh Kantin Berkah Cak Slamet (Penyetan & Nasgor). Pesanan Anda akan segera diproses.', 'info', 0, '2026-11-19 12:14:05'),
(92, 4, 2, 34, 'Pesanan Baru - Perlu Verifikasi 🧾', 'Pesanan #34 dari Rayhan Akmal Azhari sebesar Rp 18.000 menunggu verifikasi pembayaran. Cek bukti dan mutasi Anda.', 'pesanan_baru', 0, '2026-11-19 12:15:49'),
(93, 2, 4, 34, 'Pembayaran Terverifikasi ✅', 'Pembayaran pesanan #34 telah diverifikasi oleh Kantin Berkah Cak Slamet (Penyetan & Nasgor). Pesanan Anda akan segera diproses.', 'info', 0, '2026-11-19 12:16:03'),
(94, 2, 4, 34, 'Pesanan Sedang Dimasak 👨‍🍳', 'Pesanan #34 Anda sedang dimasak oleh Kantin Berkah Cak Slamet (Penyetan & Nasgor). Mohon ditunggu ya!', 'status_diproses', 0, '2026-11-19 12:16:07'),
(95, 2, 4, 34, 'Makanan Siap! Segera Ambil 🎉', 'Pesanan #34 sudah matang dan siap diambil di stan Kantin Berkah Cak Slamet (Penyetan & Nasgor).', 'siap_diambil', 0, '2026-11-19 12:16:16'),
(96, 2, 4, 34, 'Pesanan Selesai ✅', 'Terima kasih! Pesanan #34 dari Kantin Berkah Cak Slamet (Penyetan & Nasgor) telah selesai. Selamat menikmati hidangan Anda!', 'selesai', 0, '2026-11-19 12:16:22'),
(97, 8, 2, 35, 'Pesanan Baru - Perlu Verifikasi 🧾', 'Pesanan #35 dari Rayhan Akmal Azhari sebesar Rp 8.000 menunggu verifikasi pembayaran. Cek bukti dan mutasi Anda.', 'pesanan_baru', 0, '2026-11-19 12:17:03'),
(98, 2, 8, 35, 'Pembayaran Terverifikasi ✅', 'Pembayaran pesanan #35 telah diverifikasi oleh Kedai Barokah (Jus Buah & Kopi Segar). Pesanan Anda akan segera diproses.', 'info', 0, '2026-11-19 12:17:16'),
(99, 2, 8, 35, 'Pesanan Sedang Dimasak 👨‍🍳', 'Pesanan #35 Anda sedang dimasak oleh Kedai Barokah (Jus Buah & Kopi Segar). Mohon ditunggu ya!', 'status_diproses', 0, '2026-11-19 12:17:44'),
(100, 4, 2, 36, 'Pesanan Baru - Perlu Verifikasi 🧾', 'Pesanan #36 dari Rayhan Akmal Azhari sebesar Rp 14.000 menunggu verifikasi pembayaran. Cek bukti dan mutasi Anda.', 'pesanan_baru', 0, '2026-11-19 12:27:20'),
(101, 2, 4, 36, 'Pembayaran Terverifikasi ✅', 'Pembayaran pesanan #36 telah diverifikasi oleh Kantin Berkah Cak Slamet (Penyetan & Nasgor). Pesanan Anda akan segera diproses.', 'info', 0, '2026-11-19 12:27:46'),
(102, 2, 4, 36, 'Pesanan Sedang Dimasak 👨‍🍳', 'Pesanan #36 Anda sedang dimasak oleh Kantin Berkah Cak Slamet (Penyetan & Nasgor). Mohon ditunggu ya!', 'status_diproses', 0, '2026-11-19 12:27:59'),
(103, 2, 4, 36, 'Makanan Siap! Segera Ambil 🎉', 'Pesanan #36 sudah matang dan siap diambil di stan Kantin Berkah Cak Slamet (Penyetan & Nasgor).', 'siap_diambil', 0, '2026-11-19 12:28:08'),
(104, 2, 4, 36, 'Pesanan Selesai ✅', 'Terima kasih! Pesanan #36 dari Kantin Berkah Cak Slamet (Penyetan & Nasgor) telah selesai. Selamat menikmati hidangan Anda!', 'selesai', 0, '2026-11-19 12:28:15'),
(105, 4, 2, 37, 'Pesanan Baru - Perlu Verifikasi 🧾', 'Pesanan #37 dari Rayhan Akmal Azhari sebesar Rp 12.000 menunggu verifikasi pembayaran. Cek bukti dan mutasi Anda.', 'pesanan_baru', 0, '2026-11-19 12:29:12'),
(106, 2, 4, 37, 'Bukti Pembayaran Ditolak ⚠️', 'Bukti pembayaran pesanan #37 ditolak: Nominal tidak sesuai Silakan unggah ulang bukti yang benar (kesempatan ke-1 dari 3).', 'info', 0, '2026-11-19 12:29:59'),
(107, 4, 2, 37, 'Bukti Pembayaran Baru 🧾', 'Pembeli mengunggah ulang bukti untuk pesanan #37. Mohon verifikasi kembali.', 'info', 0, '2026-11-19 12:30:17'),
(108, 2, 4, 37, 'Bukti Pembayaran Ditolak ⚠️', 'Bukti pembayaran pesanan #37 ditolak: Transaksi tidak ada di mutasi Silakan unggah ulang bukti yang benar (kesempatan ke-2 dari 3).', 'info', 0, '2026-11-19 12:30:32'),
(109, 4, 2, 37, 'Bukti Pembayaran Baru 🧾', 'Pembeli mengunggah ulang bukti untuk pesanan #37. Mohon verifikasi kembali.', 'info', 0, '2026-11-19 12:30:41'),
(110, 2, 4, 37, 'Pesanan Dibatalkan ❌', 'Bukti pembayaran pesanan #37 ditolak 3 kali sehingga pesanan dibatalkan. Alasan terakhir: Transaksi tidak ada di mutasi', 'dibatalkan', 0, '2026-11-19 12:30:51'),
(111, 2, 8, 35, 'Makanan Siap! Segera Ambil 🎉', 'Pesanan #35 sudah matang dan siap diambil di stan Kedai Barokah (Jus Buah & Kopi Segar).', 'siap_diambil', 0, '2026-11-20 21:44:09'),
(112, 2, 8, 35, 'Pesanan Selesai ✅', 'Terima kasih! Pesanan #35 dari Kedai Barokah (Jus Buah & Kopi Segar) telah selesai. Selamat menikmati hidangan Anda!', 'selesai', 0, '2026-11-20 21:44:18'),
(113, 8, 2, 38, 'Pesanan Baru - Perlu Verifikasi 🧾', 'Pesanan #38 dari Rayhan Akmal Azhari sebesar Rp 5.000 menunggu verifikasi pembayaran. Cek bukti dan mutasi Anda.', 'pesanan_baru', 0, '2026-11-21 06:59:17'),
(114, 2, 8, 38, 'Pembayaran Terverifikasi ✅', 'Pembayaran pesanan #38 telah diverifikasi oleh Kedai Barokah (Jus Buah & Kopi Segar). Pesanan Anda akan segera diproses.', 'info', 0, '2026-11-21 07:00:17'),
(115, 8, 1, 39, 'Pesanan Baru - Perlu Verifikasi 🧾', 'Pesanan #39 dari Elka Putra Prasetiyo sebesar Rp 8.000 menunggu verifikasi pembayaran. Cek bukti dan mutasi Anda.', 'pesanan_baru', 0, '2026-11-21 07:42:45'),
(116, 1, 8, 39, 'Bukti Pembayaran Ditolak ⚠️', 'Bukti pembayaran pesanan #39 ditolak: Bukti bukan untuk pesanan ini Silakan unggah ulang bukti yang benar. Sisa kesempatan unggah: 2 kali.', 'info', 0, '2026-11-21 07:43:07'),
(117, 8, 1, 39, 'Bukti Pembayaran Baru 🧾', 'Pembeli mengunggah ulang bukti untuk pesanan #39. Mohon verifikasi kembali.', 'info', 0, '2026-11-21 07:43:15'),
(118, 1, 8, 39, 'Bukti Pembayaran Ditolak ⚠️', 'Bukti pembayaran pesanan #39 ditolak. Silakan unggah ulang bukti yang benar. Ini kesempatan TERAKHIR: jika bukti berikutnya tidak valid, pesanan dibatalkan.', 'info', 0, '2026-11-21 07:43:32'),
(119, 8, 1, 39, 'Bukti Pembayaran Baru 🧾', 'Pembeli mengunggah ulang bukti untuk pesanan #39. Mohon verifikasi kembali.', 'info', 0, '2026-11-21 07:43:46'),
(120, 1, 8, 39, 'Pesanan Dibatalkan ❌', 'Pesanan #39 dibatalkan karena bukti pembayaran tidak valid. Alasan: Gambar buram atau tidak jelas', 'dibatalkan', 0, '2026-11-21 07:44:07'),
(121, 8, 1, 40, 'Pesanan Baru - Perlu Verifikasi 🧾', 'Pesanan #40 dari Elka Putra Prasetiyo sebesar Rp 8.000 menunggu verifikasi pembayaran. Cek bukti dan mutasi Anda.', 'pesanan_baru', 0, '2026-11-21 07:44:23'),
(122, 1, 8, 40, 'Pembayaran Terverifikasi ✅', 'Pembayaran pesanan #40 telah diverifikasi oleh Kedai Barokah (Jus Buah & Kopi Segar). Pesanan Anda akan segera diproses.', 'info', 0, '2026-11-21 07:44:36'),
(123, 1, 8, 40, 'Pesanan Sedang Dimasak 👨‍🍳', 'Pesanan #40 Anda sedang dimasak oleh Kedai Barokah (Jus Buah & Kopi Segar). Mohon ditunggu ya!', 'status_diproses', 0, '2026-11-21 07:44:41'),
(124, 1, 8, 40, 'Makanan Siap! Segera Ambil 🎉', 'Pesanan #40 sudah matang dan siap diambil di stan Kedai Barokah (Jus Buah & Kopi Segar).', 'siap_diambil', 0, '2026-11-21 07:44:46'),
(125, 1, 8, 40, 'Pesanan Selesai ✅', 'Terima kasih! Pesanan #40 dari Kedai Barokah (Jus Buah & Kopi Segar) telah selesai. Selamat menikmati hidangan Anda!', 'selesai', 0, '2026-11-21 07:45:00');

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
(1, 'Elka Putra Prasetiyo', '09010625007', 'elka@uinsa.ac.id', '$2b$10$ckRlmXrGuBbvsx0BttjTRuAzDesCzqAT4SvwYxKX/2ayqeaaj2EzC', 'mahasiswa', '085119485392'),
(2, 'Rayhan Akmal Azhari', '09020625073', 'rayhan@uinsa.ac.id', '$2b$10$7wqRwMi4Sldbnrd8xH11t.j79mEUIGzu5SERjKPlAngIo6jy1qE/.', 'mahasiswa', '085850567179'),
(3, 'Bu Siti Fatimah', NULL, 'siti@fastcanteen.com', '$2b$10$3Pv.eKoDl3Z6OEsZIASqV.nN6tzLnK2u9n0pH94o8/lR7xTT2DKd6', 'tenant', '081298765432'),
(4, 'Cak Slamet', NULL, 'slamet@fastcanteen.com', '$2b$10$83.VSsU.Kvjuma5cPI5uvOf2IZOE2.jwU4wliOh9k0cuCUxxl1mj.', 'tenant', '081298765433'),
(5, 'Super Admin Kantin', NULL, 'admin@fastcanteen.com', '$2b$10$hAZBAsxB4Kygrh7bzm6FPuVYLFB1lVmwdP2rkeMiopUxpPSoxbpey', 'admin', '081299998888'),
(7, 'Rafli Firmansyah', '09010125002', 'rafli@uinsa.ac.id', '$2b$10$2Wz4hmB.HWi265dcFPeHkeSHrT3NRduu.lTIdkymDdIURxVbbORYe', 'mahasiswa', '085233369852'),
(8, 'Pak Joko Barokah', NULL, 'barokah@fastcanteen.com', '$2b$10$uypXbAKstPktJP.Menp4Y.drlJ/tmXnBoscgwT4xsHsInO1G3AgqO', 'tenant', '081298765434'),
(9, 'Nazril Febry Fadli', '09020625066', 'nazril@uinsa.ac.id', '$2b$10$KDvj1zB56IuZADtMzH7Pi.Tg0FYa0Zfgg48xGPWUG3mJvfCcORQ4C', 'mahasiswa', '081230942240');

-- --------------------------------------------------------

--
-- Table structure for table `pesanan`
--

CREATE TABLE `pesanan` (
  `id` int(11) NOT NULL,
  `id_mahasiswa` int(11) NOT NULL,
  `id_tenant` int(11) NOT NULL,
  `total_harga` decimal(10,2) NOT NULL,
  `metode_pembayaran` varchar(50) NOT NULL,
  `status_pembayaran` enum('Menunggu Verifikasi','Sudah Dibayar','Bukti Ditolak','Dikembalikan') NOT NULL DEFAULT 'Menunggu Verifikasi',
  `status_pesanan` enum('Menunggu','Diproses','Siap Diambil','Selesai','Dibatalkan') NOT NULL DEFAULT 'Menunggu',
  `bukti_pembayaran` varchar(255) DEFAULT NULL,
  `catatan_verifikasi` varchar(255) DEFAULT NULL,
  `jumlah_penolakan` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `diverifikasi_oleh` int(11) DEFAULT NULL,
  `waktu_verifikasi` datetime DEFAULT NULL,
  `catatan` text DEFAULT NULL,
  `waktu_transaksi` datetime DEFAULT current_timestamp(),
  `waktu_perubahan_status` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pesanan`
--

INSERT INTO `pesanan` (`id`, `id_mahasiswa`, `id_tenant`, `total_harga`, `metode_pembayaran`, `status_pembayaran`, `status_pesanan`, `bukti_pembayaran`, `catatan_verifikasi`, `jumlah_penolakan`, `diverifikasi_oleh`, `waktu_verifikasi`, `catatan`, `waktu_transaksi`, `waktu_perubahan_status`) VALUES
(1, 1, 1, 25000.00, 'QRIS', 'Sudah Dibayar', 'Selesai', NULL, NULL, 0, NULL, NULL, 'Pedas sedang, koya dipisah', '2026-10-11 16:45:20', '2026-11-05 11:01:02'),
(2, 1, 1, 16000.00, 'QRIS', 'Sudah Dibayar', 'Selesai', NULL, NULL, 0, NULL, NULL, 'Kuah dipisah ya bu', '2026-10-11 16:57:21', '2026-11-05 22:33:41'),
(4, 1, 3, 13000.00, 'QRIS', 'Sudah Dibayar', 'Selesai', NULL, NULL, 0, NULL, NULL, NULL, '2026-11-04 20:41:39', '2026-11-11 09:24:36'),
(5, 2, 1, 6000.00, 'QRIS', 'Sudah Dibayar', 'Selesai', NULL, NULL, 0, NULL, NULL, NULL, '2026-11-05 05:51:45', '2026-11-05 22:33:37'),
(6, 2, 3, 8000.00, 'E-Wallet', 'Sudah Dibayar', 'Selesai', NULL, NULL, 0, NULL, NULL, NULL, '2026-11-05 05:52:13', '2026-11-11 09:27:05'),
(7, 2, 3, 8000.00, 'QRIS', 'Sudah Dibayar', 'Selesai', NULL, NULL, 0, NULL, NULL, NULL, '2026-11-05 06:14:53', '2026-11-11 09:27:03'),
(8, 2, 2, 14000.00, 'QRIS', 'Sudah Dibayar', 'Menunggu', NULL, NULL, 0, NULL, NULL, NULL, '2026-11-05 11:03:20', '2026-11-06 06:18:44'),
(9, 2, 2, 11000.00, 'QRIS', 'Sudah Dibayar', 'Dibatalkan', NULL, NULL, 0, NULL, NULL, NULL, '2026-11-05 11:13:00', '2026-11-06 06:18:44'),
(10, 2, 1, 12000.00, 'E-Wallet', 'Sudah Dibayar', 'Selesai', '/uploads/bukti-10-1793852709694.jpg', NULL, 0, NULL, NULL, NULL, '2026-11-05 11:25:09', '2026-11-05 22:33:33'),
(11, 2, 3, 8000.00, 'QRIS', 'Sudah Dibayar', 'Selesai', '/uploads/bukti-11-1793852769080.jpg', NULL, 0, NULL, NULL, NULL, '2026-11-05 11:26:09', '2026-11-11 09:27:00'),
(12, 2, 3, 8000.00, 'QRIS', 'Sudah Dibayar', 'Selesai', '/uploads/bukti-12-1793853199100.jpg', NULL, 0, NULL, NULL, NULL, '2026-11-05 11:33:19', '2026-11-11 09:26:56'),
(13, 2, 2, 12000.00, 'QRIS', 'Menunggu Verifikasi', 'Dibatalkan', '/uploads/bukti-13-1793892693318.jpg', NULL, 0, NULL, NULL, NULL, '2026-11-05 22:31:33', '2026-11-05 23:02:17'),
(15, 2, 3, 8000.00, 'QRIS', 'Menunggu Verifikasi', 'Dibatalkan', '/uploads/bukti-15-1793920064480.jpg', NULL, 0, NULL, NULL, NULL, '2026-11-06 06:07:44', '2026-11-06 06:38:10'),
(16, 2, 2, 14000.00, 'QRIS', 'Bukti Ditolak', 'Dibatalkan', '/uploads/bukti-16-1794165756683.jpg', NULL, 1, 4, '2026-11-09 02:27:26', NULL, '2026-11-09 02:22:36', '2026-11-09 02:58:02'),
(17, 2, 2, 12000.00, 'E-Wallet', 'Bukti Ditolak', 'Dibatalkan', '/uploads/bukti-17-1794165781367.png', NULL, 1, 4, '2026-11-09 02:27:46', NULL, '2026-11-09 02:23:01', '2026-11-09 02:27:46'),
(18, 2, 3, 8000.00, 'QRIS', 'Menunggu Verifikasi', 'Dibatalkan', '/uploads/bukti-18-1794166616577.jpg', NULL, 0, NULL, NULL, NULL, '2026-11-09 02:36:56', '2026-11-09 03:07:02'),
(19, 2, 3, 8000.00, 'QRIS', 'Bukti Ditolak', 'Dibatalkan', '/uploads/bukti-19-1794166629396.jpg', NULL, 1, 8, '2026-11-09 02:39:41', NULL, '2026-11-09 02:37:09', '2026-11-09 02:39:41'),
(20, 2, 3, 8000.00, 'QRIS', 'Bukti Ditolak', 'Dibatalkan', '/uploads/bukti-20-1794166640159.jpg', 'Gambar buram atau tidak jelas', 1, 8, '2026-11-09 02:39:31', NULL, '2026-11-09 02:37:20', '2026-11-09 03:10:02'),
(21, 2, 3, 8000.00, 'QRIS', 'Sudah Dibayar', 'Selesai', '/uploads/bukti-21-1794166651126.jpg', NULL, 0, 8, '2026-11-09 02:39:05', NULL, '2026-11-09 02:37:31', '2026-11-09 02:39:21'),
(22, 9, 3, 8000.00, 'QRIS', 'Bukti Ditolak', 'Dibatalkan', '/uploads/bukti-22-1794363775392.jpg', NULL, 1, 8, '2026-11-11 09:24:11', NULL, '2026-11-11 09:22:55', '2026-11-11 09:24:11'),
(23, 9, 3, 8000.00, 'E-Wallet', 'Menunggu Verifikasi', 'Dibatalkan', '/uploads/bukti-23-1794364049780.jpg', 'Gambar buram atau tidak jelas', 1, 8, '2026-11-11 09:24:05', NULL, '2026-11-11 09:23:08', '2026-11-11 09:57:50'),
(26, 2, 3, 8000.00, 'E-Wallet', 'Menunggu Verifikasi', 'Menunggu', '/uploads/bukti-26-1794639561443.png', NULL, 0, NULL, NULL, NULL, '2026-11-14 13:59:21', '2026-11-14 13:59:21'),
(27, 2, 3, 5000.00, 'QRIS', 'Menunggu Verifikasi', 'Menunggu', '/uploads/bukti-27-1794685900162.jpg', NULL, 0, NULL, NULL, NULL, '2026-11-15 02:51:40', '2026-11-15 02:51:40'),
(28, 2, 3, 8000.00, 'QRIS', 'Sudah Dibayar', 'Menunggu', '/uploads/bukti-28-1794685923844.jpg', NULL, 0, 8, '2026-11-15 07:09:37', NULL, '2026-11-15 02:52:03', '2026-11-15 07:09:37'),
(30, 2, 3, 8000.00, 'QRIS', 'Bukti Ditolak', 'Dibatalkan', '/uploads/bukti-30-1794701324439.jpg', 'Nominal tidak sesuai', 1, 8, '2026-11-15 07:09:07', NULL, '2026-11-15 07:08:44', '2026-11-15 07:39:30'),
(32, 2, 3, 8000.00, 'QRIS', 'Sudah Dibayar', 'Menunggu', '/uploads/bukti-32-1795057881513.jpg', NULL, 0, 8, '2026-11-19 10:13:54', NULL, '2026-11-19 10:11:21', '2026-11-19 10:13:54'),
(33, 2, 2, 14000.00, 'QRIS', 'Sudah Dibayar', 'Menunggu', '/uploads/bukti-33-1795065235754.jpg', NULL, 0, 4, '2026-11-19 12:14:05', NULL, '2026-11-19 12:13:55', '2026-11-19 12:14:05'),
(34, 2, 2, 18000.00, 'E-Wallet', 'Sudah Dibayar', 'Selesai', '/uploads/bukti-34-1795065349399.jpg', NULL, 0, 4, '2026-11-19 12:16:03', NULL, '2026-11-19 12:15:49', '2026-11-19 12:16:22'),
(35, 2, 3, 8000.00, 'QRIS', 'Sudah Dibayar', 'Selesai', '/uploads/bukti-35-1795065423795.jpg', NULL, 0, 8, '2026-11-19 12:17:16', NULL, '2026-11-19 12:17:03', '2026-11-20 21:44:18'),
(36, 2, 2, 14000.00, 'QRIS', 'Sudah Dibayar', 'Selesai', '/uploads/bukti-36-1795066040595.jpg', NULL, 0, 4, '2026-11-19 12:27:46', NULL, '2026-11-19 12:27:20', '2026-11-19 12:28:15'),
(37, 2, 2, 12000.00, 'QRIS', 'Bukti Ditolak', 'Dibatalkan', '/uploads/bukti-37-1795066241382.jpg', 'Transaksi tidak ada di mutasi', 3, 4, '2026-11-19 12:30:51', NULL, '2026-11-19 12:29:12', '2026-11-19 12:30:51'),
(38, 2, 3, 5000.00, 'QRIS', 'Sudah Dibayar', 'Menunggu', '/uploads/bukti-38-1795219157177.jpg', NULL, 0, 8, '2026-11-21 07:00:17', NULL, '2026-11-21 06:59:17', '2026-11-21 07:00:17'),
(39, 1, 3, 8000.00, 'QRIS', 'Bukti Ditolak', 'Dibatalkan', '/uploads/bukti-39-1795221826288.jpg', 'Gambar buram atau tidak jelas', 3, 8, '2026-11-21 07:44:07', 'tanpa susu coklat', '2026-11-21 07:42:45', '2026-11-21 07:44:07'),
(40, 1, 3, 8000.00, 'QRIS', 'Sudah Dibayar', 'Selesai', '/uploads/bukti-40-1795221863764.jpg', NULL, 0, 8, '2026-11-21 07:44:36', NULL, '2026-11-21 07:44:23', '2026-11-21 07:45:00');

-- --------------------------------------------------------

--
-- Table structure for table `push_tokens`
--

CREATE TABLE `push_tokens` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `expo_push_token` varchar(255) NOT NULL,
  `dibuat_pada` datetime NOT NULL DEFAULT current_timestamp(),
  `diperbarui_pada` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `push_tokens`
--

INSERT INTO `push_tokens` (`id`, `user_id`, `expo_push_token`, `dibuat_pada`, `diperbarui_pada`) VALUES
(12, 8, 'ExponentPushToken[qRcO5pHHwFL7QlUsUWQipQ]', '2026-11-15 07:07:43', '2026-11-21 07:41:51'),
(25, 2, 'ExponentPushToken[ugTce9DOYz3jTAY4eEMJLf]', '2026-11-19 12:24:58', '2026-11-19 12:24:58');

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
(1, 'Kantin Mbak Siti (Ayam Geprek & Soto)', 'Stan 01 - Lantai 1 Kantin Belakang UINSA Kampus 2', 3),
(2, 'Kantin Berkah Cak Slamet (Penyetan & Nasgor)', 'Stan 02 - Lantai 1 Kantin Belakang UINSA Kampus 2', 4),
(3, 'Kedai Barokah (Jus Buah & Kopi Segar)', 'Stan 03 - Lantai 1 Kantin Belakang UINSA Kampus 2', 8);

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
-- Indexes for table `notifikasi`
--
ALTER TABLE `notifikasi`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_penerima` (`id_penerima`),
  ADD KEY `idx_pesanan` (`id_pesanan`),
  ADD KEY `fk_notif_pengirim` (`id_pengirim`);

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
-- Indexes for table `push_tokens`
--
ALTER TABLE `push_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_push_token` (`expo_push_token`),
  ADD KEY `idx_push_user` (`user_id`);

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
  MODIFY `id_detail` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=43;

--
-- AUTO_INCREMENT for table `menu`
--
ALTER TABLE `menu`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `notifikasi`
--
ALTER TABLE `notifikasi`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=126;

--
-- AUTO_INCREMENT for table `pengguna`
--
ALTER TABLE `pengguna`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `pesanan`
--
ALTER TABLE `pesanan`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT for table `push_tokens`
--
ALTER TABLE `push_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- AUTO_INCREMENT for table `tenant`
--
ALTER TABLE `tenant`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

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
-- Constraints for table `notifikasi`
--
ALTER TABLE `notifikasi`
  ADD CONSTRAINT `fk_notif_penerima` FOREIGN KEY (`id_penerima`) REFERENCES `pengguna` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_notif_pengirim` FOREIGN KEY (`id_pengirim`) REFERENCES `pengguna` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_notif_pesanan` FOREIGN KEY (`id_pesanan`) REFERENCES `pesanan` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `pesanan`
--
ALTER TABLE `pesanan`
  ADD CONSTRAINT `fk_pesanan_mahasiswa` FOREIGN KEY (`id_mahasiswa`) REFERENCES `pengguna` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pesanan_tenant` FOREIGN KEY (`id_tenant`) REFERENCES `tenant` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `push_tokens`
--
ALTER TABLE `push_tokens`
  ADD CONSTRAINT `fk_push_user` FOREIGN KEY (`user_id`) REFERENCES `pengguna` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `tenant`
--
ALTER TABLE `tenant`
  ADD CONSTRAINT `fk_tenant_admin` FOREIGN KEY (`id_admin_pendaftar`) REFERENCES `pengguna` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
