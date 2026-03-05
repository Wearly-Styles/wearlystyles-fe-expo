import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import AppHeader from "../components/AppHeader";
import FilterPills from "../components/FilterPills";
import OutfitCard from "../components/OutfitCard";
import BottomNav from "../components/BottomNav";
import { theme } from "../constants/theme";
import { getAuthToken, isApiError } from "../services/apiClient";
import {
  contextApi,
  recommendationApi,
  outfitApi,
  outfitPlanApi,
} from "../services/outfitApi";
import { mapRecommendationsToOutfits } from "../utils/outfitMapper";
import { setOutfitCache } from "../utils/outfitStore";
import type {
  NormalizedClosetItem,
  NormalizedEvent,
  OutfitPlan,
} from "../services/types";
import type { Outfit, OutfitItem } from "../constants/mockOutfits";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80";
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateKey = (key: string) => {
  const [year, month, day] = key.split("-").map((part) => Number(part));
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return null;
  }
  return new Date(year, month - 1, day, 12);
};

const buildMonthDays = (monthDate: Date) => {
  const year = monthDate.getFullYear();
  const monthIndex = monthDate.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => {
    const dayNumber = index + 1;
    const date = new Date(year, monthIndex, dayNumber, 12);
    return {
      key: formatDateKey(date),
      dayLabel: DAY_LABELS[date.getDay()],
      dayNumber,
      monthLabel: MONTH_LABELS[monthIndex],
      date,
    };
  });
};

const toOutfitItem = (item: NormalizedClosetItem): OutfitItem => ({
  id: String(item.id),
  title: item.category || "Item",
  subtitle: item.name || "Closet pick",
  image: item.image || FALLBACK_IMAGE,
});

export default function OutfitSuggestionsScreen() {
  const router = useRouter();
  const filters = useMemo(() => ["All", "Casual", "Work", "Study", "Event"], []);
  const [loading, setLoading] = useState(false);
  const [apiOutfits, setApiOutfits] = useState<Outfit[]>([]);
  const [closetItems, setClosetItems] = useState<NormalizedClosetItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<NormalizedEvent[]>([]);
  const [scheduledOutfits, setScheduledOutfits] = useState<
    Record<string, { planId: number; outfit: Outfit }>
  >({});
  const [generatedOutfitsByDate, setGeneratedOutfitsByDate] = useState<Record<string, Outfit>>({});
  const [savedOutfitIds, setSavedOutfitIds] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [requiresCloset, setRequiresCloset] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [approveToast, setApproveToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState(0);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const filteredOutfits = useMemo(() => {
    if (activeFilter === 0) return apiOutfits;
    const label = filters[activeFilter];
    if (!label) return apiOutfits;
    return apiOutfits.filter(
      (outfit) =>
        outfit.tags?.includes(label) ||
        outfit.title?.toLowerCase().includes(label.toLowerCase()) ||
        outfit.subtitle?.toLowerCase().includes(label.toLowerCase())
    );
  }, [activeFilter, apiOutfits, filters]);
  const heroOutfit = filteredOutfits[0];
  const [editableOutfit, setEditableOutfit] = useState<Outfit | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const calendarToken = process.env.EXPO_PUBLIC_CALENDAR_TOKEN?.trim();

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const monthStart = useMemo(
    () => new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1),
    [calendarMonth],
  );
  const monthEnd = useMemo(
    () =>
      new Date(
        calendarMonth.getFullYear(),
        calendarMonth.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      ),
    [calendarMonth],
  );
  const monthEndExclusive = useMemo(
    () => new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1),
    [calendarMonth],
  );
  const calendarDays = useMemo(
    () => buildMonthDays(calendarMonth),
    [calendarMonth],
  );
  const calendarMonthLabel = useMemo(() => {
    const label = MONTH_LABELS[calendarMonth.getMonth()];
    return `${label} ${calendarMonth.getFullYear()}`;
  }, [calendarMonth]);

  const handlePrevMonth = () => {
    setCalendarMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    setCalendarMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
    );
  };

  const handleGoToCurrentMonth = () => {
    const today = new Date();
    setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };
  const closetOptions = useMemo<OutfitItem[]>(() => {
    if (closetItems.length) {
      return closetItems.map(toOutfitItem);
    }
    return [];
  }, [closetItems]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, NormalizedEvent[]> = {};
    calendarEvents.forEach((event) => {
      if (!event.start) return;
      const eventDate = event.start.includes("T")
        ? new Date(event.start)
        : new Date(`${event.start}T00:00:00`);
      const key = formatDateKey(eventDate);
      map[key] = map[key] ? [...map[key], event] : [event];
    });
    return map;
  }, [calendarEvents]);

  useEffect(() => {
    if (heroOutfit) {
      setEditableOutfit(heroOutfit);
      setSelectedSlot(0);
      setIsEditing(false);
      return;
    }
    if (!heroOutfit && apiOutfits.length === 0) {
      setEditableOutfit(null);
      setSelectedSlot(0);
      setIsEditing(false);
    }
  }, [heroOutfit?.id, apiOutfits.length]);

  // No auto-generate. User selects dates and taps Generate.

  useEffect(() => {
    if (!calendarToken || !getAuthToken()) return;
    let isActive = true;
    const loadCalendar = async () => {
      try {
        const events = await contextApi.getCalendar({
          accessToken: calendarToken,
          timeMin: monthStart.toISOString(),
          timeMax: monthEndExclusive.toISOString(),
          maxResults: 100,
        });
        if (isActive) {
          setCalendarEvents(events ?? []);
        }
      } catch {
        if (isActive) {
          setCalendarEvents([]);
        }
      }
    };

    loadCalendar();
    return () => {
      isActive = false;
    };
  }, [calendarToken, monthStart, monthEndExclusive]);

  const displayItems = editableOutfit?.items ?? [];

  const mapPlansToSchedule = (plans: OutfitPlan[]) => {
    const mapped: Record<string, { planId: number; outfit: Outfit }> = {};
    plans.forEach((plan) => {
      const dateKey = formatDateKey(new Date(plan.planDate));
      const outfitName = plan.outfit?.name || "Scheduled outfit";
      const outfit: Outfit = {
        id: String(plan.outfitId),
        title: outfitName,
        subtitle: plan.outfit?.occasion || "Planned look",
        image: FALLBACK_IMAGE,
        tags: [plan.outfit?.occasion || "Planned"],
        items: [],
        weather: plan.outfit?.weather || "Weather unavailable",
        mood: plan.planType || "Planned",
      };
      mapped[dateKey] = { planId: plan.id, outfit };
    });
    return mapped;
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const loadPlans = async () => {
        if (!getAuthToken()) {
          if (isActive) setScheduledOutfits({});
          return;
        }
        try {
          const from = monthStart.toISOString();
          const to = monthEnd.toISOString();
          const plans = await outfitPlanApi.listPlans(from, to);
          if (!isActive) return;
          const mapped = mapPlansToSchedule(plans);
          setScheduledOutfits(mapped);
          setOutfitCache(Object.values(mapped).map((entry) => entry.outfit));
        } catch {
          if (isActive) {
            setScheduledOutfits({});
          }
        }
      };
      loadPlans();
      return () => {
        isActive = false;
      };
    }, [monthStart, monthEnd]),
  );

  const handleToggleEdit = () => {
    if (!editableOutfit) return;
    if (isEditing) {
      setApiOutfits((prev) => {
        const updated =
          prev.length === 0
            ? [editableOutfit]
            : prev.map((outfit, index) =>
                index === 0 ? editableOutfit : outfit
              );
        setOutfitCache(updated);
        return updated;
      });
      setIsEditing(false);
      return;
    }

    setIsEditing(true);
  };

  const handleReplaceItem = (replacement: OutfitItem) => {
    setEditableOutfit((prev) => {
      if (!prev) return prev;
      const items = [...prev.items];
      if (!items.length) {
        items.push({
          ...replacement,
          id: `${replacement.id}-${selectedSlot}`,
        });
        return { ...prev, items };
      }
      items[selectedSlot] = {
        ...replacement,
        id: `${replacement.id}-${selectedSlot}`,
      };
      return { ...prev, items };
    });
  };

  const extractClosetItemIds = (outfit: Outfit) =>
    (outfit.items || [])
      .map((item) => Number(String(item.id).split("-")[0]))
      .filter((id) => Number.isFinite(id));

  const ensureSavedOutfitId = async (outfit: Outfit) => {
    const localId = String(outfit.id);
    const cachedId = savedOutfitIds[localId];
    if (cachedId) return cachedId;

    const items = extractClosetItemIds(outfit);
    if (items.length === 0) {
      throw new Error("Please add closet items before scheduling.");
    }

    const created = await outfitApi.createOutfit({
      name: outfit.title,
      occasion: outfit.subtitle || undefined,
      weather: outfit.weather || undefined,
      items,
    });

    if (!created?.id) {
      throw new Error("Save failed: missing outfit id.");
    }

    setSavedOutfitIds((prev) => ({ ...prev, [localId]: created.id }));
    setApprovedIds((prev) => {
      const next = new Set(prev);
      next.add(localId);
      return next;
    });

    return created.id;
  };

  const scheduleOutfitForDate = async (
    outfit: Outfit,
    dateKey: string,
    date: Date,
    existingPlanId?: number,
  ) => {
    const outfitId = await ensureSavedOutfitId(outfit);
    const planType = outfit.mood || undefined;
    const payload = {
      outfitId,
      planDate: date.toISOString(),
      planType,
    };

    const plan = existingPlanId
      ? await outfitPlanApi.updatePlan(existingPlanId, payload)
      : (await outfitPlanApi.createPlans([payload]))[0];

    if (!plan?.id) {
      throw new Error("Failed to schedule outfit.");
    }

    const scheduled = {
      ...outfit,
      id: String(outfitId),
    };

    setScheduledOutfits((prev) => ({
      ...prev,
      [dateKey]: {
        planId: plan.id,
        outfit: scheduled,
      },
    }));
    setOutfitCache([scheduled]);
  };

  const handleScheduleOutfit = async (
    dateKey: string,
    date: Date,
    existingPlanId?: number,
    outfitOverride?: Outfit,
  ) => {
    const outfit = outfitOverride ?? editableOutfit;
    if (!outfit) return;
    if (!getAuthToken()) {
      setRequiresAuth(true);
      setError("Please sign in to schedule outfits.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await scheduleOutfitForDate(outfit, dateKey, date, existingPlanId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule outfit.");
    } finally {
      setLoading(false);
    }
  };

  const scheduleGeneratedOutfits = async (replaceExisting: boolean) => {
    const keys = Object.keys(generatedOutfitsByDate).sort();
    if (keys.length === 0) {
      setError("Generate outfits before scheduling.");
      return;
    }
    if (!getAuthToken()) {
      setRequiresAuth(true);
      setError("Please sign in to schedule outfits.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const toCreate: Array<{
        dateKey: string;
        outfit: Outfit;
        outfitId: number;
        planDate: string;
        planType?: string;
      }> = [];
      const toReplace: Array<{
        dateKey: string;
        planId: number;
        outfit: Outfit;
        outfitId: number;
        planDate: string;
        planType?: string;
      }> = [];

      for (const key of keys) {
        const outfit = generatedOutfitsByDate[key];
        if (!outfit) continue;
        const date = parseDateKey(key);
        if (!date) continue;

        const outfitId = await ensureSavedOutfitId(outfit);
        const planDate = date.toISOString();
        const planType = outfit.mood || undefined;
        const existing = scheduledOutfits[key];

        if (existing) {
          if (replaceExisting) {
            toReplace.push({
              dateKey: key,
              planId: existing.planId,
              outfit,
              outfitId,
              planDate,
              planType,
            });
          }
          continue;
        }

        toCreate.push({ dateKey: key, outfit, outfitId, planDate, planType });
      }

      const newEntries: Record<string, { planId: number; outfit: Outfit }> = {};

      for (const entry of toReplace) {
        const plan = await outfitPlanApi.updatePlan(entry.planId, {
          outfitId: entry.outfitId,
          planDate: entry.planDate,
          planType: entry.planType,
        });
        if (!plan?.id) {
          throw new Error("Failed to schedule outfit.");
        }
        const scheduled = { ...entry.outfit, id: String(entry.outfitId) };
        newEntries[entry.dateKey] = { planId: plan.id, outfit: scheduled };
      }

      if (toCreate.length) {
        const createdPlans = await outfitPlanApi.createPlans(
          toCreate.map((item) => ({
            outfitId: item.outfitId,
            planDate: item.planDate,
            planType: item.planType,
          })),
        );

        const planIdByDateKey: Record<string, number> = {};
        (createdPlans || []).forEach((plan) => {
          planIdByDateKey[formatDateKey(new Date(plan.planDate))] = plan.id;
        });

        for (const item of toCreate) {
          const planId = planIdByDateKey[item.dateKey];
          if (!planId) continue;
          const scheduled = { ...item.outfit, id: String(item.outfitId) };
          newEntries[item.dateKey] = { planId, outfit: scheduled };
        }
      }

      const entries = Object.values(newEntries);
      if (!entries.length) {
        showToast(
          "error",
          replaceExisting
            ? "No outfits were scheduled. Try generating again."
            : "All generated days are already scheduled.",
        );
        return;
      }

      setScheduledOutfits((prev) => ({ ...prev, ...newEntries }));
      setOutfitCache(entries.map((entry) => entry.outfit));
      showToast("success", `Scheduled ${entries.length} outfit(s).`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to schedule outfits.";
      setError(message);
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleGeneratedPress = () => {
    const keys = Object.keys(generatedOutfitsByDate).sort();
    if (keys.length === 0) {
      setError("Generate outfits before scheduling.");
      return;
    }

    const existingCount = keys.filter((key) => Boolean(scheduledOutfits[key]))
      .length;
    const total = keys.length;

    if (existingCount === 0) {
      Alert.alert(
        "Schedule outfits",
        `Schedule ${total} generated outfit(s) to your calendar? This will save them to your wardrobe.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Schedule", onPress: () => void scheduleGeneratedOutfits(false) },
        ],
        { cancelable: true },
      );
      return;
    }

    Alert.alert(
      "Schedule outfits",
      `${existingCount} day(s) already have a scheduled outfit.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Skip existing",
          onPress: () => void scheduleGeneratedOutfits(false),
        },
        { text: "Replace all", onPress: () => void scheduleGeneratedOutfits(true) },
      ],
      { cancelable: true },
    );
  };

  const handleRemoveSchedule = async (dateKey: string, planId: number) => {
    if (!getAuthToken()) {
      setRequiresAuth(true);
      setError("Please sign in to manage your schedule.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await outfitPlanApi.deletePlan(planId);
      setScheduledOutfits((prev) => {
        const next = { ...prev };
        delete next[dateKey];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove scheduled outfit.");
    } finally {
      setLoading(false);
    }
  };

  const handlePressCalendarDay = (dateKey: string, date: Date) => {
    const scheduled = scheduledOutfits[dateKey];
    const suggested = generatedOutfitsByDate[dateKey];
    if (!scheduled) {
      if (!editableOutfit && !suggested) {
        setError("Generate an outfit before scheduling.");
        return;
      }

      const selectedForThisDate =
        editableOutfit && String(editableOutfit.id).startsWith(`${dateKey}-`)
          ? editableOutfit
          : undefined;

      const outfitToSchedule = suggested
        ? selectedForThisDate ?? suggested
        : editableOutfit ?? undefined;
      if (!outfitToSchedule) {
        setError("Generate an outfit before scheduling.");
        return;
      }

      void handleScheduleOutfit(dateKey, date, undefined, outfitToSchedule);
      return;
    }

    Alert.alert(
      "Scheduled outfit",
      "This day already has a scheduled outfit.",
      [
        {
          text: "View",
          onPress: () => router.push(`/outfit/${scheduled.outfit.id}`),
        },
        {
          text: "Replace",
          onPress: () => {
            const replacement = editableOutfit ?? suggested ?? undefined;
            if (!replacement) {
              setError("Select an outfit before replacing.");
              return;
            }
            void handleScheduleOutfit(dateKey, date, scheduled.planId, replacement);
          },
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => void handleRemoveSchedule(dateKey, scheduled.planId),
        },
      ],
      { cancelable: true },
    );
  };

  const handleSelectOutfit = (outfit: Outfit) => {
    setEditableOutfit(outfit);
    setSelectedSlot(0);
    setIsEditing(false);
  };

  const toggleDate = (key: string) => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleGenerate = async () => {
    const token = getAuthToken();
    if (!token) {
      setRequiresAuth(true);
      setError("Please sign in to load outfit recommendations.");
      return;
    }
    if (selectedDates.size === 0) {
      setError("Select at least one day to generate outfits.");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      setApprovedIds(new Set());
      setSavedOutfitIds({});
      setGeneratedOutfitsByDate({});
      const closet = await contextApi.getCloset();
      if (!closet.length) {
        setRequiresCloset(true);
        setError("Add items to your closet to unlock suggestions.");
        setGenerating(false);
        return;
      }

      const orderedDates = Array.from(selectedDates)
        .sort()
        .map((key) => {
          const date = parseDateKey(key);
          if (!date) return null;
          return { key, date };
        })
        .filter(
          (value): value is { key: string; date: Date } => value !== null,
        );

      const results: Outfit[] = [];
      const suggestionsByDate: Record<string, Outfit> = {};
      for (const day of orderedDates) {
        const weather = await contextApi.getWeather({
          lat: 10.8231,
          lon: 106.6297,
          datetime: day.date.toISOString(),
        });
        const rec = await recommendationApi.recommendByContext({
          weather,
          closet,
        });
        const mapped = mapRecommendationsToOutfits(rec, closet, weather);
        if (mapped.length) {
          const mappedWithIds = mapped.map((item) => ({
            ...item,
            id: `${day.key}-${item.id}`,
          }));
          results.push(
            ...mappedWithIds,
          );
          suggestionsByDate[day.key] = mappedWithIds[0];
        }
      }

      setApiOutfits(results);
      setGeneratedOutfitsByDate(suggestionsByDate);
      setClosetItems(closet);
      setOutfitCache(results);
      setActiveFilter(0);
      setRequiresAuth(false);
      setRequiresCloset(false);
      const firstKey = orderedDates[0]?.key;
      setEditableOutfit(
        firstKey ? suggestionsByDate[firstKey] ?? results[0] ?? null : results[0] ?? null,
      );
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        setRequiresAuth(true);
        setError("Please sign in to load outfit recommendations.");
      } else if (isApiError(err) && err.status === 400 && err.message.includes("Closet")) {
        setRequiresCloset(true);
        setError("Add items to your closet to unlock suggestions.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to generate");
      }
      setApiOutfits([]);
      setGeneratedOutfitsByDate({});
    } finally {
      setGenerating(false);
    }
  };

  const showToast = (type: "success" | "error", message: string) => {
    setApproveToast({ type, message });
    setTimeout(() => {
      setApproveToast(null);
    }, 2500);
  };

  const handleApprove = async () => {
    if (!editableOutfit) return;
    if (!getAuthToken()) {
      setRequiresAuth(true);
      showToast("error", "Please sign in to approve outfits.");
      return;
    }

    setApproveLoading(true);
    try {
      const savedId = await ensureSavedOutfitId(editableOutfit);
      showToast("success", `Outfit saved (id=${savedId}).`);
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
            title="Outfit Suggestions"
            subtitle="Based on your wardrobe, weather, and style preferences"
            onBackPress={() => router.back()}
          />

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal calendar</Text>
            <TouchableOpacity onPress={() => router.push("/plans")}>
              <Text style={styles.sectionLink}>View plans</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.calendarNavRow}>
            <Text style={styles.calendarNavLabel}>{calendarMonthLabel}</Text>
            <View style={styles.calendarNavButtons}>
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={handlePrevMonth}
                accessibilityLabel="Previous month"
              >
                <Text style={styles.calendarNavText}>‹</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.calendarTodayButton}
                onPress={handleGoToCurrentMonth}
              >
                <Text style={styles.calendarTodayText}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={handleNextMonth}
                accessibilityLabel="Next month"
              >
                <Text style={styles.calendarNavText}>›</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView
            key={calendarMonthLabel}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.calendarRow}
          >
            {calendarDays.map((day) => {
              const events = eventsByDate[day.key] || [];
              const scheduled = scheduledOutfits[day.key];
              const suggested = generatedOutfitsByDate[day.key];
              const showSuggested = Boolean(suggested) && !scheduled;
              return (
                <TouchableOpacity
                  key={day.key}
                  style={[
                    styles.calendarCard,
                    scheduled
                      ? styles.calendarCardActive
                      : showSuggested
                        ? styles.calendarCardSuggested
                        : null,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => handlePressCalendarDay(day.key, day.date)}
                >
                  <Text style={styles.calendarDay}>{day.dayLabel}</Text>
                  <Text style={styles.calendarDate}>{day.dayNumber}</Text>
                  <Text style={styles.calendarMonth}>{day.monthLabel}</Text>
                  {events[0] ? (
                    <Text style={styles.calendarEvent} numberOfLines={1}>
                      {events[0].title}
                    </Text>
                  ) : (
                    <Text style={styles.calendarEmpty}>No plans</Text>
                  )}
                  {scheduled ? (
                    <View style={styles.scheduledRow}>
                      <Image
                        source={{ uri: scheduled.outfit.image }}
                        style={styles.scheduledImage}
                      />
                      <Text style={styles.scheduledTitle} numberOfLines={1}>
                        {scheduled.outfit.title}
                      </Text>
                    </View>
                  ) : showSuggested && suggested ? (
                    <View style={styles.scheduledRow}>
                      <Image
                        source={{ uri: suggested.image }}
                        style={styles.scheduledImage}
                      />
                      <Text style={styles.suggestedTitle} numberOfLines={1}>
                        {suggested.title}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            <FilterPills
              filters={filters}
              activeIndex={activeFilter}
              onPress={setActiveFilter}
            />
          </ScrollView>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pick a day</Text>
            <Text style={styles.sectionNote}>Generate for this date</Text>
          </View>
          <ScrollView
            key={`pick-${calendarMonthLabel}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateRow}
          >
            {calendarDays.map((day) => {
              const active = selectedDates.has(day.key);
              return (
                <TouchableOpacity
                  key={day.key}
                  style={[styles.dateChip, active && styles.dateChipActive]}
                  onPress={() => toggleDate(day.key)}
                >
                  <Text style={[styles.dateLabel, active && styles.dateLabelActive]}>
                    {day.dayLabel}
                  </Text>
                  <Text style={[styles.dateNumber, active && styles.dateLabelActive]}>
                    {day.dayNumber}
                  </Text>
                  <Text style={[styles.dateMonth, active && styles.dateLabelActive]}>
                    {day.monthLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            style={[
              styles.generateButton,
              (generating || selectedDates.size === 0) && styles.buttonDisabled,
            ]}
            onPress={handleGenerate}
            disabled={generating || selectedDates.size === 0}
          >
            {generating ? (
              <ActivityIndicator color={theme.colors.text} />
            ) : (
              <Text style={styles.generateText}>Generate outfits</Text>
            )}
          </TouchableOpacity>

          {Object.keys(generatedOutfitsByDate).length ? (
            <TouchableOpacity
              style={[
                styles.scheduleButton,
                (loading || generating) && styles.buttonDisabled,
              ]}
              onPress={handleScheduleGeneratedPress}
              disabled={loading || generating}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.text} />
              ) : (
                <Text style={styles.scheduleText}>
                  Schedule {Object.keys(generatedOutfitsByDate).length} outfit(s)
                </Text>
              )}
            </TouchableOpacity>
          ) : null}
 
          {loading || generating ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={theme.colors.primaryDark} />
              <Text style={styles.loadingText}>
                {generating ? "Loading recommendations..." : "Updating schedule..."}
              </Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
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
                Sign in to see personalized outfit suggestions.
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
                Add items to your wardrobe to get personalized suggestions.
              </Text>
              <TouchableOpacity
                style={styles.authButton}
                onPress={() => router.push("/wardrobe")}
              >
                <Text style={styles.authButtonText}>Go to wardrobe</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {editableOutfit ? (
            <OutfitCard
              outfit={editableOutfit}
              onPress={() => router.push(`/outfit/${editableOutfit.id}`)}
            />
          ) : null}
          {editableOutfit && !approvedIds.has(String(editableOutfit.id)) ? (
            <TouchableOpacity
              style={[
                styles.approveButton,
                approveLoading && styles.buttonDisabled,
              ]}
              onPress={handleApprove}
              disabled={approveLoading}
            >
              {approveLoading ? (
                <ActivityIndicator color={theme.colors.text} />
              ) : (
                <Text style={styles.approveText}>Approve outfit</Text>
              )}
            </TouchableOpacity>
          ) : null}
          {editableOutfit && approvedIds.has(String(editableOutfit.id)) ? (
            <Text style={styles.successText}>Outfit approved.</Text>
          ) : null}

          {editableOutfit ? (
            <View style={styles.editHeader}>
              <Text style={styles.sectionTitle}>Suggested items</Text>
              <TouchableOpacity onPress={handleToggleEdit}>
                <Text style={styles.editLink}>
                  {isEditing ? "Done" : "Edit"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {isEditing && editableOutfit ? (
            <View style={styles.editCard}>
              <Text style={styles.editLabel}>Outfit name</Text>
              <TextInput
                style={styles.editInput}
                value={editableOutfit.title}
                onChangeText={(text) =>
                  setEditableOutfit((prev) => ({ ...prev, title: text }))
                }
              />
              <Text style={styles.editLabel}>Short note</Text>
              <TextInput
                style={styles.editInput}
                value={editableOutfit.subtitle}
                onChangeText={(text) =>
                  setEditableOutfit((prev) => ({ ...prev, subtitle: text }))
                }
              />
              <Text style={styles.editHint}>
                Tap an item to replace it from your closet.
              </Text>
            </View>
          ) : null}

          {editableOutfit && displayItems.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.itemRow}
              contentContainerStyle={styles.itemRowContent}
            >
              {displayItems.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.itemCard,
                    isEditing && index === selectedSlot
                      ? styles.itemCardActive
                      : null,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (isEditing) {
                      setSelectedSlot(index);
                    }
                  }}
                >
                  <View style={styles.itemImageWrapper}>
                    <Image
                      source={{ uri: item.image }}
                      style={styles.itemImage}
                    />
                  </View>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.itemSubtitle} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}

          {isEditing && editableOutfit && closetOptions.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.swapRow}
            >
              {closetOptions.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.swapCard}
                  activeOpacity={0.85}
                  onPress={() => handleReplaceItem(item)}
                >
                  <Image
                    source={{ uri: item.image }}
                    style={styles.swapImage}
                  />
                  <Text style={styles.swapTitle} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}

          {filteredOutfits.length ? (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>All suggestions</Text>
                <Text style={styles.sectionNote}>Tap a card to load it</Text>
              </View>
              <View style={styles.grid}>
                {filteredOutfits.map((outfit) => (
                  <View key={outfit.id} style={styles.gridItem}>
                    <OutfitCard
                      outfit={outfit}
                      variant="compact"
                      onPress={() => handleSelectOutfit(outfit)}
                    />
                  </View>
                ))}
              </View>
            </>
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
  filterRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  dateRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  dateChip: {
    width: 72,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dateChipActive: {
    backgroundColor: theme.colors.primary,
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
  dateMonth: {
    marginTop: 2,
    fontSize: 10,
    color: theme.colors.textSoft,
  },
  dateLabelActive: {
    color: theme.colors.text,
  },
  generateButton: {
    marginTop: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    alignItems: "center",
  },
  scheduleButton: {
    marginTop: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  generateText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
  },
  scheduleText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
  },
  calendarNavRow: {
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calendarNavLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text,
  },
  calendarNavButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  calendarNavButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarNavText: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  calendarTodayButton: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarTodayText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textSoft,
  },
  calendarRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  calendarCard: {
    width: 150,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  calendarCardActive: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.card,
  },
  calendarCardSuggested: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.colors.border,
  },
  calendarDay: {
    fontSize: 10,
    color: theme.colors.textSoft,
    fontWeight: "600",
  },
  calendarDate: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 2,
  },
  calendarMonth: {
    fontSize: 10,
    color: theme.colors.textSoft,
  },
  calendarEvent: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.text,
  },
  calendarEmpty: {
    marginTop: 8,
    fontSize: 10,
    color: theme.colors.textSoft,
  },
  scheduledRow: {
    marginTop: theme.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  scheduledImage: {
    height: 28,
    width: 28,
    borderRadius: theme.radius.sm,
  },
  scheduledTitle: {
    flex: 1,
    fontSize: 10,
    color: theme.colors.textSoft,
    fontWeight: "600",
  },
  suggestedTitle: {
    flex: 1,
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: "600",
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
    marginTop: theme.spacing.md,
    fontSize: 12,
    color: theme.colors.textSoft,
  },
  successText: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    fontSize: 12,
    color: "#2E7D32",
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
  approveButton: {
    marginTop: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    alignItems: "center",
  },
  approveText: {
    fontSize: 12,
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
  sectionNote: {
    fontSize: 11,
    color: theme.colors.textSoft,
  },
  editHeader: {
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  editLink: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSoft,
  },
  editCard: {
    marginTop: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
  },
  editLabel: {
    fontSize: 11,
    color: theme.colors.textSoft,
    fontWeight: "600",
  },
  editInput: {
    marginTop: 6,
    marginBottom: theme.spacing.sm,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.chip,
    fontSize: 14,
    color: theme.colors.text,
  },
  editHint: {
    fontSize: 10,
    color: theme.colors.textSoft,
  },
  itemRow: {
    marginTop: theme.spacing.lg,
  },
  itemRowContent: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
  },
  itemCard: {
    width: 112,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  itemCardActive: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.card,
  },
  itemImageWrapper: {
    height: 54,
    width: 54,
    borderRadius: theme.radius.md,
    backgroundColor: "#F6F0E6",
    alignItems: "center",
    justifyContent: "center",
  },
  itemImage: {
    height: 44,
    width: 44,
    borderRadius: theme.radius.sm,
  },
  itemTitle: {
    marginTop: 10,
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.text,
  },
  itemSubtitle: {
    marginTop: 2,
    fontSize: 9,
    color: theme.colors.textSoft,
  },
  swapRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  swapCard: {
    width: 90,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    alignItems: "center",
  },
  swapImage: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.sm,
  },
  swapTitle: {
    marginTop: 6,
    fontSize: 9,
    color: theme.colors.textSoft,
    textAlign: "center",
  },
  sectionHeader: {
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSoft,
  },
  grid: {
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
  },
  gridItem: {
    // Leave room for `grid.gap` so 2 columns don't wrap on small screens.
    width: "46%",
  },
});
