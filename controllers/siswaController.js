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

const dashboardsiswa = async (req, res) => {

}

module.exports = { createReport, myReports, dashboardsiswa };
