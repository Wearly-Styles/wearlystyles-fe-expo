import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import EmailForm from "../components/ResetPasswordForm/EmailForm";
import OTPForm from "../components/ResetPasswordForm/OTPForm";
import SuccessForm from "../components/ResetPasswordForm/SuccessForm";
import NewPasswordForm from "../components/ResetPasswordForm/NewPasswordForm";

import {
  requestForgotPassword,
  verifyOtpApi,
  resetPasswordApi,
} from "../services/forgotPasswordApi";
import { showErrorToast, showInfoToast } from "../utils/toast";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (emailInput: string) => {
    if (!emailInput) {
      showErrorToast("Enter the email linked to your account.", {
        title: "Email required",
      });
      return;
    }

    setLoading(true);
    try {
      await requestForgotPassword(emailInput);
      setEmail(emailInput);
      setStep(2);
      showInfoToast("Check your inbox for the 6-digit verification code.", {
        title: "Code sent",
      });
    } catch (error: any) {
      showErrorToast(
        error?.message || "We couldn't send a verification code right now.",
        { title: "Request failed" },
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (otpValue: string) => {
    if (otpValue.length < 6) {
      showErrorToast("Enter the 6-digit code sent to your email.", {
        title: "Code required",
      });
      return;
    }

    setLoading(true);
    try {
      await verifyOtpApi({ email, otp: otpValue });
      setStep(3);
    } catch (error: any) {
      const serverMsg =
        error?.response?.data?.message ||
        "The OTP code is incorrect or has expired.";
      showErrorToast(serverMsg, { title: "Verification failed" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (newPassword: string) => {
    if (!newPassword) {
      showErrorToast("Enter a new password.", {
        title: "Password required",
      });
      return;
    }

    setLoading(true);
    try {
      await resetPasswordApi({
        email,
        newPassword,
      });

      Alert.alert(
        "Password updated",
        "Your password has been changed. You can sign in with the new one now.",
        [
          {
            text: "Go to Login",
            onPress: () => router.replace("/login"),
          },
        ],
        { cancelable: false },
      );
    } catch (error: any) {
      showErrorToast(
        error?.message || "We couldn't update your password right now.",
        { title: "Password not updated" },
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => (step > 1 ? setStep(step - 1) : router.back())}
        >
          <Ionicons name="chevron-back" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {step === 1 && <EmailForm onNext={handleRequestOtp} isLoading={loading} />}
        {step === 2 && <OTPForm email={email} onNext={handleVerifyOtp} />}
        {step === 3 && <SuccessForm onConfirm={() => setStep(4)} />}
        {step === 4 && (
          <NewPasswordForm onComplete={handleUpdatePassword} isLoading={loading} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { padding: 10 },
  backButton: {
    width: 40,
    height: 40,
    marginTop: 50,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  content: { flex: 1, paddingHorizontal: 25, marginTop: 10 },
});
