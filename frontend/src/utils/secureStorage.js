import * as SecureStore from 'expo-secure-store';

// Kunci penyimpanan aman perangkat (Keychain iOS / Keystore Android)
export const TOKEN_KEY = 'access_token'; // JWT login
export const PUSH_KEY = 'expo_push_token'; // token notifikasi HP ini (untuk dihapus saat logout/senyap)
export const NOTIF_PREF_KEY = 'notif_pref'; // '1' = notifikasi aktif, '0' = mode senyap (per HP)

// Dibungkus try/catch: di web SecureStore tidak tersedia, aplikasi tetap jalan
export const simpanAman = async (kunci, nilai) => {
  try {
    await SecureStore.setItemAsync(kunci, nilai);
  } catch (e) {
    console.warn('SecureStore gagal menyimpan:', e.message);
  }
};

export const bacaAman = async (kunci) => {
  try {
    return await SecureStore.getItemAsync(kunci);
  } catch (e) {
    return null;
  }
};

export const hapusAman = async (kunci) => {
  try {
    await SecureStore.deleteItemAsync(kunci);
  } catch (e) {
    /* abaikan */
  }
};
