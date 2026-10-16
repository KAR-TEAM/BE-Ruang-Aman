const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { db } = require("../config/db");
const { createAndSendOtp, verifyOtpCode } = require("../utils/otpService");

const JWT_SECRET = process.env.JWT_SECRET;

const register = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const {
      nama,
      email,
      password,
      school_id,
      role,
      nis,
      nip,
      kelas,
      jurusan,
      jenis_kelamin,
    } = req.body;

    const cleanEmail = email ? email.trim().toLowerCase() : "";
    if (!cleanEmail.endsWith(".sch.id") || !cleanEmail.endsWith(".gmail.com")) {
      connection.release();
      return res.status(400).json({
        message:
          "Pendaftaran wajib menggunakan email sekolah (.sch.id) atau Gmail (.gmail.com).",
      });
    }

    let userRole = "Siswa";
    const lowerRole = role ? role.toLowerCase() : "";

    if (
      lowerRole === "guru bk" ||
      lowerRole === "guru_bk" ||
      lowerRole === "guru"
    ) {
      userRole = "Guru BK";
    } else if (lowerRole === "admin" || lowerRole === "admin sekolah") {
      userRole = "Admin";
    } else if (!school_id && lowerRole === "superadmin") {
      userRole = "Superadmin";
    }

    if (
      !nama ||
      !email ||
      !password ||
      (userRole !== "Superadmin" && !school_id)
    ) {
      connection.release();
      return res.status(400).json({
        message:
          userRole === "Superadmin"
            ? "Nama lengkap, email, dan kata sandi wajib diisi."
            : "Nama lengkap, email, kata sandi, dan sekolah wajib dipilih.",
      });
    }

    if (userRole !== "Superadmin") {
      const [schools] = await connection.query(
        "SELECT id FROM schools WHERE id = ?",
        [school_id],
      );
      if (schools.length === 0) {
        connection.release();
        return res.status(400).json({
          message: "Sekolah yang dipilih tidak ditemukan dalam sistem.",
        });
      }
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

    const statusAkun =
      userRole === "Superadmin" ? "Aktif" : "Menunggu Verifikasi";
    const isVerified = userRole === "Superadmin" ? 1 : 0;
    const finalSchoolId = userRole === "Superadmin" ? null : school_id;

    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO users (id, school_id, nama, email, PASSWORD, role, jenis_kelamin, status_akun, is_verified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        finalSchoolId,
        nama,
        email,
        hashedPassword,
        userRole,
        jenis_kelamin || null,
        statusAkun,
        isVerified,
      ],
    );

    if (userRole === "Siswa") {
      const studentId = crypto.randomUUID();
      await connection.query(
        `INSERT INTO students (id, user_id, nis, kelas, jurusan)
          VALUES (?, ?, ?, ?, ?)`,
        [studentId, userId, nis || "-", kelas || "-", jurusan || null],
      );
    } else if (userRole === "Guru BK") {
      const teacherId = crypto.randomUUID();
      await connection.query(
        `INSERT INTO teacher_profiles (id, user_id, nip)
          VALUES (?, ?, ?)`,
        [teacherId, userId, nip || "-"],
      );
    }

    await connection.commit();
    connection.release();

    if (userRole === "Superadmin") {
      return res.status(201).json({
        message: "Registrasi berhasil. Silakan masuk.",
        userId,
      });
    }

    createAndSendOtp(email, nama).catch(() => {});

    return res.status(201).json({
      message: `Pendaftaran akun ${userRole} berhasil. Kode verifikasi sedang dikirim ke email Anda.`,
      userId,
    });
  } catch (err) {
    await connection.rollback();
    connection.release();
    return res.status(500).json({
      message: "Terjadi kendala pada sistem. Silakan coba beberapa saat lagi.",
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp_code } = req.body;

    if (!email || !otp_code) {
      return res
        .status(400)
        .json({ message: "Email dan kode verifikasi wajib diisi." });
    }

    const isValid = await verifyOtpCode(email, otp_code);
    if (!isValid) {
      return res
        .status(400)
        .json({ message: "Kode verifikasi salah atau sudah kedaluwarsa." });
    }

    await db.query(
      `UPDATE users SET is_verified = 1, status_akun = 'Aktif' WHERE email = ?`,
      [email],
    );

    return res.json({
      message: "Verifikasi berhasil. Akun Anda sudah aktif, silakan masuk.",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Terjadi kendala pada sistem. Silakan coba beberapa saat lagi.",
    });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Alamat email wajib diisi." });
    }

    const [users] = await db.query(
      "SELECT nama, is_verified FROM users WHERE email = ?",
      [email],
    );
    if (users.length === 0) {
      return res.status(404).json({ message: "Email tidak ditemukan." });
    }
    if (users[0].is_verified) {
      return res
        .status(400)
        .json({ message: "Akun ini sudah terverifikasi. Silakan masuk." });
    }

    createAndSendOtp(email, users[0].nama).catch(() => {});

    return res.json({
      message: "Kode verifikasi baru sedang dikirim ke email Anda.",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Gagal mengirim ulang kode verifikasi." });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email dan kata sandi wajib diisi." });
    }

    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (users.length === 0) {
      return res.status(400).json({ message: "Email atau kata sandi salah." });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.PASSWORD);
    if (!isMatch) {
      return res.status(400).json({ message: "Email atau kata sandi salah." });
    }

    if (!user.is_verified) {
      return res.status(403).json({
        message:
          "Akun belum diverifikasi. Silakan periksa email Anda untuk kode verifikasi.",
      });
    }

    if (user.status_akun !== "Aktif") {
      return res.status(403).json({
        message: "Akun Anda sedang tidak aktif. Silakan hubungi pengelola.",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        school_id: user.school_id,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    return res.json({
      message: "Berhasil masuk.",
      token,
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        school_id: user.school_id,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "Terjadi kendala pada sistem. Silakan coba beberapa saat lagi.",
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Alamat email wajib diisi." });
    }

    const [users] = await db.query("SELECT nama FROM users WHERE email = ?", [
      email,
    ]);
    if (users.length === 0) {
      return res.status(404).json({ message: "Email tidak ditemukan." });
    }

    createAndSendOtp(email, users[0].nama).catch(() => {});

    return res.json({
      message: "Kode pemulihan kata sandi sedang dikirim ke email Anda.",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Gagal mengirim kode pemulihan kata sandi." });
  }
};

const resetPassword = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      connection.release();
      return res
        .status(400)
        .json({ message: "Email dan kata sandi baru wajib diisi." });
    }

    const [users] = await connection.query(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );
    if (users.length === 0) {
      connection.release();
      return res.status(404).json({ message: "Email tidak ditemukan." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await connection.beginTransaction();

    await connection.query("UPDATE users SET PASSWORD = ? WHERE email = ?", [
      hashedPassword,
      email,
    ]);

    await connection.commit();
    connection.release();

    return res.json({
      message:
        "Kata sandi berhasil diubah. Silakan masuk dengan kata sandi baru.",
    });
  } catch (err) {
    await connection.rollback();
    connection.release();
    return res.status(500).json({ message: "Gagal memperbarui kata sandi." });
  }
};

const searchSchool = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res
        .status(400)
        .json({ message: "Kata kunci pencarian sekolah wajib diisi." });
    }

    const [schools] = await db.query(
      "SELECT id, nama_sekolah, npsn FROM schools WHERE nama_sekolah LIKE ? LIMIT 10",
      [`%${query}%`],
    );

    return res.json({ schools });
  } catch (err) {
    return res.status(500).json({
      message: "Terjadi kendala pada sistem. Silakan coba beberapa saat lagi.",
    });
  }
};

module.exports = {
  register,
  verifyOtp,
  resendOtp,
  login,
  searchSchool,
  forgotPassword,
  resetPassword,
};
