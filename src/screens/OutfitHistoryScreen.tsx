import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import AppHeader from "../components/AppHeader";
import { theme } from "../constants/theme";
import { getAuthToken } from "../services/apiClient";
import { outfitHistoryApi } from "../services/outfitApi";
import type { OutfitHistoryEntity } from "../services/types";
import type { Outfit, OutfitItem } from "../constants/mockOutfits";
import { setOutfitCache } from "../utils/outfitStore";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80";

const toHistoryOutfit = (entry: OutfitHistoryEntity): Outfit | null => {
  if (!entry.outfitId) return null;

  const items: OutfitItem[] =
    entry.outfit?.items?.map((item, index) => {
      const clothingItem = item.clothingItem;
      return {
        id: String(clothingItem?.id ?? item.clothingItemId ?? item.id ?? index),
        title: clothingItem?.category?.name || "Item",
        subtitle: clothingItem?.name || "Wardrobe item",
        image: clothingItem?.image || FALLBACK_IMAGE,
      };
    }) || [];

  return {
    id: String(entry.outfitId),
    title: entry.outfit?.name || `Outfit #${entry.outfitId}`,
    subtitle: entry.outfit?.occasion || "Worn outfit",
    image: items[0]?.image || FALLBACK_IMAGE,
    tags: [entry.outfit?.occasion || "History"],
    items,
    weather: entry.outfit?.weather || "Weather unavailable",
    mood: "Worn",
  };
};

const formatHistoryDate = (value?: string | null) => {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export default function OutfitHistoryScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<OutfitHistoryEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);

  const historyCards = useMemo(
    () =>
      entries
        .map((entry) => ({
          entry,
          outfit: toHistoryOutfit(entry),
        }))
        .filter((item): item is { entry: OutfitHistoryEntity; outfit: Outfit } => Boolean(item.outfit)),
    [entries],
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadHistory = async () => {
        if (!getAuthToken()) {
          if (isActive) {
            setRequiresAuth(true);
            setEntries([]);
          }
          return;
        }

        setLoading(true);
        setError(null);
        try {
          const data = await outfitHistoryApi.listHistories();
          if (!isActive) return;
          setRequiresAuth(false);
          setEntries(data || []);
          setOutfitCache(
            (data || [])
              .map((entry) => toHistoryOutfit(entry))
              .filter((outfit): outfit is Outfit => Boolean(outfit)),
          );
        } catch (err) {
          if (isActive) {
            setError(err instanceof Error ? err.message : "Failed to load outfit history");
          }
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      };

      void loadHistory();
      return () => {
        isActive = false;
      };
    }, []),
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <AppHeader
            title="Outfit History"
            subtitle="Looks you marked as worn"
            onBackPress={() => router.back()}
          />

          {requiresAuth ? (
            <View style={styles.card}>
              <Text style={styles.cardText}>Sign in to view your outfit history.</Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.replace("/login")}
              >
                <Text style={styles.primaryText}>Go to login</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={theme.colors.primaryDark} />
              <Text style={styles.loadingText}>Loading outfit history...</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          {!loading && !error && !requiresAuth && historyCards.length === 0 ? (
            <Text style={styles.emptyText}>You have not marked any outfit as worn yet.</Text>
          ) : null}

          {historyCards.map(({ entry, outfit }) => (
            <TouchableOpacity
              key={entry.id}
              style={styles.historyCard}
              activeOpacity={0.85}
              onPress={() => router.push(`/outfit/${outfit.id}`)}
            >
              <Image source={{ uri: outfit.image }} style={styles.historyImage} />
              <View style={styles.historyCopy}>
                <View style={styles.datePill}>
                  <Text style={styles.dateText}>{formatHistoryDate(entry.wornDate)}</Text>
                </View>
                <Text style={styles.historyTitle}>{outfit.title}</Text>
                <Text style={styles.historySubtitle}>{outfit.subtitle}</Text>
                {entry.note ? <Text style={styles.historyNote}>{entry.note}</Text> : null}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
  card: {
    marginTop: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  cardText: {
    fontSize: 12,
    color: theme.colors.textSoft,
  },
  primaryButton: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    alignItems: "center",
  },
  primaryText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
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
    color: theme.colors.accent,
  },
  emptyText: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    fontSize: 12,
    color: theme.colors.textSoft,
  },
  historyCard: {
    marginTop: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  historyImage: {
    width: 88,
    height: 88,
    borderRadius: theme.radius.md,
  },
  historyCopy: {
    flex: 1,
    gap: 6,
  },
  datePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.chip,
  },
  dateText: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.textSoft,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
  },
  historySubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  historyNote: {
    fontSize: 11,
    color: theme.colors.textSoft,
  },
});
