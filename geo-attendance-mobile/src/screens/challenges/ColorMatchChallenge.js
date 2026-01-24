import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function ColorMatchChallenge({ onResponse, colorWord, textColor }) {
  const colors = [
    { name: 'RED', hex: '#ef4444' },
    { name: 'GREEN', hex: '#22c55e' },
    { name: 'BLUE', hex: '#3b82f6' },
    { name: 'YELLOW', hex: '#f59e0b' },
    { name: 'PURPLE', hex: '#a855f7' }
  ];

  const handleColorSelect = (colorName) => {
    onResponse(colorName);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.instruction}>What COLOR is the text?</Text>
      <Text style={styles.hint}>(Not what it says, but the color itself)</Text>

      <View style={styles.wordContainer}>
        <Text style={[styles.word, { color: textColor }]}>
          {colorWord}
        </Text>
      </View>

      <View style={styles.optionsContainer}>
        {colors.map((color) => (
          <TouchableOpacity
            key={color.name}
            style={[styles.colorButton, { backgroundColor: color.hex }]}
            onPress={() => handleColorSelect(color.name)}
          >
            <Text style={styles.colorButtonText}>{color.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
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
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 32,
  },
  wordContainer: {
    alignItems: 'center',
    marginBottom: 48,
    padding: 24,
    backgroundColor: '#1f2937',
    borderRadius: 16,
  },
  word: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 2,
  },
  optionsContainer: {
    gap: 12,
  },
  colorButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  colorButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
