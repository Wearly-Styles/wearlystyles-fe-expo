import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { theme } from "../constants/theme";
import { authApi } from "../services/outfitApi";
import { setAuthToken } from "../services/apiClient";
import { setStoredRefreshToken, setStoredToken } from "../services/authStore";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expoClientId = process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const redirectUri = "https://auth.expo.io/@vinh33333/WearlyStyles";
  const googleConfig = useMemo(
    () => ({
      expoClientId,
      iosClientId,
      androidClientId: androidClientId || expoClientId || webClientId,
      webClientId,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      scopes: ["openid", "profile", "email"],
      usePKCE: true,
      extraParams: {
        prompt: "select_account",
      },
    }),
    [androidClientId, expoClientId, iosClientId, redirectUri, webClientId]
  );
  const [request, response, promptAsync] = Google.useAuthRequest(googleConfig);

  useEffect(() => {
    if (response?.type !== "success") return;
    const code = response.params?.code;
    if (!code) {
      setError("Google sign-in failed: missing code.");
      return;
    }
    const finish = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await authApi.loginWithGoogleCode({
          code,
          redirectUri,
        });
        setAuthToken(result.token);
        await setStoredToken(result.token);
        await setStoredRefreshToken(result.refreshToken);
        router.replace("/(tabs)");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Google login failed");
      } finally {
        setLoading(false);
      }
    };
    finish();
  }, [response, redirectUri, router]);

  useEffect(() => {
    if (!response) return;
    if (response.type !== "success") {
      setError(`Google auth ${response.type}`);
    }
  }, [response]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await authApi.login({ email, password });
      setAuthToken(result.token);
      await setStoredToken(result.token);
      await setStoredRefreshToken(result.refreshToken);
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!request) return;
    if (!expoClientId && !iosClientId && !androidClientId && !webClientId) {
      setError("Missing Google OAuth client IDs in .env.");
      return;
    }
    setError(null);
    await promptAsync();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Wearly Styles</Text>
            <Text style={styles.heroSubtitle}>
              Style suggestions that fit your day.
            </Text>
          </View>

          <View style={styles.card}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@email.com"
              placeholderTextColor={theme.colors.textSoft}
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={theme.colors.textSoft}
              style={styles.input}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.text} />
              ) : (
                <Text style={styles.primaryText}>Sign in</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.divider} />
            </View>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              disabled={loading || !request}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.text} />
              ) : (
                <Text style={styles.googleText}>Continue with Google</Text>
              )}
            </TouchableOpacity>

            <View style={styles.linkRow}>
              <TouchableOpacity>
                <Text style={styles.linkText}>Forgot password?</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.replace("/(tabs)")} disabled={loading}>
                <Text style={styles.linkText}>Skip for now</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>New here?</Text>
            <TouchableOpacity onPress={() => router.push("/register")} disabled={loading}>
              <Text style={styles.footerLink}>Create account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  hero: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.text,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  errorText: {
    marginBottom: theme.spacing.sm,
    fontSize: 12,
    color: "#C44536",
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textSoft,
  },
  input: {
    marginTop: 6,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.colors.text,
    backgroundColor: "#FFF9F0",
  },
  primaryButton: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: theme.radius.pill,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginVertical: theme.spacing.lg,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    fontSize: 11,
    color: theme.colors.textSoft,
  },
  googleButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 11,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  googleText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
  },
  linkRow: {
    marginTop: theme.spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  linkText: {
    fontSize: 11,
    color: theme.colors.textSoft,
    fontWeight: "600",
  },
  footer: {
    marginTop: theme.spacing.xl,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  footerLink: {
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: "700",
  },
});
