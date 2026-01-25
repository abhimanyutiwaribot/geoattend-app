import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';

// Import individual challenge components
import ReactionTimeChallenge from './challenges/ReactionTimeChallenge';
import ColorMatchChallenge from './challenges/ColorMatchChallenge';
import PatternMemoryChallenge from './challenges/PatternMemoryChallenge';
import QuickMathChallenge from './challenges/QuickMathChallenge';

export default function CognitiveChallengeScreen({ route, navigation }) {
  const { challengeId, challengeType, challengeData, expiresAt } = route.params;
  const [startTime, setStartTime] = useState(Date.now());
  const [timeRemaining, setTimeRemaining] = useState(30);

  // Set start time on mount
  useEffect(() => {
    setStartTime(Date.now());
  }, []);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0) {
        Alert.alert('Time Expired', 'Challenge has expired', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  const handleResponse = async (answer) => {
    const responseTime = Date.now() - startTime;

    try {
      const result = await api.post('/attendance/validate-cognitive-challenge', {
        challengeId,
        response: answer,
        responseTime
      });

      if (result.data.data.passed) {
        Alert.alert('✅ Challenge Passed', 'Your presence is confirmed!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert(
          '❌ Challenge Failed',
          result.data.data.message || 'Please try again when prompted.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || error.message, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    }
  };

  // Render based on challenge type
  const renderChallenge = () => {
    switch (challengeType) {
      case 'reaction_time':
        return <ReactionTimeChallenge onResponse={handleResponse} {...challengeData} />;
      case 'color_match':
        return <ColorMatchChallenge onResponse={handleResponse} {...challengeData} />;
      case 'pattern_memory':
        return <PatternMemoryChallenge onResponse={handleResponse} {...challengeData} />;
      case 'math_quick':
        return <QuickMathChallenge onResponse={handleResponse} {...challengeData} />;
      default:
        return <Text style={styles.error}>Unknown challenge type</Text>;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🧠 Quick Check</Text>
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{timeRemaining}s</Text>
        </View>
      </View>

      {renderChallenge()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#e5e7eb',
  },
  timerContainer: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#22c55e',
  },
  error: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 24,
  },
});
