import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AppHeader from "../components/AppHeader";
import FilterPills from "../components/FilterPills";
import OutfitCard from "../components/OutfitCard";
import BottomNav from "../components/BottomNav";
import { theme } from "../constants/theme";
import { getAuthToken, isApiError } from "../services/apiClient";
import { contextApi, recommendationApi, outfitApi } from "../services/outfitApi";
import { mapRecommendationsToOutfits } from "../utils/outfitMapper";
import { setOutfitCache } from "../utils/outfitStore";
import type { Outfit } from "../constants/mockOutfits";

const EVENT_TYPES = ["Work", "Study", "Event", "Casual", "Party"];
const STYLE_TYPES = ["Casual", "Minimal", "Formal", "Sporty", "Chic"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const buildDateOptions = (count = 7) => {
  const today = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return {
      key: date.toISOString().slice(0, 10),
      label: DAY_LABELS[date.getDay()],
      day: date.getDate(),
      datetime: date.toISOString(),
    };
  });
};

export default function OutfitSelectionScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventIndex, setEventIndex] = useState(0);
  const [styleIndex, setStyleIndex] = useState(0);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [closetCount, setClosetCount] = useState(0);
  const [weatherLoaded, setWeatherLoaded] = useState(false);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [requiresCloset, setRequiresCloset] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [approveToast, setApproveToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const dateOptions = useMemo(() => buildDateOptions(7), []);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);

  const selectedEvent = EVENT_TYPES[eventIndex];
  const selectedStyle = STYLE_TYPES[styleIndex];
  const selectedDate = dateOptions[selectedDateIndex];

  const canGenerate = useMemo(
    () => !!selectedEvent && !!selectedStyle,
    [selectedEvent, selectedStyle]
  );

  useEffect(() => {
    let isActive = true;
    const preload = async () => {
      const token = getAuthToken();
      if (!token) {
        setRequiresAuth(true);
        setClosetCount(0);
        return;
      }
      try {
        const closet = await contextApi.getCloset();
        if (!isActive) return;
        setRequiresCloset(closet.length === 0);
        setRequiresAuth(false);
        setClosetCount(closet.length);
      } catch {
        if (isActive) {
          setClosetCount(0);
        }
      }
    };
    preload();
    return () => {
      isActive = false;
    };
  }, []);

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    const token = getAuthToken();
    if (!token) {
      setRequiresAuth(true);
      setError("Please sign in to generate outfit suggestions.");
      setLoading(false);
      return;
    }
    try {
      const selectedDate = dateOptions[selectedDateIndex];
      const weather = await contextApi.getWeather({
        lat: 10.8231,
        lon: 106.6297,
        datetime: selectedDate?.datetime,
      });
      const closet = await contextApi.getCloset();
      if (!closet.length) {
        setRequiresCloset(true);
        setError("Add items to your closet before generating outfits.");
        setLoading(false);
        return;
      }
      const result = await recommendationApi.recommendBySelection({
        selectedEventType: selectedEvent,
        selectedStyle,
        closet: closet.length ? closet : undefined,
        weather,
      });
      const mapped = mapRecommendationsToOutfits(result, closet, weather);
      setOutfits(mapped);
      setOutfitCache(mapped);
      setWeatherLoaded(true);
      setRequiresAuth(false);
      setRequiresCloset(false);
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        setRequiresAuth(true);
        setError("Please sign in to generate outfit suggestions.");
      } else if (isApiError(err) && err.status === 400 && err.message.includes("Closet")) {
        setRequiresCloset(true);
        setError("Add items to your closet before generating outfits.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to generate outfit");
      }
      setOutfits([]);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: "success" | "error", message: string) => {
    setApproveToast({ type, message });
    setTimeout(() => {
      setApproveToast(null);
    }, 2500);
  };

  const handleApprove = async (outfit: Outfit) => {
    if (!getAuthToken()) {
      setRequiresAuth(true);
      showToast("error", "Please sign in to approve outfits.");
      return;
    }
    const items = (outfit.items || [])
      .map((item) => Number(String(item.id).split("-")[0]))
      .filter((id) => Number.isFinite(id));
    if (!items.length) {
      showToast("error", "No closet items to save this outfit.");
      return;
    }

    setApproveLoading(true);
    try {
      const saved = await outfitApi.createOutfit({
        name: outfit.title,
        occasion: outfit.subtitle || undefined,
        weather: outfit.weather || undefined,
        items,
      });
      if (!saved?.id) {
        showToast("error", "Save failed: missing outfit id.");
        return;
      }
      setApprovedIds((prev) => {
        const next = new Set(prev);
        next.add(String(outfit.id));
        return next;
      });
      showToast("success", `Outfit saved (id=${saved.id}).`);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to save outfit.");
    } finally {
      setApproveLoading(false);
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
            title="Create Outfit"
            subtitle="Choose event & style to generate"
            onBackPress={() => router.back()}
          />

          <View style={styles.sectionCard}>
            <View style={styles.stepHeader}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>1</Text>
              </View>
              <View>
                <Text style={styles.sectionTitle}>Event type</Text>
                <Text style={styles.sectionHint}>Where are you going?</Text>
              </View>
            </View>
            <FilterPills
              filters={EVENT_TYPES}
              activeIndex={eventIndex}
              onPress={setEventIndex}
              scrollable
            />

            <View style={styles.sectionDivider} />

            <View style={styles.stepHeader}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>2</Text>
              </View>
              <View>
                <Text style={styles.sectionTitle}>Style</Text>
                <Text style={styles.sectionHint}>Pick the vibe</Text>
              </View>
            </View>
            <FilterPills
              filters={STYLE_TYPES}
              activeIndex={styleIndex}
              onPress={setStyleIndex}
              scrollable
            />

            <View style={styles.sectionDivider} />

            <View style={styles.stepHeader}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>3</Text>
              </View>
              <View>
                <Text style={styles.sectionTitle}>Pick a day</Text>
                <Text style={styles.sectionHint}>Weather matched</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateRow}
            >
              {dateOptions.map((option, index) => {
                const active = index === selectedDateIndex;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.dateChip,
                      active && styles.dateChipActive,
                    ]}
                    onPress={() => setSelectedDateIndex(index)}
                  >
                    <Text style={[styles.dateLabel, active && styles.dateLabelActive]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.dateNumber, active && styles.dateLabelActive]}>
                      {option.day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.infoRow}>
              <View style={styles.infoPill}>
                <Text style={styles.infoText}>Closet items</Text>
                <Text style={styles.infoValue}>{closetCount}</Text>
              </View>
              <View style={styles.infoPill}>
                <Text style={styles.infoText}>Weather</Text>
                <Text style={styles.infoValue}>{weatherLoaded ? "Loaded" : "Auto"}</Text>
              </View>
            </View>
          </View>

          {outfits.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitleAlt}>
                Outfit for {selectedDate?.label} {selectedDate?.day}
              </Text>
              <OutfitCard
                outfit={outfits[0]}
                onPress={() => router.push(`/outfit/${outfits[0].id}`)}
              />
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryButton, !canGenerate && styles.buttonDisabled]}
            onPress={handleGenerate}
            disabled={!canGenerate || loading}
          >
            {loading ? (
              <View style={styles.primaryButtonLoading}>
                <ActivityIndicator color={theme.colors.text} />
                <Text style={styles.primaryText}>Generating...</Text>
              </View>
            ) : (
              <Text style={styles.primaryText} numberOfLines={1}>
                {selectedDate
                  ? `Generate for ${selectedDate.label} ${selectedDate.day}`
                  : "Generate outfit"}
              </Text>
            )}
          </TouchableOpacity>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {approveToast ? (
            <View
              style={[
                styles.toast,
                approveToast.type === "success"
                  ? styles.toastSuccess
                  : styles.toastError,
              ]}
            >
              <Text style={styles.toastText}>{approveToast.message}</Text>
            </View>
          ) : null}
          {requiresAuth ? (
            <View style={styles.authCard}>
              <Text style={styles.authText}>
                Sign in to generate outfits based on your wardrobe.
              </Text>
              <TouchableOpacity
                style={styles.authButton}
                onPress={() => router.replace("/login")}
              >
                <Text style={styles.authButtonText}>Go to login</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {requiresCloset ? (
            <View style={styles.authCard}>
              <Text style={styles.authText}>
                Add items to your wardrobe to generate outfits.
              </Text>
              <TouchableOpacity
                style={styles.authButton}
                onPress={() => router.push("/wardrobe")}
              >
                <Text style={styles.authButtonText}>Go to wardrobe</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {outfits.length ? (
            <View style={styles.generatedSection}>
              <Text style={styles.sectionTitleAlt}>Generated outfits</Text>
              <View style={styles.grid}>
                {outfits.map((outfit) => (
                  <View key={outfit.id} style={styles.gridItem}>
                    <OutfitCard
                      outfit={outfit}
                      variant="compact"
                      onPress={() => router.push(`/outfit/${outfit.id}`)}
                    />
                    {!approvedIds.has(String(outfit.id)) ? (
                      <TouchableOpacity
                        style={[
                          styles.approveButtonCompact,
                          approveLoading && styles.buttonDisabled,
                        ]}
                        onPress={() => handleApprove(outfit)}
                        disabled={approveLoading}
                      >
                        {approveLoading ? (
                          <ActivityIndicator color={theme.colors.text} />
                        ) : (
                          <Text style={styles.approveTextCompact}>Approve</Text>
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          ) : null}

        </ScrollView>

        <BottomNav active="home" />
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
  section: {
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionCard: {
    marginTop: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  stepBadge: {
    height: 28,
    width: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
  },
  sectionTitleAlt: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  generatedSection: {
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionHint: {
    marginTop: 2,
    fontSize: 11,
    color: theme.colors.textSoft,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dateRow: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    paddingRight: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  dateChip: {
    width: 64,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dateChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryDark,
  },
  dateLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.textSoft,
  },
  dateNumber: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
  },
  dateLabelActive: {
    color: theme.colors.text,
  },
  infoRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  infoPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
  },
  infoText: {
    fontSize: 10,
    color: theme.colors.textSoft,
  },
  infoValue: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text,
  },
  primaryButton: {
    marginTop: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  primaryText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
  },
  primaryButtonLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorText: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    fontSize: 12,
    color: "#C44536",
  },
  emptyText: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    fontSize: 12,
    color: theme.colors.textSoft,
  },
  toast: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  toastSuccess: {
    backgroundColor: "#E7F6EC",
  },
  toastError: {
    backgroundColor: "#FCE8E6",
  },
  toastText: {
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: "600",
  },
  grid: {
    marginTop: theme.spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
  },
  gridItem: {
    width: "48%",
  },
  approveButtonCompact: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    alignItems: "center",
  },
  approveTextCompact: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.text,
  },
  authCard: {
    marginTop: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
  },
  authText: {
    fontSize: 12,
    color: theme.colors.textSoft,
    textAlign: "center",
  },
  authButton: {
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
  },
  authButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.text,
  },
});
