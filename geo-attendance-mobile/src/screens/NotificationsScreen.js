import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { getLocalNotifications, clearLocalNotifications } from '../utils/notifications';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function NotificationsScreen() {
  const { colors, isDark } = useTheme();
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
    if (item.data?.challengeId && item.data?.attendanceId) {
      navigation.navigate('WordleChallenge', {
        challengeId: item.data.challengeId,
        attendanceId: item.data.attendanceId,
        wordLength: item.data.wordLength || 4,
        maxAttempts: item.data.maxAttempts || 4,
      });
    }
  };

  const renderItem = ({ item }) => {
    const isNew = item.timestamp > Date.now() - 3600000; // Last hour
    const isAlert = item.title.toLowerCase().includes('alert');

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
          isNew && { borderColor: isAlert ? colors.danger : colors.primary }
        ]}
        onPress={() => handleOpen(item)}
      >
        <View style={[styles.cardIconBox, { backgroundColor: isAlert ? colors.dangerSoft : colors.primarySoft }]}>
          <Ionicons
            name={isAlert ? "alert-circle" : "notifications"}
            size={22}
            color={isAlert ? colors.danger : colors.primary}
          />
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.cardTime, { color: colors.textMuted }]}>
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <Text style={[styles.cardBody, { color: colors.textSecondary }]} numberOfLines={2}>{item.body}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Alerts</Text>
        </View>
        <TouchableOpacity
          style={[styles.clearBtn, { backgroundColor: isDark ? 'rgba(51, 65, 85, 0.3)' : '#e2e8f0' }, items.length === 0 && { opacity: 0.5 }]}
          onPress={handleClear}
          disabled={items.length === 0}
        >
          <Text style={[styles.clearText, { color: colors.textSecondary }]}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {loading && items.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 100 }} color={colors.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, idx) => item.id || `${idx}-${item.timestamp}`}
          renderItem={renderItem}
          refreshing={loading}
          onRefresh={load}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.emptyIconBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="notifications-off-outline" size={48} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>All caught up!</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>You don't have any new alerts at the moment.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
    flexGrow: 1,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardTime: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    maxWidth: '70%',
    lineHeight: 20,
  },
});
