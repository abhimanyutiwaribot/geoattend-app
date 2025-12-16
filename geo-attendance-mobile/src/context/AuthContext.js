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
    const res = await api.post('/user/auth/login', { email, password, deviceID });
    const { token: jwt, user: userData } = res.data.data;

    setUser(userData);
    setToken(jwt);

    await setAuthToken(jwt);
    await AsyncStorage.setItem('authUser', JSON.stringify(userData));

    return userData;
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


