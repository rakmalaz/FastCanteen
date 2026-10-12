import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import MahasiswaMainScreen from '../screens/MahasiswaMainScreen';
import CartCheckoutScreen from '../screens/CartCheckoutScreen';
import TenantDashboardScreen from '../screens/TenantDashboardScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import SuperAdminDashboardScreen from '../screens/SuperAdminDashboardScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
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
