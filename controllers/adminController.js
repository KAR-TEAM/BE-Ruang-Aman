const { db } = require("../config/db");

const StatsDashboard = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;

    const [total_siswa] = await db.query(
      "SELECT COUNT(*) AS total_siswa FROM users WHERE role = 'siswa' AND school_id = ?",
      [schoolId],
    );

    const [total_guru_bk] = await db.query(
      "SELECT COUNT(*) AS total_guru_bk FROM users WHERE role = 'guru bk' AND school_id = ?",
      [schoolId],
    );

    const [totalReportSelesai] = await db.query(
      `SELECT COUNT(r.id) AS laporan_selesai 
       FROM reports r 
       JOIN users u ON r.user_id = u.id 
       WHERE r.status = 'SELESAI' AND u.school_id = ?`,
      [schoolId],
    );

    const [totalReportProses] = await db.query(
      `SELECT COUNT(r.id) AS laporan_proses 
       FROM reports r 
       JOIN users u ON r.user_id = u.id 
       WHERE r.status = 'SEDANG DITANGANI' AND u.school_id = ?`,
      [schoolId],
    );

    return res.status(200).json({
      message: "Berhasil memuat data statistik.",
      total_siswa: total_siswa[0]?.total_siswa || 0,
      total_guru_bk: total_guru_bk[0]?.total_guru_bk || 0,
      laporan_selesai: totalReportSelesai[0]?.laporan_selesai || 0,
      laporan_proses: totalReportProses[0]?.laporan_proses || 0,
    });
  } catch (error) {
    return res
      .status(500)
      .json({
        message:
          "Terjadi kendala pada sistem. Silakan coba beberapa saat lagi.",
      });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { search, role, tahun_masuk } = req.query;
    const schoolId = req.user.school_id;
    let query = "SELECT * FROM users WHERE school_id = ?";

    const params = [schoolId];
    if (search) {
      query += " AND nama LIKE ?";
      params.push(`%${search}%`);
    }
    if (role) {
      query += " AND role = ?";
      params.push(role);
    }
    if (tahun_masuk) {
      query += " AND tahun_masuk = ?";
      params.push(tahun_masuk);
    }
    const [users] = await db.query(query, params);

    return res.status(200).json({
      message: "Berhasil memuat data pengguna.",
      total: users.length,
      data: users,
    });
  } catch (error) {
    return res
      .status(500)
      .json({
        message:
          "Terjadi kendala pada sistem. Silakan coba beberapa saat lagi.",
      });
  }
};

const getAllReports = async (req, res) => {
  try {
    const userSchoolId = req.user.school_id;

    const query = `
      SELECT 
        r.id AS report_id, 
        r.status, 
        r.jenis_kejadian,
        r.priority,
        r.lokasi,
        r.waktu_kejadian,
        r.kronologi,
        r.tanggal_kejadian AS tanggal, 
        u.nama AS nama_pelapor,
        u.email AS email_pelapor
      FROM reports r
      JOIN users u ON r.user_id = u.id
      WHERE u.school_id = ?
    `;
    const [reports] = await db.query(query, [userSchoolId]);

    return res.status(200).json({
      message: "Berhasil memuat daftar laporan sekolah.",
      data: reports,
    });
  } catch (error) {
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
    const school_id = req.user.school_id;
    await db.query("DELETE FROM users WHERE id = ? AND school_id = ?", [
      id,
      school_id,
    ]);
    return res.status(200).json({ message: "Akun pengguna berhasil dihapus." });
  } catch (error) {
    return res
      .status(500)
      .json({
        message:
          "Terjadi kendala pada sistem. Silakan coba beberapa saat lagi.",
      });
  }
};

const getAdminProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [result] = await db.query(
      `SELECT u.id, u.nama, u.email, u.role, u.school_id, 
              s.nama_sekolah, s.jenjang, s.npsn, s.alamat 
       FROM users u 
       LEFT JOIN schools s ON u.school_id = s.id 
       WHERE u.id = ?`,
      [userId],
    );

    if (result.length === 0) {
      return res
        .status(404)
        .json({ message: "Profil pengelola tidak ditemukan." });
    }

    return res.status(200).json({
      message: "Berhasil memuat profil pengelola.",
      data: result[0],
    });
  } catch (error) {
    return res
      .status(500)
      .json({
        message:
          "Terjadi kendala pada sistem. Silakan coba beberapa saat lagi.",
      });
  }
};

const updateAdminProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const schoolId = req.user.school_id;
    const { nama, jenjang, npsn, alamat } = req.body;

    if (nama) {
      await db.query("UPDATE users SET nama = ? WHERE id = ?", [nama, userId]);
    }

    if (schoolId) {
      await db.query(
        "UPDATE schools SET jenjang = ?, npsn = ?, alamat = ? WHERE id = ?",
        [jenjang, npsn, alamat, schoolId],
      );
    }

    const [updated] = await db.query(
      `SELECT u.id, u.nama, u.email, u.role, u.school_id, 
              s.nama_sekolah, s.jenjang, s.npsn, s.alamat 
       FROM users u 
       LEFT JOIN schools s ON u.school_id = s.id 
       WHERE u.id = ?`,
      [userId],
    );

    return res.status(200).json({
      message: "Profil berhasil diperbarui.",
      data: updated[0],
    });
  } catch (error) {
    return res
      .status(500)
      .json({
        message:
          "Terjadi kendala pada sistem. Silakan coba beberapa saat lagi.",
      });
  }
};

module.exports = {
  getAllUsers,
  StatsDashboard,
  getAllReports,
  deleteUser,
  updateAdminProfile,
  getAdminProfile,
};
