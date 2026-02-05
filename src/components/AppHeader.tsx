import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../constants/theme";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
  rightAction?: React.ReactNode;
};

export default function AppHeader({
  title,
  subtitle,
  onBackPress,
  rightAction,
}: AppHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        {onBackPress ? (
          <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
            <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{title}</Text>
          {!!subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
        </View>
        <View style={styles.rightSlot}>{rightAction}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  backButton: {
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  backPlaceholder: {
    height: 36,
    width: 36,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.text,
  },
  headerSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textMuted,
  },
  rightSlot: {
    minWidth: 36,
    alignItems: "flex-end",
  },
});
