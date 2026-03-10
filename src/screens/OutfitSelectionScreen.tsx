import { useEffect, useMemo, useState } from "react";
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
  const [eventIndex, setEventIndex] = useState(0);
  const [styleIndex, setStyleIndex] = useState(0);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [closetCount, setClosetCount] = useState(0);
  const [weatherLoaded, setWeatherLoaded] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const dateOptions = useMemo(() => buildDateOptions(7), []);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);

  const selectedEvent = EVENT_TYPES[eventIndex];
  const selectedStyle = STYLE_TYPES[styleIndex];
  const selectedDate = dateOptions[selectedDateIndex];

  const showNotice = (title: string, message: string) => {
    Alert.alert(title, message);
  };

  const showAuthRequired = (message: string) => {
    Alert.alert("Sign in required", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Go to login", onPress: () => router.replace("/login") },
    ]);
  };

  const showClosetRequired = (message: string) => {
    Alert.alert("Wardrobe required", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Go to wardrobe", onPress: () => router.push("/wardrobe") },
    ]);
  };

  const canGenerate = useMemo(
    () => !!selectedEvent && !!selectedStyle,
    [selectedEvent, selectedStyle]
  );

  useEffect(() => {
    let isActive = true;
    const preload = async () => {
      const token = getAuthToken();
      if (!token) {
        setClosetCount(0);
        return;
      }
      try {
        const closet = await contextApi.getCloset();
        if (!isActive) return;
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
    const token = getAuthToken();
    if (!token) {
      showAuthRequired("Please sign in to generate outfit suggestions.");
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
        showClosetRequired("Add items to your closet before generating outfits.");
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
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        showAuthRequired("Please sign in to generate outfit suggestions.");
      } else if (isApiError(err) && err.status === 400 && err.message.includes("Closet")) {
        showClosetRequired("Add items to your closet before generating outfits.");
      } else {
        showNotice(
          "Unable to generate outfit",
          err instanceof Error ? err.message : "Failed to generate outfit",
        );
      }
      setOutfits([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (outfit: Outfit) => {
    if (!getAuthToken()) {
      showAuthRequired("Please sign in to approve outfits.");
      return;
    }
    const items = (outfit.items || [])
      .map((item) => Number(String(item.id).split("-")[0]))
      .filter((id) => Number.isFinite(id));
    if (!items.length) {
      showNotice("Unable to save outfit", "No closet items to save this outfit.");
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
        showNotice("Unable to save outfit", "Save failed: missing outfit id.");
        return;
      }
      setApprovedIds((prev) => {
        const next = new Set(prev);
        next.add(String(outfit.id));
        return next;
      });
      showNotice("Outfit saved", `Outfit saved (id=${saved.id}).`);
    } catch (err) {
      showNotice(
        "Unable to save outfit",
        err instanceof Error ? err.message : "Failed to save outfit.",
      );
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
  emptyText: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    fontSize: 12,
    color: theme.colors.textSoft,
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
});
