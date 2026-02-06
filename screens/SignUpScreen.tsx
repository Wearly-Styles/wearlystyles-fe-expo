import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import CustomInput from '../components/CustomInput';
import { useSignUp } from '../hooks/useSignUp';

export default function SignUpScreen() {
  const { form, setters, loading, handleSignUp, router } = useSignUp();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Sign Up</Text>
      </View>

      <View>
        <CustomInput
          label="Name"
          placeholder="Your name"
          value={form.name}
          onChangeText={setters.setName}
        />
        <View style={{ height: 12 }} />
        <CustomInput
          label="Email"
          placeholder="youremail@gmail.com"
          value={form.email}
          onChangeText={setters.setEmail}
        />
        <View style={{ height: 12 }} />
        <CustomInput
          label="Password"
          placeholder="**********"
          isPassword
          value={form.password}
          onChangeText={setters.setPassword}
        />
        <View style={{ height: 12 }} />
        <CustomInput
          label="Confirm Password"
          placeholder="**********"
          isPassword
          value={form.confirmPassword}
          onChangeText={setters.setConfirmPassword}
        />
      </View>

      {/* Terms & Policy */}
      <View style={styles.termsRow}>
        <View style={styles.checkbox} />
        <Text style={styles.termsText}>
          I agree to the <Text style={styles.termsLink}>terms & policy</Text>
        </Text>
      </View>

      {/* Register Button */}
      <TouchableOpacity
        style={[styles.btnSignUp, { opacity: loading ? 0.7 : 1 }]}
        onPress={handleSignUp}
        disabled={loading}
      >
        <Text style={styles.btnText}>
          {loading ? 'Signing Up...' : 'Sign Up'}
        </Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={{ color: '#6b7280' }}>Have an account? </Text>
        <TouchableOpacity onPress={() => router.replace('/')}>
          <Text style={styles.loginLink}>Log In</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = {
  container: { flex: 1, backgroundColor: '#ffffff' },
  contentContainer: { paddingHorizontal: 32, paddingBottom: 10 },
  header: { alignItems: 'center' as const, marginTop: 100, marginBottom: 24 },
  title: { fontSize: 30, fontWeight: '900' as const, color: '#FFCC00' },
  termsRow: { flexDirection: 'row' as const, alignItems: 'center' as const, marginVertical: 24 },
  checkbox: { width: 20, height: 20, borderWidth: 1, borderColor: '#9ca3af', borderRadius: 4, marginRight: 8 },
  termsText: { fontSize: 12, color: '#4b5563' },
  termsLink: { fontWeight: 'bold' as const, textDecorationLine: 'underline' as const, color: '#000000' },
  btnSignUp: { backgroundColor: '#FFCC00', height: 50, borderRadius: 25, justifyContent: 'center' as const, alignItems: 'center' as const, elevation: 3 },
  btnText: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' as const },
  footer: { flexDirection: 'row' as const, justifyContent: 'center' as const, marginTop: 32 },
  loginLink: { color: '#FFCC00', fontWeight: 'bold' as const }
};