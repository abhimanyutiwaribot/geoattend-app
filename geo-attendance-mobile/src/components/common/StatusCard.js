// src/components/common/StatusCard.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const StatusCard = ({ icon, title, status, distance, isActive = false }) => {
  return (
    <View style={[styles.card, isActive && styles.activeCard]}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      
      <Text style={styles.status}>{status}</Text>
      
      {distance !== undefined && (
        <Text style={styles.distance}>
          Distance: {distance}m
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DEE2E6',
    marginVertical: 8,
  },
  activeCard: {
    backgroundColor: '#E8F5E8',
    borderColor: '#28A745',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  status: {
    fontSize: 16,
    color: '#6C757D',
    marginBottom: 4,
  },
  distance: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
});

export default StatusCard;