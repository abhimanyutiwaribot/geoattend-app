import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../api/client';
import { useTheme } from '../context/ThemeContext';

export default function LeaveRequestScreen() {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [type, setType] = useState('personal');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const leaveTypes = [
    { label: 'Sick', value: 'sick', icon: 'medical' },
    { label: 'Vacation', value: 'vacation', icon: 'airplane' },
    { label: 'Personal', value: 'personal', icon: 'person' },
    { label: 'Emergency', value: 'emergency', icon: 'alert-circle' },
    { label: 'WFH', value: 'wfh', icon: 'home' },
  ];

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Incomplete', 'Please provide a reason for your leave.');
      return;
    }

    if (startDate > endDate) {
      Alert.alert('Invalid Date', 'Start date cannot be after end date.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/leaves/request', {
        startDate,
        endDate,
        type,
        reason,
      });
      Alert.alert('Success', 'Your leave request has been submitted for approval.', [
        { text: 'View History', onPress: () => navigation.navigate('LeaveHistory') },
        { text: 'Done', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const onStartChange = (event, selectedDate) => {
    const currentDate = selectedDate || startDate;
    setShowStartPicker(Platform.OS === 'ios');
    setStartDate(currentDate);
    if (currentDate > endDate) setEndDate(currentDate);
  };

  const onEndChange = (event, selectedDate) => {
    const currentDate = selectedDate || endDate;
    setShowEndPicker(Platform.OS === 'ios');
    setEndDate(currentDate);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.text }]}>New Request</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Leave Category</Text>
        <View style={styles.typeGrid}>
          {leaveTypes.map((item) => (
            <TouchableOpacity
              key={item.value}
              style={[
                styles.typeCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                type === item.value && { borderColor: colors.primary, backgroundColor: colors.primarySoft }
              ]}
              onPress={() => setType(item.value)}
            >
              <View style={[styles.typeIconBox, { backgroundColor: isDark ? 'rgba(51, 65, 85, 0.2)' : '#f1f5f9' }, type === item.value && { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)' }]}>
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={type === item.value ? colors.primary : colors.textMuted}
                />
              </View>
              <Text style={[
                styles.typeLabel,
                { color: colors.textSecondary },
                type === item.value && { color: colors.text }
              ]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Duration</Text>
        <View style={[styles.glassContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.dateSelector}
            onPress={() => setShowStartPicker(true)}
          >
            <Text style={[styles.dateTag, { color: colors.textMuted }]}>STARTING</Text>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.dateText, { color: colors.text }]}>{startDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</Text>
            </View>
          </TouchableOpacity>

          <View style={[styles.dateSeparator, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.dateSelector}
            onPress={() => setShowEndPicker(true)}
          >
            <Text style={[styles.dateTag, { color: colors.textMuted }]}>ENDING</Text>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.dateText, { color: colors.text }]}>{endDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={onStartChange}
            minimumDate={new Date()}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            onChange={onEndChange}
            minimumDate={startDate}
          />
        )}

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Justification</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder="Why are you requesting this leave?"
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
          value={reason}
          onChangeText={setReason}
        />

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary }, loading && styles.disabledBtn]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={isDark ? "#022c22" : "#ffffff"} />
          ) : (
            <>
              <Text style={[styles.submitText, { color: isDark ? "#022c22" : "#ffffff" }]}>Confirm Request</Text>
              <Ionicons name="paper-plane" size={18} color={isDark ? "#022c22" : "#ffffff"} style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 0,
    paddingBottom: 60,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 32,
    marginBottom: 16,
    marginLeft: 4,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeCard: {
    width: '31%',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    gap: 10,
  },
  typeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  glassContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  dateSelector: {
    flex: 1,
  },
  dateSeparator: {
    width: 1,
    height: 30,
    marginHorizontal: 20,
  },
  dateTag: {
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 6,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
  },
  textArea: {
    borderRadius: 20,
    padding: 20,
    fontSize: 15,
    minHeight: 140,
    textAlignVertical: 'top',
    borderWidth: 1,
  },
  submitBtn: {
    height: 60,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '800',
  },
});
