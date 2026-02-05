import { useState } from "react";
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
import { theme } from "../constants/theme";
import { authApi } from "../services/outfitApi";
import { setAuthToken } from "../services/apiClient";
import { setStoredRefreshToken, setStoredToken } from "../services/authStore";
import AppHeader from "../components/AppHeader";

export default function RegisterScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await authApi.register({
        email,
        password,
        fullName: fullName.trim() || undefined,
      });
      setAuthToken(result.token);
      await setStoredToken(result.token);
      await setStoredRefreshToken(result.refreshToken);
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <AppHeader
            title="Create account"
            subtitle="Start building your wardrobe"
            onBackPress={() => router.back()}
          />
          <View style={styles.card}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Text style={styles.label}>Full name</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Optional"
              placeholderTextColor={theme.colors.textSoft}
              style={styles.input}
            />

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
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.text} />
              ) : (
                <Text style={styles.primaryText}>Create account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.linkRow}>
              <TouchableOpacity onPress={() => router.replace("/login")} disabled={loading}>
                <Text style={styles.linkText}>Back to login</Text>
              </TouchableOpacity>
            </View>
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
  card: {
    marginTop: theme.spacing.lg,
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
  linkRow: {
    marginTop: theme.spacing.lg,
    flexDirection: "row",
    justifyContent: "center",
  },
  linkText: {
    fontSize: 11,
    color: theme.colors.textSoft,
    fontWeight: "600",
  },
});
