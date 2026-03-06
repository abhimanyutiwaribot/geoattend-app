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

    if (image) {
      // REAL FACE RECOGNITION: Generate 128-dim embedding from photo
      console.log('[Biometric] Processing face image for enrollment');
      faceEmbedding = await RealFaceRecognitionService.generateEmbedding(image);
      console.log('[Biometric] Embedding generated successfully');
    } else if (embedding && Array.isArray(embedding)) {
      // Allow direct embedding (admin/testing only)
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

    if (image) {
      // REAL FACE RECOGNITION: Generate 128-dim embedding from photo
      console.log('[Biometric] Processing face image for verification');
      faceEmbedding = await RealFaceRecognitionService.generateEmbedding(image);
      console.log('[Biometric] Embedding generated successfully');
    } else if (embedding && Array.isArray(embedding)) {
      // Allow direct embedding (admin/testing only)
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
