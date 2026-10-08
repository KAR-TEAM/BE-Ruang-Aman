const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'db_ruangaman',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Tes koneksi MySQL saat server start
const testConnection = async () => {
  try {
    const connection = await db.getConnection();
    console.log('Terhubung ke database MySQL.');
    connection.release();
  } catch (err) {
    console.error('Gagal terhubung ke MySQL:', err.message);
  }
};

module.exports = { db, testConnection };
