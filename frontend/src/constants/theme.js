// FastCanteen Design System & Strict Color Palette
// PjBL Pemrograman Mobile UINSA Kampus 2

export const COLORS = {
  // Primary & Actions
  primaryDark: '#00442A',      // Hijau Tua: Identitas FastCanteen, harga, tautan, ikon, kategori aktif, tombol aksi
  primary: '#1F5C3F',          // Hijau: Tombol utama seperti Masuk, konfirmasi pembayaran, banner Siap Diambil, panel keranjang
  orange: '#FEA619',           // Oranye: Tombol Pesan, Lanjut Bayar, pembayaran QRIS, lencana favorit, rating bintang
  brownDark: '#684000',        // Cokelat Tua: Teks/ikon pada tombol/lencana oranye
  goldenBrown: '#855300',      // Cokelat Keemasan: Jam operasional, ikon, aksen teks "Canteen"

  // Backgrounds, Text & Dividers
  backgroundMain: '#FAFAF4',   // Off-white/Krem: Latar belakang layar utama, header
  cardBackground: '#FFFFFF',   // Putih: Latar kartu, formulir, tombol tertentu
  inputBackground: '#F4F4EE',  // Latar input, panel informasi QRIS, catatan
  badgeBackground: '#EEEEE9',  // Latar lencana/badge, chip, tombol sekunder
  inactiveTab: '#E8E8E3',      // Tab/kategori tidak aktif, kolom pencarian
  inactiveElement: '#E3E3DE',  // Elemen tidak aktif, garis pelacak
  textPrimary: '#1A1C19',      // Judul utama, nama menu, teks penting
  textBody: '#404943',         // Teks isi, label formulir, deskripsi, ikon
  textSecondary: '#707972',    // Placeholder, info lokasi, teks sekunder
  divider: '#C0C9C0',          // Garis pemisah, ikon keadaan kosong

  // Success, Positive & Active Status
  badgeSuccessLight: '#94D2AD',
  badgeSuccess: '#B1F1CA',     // Latar lencana hijau muda untuk Otomatis, Siap Diambil, Bukti Valid
  textSuccessDark: '#115135',
  textSuccess: '#15803D',
  textSuccessEmerald: '#065F46',
  textSuccessTeal: '#059669',
  activeGreen: '#10B981',      // Teks hijau sukses, status Buka, QRIS Lunas
  whatsappGreen: '#25D366',    // Ikon WhatsApp

  // Waiting, Process & Priority
  statusWaitingBg: '#FFDDB8',  // Latar Peach untuk Menunggu Pembayaran, Sedang Dimasak, Tutup
  queueOrange: '#D97706',      // Oranye/Amber untuk nomor antrean, lencana prioritas mendesak
  urgentOrange: '#EA580C',

  // Info & Completed Status
  infoLightBlue: '#DCE1FF',    // Nuansa Biru untuk status Selesai, Verifikasi pembayaran, kategori Minuman
  infoDarkBlue: '#002F99',
  infoBlue: '#1D4ED8',

  // Warning & Destructive
  danger: '#BA1A1A',           // Nuansa Merah untuk notifikasi penting, Stok Habis, tombol hapus, keluar akun
  dangerBg: '#FFDAD6',
  dangerDark: '#93000A',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
};

export const SHADOWS = {
  soft: {
    shadowColor: '#00442A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  card: {
    shadowColor: '#1A1C19',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 4,
  },
  floating: {
    shadowColor: '#00442A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 8,
  },
};
