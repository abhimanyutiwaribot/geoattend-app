// src/screens/LoginScreen.js - Simplified and working
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import Button from '../components/common/Button';
import useAuth from '../hooks/useAuth';
import * as Device from 'expo-device';
import { getDeviceId } from '../utils/device';

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { login } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const deviceID = await getDeviceId();
            console.log('Using device id : ', deviceID)
            const result = await login(email, password, deviceID);

            if (result.success) {
                // Navigation handled by App.js auth flow
                console.log('✅ Login successful, checking auth state...');

                // Wait a moment for the auth state to update
                // if (navigation.replace) {
                //     navigation.replace('Dashboard');
                // } else if (navigation.navigate) {
                //     navigation.navigate('Dashboard');
                // } else {
                //     // Fallback - this should work
                //     navigation.dispatch(
                //         CommonActions.reset({
                //             index: 0,
                //             routes: [{ name: 'Dashboard' }],
                //         })
                //     );
                // }

                navigation.navigate('Dashboard')

            } else {
                setError(result.error);
            }
        } catch (error) {
            setError('Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.content}>
                    <Text style={styles.title}>🏢 Geo Attendance</Text>
                    <Text style={styles.subtitle}>Sign in to your account</Text>

                    {error ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <View style={styles.form}>
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />

                        <Button
                            title="Sign In"
                            onPress={handleLogin}
                            loading={loading}
                            disabled={loading}
                        />

                        <Text
                            style={styles.registerText}
                            onPress={() => navigation.navigate('Register')}
                        >
                            Don't have an account? Register
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
        gap: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: '#DEE2E6',
        borderRadius: 8,
        padding: 16,
        fontSize: 16,
        backgroundColor: '#F8F9FA',
    },
    errorContainer: {
        backgroundColor: '#F8D7DA',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    errorText: {
        color: '#721C24',
        textAlign: 'center',
    },
    registerText: {
        textAlign: 'center',
        color: '#007AFF',
        marginTop: 16,
    },
});

export default LoginScreen;