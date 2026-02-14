import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export function AttendanceButton({
  session,
  loading,
  geofenceStatus,
  locationStatus,
  onStart,
  onEnd
}) {
  const { colors, isDark } = useTheme();

  if (!session) {
    const isOutside = geofenceStatus && geofenceStatus.isWithin === false;
    const isDisabled = loading || isOutside || locationStatus !== 'granted';

    return (
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: colors.primary },
          isDisabled && [styles.buttonDisabled, { backgroundColor: isDark ? '#1e293b' : '#cbd5e1' }],
        ]}
        onPress={onStart}
        disabled={isDisabled}
      >
        <Ionicons
          name={isOutside ? "lock-closed" : "finger-print"}
          size={20}
          color={isDark ? "#022c22" : "#ffffff"}
          style={{ marginRight: 8 }}
        />
        <Text style={[styles.buttonText, { color: isDark ? "#022c22" : "#ffffff" }]}>
          {loading
            ? 'Authenticating...'
            : isOutside
              ? 'Enter Office to Check In'
              : 'Verifying & Check In'}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: colors.dangerSoft, borderColor: colors.danger, borderWidth: 1 }]}
      onPress={onEnd}
      disabled={loading}
    >
      <Ionicons name="log-out-outline" size={20} color={colors.danger} style={{ marginRight: 8 }} />
      <Text style={[styles.buttonSecondaryText, { color: colors.danger }]}>
        {loading ? 'Closing Session...' : 'Check Out'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonText: {
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  buttonSecondaryText: {
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  buttonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.5,
  },
});
