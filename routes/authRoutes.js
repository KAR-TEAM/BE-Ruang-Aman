const express = require('express');
const router = express.Router();
const { register, verifyOtp, resendOtp, login, searchSchool, forgotPassword, resetPassword} = require('../controllers/authController');

router.post('/register', register);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/search', searchSchool);

module.exports = router;