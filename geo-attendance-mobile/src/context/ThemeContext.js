import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext(null);

export const Colors = {
  light: {
    background: '#f8fafc',
    surface: '#ffffff',
    card: '#ffffff',
    text: '#0f172a',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
    border: '#e2e8f0',
    primary: '#22c55e',
    primarySoft: 'rgba(34, 197, 94, 0.1)',
    accent: '#3b82f6',
    accentSoft: 'rgba(59, 130, 246, 0.1)',
    danger: '#ef4444',
    dangerSoft: 'rgba(239, 68, 68, 0.1)',
    warning: '#f59e0b',
    warningSoft: 'rgba(245, 158, 11, 0.1)',
    glass: 'rgba(255, 255, 255, 0.8)',
    pill: '#ffffff',
    pillIconActive: '#22c55e',
    pillIconInactive: '#94a3b8',
  },
  dark: {
    background: '#020617',
    surface: '#0f172a',
    card: '#0f172a',
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    border: 'rgba(51, 65, 85, 0.3)',
    primary: '#22c55e',
    primarySoft: 'rgba(34, 197, 94, 0.1)',
    accent: '#3b82f6',
    accentSoft: 'rgba(59, 130, 246, 0.1)',
    danger: '#ef4444',
    dangerSoft: 'rgba(239, 68, 68, 0.1)',
    warning: '#f59e0b',
    warningSoft: 'rgba(245, 158, 11, 0.1)',
    glass: 'rgba(15, 23, 42, 0.92)',
    pill: 'rgba(15, 23, 42, 0.92)',
    pillIconActive: '#22c55e',
    pillIconInactive: '#94a3b8',
  }
};

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState(systemColorScheme || 'dark');

  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await AsyncStorage.getItem('userTheme');
      if (savedTheme) {
        setTheme(savedTheme);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    await AsyncStorage.setItem('userTheme', newTheme);
  };

  const colors = Colors[theme];

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
