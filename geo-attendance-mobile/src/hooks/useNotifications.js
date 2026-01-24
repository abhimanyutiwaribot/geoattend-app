import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { api } from '../api/client';
import { registerForPushNotificationsAsync, scheduleLocalNotification, saveLocalNotificationEntry } from '../utils/notifications';

/**
 * Custom hook for managing notification listeners
 */
export function useNotifications(navigation) {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    registerForPushNotificationsAsync();

    // Listen for notifications when app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data;

      // Handle cognitive challenges
      if (data.challengeType) {
        navigation.navigate('CognitiveChallenge', {
          challengeId: data.challengeId,
          challengeType: data.challengeType,
          challengeData: data.challengeData,
          expiresAt: data.expiresAt
        });
      }
      // Handle legacy Wordle challenges
      else if (data.challengeId && data.attendanceId) {
        navigation.navigate('WordleChallenge', {
          challengeId: data.challengeId,
          attendanceId: data.attendanceId,
          wordLength: data.wordLength,
          maxAttempts: data.maxAttempts,
        });
      }
    });

    // Listen for notification taps
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;

      // Handle cognitive challenges
      if (data.challengeType) {
        navigation.navigate('CognitiveChallenge', {
          challengeId: data.challengeId,
          challengeType: data.challengeType,
          challengeData: data.challengeData,
          expiresAt: data.expiresAt
        });
      }
      // Handle legacy Wordle challenges
      else if (data.challengeId && data.attendanceId) {
        navigation.navigate('WordleChallenge', {
          challengeId: data.challengeId,
          attendanceId: data.attendanceId,
          wordLength: data.wordLength,
          maxAttempts: data.maxAttempts,
        });
      }
    });

    return () => {
      if (notificationListener.current?.remove) {
        notificationListener.current.remove();
      }
      if (responseListener.current?.remove) {
        responseListener.current.remove();
      }
    };
  }, [navigation]);
}

/**
 * Custom hook for periodic cognitive challenges (proof-of-presence)
 */
export function useSuspicionCheck({ session, navigation }) {
  const [lastChallengeId, setLastChallengeId] = useState(null);

  // Reset challenge tracker when session ends or changes
  useEffect(() => {
    if (!session) {
      setLastChallengeId(null);
    }
  }, [session]);

  // Periodic cognitive challenge check
  useEffect(() => {
    if (!session?.attendanceId) {
      return;
    }

    const generateChallenge = async () => {
      try {
        const res = await api.post('/attendance/generate-cognitive-challenge', {
          attendanceId: session.attendanceId,
        });

        const { challengeId, challengeType, challengeData, expiresAt } = res.data.data;

        if (challengeId !== lastChallengeId) {
          setLastChallengeId(challengeId);

          // Show notification
          await scheduleLocalNotification(
            '🧠 Quick Check Required',
            'Complete a 3-second challenge to confirm your presence',
            {
              challengeId,
              challengeType,
              challengeData,
              expiresAt
            }
          );

          await saveLocalNotificationEntry({
            id: challengeId,
            title: '🧠 Quick Check Required',
            body: 'Complete a 3-second challenge to confirm your presence',
            timestamp: Date.now(),
            data: {
              challengeId,
              challengeType,
              challengeData,
              expiresAt
            },
          });

          // Navigate to challenge
          navigation.navigate('CognitiveChallenge', {
            challengeId,
            challengeType,
            challengeData,
            expiresAt
          });
        }
      } catch (e) {
        console.log('Challenge generation error:', e.message);
      }
    };

    // Initial check after 2 minutes
    const initialTimeout = setTimeout(() => {
      generateChallenge();
    }, 2 * 60 * 1000);

    // Then check every 45 minutes (as per requirements)
    const intervalId = setInterval(() => {
      generateChallenge();
    }, 45 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, [session?.attendanceId, navigation, lastChallengeId]);

  return { lastChallengeId };
}
