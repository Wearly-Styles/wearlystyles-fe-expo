import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  onNext: (email: string) => Promise<void>;
  isLoading: boolean;
}

export default function EmailForm({ onNext, isLoading }: Props) {
  const [email, setEmail] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot password</Text>
      <Text style={styles.subtitle}>Please enter your email to reset the password</Text>
      
      <Text style={styles.label}>Your Email</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Enter your email" 
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TouchableOpacity 
        style={[styles.primaryButton, isLoading && { opacity: 0.7 }]} 
        onPress={() => onNext(email)}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>{isLoading ? 'Sending...' : 'Reset Password'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: '#000' },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 30, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#000' },
  input: { height: 50, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 15, marginBottom: 20, backgroundColor: '#FAFAFA' },
  primaryButton: { height: 55, backgroundColor: '#FFE5B4', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#8B4513' }
});