const { db } = require("../config/db");

  const StatsDashboard = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;

    // 1. Total Siswa
    const [total_siswa] = await db.query(
      "SELECT COUNT(*) AS total_siswa FROM users WHERE role = 'siswa' AND school_id = ?",
      [schoolId]
    );

    // 2. Total Guru BK
    const [total_guru_bk] = await db.query(
      "SELECT COUNT(*) AS total_guru_bk FROM users WHERE role = 'guru bk' AND school_id = ?",
      [schoolId]
    );

    // 3. Total Laporan Selesai (Dihubungkan lewat user_id ke tabel users)
    const [totalReportSelesai] = await db.query(
      `SELECT COUNT(r.id) AS laporan_selesai 
       FROM reports r 
       JOIN users u ON r.user_id = u.id 
       WHERE r.status = 'SELESAI' AND u.school_id = ?`,
      [schoolId]
    );

    // 4. Total Laporan Proses (Dihubungkan lewat user_id ke tabel users)
    const [totalReportProses] = await db.query(
      `SELECT COUNT(r.id) AS laporan_proses 
       FROM reports r 
       JOIN users u ON r.user_id = u.id 
       WHERE r.status = 'SEDANG DITANGANI' AND u.school_id = ?`,
      [schoolId]
    );

    return res.status(200).json({
      total_siswa: total_siswa[0]?.total_siswa || 0,
      total_guru_bk: total_guru_bk[0]?.total_guru_bk || 0,
      laporan_selesai: totalReportSelesai[0]?.laporan_selesai || 0,
      laporan_proses: totalReportProses[0]?.laporan_proses || 0
    });

  } catch (error) {
    console.error("Error StatsDashboard:", error.message);
    return res.status(500).json({ error: "gagal menghubungkan dashboard", details: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { search, role, tahun_masuk, } = req.query;
    const schoolId = req.user.school_id;
    let query = "SELECT * FROM users WHERE school_id = ?";

    const params = [schoolId];
    if (search) {
      query += " AND name LIKE ?";
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

    res.json({
      message: "Berhasil memuat data users",
      total: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({ error: "Gagal menghubungkan users" });
  }
};

const getAllReports = async (req, res) => {
  try {
    const userSchoolId = req.user.school_id;

    const query = `
  SELECT 
    r.id AS report_id, 
    r.status, 
    r.tanggal_kejadian AS tanggal, 
    u.nama AS nama_pelapor,
    u.email AS email_pelapor
    FROM reports r
    JOIN users u ON r.user_id = u.id
    WHERE u.school_id = ?
`;
    const [reports] = await db.query(query, [userSchoolId]);

    res.json(reports);
  } catch (error) {
    console.error("Error getAllReports:", error.message);
    res
      .status(500)
      .json({ error: "gagal menghubungkan reports", details: error.message });
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
    res.json({ message: "User berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ error: "gagal menghapus user" });
  }
};

module.exports = { getAllUsers, StatsDashboard, getAllReports, deleteUser };
