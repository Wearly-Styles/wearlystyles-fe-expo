import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Import icon
import { showErrorToast } from '../../utils/toast';

export default function NewPasswordForm({ onComplete, isLoading }: any) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleUpdate = () => {
    if (password.length < 6) {
      showErrorToast("Password must be at least 6 characters.", {
        title: "Password too short",
      });
      return;
    }

    if (password !== confirmPassword) {
      showErrorToast("Confirmation does not match the new password.", {
        title: "Passwords do not match",
      });
      return;
    }

    onComplete(password);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set a new password</Text>
      <Text style={styles.subtitle}>Create a new password. Ensure it differs from previous ones for security</Text>

      {/* Ô nhập Password */}
      <Text style={styles.label}>Password</Text>
      <View style={styles.inputContainer}>
        <TextInput 
          style={styles.input} 
          placeholder="Enter your new password" 
          secureTextEntry={!showPassword} 
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity 
          style={styles.eyeIcon} 
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#888" />
        </TouchableOpacity>
      </View>
      
      {/* Ô nhập Confirm Password */}
      <Text style={styles.label}>Confirm Password</Text>
      <View style={styles.inputContainer}>
        <TextInput 
          style={styles.input} 
          placeholder="Re-enter password" 
          secureTextEntry={!showConfirmPassword} 
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity 
          style={styles.eyeIcon} 
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
        >
          <Ionicons name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#888" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[
          styles.primaryButton, 
          (isLoading || !password || !confirmPassword) && { opacity: 0.6 }
        ]} 
        onPress={handleUpdate}
        disabled={isLoading || !password || !confirmPassword}
      >
        <Text style={styles.buttonText}>{isLoading ? 'Updating...' : 'Update Password'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: '#000' },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 30, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#000' },
  inputContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: 20,
  },
  input: { 
    height: 50, 
    borderWidth: 1, 
    borderColor: '#E0E0E0', 
    borderRadius: 10, 
    paddingHorizontal: 15, 
    paddingRight: 50,
    backgroundColor: '#FAFAFA' 
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 13,
  },
  primaryButton: { 
    height: 55, 
    backgroundColor: '#FFE5B4', 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 10 
  },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#8B4513' }
});
