import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import OutfitCard from "../components/OutfitCard";
import BottomNav from "../components/BottomNav";
import { theme } from "../constants/theme";
import { usePersonalScheduleEntries } from "../hooks/usePersonalScheduleEntries";
import { getAuthToken, isApiError } from "../services/apiClient";
import {
  contextApi,
  recommendationApi,
  outfitApi,
  outfitPlanApi,
} from "../services/outfitApi";
import { mapRecommendationsToOutfits } from "../utils/outfitMapper";
import { setOutfitCache } from "../utils/outfitStore";
import {
  getPersonalScheduleEntriesForDate,
  toPersonalScheduleEvents,
  toPersonalSchedulePreferences,
} from "../utils/personalSchedule";
import type {
  NormalizedClosetItem,
  NormalizedEvent,
  OutfitPlan,
  RecommendationPriorOutfit,
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

const getGeneratedDateKeyFromOutfitId = (outfitId: string) => {
  const prefix = outfitId.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(prefix) && outfitId.charAt(10) === "-") {
    return prefix;
  }
  return null;
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

const getTodayDate = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
};

const getTodayDateKey = () => formatDateKey(getTodayDate());

const getTodayMonthStart = () => {
  const today = getTodayDate();
  return new Date(today.getFullYear(), today.getMonth(), 1);
};

const toOutfitItem = (item: NormalizedClosetItem): OutfitItem => ({
  id: String(item.id),
  title: item.category || "Item",
  subtitle: item.name || "Closet pick",
  image: item.image || FALLBACK_IMAGE,
});

const toPlannedOutfit = (plan: OutfitPlan): Outfit => {
  const items =
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
    title: plan.outfit?.name || "Scheduled outfit",
    subtitle: plan.outfit?.occasion || "Planned look",
    image: items[0]?.image || FALLBACK_IMAGE,
    tags: [plan.outfit?.occasion || "Planned"],
    items,
    weather: plan.outfit?.weather || "Weather unavailable",
    mood: plan.planType || "Planned",
  };
};

const getPieceName = (item: OutfitItem) =>
  item.subtitle?.trim() || item.title?.trim() || "Wardrobe item";

const getPieceLabel = (item: OutfitItem) =>
  item.title?.trim() || "Piece";

const toRecentOutfitEntries = (
  outfits: Outfit[],
  date: Date,
  fallbackEventType?: string,
): RecommendationPriorOutfit[] => {
  const entries: RecommendationPriorOutfit[] = [];

  outfits.forEach((outfit) => {
    const itemIds = Array.from(
      new Set(
        outfit.items
          .map((item) => Number(item.id))
          .filter((itemId) => Number.isFinite(itemId)),
      ),
    );

    if (!itemIds.length) {
      return;
    }

    entries.push({
      source: "plan",
      date: date.toISOString(),
      outfitName: outfit.title,
      eventType: fallbackEventType,
      itemIds,
    });
  });

  return entries;
};
export default function OutfitSuggestionsScreen() {
  const router = useRouter();
  const calendarScrollRef = useRef<ScrollView | null>(null);
  const datePickerScrollRef = useRef<ScrollView | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiOutfits, setApiOutfits] = useState<Outfit[]>([]);
  const [closetItems, setClosetItems] = useState<NormalizedClosetItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<NormalizedEvent[]>([]);
  const [scheduledOutfits, setScheduledOutfits] = useState<
    Record<string, { planId: number; outfit: Outfit }>
  >({});
  const [generatedOutfitsByDate, setGeneratedOutfitsByDate] = useState<Record<string, Outfit>>({});
  const [savedOutfitIds, setSavedOutfitIds] = useState<Record<string, number>>({});
  const [approvalAction, setApprovalAction] = useState<{
    id: string;
    type: "approve" | "cancel";
  } | null>(null);
  const [dismissingOutfitId, setDismissingOutfitId] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(
    () => new Set([getTodayDateKey()]),
  );
  const [generating, setGenerating] = useState(false);
  const { entries: personalScheduleEntries } = usePersonalScheduleEntries();
  const heroOutfit = apiOutfits[0];
  const [editableOutfit, setEditableOutfit] = useState<Outfit | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const calendarToken = process.env.EXPO_PUBLIC_CALENDAR_TOKEN?.trim();
  const getLocalOutfitId = (outfit: Outfit) => String(outfit.id);
  const getSavedOutfitId = (outfit: Outfit) => savedOutfitIds[getLocalOutfitId(outfit)];
  const isOutfitApproved = (outfit: Outfit) => Boolean(getSavedOutfitId(outfit));
  const isOutfitScheduled = (outfit: Outfit) => {
    const savedId = getSavedOutfitId(outfit);
    if (!savedId) return false;
    return Object.values(scheduledOutfits).some(
      (entry) => Number(entry.outfit.id) === savedId,
    );
  };
  const getApprovalAction = (outfit: Outfit) =>
    approvalAction?.id === getLocalOutfitId(outfit) ? approvalAction.type : null;
  const isDismissingOutfit = (outfit: Outfit) =>
    dismissingOutfitId === getLocalOutfitId(outfit);

  const [calendarMonth, setCalendarMonth] = useState(getTodayMonthStart);
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
  const todayDateKey = getTodayDateKey();
  const isCurrentMonth =
    calendarMonth.getFullYear() === getTodayDate().getFullYear() &&
    calendarMonth.getMonth() === getTodayDate().getMonth();

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
    setCalendarMonth(getTodayMonthStart());
    setSelectedDates(new Set([todayDateKey]));
  };

  const scrollToToday = useCallback(
    (animated: boolean) => {
      if (!isCurrentMonth) return;

      const todayIndex = calendarDays.findIndex((day) => day.key === todayDateKey);
      if (todayIndex < 0) return;

      requestAnimationFrame(() => {
        calendarScrollRef.current?.scrollTo({
          x: Math.max(0, todayIndex * (150 + theme.spacing.sm) - theme.spacing.lg),
          animated,
        });
        datePickerScrollRef.current?.scrollTo({
          x: Math.max(0, todayIndex * (72 + theme.spacing.sm) - theme.spacing.lg),
          animated,
        });
      });
    },
    [calendarDays, isCurrentMonth, todayDateKey],
  );
  const selectedSwapCategory = useMemo(() => {
    if (!isEditing) return null;
    const selectedItem = editableOutfit?.items?.[selectedSlot];
    if (!selectedItem) return null;

    const selectedId = Number(String(selectedItem.id).split("-")[0]);
    if (!Number.isFinite(selectedId)) {
      return selectedItem.title || null;
    }

    const matched = closetItems.find((item) => item.id === selectedId);
    return matched?.category || selectedItem.title || null;
  }, [closetItems, editableOutfit, isEditing, selectedSlot]);

  const swapOptions = useMemo<OutfitItem[]>(() => {
    if (!closetItems.length) return [];
    const all = closetItems.map(toOutfitItem);
    if (!isEditing) return all;

    const selectedItem = editableOutfit?.items?.[selectedSlot];
    if (!selectedItem) return all;

    const selectedId = Number(String(selectedItem.id).split("-")[0]);
    if (!Number.isFinite(selectedId)) {
      return all;
    }

    const matched = closetItems.find((item) => item.id === selectedId);
    const matchedCategoryId = matched?.categoryId;

    if (matchedCategoryId) {
      return closetItems
        .filter((item) => item.categoryId === matchedCategoryId)
        .map(toOutfitItem);
    }

    const matchedCategory = (matched?.category || selectedItem.title || "").trim();
    if (!matchedCategory) return all;

    const normalized = matchedCategory.toLowerCase();
    return closetItems
      .filter((item) => (item.category || "").toLowerCase() === normalized)
      .map(toOutfitItem);
  }, [closetItems, editableOutfit, isEditing, selectedSlot]);

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
    calendarDays.forEach((day) => {
      const personalEvents = toPersonalScheduleEvents(
        personalScheduleEntries,
        day.date,
      );
      if (!personalEvents.length) return;
      map[day.key] = map[day.key]
        ? [...map[day.key], ...personalEvents]
        : personalEvents;
    });
    return map;
  }, [calendarDays, calendarEvents, personalScheduleEntries]);

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
      const outfit = toPlannedOutfit(plan);
      mapped[dateKey] = { planId: plan.id, outfit };
    });
    return mapped;
  };

  useFocusEffect(
    useCallback(() => {
      setCalendarMonth(getTodayMonthStart());
      setSelectedDates(new Set([getTodayDateKey()]));
    }, []),
  );

  useEffect(() => {
    scrollToToday(false);
  }, [scrollToToday]);

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

  const updateEditableOutfit = (updater: (prev: Outfit) => Outfit) => {
    setEditableOutfit((prev) => (prev ? updater(prev) : prev));
  };

  const pinGeneratedOutfitForDate = (outfit: Outfit) => {
    const dateKey = getGeneratedDateKeyFromOutfitId(String(outfit.id));
    if (!dateKey) return;

    setGeneratedOutfitsByDate((prev) => ({
      ...prev,
      [dateKey]: outfit,
    }));
  };

  const syncEditedOutfit = (outfit: Outfit) => {
    setApiOutfits((prev) => {
      const updated = prev.map((item) =>
        item.id === outfit.id ? outfit : item,
      );
      setOutfitCache(updated);
      return updated;
    });

    const dateKey = getGeneratedDateKeyFromOutfitId(String(outfit.id));
    if (!dateKey) return;

    setGeneratedOutfitsByDate((prev) => {
      if (!prev[dateKey]) return prev;
      return {
        ...prev,
        [dateKey]: outfit,
      };
    });
  };

  const removeGeneratedOutfit = (outfit: Outfit) => {
    const localId = getLocalOutfitId(outfit);
    const dateKey = getGeneratedDateKeyFromOutfitId(localId);

    setApiOutfits((prev) => {
      const next = prev.filter((item) => getLocalOutfitId(item) !== localId);
      setOutfitCache(next);

      setGeneratedOutfitsByDate((prevByDate) => {
        if (!dateKey) return prevByDate;

        const currentForDate = prevByDate[dateKey];
        if (currentForDate && getLocalOutfitId(currentForDate) !== localId) {
          return prevByDate;
        }

        const replacement = next.find(
          (item) => getGeneratedDateKeyFromOutfitId(getLocalOutfitId(item)) === dateKey,
        );

        if (!replacement) {
          const updated = { ...prevByDate };
          delete updated[dateKey];
          return updated;
        }

        return {
          ...prevByDate,
          [dateKey]: replacement,
        };
      });

      setEditableOutfit((current) => {
        if (!next.length) return null;
        if (current && getLocalOutfitId(current) !== localId) {
          const stillVisible = next.find(
            (item) => getLocalOutfitId(item) === getLocalOutfitId(current),
          );
          if (stillVisible) {
            return stillVisible;
          }
        }

        if (dateKey) {
          const sameDayReplacement = next.find(
            (item) => getGeneratedDateKeyFromOutfitId(getLocalOutfitId(item)) === dateKey,
          );
          if (sameDayReplacement) {
            return sameDayReplacement;
          }
        }

        return next[0];
      });

      return next;
    });

    setSavedOutfitIds((prev) => {
      if (!(localId in prev)) return prev;
      const next = { ...prev };
      delete next[localId];
      return next;
    });
    setApprovalAction((prev) => (prev?.id === localId ? null : prev));
    setSelectedSlot(0);
    setIsEditing(false);
  };

  const handleToggleEdit = () => {
    if (!editableOutfit) return;
    if (isEditing) {
      syncEditedOutfit(editableOutfit);
      setIsEditing(false);
      return;
    }

    setIsEditing(true);
  };

  const handleReplaceItem = (replacement: OutfitItem) => {
    updateEditableOutfit((prev) => {
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

    return created.id;
  };

  const scheduleOutfitForDate = async (
    outfit: Outfit,
    dateKey: string,
    date: Date,
    existingPlanId?: number,
  ) => {
    pinGeneratedOutfitForDate(outfit);
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
    const generatedDateKey = getGeneratedDateKeyFromOutfitId(String(outfit.id));
    if (generatedDateKey && generatedDateKey !== dateKey) {
      showNotice(
        "Wrong day selected",
        "This outfit belongs to another day. Pick the suggestion for this date before scheduling.",
      );
      return;
    }
    if (!getAuthToken()) {
      showAuthRequired("Please sign in to schedule outfits.");
      return;
    }

    try {
      setLoading(true);
      await scheduleOutfitForDate(outfit, dateKey, date, existingPlanId);
    } catch (err) {
      showNotice(
        "Unable to schedule outfit",
        err instanceof Error ? err.message : "Failed to schedule outfit.",
      );
    } finally {
      setLoading(false);
    }
  };

  const scheduleGeneratedOutfits = async (replaceExisting: boolean) => {
    const keys = Object.keys(generatedOutfitsByDate).sort();
    if (keys.length === 0) {
      showNotice("No outfits to schedule", "Generate outfits before scheduling.");
      return;
    }
    if (!getAuthToken()) {
      showAuthRequired("Please sign in to schedule outfits.");
      return;
    }

    try {
      setLoading(true);

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
        showNotice(
          "Nothing changed",
          replaceExisting
            ? "No outfits were scheduled. Try generating again."
            : "All generated days are already scheduled.",
        );
        return;
      }

      setScheduledOutfits((prev) => ({ ...prev, ...newEntries }));
      setOutfitCache(entries.map((entry) => entry.outfit));
      showNotice("Schedule updated", `Scheduled ${entries.length} outfit(s).`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to schedule outfits.";
      showNotice("Unable to schedule outfits", message);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleGeneratedPress = () => {
    const keys = Object.keys(generatedOutfitsByDate).sort();
    if (keys.length === 0) {
      showNotice("No outfits to schedule", "Generate outfits before scheduling.");
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
      showAuthRequired("Please sign in to manage your schedule.");
      return;
    }
    try {
      setLoading(true);
      await outfitPlanApi.deletePlan(planId);
      setScheduledOutfits((prev) => {
        const next = { ...prev };
        delete next[dateKey];
        return next;
      });
    } catch (err) {
      showNotice(
        "Unable to remove scheduled outfit",
        err instanceof Error ? err.message : "Failed to remove scheduled outfit.",
      );
    } finally {
      setLoading(false);
    }
  };

  const getSchedulableOutfitForDate = (dateKey: string) => {
    const suggested = generatedOutfitsByDate[dateKey];
    if (!editableOutfit) {
      return suggested ?? null;
    }

    const editableDateKey = getGeneratedDateKeyFromOutfitId(String(editableOutfit.id));
    if (editableDateKey === dateKey) {
      return editableOutfit;
    }

    return suggested ?? null;
  };

  const handlePressCalendarDay = (dateKey: string, date: Date) => {
    const scheduled = scheduledOutfits[dateKey];
    const outfitForDate = getSchedulableOutfitForDate(dateKey);
    if (!scheduled) {
      if (!outfitForDate) {
        showNotice("No outfit selected", "Generate an outfit before scheduling.");
        return;
      }

      void handleScheduleOutfit(dateKey, date, undefined, outfitForDate);
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
            const replacement = outfitForDate;
            if (!replacement) {
              showNotice(
                "No outfit selected",
                "Select or generate an outfit for this day before replacing.",
              );
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
    pinGeneratedOutfitForDate(outfit);
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
      showAuthRequired("Please sign in to load outfit recommendations.");
      return;
    }
    if (selectedDates.size === 0) {
      showNotice("Select a day", "Select at least one day to generate outfits.");
      return;
    }
    setGenerating(true);
    try {
      setSavedOutfitIds({});
      setGeneratedOutfitsByDate({});
      const closet = await contextApi.getCloset();
      if (!closet.length) {
        showClosetRequired("Add items to your closet to unlock suggestions.");
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
      const recentGeneratedOutfits: RecommendationPriorOutfit[] = [];
      for (const day of orderedDates) {
        const weather = await contextApi.getWeather({
          lat: 10.8231,
          lon: 106.6297,
          datetime: day.date.toISOString(),
        });
        const personalEntriesForDay = getPersonalScheduleEntriesForDate(
          personalScheduleEntries,
          day.date,
        );
        const dayEvents = eventsByDate[day.key] || [];
        const preferences = toPersonalSchedulePreferences(personalEntriesForDay);
        const rec = await recommendationApi.recommendByContext({
          weather,
          closet,
          calendar: dayEvents.length ? dayEvents : undefined,
          preferences: preferences.length ? preferences : undefined,
          planDate: day.date.toISOString(),
          recentOutfits: recentGeneratedOutfits.length
            ? recentGeneratedOutfits
            : undefined,
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
          recentGeneratedOutfits.push(
            ...toRecentOutfitEntries(mapped, day.date, dayEvents[0]?.eventType),
          );
        }
      }

      setApiOutfits(results);
      setGeneratedOutfitsByDate(suggestionsByDate);
      setClosetItems(closet);
      setOutfitCache(results);
      const firstKey = orderedDates[0]?.key;
      setEditableOutfit(
        firstKey ? suggestionsByDate[firstKey] ?? results[0] ?? null : results[0] ?? null,
      );
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        showAuthRequired("Please sign in to load outfit recommendations.");
      } else if (isApiError(err) && err.status === 400 && err.message.includes("Closet")) {
        showClosetRequired("Add items to your closet to unlock suggestions.");
      } else {
        showNotice(
          "Unable to generate outfits",
          err instanceof Error ? err.message : "Failed to generate",
        );
      }
      setApiOutfits([]);
      setGeneratedOutfitsByDate({});
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async () => {
    if (!editableOutfit) return;
    if (!getAuthToken()) {
      showAuthRequired("Please sign in to approve outfits.");
      return;
    }

    const localId = getLocalOutfitId(editableOutfit);
    setApprovalAction({ id: localId, type: "approve" });
    try {
      await ensureSavedOutfitId(editableOutfit);
      showNotice("Outfit approved", "Saved to your outfits and ready for scheduling.");
    } catch (err) {
      showNotice(
        "Unable to save outfit",
        err instanceof Error ? err.message : "Failed to save outfit.",
      );
    } finally {
      setApprovalAction((prev) => (prev?.id === localId ? null : prev));
    }
  };

  const handleDismissGenerated = () => {
    if (!editableOutfit || isOutfitApproved(editableOutfit)) return;

    const localId = getLocalOutfitId(editableOutfit);
    Alert.alert(
      "Cancel outfit",
      "Remove this generated outfit from the current suggestions?",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel outfit",
          style: "destructive",
          onPress: () => {
            setDismissingOutfitId(localId);
            removeGeneratedOutfit(editableOutfit);
            setDismissingOutfitId((current) =>
              current === localId ? null : current,
            );
          },
        },
      ],
      { cancelable: true },
    );
  };

  const handleCancelApproval = () => {
    if (!editableOutfit) return;
    const localId = getLocalOutfitId(editableOutfit);
    const savedId = savedOutfitIds[localId];
    if (!savedId) return;

    if (isOutfitScheduled(editableOutfit)) {
      showNotice(
        "Cannot cancel approval",
        "This outfit is already scheduled. Remove it from the schedule first.",
      );
      return;
    }

    Alert.alert(
      "Cancel approval",
      "Remove this saved outfit from your approved outfits?",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel approval",
          style: "destructive",
          onPress: async () => {
            setApprovalAction({ id: localId, type: "cancel" });
            try {
              await outfitApi.deleteOutfit(savedId);
              setSavedOutfitIds((prev) => {
                const next = { ...prev };
                delete next[localId];
                return next;
              });
              showNotice("Approval cancelled", "This outfit is no longer saved.");
            } catch (err) {
              showNotice(
                "Unable to cancel approval",
                err instanceof Error ? err.message : "Failed to cancel approval.",
              );
            } finally {
              setApprovalAction((prev) =>
                prev?.id === localId ? null : prev,
              );
            }
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
            ref={calendarScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.calendarRow}
          >
            {calendarDays.map((day) => {
              const isToday = day.key === todayDateKey;
              const events = eventsByDate[day.key] || [];
              const scheduled = scheduledOutfits[day.key];
              const suggested = generatedOutfitsByDate[day.key];
              const showSuggested = Boolean(suggested) && !scheduled;
              return (
                <TouchableOpacity
                  key={day.key}
                  style={[
                    styles.calendarCard,
                    isToday && styles.calendarCardToday,
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
                  ) : scheduled ? (
                    <Text style={styles.calendarEvent} numberOfLines={1}>
                      Scheduled outfit
                    </Text>
                  ) : showSuggested ? (
                    <Text style={styles.calendarEvent} numberOfLines={1}>
                      Suggested outfit
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

          <View style={styles.personalScheduleCard}>
            <View style={styles.personalScheduleHeader}>
              <View>
                <Text style={styles.personalScheduleTitle}>Personal schedule</Text>
                <Text style={styles.personalScheduleSubtitle}>
                  {personalScheduleEntries.length
                    ? `${personalScheduleEntries.length} routine(s) will guide AI on matching days.`
                    : "Add recurring routines so AI understands your weekly rhythm."}
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.push("/personal-schedule")}>
                <Text style={styles.personalScheduleLink}>Manage</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pick a day</Text>
            <Text style={styles.sectionNote}>Generate for this date</Text>
          </View>
          <ScrollView
            key={`pick-${calendarMonthLabel}`}
            ref={datePickerScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateRow}
          >
            {calendarDays.map((day) => {
              const isToday = day.key === todayDateKey;
              const active = selectedDates.has(day.key);
              return (
                <TouchableOpacity
                  key={day.key}
                  style={[
                    styles.dateChip,
                    isToday && styles.dateChipToday,
                    active && styles.dateChipActive,
                  ]}
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
          ) : null}

          {editableOutfit ? (
            <OutfitCard
              outfit={editableOutfit}
              onPress={() => router.push(`/outfit/${editableOutfit.id}`)}
            />
          ) : null}
          {editableOutfit ? (
            isOutfitApproved(editableOutfit) ? (
              <View style={styles.approvalStatusCard}>
                <View style={styles.approvalStatusHeader}>
                  <View style={styles.approvalBadge}>
                    <Text style={styles.approvalBadgeText}>Approved</Text>
                  </View>
                  {isOutfitScheduled(editableOutfit) ? (
                    <View style={[styles.approvalBadge, styles.approvalBadgeMuted]}>
                      <Text style={styles.approvalBadgeText}>Scheduled</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.approvalStatusTitle}>
                  {isOutfitScheduled(editableOutfit)
                    ? "Approved and already scheduled"
                    : "Approved and ready to schedule"}
                </Text>
                <Text style={styles.approvalStatusSubtitle}>
                  {isOutfitScheduled(editableOutfit)
                    ? "This look is already tied to your schedule. Remove it from schedule before cancelling approval."
                    : "This look is saved to your outfits. You can keep it for later or cancel approval."}
                </Text>
                {isOutfitScheduled(editableOutfit) ? (
                  <TouchableOpacity
                    style={styles.scheduleManageButton}
                    onPress={() => router.push("/plans")}
                  >
                    <Text style={styles.scheduleManageText}>Open schedule</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.cancelApprovalButton,
                      getApprovalAction(editableOutfit) === "cancel" &&
                        styles.buttonDisabled,
                    ]}
                    onPress={handleCancelApproval}
                    disabled={Boolean(getApprovalAction(editableOutfit))}
                  >
                    {getApprovalAction(editableOutfit) === "cancel" ? (
                      <ActivityIndicator color="#C44536" />
                    ) : (
                      <Text style={styles.cancelApprovalText}>Cancel approval</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.editableActionRow}>
                <TouchableOpacity
                  style={[
                    styles.approveButton,
                    styles.editableActionButton,
                    getApprovalAction(editableOutfit) === "approve" &&
                      styles.buttonDisabled,
                  ]}
                  onPress={handleApprove}
                  disabled={
                    Boolean(getApprovalAction(editableOutfit)) ||
                    isDismissingOutfit(editableOutfit)
                  }
                >
                  {getApprovalAction(editableOutfit) === "approve" ? (
                    <ActivityIndicator color={theme.colors.text} />
                  ) : (
                    <Text style={styles.approveText}>Approve outfit</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.cancelGeneratedButton,
                    styles.editableActionButton,
                    isDismissingOutfit(editableOutfit) && styles.buttonDisabled,
                  ]}
                  onPress={handleDismissGenerated}
                  disabled={
                    Boolean(getApprovalAction(editableOutfit)) ||
                    isDismissingOutfit(editableOutfit)
                  }
                >
                  {isDismissingOutfit(editableOutfit) ? (
                    <ActivityIndicator color="#C44536" />
                  ) : (
                    <Text style={styles.cancelGeneratedText}>Cancel</Text>
                  )}
                </TouchableOpacity>
              </View>
            )
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
                  updateEditableOutfit((prev) => ({ ...prev, title: text }))
                }
              />
              <Text style={styles.editLabel}>Short note</Text>
              <TextInput
                style={styles.editInput}
                value={editableOutfit.subtitle}
                onChangeText={(text) =>
                  updateEditableOutfit((prev) => ({ ...prev, subtitle: text }))
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
                  <View style={styles.itemCardHeader}>
                    <View style={styles.itemBadge}>
                      <Text style={styles.itemBadgeText} numberOfLines={1}>
                        {getPieceLabel(item)}
                      </Text>
                    </View>
                    {isEditing && index === selectedSlot ? (
                      <View style={[styles.itemBadge, styles.itemBadgeActive]}>
                        <Text style={styles.itemBadgeTextActive}>Selected</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.itemImageWrapper}>
                    <Image
                      source={{ uri: item.image }}
                      style={styles.itemImage}
                    />
                  </View>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {getPieceName(item)}
                  </Text>
                  {getPieceName(item) !== getPieceLabel(item) ? (
                    <Text style={styles.itemSubtitle} numberOfLines={1}>
                      {getPieceLabel(item)}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}

          {isEditing && editableOutfit ? (
            swapOptions.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.swapRow}
              >
                {swapOptions.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.swapCard}
                    activeOpacity={0.85}
                    onPress={() => handleReplaceItem(item)}
                  >
                    <View style={styles.swapBadge}>
                      <Text style={styles.swapBadgeText} numberOfLines={1}>
                        {getPieceLabel(item)}
                      </Text>
                    </View>
                    <Image source={{ uri: item.image }} style={styles.swapImage} />
                    <Text style={styles.swapTitle} numberOfLines={1}>
                      {getPieceName(item)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.swapEmptyCard}>
                <Text style={styles.swapEmptyText}>
                  {selectedSwapCategory
                    ? `No items found for ${selectedSwapCategory}.`
                    : "No items available to swap."}
                </Text>
              </View>
            )
          ) : null}

          {apiOutfits.length ? (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>All suggestions</Text>
                <Text style={styles.sectionNote}>Tap a card to load it</Text>
              </View>
              <View style={styles.grid}>
                {apiOutfits.map((outfit) => (
                  <View key={outfit.id} style={styles.gridItem}>
                    <OutfitCard
                      outfit={outfit}
                      variant="compact"
                      onPress={() => handleSelectOutfit(outfit)}
                    />
                    {isOutfitApproved(outfit) ? (
                      <View style={styles.suggestionStatusRow}>
                        <View style={styles.suggestionStatusBadge}>
                          <Text style={styles.suggestionStatusText}>Approved</Text>
                        </View>
                        {isOutfitScheduled(outfit) ? (
                          <View
                            style={[
                              styles.suggestionStatusBadge,
                              styles.suggestionStatusBadgeMuted,
                            ]}
                          >
                            <Text style={styles.suggestionStatusText}>Scheduled</Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
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
    borderWidth: 1,
    borderColor: "transparent",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dateChipToday: {
    borderColor: theme.colors.accent,
  },
  dateChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
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
  personalScheduleCard: {
    marginTop: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  personalScheduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  personalScheduleTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text,
  },
  personalScheduleSubtitle: {
    marginTop: 4,
    fontSize: 11,
    color: theme.colors.textSoft,
  },
  personalScheduleLink: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textSoft,
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
  calendarCardToday: {
    borderWidth: 1,
    borderColor: theme.colors.accent,
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
  emptyText: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    fontSize: 12,
    color: theme.colors.textSoft,
  },
  editableActionRow: {
    marginTop: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  editableActionButton: {
    flex: 1,
  },
  approveButton: {
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
  approvalStatusCard: {
    marginTop: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  approvalStatusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  approvalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
  },
  approvalBadgeMuted: {
    backgroundColor: theme.colors.card,
  },
  approvalBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.text,
  },
  approvalStatusTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text,
  },
  approvalStatusSubtitle: {
    fontSize: 11,
    lineHeight: 17,
    color: theme.colors.textSoft,
  },
  cancelApprovalButton: {
    minHeight: 40,
    borderRadius: theme.radius.pill,
    backgroundColor: "#FCE8E6",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelApprovalText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#C44536",
  },
  cancelGeneratedButton: {
    backgroundColor: "#FCE8E6",
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    alignItems: "center",
  },
  cancelGeneratedText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#C44536",
  },
  scheduleManageButton: {
    minHeight: 40,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  scheduleManageText: {
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
    width: 128,
    padding: 10,
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
  itemCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.xs,
  },
  itemBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.chip,
    maxWidth: "100%",
  },
  itemBadgeActive: {
    backgroundColor: theme.colors.primary,
  },
  itemBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: theme.colors.textSoft,
  },
  itemBadgeTextActive: {
    fontSize: 9,
    fontWeight: "700",
    color: theme.colors.text,
  },
  itemImageWrapper: {
    marginTop: 10,
    height: 82,
    width: "100%",
    borderRadius: theme.radius.md,
    backgroundColor: "#F6F0E6",
    alignItems: "center",
    justifyContent: "center",
  },
  itemImage: {
    height: 62,
    width: 62,
    borderRadius: theme.radius.sm,
  },
  itemTitle: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
  },
  itemSubtitle: {
    marginTop: 2,
    fontSize: 10,
    color: theme.colors.textSoft,
  },
  swapRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  swapEmptyCard: {
    marginTop: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  swapEmptyText: {
    fontSize: 12,
    color: theme.colors.textSoft,
    textAlign: "center",
  },
  swapCard: {
    width: 90,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    alignItems: "center",
  },
  swapBadge: {
    alignSelf: "stretch",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.chip,
  },
  swapBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: theme.colors.textSoft,
    textAlign: "center",
  },
  swapImage: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.sm,
    marginTop: 8,
  },
  swapTitle: {
    marginTop: 6,
    fontSize: 10,
    color: theme.colors.text,
    fontWeight: "600",
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
  suggestionStatusRow: {
    marginTop: theme.spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  suggestionStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.card,
  },
  suggestionStatusBadgeMuted: {
    backgroundColor: "#FFF4CC",
  },
  suggestionStatusText: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.text,
  },
});
