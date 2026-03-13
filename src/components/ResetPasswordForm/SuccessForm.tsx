import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function SuccessForm({ onConfirm }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Password reset</Text>
      <Text style={styles.subtitle}>Your password has been successfully reset, click confirm to set a new password</Text>
      
      <TouchableOpacity style={styles.primaryButton} onPress={onConfirm}>
        <Text style={styles.buttonText}>Confirm</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: '#000' },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 30, lineHeight: 20 },
  primaryButton: { height: 55, backgroundColor: '#FFD700', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#000' }
});