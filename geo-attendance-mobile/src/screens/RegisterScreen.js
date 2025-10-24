// src/screens/RegisterScreen.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert 
} from 'react-native';
import Button from '../components/common/Button';
import useAuth from '../hooks/useAuth';
import * as Device from 'expo-device';
import { getDeviceId } from '../utils/device';

const RegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { register } = useAuth();

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      const deviceID = await getDeviceId();
      console.log(`device id for registration ${deviceID}`)
      
      const result = await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        deviceID: deviceID,
      });

      if (result.success) {
        Alert.alert(
          'Success!',
          'Account created successfully. Please login.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      } else {
        handleRegistrationError(result.error);
      }

    } catch (error) {
      handleRegistrationError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrationError = (errorMessage) => {
    if (errorMessage.includes('USER_ALREADY_EXISTS')) {
      setErrors({ email: 'An account with this email already exists' });
    } else if (errorMessage.includes('DEVICE_ALREADY_REGISTERED')) {
      Alert.alert(
        'Device Already Registered',
        'This device is already registered with another account.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Registration Failed', errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>🏢 Create Account</Text>
          <Text style={styles.subtitle}>Join Geo Attendance</Text>
          
          <View style={styles.form}>
            {/* Name Input */}
            <View>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="Full Name"
                value={formData.name}
                onChangeText={(value) => handleChange('name', value)}
                autoCapitalize="words"
              />
              {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
            </View>

            {/* Email Input */}
            <View>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="Email"
                value={formData.email}
                onChangeText={(value) => handleChange('email', value)}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            {/* Password Input */}
            <View>
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                placeholder="Password"
                value={formData.password}
                onChangeText={(value) => handleChange('password', value)}
                secureTextEntry
              />
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            {/* Confirm Password Input */}
            <View>
              <TextInput
                style={[styles.input, errors.confirmPassword && styles.inputError]}
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChangeText={(value) => handleChange('confirmPassword', value)}
                secureTextEntry
              />
              {errors.confirmPassword ? (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              ) : null}
            </View>

            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
              disabled={loading}
            />
            
            <Text 
              style={styles.loginText}
              onPress={() => navigation.navigate('Login')}
            >
              Already have an account? Sign In
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#007AFF',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 32,
    color: '#6C757D',
  },
  form: {
    gap: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DEE2E6',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
  },
  inputError: {
    borderColor: '#DC3545',
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    color: '#DC3545',
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },
  loginText: {
    textAlign: 'center',
    color: '#007AFF',
    marginTop: 16,
    fontSize: 16,
  },
});

export default RegisterScreen;