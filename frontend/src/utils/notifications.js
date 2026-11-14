import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import API from '../api/axios';
import { PUSH_KEY, NOTIF_PREF_KEY, simpanAman, bacaAman, hapusAman } from './secureStorage';

// Notifikasi yang masuk saat aplikasi terbuka tetap tampil sebagai banner
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Meminta izin, membuat channel Android, lalu mengambil ExpoPushToken
export async function getExpoPushToken() {
  if (Platform.OS === 'web') {
    throw new Error('Push notification hanya tersedia di aplikasi Android/iOS.');
  }
  if (Constants.executionEnvironment === 'storeClient' && Platform.OS === 'android') {
    throw new Error('Push notification Android tidak berjalan di Expo Go. Gunakan development build.');
  }
  if (!Device.isDevice) {
    throw new Error('Push notification memerlukan perangkat fisik, bukan emulator.');
  }

  if (Platform.OS === 'android') {
    // channelId 'default' sama dengan yang dikirim backend (services/pushService.js)
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') {
    throw new Error(
      'Izin notifikasi tidak diberikan. Aktifkan lewat Pengaturan HP > Aplikasi > FastCanteen > Notifikasi.'
    );
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    throw new Error('EAS projectId tidak ditemukan. Jalankan "eas init" lalu bangun ulang aplikasi.');
  }

  const result = await Notifications.getExpoPushTokenAsync({ projectId });
  return result.data;
}

// Ambil token HP ini lalu simpan ke backend untuk akun yang sedang login (butuh JWT)
async function daftarkanTokenKeServer() {
  const expoPushToken = await getExpoPushToken();
  await API.post('/notifikasi/token', { expoPushToken });
  await simpanAman(PUSH_KEY, expoPushToken); // dipakai untuk menghapus token saat logout/senyap
  return expoPushToken;
}

// Dipanggil saklar: nyalakan notifikasi. Pilihan "aktif" diingat di HP ini.
export async function aktifkanNotifikasi() {
  const token = await daftarkanTokenKeServer();
  await simpanAman(NOTIF_PREF_KEY, '1');
  return token;
}

// Dipanggil saklar: mode senyap. Token dihapus dari server agar tidak ada push yang dikirim.
export async function nonaktifkanNotifikasi() {
  const pushToken = await bacaAman(PUSH_KEY);
  if (pushToken) {
    // Bila gagal (misalnya offline) error dilempar dan pilihan TIDAK diubah,
    // supaya tampilan saklar tidak berbeda dengan keadaan di server.
    await API.delete('/notifikasi/token', { data: { expoPushToken: pushToken } });
  }
  await hapusAman(PUSH_KEY);
  await simpanAman(NOTIF_PREF_KEY, '0');
}

// Dipanggil otomatis setelah login: hanya bila HP ini pernah diaktifkan dan izin masih ada.
// Tidak pernah memunculkan dialog dan tidak pernah melempar error.
export async function daftarOtomatisBilaAktif() {
  try {
    if (Platform.OS === 'web') return;
    if ((await bacaAman(NOTIF_PREF_KEY)) !== '1') return;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    await daftarkanTokenKeServer();
  } catch (e) {
    /* diam: Expo Go, emulator, atau server tidak terjangkau */
  }
}

// Status saklar: aktif hanya bila pilihan tersimpan "aktif" DAN izin Android masih diberikan
export async function bacaStatusNotifikasi() {
  try {
    if ((await bacaAman(NOTIF_PREF_KEY)) !== '1') return false;
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    return false;
  }
}

// Minta backend mengirim notifikasi uji ke semua perangkat milik akun ini
export async function kirimNotifikasiUji() {
  const res = await API.post('/notifikasi/test');
  return res.data;
}
