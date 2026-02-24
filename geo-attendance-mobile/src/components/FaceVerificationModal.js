import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { capturePhotoAsBase64, validateImageSize } from '../utils/cameraUtils';
import { useTheme } from '../context/ThemeContext';

export function FaceVerificationModal({ visible, onVerify, onCancel }) {
  const { colors, isDark } = useTheme();
  const [faceData, setFaceData] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    // Reset state when modal becomes visible
    if (visible) {
      setFaceData(null);
      setIsVerifying(false);
      setVerificationSuccess(false);
      setCountdown(3);
    }
  }, [visible]);

  useEffect(() => {
    setIsSimulationMode(true);
  }, []);

  // Simulation detection: Trigger "face found" UI after a more realistic 1.5s
  useEffect(() => {
    if (visible && isSimulationMode && !faceData && !isVerifying) {
      console.log('👁️ Starting face detection simulation...');
      const timer = setTimeout(() => {
        console.log('✅ Face detected (simulated)');
        setFaceData({ bounds: { origin: { x: 0, y: 0 }, size: { width: 100, height: 100 } } });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [visible, isSimulationMode, faceData, isVerifying]);

  // Countdown logic once face is detected
  useEffect(() => {
    if (visible && faceData && countdown > 0 && !isVerifying) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (visible && faceData && countdown === 0 && !isVerifying) {
      handleVerify();
    }
  }, [visible, faceData, countdown, isVerifying]);

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const photoBase64 = await capturePhotoAsBase64(cameraRef);
      validateImageSize(photoBase64);

      // Call parent onVerify
      await onVerify(photoBase64);

      // Set local success state to show "Verified" message before modal closes
      setVerificationSuccess(true);

      // Modal typically closes via parent state update triggered by onVerify
      // but if the parent takes time, we show success here.
    } catch (e) {
      console.error('❌ Verification error:', e);
      setIsVerifying(false); // Only reset if failed
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Identity Check</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={[styles.cameraContainer, { backgroundColor: colors.surface, borderColor: verificationSuccess ? colors.primary : colors.border }]}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="front"
          >
            <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.1)' }]}>
              {verificationSuccess ? (
                <View style={[styles.successOverlay, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                  <Ionicons name="checkmark-circle" size={100} color={colors.primary} />
                </View>
              ) : (
                <View style={[
                  styles.faceFrame,
                  faceData ? { borderColor: colors.primary, backgroundColor: isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.2)' } : { borderColor: colors.textMuted }
                ]}>
                  {faceData && countdown > 0 && (
                    <Text style={[styles.countdownText, { color: colors.primary }]}>{countdown}</Text>
                  )}
                </View>
              )}
            </View>
          </CameraView>
        </View>

        <View style={styles.footer}>
          {verificationSuccess ? (
            <>
              <Text style={[styles.instruction, { color: colors.primary }]}>✓ Verification Successful</Text>
              <Text style={[styles.subInstruction, { color: colors.textSecondary }]}>Signing you in...</Text>
            </>
          ) : isVerifying ? (
            <>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.verifyingText, { color: colors.primary }]}>Analyzing features...</Text>
            </>
          ) : (
            <>
              <Text style={[styles.instruction, { color: colors.text }]}>
                {faceData
                  ? `Hold still for ${countdown}s...`
                  : "Position your face in the frame"}
              </Text>
              <Text style={[styles.subInstruction, { color: colors.textSecondary }]}>
                {faceData ? "Identity located. Verifying security..." : "Keep your device steady and look into the camera."}
              </Text>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  cameraContainer: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 2,
  },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceFrame: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 4,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 80,
    fontWeight: '800',
  },
  footer: {
    paddingVertical: 30,
    paddingHorizontal: 40,
    alignItems: 'center',
    minHeight: 180,
  },
  instruction: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  verifyingText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  subInstruction: {
    textAlign: 'center',
    fontSize: 14,
    opacity: 0.8,
  }
});
