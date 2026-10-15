const crypto = require("crypto");
const { db } = require("../config/db");
const { classifyRisk } = require("../utils/riskClassifier");
const { upload } = require("../config/cloudinary");

const getStudentProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      `SELECT 
        u.id, u.nama, u.email, u.role, u.jenis_kelamin,
        s.nis, s.kelas, s.jurusan, s.tahun_masuk, s.nama_wali, s.kontak_wali
      FROM users u
      LEFT JOIN students s ON u.id = s.user_id
      WHERE u.id = ?`,
      [userId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Profil siswa tidak ditemukan." });
    }

    const student = rows[0];

    return res.status(200).json({
      id: student.id,
      nama: student.nama || "",
      email: student.email || "",
      jenis_kelamin: student.jenis_kelamin || "",
      nis: student.nis || "",
      kelas: student.kelas || "",
      jurusan: student.jurusan || "",
      tahun_masuk: student.tahun_masuk || "",
      nama_wali: student.nama_wali || "",
      kontak_wali: student.kontak_wali || "",
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

const updateStudentProfile = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const userId = req.user.id;
    const {
      nama,
      email,
      jenis_kelamin,
      nis,
      kelas,
      jurusan,
      tahun_masuk,
      nama_wali,
      kontak_wali,
    } = req.body;

    await connection.query(
      `UPDATE users SET nama = ?, email = ?, jenis_kelamin = ? WHERE id = ?`,
      [nama, email, jenis_kelamin, userId],
    );

    const [existingStudent] = await connection.query(
      `SELECT id FROM students WHERE user_id = ?`,
      [userId],
    );

    if (existingStudent.length > 0) {
      await connection.query(
        `UPDATE students SET nis = ?, kelas = ?, jurusan = ?, tahun_masuk = ?, nama_wali = ?, kontak_wali = ? WHERE user_id = ?`,
        [nis, kelas, jurusan, tahun_masuk, nama_wali, kontak_wali, userId],
      );
    } else {
      const studentId = crypto.randomUUID();
      await connection.query(
        `INSERT INTO students (id, user_id, nis, kelas, jurusan, tahun_masuk, nama_wali, kontak_wali) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          studentId,
          userId,
          nis,
          kelas,
          jurusan,
          tahun_masuk,
          nama_wali,
          kontak_wali,
        ],
      );
    }

    await connection.commit();
    connection.release();

    return res.status(200).json({ message: "Profil berhasil diperbarui." });
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

const createReport = async (req, res) => {
  try {
    const {
      jenis,
      kronologi,
      lokasi,
      tanggal_kejadian,
      waktu_kejadian,
      anonymous,
    } = req.body;

    if (!jenis || !kronologi || !lokasi || !tanggal_kejadian) {
      return res
        .status(400)
        .json({
          message: "Mohon lengkapi semua data laporan yang wajib diisi.",
        });
    }

    const reportId = crypto.randomUUID();
    const isAnonymous = Boolean(anonymous);
    const priority = classifyRisk(jenis, kronologi);

    let buktiUrl = null;
    if (req.file) {
      buktiUrl = req.file.path;
    }

    await db.query(
      `INSERT INTO reports
        (id, user_id, jenis_kejadian, kronologi, lokasi, tanggal_kejadian, waktu_kejadian, anonymous, priority, STATUS, bukti_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'BARU', ?)`,
      [
        reportId,
        req.user.id,
        jenis,
        kronologi,
        lokasi,
        tanggal_kejadian,
        waktu_kejadian || null,
        isAnonymous,
        priority,
        buktiUrl,
      ],
    );

    return res
      .status(201)
      .json({
        message: "Laporan berhasil dikirim.",
        reportId,
        priority,
        buktiUrl,
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

const myReports = async (req, res) => {
  try {
    const { status } = req.query;
    const conditions = ["r.user_id = ?"];
    const params = [req.user.id];

    if (status && status !== "Semua") {
      conditions.push("r.status = ?");
      params.push(status);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const [rows] = await db.query(
      `SELECT
        r.id, r.jenis_kejadian AS jenis, r.kronologi, r.lokasi,
        r.tanggal_kejadian, r.waktu_kejadian, r.bukti_url,
        r.anonymous, r.status, r.created_at
      FROM reports r
      ${whereClause}
      ORDER BY r.created_at DESC`,
      params,
    );

    const formatted = await Promise.all(
      rows.map(async (rep) => {
        const [followups] = await db.query(
          `SELECT id, catatan, tindakan FROM followups WHERE report_id = ?`,
          [rep.id],
        );

        return {
          id: rep.id,
          jenis: rep.jenis,
          kronologi: rep.kronologi,
          lokasi: rep.lokasi,
          tanggal_kejadian: rep.tanggal_kejadian,
          waktu_kejadian: rep.waktu_kejadian,
          bukti_url: rep.bukti_url,
          anonymous: Boolean(rep.anonymous),
          status: rep.status,
          created_at: rep.created_at,
          followups: followups,
        };
      }),
    );

    return res.status(200).json(formatted);
  } catch (err) {
    return res
      .status(500)
      .json({
        message:
          "Terjadi kendala pada sistem. Silakan coba beberapa saat lagi.",
      });
  }
};

const dashboardsiswa = async (req, res) => {
  try {
    const userId = req.user.id;

    const [stats] = await db.query(
      `
      SELECT 
        COUNT(*) AS total_laporan,
        SUM(CASE WHEN status = 'BARU' THEN 1 ELSE 0 END) AS laporan_baru,
        SUM(CASE WHEN status = 'SEDANG DITANGANI' THEN 1 ELSE 0 END) AS sedang_ditangani,
        SUM(CASE WHEN status = 'SELESAI' THEN 1 ELSE 0 END) AS selesai
      FROM reports 
      WHERE user_id = ?
    `,
      [userId],
    );

    const [recentRows] = await db.query(
      `
      SELECT
        r.id, r.jenis_kejadian AS jenis, r.kronologi, r.lokasi,
        r.tanggal_kejadian, r.waktu_kejadian, r.bukti_url,
        r.anonymous, r.status, r.created_at
      FROM reports r
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC 
      LIMIT 1
    `,
      [userId],
    );

    let formattedLatest = null;
    if (recentRows.length > 0) {
      const rep = recentRows[0];
      const [followups] = await db.query(
        `SELECT id, catatan, tindakan FROM followups WHERE report_id = ?`,
        [rep.id],
      );

      formattedLatest = {
        id: rep.id,
        jenis: rep.jenis,
        kronologi: rep.kronologi,
        lokasi: rep.lokasi,
        tanggal_kejadian: rep.tanggal_kejadian,
        waktu_kejadian: rep.waktu_kejadian,
        bukti_url: rep.bukti_url,
        anonymous: Boolean(rep.anonymous),
        status: rep.status,
        created_at: rep.created_at,
        followups: followups,
      };
    }

    return res.status(200).json({
      message: "Berhasil memuat data dasbor siswa.",
      statistik: stats[0],
      laporan_terbaru: formattedLatest,
      reports: formattedLatest ? [formattedLatest] : [],
      laporan: formattedLatest ? [formattedLatest] : [],
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

module.exports = {
  createReport,
  myReports,
  dashboardsiswa,
  getStudentProfile,
  updateStudentProfile,
  upload,
};
