import * as ImagePicker from 'expo-image-picker';
import API from '../api/axios';

// Pilih gambar dari galeri lalu unggah sebagai bukti pembayaran pesanan.
// Mengembalikan { canceled: true } jika pengguna membatalkan pemilihan gambar.
export async function pilihDanUnggahBukti(idPesanan) {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.5,
    base64: true,
  });
  if (result.canceled) return { canceled: true };

  const asset = result.assets && result.assets[0];
  if (!asset || !asset.base64) {
    throw new Error('Gambar tidak dapat dibaca. Silakan pilih gambar lain.');
  }

  const res = await API.put(
    `/pesanan/${idPesanan}/bukti`,
    { bukti_base64: asset.base64, bukti_mime: asset.mimeType || 'image/jpeg' },
    { timeout: 30000 }
  );
  return { canceled: false, success: res.data.success, message: res.data.message };
}