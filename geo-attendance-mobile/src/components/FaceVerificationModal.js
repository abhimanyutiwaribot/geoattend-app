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
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [visible, isSimulationMode, faceData, isVerifying]);

  useEffect(() => {
    if (visible && faceData && countdown === 0 && !isVerifying) {
      startAutoVerify();
    }
  }, [visible, faceData, countdown, isVerifying]);

  const startAutoVerify = () => {
    handleVerify();
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const photoBase64 = await capturePhotoAsBase64(cameraRef);
      validateImageSize(photoBase64);
      await onVerify(photoBase64);
    } catch (e) {
      console.error('❌ Verification error:', e);
    } finally {
      setIsVerifying(false);
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

        <View style={[styles.cameraContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="front"
          >
            <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.1)' }]}>
              <View style={[
                styles.faceFrame,
                faceData ? { borderColor: colors.primary, backgroundColor: isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.2)' } : { borderColor: colors.textMuted }
              ]} />
            </View>
          </CameraView>
        </View>

        <View style={styles.footer}>
          {isVerifying ? (
            <>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.verifyingText, { color: colors.primary }]}>Verifying identity...</Text>
            </>
          ) : (
            <>
              <Text style={[styles.instruction, { color: colors.text }]}>
                {faceData
                  ? "✓ Identity detected. Verifying..."
                  : "Position your face in the frame to confirm identity."}
              </Text>
              <Text style={[styles.subInstruction, { color: colors.textSecondary }]}>
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
  faceFrame: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 4,
    borderStyle: 'dashed',
  },
  footer: {
    padding: 40,
    alignItems: 'center',
    minHeight: 180,
  },
  instruction: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
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
  }
});
