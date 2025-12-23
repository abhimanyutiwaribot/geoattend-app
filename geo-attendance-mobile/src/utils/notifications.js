import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Request permissions and get token
export async function registerForPushNotificationsAsync() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return null;
  }
  
  return finalStatus === 'granted';
}

// Schedule a local notification
export async function scheduleLocalNotification(title, body, data = {}) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // Show immediately
  });
}

// Cancel all notifications
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// --- Local in-app notification storage for listing in UI ---
const LOCAL_NOTES_KEY = 'localNotifications';

export async function saveLocalNotificationEntry(entry) {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_NOTES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const newList = [entry, ...list].slice(0, 50); // keep latest 50
    await AsyncStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(newList));
    return newList;
  } catch (e) {
    console.log('saveLocalNotificationEntry error', e);
    return null;
  }
}

export async function getLocalNotifications() {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_NOTES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.log('getLocalNotifications error', e);
    return [];
  }
}

export async function clearLocalNotifications() {
  try {
    await AsyncStorage.removeItem(LOCAL_NOTES_KEY);
    return [];
  } catch (e) {
    console.log('clearLocalNotifications error', e);
    return [];
  }
}

