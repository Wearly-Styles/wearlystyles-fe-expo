import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import AppHeader from "../components/AppHeader";
import { theme } from "../constants/theme";
import { usePersonalScheduleEntries } from "../hooks/usePersonalScheduleEntries";
import { outfitPlanApi } from "../services/outfitApi";
import { getAuthToken } from "../services/apiClient";
import type { OutfitPlan } from "../services/types";
import type { Outfit, OutfitItem } from "../constants/mockOutfits";
import { setOutfitCache } from "../utils/outfitStore";
import {
  addScheduleDays,
  atScheduleNoon,
  endOfScheduleDay,
  formatScheduleDateKey,
  startOfScheduleDay,
} from "../utils/scheduleDate";
import {
  buildPersonalScheduleAgenda,
  formatPersonalScheduleTime,
} from "../utils/personalSchedule";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const normalizeText = (value?: string | null) =>
  (value || "").replace(/_/g, " ").replace(/\s+/g, " ").trim();

const toTitleCase = (value: string) =>
  value.replace(/\w\S*/g, (chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1));

const dedupeWords = (value: string) => {
  const words = value.split(" ").filter(Boolean);
  return words.filter((word, index) => {
    const previous = words[index - 1];
    return !previous || previous.toLowerCase() !== word.toLowerCase();
  });
};

const isMeaningfulText = (value?: string | null) => {
  const normalized = normalizeText(value).toLowerCase();
  return Boolean(
    normalized &&
      normalized !== "general" &&
      normalized !== "planned look" &&
      normalized !== "weather unavailable",
  );
};

const formatDate = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value instanceof Date ? value.toDateString() : value;
  }
  const day = DAY_LABELS[date.getDay()];
  return `${day}, ${date.toLocaleDateString()}`;
};

const toPlannedOutfit = (plan: OutfitPlan): Outfit => {
  const items: OutfitItem[] =
    plan.outfit?.items?.map((entry, index) => {
      const clothingItem = entry.clothingItem;
      const categoryName = clothingItem?.category?.name || "Item";
      return {
        id: String(clothingItem?.id ?? entry.clothingItemId ?? entry.id ?? index),
        title: categoryName,
        subtitle: clothingItem?.name || "Wardrobe item",
        image: clothingItem?.image || FALLBACK_IMAGE,
      };
    }) || [];

  return {
    id: String(plan.outfitId),
    title: plan.outfit?.name || `Outfit #${plan.outfitId}`,
    subtitle: plan.outfit?.occasion || "Planned look",
    image: items[0]?.image || FALLBACK_IMAGE,
    tags: [plan.outfit?.occasion || "Planned"],
    items,
    weather: plan.outfit?.weather || "Weather unavailable",
    mood: plan.planType || "Planned",
  };
};

const getPlannedOutfitTitle = (plan: OutfitPlan, outfit: Outfit) => {
  const rawTitle = normalizeText(plan.outfit?.name || outfit.title || `Outfit #${plan.outfitId}`);
  const cleaned = dedupeWords(rawTitle).join(" ");
  return toTitleCase(cleaned || `Outfit #${plan.outfitId}`);
};

const getPlanDescription = (plan: OutfitPlan) => {
  const candidates = [plan.outfit?.occasion, plan.outfit?.weather, plan.planType];
  const match = candidates.find((value) => isMeaningfulText(value));
  return match ? normalizeText(match) : "Planned look";
};

const getPlannedOutfitPieces = (outfit: Outfit) =>
  outfit.items
    .map((item) => normalizeText(item.subtitle || item.title))
    .filter(Boolean)
    .slice(0, 4);

export default function OutfitPlansScreen() {
  const router = useRouter();
  const [plans, setPlans] = useState<OutfitPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { entries: personalScheduleEntries } = usePersonalScheduleEntries();

  const buildDateRange = () => {
    const from = startOfScheduleDay(new Date());
    const to = endOfScheduleDay(addScheduleDays(from, 13));
    return { from: from.toISOString(), to: to.toISOString() };
  };
  const upcomingDates = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) =>
        atScheduleNoon(addScheduleDays(new Date(), index)),
      ),
    [],
  );
  const personalScheduleByDate = useMemo(
    () => buildPersonalScheduleAgenda(personalScheduleEntries, upcomingDates),
    [personalScheduleEntries, upcomingDates],
  );
  const upcomingPersonalSchedule = useMemo(
    () =>
      upcomingDates
        .map((date) => {
          const key = formatScheduleDateKey(date);
          return {
            key,
            label: formatDate(date),
            entries: personalScheduleByDate[key] || [],
          };
        })
        .filter((item) => item.entries.length),
    [personalScheduleByDate, upcomingDates],
  );

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
          const outfitsToCache: Outfit[] = nextPlans.map(toPlannedOutfit);
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
            (() => {
              const plannedOutfit = toPlannedOutfit(plan);
              const planTitle = getPlannedOutfitTitle(plan, plannedOutfit);
              const planDescription = getPlanDescription(plan);
              const planPieces = getPlannedOutfitPieces(plannedOutfit);

              return (
                <TouchableOpacity
                  key={plan.id}
                  style={styles.planCard}
                  activeOpacity={0.88}
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

                  <View style={styles.planBody}>
                    <View style={styles.planImageWrap}>
                      <Image source={{ uri: plannedOutfit.image }} style={styles.planImage} />
                    </View>

                    <View style={styles.planContent}>
                      <Text style={styles.planTitle} numberOfLines={2}>
                        {planTitle}
                      </Text>
                      <Text style={styles.planDescription} numberOfLines={2}>
                        {planDescription}
                      </Text>

                      {planPieces.length ? (
                        <View style={styles.planPieceRow}>
                          {planPieces.map((piece, index) => (
                            <View key={`${plan.id}-${piece}-${index}`} style={styles.planPieceChip}>
                              <Text style={styles.planPieceText} numberOfLines={1}>
                                {piece}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}

                      <View style={styles.planMetaRow}>
                        <View style={styles.metaBadge}>
                          <Text style={styles.metaBadgeText}>
                            {plannedOutfit.items.length} piece
                            {plannedOutfit.items.length === 1 ? "" : "s"}
                          </Text>
                        </View>
                        {plan.reminderSent ? (
                          <View style={styles.metaBadge}>
                            <Text style={styles.metaBadgeText}>Reminder sent</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })()
          ))}

          {!requiresAuth ? (
            <View style={styles.routineSection}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Recurring personal routines</Text>
                  <Text style={styles.sectionSubtitle}>
                    Same source as Personal Schedule, Home, and AI suggestions.
                  </Text>
                </View>
                <TouchableOpacity onPress={() => router.push("/personal-schedule")}>
                  <Text style={styles.sectionLink}>Manage</Text>
                </TouchableOpacity>
              </View>

              {upcomingPersonalSchedule.length ? (
                upcomingPersonalSchedule.map((day) => (
                  <View key={day.key} style={styles.routineDayCard}>
                    <View style={styles.datePill}>
                      <Text style={styles.dateText}>{day.label}</Text>
                    </View>
                    <View style={styles.routineList}>
                      {day.entries.map((entry) => (
                        <View key={`${day.key}-${entry.id}`} style={styles.routineItem}>
                          <View style={styles.routineCopy}>
                            <Text style={styles.routineTitle}>{entry.title}</Text>
                            <Text style={styles.routineMeta}>
                              {entry.eventType} | {entry.preferredStyle} | {formatPersonalScheduleTime(entry)}
                            </Text>
                            {entry.location ? (
                              <Text style={styles.routineLocation}>{entry.location}</Text>
                            ) : null}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No recurring routines in the next 14 days.</Text>
              )}
            </View>
          ) : null}
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
  sectionHeader: {
    marginTop: theme.spacing.xl,
    marginHorizontal: theme.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.textSoft,
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primaryDark,
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
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planBody: {
    marginTop: theme.spacing.md,
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  planImageWrap: {
    width: 110,
    height: 124,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
    overflow: "hidden",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  planImage: {
    width: "100%",
    height: "100%",
  },
  planContent: {
    flex: 1,
    minWidth: 0,
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
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  planDescription: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textMuted,
  },
  planPieceRow: {
    marginTop: theme.spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  planPieceChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.card,
    maxWidth: "100%",
  },
  planPieceText: {
    fontSize: 10,
    fontWeight: "600",
    color: theme.colors.textSoft,
  },
  planMetaRow: {
    marginTop: theme.spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
  routineSection: {
    paddingBottom: theme.spacing.lg,
  },
  routineDayCard: {
    marginTop: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  routineList: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  routineItem: {
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
  },
  routineCopy: {
    gap: 4,
  },
  routineTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
  },
  routineMeta: {
    fontSize: 11,
    color: theme.colors.textSoft,
  },
  routineLocation: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
});
