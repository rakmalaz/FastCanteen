// Menentukan "jenis" dialog (warna + ikon) dari isi Alert.alert,
// supaya 48 pemanggilan Alert yang sudah ada otomatis tampil serasi
// tanpa perlu diubah satu per satu.
//
// Jenis: 'success' | 'error' | 'warning' | 'info' | 'confirm' | 'danger'
// Bisa dipaksa lewat parameter ke-4: Alert.alert(judul, pesan, tombol, { tone: 'danger' })

const POLA_ERROR =
  /gagal|error|kesalahan|tidak dapat|tidak bisa|tidak ditemukan|salah|ditolak|invalid|tidak valid|terputus/;
const POLA_SUCCESS =
  /berhasil|sukses|terkirim|terverifikasi|tersimpan|diterima|dibuat|ditambahkan|diperbarui|diubah|dihapus|✅|🎉/;
const POLA_WARNING =
  /peringatan|perhatian|belum|diperlukan|wajib|harap|lengkapi|kosong|pastikan|tidak boleh|⚠️/;

export function deteksiTone(title, message, buttons, options) {
  if (options && options.tone) return options.tone;

  const daftar = Array.isArray(buttons) ? buttons : [];
  if (daftar.some((b) => b && b.style === 'destructive')) return 'danger';
  if (daftar.some((b) => b && b.style === 'cancel') || daftar.length > 1) return 'confirm';

  const teks = `${title || ''} ${message || ''}`.toLowerCase();
  if (POLA_ERROR.test(teks)) return 'error';
  if (POLA_SUCCESS.test(teks)) return 'success';
  if (POLA_WARNING.test(teks)) return 'warning';
  return 'info';
}