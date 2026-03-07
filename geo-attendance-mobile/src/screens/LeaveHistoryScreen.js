import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useTheme } from '../context/ThemeContext';

export default function LeaveHistoryScreen() {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaves = async () => {
    try {
      const res = await api.get('/leaves/my-requests');
      setLeaves(res.data.data);
    } catch (e) {
      console.log('Error fetching leaves:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const getStatusConfig = (status) => {
    switch (status) {
      case 'approved': return { color: colors.primary, bg: colors.primarySoft, icon: 'checkmark-circle' };
      case 'rejected': return { color: colors.danger, bg: colors.dangerSoft, icon: 'close-circle' };
      case 'pending': return { color: colors.warning, bg: colors.warningSoft, icon: 'time' };
      case 'cancelled': return { color: colors.textMuted, bg: colors.primarySoft, icon: 'ban' };
      default: return { color: colors.textMuted, bg: colors.primarySoft, icon: 'help-circle' };
    }
  };

  const getLeaveIcon = (type) => {
    switch (type) {
      case 'sick': return 'medical';
      case 'vacation': return 'airplane';
      case 'personal': return 'person';
      case 'emergency': return 'alert-circle';
      case 'wfh': return 'home';
      default: return 'document-text';
    }
  };

  const renderItem = ({ item }) => {
    const status = getStatusConfig(item.status);
    const start = new Date(item.startDate);
    const end = new Date(item.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.typeRow}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name={getLeaveIcon(item.type)} size={18} color={colors.textMuted} />
            </View>
            <View>
              <Text style={[styles.typeText, { color: colors.text }]}>{item.type.charAt(0).toUpperCase() + item.type.slice(1)} Leave</Text>
              <Text style={[styles.durationTag, { color: colors.textSecondary }]}>{diffDays} {diffDays === 1 ? 'day' : 'days'}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={14} color={status.color} style={{ marginRight: 4 }} />
            <Text style={[styles.statusText, { color: status.color }]}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={[styles.dateInfoBox, { backgroundColor: colors.primarySoft }]}>
          <View style={styles.dateCol}>
            <Text style={[styles.dateLabel, { color: colors.textMuted }]}>FROM</Text>
            <Text style={[styles.dateValue, { color: colors.textSecondary }]}>{start.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</Text>
          </View>
          <Ionicons name="arrow-forward" size={14} color={colors.border} />
          <View style={styles.dateCol}>
            <Text style={[styles.dateLabel, { color: colors.textMuted }]}>TO</Text>
            <Text style={[styles.dateValue, { color: colors.textSecondary }]}>{end.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</Text>
          </View>
        </View>

        <View style={styles.reasonBox}>
          <Text style={[styles.reasonText, { color: colors.textSecondary }]} numberOfLines={2}>{item.reason}</Text>
        </View>

        {item.adminComment && (
          <View style={[styles.adminNote, { borderTopColor: colors.border }]}>
            <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.accent} style={{ marginTop: 2 }} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.adminNoteText, { color: colors.accent }]}>{item.adminComment}</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>My Leaves</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Requests status history</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 100 }} />
      ) : (
        <FlatList
          data={leaves}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchLeaves} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="calendar-clear-outline" size={48} color={isDark ? "#1e293b" : "#e2e8f0"} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No requests found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>You haven't submitted any leave requests yet.</Text>
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
    padding: 24,
    gap: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  durationTag: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dateInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  dateCol: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 8,
    fontWeight: '800',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  reasonBox: {
    paddingLeft: 4,
  },
  reasonText: {
    fontSize: 13,
    lineHeight: 18,
  },
  adminNote: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    flexDirection: 'row',
  },
  adminNoteText: {
    fontSize: 12,
    fontWeight: '600',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
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
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: '70%',
    lineHeight: 20,
  }
});
