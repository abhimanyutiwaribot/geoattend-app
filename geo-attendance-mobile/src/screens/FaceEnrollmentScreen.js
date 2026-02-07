import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform, Animated } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { capturePhotoAsBase64, validateImageSize } from '../utils/cameraUtils';

export default function FaceEnrollmentScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [faceData, setFaceData] = useState(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentComplete, setEnrollmentComplete] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const cameraRef = useRef(null);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        console.log('Camera permission status:', status);
        setHasPermission(status === 'granted');
        setIsSimulationMode(true);
      } catch (error) {
        console.error('Permission request error:', error);
        setHasPermission(true);
        setIsSimulationMode(true);
      }
    })();
  }, []);

  // Pulse animation for face frame
  useEffect(() => {
    if (faceData && !enrollmentComplete) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [faceData, enrollmentComplete]);

  // Fade in animation for instructions
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // Success animation
  useEffect(() => {
    if (enrollmentComplete) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  }, [enrollmentComplete]);

  // Simulation detection
  useEffect(() => {
    if (isSimulationMode && hasPermission && !enrollmentComplete) {
      const timer = setTimeout(() => {
        setFaceData({ bounds: { origin: { x: 0, y: 0 }, size: { width: 100, height: 100 } } });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSimulationMode, hasPermission, enrollmentComplete]);

  const startEnrollment = async () => {
    if (!faceData) {
      Alert.alert('No Face Detected', 'Please position your face within the frame.');
      return;
    }

    setIsEnrolling(true);

    try {
      const photoBase64 = await capturePhotoAsBase64(cameraRef);
      validateImageSize(photoBase64);

      console.log('📤 Sending photo to backend for face recognition...');

      const res = await api.post('/user/biometric/enroll', {
        image: photoBase64,
        deviceID: Platform.OS === 'ios' ? 'IOS_DEVICE' : 'ANDROID_DEVICE'
      });

      if (res.data.success) {
        setEnrollmentComplete(true);
        setTimeout(() => {
          // If accessed from Profile, go back. Otherwise (first-time), go to Home
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.replace('MainTabs');
          }
        }, 2500);
      } else {
        Alert.alert('Enrollment Failed', res.data.message);
      }
    } catch (error) {
      console.error('❌ Enrollment error:', error);
      Alert.alert('Error', error.response?.data?.message || error.message);
    } finally {
      setIsEnrolling(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Initializing camera...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-off" size={64} color="#ef4444" />
        <Text style={styles.errorTitle}>Camera Access Denied</Text>
        <Text style={styles.errorText}>Please enable camera permissions in settings</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#e5e7eb" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Face Enrollment</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Info Banner */}
      <Animated.View style={[styles.infoBanner, { opacity: fadeAnim }]}>
        <Ionicons name="information-circle" size={20} color="#3b82f6" />
        <Text style={styles.infoText}>
          Your face data is encrypted and stored securely
        </Text>
      </Animated.View>

      {/* Camera Container */}
      <View style={styles.cameraContainer}>
        {enrollmentComplete ? (
          <Animated.View style={[styles.successContainer, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={100} color="#22c55e" />
            </View>
            <Text style={styles.successTitle}>Enrollment Complete!</Text>
            <Text style={styles.successSubtitle}>Your face has been registered</Text>
          </Animated.View>
        ) : (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="front"
          >
            <View style={styles.overlay}>
              {/* Face Frame */}
              <Animated.View
                style={[
                  styles.faceFrame,
                  faceData ? styles.faceDetected : styles.faceNotDetected,
                  { transform: [{ scale: faceData ? pulseAnim : 1 }] }
                ]}
              >
                {/* Corner indicators */}
                <View style={[styles.corner, styles.topLeft, faceData && styles.cornerActive]} />
                <View style={[styles.corner, styles.topRight, faceData && styles.cornerActive]} />
                <View style={[styles.corner, styles.bottomLeft, faceData && styles.cornerActive]} />
                <View style={[styles.corner, styles.bottomRight, faceData && styles.cornerActive]} />
              </Animated.View>

              {/* Status indicator */}
              <View style={styles.statusContainer}>
                {faceData ? (
                  <View style={styles.statusBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                    <Text style={styles.statusTextSuccess}>Face Detected</Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, styles.statusBadgeScanning]}>
                    <ActivityIndicator size="small" color="#3b82f6" />
                    <Text style={styles.statusTextScanning}>Scanning...</Text>
                  </View>
                )}
              </View>
            </View>
          </CameraView>
        )}
      </View>

      {/* Footer */}
      {!enrollmentComplete && (
        <View style={styles.footer}>
          <Text style={styles.instruction}>
            {faceData
              ? "✓ Face detected! Hold still and tap enroll."
              : "Position your face inside the frame"}
          </Text>

          <TouchableOpacity
            style={[
              styles.enrollButton,
              (!faceData || isEnrolling) && styles.disabledButton,
              faceData && styles.enrollButtonActive
            ]}
            onPress={startEnrollment}
            disabled={!faceData || isEnrolling}
          >
            {isEnrolling ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color="#020617" size="small" />
                <Text style={styles.enrollButtonText}>Processing...</Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <Ionicons name="scan" size={20} color="#020617" />
                <Text style={styles.enrollButtonText}>Enroll Face</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Tips */}
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>Tips for best results:</Text>
            <View style={styles.tipRow}>
              <Ionicons name="sunny" size={14} color="#94a3b8" />
              <Text style={styles.tipText}>Ensure good lighting</Text>
            </View>
            <View style={styles.tipRow}>
              <Ionicons name="glasses" size={14} color="#94a3b8" />
              <Text style={styles.tipText}>Remove sunglasses if wearing</Text>
            </View>
            <View style={styles.tipRow}>
              <Ionicons name="person" size={14} color="#94a3b8" />
              <Text style={styles.tipText}>Look directly at the camera</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617'
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
    padding: 20,
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 16,
    fontSize: 16,
  },
  errorTitle: {
    color: '#ef4444',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  errorText: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#e5e7eb',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  infoText: {
    color: '#3b82f6',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  cameraContainer: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  camera: {
    flex: 1
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceFrame: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 3,
    borderStyle: 'dashed',
    position: 'relative',
  },
  faceDetected: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    shadowColor: '#22c55e',
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  faceNotDetected: {
    borderColor: '#64748b',
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#64748b',
  },
  cornerActive: {
    borderColor: '#22c55e',
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 140,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 140,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 140,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 140,
  },
  statusContainer: {
    position: 'absolute',
    top: 40,
    alignSelf: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  statusBadgeScanning: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  statusTextSuccess: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  statusTextScanning: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
  },
  instruction: {
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 15,
    fontWeight: '500',
  },
  enrollButton: {
    backgroundColor: '#1e293b',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155',
  },
  enrollButtonActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  disabledButton: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    shadowOpacity: 0,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  enrollButtonText: {
    color: '#020617',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  tipsContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tipsTitle: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipText: {
    color: '#94a3b8',
    fontSize: 13,
    marginLeft: 8,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successTitle: {
    color: '#22c55e',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  successSubtitle: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
  },
});
