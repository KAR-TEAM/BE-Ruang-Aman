const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRole } = require('../middleware/authMiddleware');
const { dashboardStats, listReports, addFollowup } = require('../controllers/bkController');

router.get('/stats', verifyToken, authorizeRole('Guru BK'), dashboardStats);
router.get('/reports', verifyToken, authorizeRole('Guru BK'), listReports);
router.post('/reports/:id/followups', verifyToken, authorizeRole('Guru BK', 'Admin'), addFollowup);

module.exports = router;
