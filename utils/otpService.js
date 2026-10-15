const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { db } = require('../config/db');


const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true', 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10);

function generateOtpCode() {
  // 6 digit angka acak, aman secara kriptografis
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Membuat kode OTP baru untuk sebuah email, menyimpannya ke DB (menggantikan
 * OTP lama jika ada), lalu mengirimkannya lewat email menggunakan Nodemailer.
 */
async function createAndSendOtp(email, nama) {
  const otpCode = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await db.query(
    `INSERT INTO otp_verifications (email, otp_code, expires_at)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE otp_code = VALUES(otp_code), expires_at = VALUES(expires_at)`,
    [email, otpCode, expiresAt]
  );

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Kode Verifikasi Akun RuangAman',
    html: `
      <p>Halo ${nama},</p>
      <p>Kode OTP verifikasi akun RuangAman Anda:</p>
      <h2 style="letter-spacing: 4px;">${otpCode}</h2>
      <p>Kode ini berlaku selama ${OTP_EXPIRY_MINUTES} menit. Jangan bagikan kode ini ke siapa pun.</p>
      <p>Jika Anda tidak merasa melakukan registrasi ini, abaikan email ini.</p>
    `
  });

  return true;
}

/**
 * Memvalidasi kode OTP yang dikirim user. Menghapus record OTP setelah
 * berhasil diverifikasi (single-use).
 */
async function verifyOtpCode(email, otpCode) {
  const [rows] = await db.query(
    'SELECT * FROM otp_verifications WHERE email = ? AND otp_code = ? AND expires_at > NOW()',
    [email, otpCode]
  );

  if (rows.length === 0) {
    return false;
  }

  await db.query('DELETE FROM otp_verifications WHERE email = ?', [email]);
  return true;
}

module.exports = { createAndSendOtp, verifyOtpCode };