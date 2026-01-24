import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

export function SessionInfoCard({ session, checkingSession }) {
  if (checkingSession) {
    return (
      <View style={styles.infoCard}>
        <ActivityIndicator color="#22c55e" />
        <Text style={styles.infoText}>Checking active session...</Text>
      </View>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoLabel}>
        Session status:{' '}
        <Text style={styles.infoValue}>{session.status}</Text>
      </Text>
      <Text style={styles.infoLabel}>
        Started at:{' '}
        <Text style={styles.infoValue}>
          {new Date(session.startTime).toLocaleTimeString()}
        </Text>
      </Text>
      <Text style={styles.infoLabel}>
        Validation score:{' '}
        <Text style={styles.infoValue}>{session.validationScore ?? 0}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoText: {
    color: '#9ca3af',
    marginTop: 8,
  },
  infoLabel: {
    color: '#9ca3af',
    marginBottom: 4,
  },
  infoValue: {
    color: '#e5e7eb',
    fontWeight: '600',
  },
});
