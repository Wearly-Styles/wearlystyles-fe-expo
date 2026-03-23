import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import { theme } from "../constants/theme";
import { usePersonalScheduleEntries } from "../hooks/usePersonalScheduleEntries";
import {
  PERSONAL_DAY_OPTIONS,
  PERSONAL_EVENT_TYPES,
  PERSONAL_STYLE_TYPES,
  PersonalScheduleEntry,
  formatPersonalScheduleDays,
  formatPersonalScheduleTime,
  savePersonalScheduleEntries,
} from "../utils/personalSchedule";
import { showErrorToast, showInfoToast, showSuccessToast } from "../utils/toast";

type PersonalScheduleForm = {
  title: string;
  eventType: string;
  preferredStyle: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  location: string;
  note: string;
};

const DAY_PRESETS = [
  { label: "Weekdays", value: [1, 2, 3, 4, 5] },
  { label: "Weekend", value: [0, 6] },
  { label: "Daily", value: [0, 1, 2, 3, 4, 5, 6] },
] as const;

const EVENT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Work: "briefcase-outline",
  Study: "school-outline",
  Event: "sparkles-outline",
  Casual: "cafe-outline",
  Party: "wine-outline",
};

const STYLE_HINTS: Record<string, string> = {
  Casual: "Easy and everyday",
  Minimal: "Clean and understated",
  Formal: "Sharp and polished",
  Sporty: "Active and light",
  Chic: "Styled and expressive",
};

const createEmptyForm = (): PersonalScheduleForm => ({
  title: "",
  eventType: PERSONAL_EVENT_TYPES[0],
  preferredStyle: PERSONAL_STYLE_TYPES[0],
  daysOfWeek: [new Date().getDay()],
  startTime: "08:00",
  endTime: "18:00",
  location: "",
  note: "",
});

const isValidTime = (value: string) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);

const areSameDays = (left: number[], right: number[]) => {
  const sortedLeft = [...left].sort((a, b) => a - b);
  const sortedRight = [...right].sort((a, b) => a - b);
  return (
    sortedLeft.length === sortedRight.length &&
    sortedLeft.every((value, index) => value === sortedRight[index])
  );
};

const getEventIcon = (eventType: string) =>
  EVENT_ICONS[eventType] || "calendar-outline";

export default function PersonalScheduleScreen() {
  const router = useRouter();
  const [form, setForm] = useState<PersonalScheduleForm>(createEmptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(true);
  const { entries, setEntries, loading } = usePersonalScheduleEntries();

  const coveredDaysCount = useMemo(
    () => new Set(entries.flatMap((entry) => entry.daysOfWeek)).size,
    [entries],
  );
  const routineTypesCount = useMemo(
    () => new Set(entries.map((entry) => entry.eventType)).size,
    [entries],
  );
  const selectedDaysLabel = useMemo(
    () => formatPersonalScheduleDays(form.daysOfWeek),
    [form.daysOfWeek],
  );

  useEffect(() => {
    if (!loading && !entries.length) {
      setIsComposerOpen(true);
    }
  }, [entries.length, loading]);

  const resetForm = () => {
    setForm(createEmptyForm());
    setEditingId(null);
  };

  const openComposer = () => {
    resetForm();
    setIsComposerOpen(true);
  };

  const closeComposer = () => {
    resetForm();
    if (entries.length) {
      setIsComposerOpen(false);
    }
  };

  const toggleDay = (value: number) => {
    setForm((prev) => {
      const exists = prev.daysOfWeek.includes(value);
      const nextDays = exists
        ? prev.daysOfWeek.filter((day) => day !== value)
        : [...prev.daysOfWeek, value].sort((left, right) => left - right);
      return { ...prev, daysOfWeek: nextDays };
    });
  };

  const applyDayPreset = (daysOfWeek: number[]) => {
    setForm((prev) => ({ ...prev, daysOfWeek: [...daysOfWeek] }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      showErrorToast("Enter a short name for this routine.", {
        title: "Routine name required",
      });
      return;
    }
    if (!form.daysOfWeek.length) {
      showErrorToast("Choose at least one repeat day.", {
        title: "Select a day",
      });
      return;
    }
    if (!isValidTime(form.startTime) || !isValidTime(form.endTime)) {
      showErrorToast("Use HH:MM format, for example 08:30.", {
        title: "Time format invalid",
      });
      return;
    }

    setSaving(true);
    try {
      const nextEntry: PersonalScheduleEntry = {
        id: editingId || `${Date.now()}`,
        title: form.title.trim(),
        eventType: form.eventType,
        preferredStyle: form.preferredStyle,
        daysOfWeek: [...form.daysOfWeek].sort((left, right) => left - right),
        startTime: form.startTime,
        endTime: form.endTime,
        location: form.location.trim() || undefined,
        note: form.note.trim() || undefined,
        isActive: true,
      };

      const nextEntries = editingId
        ? entries.map((entry) => (entry.id === editingId ? nextEntry : entry))
        : [...entries, nextEntry];

      const saved = await savePersonalScheduleEntries(nextEntries);
      setEntries(saved);
      resetForm();
      setIsComposerOpen(false);
      showSuccessToast(
        editingId
          ? "AI will use the updated routine in future suggestions."
          : "AI can now use this routine in future suggestions.",
        { title: editingId ? "Routine updated" : "Routine saved" },
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (entry: PersonalScheduleEntry) => {
    setEditingId(entry.id);
    setForm({
      title: entry.title,
      eventType: entry.eventType,
      preferredStyle: entry.preferredStyle,
      daysOfWeek: entry.daysOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime || "18:00",
      location: entry.location || "",
      note: entry.note || "",
    });
    setIsComposerOpen(true);
  };

  const handleDelete = (entryId: string) => {
    Alert.alert("Delete routine", "Remove this routine from your weekly plan?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const nextEntries = entries.filter((entry) => entry.id !== entryId);
            const saved = await savePersonalScheduleEntries(nextEntries);
            setEntries(saved);
            if (editingId === entryId) {
              resetForm();
            }
            if (!saved.length) {
              setIsComposerOpen(true);
            }
            showInfoToast("This routine was removed from your weekly plan.", {
              title: "Routine deleted",
            });
          } catch {
            showErrorToast("We couldn't remove this routine.", {
              title: "Routine not deleted",
            });
          }
        },
      },
    ]);
  };

  const headerAction = entries.length ? (
    <TouchableOpacity style={styles.headerAction} onPress={openComposer}>
      <Ionicons name="add" size={18} color={theme.colors.text} />
    </TouchableOpacity>
  ) : undefined;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <AppHeader
            title="Personal Schedule"
            subtitle="Set recurring routines once so AI has better daily context."
            onBackPress={() => router.back()}
            rightAction={headerAction}
          />

          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroIconWrap}>
                <Ionicons
                  name="calendar-clear-outline"
                  size={22}
                  color={theme.colors.text}
                />
              </View>
              <View style={styles.heroTextWrap}>
                <Text style={styles.heroEyebrow}>Weekly planning input</Text>
                <Text style={styles.heroTitle}>Tell AI what your week usually looks like</Text>
                <Text style={styles.heroText}>
                  Add repeat plans like office days, classes, coffee dates, or event
                  nights. The app will reuse them across Home, Suggestions, and Outfit
                  Schedule.
                </Text>
              </View>
            </View>
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{entries.length}</Text>
                <Text style={styles.heroStatLabel}>routines</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{coveredDaysCount}</Text>
                <Text style={styles.heroStatLabel}>days covered</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{routineTypesCount}</Text>
                <Text style={styles.heroStatLabel}>event types</Text>
              </View>
            </View>
          </View>

          {!isComposerOpen ? (
            <TouchableOpacity
              style={styles.launchCard}
              activeOpacity={0.9}
              onPress={openComposer}
            >
              <View style={styles.launchIconWrap}>
                <Ionicons name="add-circle-outline" size={22} color={theme.colors.text} />
              </View>
              <View style={styles.launchTextWrap}>
                <Text style={styles.launchTitle}>Add another routine</Text>
                <Text style={styles.launchSubtitle}>
                  Create a repeat plan for work, campus, errands, or evenings out.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textSoft} />
            </TouchableOpacity>
          ) : (
            <View style={styles.builderCard}>
              <View style={styles.builderHeader}>
                <View style={styles.builderTitleWrap}>
                  <Text style={styles.builderTitle}>
                    {editingId ? "Edit routine" : "New routine"}
                  </Text>
                  <Text style={styles.builderSubtitle}>
                    Keep it short and repeatable. AI will reuse this every selected day.
                  </Text>
                </View>
                {entries.length ? (
                  <TouchableOpacity
                    style={styles.closeBuilderButton}
                    onPress={closeComposer}
                  >
                    <Ionicons name="close" size={18} color={theme.colors.textSoft} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Routine name</Text>
                <TextInput
                  value={form.title}
                  onChangeText={(title) => setForm((prev) => ({ ...prev, title }))}
                  placeholder="Morning office, Friday cafe, campus day..."
                  placeholderTextColor={theme.colors.textSoft}
                  style={styles.input}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
                <Text style={styles.helperText}>
                  This is what you will see on calendar cards and AI summaries.
                </Text>
              </View>

              <View style={styles.fieldBlock}>
                <View style={styles.inlineLabelRow}>
                  <Text style={styles.label}>Repeat days</Text>
                  <Text style={styles.inlineValue}>{selectedDaysLabel}</Text>
                </View>
                <View style={styles.presetRow}>
                  {DAY_PRESETS.map((preset) => {
                    const active = areSameDays(form.daysOfWeek, [...preset.value]);
                    return (
                      <TouchableOpacity
                        key={preset.label}
                        style={[styles.presetChip, active && styles.presetChipActive]}
                        onPress={() => applyDayPreset([...preset.value])}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            styles.presetChipText,
                            active && styles.presetChipTextActive,
                          ]}
                        >
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={styles.dayRow}>
                  {PERSONAL_DAY_OPTIONS.map((day) => {
                    const active = form.daysOfWeek.includes(day.value);
                    return (
                      <TouchableOpacity
                        key={day.label}
                        style={[styles.dayChip, active && styles.dayChipActive]}
                        onPress={() => toggleDay(day.value)}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            styles.dayChipText,
                            active && styles.dayChipTextActive,
                          ]}
                        >
                          {day.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Event type</Text>
                <View style={styles.optionGrid}>
                  {PERSONAL_EVENT_TYPES.map((eventType) => {
                    const active = form.eventType === eventType;
                    return (
                      <TouchableOpacity
                        key={eventType}
                        style={[styles.optionCard, active && styles.optionCardActive]}
                        onPress={() => setForm((prev) => ({ ...prev, eventType }))}
                        activeOpacity={0.9}
                      >
                        <View
                          style={[
                            styles.optionIconWrap,
                            active && styles.optionIconWrapActive,
                          ]}
                        >
                          <Ionicons
                            name={getEventIcon(eventType)}
                            size={18}
                            color={theme.colors.text}
                          />
                        </View>
                        <Text
                          style={[
                            styles.optionTitle,
                            active && styles.optionTitleActive,
                          ]}
                        >
                          {eventType}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Preferred style</Text>
                <View style={styles.optionGrid}>
                  {PERSONAL_STYLE_TYPES.map((styleType) => {
                    const active = form.preferredStyle === styleType;
                    return (
                      <TouchableOpacity
                        key={styleType}
                        style={[styles.optionCard, active && styles.optionCardActive]}
                        onPress={() =>
                          setForm((prev) => ({ ...prev, preferredStyle: styleType }))
                        }
                        activeOpacity={0.9}
                      >
                        <Text
                          style={[
                            styles.optionTitle,
                            active && styles.optionTitleActive,
                          ]}
                        >
                          {styleType}
                        </Text>
                        <Text
                          style={[
                            styles.optionHint,
                            active && styles.optionHintActive,
                          ]}
                        >
                          {STYLE_HINTS[styleType]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.timeRow}>
                <View style={styles.timeCard}>
                  <View style={styles.timeCardHeader}>
                    <Ionicons name="time-outline" size={15} color={theme.colors.textSoft} />
                    <Text style={styles.timeLabel}>Start</Text>
                  </View>
                  <TextInput
                    value={form.startTime}
                    onChangeText={(startTime) =>
                      setForm((prev) => ({ ...prev, startTime }))
                    }
                    placeholder="08:00"
                    placeholderTextColor={theme.colors.textSoft}
                    style={styles.timeInput}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <View style={styles.timeCard}>
                  <View style={styles.timeCardHeader}>
                    <Ionicons name="timer-outline" size={15} color={theme.colors.textSoft} />
                    <Text style={styles.timeLabel}>End</Text>
                  </View>
                  <TextInput
                    value={form.endTime}
                    onChangeText={(endTime) => setForm((prev) => ({ ...prev, endTime }))}
                    placeholder="18:00"
                    placeholderTextColor={theme.colors.textSoft}
                    style={styles.timeInput}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>

              <View style={styles.detailsCard}>
                <Text style={styles.detailsTitle}>Optional details</Text>
                <TextInput
                  value={form.location}
                  onChangeText={(location) => setForm((prev) => ({ ...prev, location }))}
                  placeholder="Office, campus, cafe..."
                  placeholderTextColor={theme.colors.textSoft}
                  style={styles.input}
                  autoCapitalize="words"
                />
                <TextInput
                  value={form.note}
                  onChangeText={(note) => setForm((prev) => ({ ...prev, note }))}
                  placeholder="Comfortable shoes, polished look, easy layering..."
                  placeholderTextColor={theme.colors.textSoft}
                  style={[styles.input, styles.noteInput]}
                  multiline
                />
              </View>

              <View style={styles.actionRow}>
                {entries.length ? (
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={closeComposer}
                    disabled={saving}
                  >
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    saving && styles.buttonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={theme.colors.text} />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {editingId ? "Update routine" : "Save routine"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.listHeader}>
            <View style={styles.listHeaderCopy}>
              <Text style={styles.sectionTitle}>Saved routines</Text>
              <Text style={styles.listSubtitle}>
                These entries feed the planner and AI suggestions across the app.
              </Text>
            </View>
            <Text style={styles.listCount}>{entries.length}</Text>
          </View>

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={theme.colors.primaryDark} />
              <Text style={styles.loadingText}>Loading schedule...</Text>
            </View>
          ) : entries.length ? (
            <View style={styles.listWrap}>
              {entries.map((entry) => (
                <View key={entry.id} style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <View style={styles.entryIconWrap}>
                      <Ionicons
                        name={getEventIcon(entry.eventType)}
                        size={18}
                        color={theme.colors.text}
                      />
                    </View>
                    <View style={styles.entryHeaderText}>
                      <Text style={styles.entryTitle}>{entry.title}</Text>
                      <Text style={styles.entryMeta}>
                        {formatPersonalScheduleDays(entry.daysOfWeek)} | {formatPersonalScheduleTime(entry)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.editIconButton}
                      onPress={() => handleEdit(entry)}
                    >
                      <Ionicons name="pencil-outline" size={16} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.badgeRow}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{entry.eventType}</Text>
                    </View>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{entry.preferredStyle}</Text>
                    </View>
                  </View>

                  {entry.location ? (
                    <View style={styles.detailRow}>
                      <Ionicons
                        name="location-outline"
                        size={14}
                        color={theme.colors.textSoft}
                      />
                      <Text style={styles.detailText}>{entry.location}</Text>
                    </View>
                  ) : null}
                  {entry.note ? (
                    <View style={styles.detailRow}>
                      <Ionicons
                        name="sparkles-outline"
                        size={14}
                        color={theme.colors.textSoft}
                      />
                      <Text style={styles.detailText}>{entry.note}</Text>
                    </View>
                  ) : null}

                  <View style={styles.entryActions}>
                    <TouchableOpacity
                      style={styles.inlineButton}
                      onPress={() => handleEdit(entry)}
                    >
                      <Text style={styles.inlineButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDelete(entry.id)}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons
                name="calendar-number-outline"
                size={22}
                color={theme.colors.textSoft}
              />
              <Text style={styles.emptyTitle}>No routines yet</Text>
              <Text style={styles.emptyText}>
                Create your first repeat routine so AI can plan outfits with more
                context.
              </Text>
            </View>
          )}
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
  headerAction: {
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    marginTop: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    backgroundColor: "#FFF4CC",
    gap: theme.spacing.md,
  },
  heroTopRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  heroIconWrap: {
    height: 48,
    width: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTextWrap: {
    flex: 1,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    color: theme.colors.textSoft,
    textTransform: "uppercase",
  },
  heroTitle: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  heroText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textMuted,
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  heroStat: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.radius.lg,
    backgroundColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
  },
  heroStatValue: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  heroStatLabel: {
    marginTop: 4,
    fontSize: 11,
    color: theme.colors.textSoft,
  },
  launchCard: {
    marginTop: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  launchIconWrap: {
    height: 42,
    width: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  launchTextWrap: {
    flex: 1,
  },
  launchTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
  },
  launchSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.textSoft,
  },
  builderCard: {
    marginTop: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.lg,
  },
  builderHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.md,
  },
  builderTitleWrap: {
    flex: 1,
  },
  builderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  builderSubtitle: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSoft,
  },
  closeBuilderButton: {
    height: 34,
    width: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldBlock: {
    gap: theme.spacing.sm,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textSoft,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: "#FFF9F0",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 13,
    fontSize: 14,
    color: theme.colors.text,
  },
  helperText: {
    fontSize: 11,
    color: theme.colors.textSoft,
  },
  inlineLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  inlineValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: "600",
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  presetChip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.card,
  },
  presetChipActive: {
    backgroundColor: theme.colors.primary,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  presetChipTextActive: {
    color: theme.colors.text,
  },
  dayRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  dayChip: {
    minWidth: 52,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
  },
  dayChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryDark,
  },
  dayChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textSoft,
  },
  dayChipTextActive: {
    color: theme.colors.text,
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  optionCard: {
    minWidth: "47%",
    flexGrow: 1,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  optionCardActive: {
    backgroundColor: "#FFF4CC",
    borderColor: theme.colors.primaryDark,
  },
  optionIconWrap: {
    height: 34,
    width: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  optionIconWrapActive: {
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text,
  },
  optionTitleActive: {
    color: theme.colors.text,
  },
  optionHint: {
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.textSoft,
  },
  optionHintActive: {
    color: theme.colors.textMuted,
  },
  timeRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  timeCard: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timeCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textSoft,
  },
  timeInput: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  detailsCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background,
    gap: theme.spacing.sm,
  },
  detailsTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
  },
  noteInput: {
    minHeight: 86,
    textAlignVertical: "top",
  },
  actionRow: {
    gap: theme.spacing.sm,
  },
  primaryButton: {
    width: "100%",
    minHeight: 48,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text,
  },
  secondaryButton: {
    width: "100%",
    minHeight: 48,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.card,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
  },
  listHeader: {
    marginTop: theme.spacing.xl,
    marginHorizontal: theme.spacing.lg,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  listHeaderCopy: {
    flex: 1,
  },
  listSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSoft,
  },
  listCount: {
    minWidth: 30,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.card,
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.text,
    textAlign: "center",
  },
  loadingRow: {
    marginTop: theme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  loadingText: {
    fontSize: 12,
    color: theme.colors.textSoft,
  },
  listWrap: {
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  entryCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  entryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
  },
  entryIconWrap: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  entryHeaderText: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
  },
  entryMeta: {
    marginTop: 4,
    fontSize: 11,
    color: theme.colors.textSoft,
  },
  editIconButton: {
    height: 34,
    width: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeRow: {
    marginTop: theme.spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.card,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.text,
  },
  detailRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  detailText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSoft,
  },
  entryActions: {
    marginTop: theme.spacing.md,
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  inlineButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.text,
  },
  deleteButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: theme.radius.pill,
    backgroundColor: "#FCE8E6",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#C44536",
  },
  emptyCard: {
    marginTop: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
  },
  emptyTitle: {
    marginTop: theme.spacing.sm,
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSoft,
    textAlign: "center",
  },
});
