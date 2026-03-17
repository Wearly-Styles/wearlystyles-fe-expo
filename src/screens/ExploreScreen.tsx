import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";

import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import FilterPills from "../components/FilterPills";
import OutfitCard from "../components/OutfitCard";
import PostCard from "../components/PostCard";

import { theme } from "../constants/theme";
import { getAuthToken, isApiError } from "../services/apiClient";
import { contextApi, recommendationApi } from "../services/outfitApi";
import { mapRecommendationsToOutfits } from "../utils/outfitMapper";
import { setOutfitCache } from "../utils/outfitStore";

import type { Outfit } from "../constants/mockOutfits";
import { usePosts } from "../hooks/usePost";

export default function ExploreScreen() {
  const router = useRouter();

  const filters = useMemo(
    () => ["All", "Trending", "Work", "Study", "Event"],
    [],
  );

  const [loading, setLoading] = useState(false);
  const [apiOutfits, setApiOutfits] = useState<Outfit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState(1);

  const [requiresAuth, setRequiresAuth] = useState(false);
  const [requiresCloset, setRequiresCloset] = useState(false);



useFocusEffect(
  useCallback(() => {
    refetch();
  }, [])
);

  const {
    posts: fetchedPosts,
    loading: postLoading,
    error: postError,
    refetch,
  } = usePosts(1, 10);
  const [posts, setPosts] = useState(fetchedPosts);

  const removePost = (postId: number) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  useEffect(() => {
    setPosts(fetchedPosts);
  }, [fetchedPosts]);

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
          closet,
          weather,
        });

        const mapped = mapRecommendationsToOutfits(result, closet, weather);

        if (isActive) {
          setApiOutfits(mapped);
          setOutfitCache(mapped);
          setRequiresAuth(false);
          setRequiresCloset(false);
        }
      } catch (err) {
        if (!isActive) return;

        if (isApiError(err) && err.status === 401) {
          setRequiresAuth(true);
          setError("Please sign in to explore recommendations");
        } else if (
          isApiError(err) &&
          err.status === 400 &&
          err.message.includes("Closet")
        ) {
          setRequiresCloset(true);
          setError("Add items to your closet to explore recommendations.");
        } else {
          setError(err instanceof Error ? err.message : "Failed to load");
        }

        setApiOutfits([]);
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

          {/* Auth Required */}
          {requiresAuth && (
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
          )}

          {/* Closet Required */}
          {requiresCloset && (
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
          )}

          {/* Community Feed */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Community Feed</Text>
            <Text style={styles.sectionNote}>See what others wear</Text>
          </View>

          {postLoading ? (
            <ActivityIndicator style={{ marginTop: 10 }} />
          ) : (
            posts.map((post) => (
              <PostCard key={post.id} post={post} onDelete={removePost} />
            ))
          )}
        </ScrollView>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/create-post")}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color={theme.colors.surface} />
        </TouchableOpacity>
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
    justifyContent: "space-between",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 4,
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

  fab: {
    position: "absolute",
    right: theme.spacing.lg,
    bottom: 96,
    height: 54,
    width: 54,
    borderRadius: 27,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
