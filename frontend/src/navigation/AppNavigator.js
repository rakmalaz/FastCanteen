import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';

import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/theme';
import { daftarOtomatisBilaAktif } from '../utils/notifications';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import MahasiswaMainScreen from '../screens/MahasiswaMainScreen';
import CartCheckoutScreen from '../screens/CartCheckoutScreen';
import TenantDashboardScreen from '../screens/TenantDashboardScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import SuperAdminDashboardScreen from '../screens/SuperAdminDashboardScreen';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

// Layar awal sesuai peran saat sesi berhasil dipulihkan
const layarAwal = (user) => {
  if (!user) return 'Login';
  if (user.peran === 'admin') return 'SuperAdminDashboard';
  if (user.peran === 'tenant') return 'TenantDashboard';
  return 'Menu';
};

// data.screen dari push hanyalah petunjuk navigasi, BUKAN bukti otorisasi:
// data yang dibuka tetap diambil dari API yang memeriksa JWT.
const bukaLayarDariNotifikasi = (data, user) => {
  if (!navigationRef.isReady() || !user || !data) return;
  if (data.screen === 'tenant' && user.peran === 'tenant') {
    navigationRef.navigate('TenantDashboard');
  } else if (data.screen === 'pesanan' && user.peran === 'mahasiswa') {
    navigationRef.navigate('MahasiswaMain', { initialTab: 'pesanan' });
  }
};

export default function AppNavigator() {
  const { user, restoring } = useAuth();
  const userRef = useRef(user);
  userRef.current = user;

  // Pengguna mengetuk notifikasi saat aplikasi berjalan / di latar belakang
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((event) => {
      bukaLayarDariNotifikasi(event.notification.request.content.data, userRef.current);
    });
    return () => sub.remove();
  }, []);

  // Setelah login/pemulihan sesi: bila HP ini pernah diaktifkan, daftarkan token otomatis
  // ke akun yang sedang login (tanpa dialog, tanpa menekan tombol)
  useEffect(() => {
    if (user) daftarOtomatisBilaAktif();
  }, [user?.id]);

  if (restoring) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.backgroundMain }}>
        <ActivityIndicator size="large" color={COLORS.primaryDark} />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={async () => {
        // Aplikasi dibuka dari keadaan tertutup lewat ketukan notifikasi
        const last = await Notifications.getLastNotificationResponseAsync();
        if (last) {
          bukaLayarDariNotifikasi(last.notification.request.content.data, userRef.current);
        }
      }}
    >
      <Stack.Navigator
        initialRouteName={layarAwal(user)}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="MahasiswaMain" component={MahasiswaMainScreen} />
        <Stack.Screen name="Menu" component={MahasiswaMainScreen} />
        <Stack.Screen name="CartCheckout" component={CartCheckoutScreen} />
        <Stack.Screen name="TenantDashboard" component={TenantDashboardScreen} />
        <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
        <Stack.Screen name="SuperAdminDashboard" component={SuperAdminDashboardScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
