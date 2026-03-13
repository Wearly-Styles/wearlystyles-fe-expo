import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NormalizedEvent } from "../services/types";
import { formatScheduleDateKey } from "./scheduleDate";

export const PERSONAL_SCHEDULE_STORAGE_KEY = "wearlystyles.personalSchedule";

export const PERSONAL_EVENT_TYPES = [
  "Work",
  "Study",
  "Event",
  "Casual",
  "Party",
] as const;

export const PERSONAL_STYLE_TYPES = [
  "Casual",
  "Minimal",
  "Formal",
  "Sporty",
  "Chic",
] as const;

export const PERSONAL_DAY_OPTIONS = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
] as const;

export type PersonalScheduleEntry = {
  id: string;
  title: string;
  eventType: string;
  preferredStyle: string;
  daysOfWeek: number[];
  startTime: string;
  endTime?: string;
  location?: string;
  note?: string;
  isActive: boolean;
};

const sortEntries = (entries: PersonalScheduleEntry[]) =>
  [...entries].sort((left, right) => {
    const leftDay = left.daysOfWeek[0] ?? 0;
    const rightDay = right.daysOfWeek[0] ?? 0;
    if (leftDay !== rightDay) {
      return leftDay - rightDay;
    }
    return left.startTime.localeCompare(right.startTime);
  });

const buildDateTime = (date: Date, time: string) => {
  const [hours, minutes] = time.split(":").map((part) => Number(part));
  const result = new Date(date);
  result.setHours(
    Number.isFinite(hours) ? hours : 9,
    Number.isFinite(minutes) ? minutes : 0,
    0,
    0,
  );
  return result.toISOString();
};

const getTimeOfDay = (time: string) => {
  const hours = Number(time.split(":")[0]);
  if (!Number.isFinite(hours)) return "day";
  if (hours < 12) return "morning";
  if (hours < 18) return "afternoon";
  return "evening";
};

export const getPersonalScheduleEntries = async () => {
  try {
    const raw = await AsyncStorage.getItem(PERSONAL_SCHEDULE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersonalScheduleEntry[];
    if (!Array.isArray(parsed)) return [];
    return sortEntries(
      parsed.filter(
        (entry) =>
          entry &&
          typeof entry.id === "string" &&
          typeof entry.title === "string" &&
          Array.isArray(entry.daysOfWeek),
      ),
    );
  } catch {
    return [];
  }
};

export const savePersonalScheduleEntries = async (
  entries: PersonalScheduleEntry[],
) => {
  const sorted = sortEntries(entries);
  await AsyncStorage.setItem(
    PERSONAL_SCHEDULE_STORAGE_KEY,
    JSON.stringify(sorted),
  );
  return sorted;
};

export const getPersonalScheduleEntriesForDate = (
  entries: PersonalScheduleEntry[],
  date: Date,
) =>
  entries.filter(
    (entry) =>
      entry.isActive !== false && entry.daysOfWeek.includes(date.getDay()),
  );

export const toPersonalScheduleEvents = (
  entries: PersonalScheduleEntry[],
  date: Date,
): NormalizedEvent[] =>
  getPersonalScheduleEntriesForDate(entries, date).map((entry) => ({
    id: entry.id,
    title: entry.title,
    start: buildDateTime(date, entry.startTime),
    end: entry.endTime ? buildDateTime(date, entry.endTime) : undefined,
    location: entry.location?.trim() || undefined,
    eventType: entry.eventType,
    dressCode: entry.preferredStyle,
    timeOfDay: getTimeOfDay(entry.startTime),
  }));

export const toPersonalSchedulePreferences = (
  entries: PersonalScheduleEntry[],
) =>
  Array.from(
    new Set(
      entries
        .flatMap((entry) => [entry.preferredStyle, entry.note?.trim() || ""])
        .filter((value): value is string => Boolean(value)),
    ),
  );

export const formatPersonalScheduleTime = (entry: PersonalScheduleEntry) =>
  entry.endTime ? `${entry.startTime} - ${entry.endTime}` : entry.startTime;

export const buildPersonalScheduleAgenda = (
  entries: PersonalScheduleEntry[],
  dates: Date[],
) =>
  dates.reduce<Record<string, PersonalScheduleEntry[]>>((agenda, date) => {
    const matchingEntries = getPersonalScheduleEntriesForDate(entries, date);
    if (!matchingEntries.length) return agenda;
    agenda[formatScheduleDateKey(date)] = matchingEntries;
    return agenda;
  }, {});

export const formatPersonalScheduleDays = (daysOfWeek: number[]) => {
  const labels = PERSONAL_DAY_OPTIONS.filter((option) =>
    daysOfWeek.includes(option.value),
  ).map((option) => option.label);
  return labels.length ? labels.join(", ") : "No days selected";
};
