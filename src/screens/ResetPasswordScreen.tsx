import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';

import EmailForm from '../components/ResetPasswordForm/EmailForm';
import OTPForm from '../components/ResetPasswordForm/OTPForm';
import SuccessForm from '../components/ResetPasswordForm/SuccessForm';
import NewPasswordForm from '../components/ResetPasswordForm/NewPasswordForm';

import { requestForgotPassword, verifyOtpApi, resetPasswordApi } from '../services/forgotPasswordApi';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (emailInput: string) => {
    if (!emailInput) return Alert.alert("Failed", "Please enter your email address");
    setLoading(true);
    try {
      await requestForgotPassword(emailInput);
      setEmail(emailInput);
      setStep(2);
    } catch (error: any) {
      Alert.alert("Failed", error.message || "Failed to send verification request");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (otpValue: string) => {
    if (otpValue.length < 6) {
      const msg = "Please enter the 6-digit OTP code sent to your email.";
      return Platform.OS === 'web' ? alert(msg) : Alert.alert("Failed", msg);
    }

    setLoading(true);
    try {
      // 2. Gọi API để verify mã OTP
      // Bạn cần truyền cả email và mã otp lên để server tìm đúng user
      await verifyOtpApi({ email: email, otp: otpValue });

      // 3. Nếu thành công: Lưu mã otp lại và chuyển sang bước tiếp theo
      setOtp(otpValue);
      setStep(3);
    } catch (error: any) {
      // 4. Nếu thất bại (Mã sai, hết hạn, hoặc email không tồn tại)
      const serverMsg = error.response?.data?.message || "The OTP code is incorrect or has expired.";

      if (Platform.OS === 'web') {
        alert("Verification Failed: " + serverMsg);
      } else {
        Alert.alert("Failed", serverMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (newPassword: string) => {
    if (!newPassword) return Alert.alert("Failed", "Please enter a new password");
    setLoading(true);
    try {
      await resetPasswordApi({
        email: email,
        newPassword
      });

      Alert.alert(
        "Success",
        "Your password has been updated",
        [
          {
            text: "Go to Login",
            onPress: () => router.replace('/login')
          }
        ],
        { cancelable: false }
      );
    } catch (error: any) {
      Alert.alert("Failed", error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => step > 1 ? setStep(step - 1) : router.back()}
        >
          <Ionicons name="chevron-back" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {step === 1 && <EmailForm onNext={handleRequestOtp} isLoading={loading} />}
        {step === 2 && <OTPForm email={email} onNext={handleVerifyOtp} />}
        {step === 3 && <SuccessForm onConfirm={() => setStep(4)} />}
        {step === 4 && <NewPasswordForm onComplete={handleUpdatePassword} isLoading={loading} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 10 },
  backButton: {
    width: 40,
    height: 40,
    marginTop: 50,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center'
  },
  content: { flex: 1, paddingHorizontal: 25, marginTop: 10 },
});