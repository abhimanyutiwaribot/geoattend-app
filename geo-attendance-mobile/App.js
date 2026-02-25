import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import * as LocalAuthentication from 'expo-local-authentication';
import { ActivityIndicator, View, Text, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import FaceEnrollmentScreen from './src/screens/FaceEnrollmentScreen';
import LeaveRequestScreen from './src/screens/LeaveRequestScreen';
import LeaveHistoryScreen from './src/screens/LeaveHistoryScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

const Tab = createMaterialTopTabNavigator();
const Stack = createNativeStackNavigator();

function Tabs() {
  const { colors, isDark } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tab.Navigator
        tabBarPosition="bottom"
        sceneContainerStyle={{
          backgroundColor: colors.background,
        }}
        screenOptions={({ route }) => ({
          swipeEnabled: true,
          animationEnabled: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.pillIconInactive,
          tabBarIndicatorStyle: { height: 0 },
          tabBarItemStyle: {
            justifyContent: 'center',
            alignItems: 'center',
            height: 64,
          },
          tabBarContentContainerStyle: {
            alignItems: 'center',
            justifyContent: 'center',
          },
          tabBarStyle: [
            styles.bottomTabBar,
            {
              backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              borderColor: colors.border,
            }
          ],
          tabBarIcon: ({ color, focused }) => {
            let iconName;
            if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
            else if (route.name === 'History') iconName = focused ? 'time' : 'time-outline';

            return (
              <View style={[
                styles.tabIconContainer,
                focused && { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)' }
              ]}>
                <Ionicons name={iconName} size={24} color={color} />
                {focused && <View style={[styles.tabActiveDot, { backgroundColor: colors.primary }]} />}
              </View>
            );
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="History" component={HistoryScreen} />
      </Tab.Navigator>
    </View>
  );
}

function RootNavigator() {
  const { isLoggedIn, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading session...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      {isLoggedIn ? (
        <>
          <Stack.Screen name="Tabs" component={Tabs} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="FaceEnrollment" component={FaceEnrollmentScreen} />
          <Stack.Screen name="LeaveRequest" component={LeaveRequestScreen} />
          <Stack.Screen name="LeaveHistory" component={LeaveHistoryScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ThemeAwareApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

function ThemeAwareApp() {
  const { isDark, colors } = useTheme();
  const [isCheckingBiometric, setIsCheckingBiometric] = useState(true);
  const [biometricOk, setBiometricOk] = useState(false);

  useEffect(() => {
    async function checkBiometric() {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!hasHardware || !enrolled) {
          setBiometricOk(true);
        } else {
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Unlock GeoPresence',
          });
          setBiometricOk(result.success);
        }
      } catch (e) {
        setBiometricOk(true);
      } finally {
        setIsCheckingBiometric(false);
      }
    }
    checkBiometric();
  }, []);

  if (isCheckingBiometric) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Secure Identity Check...</Text>
      </View>
    );
  }

  if (!biometricOk) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <Ionicons name="lock-closed" size={64} color={colors.danger} />
        <Text style={[styles.errorTitle, { color: colors.danger, marginTop: 20 }]}>Biometric Required</Text>
        <TouchableOpacity
          style={{ marginTop: 24, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: colors.primary }}
          onPress={() => {
            setIsCheckingBiometric(true);
            // Simple way to retry
            setTimeout(() => {
              const check = async () => {
                const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock GeoPresence' });
                setBiometricOk(res.success);
                setIsCheckingBiometric(false);
              };
              check();
            }, 100);
          }}
        >
          <Text style={{ color: isDark ? '#022c22' : '#ffffff', fontWeight: 'bold' }}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style={isDark ? "light" : "dark"} />
      <RootNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: { marginTop: 12, fontSize: 13, fontWeight: '500' },
  errorTitle: { fontSize: 18, fontWeight: 'bold' },
  bottomTabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 60 : 50,
    left: '20%',
    right: '20%',
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  tabActiveDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
  }
});