// src/screens/AttendanceScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Button from '../components/common/Button';
import StatusCard from '../components/common/StatusCard';
import { attendanceService } from '../services/attendance';
import motionService from '../services/motion';
import useLocation from '../hooks/useLocation';

const AttendanceScreen = ({ navigation, route }) => {
  const { location, refreshLocation } = useLocation();
  const [attendanceSession, setAttendanceSession] = useState(null);
  const [currentStep, setCurrentStep] = useState('checking'); // checking, starting, active, completed
  const [loading, setLoading] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [validationCount, setValidationCount] = useState(0);

  // Timer for session duration
  useEffect(() => {
    let timer;
    if (currentStep === 'active' && attendanceSession) {
      timer = setInterval(() => {
        setSessionTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [currentStep, attendanceSession]);

  // Periodic validation during active session
  useEffect(() => {
    let validationTimer;
    if (currentStep === 'active' && attendanceSession) {
      validationTimer = setInterval(() => {
        performPeriodicValidation();
      }, 30000); // Every 30 seconds
    }
    return () => clearInterval(validationTimer);
  }, [currentStep, attendanceSession]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startAttendance = async () => {
    if (!location?.geofenceStatus?.isWithin) {
      Alert.alert('Cannot Start', 'You must be within the office area to start attendance.');
      return;
    }

    setLoading(true);
    setCurrentStep('starting');

    try {
      // Start motion monitoring
      motionService.startMonitoring();

      // Start attendance session
      const response = await attendanceService.startAttendance(location);
      
      setAttendanceSession(response.data);
      setCurrentStep('active');
      setSessionTime(0);
      setValidationCount(0);

      // Perform initial validation
      await performPeriodicValidation();

    } catch (error) {
      Alert.alert(
        'Failed to Start',
        error.message || 'Could not start attendance session. Please try again.'
      );
      setCurrentStep('checking');
    } finally {
      setLoading(false);
    }
  };

  const performPeriodicValidation = async () => {
    if (!attendanceSession) return;

    try {
      const motionData = motionService.getCurrentMotion();
      await attendanceService.validatePresence(attendanceSession.attendanceId, motionData);
      
      setValidationCount(prev => prev + 1);
      
      // Check for suspicion periodically
      if (validationCount % 3 === 0) { // Every 3 validations
        await checkForSuspicion();
      }
    } catch (error) {
      console.log('Validation failed:', error);
    }
  };

  const checkForSuspicion = async () => {
    try {
      const response = await attendanceService.checkSuspicion(attendanceSession.attendanceId);
      
      if (response.data?.challenge) {
        handleRevalidationChallenge(response.data.challenge);
      }
    } catch (error) {
      console.log('Suspicion check failed:', error);
    }
  };

  const handleRevalidationChallenge = (challenge) => {
    Alert.alert(
      'Verification Required',
      'Please complete the verification challenge to continue your attendance session.',
      [
        {
          text: 'Complete Challenge',
          onPress: () => handleChallengeResponse(challenge),
        },
      ]
    );
  };

  const handleChallengeResponse = async (challenge) => {
    // For now, we'll simulate a successful challenge response
    // In real app, this would show a modal with the actual challenge
    try {
      let responseData = {};
      
      if (challenge.challengeType === 'qr_scan') {
        responseData = { scannedCode: challenge.challengeData.qrCode };
      } else if (challenge.challengeType === 'question') {
        // This would show a question modal in real implementation
        responseData = { answer: '8' }; // Default test answer
      }
      
      await attendanceService.validateChallenge(
        challenge.challengeId,
        attendanceSession.attendanceId,
        responseData
      );
      
      Alert.alert('Success', 'Verification completed successfully!');
    } catch (error) {
      Alert.alert('Verification Failed', 'Please try the challenge again.');
    }
  };

  const endAttendance = async () => {
    setLoading(true);

    try {
      await attendanceService.endAttendance(attendanceSession.attendanceId);
      
      // Stop motion monitoring
      motionService.stopMonitoring();
      
      setCurrentStep('completed');
      
      Alert.alert(
        'Session Completed',
        `Attendance session ended successfully.\nDuration: ${formatTime(sessionTime)}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        error.message || 'Failed to end attendance session.'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'checking':
        return (
          <View style={styles.stepContent}>
            <StatusCard
              icon="📍"
              title="Ready to Check In"
              status="You're within the office area and ready to start your attendance session."
              isActive={true}
            />
            
            <Button
              title="Start Attendance Session"
              onPress={startAttendance}
              variant="success"
              style={styles.actionButton}
            />
          </View>
        );

      case 'starting':
        return (
          <View style={styles.stepContent}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.stepTitle}>Starting Session...</Text>
            <Text style={styles.stepDescription}>
              Initializing attendance session and motion monitoring
            </Text>
          </View>
        );

      case 'active':
        return (
          <View style={styles.stepContent}>
            <StatusCard
              icon="✅"
              title="Session Active"
              status={`Attendance session in progress - ${formatTime(sessionTime)}`}
              isActive={true}
            />
            
            <View style={styles.sessionInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Session ID:</Text>
                <Text style={styles.infoValue}>
                  {attendanceSession?.attendanceId?.slice(-8)}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Validations:</Text>
                <Text style={styles.infoValue}>{validationCount}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Duration:</Text>
                <Text style={styles.infoValue}>{formatTime(sessionTime)}</Text>
              </View>
            </View>

            <Button
              title="End Session"
              onPress={endAttendance}
              variant="primary"
              loading={loading}
              style={styles.actionButton}
            />
          </View>
        );

      case 'completed':
        return (
          <View style={styles.stepContent}>
            <StatusCard
              icon="🎉"
              title="Session Completed"
              status={`Your attendance session has been recorded. Duration: ${formatTime(sessionTime)}`}
              isActive={false}
            />
            
            <Button
              title="Back to Dashboard"
              onPress={() => navigation.goBack()}
              variant="primary"
              style={styles.actionButton}
            />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📝 Attendance</Text>
        <Text style={styles.subtitle}>Office Check-in Session</Text>
      </View>

      <View style={styles.content}>
        {renderStepContent()}
        
        {/* Location Status */}
        <View style={styles.locationSection}>
          <Text style={styles.sectionTitle}>Current Location</Text>
          <StatusCard
            icon="📍"
            title={location ? `Within ${location.geofenceStatus?.distance}m` : 'Checking...'}
            status={location?.geofenceStatus?.isWithin ? 'In office area' : 'Outside office area'}
            isActive={location?.geofenceStatus?.isWithin}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#28A745',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  content: {
    padding: 20,
    gap: 20,
  },
  stepContent: {
    gap: 20,
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
    marginTop: 16,
  },
  stepDescription: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
  },
  actionButton: {
    width: '100%',
  },
  sessionInfo: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 16,
    color: '#6C757D',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#212529',
    fontWeight: '600',
  },
  locationSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
});

export default AttendanceScreen;