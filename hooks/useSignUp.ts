import axios from 'axios';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { register } from '../services/auth.service';

export const useSignUp = () => {
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Password confirmation does not match');
      return;
    }

    try {
      setLoading(true);

      await register({
        email: email.trim(),
        password: password.trim(),
        fullName: name.trim(),
      });

      Alert.alert(
        'Successful',
        'Registration successful, please log in.',
        [{ text: 'OK', onPress: () => router.replace('/') }]
      );
    } catch (err) {
      if (axios.isAxiosError(err)) {
        Alert.alert(
          'Registration failed',
          err.response?.data?.message || 'An error occurred during registration'
        );
      } else {
        Alert.alert('Error', 'Unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    form: { name, email, password, confirmPassword },
    setters: { setName, setEmail, setPassword, setConfirmPassword },
    loading,
    handleSignUp,
    router
  };
};