import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function PatternMemoryChallenge({ onResponse, pattern }) {
  const [phase, setPhase] = useState('memorize'); // memorize | input
  const [userPattern, setUserPattern] = useState([]);
  const [showTime, setShowTime] = useState(3);

  useEffect(() => {
    // Show pattern for 3 seconds
    const countdown = setInterval(() => {
      setShowTime((prev) => {
        if (prev <= 1) {
          clearInterval(countdown);
          setPhase('input');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, []);

  const handleNumberPress = (num) => {
    if (phase !== 'input') return;

    const newPattern = [...userPattern, num];
    setUserPattern(newPattern);

    // Auto-submit when pattern is complete
    if (newPattern.length === pattern.length) {
      onResponse(newPattern);
    }
  };

  const handleClear = () => {
    setUserPattern([]);
  };

  return (
    <View style={styles.container}>
      {phase === 'memorize' ? (
        <>
          <Text style={styles.instruction}>Memorize this pattern:</Text>
          <View style={styles.patternContainer}>
            {pattern.map((num, idx) => (
              <View key={idx} style={styles.patternDigit}>
                <Text style={styles.patternText}>{num}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.countdown}>{showTime}s</Text>
        </>
      ) : (
        <>
          <Text style={styles.instruction}>Enter the pattern:</Text>
          <View style={styles.inputContainer}>
            {Array.from({ length: pattern.length }).map((_, idx) => (
              <View key={idx} style={styles.inputDigit}>
                <Text style={styles.inputText}>
                  {userPattern[idx] !== undefined ? userPattern[idx] : '?'}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.keypad}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <TouchableOpacity
                key={num}
                style={styles.keypadButton}
                onPress={() => handleNumberPress(num)}
                disabled={userPattern.length >= pattern.length}
              >
                <Text style={styles.keypadText}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  instruction: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e5e7eb',
    textAlign: 'center',
    marginBottom: 32,
  },
  patternContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  patternDigit: {
    width: 60,
    height: 80,
    backgroundColor: '#22c55e',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patternText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
  },
  countdown: {
    fontSize: 24,
    fontWeight: '600',
    color: '#9ca3af',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  inputDigit: {
    width: 50,
    height: 60,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4b5563',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#e5e7eb',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  keypadButton: {
    width: 70,
    height: 70,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#e5e7eb',
  },
  clearButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#ef4444',
    borderRadius: 999,
    alignSelf: 'center',
  },
  clearText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
