import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import AppNavigator from './src/navigation/AppNavigator';
import DialogHost, { installDialog } from './src/components/AppDialog';

// Semua Alert.alert di aplikasi tampil memakai dialog bertema FastCanteen
installDialog();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <DialogHost />
      <AuthProvider>
        <CartProvider>
          <AppNavigator />
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}