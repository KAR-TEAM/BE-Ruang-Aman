const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { db } = require("../config/db");

const getSchoolStats = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [schoolsRes] = await connection.query(
      "SELECT COUNT(*) AS total_sekolah FROM schools",
    );
    const [usersRes] = await connection.query(
      "SELECT COUNT(*) AS total_users FROM users",
    );
    const [bkRes] = await connection.query(
      "SELECT COUNT(*) AS total_guru_bk FROM users WHERE LOWER(role) = 'guru bk' OR LOWER(role) = 'guru_bk'",
    );
    const [siswaRes] = await connection.query(
      "SELECT COUNT(*) AS total_siswa FROM users WHERE LOWER(role) = 'siswa'",
    );
    const [adminRes] = await connection.query(
      "SELECT COUNT(*) AS total_admin FROM users WHERE LOWER(role) = 'admin'",
    );

    connection.release();

    return res.status(200).json({
      message: "Berhasil memuat data statistik.",
      total_sekolah: schoolsRes[0]?.total_sekolah || 0,
      total_users: usersRes[0]?.total_users || 0,
      total_guru_bk: bkRes[0]?.total_guru_bk || 0,
      total_siswa: siswaRes[0]?.total_siswa || 0,
      total_admin: adminRes[0]?.total_admin || 0,
    });
  } catch (err) {
    connection.release();
    return res
      .status(500)
      .json({
        message:
          "Terjadi kendala pada sistem. Silakan coba beberapa saat lagi.",
      });
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

    sql += " LIMIT ? OFFSET ?";
    params.push(Number(limit), Number(offset));

    const [users] = await db.query(sql, params);
    const [totalRes] = await db.query(
      countSql,
      params.slice(0, params.length - 2),
    );

    return res.status(200).json({
      message: "Berhasil mengambil data pengguna.",
      data: users,
      pagination: {
        totalItems: totalRes[0].total,
        currentPage: Number(page),
        totalPages: Math.ceil(totalRes[0].total / limit),
      },
    });
  } catch (err) {
    return res
      .status(500)
      .json({
        message:
          "Terjadi kendala pada sistem. Silakan coba beberapa saat lagi.",
      });
  }
};

const getSchools = async (req, res) => {
  try {
    const [schools] = await db.query(
      "SELECT id, nama_sekolah, alamat, npsn, jenjang FROM schools",
    );
    return res
      .status(200)
      .json({ message: "Berhasil memuat daftar sekolah.", data: schools });
  } catch (err) {
    return res
      .status(500)
      .json({
        message:
          "Terjadi kendala pada sistem. Silakan coba beberapa saat lagi.",
      });
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

    return res.json({ message: "Informasi sekolah berhasil diperbarui." });
  } catch (err) {
    return res
      .status(500)
      .json({
        message:
          "Terjadi kendala pada sistem. Silakan coba beberapa saat lagi.",
      });
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
      .json({ message: "Sekolah baru berhasil ditambahkan.", schoolId });
  } catch (err) {
    connection.release();
    return res
      .status(500)
      .json({
        message:
          "Terjadi kendala pada sistem. Silakan coba beberapa saat lagi.",
      });
  }
};

const deleteSchool = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM schools WHERE id = ?", [id]);
    return res.json({ message: "Data sekolah berhasil dihapus." });
  } catch (err) {
    return res
      .status(500)
      .json({
        message:
          "Terjadi kendala pada sistem. Silakan coba beberapa saat lagi.",
      });
  }
};

const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, email } = req.body;

    await db.query(
      "UPDATE users SET nama = ?, email = ? WHERE id = ? AND role = 'Admin'",
      [nama, email, id],
    );
    return res.json({
      message: "Informasi pengelola sekolah berhasil diperbarui.",
    });
  } catch (err) {
    return res
      .status(500)
      .json({
        message:
          "Terjadi kendala pada sistem. Silakan coba beberapa saat lagi.",
      });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM users WHERE id = ?", [id]);
    return res.json({ message: "Akun pengguna berhasil dihapus." });
  } catch (err) {
    return res
      .status(500)
      .json({
        message:
          "Terjadi kendala pada sistem. Silakan coba beberapa saat lagi.",
      });
  }
};

const createAdminSekolah = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { nama, email, password, school_id } = req.body;
    if (!nama || !email || !password || !school_id) {
      connection.release();
      return res
        .status(400)
        .json({ message: "Semua data formulir wajib diisi." });
    }

    const [existingUsers] = await connection.query(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );
    if (existingUsers.length > 0) {
      connection.release();
      return res
        .status(400)
        .json({ message: "Alamat email ini sudah terdaftar." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO users (id, school_id, nama, email, PASSWORD, role, status_akun, is_verified)
       VALUES (?, ?, ?, ?, ?, 'Admin', 'Aktif', 1)`,
      [userId, school_id, nama, email, hashedPassword],
    );

    await connection.commit();
    connection.release();

    return res
      .status(201)
      .json({ message: "Akun admin sekolah berhasil dibuat.", userId });
  } catch (err) {
    await connection.rollback();
    connection.release();
    return res
      .status(500)
      .json({
        message:
          "Terjadi kendala pada sistem. Silakan coba beberapa saat lagi.",
      });
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
    return res
      .status(500)
      .json({
        message:
          "Terjadi kendala pada sistem. Silakan coba beberapa saat lagi.",
      });
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
