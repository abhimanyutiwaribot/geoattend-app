import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import * as Device from 'expo-device';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { user, logout } = useAuth();
  const { colors, toggleTheme, isDark } = useTheme();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/user/me');
      setProfile(res.data.data.user);
    } catch (e) {
      console.log('Error fetching profile:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchProfile();
    }
  }, [isFocused]);

  const deviceName = Device.deviceName || Device.modelName || 'Authorized Device';

  const ProfileHeader = () => (
    <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.avatarContainer}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: isDark ? '#000000' : '#ffffff' }]}>
            {(profile?.name || user?.name || '?')[0].toUpperCase()}
          </Text>
        </View>
        <TouchableOpacity style={[styles.editAvatar, { borderColor: colors.surface, backgroundColor: colors.accent }]}>
          <Ionicons name="camera" size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>
      <View style={styles.headerInfo}>
        <Text style={[styles.userName, { color: colors.text }]}>{profile?.name || user?.name || 'User'}</Text>
        <View style={[styles.roleBadge, { backgroundColor: colors.primarySoft }]}>
          <Text style={[styles.roleText, { color: colors.textSecondary }]}>Employee</Text>
        </View>
      </View>
    </View>
  );

  const InfoRow = ({ label, value, icon }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <View style={[styles.iconBox, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name={icon} size={18} color={colors.textMuted} />
        </View>
        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Account</Text>
          <TouchableOpacity
            style={[styles.settingsBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 100 }} color={colors.primary} />
        ) : (
          <>
            <ProfileHeader />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Digital Identity</Text>
              <View style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <InfoRow label="Email" value={profile?.email || user?.email || '-'} icon="mail-outline" />
                <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                <InfoRow label="Device Status" value={`Verified (${deviceName})`} icon="phone-portrait-outline" />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Preferences</Text>
              <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.actionLeft}>
                  <View style={[styles.actionIconBox, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)' }]}>
                    <Ionicons name={isDark ? "moon" : "sunny"} size={20} color={colors.accent} />
                  </View>
                  <View>
                    <Text style={[styles.actionTitle, { color: colors.text }]}>Dark Mode</Text>
                    <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                      {isDark ? 'Switch to light themes' : 'Switch to dark themes'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={Platform.OS === 'ios' ? '#ffffff' : (isDark ? '#000000' : '#ffffff')}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Security & Access</Text>
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => navigation.navigate('FaceEnrollment')}
              >
                <View style={styles.actionLeft}>
                  <View style={[styles.actionIconBox, { backgroundColor: profile?.biometric?.faceEmbedding ? 'rgba(34, 197, 94, 0.1)' : colors.warningSoft }]}>
                    <Ionicons
                      name={profile?.biometric?.faceEmbedding ? "shield-checkmark" : "shield-outline"}
                      size={20}
                      color={profile?.biometric?.faceEmbedding ? colors.primary : colors.warning}
                    />
                  </View>
                  <View>
                    <Text style={[styles.actionTitle, { color: colors.text }]}>Active Biometrics</Text>
                    <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                      {profile?.biometric?.faceEmbedding ? 'Face ID Verified' : 'Face ID Not Found'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Management</Text>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.gridBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => navigation.navigate('LeaveRequest')}
                >
                  <View style={[styles.gridIcon, { backgroundColor: colors.primarySoft }]}>
                    <Ionicons name="calendar" size={22} color={colors.primary} />
                  </View>
                  <Text style={[styles.gridText, { color: colors.text }]}>Request Leave</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.gridBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => navigation.navigate('LeaveHistory')}
                >
                  <View style={[styles.gridIcon, { backgroundColor: colors.accentSoft }]}>
                    <Ionicons name="list" size={22} color={colors.accent} />
                  </View>
                  <Text style={[styles.gridText, { color: colors.text }]}>Leave History</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={[styles.logoutBtn, { borderColor: colors.danger, backgroundColor: colors.dangerSoft }]} onPress={logout}>
              <Ionicons name="log-out" size={18} color={colors.danger} />
              <Text style={styles.logoutText}>Sign Out From Device</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
  },
  editAvatar: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  headerInfo: {
    marginLeft: 20,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    marginLeft: 4,
  },
  groupCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    maxWidth: '50%',
  },
  rowDivider: {
    height: 1,
    marginVertical: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  actionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 16,
  },
  gridBtn: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  gridIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  gridText: {
    fontSize: 13,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '700',
  },
});
