import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { Ionicons } from '@expo/vector-icons';
import { capturePhotoAsBase64, validateImageSize } from '../utils/cameraUtils';
import { useTheme } from '../context/ThemeContext';

export function FaceVerificationModal({ visible, onVerify, onCancel }) {
  const { colors, isDark } = useTheme();
  const [faceData, setFaceData] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [showManualCapture, setShowManualCapture] = useState(false);
  const cameraRef = useRef(null);

  const device = useCameraDevice('front');

  useEffect(() => {
    if (visible) {
      setFaceData(null);
      setIsVerifying(false);
      setVerificationSuccess(false);
      setCountdown(3);
      setShowManualCapture(true); // Always show manual capture since we removed the continuous face detector
    }
  }, [visible]);

  // Start a simulated countdown when modal opens, or they can click manual capture
  useEffect(() => {
    if (!visible || isVerifying || !device) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      handleVerify();
    }
  }, [visible, countdown, isVerifying, device]);

  const handleVerify = async () => {
    if (isVerifying) return;
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
          {device == null ? (
            <View style={styles.overlay}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <Camera
              ref={cameraRef}
              style={styles.camera}
              device={device}
              isActive={visible && !verificationSuccess}
              photo={true}
            >
              <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.1)' }]}>
                {verificationSuccess ? (
                  <View style={[styles.successOverlay, { backgroundColor: colors.primarySoft }]}>
                    <Ionicons name="checkmark-circle" size={100} color={colors.primary} />
                  </View>
                ) : (
                  <View style={[
                    styles.faceFrame,
                    countdown > 0 ? { borderColor: colors.primary, backgroundColor: colors.primarySoft } : { borderColor: colors.textMuted }
                  ]}>
                    {countdown > 0 && (
                      <Text style={[styles.countdownText, { color: colors.primary }]}>{countdown}</Text>
                    )}
                  </View>
                )}
              </View>
            </Camera>
          )}
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
                {countdown > 0
                  ? `Hold still for ${countdown}s...`
                  : 'Position your face in the frame'}
              </Text>
              <Text style={[styles.subInstruction, { color: colors.textSecondary }]}>
                {countdown > 0 ? 'Verifying security...' : 'Keep your device steady and look into the camera.'}
              </Text>

              {showManualCapture && (
                <TouchableOpacity
                  style={[styles.manualBtn, { backgroundColor: colors.primary }]}
                  onPress={handleVerify}
                >
                  <Text style={styles.manualBtnText}>Capture Identity</Text>
                </TouchableOpacity>
              )}
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
  },
  manualBtn: {
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  manualBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  }
});
