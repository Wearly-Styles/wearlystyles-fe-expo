import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export default function OTPForm({ email, onNext }: any) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.subtitle}>
        We sent a code to <Text style={{ fontWeight: 'bold' }}>{email}</Text>.
        Enter the 6-digit code mentioned in the email.
      </Text>

      <View style={styles.otpRow}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => { inputs.current[index] = ref; }}
            style={styles.otpInput}
            maxLength={1}
            keyboardType="number-pad"
            value={digit}
            onChangeText={(v) => handleOtpChange(v, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
          />
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.primaryButton,
          { opacity: otp.join('').length === 6 ? 1 : 0.6 }
        ]}
        onPress={() => otp.join('').length === 6 && onNext(otp.join(''))}
      >
        <Text style={styles.buttonText}>Verify Code</Text>
      </TouchableOpacity>

      {/* Logic Resend có thể gọi lại hàm requestForgotPassword */}
      <View style={styles.resendContainer}>
        <Text style={styles.resendLabel}>Haven't got the email yet? </Text>
        <TouchableOpacity><Text style={styles.resendText}>Resend email</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: '#000' },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 30, lineHeight: 20 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 20 },
  otpInput: { width: 55, height: 55, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, textAlign: 'center', fontSize: 20, backgroundColor: '#FAFAFA' },
  primaryButton: { height: 55, backgroundColor: '#FFE5B4', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#8B4513' },
  resendContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 25 },
  resendLabel: { color: '#888', fontSize: 14 },
  resendText: { color: '#4A90E2', fontWeight: 'bold', textDecorationLine: 'underline' }
});