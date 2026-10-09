-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Waktu pembuatan: 09 Okt 2026 pada 10.35
-- Versi server: 10.4.32-MariaDB
-- Versi PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `db_ruangaman`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `followups`
--

CREATE TABLE `followups` (
  `id` varchar(36) NOT NULL,
  `report_id` varchar(36) NOT NULL,
  `guru_id` varchar(36) NOT NULL,
  `catatan` text NOT NULL,
  `tindakan` text NOT NULL,
  `tanggal_penanganan` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- RELATIONSHIPS FOR TABLE `followups`:
--   `report_id`
--       `reports` -> `id`
--   `guru_id`
--       `users` -> `id`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `otp_verifications`
--

CREATE TABLE `otp_verifications` (
  `email` varchar(255) NOT NULL,
  `otp_code` varchar(6) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- RELATIONSHIPS FOR TABLE `otp_verifications`:
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `reports`
--

CREATE TABLE `reports` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `jenis_kejadian` enum('Bullying','Kekerasan Verbal','Kekerasan Fisik','Pelecehan','Cyberbullying','Konflik Teman','Masalah Keluarga','Lainnya') NOT NULL,
  `kategori_kejadian` varchar(100) DEFAULT NULL,
  `kronologi` text NOT NULL,
  `tanggal_kejadian` date NOT NULL,
  `waktu_kejadian` time DEFAULT NULL,
  `lokasi` varchar(255) NOT NULL,
  `anonymous` tinyint(1) DEFAULT 0,
  `bukti_url` varchar(255) DEFAULT NULL,
  `priority` enum('Rendah','Sedang','Tinggi') DEFAULT 'Rendah',
  `STATUS` enum('BARU','SEDANG DITANGANI','SELESAI') DEFAULT 'BARU',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- RELATIONSHIPS FOR TABLE `reports`:
--   `user_id`
--       `users` -> `id`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `schools`
--

CREATE TABLE `schools` (
  `id` varchar(36) NOT NULL,
  `nama_sekolah` varchar(255) NOT NULL,
  `npsn` varchar(50) DEFAULT NULL,
  `alamat` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- RELATIONSHIPS FOR TABLE `schools`:
--

--
-- Dumping data untuk tabel `schools`
--

INSERT INTO `schools` (`id`, `nama_sekolah`, `npsn`, `alamat`, `created_at`) VALUES
('392b443d-a7dd-44a5-ac77-820c521fad2c', 'SMKN 1 Tasikmalaya', '00000002', 'Tasikmalaya', '2026-09-28 04:37:49'),
('a64e5c48-9e87-4a35-a5d3-baa38a646d90', 'SMAN 1 Tasikmalaya', '00000001', 'Tasikmalaya', '2026-09-27 09:57:22');

-- --------------------------------------------------------

--
-- Struktur dari tabel `students`
--

CREATE TABLE `students` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `nis` varchar(50) NOT NULL,
  `jenjang` varchar(50) NOT NULL,
  `kelas` varchar(50) NOT NULL,
  `jurusan` varchar(100) DEFAULT NULL,
  `tahun_masuk` int(11) DEFAULT NULL,
  `nama_wali` varchar(255) DEFAULT NULL,
  `kontak_wali` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- RELATIONSHIPS FOR TABLE `students`:
--   `user_id`
--       `users` -> `id`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `teacher_profiles`
--

CREATE TABLE `teacher_profiles` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `nip` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- RELATIONSHIPS FOR TABLE `teacher_profiles`:
--   `user_id`
--       `users` -> `id`
--

--
-- Dumping data untuk tabel `teacher_profiles`
--

INSERT INTO `teacher_profiles` (`id`, `user_id`, `nip`) VALUES
('dabc0c71-3940-4ee9-96c2-c7a47d2fa432', '50fc347f-5610-455f-9306-5c9d45c00fe0', '88888888');

-- --------------------------------------------------------

--
-- Struktur dari tabel `users`
--

CREATE TABLE `users` (
  `id` varchar(36) NOT NULL,
  `school_id` varchar(36) DEFAULT NULL COMMENT 'NULL untuk Superadmin',
  `nama` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `PASSWORD` varchar(255) NOT NULL,
  `role` enum('Superadmin','Admin','Guru BK','Siswa') NOT NULL,
  `foto_profile` varchar(255) DEFAULT NULL,
  `status_akun` enum('Aktif','Tidak Aktif','Menunggu Verifikasi') DEFAULT 'Menunggu Verifikasi',
  `is_verified` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- RELATIONSHIPS FOR TABLE `users`:
--   `school_id`
--       `schools` -> `id`
--

--
-- Dumping data untuk tabel `users`
--

INSERT INTO `users` (`id`, `school_id`, `nama`, `email`, `PASSWORD`, `role`, `foto_profile`, `status_akun`, `is_verified`, `created_at`, `updated_at`) VALUES
('3ab5eb4e-9925-4700-be69-2063e6c3db1e', NULL, 'Khoirin Nisa Amalia', 'nisa@ruangaman.id', '$2a$10$SiDPTNkSFP9.i8mg5uEUJ.EzJaVXkiXgB9N7.jI36G5FKAvxIdv.q', 'Superadmin', NULL, 'Aktif', 1, '2026-09-27 06:35:00', '2026-09-27 06:35:00'),
('50fc347f-5610-455f-9306-5c9d45c00fe0', 'a64e5c48-9e87-4a35-a5d3-baa38a646d90', 'Guru 2', 'guru2@pendidik.id', '$2a$10$c3oMPQ9Khhv56A2L1RcUQOiXGWXevDpclDhYF0MQcQx5ottims4s.', 'Guru BK', NULL, 'Aktif', 1, '2026-09-28 03:36:31', '2026-09-28 03:37:23'),
('8913531b-f1e7-4b3e-9dc6-71dfb7800857', NULL, 'Aldy Alfiansyah', 'aldyalfiansyah@ruangaman.id', '$2a$10$AOgAnTGdRMc4Mp1dUCULJO3kHRZgixiX8UnDyPrXKRiYqrVQZE/4.', 'Superadmin', NULL, 'Aktif', 1, '2026-09-27 06:41:52', '2026-09-27 06:41:52'),
('92ffe476-b476-4819-bc15-b1cd1a685dfa', 'a64e5c48-9e87-4a35-a5d3-baa38a646d90', 'admin 2', 'admin2@sman1.sch.id', '$2a$10$IYHayqeWfWCz53Nr5iqMXuRznPzwzdigkLXeM.N7PuZrrA2CqdVUC', 'Admin', NULL, 'Aktif', 1, '2026-09-28 03:54:27', '2026-09-28 03:54:27'),
('f203902a-1600-4912-a16c-9bc3c300123c', 'a64e5c48-9e87-4a35-a5d3-baa38a646d90', 'Admin1', 'admin1@sma1.sch.id', '$2a$10$5S55YMxUSlGdgFihWIdTMuHctAvnvUgWs.EooC5ly3xtj0YfpDGu.', 'Admin', NULL, 'Aktif', 1, '2026-09-27 09:58:27', '2026-09-27 09:58:27'),
('f65be8ea-a5c6-4ba9-83c5-822a746b4b25', NULL, 'Reza Sapitra', 'rezasapitra@ruangaman.id', '$2a$10$13pynKUp4zq5.0TT4raFTeYWzAfR2zvu0Ey6tafiVTxBJK/XnmBze', 'Superadmin', NULL, 'Aktif', 1, '2026-09-27 06:33:45', '2026-09-27 06:33:45');

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `followups`
--
ALTER TABLE `followups`
  ADD PRIMARY KEY (`id`),
  ADD KEY `report_id` (`report_id`),
  ADD KEY `guru_id` (`guru_id`);

--
-- Indeks untuk tabel `otp_verifications`
--
ALTER TABLE `otp_verifications`
  ADD PRIMARY KEY (`email`);

--
-- Indeks untuk tabel `reports`
--
ALTER TABLE `reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indeks untuk tabel `schools`
--
ALTER TABLE `schools`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD UNIQUE KEY `nis` (`nis`);

--
-- Indeks untuk tabel `teacher_profiles`
--
ALTER TABLE `teacher_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD UNIQUE KEY `nip` (`nip`);

--
-- Indeks untuk tabel `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `school_id` (`school_id`);

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `followups`
--
ALTER TABLE `followups`
  ADD CONSTRAINT `followups_ibfk_1` FOREIGN KEY (`report_id`) REFERENCES `reports` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `followups_ibfk_2` FOREIGN KEY (`guru_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `reports`
--
ALTER TABLE `reports`
  ADD CONSTRAINT `reports_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `students`
--
ALTER TABLE `students`
  ADD CONSTRAINT `students_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `teacher_profiles`
--
ALTER TABLE `teacher_profiles`
  ADD CONSTRAINT `teacher_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
