const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { db } = require("../config/db");

const getSchoolStats = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [schoolsRes] = await connection.query("SELECT COUNT(*) AS total_sekolah FROM schools");
    const [usersRes] = await connection.query("SELECT COUNT(*) AS total_users FROM users");
    const [bkRes] = await connection.query("SELECT COUNT(*) AS total_guru_bk FROM users WHERE LOWER(role) = 'guru bk' OR LOWER(role) = 'guru_bk'");
    const [siswaRes] = await connection.query("SELECT COUNT(*) AS total_siswa FROM users WHERE LOWER(role) = 'siswa'");
    
    // TAMBAHAN: Hitung total admin sekolah
    const [adminRes] = await connection.query("SELECT COUNT(*) AS total_admin FROM users WHERE LOWER(role) = 'admin'");
    
    connection.release();

    return res.status(200).json({
      message: "Berhasil mengambil statistik.",
      total_sekolah: schoolsRes[0]?.total_sekolah || 0,
      total_users: usersRes[0]?.total_users || 0,
      total_guru_bk: bkRes[0]?.total_guru_bk || 0,
      total_siswa: siswaRes[0]?.total_siswa || 0,
      total_admin: adminRes[0]?.total_admin || 0, // Mengirim key total_admin
    });
  } catch (err) {
    connection.release();
    console.error("Get School Stats error:", err.message);
    return res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

const getAllUsersByRole = async (req, res) => {
  try {
    const { role, query, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT u.id, u.nama, u.email, u.role, u.status_akun, s.nama_sekolah 
      FROM users u 
      LEFT JOIN schools s ON u.school_id = s.id 
      WHERE 1=1
    `;
    let countSql = `SELECT COUNT(*) as total FROM users u WHERE 1=1`;
    let params = [];

    if (role && role.trim() !== "") {
      sql += " AND LOWER(u.role) = LOWER(?)";
      countSql += " AND LOWER(u.role) = LOWER(?)";
      params.push(role);
    }

    if (query && query.trim() !== "") {
      sql += " AND (u.nama LIKE ? OR u.email LIKE ?)";
      countSql += " AND (u.nama LIKE ? OR u.email LIKE ?)";
      params.push(`%${query}%`, `%${query}%`);
    }

    // Tambahkan limit dan offset untuk pagination
    sql += " LIMIT ? OFFSET ?";
    params.push(Number(limit), Number(offset));

    const [users] = await db.query(sql, params);
    const [totalRes] = await db.query(countSql, params.slice(0, params.length - 2)); // Ambil total data asli untuk hitung halaman

    return res.status(200).json({
      message: "Berhasil mengambil data user.",
      data: users,
      pagination: {
        totalItems: totalRes[0].total,
        currentPage: Number(page),
        totalPages: Math.ceil(totalRes[0].total / limit),
      }
    });
  } catch (err) {
    console.error("Get Users error:", err.message);
    return res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

const getSchools = async (req, res) => {
  try {
    const [schools] = await db.query(
      "SELECT id, nama_sekolah, alamat, npsn, jenjang FROM schools",
    );
    return res.status(200).json({ message: "Berhasil.", data: schools });
  } catch (err) {
    console.error("Get Schools error:", err.message);
    return res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

const updateSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_sekolah, alamat, npsn, jenjang } = req.body;

    await db.query(
      "UPDATE schools SET nama_sekolah = ?, alamat = ?, npsn = ?, jenjang = ? WHERE id = ?",
      [nama_sekolah, alamat || null, npsn || null, jenjang || null, id],
    );

    return res.json({ message: "Data sekolah berhasil diperbarui." });
  } catch (err) {
    console.error("Update school error:", err.message);
    return res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

const createSchool = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { nama_sekolah, alamat, npsn, jenjang } = req.body;
    if (!nama_sekolah) {
      connection.release();
      return res.status(400).json({ message: "Nama sekolah wajib diisi." });
    }

    const schoolId = crypto.randomUUID();
    await connection.query(
      `INSERT INTO schools (id, nama_sekolah, alamat, npsn, jenjang) VALUES (?, ?, ?, ?, ?)`,
      [schoolId, nama_sekolah, alamat || null, npsn || null, jenjang || null],
    );

    connection.release();
    return res
      .status(201)
      .json({ message: "Sekolah berhasil ditambahkan.", schoolId });
  } catch (err) {
    connection.release();
    console.error("Create School error:", err.message);
    return res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

// FITUR BARU: Delete Sekolah
const deleteSchool = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM schools WHERE id = ?", [id]);
    return res.json({ message: "Sekolah berhasil dihapus." });
  } catch (err) {
    console.error("Delete school error:", err.message);
    return res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

// FITUR BARU: Edit Admin (User)
const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, email } = req.body;

    await db.query(
      "UPDATE users SET nama = ?, email = ? WHERE id = ? AND role = 'Admin'",
      [nama, email, id],
    );
    return res.json({ message: "Data Admin berhasil diperbarui." });
  } catch (err) {
    console.error("Update admin error:", err.message);
    return res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

// FITUR BARU: Delete Admin / User
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM users WHERE id = ?", [id]);
    return res.json({ message: "User berhasil dihapus." });
  } catch (err) {
    console.error("Delete user error:", err.message);
    return res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

const createAdminSekolah = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { nama, email, password, sekolah_id } = req.body;
    if (!nama || !email || !password || !sekolah_id) {
      connection.release();
      return res.status(400).json({ message: "Semua field wajib diisi." });
    }

    // Cek duplikasi email
    const [existingUsers] = await connection.query(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );
    if (existingUsers.length > 0) {
      connection.release();
      return res.status(400).json({ message: "Email sudah terdaftar." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO users (id, school_id, nama, email, PASSWORD, role, status_akun, is_verified)
       VALUES (?, ?, ?, ?, ?, 'Admin', 'Aktif', 1)`,
      [userId, sekolah_id, nama, email, hashedPassword],
    );

    await connection.commit();
    connection.release();

    return res
      .status(201)
      .json({ message: "Akun Admin Sekolah berhasil dibuat.", userId });
  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error("Create Admin error:", err.message);
    return res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

const searchSchool = async (req, res) => {
  try {
    const { query, jenjang } = req.query;

    let sql =
      "SELECT id, nama_sekolah, alamat, npsn, jenjang FROM schools WHERE 1=1";
    let params = [];

    if (query && query.trim() !== "") {
      sql += " AND (nama_sekolah LIKE ? OR npsn LIKE ?)";
      params.push(`%${query}%`, `%${query}%`);
    }

    if (jenjang && jenjang.trim() !== "") {
      sql += " AND jenjang = ?";
      params.push(jenjang);
    }

    sql += " LIMIT 50";

    const [schools] = await db.query(sql, params);
    return res.status(200).json({ message: "Berhasil.", data: schools });
  } catch (err) {
    console.error("Search school error:", err.message);
    return res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

module.exports = {
  createAdminSekolah,
  createSchool,
  getSchoolStats,
  getSchools,
  getAllUsersByRole,
  updateSchool,
  deleteSchool,
  updateAdmin,
  deleteUser,
  searchSchool,
};
