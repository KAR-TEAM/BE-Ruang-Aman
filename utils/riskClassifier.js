// Klasifikasi risiko berbasis kata kunci (Rule/Keyword-based) yang telah diperbarui dan diperkaya.
// PENTING: Tingkat prioritas (priority) laporan dihitung murni di server agar tidak dapat dimanipulasi oleh klien.

const SCORE = { Rendah: 1, Sedang: 2, Tinggi: 3 };

// Prioritas dasar berdasarkan jenis kejadian yang dipilih di formulir laporan
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

// Kosakata kata kunci risiko TINGGI (Ancaman fisik serius, kekerasan berat, pelecehan, bahaya fatal)
const TINGGI_KEYWORDS = [
  'ancam', 'mengancam', 'ancaman serius', 'awas lu ya', 'gue habisin', 'gw habisin', 'mau dibunuh', 
  'pemerasan', 'memeras', 'palak', 'dipalak', 'pemalakan',
  'kekerasan fisik', 'memukul', 'dipukul', 'ditendang', 'didorong', 'dianiaya', 'disiksa', 
  'luka parah', 'berdarah', 'lebam', 'dicekik', 'dijambak', 'dikeroyok', 'pengeroyokan', 'baku hantam',
  'senjata', 'sajam', 'benda tajam', 'pisau', 'celurit', 'gir', 'air keras',
  'pelecehan seksual', 'dilecehkan', 'meraba', 'bagian sensitif', 'dicium paksa', 'catcalling', 'pemerkosaan',
  'bunuh diri', 'ingin mati', 'menyakiti diri', 'nggak kuat hidup', 'ngga tahan hidup', 'mau lompat',
  'rasisme', 'rasis', 'buli parah'
];

// Kosakata kata kunci risiko SEDANG (Perundungan berulang, hinaan verbal, pengucilan, teror sosmed/doxxing)
const SEDANG_KEYWORDS = [
  'terus-terusan', 'berulang kali', 'sering banget', 'tiap hari', 'setiap hari', 'dihina', 'diejek', 
  'dikatain', 'dihujat', 'julukan buruk', 'diolok-olok', 'olokan',
  'bodoh', 'goblok', 'bego', 'jelek', 'bau', 'cacat', 'tolol', 'idiot', 'anjir', 'anjing', 'babi',
  'diintimidasi', 'intimidasi', 'dikucilkan', 'dijauhi', 'dimusuhi', 'dikeluarkan dari grup', 'difitnah',
  'cyberbullying', 'disebarkan fotonya', 'video disebar', 'doxxing', 'difitnah di sosmed', 'komentar jahat', 'teror',
  'pencemaran nama baik', 'dipermalukan'
];

// Kosakata kata kunci risiko RENDAH (Kesalahpahaman ringan, argumen kecil antar teman)
const RENDAH_KEYWORDS = [
  'konflik kecil', 'kesalahpahaman', 'salah paham', 'berdebat', 'cekcok', 'beda pendapat', 'ribut kecil', 'hanya kesal'
];

function levelFromKeywords(text) {
  if (!text) return null;
  const lower = text.toLowerCase();

  if (TINGGI_KEYWORDS.some((kw) => lower.includes(kw))) return 'Tinggi';
  if (SEDANG_KEYWORDS.some((kw) => lower.includes(kw))) return 'Sedang';
  if (RENDAH_KEYWORDS.some((kw) => lower.includes(kw))) return 'Rendah';
  
  return null; // Tidak ada kata kunci spesifik yang cocok
}

/**
 * Menentukan tingkat risiko laporan (Rendah / Sedang / Tinggi)[cite: 6].
 * Mengambil tingkat tertinggi antara jenis kejadian yang dipilih dan hasil
 * pemindaian kata kunci pada kronologi laporan[cite: 6].
 */
function classifyRisk(jenisKejadian, kronologi) {
  const jenisLevel = JENIS_BASE_LEVEL[(jenisKejadian || '').toLowerCase()] || 'Rendah';
  const keywordLevel = levelFromKeywords(kronologi || '') || 'Rendah';

  return SCORE[jenisLevel] >= SCORE[keywordLevel] ? jenisLevel : keywordLevel;
}

module.exports = { classifyRisk };