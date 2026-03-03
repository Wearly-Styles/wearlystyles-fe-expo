import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { theme } from "../constants/theme";

type FilterPillsProps = {
  filters: string[];
  activeIndex?: number;
  onPress?: (index: number) => void;
  scrollable?: boolean;
};

export default function FilterPills({
  filters,
  activeIndex = 0,
  onPress,
  scrollable = false,
}: FilterPillsProps) {
  const content = (
    <View style={[styles.container, scrollable && styles.containerScrollable]}>
      {filters.map((label, index) => {
        const isActive = index === activeIndex;
        return (
          <TouchableOpacity
            key={label}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => onPress?.(index)}
            activeOpacity={0.85}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.text, isActive && styles.textActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  if (!scrollable) return content;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    flexWrap: "wrap",
    rowGap: theme.spacing.sm,
  },
  containerScrollable: {
    flexWrap: "nowrap",
  },
  scrollContent: {
    paddingRight: theme.spacing.md,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryDark,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  text: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  textActive: {
    color: theme.colors.text,
  },
});
