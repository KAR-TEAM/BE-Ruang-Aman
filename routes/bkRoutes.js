const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRole } = require('../middleware/authMiddleware');
const { dashboardStats, listReports, addFollowup, allSiswa, getProfile, updateProfile} = require('../controllers/bkController');

router.get('/stats', verifyToken, authorizeRole('Guru BK'), dashboardStats);
router.get('/reports', verifyToken, authorizeRole('Guru BK'), listReports);
router.post('/reports/:id/followups', verifyToken, authorizeRole('Guru BK', 'Admin'), addFollowup);
router.get('/siswa', verifyToken, authorizeRole('Guru BK'), allSiswa);
router.get('/profile', verifyToken, authorizeRole('Guru BK'), getProfile);
router.put('/profile', verifyToken, authorizeRole('Guru BK'), updateProfile);


module.exports = router;
