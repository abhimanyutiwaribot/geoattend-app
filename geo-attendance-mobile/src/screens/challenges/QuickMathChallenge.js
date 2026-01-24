import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

export default function QuickMathChallenge({ onResponse, equation }) {
  const [answer, setAnswer] = useState('');

  const handleSubmit = () => {
    if (answer.trim() === '') return;
    onResponse(answer);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.instruction}>Solve this quickly:</Text>

      <View style={styles.equationContainer}>
        <Text style={styles.equation}>{equation} = ?</Text>
      </View>

      <TextInput
        style={styles.input}
        value={answer}
        onChangeText={setAnswer}
        keyboardType="numeric"
        placeholder="Your answer"
        placeholderTextColor="#6b7280"
        autoFocus
        onSubmitEditing={handleSubmit}
      />

      <TouchableOpacity
        style={[styles.submitButton, !answer.trim() && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!answer.trim()}
      >
        <Text style={styles.submitText}>Submit</Text>
      </TouchableOpacity>

      <Text style={styles.hint}>Type your answer and press Submit</Text>
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
  equationContainer: {
    backgroundColor: '#1f2937',
    padding: 32,
    borderRadius: 16,
    marginBottom: 32,
  },
  equation: {
    fontSize: 42,
    fontWeight: '900',
    color: '#22c55e',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#1f2937',
    borderWidth: 2,
    borderColor: '#4b5563',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    fontSize: 24,
    fontWeight: '700',
    color: '#e5e7eb',
    textAlign: 'center',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#4b5563',
  },
  submitText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  hint: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
