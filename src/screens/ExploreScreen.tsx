import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AppHeader from "../components/AppHeader";
import OutfitCard from "../components/OutfitCard";
import FilterPills from "../components/FilterPills";
import BottomNav from "../components/BottomNav";
import { theme } from "../constants/theme";
import { getAuthToken, isApiError } from "../services/apiClient";
import { contextApi, recommendationApi } from "../services/outfitApi";
import { mapRecommendationsToOutfits } from "../utils/outfitMapper";
import { setOutfitCache } from "../utils/outfitStore";
import type { Outfit } from "../constants/mockOutfits";

export default function ExploreScreen() {
  const router = useRouter();
  const filters = useMemo(
    () => ["All", "Trending", "Work", "Study", "Event"],
    []
  );
  const [loading, setLoading] = useState(false);
  const [apiOutfits, setApiOutfits] = useState<Outfit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState(1);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [requiresCloset, setRequiresCloset] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadExplore = async () => {
      setLoading(true);
      setError(null);
      const token = getAuthToken();
      if (!token) {
        setRequiresAuth(true);
        setError("Please sign in to explore recommendations.");
        setLoading(false);
        return;
      }
      try {
        const weather = await contextApi.getWeather({
          lat: 10.8231,
          lon: 106.6297,
        });
        const closet = await contextApi.getCloset();
        if (!closet.length) {
          if (!isActive) return;
          setRequiresCloset(true);
          setError("Add items to your closet to explore recommendations.");
          setApiOutfits([]);
          setLoading(false);
          return;
        }
        const selectedLabel = filters[activeFilter] || "Trending";
        const result = await recommendationApi.recommendBySelection({
          selectedEventType: selectedLabel === "All" ? "Event" : selectedLabel,
          selectedStyle: selectedLabel === "Trending" ? "Balanced" : "Casual",
          closet: closet.length ? closet : undefined,
          weather,
        });
        const mapped = mapRecommendationsToOutfits(result, closet, weather);
        if (isActive && mapped.length) {
          setApiOutfits(mapped);
          setOutfitCache(mapped);
          setRequiresAuth(false);
          setRequiresCloset(false);
        } else if (isActive) {
          setApiOutfits([]);
        }
      } catch (err) {
        if (isActive) {
          if (isApiError(err) && err.status === 401) {
            setRequiresAuth(true);
            setError("Please sign in to explore recommendations.");
          } else if (isApiError(err) && err.status === 400 && err.message.includes("Closet")) {
            setRequiresCloset(true);
            setError("Add items to your closet to explore recommendations.");
          } else {
            setError(err instanceof Error ? err.message : "Failed to load");
          }
          setApiOutfits([]);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadExplore();
    return () => {
      isActive = false;
    };
  }, [activeFilter, filters]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <AppHeader
            title="Explore Fits"
            subtitle="Find ideas curated for your style"
            onBackPress={() => router.back()}
          />
          <View style={styles.filterWrap}>
            <FilterPills
              filters={filters}
              activeIndex={activeFilter}
              onPress={setActiveFilter}
            />
          </View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending now</Text>
            <Text style={styles.sectionNote}>Updated daily</Text>
          </View>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={theme.colors.primaryDark} />
              <Text style={styles.loadingText}>Loading explore...</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
          {requiresAuth ? (
            <View style={styles.authCard}>
              <Text style={styles.authText}>
                Sign in to unlock personalized outfit ideas.
              </Text>
              <TouchableOpacity
                style={styles.authButton}
                onPress={() => router.replace("/login")}
              >
                <Text style={styles.authButtonText}>Go to login</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {requiresCloset ? (
            <View style={styles.authCard}>
              <Text style={styles.authText}>
                Add items to your wardrobe to unlock recommendations.
              </Text>
              <TouchableOpacity
                style={styles.authButton}
                onPress={() => router.push("/wardrobe")}
              >
                <Text style={styles.authButtonText}>Go to wardrobe</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {apiOutfits.length ? (
            apiOutfits.map((outfit) => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                onPress={() => router.push(`/outfit/${outfit.id}`)}
              />
            ))
          ) : null}
        </ScrollView>
        <BottomNav active="explore" />
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
  filterWrap: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
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
  sectionNote: {
    fontSize: 11,
    color: theme.colors.textSoft,
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
    color: "#C44536",
  },
  emptyText: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    fontSize: 12,
    color: theme.colors.textSoft,
  },
  authCard: {
    marginTop: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
  },
  authText: {
    fontSize: 12,
    color: theme.colors.textSoft,
    textAlign: "center",
  },
  authButton: {
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
  },
  authButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.text,
  },
});
