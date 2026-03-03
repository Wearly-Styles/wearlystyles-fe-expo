import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import AppHeader from "../components/AppHeader";
import { theme } from "../constants/theme";
import { outfitPlanApi } from "../services/outfitApi";
import { getAuthToken } from "../services/apiClient";
import type { OutfitPlan } from "../services/types";
import type { Outfit } from "../constants/mockOutfits";
import { setOutfitCache } from "../utils/outfitStore";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = DAY_LABELS[date.getDay()];
  return `${day}, ${date.toLocaleDateString()}`;
};

export default function OutfitPlansScreen() {
  const router = useRouter();
  const [plans, setPlans] = useState<OutfitPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const buildDateRange = () => {
    const from = new Date();
    const to = new Date(from);
    to.setDate(from.getDate() + 14);
    return { from: from.toISOString(), to: to.toISOString() };
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const loadPlans = async () => {
        if (!getAuthToken()) {
          if (isActive) {
            setRequiresAuth(true);
            setPlans([]);
          }
          return;
        }
        setLoading(true);
        setError(null);
        try {
          const range = buildDateRange();
          const data = await outfitPlanApi.listPlans(range.from, range.to);
          if (!isActive) return;
          const nextPlans = data || [];
          setPlans(nextPlans);
          setRequiresAuth(false);
          const outfitsToCache: Outfit[] = nextPlans.map((plan) => ({
            id: String(plan.outfitId),
            title: plan.outfit?.name || `Outfit #${plan.outfitId}`,
            subtitle: plan.outfit?.occasion || "Planned look",
            image: FALLBACK_IMAGE,
            tags: [plan.outfit?.occasion || "Planned"],
            items: [],
            weather: plan.outfit?.weather || "Weather unavailable",
            mood: plan.planType || "Planned",
          }));
          setOutfitCache(outfitsToCache);
        } catch (err) {
          if (isActive) {
            setError(err instanceof Error ? err.message : "Failed to load plans");
          }
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      };
      loadPlans();
      return () => {
        isActive = false;
      };
    }, []),
  );

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await outfitPlanApi.deletePlan(id);
      setPlans((prev) => prev.filter((plan) => plan.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete plan");
    } finally {
      setDeletingId(null);
    }
  };

  const handleConfirmDelete = (id: number) => {
    Alert.alert(
      "Remove from schedule",
      "Remove this outfit from your schedule?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => void handleDelete(id),
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <AppHeader
            title="Outfit Schedule"
            subtitle="Manage your planned looks"
            onBackPress={() => router.back()}
          />

          {requiresAuth ? (
            <View style={styles.card}>
              <Text style={styles.cardText}>Sign in to view your schedule.</Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.replace("/login")}
              >
                <Text style={styles.primaryText}>Go to login</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={theme.colors.primaryDark} />
              <Text style={styles.loadingText}>Loading plans...</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          {!loading && !error && !requiresAuth && plans.length === 0 ? (
            <Text style={styles.emptyText}>No planned outfits yet.</Text>
          ) : null}

          {plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={styles.planCard}
              activeOpacity={0.85}
              onPress={() => router.push(`/outfit/${plan.outfitId}`)}
            >
              <View style={styles.planHeader}>
                <View style={styles.datePill}>
                  <Text style={styles.dateText}>{formatDate(plan.planDate)}</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.deleteButton,
                    deletingId === plan.id && styles.buttonDisabled,
                  ]}
                  onPress={() => handleConfirmDelete(plan.id)}
                  disabled={deletingId === plan.id}
                >
                  {deletingId === plan.id ? (
                    <ActivityIndicator color={theme.colors.text} />
                  ) : (
                    <Text style={styles.deleteText}>Remove</Text>
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.planTitle}>
                {plan.outfit?.name || `Outfit #${plan.outfitId}`}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  {plan.outfit?.occasion || plan.planType || "Planned look"}
                </Text>
                {plan.reminderSent ? (
                  <View style={styles.metaBadge}>
                    <Text style={styles.metaBadgeText}>Reminder sent</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
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
    paddingBottom: 120,
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
  emptyText: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    fontSize: 12,
    color: theme.colors.textSoft,
  },
  card: {
    marginTop: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  cardText: {
    fontSize: 12,
    color: theme.colors.textSoft,
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
  planCard: {
    marginTop: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  datePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.chip,
  },
  dateText: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.textSoft,
  },
  planTitle: {
    marginTop: theme.spacing.sm,
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
  },
  metaRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  metaText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  metaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.card,
  },
  metaBadgeText: {
    fontSize: 10,
    color: theme.colors.textSoft,
    fontWeight: "600",
  },
  deleteButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
  },
  deleteText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.text,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
