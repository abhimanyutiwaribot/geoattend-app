const faceapi = require('face-api.js');
const canvas = require('canvas');
const path = require('path');

// Patch face-api.js to use node-canvas
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

class RealFaceRecognitionService {
  constructor() {
    this.modelsLoaded = false;
    this.modelPath = path.join(__dirname, '../../models');
  }

  /**
   * Load face-api.js models
   * Call this once when server starts
   */
  async loadModels() {
    if (this.modelsLoaded) return;

    try {
      console.log('🧠 Loading face recognition models from:', this.modelPath);

      // Load required models
      await faceapi.nets.ssdMobilenetv1.loadFromDisk(this.modelPath);
      await faceapi.nets.faceLandmark68Net.loadFromDisk(this.modelPath);
      await faceapi.nets.faceRecognitionNet.loadFromDisk(this.modelPath);

      this.modelsLoaded = true;
      console.log('✅ Face recognition models loaded successfully');
    } catch (error) {
      console.error('❌ Error loading face recognition models:', error);
      console.log('⚠️  Falling back to simulation mode');
      // Don't throw - allow server to start in simulation mode
    }
  }

  /**
   * Generate face embedding from base64 image
   * @param {string} base64Image - Base64 encoded image
   * @returns {Promise<number[]>} 128-dimensional face descriptor
   */
  async generateEmbedding(base64Image) {
    if (!this.modelsLoaded) {
      await this.loadModels();
    }

    if (!this.modelsLoaded) {
      throw new Error('Face recognition models not loaded. Please check model files.');
    }

    try {
      // Remove data URL prefix if present
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Load image
      const img = await canvas.loadImage(buffer);

      // Detect face and compute descriptor
      const detection = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        throw new Error('No face detected in image');
      }

      // Return the 128-dimensional descriptor as array
      return Array.from(detection.descriptor);
    } catch (error) {
      console.error('❌ Error generating face embedding:', error);
      throw error;
    }
  }

  /**
   * Compare two face embeddings
   * @param {number[]} embedding1 
   * @param {number[]} embedding2 
   * @returns {number} Euclidean distance (lower = more similar)
   */
  compareEmbeddings(embedding1, embedding2) {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same length');
    }

    let sum = 0;
    for (let i = 0; i < embedding1.length; i++) {
      sum += Math.pow(embedding1[i] - embedding2[i], 2);
    }

    return Math.sqrt(sum);
  }

  /**
   * Verify if two embeddings match
   * @param {number[]} embedding1 
   * @param {number[]} embedding2 
   * @param {number} threshold - Default 0.6 (face-api.js standard)
   * @returns {object} { isMatch: boolean, distance: number, confidence: number }
   */
  verifyMatch(embedding1, embedding2, threshold = 0.6) {
    const distance = this.compareEmbeddings(embedding1, embedding2);
    const isMatch = distance < threshold;

    // Convert distance to confidence score (0-100)
    const confidence = Math.max(0, Math.min(100, (1 - distance / threshold) * 100));

    return {
      isMatch,
      distance,
      confidence: Math.round(confidence),
      threshold
    };
  }
}

module.exports = new RealFaceRecognitionService();
