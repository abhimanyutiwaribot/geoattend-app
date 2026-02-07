import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Device from 'expo-device';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const navigation = useNavigation();
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Your account details and device info.</Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 16 }} color="#22c55e" />
        ) : (
          <>
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
              <Text style={[styles.label, { marginTop: 8 }]}>
                This device: <Text style={styles.value}>{deviceName}</Text>
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Biometric Identity</Text>
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={() => navigation.navigate('FaceEnrollment')}
              >
                <View style={styles.biometricLeft}>
                  {profile?.biometric?.faceEmbedding ? (
                    <>
                      <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                      <View>
                        <Text style={styles.biometricText}>Face ID Enrolled</Text>
                        <Text style={styles.biometricSubtext}>
                          {new Date(profile.biometric.enrolledAt).toLocaleDateString()}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <Ionicons name="scan-outline" size={24} color="#f59e0b" />
                      <View>
                        <Text style={styles.biometricText}>Enroll Face ID</Text>
                        <Text style={styles.biometricSubtext}>Required for attendance</Text>
                      </View>
                    </>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              </TouchableOpacity>
              <Text style={styles.helperText}>
                {profile?.biometric?.faceEmbedding
                  ? 'Tap to update your face enrollment if needed.'
                  : 'Used for secure background identity verification.'}
              </Text>
            </View>
          </>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color="#fecaca" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100, // Extra padding for tab bar
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
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  biometricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  biometricText: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '600',
  },
  biometricSubtext: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  helperText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
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
    marginTop: 32,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#b91c1c',
    backgroundColor: 'rgba(185, 28, 28, 0.1)',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: {
    color: '#fecaca',
    fontWeight: '600',
    fontSize: 16,
  },
});
