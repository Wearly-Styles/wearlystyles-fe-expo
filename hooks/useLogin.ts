import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { login, loginWithGoogle } from '../services/authService';

export const useLogin = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const [request, response, promptAsync] = Google.useAuthRequest({
        androidClientId: process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID,
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
        responseType: 'code',
        redirectUri: AuthSession.makeRedirectUri({
            native: 'https://auth.expo.io/@kimm000/WearlyStyles',
        }),
    });
    useEffect(() => {
        if (response?.type === 'success') {
            const authCode = response.params?.code;
            if (authCode) {
                handleGoogleLogin(authCode);
            } else {
                Alert.alert('Error', 'No auth code from Google');
            }
        }
    }, [response]);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter email and password');
            return;
        }
        try {
            setLoading(true);
            const res = await login({ email, password });
            console.log('LOGIN SUCCESS:', res);
            router.replace('/(tabs)');
        } catch (err) {
            const message = axios.isAxiosError(err)
                ? err.response?.data?.message
                : 'Unexpected error';
            Alert.alert('Error', message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async (authCode: string) => {
        try {
            setLoading(true);
            await loginWithGoogle(authCode);
            router.replace('/(tabs)');
        } catch (err) {
            Alert.alert('Error', 'Google login failed');
        } finally {
            setLoading(false);
        }
    };

    return {
        email, setEmail,
        password, setPassword,
        loading,
        request,
        promptAsync,
        handleLogin,
        router
    };
};