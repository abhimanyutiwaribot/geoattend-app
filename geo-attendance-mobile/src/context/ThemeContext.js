import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext(null);

export const Colors = {
  light: {
    background: '#fafafa',
    surface: '#ffffff',
    card: '#ffffff',
    text: '#171717',
    textSecondary: '#666666',
    textMuted: '#888888',
    border: '#eaeaea',
    primary: '#000000',
    primarySoft: 'rgba(0, 0, 0, 0.05)',
    accent: '#0070f3',
    accentSoft: 'rgba(0, 112, 243, 0.1)',
    danger: '#e00000',
    dangerSoft: 'rgba(224, 0, 0, 0.1)',
    warning: '#f5a623',
    warningSoft: 'rgba(245, 166, 35, 0.1)',
    glass: 'rgba(255, 255, 255, 0.8)',
    pill: '#ffffff',
    pillIconActive: '#000000',
    pillIconInactive: '#666666',
  },
  dark: {
    background: '#000000',
    surface: '#0a0a0a',
    card: '#0a0a0a',
    text: '#ededed',
    textSecondary: '#888888',
    textMuted: '#666666',
    border: '#333333',
    primary: '#ffffff',
    primarySoft: 'rgba(255, 255, 255, 0.1)',
    accent: '#3291ff',
    accentSoft: 'rgba(50, 145, 255, 0.1)',
    danger: '#ff1a1a',
    dangerSoft: 'rgba(255, 26, 26, 0.1)',
    warning: '#f5a623',
    warningSoft: 'rgba(245, 166, 35, 0.1)',
    glass: 'rgba(0, 0, 0, 0.8)',
    pill: '#111111',
    pillIconActive: '#ffffff',
    pillIconInactive: '#888888',
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
