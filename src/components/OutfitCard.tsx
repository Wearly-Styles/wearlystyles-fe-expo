import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { theme } from "../constants/theme";
import type { Outfit } from "../constants/mockOutfits";

type OutfitCardProps = {
  outfit: Outfit;
  onPress?: () => void;
  variant?: "default" | "compact";
};

export default function OutfitCard({ outfit, onPress, variant = "default" }: OutfitCardProps) {
  const isCompact = variant === "compact";
  const previewItems = outfit.items?.slice(0, isCompact ? 2 : 4) ?? [];
  return (
    <TouchableOpacity
      style={[styles.card, isCompact && styles.cardCompact]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {previewItems.length ? (
        <View style={[styles.itemGrid, isCompact && styles.itemGridCompact]}>
          {previewItems.map((item) => (
            <View key={item.id} style={styles.itemTile}>
              <Image source={{ uri: item.image }} style={styles.itemImage} />
              <Text style={styles.itemName} numberOfLines={1}>
                {item.subtitle || item.title}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Image
          source={{ uri: outfit.image }}
          style={[styles.image, isCompact && styles.imageCompact]}
        />
      )}
      <View style={[styles.content, isCompact && styles.contentCompact]}>
        <Text style={[styles.title, isCompact && styles.titleCompact]} numberOfLines={1}>
          {outfit.title}
        </Text>
        <Text
          style={[styles.subtitle, isCompact && styles.subtitleCompact]}
          numberOfLines={1}
        >
          {outfit.subtitle}
        </Text>
        <View style={[styles.tagRow, isCompact && styles.tagRowCompact]}>
          {outfit.tags.slice(0, isCompact ? 2 : 3).map((tag) => (
            <View key={tag} style={[styles.tag, isCompact && styles.tagCompact]}>
              <Text style={[styles.tagText, isCompact && styles.tagTextCompact]}>
                {tag}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.card,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardCompact: {
    marginTop: 0,
    borderRadius: theme.radius.lg,
  },
  image: {
    height: 260,
    width: "100%",
  },
  imageCompact: {
    height: 140,
  },
  itemGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  itemGridCompact: {
    padding: theme.spacing.sm,
  },
  itemTile: {
    width: "47%",
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    alignItems: "center",
  },
  itemImage: {
    width: "100%",
    height: 80,
    borderRadius: theme.radius.sm,
  },
  itemName: {
    marginTop: 6,
    fontSize: 10,
    color: theme.colors.textSoft,
    textAlign: "center",
  },
  content: {
    padding: theme.spacing.lg,
  },
  contentCompact: {
    padding: theme.spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  titleCompact: {
    fontSize: 13,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  subtitleCompact: {
    marginTop: 4,
    fontSize: 10,
  },
  tagRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  tagRowCompact: {
    marginTop: theme.spacing.sm,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.chip,
  },
  tagCompact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 10,
    color: theme.colors.textSoft,
    fontWeight: "600",
  },
  tagTextCompact: {
    fontSize: 9,
  },
});
