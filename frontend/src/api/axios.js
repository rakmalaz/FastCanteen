import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// IP Wi-Fi aktual laptop di jaringan lokal UINSA/Rumah
const ACTIVE_WIFI_IP = '192.168.18.111';

const getBaseURL = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api';
  }

  // Coba ambil host IP dinamis dari Expo debugger connection
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    // Abaikan jika IP adalah VirtualBox/Host-Only (192.168.56.x), localhost, atau loopback
    if (
      ip &&
      !ip.startsWith('192.168.56.') &&
      !ip.startsWith('127.') &&
      ip !== 'localhost'
    ) {
      return `http://${ip}:5000/api`;
    }
  }

  // Gunakan IP Wi-Fi laptop aktif
  return `http://${ACTIVE_WIFI_IP}:5000/api`;
};

export const API_BASE_URL = getBaseURL();

console.log('📡 FastCanteen API Base URL terhubung ke:', API_BASE_URL);

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Interceptor respons
API.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'Terjadi kendala jaringan ke server backend FastCanteen';
    if (error.response && error.response.data && error.response.data.message) {
      message = error.response.data.message;
    } else if (error.message) {
      message = error.message;
    }
    console.warn(`[API ERROR] ${error.config?.url}:`, message);
    return Promise.reject(error);
  }
);

export const setServerIP = (newIp) => {
  const cleanIp = newIp.trim().replace(/^https?:\/\//, '').replace(/\/api\/?$/, '').split(':')[0];
  const newBaseURL = `http://${cleanIp}:5000/api`;
  API.defaults.baseURL = newBaseURL;
  console.log('🔄 API Base URL diubah ke:', newBaseURL);
  return newBaseURL;
};

export default API;