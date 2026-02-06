import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthResponse, LoginPayload, RegisterPayload } from '../types/authTypes';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

if (!BASE_URL) {
  throw new Error('❌ EXPO_PUBLIC_API_URL is not defined');
}

console.log('🌍 AUTH BASE_URL =', BASE_URL);

export const authApi = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});


export const register = async (data: RegisterPayload) => {
  const res = await authApi.post<AuthResponse>('/auth/register', data);
  return res.data;
};

export const login = async (data: LoginPayload) => {
  const res = await authApi.post<AuthResponse>('/auth/login', data);

  const { token: accessToken, refreshToken, user } = res.data.data;

  await AsyncStorage.multiSet([
    ['accessToken', accessToken],
    ['refreshToken', refreshToken],
    ['user', JSON.stringify(user)],
    ['USER_ID', String(user.id)], // ✅ QUAN TRỌNG
  ]);

  return res.data;
};


export const loginWithGoogle = async (authCode: string) => {
  const res = await authApi.post('/auth/google', {
    authCode,
  });

  const { accessToken, refreshToken, user } = res.data.data;

  await AsyncStorage.setItem('accessToken', accessToken);
  await AsyncStorage.setItem('refreshToken', refreshToken);
  await AsyncStorage.setItem('user', JSON.stringify(user));

  return res.data;
};

export const logout = async () => {
  await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
  await authApi.post('/auth/logout');
};
