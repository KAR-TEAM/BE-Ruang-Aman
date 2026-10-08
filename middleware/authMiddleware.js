const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// Memverifikasi token JWT dari header Authorization
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Akses ditolak. Token tidak ditemukan.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token tidak valid atau kedaluwarsa.' });
  }
};

// Membatasi akses endpoint berdasarkan role user (Siswa / Guru BK / Admin)
const authorizeRole = (...allowedRoles) => {
  const normalizedRoles = allowedRoles.map((r) => r.toLowerCase());

  return (req, res, next) => {
    const userRole = req.user?.role?.toLowerCase();

    if (!req.user || !normalizedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Akses ditolak. Anda tidak memiliki izin.' });
    }
    next();
  };
};

module.exports = { verifyToken, authorizeRole };
