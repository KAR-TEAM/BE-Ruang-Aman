const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_ruangaman_2026';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Melayani file statis HTML di root folder
app.use(express.static(__dirname));

// KONEKSI DATABASE MYSQL (CONNECTION POOL)

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'db_ruangaman',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Tes Koneksi MySQL saat server start
(async () => {
  try {
    const connection = await db.getConnection();
    console.log('Terhubung ke database MySQL.');
    connection.release();
  } catch (err) {
    console.error('Gagal terhubung ke MySQL:', err.message);
  }
})();

// MIDDLEWARE AUTHENTICATION & AUTHORIZATION

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Akses ditolak. Token tidak ditemukan.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token tidak valid atau kedaluwarsa.' });
  }
};

const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role?.toLowerCase();
    const normalizedRoles = allowedRoles.map((r) => r.toLowerCase());

    if (!req.user || !normalizedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Akses ditolak. Anda tidak memiliki izin.' });
    }
    next();
  };
};

// ROUTE HALAMAN & ENDPOINTS API

// Default route -> login.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// --- AUTH ENDPOINTS ---

// Register User (Siswa / Guru BK)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { nama, email, password, nis, kelas, jurusan, role } = req.body;

    if (!nama || !email || !password) {
      return res.status(400).json({ message: 'Nama, Email, dan Password wajib diisi.' });
    }

    // Cek apakah email sudah terdaftar
    const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Email sudah terdaftar.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = `usr-${Date.now()}`;
    
    // Normalisasi role sesuai ENUM MySQL: 'Siswa', 'Guru BK', 'Admin'
    let userRole = 'Siswa';
    if (role && (role.toLowerCase() === 'guru bk' || role.toLowerCase() === 'guru_bk')) {
      userRole = 'Guru BK';
    } else if (role && role.toLowerCase() === 'admin') {
      userRole = 'Admin';
    }

    // Insert ke tabel users
    await db.query(
      `INSERT INTO users (id, nama, email, password, role, status_akun) 
       VALUES (?, ?, ?, ?, ?, 'Aktif')`,
      [userId, nama, email, hashedPassword, userRole]
    );

    // Jika role Siswa, buat data profil di tabel students
    if (userRole === 'Siswa') {
      const studentId = `std-${Date.now()}`;
      await db.query(
        `INSERT INTO students (id, user_id, nis, kelas, jurusan) 
         VALUES (?, ?, ?, ?, ?)`,
        [studentId, userId, nis || '-', kelas || '-', jurusan || null]
      );
    }

    return res.status(201).json({ message: `Registrasi ${userRole} berhasil.`, userId });
  } catch (err) {
    return res.status(500).json({ message: 'Terjadi kesalahan pada server.', error: err.message });
  }
});

// Login User
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Password salah.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.json({
      message: 'Login berhasil.',
      token,
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Terjadi kesalahan pada server.', error: err.message });
  }
});

// --- SISWA ENDPOINTS ---

// Membuat Laporan Baru
app.post('/api/reports', verifyToken, authorizeRole('Siswa'), async (req, res) => {
  try {
    const { jenis, kronologi, lokasi, tanggal_kejadian, waktu_kejadian, anonymous, priority } = req.body;

    if (!jenis || !kronologi || !lokasi || !tanggal_kejadian) {
      return res.status(400).json({ message: 'Data laporan wajib diisi lengkap.' });
    }

    const reportId = `rep-${Date.now()}`;
    const isAnonymous = Boolean(anonymous);

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
        priority || 'Rendah'
      ]
    );

    return res.status(201).json({ message: 'Laporan berhasil dibuat.', reportId });
  } catch (err) {
    return res.status(500).json({ message: 'Gagal membuat laporan.', error: err.message });
  }
});

// Siswa Melihat Daftar Laporannya
app.get('/api/reports/my-reports', verifyToken, authorizeRole('Siswa'), async (req, res) => {
  try {
    const [reports] = await db.query(
      'SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil data laporan.', error: err.message });
  }
});

// --- GURU BK / DASHBOARD ENDPOINTS ---

// Dashboard Statistik Guru BK
app.get('/api/bk/dashboard/stats', verifyToken, authorizeRole('Guru BK', 'Admin'), async (req, res) => {
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
    res.status(500).json({ message: 'Gagal mengambil statistik.', error: err.message });
  }
});

// Guru BK Melihat Semua Laporan (Logika Anonim Diterapkan via SQL JOIN)
app.get('/api/bk/reports', verifyToken, authorizeRole('Guru BK', 'Admin'), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        r.id, 
        r.jenis_kejadian AS jenis, 
        r.kronologi, 
        r.lokasi, 
        r.tanggal_kejadian, 
        r.waktu_kejadian, 
        r.bukti_url, 
        r.anonymous, 
        r.priority, 
        r.status, 
        r.created_at,
        u.nama, 
        u.email, 
        s.nis, 
        s.kelas
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN students s ON u.id = s.user_id
      ORDER BY r.created_at DESC
    `);

    // Format output untuk menyembunyikan identitas jika anonymous = true (1)
    const formattedReports = rows.map((rep) => ({
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

    res.json(formattedReports);
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil daftar laporan.', error: err.message });
  }
});

// Guru BK Menambahkan Catatan Tindak Lanjut & Mengubah Status
app.post('/api/bk/reports/:id/followups', verifyToken, authorizeRole('Guru BK', 'Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { catatan, tindakan, status_baru } = req.body;

    // Cek keberadaan laporan
    const [reports] = await db.query('SELECT id FROM reports WHERE id = ?', [id]);
    if (reports.length === 0) {
      return res.status(404).json({ message: 'Laporan tidak ditemukan.' });
    }

    // Update status laporan jika ada status baru
    if (status_baru) {
      await db.query('UPDATE reports SET status = ? WHERE id = ?', [status_baru, id]);
    }

    // Simpan data followup
    const followupId = `flw-${Date.now()}`;
    await db.query(
      `INSERT INTO followups (id, report_id, guru_id, catatan, tindakan) 
       VALUES (?, ?, ?, ?, ?)`,
      [followupId, id, req.user.id, catatan || '', tindakan || '']
    );

    return res.json({
      message: 'Tindak lanjut berhasil disimpan.',
      followup: { id: followupId, report_id: id, guru_id: req.user.id, catatan, tindakan }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Gagal menyimpan tindak lanjut.', error: err.message });
  }
});

// ==========================================
// JALANKAN SERVER
// ==========================================
app.listen(PORT, () => {
  console.log(`Server RuangAman berjalan di http://localhost:${PORT}`);
});