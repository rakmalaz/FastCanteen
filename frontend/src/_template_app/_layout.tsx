import React, { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import App from '../../App';

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return <App />;
}
