const express = require('express');
const authMiddleware = require('../middleware/authmiddleware');
const FaceVerificationService = require('../services/faceVerificationService');
const RealFaceRecognitionService = require('../services/realFaceRecognitionService');
const biometricRouter = express.Router();

/**
 * Enroll a user's face from photo
 * POST /api/v1/user/biometric/enroll
 * Body: { image: "base64_image_string", deviceID: "device_id" }
 */
biometricRouter.post('/enroll', authMiddleware, async (req, res) => {
  try {
    const { image, embedding, deviceID } = req.body;
    const userId = req.user._id;

    let faceEmbedding;

    // Support both image (real) and embedding (simulation) for backward compatibility
    if (image) {
      try {
        // REAL FACE RECOGNITION: Generate embedding from image
        console.log('🎯 [Biometric] Processing real face image for enrollment');
        faceEmbedding = await RealFaceRecognitionService.generateEmbedding(image);
        console.log('✅ [Biometric] Face embedding generated from image');
      } catch (error) {
        // Fall back to simulation if models aren't loaded
        if (error.message.includes('models not loaded')) {
          console.log('⚠️  [Biometric] Models not available, using simulation mode');
          // Generate simulated embedding from image hash
          const crypto = require('crypto');
          const imageHash = crypto.createHash('md5').update(image.substring(0, 1000)).digest('hex');
          const seed = parseInt(imageHash.substring(0, 8), 16);
          faceEmbedding = Array.from({ length: 128 }, (_, i) => Math.sin(seed + i * 0.1) * 2 - 1);
        } else {
          throw error;
        }
      }
    } else if (embedding && Array.isArray(embedding)) {
      // SIMULATION MODE: Use provided embedding
      console.log('🎭 [Biometric] Using simulated embedding for enrollment');
      faceEmbedding = embedding;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either face image (base64) or embedding array is required'
      });
    }

    const result = await FaceVerificationService.enrollFace(userId, faceEmbedding, deviceID);

    res.json(result);
  } catch (error) {
    console.error('❌ [Biometric] Enrollment error:', error);
    res.status(500).json({
      success: false,
      message: error.message === 'No face detected in image'
        ? 'No face detected in the image. Please ensure your face is clearly visible.'
        : 'Failed to enroll face',
      error: error.message
    });
  }
});

/**
 * Verify a face from photo (Identity check)
 * POST /api/v1/user/biometric/verify
 * Body: { image: "base64_image_string" }
 */
biometricRouter.post('/verify', authMiddleware, async (req, res) => {
  try {
    const { image, embedding } = req.body;
    const userId = req.user._id;

    let faceEmbedding;

    // Support both image (real) and embedding (simulation)
    if (image) {
      try {
        // REAL FACE RECOGNITION: Generate embedding from image
        console.log('🎯 [Biometric] Processing real face image for verification');
        faceEmbedding = await RealFaceRecognitionService.generateEmbedding(image);
        console.log('✅ [Biometric] Face embedding generated from image');
      } catch (error) {
        // Fall back to simulation if models aren't loaded
        if (error.message.includes('models not loaded')) {
          console.log('⚠️  [Biometric] Models not available, using simulation mode');
          // Generate simulated embedding from image hash (deterministic)
          const crypto = require('crypto');
          const imageHash = crypto.createHash('md5').update(image.substring(0, 1000)).digest('hex');
          const seed = parseInt(imageHash.substring(0, 8), 16);
          faceEmbedding = Array.from({ length: 128 }, (_, i) => Math.sin(seed + i * 0.1) * 2 - 1);
        } else {
          throw error;
        }
      }
    } else if (embedding && Array.isArray(embedding)) {
      // SIMULATION MODE: Use provided embedding
      console.log('🎭 [Biometric] Using simulated embedding for verification');
      faceEmbedding = embedding;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either face image (base64) or embedding array is required'
      });
    }

    const verification = await FaceVerificationService.verifyFace(userId, faceEmbedding);

    res.json({
      success: true,
      data: verification
    });
  } catch (error) {
    console.error('❌ [Biometric] Verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message === 'No face detected in image'
        ? 'No face detected in the image. Please ensure your face is clearly visible.'
        : 'Face verification failed',
      error: error.message
    });
  }
});

module.exports = biometricRouter;
