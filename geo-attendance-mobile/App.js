// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';

// Hooks
import useAuth from './src/hooks/useAuth';

const Stack = createNativeStackNavigator();

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator screenOptions={{
        headerStyle: { backgroundColor: '#007AFF' },
        headerTintColor: '#ffffff',
      }}>
        {user ? (
          // Authenticated screens
          <>
            <Stack.Screen 
              name="Dashboard" 
              component={DashboardScreen}
              options={{ 
                title: 'Dashboard',
                headerBackVisible: false,
              }}
            />
            <Stack.Screen 
              name="Attendance" 
              component={AttendanceScreen}
              options={{ 
                title: 'Check In',
                presentation: 'modal',
              }}
            />
          </>
        ) : (
          // Unauthenticated screens
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Register" 
              component={RegisterScreen}
              options={{ title: 'Create Account' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return <AppContent />;
}