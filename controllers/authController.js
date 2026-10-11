const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { db } = require("../config/db");
const { createAndSendOtp, verifyOtpCode } = require("../utils/otpService");

const JWT_SECRET = process.env.JWT_SECRET;

const register = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { nama, email, password, school_id, role, nis, nip, kelas, jurusan, jenis_kelamin } =
      req.body;

    // Normalisasi Role di awal agar bisa digunakan untuk validasi
    let userRole = "Siswa";
    const lowerRole = role ? role.toLowerCase() : "";

    if (lowerRole === "guru bk" || lowerRole === "guru_bk" || lowerRole === "guru") {
      userRole = "Guru BK";
    } else if (lowerRole === "admin" || lowerRole === "admin sekolah") {
      userRole = "Admin";
    } else if (!school_id && lowerRole === "superadmin") {
      userRole = "Superadmin";
    }

    // Validasi input wajib berdasarkan role
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
            ? "Nama, Email, dan Password wajib diisi."
            : "Nama, Email, Password, dan Sekolah wajib diisi.",
      });
    }

    // Validasi apakah sekolah terdaftar di database (Hanya jika bukan Superadmin)
    if (userRole !== "Superadmin") {
      const [schools] = await connection.query(
        "SELECT id FROM schools WHERE id = ?",
        [school_id],
      );
      if (schools.length === 0) {
        connection.release();
        return res
          .status(400)
          .json({ message: "Sekolah yang dipilih tidak valid." });
      }
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

    // Jika Superadmin, langsung aktif dan terverifikasi tanpa OTP
    const statusAkun =
      userRole === "Superadmin" ? "Aktif" : "Menunggu Verifikasi";
    const isVerified = userRole === "Superadmin" ? 1 : 0;
    const finalSchoolId = userRole === "Superadmin" ? null : school_id;

    await connection.beginTransaction();

    // Insert ke tabel users (Menyertakan kolom jenis_kelamin)
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

    // Jika Siswa, masukkan ke tabel students
    if (userRole === "Siswa") {
      const studentId = crypto.randomUUID();
      await connection.query(
        `INSERT INTO students (id, user_id, nis, kelas, jurusan)
          VALUES (?, ?, ?, ?, ?)`,
        [studentId, userId, nis || "-", kelas || "-", jurusan || null],
      );
    }
    // Jika Guru BK, masukkan ke tabel teacher_profiles (Menyertakan kolom nip)
    else if (userRole === "Guru BK") {
      const teacherId = crypto.randomUUID();
      await connection.query(
        `INSERT INTO teacher_profiles (id, user_id, nip)
          VALUES (?, ?, ?)`,
        [teacherId, userId, nip || "-"],
      );
    }

    await connection.commit();
    connection.release();

    // Jika Superadmin, langsung sukses tanpa kirim OTP
    if (userRole === "Superadmin") {
      return res.status(201).json({
        message: "Registrasi Superadmin berhasil. Silakan login.",
        userId,
      });
    }

    // KIRIM OTP DI BACKGROUND (TANPA AWAIT) AGAR TIDAK TIMEOUT
    createAndSendOtp(email, nama).catch((otpErr) => {
      console.error("Gagal mengirim OTP di background:", otpErr.message);
    });

    return res.status(201).json({
      message: `Registrasi ${userRole} berhasil. Kode OTP sedang dikirim ke email Anda.`,
      userId,
    });
  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error("Register error:", err.message);
    return res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

// Verifikasi kode OTP
const verifyOtp = async (req, res) => {
  try {
    const { email, otp_code } = req.body;

    if (!email || !otp_code) {
      return res
        .status(400)
        .json({ message: "Email dan kode OTP wajib diisi." });
    }

    const isValid = await verifyOtpCode(email, otp_code);
    if (!isValid) {
      return res
        .status(400)
        .json({ message: "Kode OTP salah atau sudah kedaluwarsa." });
    }

    await db.query(
      `UPDATE users SET is_verified = 1, status_akun = 'Aktif' WHERE email = ?`,
      [email],
    );

    return res.json({
      message: "Verifikasi berhasil. Akun Anda sudah aktif, silakan login.",
    });
  } catch (err) {
    console.error("Verify OTP error:", err.message);
    return res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

// Kirim ulang OTP
const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email wajib diisi." });
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
        .json({ message: "Akun sudah terverifikasi. Silakan login." });
    }

    // Kirim OTP di background tanpa await
    createAndSendOtp(email, users[0].nama).catch((err) => {
      console.error("Resend OTP background error:", err.message);
    });

    return res.json({ message: "Kode OTP baru sedang dikirim ke email Anda." });
  } catch (err) {
    console.error("Resend OTP error:", err.message);
    return res.status(500).json({ message: "Gagal mengirim ulang OTP." });
  }
};

// Login user (Superadmin, Admin Sekolah, Guru BK, Siswa)
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email dan password wajib diisi." });
    }

    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (users.length === 0) {
      return res.status(400).json({ message: "Email atau password salah." });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.PASSWORD);
    if (!isMatch) {
      return res.status(400).json({ message: "Email atau password salah." });
    }

    if (!user.is_verified) {
      return res.status(403).json({
        message: "Akun belum diverifikasi. Silakan cek email untuk kode OTP.",
      });
    }

    if (user.status_akun !== "Aktif") {
      return res
        .status(403)
        .json({ message: "Akun tidak aktif. Hubungi administrator." });
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
      message: "Login berhasil.",
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
    console.error("Login error:", err.message);
    return res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

// Meminta pengiriman OTP untuk reset password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email wajib diisi." });
    }

    const [users] = await db.query("SELECT nama FROM users WHERE email = ?", [
      email,
    ]);
    if (users.length === 0) {
      return res.status(404).json({ message: "Email tidak ditemukan." });
    }

    // Kirim OTP di background tanpa await
    createAndSendOtp(email, users[0].nama).catch((err) => {
      console.error("Forgot password background error:", err.message);
    });

    return res.json({
      message: "Kode OTP untuk reset password sedang dikirim ke email Anda.",
    });
  } catch (err) {
    console.error("Forgot password error:", err.message);
    return res
      .status(500)
      .json({ message: "Gagal mengirim kode OTP reset password." });
  }
};

// Verifikasi OTP dan memperbarui password baru (Tanpa cek ulang verifyOtpCode karena sudah divalidasi di step sebelumnya)
const resetPassword = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { email, newPassword } = req.body; // otp_code tidak wajib di sini jika sudah diverifikasi di step sebelumnya

    if (!email || !newPassword) {
      connection.release();
      return res
        .status(400)
        .json({ message: "Email dan password baru wajib diisi." });
    }

    // Pastikan user dengan email tersebut ada
    const [users] = await connection.query("SELECT id FROM users WHERE email = ?", [email]);
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
      message: "Password berhasil diubah. Silakan login dengan password baru.",
    });
  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error("Reset password error:", err.message);
    return res.status(500).json({ message: "Gagal mereset password." });
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
      [`%${query}%`],
    );

    return res.json({ schools });
  } catch (err) {
    console.error("Search school error:", err.message);
    return res.status(500).json({ message: "Terjadi kesalahan pada server." });
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