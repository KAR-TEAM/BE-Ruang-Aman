const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRole } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

router.get('/dashboard-admin',verifyToken, authorizeRole('admin'),DashboardAdmin);
router.delete('/ifuser/:id',veryToken, authorizeRole('admin'), deleteUser);

module.exports = router;