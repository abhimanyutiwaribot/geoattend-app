import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setAuthToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('authToken');
        const storedUser = await AsyncStorage.getItem('authUser');

        if (storedToken) {
          setToken(storedToken);
          await setAuthToken(storedToken);
        }

        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } finally {
        setLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

  const login = async ({ email, password, deviceID }) => {
    try {
      const res = await api.post('/user/auth/login', { email, password, deviceID });

      // Safety check for response structure
      if (!res.data || !res.data.data) {
        console.error('Invalid API response structure:', res.data);
        throw new Error('Server returned an unexpected response format');
      }

      const { token: jwt, user: userData } = res.data.data;

      if (!jwt) {
        throw new Error('No authentication token received from server');
      }

      setUser(userData);
      setToken(jwt);

      await setAuthToken(jwt);
      await AsyncStorage.setItem('authUser', JSON.stringify(userData));

      return userData;
    } catch (error) {
      console.error('Login error detail:', error);
      throw error;
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await setAuthToken(null);
    await AsyncStorage.removeItem('authUser');
  };

  const value = {
    user,
    token,
    loading,
    isLoggedIn: !!token,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}


