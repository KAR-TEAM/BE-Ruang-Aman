const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRole } = require('../middleware/authMiddleware');
const { createReport, myReports, dashboardsiswa, getStudentProfile, updateStudentProfile, upload } = require('../controllers/siswaController');


// Endpoint Profil Siswa
router.get('/profile', verifyToken, authorizeRole('Siswa'), getStudentProfile);
router.put('/profile', verifyToken, updateStudentProfile);

// Endpoint Laporan & Dashboard Siswa (Tanpa upload file middleware)
router.post('/reports', verifyToken, authorizeRole('Siswa'), upload.single('bukti'), createReport);
router.get('/my-reports', verifyToken, authorizeRole('Siswa'), myReports);
router.get('/', verifyToken, authorizeRole('Siswa'), dashboardsiswa);

module.exports = router;