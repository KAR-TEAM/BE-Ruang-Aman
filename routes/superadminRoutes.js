const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRole } = require('../middleware/authMiddleware');
const { 
  createAdminSekolah, 
  createSchool, 
  getSchoolStats, 
  getSchools,
  getAllUsersByRole,
  updateSchool,
  deleteSchool,
  updateAdmin,
  deleteUser,
  searchSchool
} = require('../controllers/superadminController');

router.get('/schools-stats', verifyToken, authorizeRole('Superadmin'), getSchoolStats);
router.get('/schools', verifyToken, authorizeRole('Superadmin'), getSchools);
router.post('/schools', verifyToken, authorizeRole('Superadmin'), createSchool);
router.put('/schools/:id', verifyToken, authorizeRole('Superadmin'), updateSchool);
router.delete('/schools/:id', verifyToken, authorizeRole('Superadmin'), deleteSchool);

router.get('/search', verifyToken, authorizeRole('Superadmin'), searchSchool);

router.post('/admin-schools', verifyToken, authorizeRole('Superadmin'), createAdminSekolah);
router.get('/users', verifyToken, authorizeRole('Superadmin'), getAllUsersByRole);
router.put('/users/:id', verifyToken, authorizeRole('Superadmin'), updateAdmin);
router.delete('/users/:id', verifyToken, authorizeRole('Superadmin'), deleteUser);



module.exports = router;