const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: 'knpbjdvf',
  api_key: '596755588482927',
  api_secret: 'xgqaQPqp36vPW72qdrqVWlGMYM8'
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Ambil data nama dan tanggal dari req.body yang dikirim Flutter
    // Berikan fallback jika kosong
    let namaPelapor = req.body.nama || 'siswa';
    let tanggalKejadian = req.body.tanggal_kejadian || new Date().toISOString().slice(0, 10);

    // Bersihkan spasi atau karakter khusus pada nama agar aman untuk URL file
    namaPelapor = namaPelapor.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // Format akhir: laporan_nama_pelapor_tanggal_timestampunik
    const uniqueSuffix = Date.now();
    const publicId = `laporan_${namaPelapor}_${tanggalKejadian}_${uniqueSuffix}`;

    return {
      folder: 'ruang_aman_bukti',
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
      public_id: publicId,
    };
  },
});

const upload = multer({ storage: storage });

module.exports = { cloudinary, upload };
