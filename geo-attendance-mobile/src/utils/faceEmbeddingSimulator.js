import AsyncStorage from '@react-native-async-storage/async-storage';

const BASELINE_EMBEDDING_KEY = 'user_baseline_face_embedding';

/**
 * Generate a deterministic baseline embedding based on user ID
 * This simulates a real face embedding that would be generated from a photo
 */
export async function generateBaselineEmbedding() {
  // Check if we already have a baseline
  const existing = await AsyncStorage.getItem(BASELINE_EMBEDDING_KEY);
  if (existing) {
    console.log('📦 Using existing baseline embedding');
    return JSON.parse(existing);
  }

  // Generate a new baseline (deterministic based on a seed)
  const seed = Date.now();
  const baseline = Array.from({ length: 128 }, (_, i) => {
    // Use sine function with seed for deterministic but varied values
    return Math.sin(seed + i * 0.1) * 2 - 1;
  });

  // Store it
  await AsyncStorage.setItem(BASELINE_EMBEDDING_KEY, JSON.stringify(baseline));
  console.log('✨ Generated new baseline embedding');

  return baseline;
}

/**
 * Generate a verification embedding that's similar to the baseline
 * Adds small random noise to simulate real-world variation
 */
export async function generateVerificationEmbedding() {
  const baseline = await generateBaselineEmbedding();

  // Add small random noise (±0.05) to simulate real face scan variation
  const verification = baseline.map(value => {
    const noise = (Math.random() - 0.5) * 0.1; // ±0.05
    return Math.max(-1, Math.min(1, value + noise)); // Clamp to [-1, 1]
  });

  console.log('🔄 Generated verification embedding with small variation');
  return verification;
}

/**
 * Clear the stored baseline (for testing/logout)
 */
export async function clearBaselineEmbedding() {
  await AsyncStorage.removeItem(BASELINE_EMBEDDING_KEY);
  console.log('🗑️ Cleared baseline embedding');
}
