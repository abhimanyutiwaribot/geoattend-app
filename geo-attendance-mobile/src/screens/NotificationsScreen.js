import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { getLocalNotifications, clearLocalNotifications } from '../utils/notifications';

export default function NotificationsScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const isFocused = useIsFocused();
  const navigation = useNavigation();

  const load = async () => {
    setLoading(true);
    const list = await getLocalNotifications();
    setItems(list || []);
    setLoading(false);
  };

  useEffect(() => {
    if (isFocused) {
      load();
    }
  }, [isFocused]);

  const handleClear = async () => {
    await clearLocalNotifications();
    setItems([]);
  };

  const handleOpen = (item) => {
    // Navigate to Wordle if data has challenge info
    if (item.data?.challengeId && item.data?.attendanceId) {
      navigation.navigate('WordleChallenge', {
        challengeId: item.data.challengeId,
        attendanceId: item.data.attendanceId,
        wordLength: item.data.wordLength || 4,
        maxAttempts: item.data.maxAttempts || 4,
      });
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleOpen(item)}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.time}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
      </View>
      <Text style={styles.body}>{item.body}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Notifications</Text>
        <TouchableOpacity style={styles.clearBtn} onPress={handleClear} disabled={items.length === 0}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item, idx) => item.id || `${idx}-${item.timestamp}`}
        renderItem={renderItem}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={{ paddingVertical: 12, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No notifications yet.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  screenTitle: {
    color: '#e5e7eb',
    fontSize: 20,
    fontWeight: '700',
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  clearText: {
    color: '#9ca3af',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#0b1224',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '600',
  },
  time: {
    color: '#9ca3af',
    fontSize: 12,
  },
  body: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#6b7280',
  },
});

