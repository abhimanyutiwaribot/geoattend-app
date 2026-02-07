const FaceProfile = require('../models/faceProfile');

class FaceVerificationService {
  /**
   * Enroll a new user's face
   */
  async enrollFace(userId, embedding, deviceId) {
    try {
      // Check if user already has a profile
      let profile = await FaceProfile.findOne({ userId });

      if (profile) {
        profile.baselineEmbedding = embedding;
        profile.enrollmentDevice = deviceId;
        profile.lastVerified = new Date();
        await profile.save();
      } else {
        profile = new FaceProfile({
          userId,
          baselineEmbedding: embedding,
          enrollmentDevice: deviceId
        });
        await profile.save();
      }

      return {
        success: true,
        message: 'Face enrollment successful'
      };
    } catch (error) {
      console.error('Face Enrollment Error:', error);
      throw error;
    }
  }

  /**
   * Verify an incoming face embedding against the baseline
   */
  async verifyFace(userId, pulseEmbedding) {
    try {
      const profile = await FaceProfile.findOne({ userId, isActive: true });

      if (!profile) {
        return {
          success: false,
          score: 0,
          message: 'Face profile not found. Please enroll first.'
        };
      }

      const distance = this.calculateEuclideanDistance(
        profile.baselineEmbedding,
        pulseEmbedding
      );

      // distance 0 = identical
      // distance > 0.6 is usually a different person in face-api.js
      // We map this to a score 0-100
      // 0.0 distance = 100 score
      // 0.6 distance = 0 score
      const threshold = 0.6;
      let score = Math.max(0, 100 * (1 - (distance / threshold)));

      // Round score
      score = Math.round(score);

      const isMatch = distance <= threshold;

      // Update trust level slightly based on match
      if (isMatch) {
        profile.lastVerified = new Date();
        profile.trustLevel = Math.min(100, profile.trustLevel + 1);
      } else {
        profile.trustLevel = Math.max(0, profile.trustLevel - 5);
      }
      await profile.save();

      return {
        success: isMatch,
        score,
        data: {
          distance,
          threshold
        }
      };
    } catch (error) {
      console.error('Face Verification Error:', error);
      return {
        success: false,
        score: 0,
        error: error.message
      };
    }
  }

  /**
   * Calculate Euclidean distance between two vectors
   */
  calculateEuclideanDistance(vector1, vector2) {
    if (vector1.length !== vector2.length) {
      throw new Error('Vectors must have the same length');
    }

    let sum = 0;
    for (let i = 0; i < vector1.length; i++) {
      sum += Math.pow(vector1[i] - vector2[i], 2);
    }
    return Math.sqrt(sum);
  }
}

module.exports = new FaceVerificationService();
