import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { theme } from "../constants/theme";
import type { Outfit } from "../constants/mockOutfits";
import OutfitCanvas from "./OutfitCanvas";

type OutfitCardProps = {
  outfit: Outfit;
  onPress?: () => void;
  variant?: "default" | "compact" | "detail";
};

const normalizeText = (value?: string | null) =>
  (value || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toTitleCase = (value: string) =>
  value.replace(/\w\S*/g, (chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1));

const normalizeCompare = (value?: string | null) => normalizeText(value).toLowerCase();

const isMeaningfulMeta = (value?: string | null) => {
  const normalized = normalizeCompare(value);
  return Boolean(
    normalized &&
      normalized !== "general" &&
      normalized !== "saved outfit" &&
      normalized !== "scheduled" &&
      normalized !== "weather unavailable",
  );
};

const dedupeWords = (value: string) => {
  const words = value.split(" ").filter(Boolean);
  return words.filter((word, index) => {
    const previous = words[index - 1];
    return !previous || previous.toLowerCase() !== word.toLowerCase();
  });
};

const getCardHeadline = (outfit: Outfit) => {
  const title = normalizeText(outfit.title);
  if (title && isMeaningfulMeta(title)) {
    return toTitleCase(dedupeWords(title).join(" "));
  }

  const preferred = [outfit.tags?.[0], outfit.subtitle, outfit.mood].find((value) =>
    isMeaningfulMeta(value),
  );
  if (preferred) {
    return toTitleCase(normalizeText(preferred));
  }

  const fallback = dedupeWords(title || "Styled outfit").join(" ");
  return fallback || "Styled outfit";
};

const getCardDescription = (outfit: Outfit) => {
  const title = normalizeCompare(outfit.title);
  const candidates = [outfit.subtitle, outfit.mood, outfit.weather];

  const description = candidates.find((value) => {
    if (!isMeaningfulMeta(value)) return false;
    return normalizeCompare(value) !== title;
  });

  return description ? normalizeText(description) : null;
};

export default function OutfitCard({ outfit, onPress, variant = "default" }: OutfitCardProps) {
  const isCompact = variant === "compact";
  const isDetail = variant === "detail";
  const displayTitle = getCardHeadline(outfit);
  const description = getCardDescription(outfit);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isCompact && styles.cardCompact,
        isDetail && styles.cardDetail,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      disabled={!onPress}
    >
      <OutfitCanvas
        outfit={outfit}
        variant={isCompact ? "compact" : isDetail ? "detail" : "default"}
      />
      {!isCompact ? (
        <View style={[styles.content, isDetail && styles.contentDetail]}>
          <Text
            style={[styles.title, isDetail && styles.titleDetail]}
            numberOfLines={isDetail ? 2 : 1}
          >
            {displayTitle}
          </Text>
          {description ? (
            <Text
              style={[styles.description, isDetail && styles.descriptionDetail]}
              numberOfLines={isDetail ? undefined : 2}
            >
              {description}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={[styles.content, styles.contentCompact]}>
          <Text style={[styles.title, styles.titleCompact]} numberOfLines={2}>
            {displayTitle}
          </Text>
          {description ? (
            <Text style={[styles.description, styles.descriptionCompact]} numberOfLines={2}>
              {description}
            </Text>
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: theme.spacing.md,
    borderRadius: 30,
    backgroundColor: "#FFFCF8",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E4D5C5",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  cardCompact: {
    marginTop: 0,
    borderRadius: 22,
  },
  cardDetail: {
    marginTop: 0,
    borderRadius: 32,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 14,
    paddingBottom: 18,
  },
  contentDetail: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  contentCompact: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: 10,
    paddingBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
    color: "#1D1712",
  },
  titleDetail: {
    fontSize: 20,
    lineHeight: 25,
  },
  titleCompact: {
    fontSize: 13,
    lineHeight: 16,
  },
  description: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textMuted,
  },
  descriptionDetail: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
  },
  descriptionCompact: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 14,
  },
});
