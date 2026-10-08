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
    
    connection.release();

    return res.status(200).json({
      message: "Berhasil mengambil statistik.",
      total_sekolah: schoolsRes[0]?.total_sekolah || 0,
      total_users: usersRes[0]?.total_users || 0,
      total_guru_bk: bkRes[0]?.total_guru_bk || 0,
      total_siswa: siswaRes[0]?.total_siswa || 0,
    });
  } catch (err) {
    connection.release();
    console.error("Get School Stats error:", err.message);
    return res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

const getSchools = async (req, res) => {
  try {
    const [schools] = await db.query(
      "SELECT id, nama_sekolah, alamat, npsn FROM schools",
    );
    return res.status(200).json({ message: "Berhasil.", data: schools });
  } catch (err) {
    console.error("Get Schools error:", err.message);
    return res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

// FITUR BARU: Ambil data Admin Sekolah, Guru BK, dan Siswa
const getAllUsersByRole = async (req, res) => {
  try {
    const { role } = req.query; // 'Admin', 'Guru BK', atau 'Siswa'
    let query = `
      SELECT u.id, u.nama, u.email, u.role, u.status_akun, s.nama_sekolah 
      FROM users u 
      LEFT JOIN schools s ON u.school_id = s.id 
    `;
    let params = [];
    if (role) {
      query += " WHERE LOWER(u.role) = LOWER(?)";
      params.push(role);
    }

    const [users] = await db.query(query, params);
    return res.status(200).json({ message: "Berhasil mengambil data user.", data: users });
  } catch (err) {
    console.error("Get Users error:", err.message);
    return res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};
  
// FITUR BARU: Edit Sekolah
const updateSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_sekolah, alamat, npsn } = req.body;

    await db.query(
      "UPDATE schools SET nama_sekolah = ?, alamat = ?, npsn = ? WHERE id = ?",
      [nama_sekolah, alamat, npsn, id],
    );

    return res.json({ message: "Data sekolah berhasil diperbarui." });
  } catch (err) {
    console.error("Update school error:", err.message);
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

const createSchool = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { nama_sekolah, alamat, npsn } = req.body;
    if (!nama_sekolah) {
      connection.release();
      return res.status(400).json({ message: "Nama sekolah wajib diisi." });
    }

    const schoolId = crypto.randomUUID();
    await connection.query(
      `INSERT INTO schools (id, nama_sekolah, alamat, npsn) VALUES (?, ?, ?, ?)`,
      [schoolId, nama_sekolah, alamat || null, npsn || null],
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

const createAdminSekolah = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { nama, email, password, sekolah_id } = req.body;
    if (!nama || !email || !password || !sekolah_id) {
      connection.release();
      return res.status(400).json({ message: "Semua field wajib diisi." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    await connection.query(
      `INSERT INTO users (id, school_id, nama, email, PASSWORD, role, status_akun, is_verified)
       VALUES (?, ?, ?, ?, ?, 'Admin', 'Aktif', 1)`,
      [userId, sekolah_id, nama, email, hashedPassword],
    );

    connection.release();
    return res
      .status(201)
      .json({ message: "Akun Admin Sekolah berhasil dibuat.", userId });
  } catch (err) {
    connection.release();
    console.error("Create Admin error:", err.message);
    return res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

const searchSchool = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: "Query pencarian wajib diisi." });
    }

    const [schools] = await db.query(
      "SELECT id, nama_sekolah, npsn FROM schools WHERE nama_sekolah LIKE ? LIMIT 10",
      [`%${query}%`]
    );

    return res.json({ schools });
  } catch (err) {
    console.error("Search school error:", err.message);
    return res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }};

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
