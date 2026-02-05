//D:\wearlystyles-fe-expo\WearlyStyles\app\screens\ProfileScreen.tsx
import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import { theme } from "../constants/theme";
import { authApi, userApi } from "../services/outfitApi";
import { getAuthToken, setAuthToken } from "../services/apiClient";
import { setStoredRefreshToken, setStoredToken } from "../services/authStore";
import type { User } from "../services/types";

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [requiresAuth, setRequiresAuth] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadUser = async () => {
      setLoading(true);
      setError(null);
      if (!getAuthToken()) {
        setRequiresAuth(true);
        setLoading(false);
        return;
      }
      try {
        const users = await userApi.listUsers(1, 1);
        if (isActive && users?.length) {
          setUser(users[0]);
          setRequiresAuth(false);
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadUser();
    return () => {
      isActive = false;
    };
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authApi.logout();
    } catch {
      // ignore logout errors
    } finally {
      setAuthToken(null);
      await setStoredToken(null);
      await setStoredRefreshToken(null);
      setLoggingOut(false);
      router.replace("/login");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <AppHeader
            title="Profile"
            subtitle="Style stats and preferences"
            onBackPress={() => router.back()}
          />
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={theme.colors.primaryDark} />
              <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
          {requiresAuth ? (
            <View style={styles.card}>
              <Text style={styles.cardText}>
                Sign in to view your profile details.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.replace("/login")}
              >
                <Text style={styles.primaryText}>Go to login</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Style profile</Text>
            <Text style={styles.cardText}>
              Casual • Neutral palette • Minimal accessories
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Outfit history</Text>
            <Text style={styles.cardText}>
              18 outfits saved • 6 worn this month
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push("/plans")}
            >
              <Text style={styles.primaryText}>View schedule</Text>
            </TouchableOpacity>
          </View>
          {user ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Account</Text>
              <Text style={styles.cardText}>
                {user.firstName || "User"} {user.lastName || ""}
              </Text>
              <Text style={styles.cardText}>{user.email || "No email"}</Text>
            </View>
          ) : null}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Account actions</Text>
            <TouchableOpacity
              style={[styles.primaryButton, loggingOut && styles.buttonDisabled]}
              onPress={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <ActivityIndicator color={theme.colors.text} />
              ) : (
                <Text style={styles.primaryText}>Sign out</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
        <BottomNav active="profile" />
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
    paddingBottom: 140,
  },
  card: {
    marginTop: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
  },
  loadingText: {
    fontSize: 12,
    color: theme.colors.textSoft,
  },
  errorText: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    fontSize: 12,
    color: "#C44536",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
  },
  cardText: {
    marginTop: 6,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  primaryButton: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    alignItems: "center",
  },
  primaryText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
