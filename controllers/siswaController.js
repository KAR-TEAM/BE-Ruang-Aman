const crypto = require('crypto');
const { db } = require('../config/db');
const { classifyRisk } = require('../utils/riskClassifier');

// Siswa membuat laporan baru. Priority DIHITUNG DI SERVER (classifyRisk),
// tidak pernah diambil dari req.body, supaya tidak bisa dimanipulasi client.
const createReport = async (req, res) => {
  try {
    const { jenis, kronologi, lokasi, tanggal_kejadian, waktu_kejadian, anonymous } = req.body;

    if (!jenis || !kronologi || !lokasi || !tanggal_kejadian) {
      return res.status(400).json({ message: 'Data laporan wajib diisi lengkap.' });
    }

    const reportId = crypto.randomUUID();
    const isAnonymous = Boolean(anonymous);
    const priority = classifyRisk(jenis, kronologi);

    await db.query(
      `INSERT INTO reports
        (id, user_id, jenis_kejadian, kronologi, lokasi, tanggal_kejadian, waktu_kejadian, anonymous, priority, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'BARU')`,
      [
        reportId,
        req.user.id,
        jenis,
        kronologi,
        lokasi,
        tanggal_kejadian,
        waktu_kejadian || null,
        isAnonymous,
        priority
      ]
    );

    return res.status(201).json({ message: 'Laporan berhasil dibuat.', reportId, priority });
  } catch (err) {
    console.error('Create report error:', err.message);
    return res.status(500).json({ message: 'Gagal membuat laporan.' });
  }
};

// Siswa melihat daftar laporan miliknya sendiri
const myReports = async (req, res) => {
  try {
    const [reports] = await db.query(
      'SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(reports);
  } catch (err) {
    console.error('My reports error:', err.message);
    res.status(500).json({ message: 'Gagal mengambil data laporan.' });
  }
};

// Siswa melihat ringkasan statistik dan laporan terbaru di dashboard
const dashboardsiswa = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Ambil ringkasan statistik laporan milik siswa yang bersangkutan
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) AS total_laporan,
        SUM(CASE WHEN status = 'BARU' THEN 1 ELSE 0 END) AS laporan_baru,
        SUM(CASE WHEN status = 'SEDANG DITANGANI' THEN 1 ELSE 0 END) AS sedang_ditangani,
        SUM(CASE WHEN status = 'SELESAI' THEN 1 ELSE 0 END) AS selesai
      FROM reports 
      WHERE user_id = ?
    `, [userId]);

    // 2. Ambil daftar laporan aktif / terbaru (misal 5 laporan terakhir)
    const [recentReports] = await db.query(`
      SELECT id, jenis_kejadian AS jenis, lokasi, tanggal_kejadian, status, priority, created_at 
      FROM reports 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 5
    `, [userId]);

    return res.status(200).json({
      message: 'Berhasil memuat data dashboard siswa.',
      statistik: stats[0],
      laporan_terbaru: recentReports
    });
  } catch (err) {
    console.error('Dashboard siswa error:', err.message);
    return res.status(500).json({ message: 'Gagal memuat data dashboard.' });
  }
};

module.exports = { createReport, myReports, dashboardsiswa };
