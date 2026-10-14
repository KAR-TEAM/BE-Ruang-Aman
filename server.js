require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { testConnection } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const reportRoutes = require('./routes/siswaRoutes');
const bkRoutes = require('./routes/bkRoutes');
const superadminRoutes = require('./routes/superadminRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Melayani file statis (misal landing page HTML) di root folder
app.use(express.static(__dirname));

testConnection();

// Default route
// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, 'login.html'));
// });
app.get('/', (req, res) => {
  res.send('Server RuangAman API Berjalan dengan Baik!');
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/siswa', reportRoutes);
app.use('/api/bk', bkRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/adminsekolah', adminRoutes);

app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err);
  
  // Ambil pesan error string yang aman
  const errorMessage = err.message || (typeof err === 'object' ? JSON.stringify(err) : 'Terjadi kesalahan pada server');

  return res.status(500).json({
    message: 'Gagal memproses permintaan.',
    error: errorMessage
  });
});

app.listen(PORT, () => {
  console.log(`Server RuangAman berjalan di http://localhost:${PORT}`);
});
