// src/screens/DashboardScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import useLocation from '../hooks/useLocation';
import LocationStatus from '../components/attendance/LocationStatus';
import Button from '../components/common/Button';

const DashboardScreen = ({ navigation }) => {
  const { location, loading, error, refreshLocation } = useLocation();

  const handleCheckIn = () => {
    // Navigate to attendance screen
    navigation.navigate('Attendance');
  };

  const canCheckIn = location?.geofenceStatus?.isWithin;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={refreshLocation}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>🏢 Geo Attendance</Text>
        <Text style={styles.subtitle}>Smart Office Check-in</Text>
      </View>

      <View style={styles.content}>
        {/* Location Status */}
        <LocationStatus 
          location={location}
          loading={loading}
          error={error}
        />

        {/* Check-in Button */}
        <View style={styles.actionSection}>
          <Button
            title={canCheckIn ? "Check In Now" : "Cannot Check In"}
            onPress={handleCheckIn}
            variant={canCheckIn ? "success" : "secondary"}
            disabled={!canCheckIn}
            style={styles.checkInButton}
          />
          
          {!canCheckIn && location && (
            <Text style={styles.helpText}>
              You need to be within 100m of the office to check in
            </Text>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Today's Status</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Check-ins</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Hours</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>100%</Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#007AFF',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  content: {
    padding: 20,
    gap: 20,
  },
  actionSection: {
    alignItems: 'center',
    gap: 12,
  },
  checkInButton: {
    width: '100%',
  },
  helpText: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
  },
  statsSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6C757D',
    textAlign: 'center',
  },
});

export default DashboardScreen;