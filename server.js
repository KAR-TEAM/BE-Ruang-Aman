require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const { testConnection } = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const reportRoutes = require("./routes/siswaRoutes");
const bkRoutes = require("./routes/bkRoutes");
const superadminRoutes = require("./routes/superadminRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Melayani file statis di root folder
app.use(express.static(__dirname));

// Uji koneksi basis data
testConnection();

// Rute utama pemeriksaan peladen
app.get("/", (req, res) => {
  res.send("Server RuangAman API Berjalan dengan Baik!");
});

// Daftar rute API
app.use("/api/auth", authRoutes);
app.use("/api/siswa", reportRoutes);
app.use("/api/bk", bkRoutes);
app.use("/api/superadmin", superadminRoutes);
app.use("/api/adminsekolah", adminRoutes);

// Penanganan galat global (Global Error Handler) yang bersih dan aman
app.use((err, req, res, next) => {
  return res.status(500).json({
    message: "Terjadi kendala pada sistem. Silakan coba beberapa saat lagi.",
  });
});

app.listen(PORT, () => {});
