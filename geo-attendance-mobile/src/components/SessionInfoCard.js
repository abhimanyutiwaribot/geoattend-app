import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export function SessionInfoCard({ session, checkingSession }) {
  const { colors, isDark } = useTheme();
  const [duration, setDuration] = useState('00:00:00');

  useEffect(() => {
    if (!session?.startTime) return;

    const interval = setInterval(() => {
      const start = new Date(session.startTime);
      const now = new Date();
      const diff = Math.floor((now - start) / 1000);

      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;

      setDuration(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.startTime]);

  if (checkingSession) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Verifying Session...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="location-outline" size={32} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Ready for Check-in</Text>
      </View>
    );
  }

  const score = session.validationScore ?? 0;
  const getScoreColor = () => {
    if (score > 80) return colors.primary;
    if (score > 50) return colors.warning;
    return colors.danger;
  };

  return (
    <View style={styles.container}>
      {/* Session Duration Header */}
      <View style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: colors.primarySoft }]}>
          <View style={[styles.statusDot, { backgroundColor: getScoreColor() }]} />
          <Text style={[styles.statusLabel, { color: colors.text }]}>{session.status.toUpperCase()}</Text>
        </View>
        <Text style={[styles.timerText, { color: colors.text }]}>{duration}</Text>
      </View>

      {/* Trust & Info Grid */}
      <View style={[styles.grid, { backgroundColor: colors.primarySoft }]}>
        <View style={styles.gridItem}>
          <Ionicons name="shield-checkmark" size={20} color={getScoreColor()} />
          <View>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Trust Level</Text>
            <Text style={[styles.gridValue, { color: getScoreColor() }]}>{score}%</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.gridItem}>
          <Ionicons name="time-outline" size={20} color={colors.textMuted} />
          <View>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Started</Text>
            <Text style={[styles.gridValue, { color: colors.textSecondary }]}>
              {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      </View>

      {/* Progress Bar for Trust */}
      <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { width: `${score}%`, backgroundColor: getScoreColor() }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    gap: 16,
  },
  loadingContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  timerText: {
    fontSize: 32,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  grid: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
  },
  gridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  gridLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 1,
  },
  gridValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 24,
    marginHorizontal: 12,
  },
  progressBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
