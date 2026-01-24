import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function ReactionTimeChallenge({ onResponse, targetAppearTime, expectedColor }) {
  const [phase, setPhase] = useState('waiting'); // waiting | ready | tapped
  const [showTarget, setShowTarget] = useState(false);

  useEffect(() => {
    // Show target after specified delay
    const timer = setTimeout(() => {
      setShowTarget(true);
      setPhase('ready');
    }, targetAppearTime);

    return () => clearTimeout(timer);
  }, [targetAppearTime]);

  const handleTap = () => {
    if (phase === 'ready') {
      setPhase('tapped');
      onResponse(true);
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleTap}
      activeOpacity={1}
    >
      <Text style={styles.instruction}>
        {phase === 'waiting' && 'Wait for the circle...'}
        {phase === 'ready' && 'TAP NOW!'}
        {phase === 'tapped' && 'Processing...'}
      </Text>

      {showTarget && phase === 'ready' && (
        <View style={[styles.target, { backgroundColor: expectedColor }]} />
      )}

      {phase === 'waiting' && (
        <Text style={styles.hint}>Get ready to tap as fast as you can!</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  instruction: {
    fontSize: 28,
    fontWeight: '700',
    color: '#e5e7eb',
    marginBottom: 48,
    textAlign: 'center',
  },
  target: {
    width: 120,
    height: 120,
    borderRadius: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  hint: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 24,
    textAlign: 'center',
  },
});
