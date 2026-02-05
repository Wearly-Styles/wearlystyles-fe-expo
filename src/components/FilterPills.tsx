import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { theme } from "../constants/theme";

type FilterPillsProps = {
  filters: string[];
  activeIndex?: number;
  onPress?: (index: number) => void;
};

export default function FilterPills({
  filters,
  activeIndex = 0,
  onPress,
}: FilterPillsProps) {
  return (
    <View style={styles.container}>
      {filters.map((label, index) => {
        const isActive = index === activeIndex;
        return (
          <TouchableOpacity
            key={label}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => onPress?.(index)}
          >
            <Text style={[styles.text, isActive && styles.textActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    flexWrap: "wrap",
    rowGap: theme.spacing.sm,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  text: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  textActive: {
    color: theme.colors.surface,
  },
});
