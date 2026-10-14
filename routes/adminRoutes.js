const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRole } = require('../middleware/authMiddleware');
const { StatsDashboard, getAllReports, getAllUsers, deleteUser, getAdminProfile, updateAdminProfile} = require('../controllers/adminController');


router.get('/stats',verifyToken, authorizeRole('admin'), StatsDashboard);
router.get('/getallusers', verifyToken, authorizeRole('admin'), getAllUsers);
router.get('/getallreports',verifyToken, authorizeRole('admin'), getAllReports);
router.delete('/user/:id',verifyToken, authorizeRole('admin'), deleteUser);
router.get('/profile', verifyToken, authorizeRole('admin'), getAdminProfile);
router.put('/profile', verifyToken, authorizeRole('admin'), updateAdminProfile);

module.exports = router;