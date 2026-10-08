# RuangAman Backend

## Struktur Folder
```
ruangaman-backend/
├── server.js                  # Entry point, hanya wiring express + routes
├── config/
│   └── db.js                  # MySQL connection pool
├── middleware/
│   └── authMiddleware.js      # verifyToken & authorizeRole
├── utils/
│   ├── riskClassifier.js      # Klasifikasi risiko rule/keyword-based
│   └── otpService.js          # Generate, simpan, kirim, verifikasi OTP
├── controllers/
│   ├── authController.js      # register, verify-otp, resend-otp, login
│   ├── reportController.js    # createReport, myReports (siswa)
│   └── bkController.js        # dashboardStats, listReports, addFollowup (guru BK)
├── routes/
│   ├── authRoutes.js          # /api/auth/*
│   ├── reportRoutes.js        # /api/reports/*
│   └── bkRoutes.js            # /api/bk/*
├── sql/
│   └── migration_otp.sql      # Migrasi tambahan untuk fitur OTP
├── .env.example
└── package.json
```

## Setup

1. Install dependency:
   ```
   npm install
   ```

2. Copy `.env.example` jadi `.env` dan isi semua variabel (DB, JWT_SECRET, EmailJS).

3. Jalankan migrasi SQL tambahan (kolom `is_verified` + tabel `otp_verifications`)
   ke database `db_ruangaman` yang sudah ada:
   ```
   mysql -u root -p db_ruangaman < sql/migration_otp.sql
   ```

4. Jalankan server:
   ```
   npm run dev
   ```

## Setup Nodemailer (SMTP) untuk OTP

Gunakan Gmail (paling gampang buat testing/demo) atau SMTP provider lain
(Mailtrap, Zoho, provider hosting sekolah, dst) — kodenya generik, tinggal
ganti nilai di `.env`.

**Kalau pakai Gmail:**
1. Aktifkan 2-Step Verification di akun Google yang akan dipakai kirim email.
2. Buka https://myaccount.google.com/apppasswords → buat **App Password**
   baru (pilih app "Mail"). Ini beda dari password akun Gmail biasa.
3. Isi `.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=emailkamu@gmail.com
   SMTP_PASS=<app_password_16_digit>
   EMAIL_FROM=RuangAman <emailkamu@gmail.com>
   ```

**Kalau pakai SMTP provider lain:** isi `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`
sesuai dokumentasi provider tersebut, `SMTP_USER`/`SMTP_PASS` sesuai kredensial
yang diberikan.

Catatan: Gmail SMTP punya limit pengiriman harian (~500/hari untuk akun
biasa) — cukup untuk demo/testing, tapi untuk production sungguhan
pertimbangkan provider transactional email (SendGrid, Mailgun, dst) yang
lebih andal untuk volume tinggi.

## Alur Registrasi + OTP

```
POST /api/auth/register   -> akun dibuat (status: Menunggu Verifikasi), OTP dikirim ke email
POST /api/auth/verify-otp -> { email, otp_code } -> akun jadi Aktif
POST /api/auth/resend-otp -> { email } -> kirim ulang OTP baru (kalau expired/tidak masuk)
POST /api/auth/login      -> ditolak (403) jika akun belum diverifikasi
```

## Perubahan Penting dari server.js Sebelumnya

- **Priority laporan** sekarang selalu dihitung server (`riskClassifier.js`),
  tidak lagi bisa dikirim dari client lewat `req.body.priority`.
- **ID** (`user_id`, `reportId`, dll) pakai `crypto.randomUUID()`, bukan
  `Date.now()`, supaya tidak collision.
- **Register** dan **addFollowup** sekarang pakai DB transaction
  (rollback otomatis kalau salah satu query gagal).
- **Login** memvalidasi `is_verified` dan `status_akun`, serta memakai pesan
  error generik ("Email atau password salah") untuk mencegah user enumeration.
- **Error 500** tidak lagi mengirim `err.message` mentah ke client — cukup
  di-log ke server console.
- **GET /api/bk/reports** sekarang mendukung query filter `?status=` dan
  `?priority=` sesuai fitur "Filter risiko" di dashboard.
- **PATCH status laporan** divalidasi terhadap enum
  `['BARU', 'SEDANG DITANGANI', 'SELESAI']`.

## Belum Diimplementasikan (di luar scope perbaikan ini)

- Upload file bukti (foto/video) — perlu `multer` + storage (lokal/cloud) untuk
  mengisi kolom `bukti_url` secara nyata. Masih placeholder di kode.
- Rate limiting di endpoint `/login` dan `/reports` untuk mencegah brute force/spam.
