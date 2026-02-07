import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { capturePhotoAsBase64, validateImageSize } from '../utils/cameraUtils';

export function FaceVerificationModal({ visible, onVerify, onCancel }) {
  const [faceData, setFaceData] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    // Force simulation mode since native detector is deprecated in SDK 54+
    setIsSimulationMode(true);
  }, []);

  // Simulation detection: Trigger "face found" UI after 0.5s (faster)
  useEffect(() => {
    if (visible && isSimulationMode && !faceData && !isVerifying) {
      console.log('👁️ Starting face detection simulation...');
      const timer = setTimeout(() => {
        console.log('✅ Face detected (simulated)');
        setFaceData({ bounds: { origin: { x: 0, y: 0 }, size: { width: 100, height: 100 } } });
      }, 500); // Reduced from 1500ms to 500ms
      return () => clearTimeout(timer);
    }
  }, [visible, isSimulationMode, faceData, isVerifying]);

  useEffect(() => {
    if (visible && faceData && countdown === 0 && !isVerifying) {
      startAutoVerify();
    }
  }, [visible, faceData, countdown, isVerifying]);

  const startAutoVerify = () => {
    // Instant verification - no countdown delay
    handleVerify();
  };

  const handleFacesDetected = () => {
    // No-op for simulation
  };

  const handleVerify = async () => {
    console.log('🔐 Starting identity verification...');
    setIsVerifying(true);
    try {
      // Capture photo from camera
      const photoBase64 = await capturePhotoAsBase64(cameraRef);

      // Validate image size
      validateImageSize(photoBase64);

      console.log('📤 Sending photo to backend for verification...');

      // Send photo to parent component (which will call the API)
      await onVerify(photoBase64);
      console.log('✅ onVerify callback completed');
    } catch (e) {
      console.error('❌ Verification error:', e);
      throw e;
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel}>
            <Ionicons name="close" size={28} color="#e5e7eb" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Identity Check</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="front"
          >
            <View style={styles.overlay}>
              <View style={[
                styles.faceFrame,
                faceData ? styles.faceDetected : styles.faceNotDetected
              ]} />

              {countdown > 0 && (
                <View style={styles.countdownContainer}>
                  <Text style={styles.countdownText}>{countdown}</Text>
                </View>
              )}
            </View>
          </CameraView>
        </View>

        <View style={styles.footer}>
          {isVerifying ? (
            <>
              <ActivityIndicator size="large" color="#22c55e" />
              <Text style={styles.verifyingText}>Verifying identity...</Text>
            </>
          ) : (
            <>
              <Text style={styles.instruction}>
                {faceData
                  ? "✓ Identity detected. Verifying..."
                  : "Position your face in the frame to confirm identity."}
              </Text>
              <Text style={styles.subInstruction}>
                This is a mandatory security check for attendance.
              </Text>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: { color: '#e5e7eb', fontSize: 18, fontWeight: 'bold' },
  cameraContainer: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#334155',
  },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceFrame: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 4,
    borderStyle: 'dashed',
  },
  faceDetected: { borderColor: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.1)' },
  faceNotDetected: { borderColor: '#94a3b8' },
  countdownContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  countdownText: {
    color: '#fff',
    fontSize: 72,
    fontWeight: 'bold',
  },
  footer: {
    padding: 40,
    alignItems: 'center',
    minHeight: 180,
  },
  instruction: {
    color: '#e5e7eb',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  verifyingText: {
    color: '#22c55e',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  subInstruction: {
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: 14,
  }
});
