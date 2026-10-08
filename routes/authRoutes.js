const express = require('express');
const router = express.Router();
const { register, verifyOtp, resendOtp, login, searchSchool } = require('../controllers/authController');

router.post('/register', register);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', login);
router.get('/search', searchSchool);

module.exports = router;