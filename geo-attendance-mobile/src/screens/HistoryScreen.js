import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';

export default function HistoryScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/attendance/my');
      setItems(res.data.data.attendances || []);
    } catch (e) {
      // ignore for now
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const renderItem = ({ item }) => {
    const start = item.startTime ? new Date(item.startTime) : null;
    const end = item.endTime ? new Date(item.endTime) : null;
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {start ? start.toLocaleDateString() : 'Unknown date'}
        </Text>
        <Text style={styles.cardRow}>
          Status: <Text style={styles.cardValue}>{item.status}</Text>
        </Text>
        <Text style={styles.cardRow}>
          Time:{' '}
          <Text style={styles.cardValue}>
            {start ? start.toLocaleTimeString() : '--'} -{' '}
            {end ? end.toLocaleTimeString() : 'ongoing'}
          </Text>
        </Text>
        <Text style={styles.cardRow}>
          Duration:{' '}
          <Text style={styles.cardValue}>
            {item.totalDuration ? `${item.totalDuration.toFixed(1)} min` : '-'}
          </Text>
        </Text>
        <Text style={styles.cardRow}>
          Validation score:{' '}
          <Text style={styles.cardValue}>{item.validationScore ?? 0}</Text>
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>History</Text>
      <Text style={styles.subtitle}>Your past attendance sessions.</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 16 }} color="#22c55e" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 12 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />
          }
          ListEmptyComponent={
            <Text style={{ color: '#6b7280', marginTop: 16 }}>No attendance records yet.</Text>
          }
        />
      )}
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
    padding: 14,
    marginBottom: 10,
  },
  cardTitle: {
    color: '#e5e7eb',
    fontWeight: '600',
    marginBottom: 6,
  },
  cardRow: {
    color: '#9ca3af',
    fontSize: 13,
    marginBottom: 2,
  },
  cardValue: {
    color: '#e5e7eb',
    fontWeight: '500',
  },
});


