const { db } = require("../config/db");

const StatsDashboard = async (req, res) => {
  try {
    const totalUsers = await db.query("SELECT COUNT(*) AS total_siswa FROM users WHERE role = 'siswa' by school_id");
    const totalSchools = await db.query("SELECT COUNT(*) AS total_guru_bk FROM users WHERE role = 'guru_bk' by school_id");
    const totalReport = await db.query("SELECT COUNT(*) AS laporan FROM reports ");
    const totalReportSelesai = await db.query("SELECT COUNT(*) AS laporan_selesai FROM reports WHERE status = 'selesai' ");
    const totalReportProses = await db.query("SELECT COUNT(*) AS laporan_proses FROM reports WHERE status = 'proses' ");
    const totalReportPending = await db.query("SELECT COUNT(*) AS laporan_pending FROM reports WHERE status = 'pending' ");

  } catch (error) {
    res.status(500).json({ error: "gagal menghubungkan dashboard" });
  }
}

const getAllUsers = async (req, res) => {
  try {
    const users = await db.query("SELECT * FROM users by school_id");
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "gagal menghubungkan users" });
  }
};

module.exports = { getAllUsers, StatsDashboard };