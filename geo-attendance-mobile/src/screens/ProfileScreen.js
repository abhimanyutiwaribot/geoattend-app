import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Device from 'expo-device';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/user/me');
        setProfile(res.data.data.user);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const deviceName = Device.deviceName || Device.modelName || 'Unknown device';

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Your account details and device info.</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 16 }} color="#22c55e" />
      ) : (
        <View style={styles.card}>
          <Text style={styles.label}>
            Name: <Text style={styles.value}>{profile?.name || user?.name || '-'}</Text>
          </Text>
          <Text style={styles.label}>
            Email: <Text style={styles.value}>{profile?.email || user?.email || '-'}</Text>
          </Text>
          <Text style={styles.label}>
            Device ID: <Text style={styles.value}>{profile?.deviceID || '-'}</Text>
          </Text>
          <Text style={styles.label}>
            Logins: <Text style={styles.value}>{profile?.loginCount ?? '-'}</Text>
          </Text>
          <Text style={styles.label}>
            Last login:{' '}
            <Text style={styles.value}>
              {profile?.lastLogin ? new Date(profile.lastLogin).toLocaleString() : '-'}
            </Text>
          </Text>
          <Text style={[styles.label, { marginTop: 8 }]}>
            This device: <Text style={styles.value}>{deviceName}</Text>
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#e5e7eb',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  card: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  label: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 4,
  },
  value: {
    color: '#e5e7eb',
    fontWeight: '500',
  },
  logoutButton: {
    marginTop: 24,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#b91c1c',
    alignItems: 'center',
  },
  logoutText: {
    color: '#fecaca',
    fontWeight: '600',
  },
});


