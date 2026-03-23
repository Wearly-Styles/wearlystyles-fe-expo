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
import { usePersonalScheduleEntries } from "../hooks/usePersonalScheduleEntries";
import { getAuthToken, isApiError } from "../services/apiClient";
import { contextApi, recommendationApi, outfitApi } from "../services/outfitApi";
import { mapRecommendationsToOutfits } from "../utils/outfitMapper";
import { setOutfitCache } from "../utils/outfitStore";
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "../utils/toast";
import {
  addScheduleDays,
  atScheduleNoon,
  formatScheduleDateKey,
} from "../utils/scheduleDate";
import {
  formatPersonalScheduleTime,
  getPersonalScheduleEntriesForDate,
  toPersonalScheduleEvents,
} from "../utils/personalSchedule";
import type { Outfit } from "../constants/mockOutfits";

const EVENT_TYPES = ["Work", "Study", "Event", "Casual", "Party"];
const STYLE_TYPES = ["Casual", "Minimal", "Formal", "Sporty", "Chic"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const buildDateOptions = (count = 7) => {
  const today = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = atScheduleNoon(addScheduleDays(today, index));
    return {
      key: formatScheduleDateKey(date),
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
  const [savedOutfitIds, setSavedOutfitIds] = useState<Record<string, number>>({});
  const [pendingOutfitAction, setPendingOutfitAction] = useState<{
    id: string;
    type: "approve" | "cancel";
  } | null>(null);
  const [dismissingOutfitId, setDismissingOutfitId] = useState<string | null>(null);
  const dateOptions = useMemo(() => buildDateOptions(7), []);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const { entries: personalScheduleEntries } = usePersonalScheduleEntries();

  const selectedEvent = EVENT_TYPES[eventIndex];
  const selectedStyle = STYLE_TYPES[styleIndex];
  const selectedDate = dateOptions[selectedDateIndex];
  const selectedDateValue = useMemo(
    () => new Date(selectedDate?.datetime || new Date().toISOString()),
    [selectedDate],
  );
  const matchingPersonalEntries = useMemo(
    () =>
      getPersonalScheduleEntriesForDate(
        personalScheduleEntries,
        selectedDateValue,
      ),
    [personalScheduleEntries, selectedDateValue],
  );
  const personalCalendarContext = useMemo(
    () =>
      toPersonalScheduleEvents(personalScheduleEntries, selectedDateValue),
    [personalScheduleEntries, selectedDateValue],
  );

  const showNotice = (
    tone: "success" | "error" | "info",
    title: string,
    message: string,
  ) => {
    const options = { title };
    if (tone === "success") {
      showSuccessToast(message, options);
      return;
    }
    if (tone === "info") {
      showInfoToast(message, options);
      return;
    }
    showErrorToast(message, options);
  };

  const showAuthRequired = (message: string) => {
    Alert.alert("Sign in required", message, [
      { text: "Not now", style: "cancel" },
      { text: "Go to login", onPress: () => router.replace("/login") },
    ]);
  };

  const showClosetRequired = (message: string) => {
    Alert.alert("Wardrobe required", message, [
      { text: "Not now", style: "cancel" },
      { text: "Open wardrobe", onPress: () => router.push("/wardrobe") },
    ]);
  };
  const getLocalOutfitId = (outfit: Outfit) => String(outfit.id);
  const isOutfitApproved = (outfit: Outfit) =>
    Boolean(savedOutfitIds[getLocalOutfitId(outfit)]);
  const getPendingAction = (outfit: Outfit) =>
    pendingOutfitAction?.id === getLocalOutfitId(outfit)
      ? pendingOutfitAction.type
      : null;
  const isDismissingOutfit = (outfit: Outfit) =>
    dismissingOutfitId === getLocalOutfitId(outfit);

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

  const applyPersonalRoutine = (entry: (typeof matchingPersonalEntries)[number]) => {
    const nextEventIndex = EVENT_TYPES.findIndex(
      (item) => item === entry.eventType,
    );
    if (nextEventIndex >= 0) {
      setEventIndex(nextEventIndex);
    }

    const nextStyleIndex = STYLE_TYPES.findIndex(
      (item) => item === entry.preferredStyle,
    );
    if (nextStyleIndex >= 0) {
      setStyleIndex(nextStyleIndex);
    }
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setLoading(true);
    const token = getAuthToken();
    if (!token) {
      showAuthRequired("Sign in to generate outfit ideas.");
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
        showClosetRequired(
          "Add at least one wardrobe item before generating looks.",
        );
        setLoading(false);
        return;
      }
      const result = await recommendationApi.recommendBySelection({
        selectedEventType: selectedEvent,
        selectedStyle,
        closet,
        weather,
        calendar: personalCalendarContext.length
          ? personalCalendarContext
          : undefined,
      });
      const mapped = mapRecommendationsToOutfits(result, closet, weather);
      setSavedOutfitIds({});
      setOutfits(mapped);
      setOutfitCache(mapped);
      setWeatherLoaded(true);
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        showAuthRequired("Sign in to generate outfit ideas.");
      } else if (isApiError(err) && err.status === 400 && err.message.includes("Closet")) {
        showClosetRequired(
          "Add at least one wardrobe item before generating looks.",
        );
      } else {
        showNotice(
          "error",
          "Couldn't generate looks",
          err instanceof Error ? err.message : "Try again in a moment.",
        );
      }
      setOutfits([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (outfit: Outfit) => {
    if (!getAuthToken()) {
      showAuthRequired("Sign in to save this look.");
      return;
    }
    const items = (outfit.items || [])
      .map((item) => Number(String(item.id).split("-")[0]))
      .filter((id) => Number.isFinite(id));
    if (!items.length) {
      showNotice(
        "info",
        "Can't save this look",
        "This suggestion doesn't include wardrobe items yet.",
      );
      return;
    }

    const localId = getLocalOutfitId(outfit);
    setPendingOutfitAction({ id: localId, type: "approve" });
    try {
      const saved = await outfitApi.createOutfit({
        name: outfit.title,
        occasion: outfit.subtitle || undefined,
        weather: outfit.weather || undefined,
        items,
      });
      if (!saved?.id) {
        showNotice(
          "error",
          "Couldn't save this look",
          "The saved look did not return an ID. Try again.",
        );
        return;
      }
      setSavedOutfitIds((prev) => ({ ...prev, [localId]: saved.id }));
      showNotice(
        "success",
        "Look saved",
        "This suggestion is now in Your Outfits.",
      );
    } catch (err) {
      showNotice(
        "error",
        "Couldn't save this look",
        err instanceof Error ? err.message : "Try saving this look again.",
      );
    } finally {
      setPendingOutfitAction((prev) =>
        prev?.id === localId ? null : prev,
      );
    }
  };

  const handleCancelApproval = (outfit: Outfit) => {
    const localId = getLocalOutfitId(outfit);
    const savedId = savedOutfitIds[localId];
    if (!savedId) return;

    Alert.alert(
      "Remove saved look",
      "Remove this look from Your Outfits?",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setPendingOutfitAction({ id: localId, type: "cancel" });
            try {
              await outfitApi.deleteOutfit(savedId);
              setSavedOutfitIds((prev) => {
                const next = { ...prev };
                delete next[localId];
                return next;
              });
              showNotice(
                "info",
                "Saved look removed",
                "This look is no longer in Your Outfits.",
              );
            } catch (err) {
              showNotice(
                "error",
                "Couldn't remove saved look",
                err instanceof Error ? err.message : "Try removing it again.",
              );
            } finally {
              setPendingOutfitAction((prev) =>
                prev?.id === localId ? null : prev,
              );
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  const removeGeneratedOutfit = (outfit: Outfit) => {
    const localId = getLocalOutfitId(outfit);
    setOutfits((prev) => {
      const next = prev.filter((item) => getLocalOutfitId(item) !== localId);
      setOutfitCache(next);
      return next;
    });
    setSavedOutfitIds((prev) => {
      if (!(localId in prev)) return prev;
      const next = { ...prev };
      delete next[localId];
      return next;
    });
  };

  const handleDismissGenerated = (outfit: Outfit) => {
    const localId = getLocalOutfitId(outfit);
    Alert.alert(
      "Remove suggestion",
      "Remove this generated look from the current suggestions?",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setDismissingOutfitId(localId);
            removeGeneratedOutfit(outfit);
            setDismissingOutfitId((current) =>
              current === localId ? null : current,
            );
          },
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
            title="Create Outfit"
            subtitle="Choose event & style to generate"
            onBackPress={() => router.back()}
          />

          <View style={styles.sectionCard}>
            <View style={styles.personalPlanCard}>
              <View style={styles.personalPlanHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Personal schedule</Text>
                  <Text style={styles.sectionHint}>
                    AI uses matching routines for the selected day.
                  </Text>
                </View>
                <TouchableOpacity onPress={() => router.push("/personal-schedule")}>
                  <Text style={styles.personalPlanLink}>Manage</Text>
                </TouchableOpacity>
              </View>
              {matchingPersonalEntries.length ? (
                matchingPersonalEntries.map((entry) => (
                  <View key={entry.id} style={styles.personalPlanItem}>
                    <View style={styles.personalPlanText}>
                      <Text style={styles.personalPlanTitle}>{entry.title}</Text>
                      <Text style={styles.personalPlanMeta}>
                        {entry.eventType} | {entry.preferredStyle} | {formatPersonalScheduleTime(entry)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.personalPlanButton}
                      onPress={() => applyPersonalRoutine(entry)}
                    >
                      <Text style={styles.personalPlanButtonText}>Use</Text>
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={styles.personalPlanEmpty}>
                  No personal routine for this day yet.
                </Text>
              )}
            </View>

            <View style={styles.sectionDivider} />

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
                    {!isOutfitApproved(outfit) ? (
                      <View style={styles.generatedActionRow}>
                        <TouchableOpacity
                          style={[
                            styles.cancelButtonCompact,
                            styles.generatedActionButton,
                            isDismissingOutfit(outfit) && styles.buttonDisabled,
                          ]}
                          onPress={() => handleDismissGenerated(outfit)}
                          disabled={Boolean(getPendingAction(outfit)) || isDismissingOutfit(outfit)}
                        >
                          {isDismissingOutfit(outfit) ? (
                            <ActivityIndicator color="#C44536" />
                          ) : (
                            <Text style={styles.cancelTextCompact}>Cancel</Text>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.approveButtonCompact,
                            styles.generatedActionButton,
                            getPendingAction(outfit) === "approve" &&
                              styles.buttonDisabled,
                          ]}
                          onPress={() => handleApprove(outfit)}
                          disabled={Boolean(getPendingAction(outfit)) || isDismissingOutfit(outfit)}
                        >
                          {getPendingAction(outfit) === "approve" ? (
                            <ActivityIndicator color={theme.colors.text} />
                          ) : (
                            <Text style={styles.approveTextCompact}>Approve</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.approvedRowCompact}>
                        <TouchableOpacity
                          style={[
                            styles.cancelButtonCompact,
                            getPendingAction(outfit) === "cancel" &&
                              styles.buttonDisabled,
                          ]}
                          onPress={() => handleCancelApproval(outfit)}
                          disabled={Boolean(getPendingAction(outfit))}
                        >
                          {getPendingAction(outfit) === "cancel" ? (
                            <ActivityIndicator color="#C44536" />
                          ) : (
                            <Text style={styles.cancelTextCompact}>Cancel</Text>
                          )}
                        </TouchableOpacity>
                        <View style={styles.approvedBadgeCompact}>
                          <Text style={styles.approvedBadgeTextCompact}>Approved</Text>
                        </View>
                      </View>
                    )}
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
  personalPlanCard: {
    gap: theme.spacing.sm,
  },
  personalPlanHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  personalPlanLink: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textSoft,
  },
  personalPlanItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  personalPlanText: {
    flex: 1,
  },
  personalPlanTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
  },
  personalPlanMeta: {
    marginTop: 4,
    fontSize: 10,
    color: theme.colors.textSoft,
  },
  personalPlanButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
  },
  personalPlanButtonText: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.text,
  },
  personalPlanEmpty: {
    fontSize: 11,
    color: theme.colors.textSoft,
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
  generatedActionRow: {
    marginTop: theme.spacing.sm,
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  generatedActionButton: {
    flex: 1,
  },
  approveButtonCompact: {
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
  approvedRowCompact: {
    marginTop: theme.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  approvedBadgeCompact: {
    flex: 1,
    minHeight: 34,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  approvedBadgeTextCompact: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.text,
  },
  cancelButtonCompact: {
    flex: 1,
    minHeight: 34,
    borderRadius: theme.radius.pill,
    backgroundColor: "#FCE8E6",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelTextCompact: {
    fontSize: 10,
    fontWeight: "700",
    color: "#C44536",
  },
});
