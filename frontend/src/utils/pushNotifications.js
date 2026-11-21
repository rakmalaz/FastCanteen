import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import API from '../api/axios';

// Modul native dimuat secara opsional: bila belum terpasang aplikasi tetap jalan,
// hanya fitur push yang menampilkan pesan "belum tersedia".
let Notifications = null;
let AsyncStorage = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  Notifications = null;
}
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  AsyncStorage = null;
}

const memoriPreferensi = {}; // cadangan bila AsyncStorage belum terpasang
let tokenSaatIni = null;

export const pushTersedia = () => !!Notifications;

// Tampilkan notifikasi juga saat aplikasi sedang dibuka
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

const kunciPreferensi = (idUser) => `push_aktif:${idUser}`;

// Preferensi saklar per akun. Default: aktif.
export const bacaPreferensiPush = async (idUser) => {
  try {
    const nilai = AsyncStorage
      ? await AsyncStorage.getItem(kunciPreferensi(idUser))
      : memoriPreferensi[kunciPreferensi(idUser)];
    return nilai !== 'off';
  } catch (e) {
    return true;
  }
};

const simpanPreferensiPush = async (idUser, aktif) => {
  const nilai = aktif ? 'on' : 'off';
  memoriPreferensi[kunciPreferensi(idUser)] = nilai;
  try {
    if (AsyncStorage) await AsyncStorage.setItem(kunciPreferensi(idUser), nilai);
  } catch (e) {
    /* abaikan */
  }
};

// Meminta izin lalu mengambil Expo Push Token perangkat ini
const ambilExpoPushToken = async ({ mintaIzin }) => {
  if (!Notifications) throw new Error('Modul expo-notifications belum terpasang.');
  if (Platform.OS === 'web') throw new Error('Push notification tidak tersedia di web.');
  if (!Device.isDevice) throw new Error('Push notification hanya bisa di perangkat fisik (bukan emulator).');

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted' && mintaIzin) {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') {
    throw new Error('Izin notifikasi belum diberikan. Aktifkan lewat pengaturan perangkat.');
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const res = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  return res.data;
};

// Mendaftarkan token perangkat ke backend (dan menyimpan preferensi = aktif)
export const aktifkanPush = async (idUser) => {
  const token = await ambilExpoPushToken({ mintaIzin: true });
  await API.post('/notifikasi/token', { expoPushToken: token });
  tokenSaatIni = token;
  await simpanPreferensiPush(idUser, true);
  return token;
};

// Menghapus token perangkat dari backend (dan menyimpan preferensi = mati)
export const matikanPush = async (idUser) => {
  try {
    const token = tokenSaatIni || (await ambilExpoPushToken({ mintaIzin: false }));
    await API.delete('/notifikasi/token', { data: { expoPushToken: token } });
  } finally {
    tokenSaatIni = null;
    await simpanPreferensiPush(idUser, false);
  }
};

// Dipanggil otomatis setelah login: daftar token bila preferensi aktif dan izin sudah ada
export const daftarPushOtomatis = async (idUser) => {
  try {
    if (!Notifications || !(await bacaPreferensiPush(idUser))) return;
    const token = await ambilExpoPushToken({ mintaIzin: true });
    await API.post('/notifikasi/token', { expoPushToken: token });
    tokenSaatIni = token;
  } catch (e) {
    console.log('Push otomatis dilewati:', e.message);
  }
};

// Dipanggil saat logout agar perangkat tidak menerima notifikasi akun lama
export const lepasPushSaatLogout = async () => {
  try {
    if (!tokenSaatIni) return;
    await API.delete('/notifikasi/token', { data: { expoPushToken: tokenSaatIni } });
  } catch (e) {
    /* abaikan: token akan dipindah/dibersihkan server */
  } finally {
    tokenSaatIni = null;
  }
};

// Minta backend mengirim notifikasi uji ke semua perangkat akun ini
export const kirimNotifikasiUji = async () => {
  const res = await API.post('/notifikasi/test');
  return res.data;
};
