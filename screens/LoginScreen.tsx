import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import CustomInput from '../components/CustomInput';
import { useLogin } from '../hooks/useLogin';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const {
    email, setEmail,
    password, setPassword,
    loading,
    request,
    promptAsync,
    handleLogin,
    handleGoogleLogin,
    router
  } = useLogin();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Log In</Text>
      </View>

      <View>
        <CustomInput
          label="Email"
          placeholder="bang@gmail.com"
          value={email}
          onChangeText={setEmail}
        />
        <View style={{ height: 16 }} />
        <CustomInput
          label="Password"
          placeholder="**********"
          isPassword
          value={password}
          onChangeText={setPassword}
        />
      </View>

      {/* Điều khoản */}
      <View style={styles.termsContainer}>
        <View style={styles.checkbox} />
        <Text style={styles.termsText}>
          I agree to the <Text style={styles.termsBold}>terms & policy</Text>
        </Text>
      </View>

      {/* Button Sign In */}
      <TouchableOpacity
        style={[styles.btnSignIn, { opacity: loading ? 0.7 : 1 }]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.btnText}>
          {loading ? 'Signing In...' : 'Sign In'}
        </Text>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.orText}>Or continue with</Text>
        <View style={styles.line} />
      </View>

      {/* Google Login */}
      <TouchableOpacity
        style={styles.btnGoogle}
        onPress={async () => {
          console.log("🚀 ĐANG ÉP GỌI BACKEND VỚI TOKEN THỦ CÔNG...");

          handleGoogleLogin("manual-test-token");

          await promptAsync({ showInRecents: true });
        }}
      >
        <AntDesign name="google" size={20} color="#DB4437" style={{ marginRight: 10 }} />
        <Text style={styles.btnGoogleText}>Google</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={{ color: '#4b5563' }}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/register')}>
          <Text style={styles.signUpText}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Nên tách Styles ra dưới cùng cho gọn
const styles = {
  container: { flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 32, justifyContent: 'center' as const },
  header: { alignItems: 'center' as const, marginBottom: 24 },
  title: { fontSize: 30, fontWeight: '900' as const, color: '#FFCC00' },
  termsContainer: { flexDirection: 'row' as const, alignItems: 'center' as const, marginTop: 16, marginBottom: 30 },
  checkbox: { width: 20, height: 20, borderWidth: 1, borderColor: '#9ca3af', borderRadius: 4, marginRight: 8 },
  termsText: { fontSize: 12, color: '#4b5563' },
  termsBold: { fontWeight: 'bold' as const, textDecorationLine: 'underline' as const, color: '#000000' },
  btnSignIn: { backgroundColor: '#FFCC00', height: 50, borderRadius: 25, justifyContent: 'center' as const, alignItems: 'center' as const, elevation: 3 },
  btnText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' as const },
  divider: { flexDirection: 'row' as const, alignItems: 'center' as const, marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  orText: { marginHorizontal: 10, color: '#9ca3af', fontSize: 12 },
  btnGoogle: { flexDirection: 'row' as const, backgroundColor: '#ffffff', height: 50, borderRadius: 25, justifyContent: 'center' as const, alignItems: 'center' as const, borderWidth: 1, borderColor: '#e5e7eb', elevation: 1 },
  btnGoogleText: { color: '#4b5563', fontSize: 16, fontWeight: '600' as const },
  footer: { flexDirection: 'row' as const, justifyContent: 'center' as const, marginTop: 24 },
  signUpText: { color: '#FFCC00', fontWeight: 'bold' as const }
};