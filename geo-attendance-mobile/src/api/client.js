import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO: change baseURL to your machine IP when testing on a real device
export const api = axios.create({
  baseURL: 'https://wvbpe-152-58-47-142.a.free.pinggy.link/api/v1',
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function setAuthToken(token) {
  if (token) {
    await AsyncStorage.setItem('authToken', token);
  } else {
    await AsyncStorage.removeItem('authToken');
  }
}


