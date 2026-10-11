const crypto = require('crypto');
const { db } = require('../config/db');

const VALID_STATUSES = ['BARU', 'SEDANG DITANGANI', 'SELESAI'];

// Statistik untuk dashboard Guru BK
const dashboardStats = async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT
        COUNT(*) AS total_laporan,
        SUM(CASE WHEN status = 'BARU' THEN 1 ELSE 0 END) AS jumlah_baru,
        SUM(CASE WHEN status = 'SEDANG DITANGANI' THEN 1 ELSE 0 END) AS sedang_ditangani,
        SUM(CASE WHEN status = 'SELESAI' THEN 1 ELSE 0 END) AS selesai,
        SUM(CASE WHEN priority = 'Tinggi' THEN 1 ELSE 0 END) AS risiko_tinggi
      FROM reports
    `);
    res.json(stats[0]);
  } catch (err) {
    console.error('Dashboard stats error:', err.message);
    res.status(500).json({ message: 'Gagal mengambil statistik.' });
  }
};

// Guru BK melihat semua laporan, dengan filter opsional ?status= & ?priority=
// Identitas siswa disembunyikan di response jika laporan bersifat anonim.
const listReports = async (req, res) => {
  try {
    const { status, priority } = req.query;
    const conditions = [];
    const params = [];

    if (status && status !== 'Semua') {
      conditions.push('r.status = ?');
      params.push(status);
    }
    if (priority && priority !== 'Semua') {
      conditions.push('r.priority = ?');
      params.push(priority);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await db.query(
      `SELECT
        r.id, r.jenis_kejadian AS jenis, r.kronologi, r.lokasi,
        r.tanggal_kejadian, r.waktu_kejadian, r.bukti_url,
        r.anonymous, r.priority, r.status, r.created_at,
        u.nama, u.email, s.nis, s.kelas
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN students s ON u.id = s.user_id
      ${whereClause}
      ORDER BY r.created_at DESC`,
      params
    );

    const formatted = rows.map((rep) => ({
      id: rep.id,
      jenis: rep.jenis,
      kronologi: rep.kronologi,
      lokasi: rep.lokasi,
      tanggal_kejadian: rep.tanggal_kejadian,
      waktu_kejadian: rep.waktu_kejadian,
      bukti_url: rep.bukti_url,
      anonymous: Boolean(rep.anonymous),
      priority: rep.priority,
      status: rep.status,
      created_at: rep.created_at,
      pelapor: rep.anonymous
        ? { nama: 'Anonim', email: null, nis: null, kelas: null }
        : {
            nama: rep.nama || 'Unknown',
            email: rep.email || null,
            nis: rep.nis || null,
            kelas: rep.kelas || null
          }
    }));

    res.json(formatted);
  } catch (err) {
    console.error('List reports error:', err.message);
    res.status(500).json({ message: 'Gagal mengambil daftar laporan.' });
  }
};

// Guru BK menambahkan catatan tindak lanjut & (opsional) mengubah status laporan
const addFollowup = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { id } = req.params;
    const { catatan, tindakan, status_baru } = req.body;

    if (status_baru && !VALID_STATUSES.includes(status_baru)) {
      connection.release();
      return res.status(400).json({
        message: `Status tidak valid. Gunakan salah satu: ${VALID_STATUSES.join(', ')}`
      });
    }

    const [reports] = await connection.query('SELECT id FROM reports WHERE id = ?', [id]);
    if (reports.length === 0) {
      connection.release();
      return res.status(404).json({ message: 'Laporan tidak ditemukan.' });
    }

    await connection.beginTransaction();

    if (status_baru) {
      await connection.query('UPDATE reports SET status = ? WHERE id = ?', [status_baru, id]);
    }

    const followupId = crypto.randomUUID();
    await connection.query(
      `INSERT INTO followups (id, report_id, guru_id, catatan, tindakan)
       VALUES (?, ?, ?, ?, ?)`,
      [followupId, id, req.user.id, catatan || '', tindakan || '']
    );

    await connection.commit();
    connection.release();

    return res.json({
      message: 'Tindak lanjut berhasil disimpan.',
      followups: { id: followupId, report_id: id, guru_id: req.user.id, catatan, tindakan }
    });
  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error('Add followup error:', err.message);
    return res.status(500).json({ message: 'Gagal menyimpan tindak lanjut.' });
  }
};

const allSiswa = async (req, res) => {
  try {
    const { kelas, search } = req.query;
    const conditions = ["u.role = 'siswa'"];
    const params = [];

    if (kelas && kelas !== 'Semua') {
      conditions.push('s.kelas = ?');
      params.push(kelas);
    }

    if (search) {
      conditions.push('(u.nama LIKE ? OR s.nis LIKE ? OR s.kelas LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [rows] = await db.query(
      `SELECT 
        u.id, u.nama, u.email, 
        s.nis, s.kelas, u.jenis_kelamin,
        (SELECT COUNT(*) FROM reports r WHERE r.user_id = u.id) AS jumlah_laporan
      FROM users u
      LEFT JOIN students s ON u.id = s.user_id
      ${whereClause}
      ORDER BY u.nama ASC`,
      params
    );

    const formatted = rows.map((siswa) => {
      const nameParts = (siswa.nama || 'S').trim().split(' ');
      const inisial = nameParts.length > 1 
        ? (nameParts[0][0] + nameParts[1][0]).toUpperCase() 
        : nameParts[0].substring(0, 2).toUpperCase();

      let status = 'Aman';
      if (siswa.jumlah_laporan >= 3) {
        status = 'Pendampingan';
      } else if (siswa.jumlah_laporan >= 1) {
        status = 'Perlu Perhatian';
      }

      return {
        id: siswa.id,
        nama: siswa.nama || 'Tanpa Nama',
        nis: siswa.nis || '-',
        kelas: siswa.kelas || '-',
        email: siswa.email || '-',
        jenisKelamin: siswa.jenis_kelamin || 'Laki-laki',
        laporan: siswa.jumlah_laporan || 0,
        status: status,
        inisial: inisial
      };
    });

    return res.status(200).json(formatted);
  } catch (err) {
    console.error('Get all siswa error:', err.message);
    return res.status(500).json({ message: 'Gagal mengambil data siswa.' });
  }
};

module.exports = { dashboardStats, listReports, addFollowup, allSiswa };
