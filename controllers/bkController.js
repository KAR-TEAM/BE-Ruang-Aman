const crypto = require("crypto");
const { db } = require("../config/db");

const VALID_STATUSES = ["BARU", "SEDANG DITANGANI", "SELESAI"];

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      `SELECT 
        u.id, u.nama, u.email, u.role, u.jenis_kelamin, 
        s.nama_sekolah, s.npsn, s.jenjang,
        tp.nip
      FROM users u
      LEFT JOIN schools s ON u.school_id = s.id
      LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
      WHERE u.id = ?`,
      [userId],
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Profil pengguna tidak ditemukan." });
    }

    const user = rows[0];

    return res.status(200).json({
      id: user.id,
      nama: user.nama || "Guru BK",
      email: user.email || "-",
      role: user.role || "guru bk",
      jenis_kelamin: user.jenis_kelamin || "-",
      sekolah: user.nama_sekolah || "Instansi Sekolah",
      npsn: user.npsn || "-",
      jenjang: user.jenjang || "-",
      nip: user.nip || "-",
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

const updateProfile = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.id;
    const { nama, email, jenis_kelamin, nip } = req.body;

    await connection.beginTransaction();

    await connection.query(
      `UPDATE users SET nama = ?, email = ?, jenis_kelamin = ? WHERE id = ?`,
      [nama, email, jenis_kelamin || null, userId],
    );

    const [existingTp] = await connection.query(
      `SELECT id FROM teacher_profiles WHERE user_id = ?`,
      [userId],
    );

    if (existingTp.length > 0) {
      await connection.query(
        `UPDATE teacher_profiles SET nip = ? WHERE user_id = ?`,
        [nip || null, userId],
      );
    } else {
      const profileId = crypto.randomUUID();
      await connection.query(
        `INSERT INTO teacher_profiles (id, user_id, nip) VALUES (?, ?, ?)`,
        [profileId, userId, nip || null],
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

const dashboardStats = async (req, res) => {
  try {
    const guruId = req.user.id;

    const [guruRows] = await db.query(
      "SELECT school_id FROM users WHERE id = ?",
      [guruId],
    );
    if (guruRows.length === 0 || !guruRows[0].school_id) {
      return res
        .status(403)
        .json({
          message: "Instansi sekolah Anda tidak ditemukan dalam sistem.",
        });
    }
    const schoolId = guruRows[0].school_id;

    const [stats] = await db.query(
      `
      SELECT
        COUNT(r.id) AS total_laporan,
        SUM(CASE WHEN r.status = 'BARU' THEN 1 ELSE 0 END) AS jumlah_baru,
        SUM(CASE WHEN r.status = 'SEDANG DITANGANI' THEN 1 ELSE 0 END) AS sedang_ditangani,
        SUM(CASE WHEN r.status = 'SELESAI' THEN 1 ELSE 0 END) AS selesai,
        SUM(CASE WHEN r.priority = 'Tinggi' THEN 1 ELSE 0 END) AS risiko_tinggi
      FROM reports r
      JOIN users u ON r.user_id = u.id
      WHERE u.school_id = ?
    `,
      [schoolId],
    );

    return res.status(200).json(stats[0]);
  } catch (err) {
    return res
      .status(500)
      .json({
        message:
          "Terjadi kendala pada sistem. Silakan coba beberapa saat lagi.",
      });
  }
};

const listReports = async (req, res) => {
  try {
    const guruId = req.user.id;

    const [guruRows] = await db.query(
      "SELECT school_id FROM users WHERE id = ?",
      [guruId],
    );
    if (guruRows.length === 0 || !guruRows[0].school_id) {
      return res
        .status(403)
        .json({
          message: "Instansi sekolah Anda tidak ditemukan dalam sistem.",
        });
    }
    const schoolId = guruRows[0].school_id;

    const { status, priority } = req.query;
    const conditions = ["u.school_id = ?"];
    const params = [schoolId];

    if (status && status !== "Semua") {
      conditions.push("r.status = ?");
      params.push(status);
    }
    if (priority && priority !== "Semua") {
      conditions.push("r.priority = ?");
      params.push(priority);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

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
          priority: rep.priority,
          status: rep.status,
          created_at: rep.created_at,
          pelapor: rep.anonymous
            ? { nama: "Anonim", email: null, nis: null, kelas: null }
            : {
                nama: rep.nama || "Unknown",
                email: rep.email || null,
                nis: rep.nis || null,
                kelas: rep.kelas || null,
              },
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

const addFollowup = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { id } = req.params;
    const { catatan, tindakan, status_baru } = req.body;

    if (status_baru && !VALID_STATUSES.includes(status_baru)) {
      connection.release();
      return res.status(400).json({
        message: "Status tindak lanjut yang dipilih tidak valid.",
      });
    }

    const [reports] = await connection.query(
      "SELECT id FROM reports WHERE id = ?",
      [id],
    );
    if (reports.length === 0) {
      connection.release();
      return res
        .status(404)
        .json({ message: "Laporan pengaduan tidak ditemukan." });
    }

    await connection.beginTransaction();

    if (status_baru) {
      await connection.query("UPDATE reports SET status = ? WHERE id = ?", [
        status_baru,
        id,
      ]);
    }

    const followupId = crypto.randomUUID();
    await connection.query(
      `INSERT INTO followups (id, report_id, guru_id, catatan, tindakan)
       VALUES (?, ?, ?, ?, ?)`,
      [followupId, id, req.user.id, catatan || "", tindakan || ""],
    );

    await connection.commit();
    connection.release();

    return res.status(200).json({
      message: "Tindak lanjut berhasil disimpan.",
      followups: {
        id: followupId,
        report_id: id,
        guru_id: req.user.id,
        catatan,
        tindakan,
      },
    });
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

const allSiswa = async (req, res) => {
  try {
    const guruId = req.user.id;

    const [guruRows] = await db.query(
      "SELECT school_id FROM users WHERE id = ?",
      [guruId],
    );
    if (guruRows.length === 0 || !guruRows[0].school_id) {
      return res
        .status(403)
        .json({
          message: "Instansi sekolah Anda tidak ditemukan dalam sistem.",
        });
    }
    const schoolId = guruRows[0].school_id;

    const { kelas, search } = req.query;
    const conditions = ["u.role = 'siswa'", "u.school_id = ?"];
    const params = [schoolId];

    if (kelas && kelas !== "Semua") {
      conditions.push("s.kelas = ?");
      params.push(kelas);
    }

    if (search) {
      conditions.push("(u.nama LIKE ? OR s.nis LIKE ? OR s.kelas LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const [rows] = await db.query(
      `SELECT 
        u.id, u.nama, u.email, 
        s.nis, s.kelas, u.jenis_kelamin,
        (SELECT COUNT(*) FROM reports r WHERE r.user_id = u.id) AS jumlah_laporan
      FROM users u
      LEFT JOIN students s ON u.id = s.user_id
      ${whereClause}
      ORDER BY u.nama ASC`,
      params,
    );

    const formatted = rows.map((siswa) => {
      const nameParts = (siswa.nama || "S").trim().split(" ");
      const inisial =
        nameParts.length > 1
          ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
          : nameParts[0].substring(0, 2).toUpperCase();

      let status = "Aman";
      if (siswa.jumlah_laporan >= 3) {
        status = "Pendampingan";
      } else if (siswa.jumlah_laporan >= 1) {
        status = "Perlu Perhatian";
      }

      return {
        id: siswa.id,
        nama: siswa.nama || "Tanpa Nama",
        nis: siswa.nis || "-",
        kelas: siswa.kelas || "-",
        email: siswa.email || "-",
        jenisKelamin: siswa.jenis_kelamin || "Laki-laki",
        laporan: siswa.jumlah_laporan || 0,
        status: status,
        inisial: inisial,
      };
    });

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

module.exports = {
  getProfile,
  updateProfile,
  dashboardStats,
  listReports,
  addFollowup,
  allSiswa,
};
