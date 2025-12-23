import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';

export default function WordleChallengeScreen({ route, navigation }) {
  const { challengeId, attendanceId, wordLength = 4, maxAttempts = 4 } = route.params || {};
  const [currentGuess, setCurrentGuess] = useState('');
  const [guesses, setGuesses] = useState([]);
  const [results, setResults] = useState([]); // Array of per-letter results for each guess
  const [loading, setLoading] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttempts);
  const [solved, setSolved] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleSubmitGuess = async () => {
    if (solved || failed || attemptsLeft <= 0) {
      return;
    }

    const guess = currentGuess.toUpperCase().trim();
    
    if (guess.length !== wordLength) {
      Alert.alert('Invalid', `Please enter a ${wordLength}-letter word`);
      return;
    }

    if (!/^[A-Z]+$/.test(guess)) {
      Alert.alert('Invalid', 'Please enter only letters');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/attendance/validate-challenge', {
        challengeId,
        attendanceId,
        response: { guess }
      });

      const { isValid, perLetterResults, attemptsLeft: remaining, error } = res.data;

      if (isValid) {
        setSolved(true);
        setGuesses([...guesses, guess]);
        setResults([...results, Array(wordLength).fill('correct')]);
        setAttemptsLeft(remaining || 0);
        
        setTimeout(() => {
          Alert.alert('Success! 🎉', 'Challenge completed!.', [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]);
        }, 500);
      } else {
        const newGuesses = [...guesses, guess];
        const newResults = [...results, perLetterResults || []];
        
        setGuesses(newGuesses);
        setResults(newResults);
        setCurrentGuess('');
        const newAttemptsLeft = Math.max(remaining ?? attemptsLeft - 1, 0);
        setAttemptsLeft(newAttemptsLeft);

        if (newAttemptsLeft <= 0 || error === 'Max attempts exceeded') {
          setFailed(true);
          setTimeout(() => {
            Alert.alert(
              'Challenge Failed',
              `Maximum attempts reached. You can continue your session, but this challenge wasn't passed.`,
              [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
          }, 500);
        }
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to validate guess');
    } finally {
      setLoading(false);
    }
  };

  const getLetterColor = (result) => {
    switch (result) {
      case 'correct': return '#22c55e'; // green
      case 'present': return '#eab308'; // yellow
      case 'absent': return '#6b7280'; // gray
      default: return '#1f2937'; // default dark
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Take a Brain Break ✨</Text>
        <Text style={styles.subtitle}>Guess the {wordLength}-letter word</Text>
        <Text style={styles.attemptsText}>
          {solved ? 'Solved! 🎉' : failed ? 'Failed' : `${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} left`}
        </Text>
      </View>

      <View style={styles.gameArea}>
        {/* Display previous guesses */}
        {guesses.map((guess, guessIndex) => (
          <View key={guessIndex} style={styles.guessRow}>
            {guess.split('').map((letter, letterIndex) => (
              <View
                key={letterIndex}
                style={[
                  styles.letterBox,
                  { backgroundColor: getLetterColor(results[guessIndex]?.[letterIndex]) }
                ]}
              >
                <Text style={styles.letterText}>{letter}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* Current guess input row */}
        {!solved && !failed && (
          <View style={styles.guessRow}>
            {Array(wordLength).fill(0).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.letterBox,
                  styles.inputBox,
                  currentGuess[index] && styles.inputBoxFilled
                ]}
              >
                <Text style={styles.letterText}>{currentGuess[index] || ''}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Empty rows for remaining attempts */}
        {Array(Math.max(0, maxAttempts - guesses.length - (solved || failed ? 0 : 1)))
          .fill(0)
          .map((_, rowIndex) => (
            <View key={`empty-${rowIndex}`} style={styles.guessRow}>
              {Array(wordLength).fill(0).map((_, colIndex) => (
                <View key={colIndex} style={[styles.letterBox, styles.emptyBox]} />
              ))}
            </View>
          ))}
      </View>

      {!solved && !failed && (
        <View style={styles.inputSection}>
          <TextInput
            style={styles.textInput}
            value={currentGuess}
            onChangeText={(text) => {
              const upper = text.toUpperCase().replace(/[^A-Z]/g, '').slice(0, wordLength);
              setCurrentGuess(upper);
            }}
            placeholder={`Enter ${wordLength} letters`}
            placeholderTextColor="#6b7280"
            autoCapitalize="characters"
            maxLength={wordLength}
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.submitButton, currentGuess.length !== wordLength && styles.submitButtonDisabled]}
            onPress={handleSubmitGuess}
            disabled={loading || currentGuess.length !== wordLength}
          >
            {loading ? (
              <ActivityIndicator color="#022c22" />
            ) : (
              <Text style={styles.submitButtonText}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#22c55e' }]} />
          <Text style={styles.legendText}>Correct</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#eab308' }]} />
          <Text style={styles.legendText}>Present</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#6b7280' }]} />
          <Text style={styles.legendText}>Absent</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#e5e7eb',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: 8,
  },
  attemptsText: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
  },
  gameArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 24,
  },
  guessRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  letterBox: {
    width: 60,
    height: 60,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1f2937',
  },
  inputBox: {
    backgroundColor: '#020617',
    borderColor: '#4b5563',
  },
  inputBoxFilled: {
    borderColor: '#22c55e',
  },
  emptyBox: {
    backgroundColor: '#020617',
    borderColor: '#1f2937',
  },
  letterText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#e5e7eb',
  },
  inputSection: {
    marginBottom: 24,
  },
  textInput: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#e5e7eb',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 4,
  },
  submitButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#4b5563',
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#022c22',
    fontWeight: '600',
    fontSize: 16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  legendText: {
    color: '#9ca3af',
    fontSize: 12,
  },
});

