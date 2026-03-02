import * as WebBrowser from 'expo-web-browser';
import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { login, loginWithGoogle } from '../services/authService';

WebBrowser.maybeCompleteAuthSession();
export const useLogin = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    

    const [request, response, promptAsync] = Google.useAuthRequest({
        clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
        responseType: "id_token",
        redirectUri: "https://auth.expo.io/@kimm000/WearlyStyles",
        extraParams: {
            prompt: 'select_account',
            nonce: 'wearlystyles_nonce',
        },
    });

    useEffect(() => {
        console.log("Response state changed:", response?.type);

        if (response?.type === 'success') {
            const { id_token } = response.params;
            console.log("ID Token nhận được:", id_token);

            if (id_token) {
                handleGoogleLogin(id_token);
            }
        } else if (response?.type === 'dismiss') {
            console.log('Trình duyệt đã đóng, kiểm tra lại biến response');
        }
    }, [response]);

    console.log("Redirect URI thực tế:", request?.redirectUri);

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

    const handleGoogleLogin = async (idToken: string) => {
        const manualToken = "eyJhbGciOiJSUzI1NiIsImtpZCI6ImM4MTZkMzM3YjgzNjVhMDZhODUxYWQ4MDAxNmMxNzEwOTk0OTI2MDkiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI5MjMyMTA2OTA4ODktbDVzZjZkanJnMjFpNG5rcm9sdXFzZGJyOGZibzc0aWkuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI5MjMyMTA2OTA4ODktbDVzZjZkanJnMjFpNG5rcm9sdXFzZGJyOGZibzc0aWkuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTQwNTExOTEyNjM1MzYxNjY2MjYiLCJlbWFpbCI6ImhvdGhpa2ltMTQxMDIwMDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5vbmNlIjoid2Vhcmx5c3R5bGVzX25vbmNlIiwibmJmIjoxNzcxMTQzNjcwLCJuYW1lIjoiVGjhu4sgS2ltIEjhu5MiLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jS0wyN0hfQ2toRmZSRWFKNEx6SkwtNXBOeWdfWlFNZmZrSXNwOVBwaFpkUkdOTWdnPXM5Ni1jIiwiZ2l2ZW5fbmFtZSI6IlRo4buLIEtpbSIsImZhbWlseV9uYW1lIjoiSOG7kyIsImlhdCI6MTc3MTE0Mzk3MCwiZXhwIjoxNzcxMTQ3NTcwLCJqdGkiOiI0ZjI2NjdmZTU2Yjg1ODVlN2I1OGUwZWVmMmNiZTI4YTBmZTk3YzVmIn0.q0tEuQY1-3GXflSR0INav7ogiqdyugTRoLRiQztrRap2d5T8OAZ5RcxtEoIKjUOqyGEFbYTPw7TDKjbuqavClHJ5mVA3TDaYaW0jOp3beE70ZxyJbd93iepGBasvJndTI39pKKFhI9VlavSzGJNw9huanw1kohIukFjmO1ArCNuuJM49Zk99J4WQlLR1Ioi8aR-BAW3Qu4M9mKSaPYh0i81NydeNA-e-Glzk1YKkn7bVRJSEt4QhgzMzfsvpKWHF8TC5fFDQ_0EhCttmxNyRgXmHREk_LUxrc5oiyVe4zfpGlA7DrXzx-vknRLCU81GpU2RuSnTYPmVj-MbYUSnIEQ";
        try {
            setLoading(true);


            await loginWithGoogle({ idToken: manualToken });


            router.replace('/(tabs)');
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Google login failed on backend');
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
        handleGoogleLogin,
        router
    };
};