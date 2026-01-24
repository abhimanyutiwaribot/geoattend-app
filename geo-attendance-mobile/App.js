import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import * as LocalAuthentication from 'expo-local-authentication';
import { ActivityIndicator, View, Text, StyleSheet, Platform, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import WordleChallengeScreen from './src/screens/WordleChallengeScreen';
import CognitiveChallengeScreen from './src/screens/CognitiveChallengeScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';

const Tab = createMaterialTopTabNavigator();
const Stack = createNativeStackNavigator();

function Tabs() {
  return (
    <View style={{ flex: 1, backgroundColor: '#020617' }}>
      <Tab.Navigator
        tabBarPosition="bottom"
        screenOptions={({ route }) => ({
          swipeEnabled: true,
          animationEnabled: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: '#22c55e',
          tabBarInactiveTintColor: '#94a3b8',
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

          tabBarStyle: styles.floatingTabBar,
          tabBarIcon: ({ color, focused }) => {
            let iconName;
            if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
            else if (route.name === 'History') iconName = focused ? 'time' : 'time-outline';
            else if (route.name === 'Notifications') iconName = focused ? 'notifications' : 'notifications-outline';
            else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
            return <Ionicons name={iconName} size={26} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="History" component={HistoryScreen} />
        <Tab.Screen name="Notifications" component={NotificationsScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </View>
  );
}

function RootNavigator() {
  const { isLoggedIn, loading } = useAuth(); // Hook is now called safely

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Loading session...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <>
          <Stack.Screen name="Tabs" component={Tabs} />
          <Stack.Screen name="WordleChallenge" component={WordleChallengeScreen} />
          <Stack.Screen name="CognitiveChallenge" component={CognitiveChallengeScreen} />
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
  // 1. All hooks at the very top
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
            promptMessage: 'Unlock App',
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

  // 2. Conditional rendering happens AFTER hooks
  if (isCheckingBiometric) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Checking fingerprint...</Text>
      </View>
    );
  }

  if (!biometricOk) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Biometric required</Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: { marginTop: 12, color: '#9ca3af' },
  errorTitle: { color: '#fecaca', fontSize: 18, fontWeight: 'bold' },
  floatingTabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 45,
    left: 20,
    right: 20,
    borderRadius: 35,
    backgroundColor: '#1e293b',
    height: 64,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    borderTopWidth: 0,
    overflow: 'hidden',
    paddingBottom: 0,
    paddingTop: 0,
  }
});