const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRole } = require('../middleware/authMiddleware');
const { createReport, myReports, dashboardsiswa } = require('../controllers/siswaController');

router.get('/my-reports', verifyToken, authorizeRole('Siswa'), myReports);
router.get('/dashboard-siswa', verifyToken, authorizeRole('Siswa'), dashboardsiswa);
router.post('/', verifyToken, authorizeRole('Siswa'), createReport);

module.exports = router;
