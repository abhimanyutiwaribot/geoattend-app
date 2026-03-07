import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform, Animated } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { capturePhotoAsBase64, validateImageSize } from '../utils/cameraUtils';
import { useTheme } from '../context/ThemeContext';

export default function FaceEnrollmentScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const [faceData, setFaceData] = useState(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentComplete, setEnrollmentComplete] = useState(false);
  const cameraRef = useRef(null);

  const scaleAnim = useRef(new Animated.Value(0)).current;

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

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



  const startEnrollment = async () => {
    if (isEnrolling) return;

    setIsEnrolling(true);

    try {
      const photoBase64 = await capturePhotoAsBase64(cameraRef);
      validateImageSize(photoBase64);

      const res = await api.post('/user/biometric/enroll', {
        image: photoBase64,
        deviceID: Platform.OS === 'ios' ? 'IOS_DEVICE' : 'ANDROID_DEVICE'
      });

      if (res.data.success) {
        setEnrollmentComplete(true);
        setTimeout(() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.replace('Tabs');
          }
        }, 2000);
      } else {
        Alert.alert('Try Again', res.data.message);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Face scan failed. Please try again.');
    } finally {
      setIsEnrolling(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="camera-off" size={64} color={colors.danger} />
        <Text style={[styles.errorTitle, { color: colors.danger }]}>Camera Access Required</Text>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Please enable camera in your device settings.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.replace('Tabs')}
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Secure ID</Text>
      </View>

      <View style={[styles.cameraOuterContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {enrollmentComplete ? (
          <Animated.View style={[styles.successContainer, { transform: [{ scale: scaleAnim }] }]}>
            <View style={[styles.successIconBox, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="shield-checkmark" size={80} color={colors.primary} />
            </View>
            <Text style={[styles.successTitle, { color: colors.primary }]}>Verified</Text>
            <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>Your identity is now linked</Text>
          </Animated.View>
        ) : (
          <View style={styles.cameraFrame}>
            {device == null ? (
              <View style={styles.overlay}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <Camera
                ref={cameraRef}
                style={styles.camera}
                device={device}
                isActive={!enrollmentComplete}
                photo={true}
              >
                <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(2, 6, 23, 0.4)' : 'rgba(255, 255, 255, 0.2)' }]}>
                  <View style={[
                    styles.faceGuide,
                    { borderColor: colors.primary, backgroundColor: colors.primarySoft }
                  ]}>
                    <View style={[styles.corner, styles.topLeft, { borderColor: colors.primary }]} />
                    <View style={[styles.corner, styles.topRight, { borderColor: colors.primary }]} />
                    <View style={[styles.corner, styles.bottomLeft, { borderColor: colors.primary }]} />
                    <View style={[styles.corner, styles.bottomRight, { borderColor: colors.primary }]} />
                  </View>
                </View>
              </Camera>
            )}
          </View>
        )}
      </View>

      {!enrollmentComplete && (
        <View style={styles.footer}>
          <Text style={[styles.instruction, { color: colors.textSecondary }]}>
            Position your face in the center and tap to secure.
          </Text>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: colors.primary, ...styles.actionBtnElevated },
              isEnrolling && { opacity: 0.6 }
            ]}
            onPress={startEnrollment}
            disabled={isEnrolling}
          >
            {isEnrolling ? (
              <ActivityIndicator color={isDark ? "#000000" : "#ffffff"} />
            ) : (
              <View style={styles.btnContent}>
                <Ionicons name="finger-print" size={20} color={isDark ? "#000000" : "#ffffff"} />
                <Text style={[styles.btnText, { color: isDark ? "#000000" : "#ffffff" }]}>Confirm Identity</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  cameraOuterContainer: {
    flex: 1,
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
  },
  cameraFrame: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceGuide: {
    width: 260,
    height: 320,
    borderRadius: 130,
    borderWidth: 2,
    borderStyle: 'dashed',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: 'transparent',
  },
  topLeft: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 24 },
  topRight: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 24 },
  bottomLeft: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 24 },
  bottomRight: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 24 },
  footer: {
    padding: 24,
    paddingBottom: 48,
  },
  instruction: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 24,
  },
  actionBtn: {
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  actionBtnElevated: {
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '800',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  successIconBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 20,
  },
  errorText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  }
});
