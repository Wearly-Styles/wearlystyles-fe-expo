import { useMemo } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AppHeader from "../components/AppHeader";
import { theme } from "../constants/theme";
import { getOutfitById } from "../utils/outfitStore";

type OutfitDetailScreenProps = {
  outfitId: string;
};

export default function OutfitDetailScreen({ outfitId }: OutfitDetailScreenProps) {
  const router = useRouter();
  const outfit = useMemo(
    () => getOutfitById(outfitId),
    [outfitId]
  );

  if (!outfit) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <AppHeader
            title="Outfit Details"
            subtitle="Outfit not available"
            onBackPress={() => router.back()}
          />
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              We could not find this outfit. Try refreshing recommendations.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
              <Text style={styles.primaryText}>Go back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <AppHeader
            title="Outfit Details"
            subtitle="See items and quick styling notes"
            onBackPress={() => router.back()}
          />
          <View style={styles.hero}>
            <Image source={{ uri: outfit.image }} style={styles.heroImage} />
            <View style={styles.heroInfo}>
              <Text style={styles.heroTitle}>{outfit.title}</Text>
              <Text style={styles.heroSubtitle}>{outfit.subtitle}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaChip}>{outfit.weather}</Text>
                <Text style={styles.metaChip}>{outfit.mood}</Text>
              </View>
            </View>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Included items</Text>
            <View style={styles.itemsRow}>
              {outfit.items.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <Image source={{ uri: item.image }} style={styles.itemImage} />
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Why it works</Text>
            <View style={styles.reasonCard}>
              <Text style={styles.reasonText}>
                Soft neutrals balance heat and brightness. This outfit keeps you
                breathable and polished while staying casual.
              </Text>
            </View>
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Save look</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryText}>Wear today</Text>
          </TouchableOpacity>
        </View>
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
    paddingBottom: 120,
  },
  hero: {
    marginTop: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.xl,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  heroImage: {
    width: "100%",
    height: 260,
  },
  heroInfo: {
    padding: theme.spacing.lg,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  metaRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  metaChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.chip,
    fontSize: 10,
    color: theme.colors.textSoft,
    fontWeight: "600",
  },
  section: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  itemsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  itemCard: {
    width: "48%",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    alignItems: "center",
    paddingVertical: theme.spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.sm,
  },
  itemTitle: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.text,
  },
  itemSubtitle: {
    marginTop: 2,
    fontSize: 9,
    color: theme.colors.textSoft,
  },
  reasonCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  reasonText: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textMuted,
  },
  emptyState: {
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    alignItems: "center",
    gap: theme.spacing.md,
  },
  emptyText: {
    fontSize: 12,
    color: theme.colors.textSoft,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 6,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.chip,
    paddingVertical: 12,
    borderRadius: theme.radius.pill,
    alignItems: "center",
  },
  secondaryText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSoft,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: theme.radius.pill,
    alignItems: "center",
  },
  primaryText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
  },
});
