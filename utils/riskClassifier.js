// Klasifikasi risiko sederhana (rule/keyword-based) sesuai konsep MVP RuangAman.
// PENTING: priority laporan TIDAK PERNAH diambil dari input client (lihat reportController.js).
// Ini murni dihitung di server supaya siswa tidak bisa memanipulasi tingkat prioritas laporannya.

const SCORE = { Rendah: 1, Sedang: 2, Tinggi: 3 };

// Prioritas dasar berdasarkan jenis kejadian yang dipilih siswa di form
const JENIS_BASE_LEVEL = {
  'kekerasan fisik': 'Tinggi',
  'pelecehan': 'Tinggi',
  'cyberbullying': 'Sedang',
  'bullying': 'Sedang',
  'kekerasan verbal': 'Sedang',
  'konflik teman': 'Rendah',
  'masalah keluarga': 'Rendah',
  'lainnya': 'Rendah'
};

// Kata kunci yang dipindai dari teks kronologi laporan
const TINGGI_KEYWORDS = [
  'ancam', 'mengancam', 'ancaman serius', 'awas lu ya', 'gue habisin', 'pemerasan', 'memeras', 'palak', 'dipalak',
  'kekerasan fisik', 'memukul', 'ditendang', 'didorong', 'dianiaya', 'disiksa', 'luka parah', 'berdarah', 'lebam', 'dicekik', 'dijambak', 'dikeroyok',
  'senjata', 'sajam', 'benda tajam', 'pisau', 'air keras',
  'pelecehan seksual', 'dilecehkan', 'meraba', 'bagian sensitif', 'dicium paksa', 'catcalling',
  'bunuh diri', 'ingin mati', 'menyakiti diri', 'nggak tahan hidup',
  'rasisme', 'rasis'
];

const SEDANG_KEYWORDS = [
  'terus-terusan', 'berulang kali', 'sering banget', 'tiap hari', 'dihina', 'diejek', 'dikatain', 'dihujat', 'julukan buruk',
  'bodoh', 'goblok', 'bego', 'jelek', 'bau', 'cacat', 'tolol', 'idiot',
  'diintimidasi', 'intimidasi', 'dikucilkan', 'dijauhi', 'dimusuhi', 'dikeluarkan dari grup',
  'cyberbullying', 'disebarkan fotonya', 'video disebar', 'doxxing', 'difitnah di sosmed', 'komentar jahat', 'teror'
];

const RENDAH_KEYWORDS = [
  'konflik kecil', 'kesalahpahaman', 'salah paham', 'berdebat', 'cekcok', 'beda pendapat', 'ribut kecil'
];

function levelFromKeywords(text) {
  const lower = text.toLowerCase();

  if (TINGGI_KEYWORDS.some((kw) => lower.includes(kw))) return 'Tinggi';
  if (SEDANG_KEYWORDS.some((kw) => lower.includes(kw))) return 'Sedang';
  if (RENDAH_KEYWORDS.some((kw) => lower.includes(kw))) return 'Rendah';
  return null; // tidak ada keyword yang cocok
}

/**
 * Menentukan level risiko laporan (Rendah / Sedang / Tinggi).
 * Mengambil level tertinggi antara jenis kejadian yang dipilih dan hasil
 * pemindaian keyword pada kronologi, supaya tidak under-prioritized.
 */
function classifyRisk(jenisKejadian, kronologi) {
  const jenisLevel = JENIS_BASE_LEVEL[(jenisKejadian || '').toLowerCase()] || 'Rendah';
  const keywordLevel = levelFromKeywords(kronologi || '') || 'Rendah';

  return SCORE[jenisLevel] >= SCORE[keywordLevel] ? jenisLevel : keywordLevel;
}

module.exports = { classifyRisk };
