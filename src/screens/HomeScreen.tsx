import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "../components/BottomNav";
import OutfitCard from "../components/OutfitCard";
import { theme } from "../constants/theme";
import { getAuthToken, isApiError } from "../services/apiClient";
import { contextApi, recommendationApi, outfitPlanApi } from "../services/outfitApi";
import { mapRecommendationsToOutfits } from "../utils/outfitMapper";
import { setOutfitCache } from "../utils/outfitStore";
import type { Outfit } from "../constants/mockOutfits";
import type { NormalizedWeather } from "../services/types";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80";
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const buildWeatherDays = (count = 7) => {
  const today = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return {
      key: date.toISOString().slice(0, 10),
      label: DAY_LABELS[date.getDay()],
      dayNumber: date.getDate(),
      datetime: date.toISOString(),
    };
  });
};

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heroOutfit, setHeroOutfit] = useState<Outfit | null>(null);
  const [outfitCount, setOutfitCount] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [requiresCloset, setRequiresCloset] = useState(false);
  const [dailyWeather, setDailyWeather] = useState<
    Array<{
      key: string;
      label: string;
      dayNumber: number;
      weather: NormalizedWeather | null;
    }>
  >([]);
  const [scheduledByDate, setScheduledByDate] = useState<
    Record<string, { title: string; outfitId: number }>
  >({});

  const todayLabel = useMemo(() => {
    const today = new Date();
    return DAY_LABELS[today.getDay()];
  }, []);

  useEffect(() => {
    let isActive = true;
    const loadHome = async () => {
      setLoading(true);
      setError(null);
      const token = getAuthToken();
      if (!token) {
        setRequiresAuth(true);
        setError("Please sign in to load outfit recommendations.");
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
          setError("Add items to your closet to get outfit recommendations.");
          setHeroOutfit(null);
          setOutfitCount(0);
          setItemCount(0);
          setLoading(false);
          return;
        }
        const result = await recommendationApi.recommendByContext({
          weather,
          closet: closet.length ? closet : undefined,
        });
        const mapped = mapRecommendationsToOutfits(result, closet, weather);
        if (!isActive) return;
        setRequiresAuth(false);
        setRequiresCloset(false);
        setOutfitCache(mapped);
        setHeroOutfit(mapped[0] ?? null);
        setOutfitCount(mapped.length);
        setItemCount(closet.length);
      } catch (err) {
        if (isActive) {
          if (isApiError(err) && err.status === 401) {
            setRequiresAuth(true);
            setError("Please sign in to load outfit recommendations.");
          } else if (isApiError(err) && err.status === 400 && err.message.includes("Closet")) {
            setRequiresCloset(true);
            setError("Add items to your closet to get outfit recommendations.");
          } else {
            setError(err instanceof Error ? err.message : "Failed to load");
          }
          setHeroOutfit(null);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadHome();
    return () => {
      isActive = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const loadPlans = async () => {
        if (!getAuthToken()) {
          if (isActive) setScheduledByDate({});
          return;
        }
        try {
          const from = new Date();
          const to = new Date(from);
          to.setDate(from.getDate() + 7);
          const plans = await outfitPlanApi.listPlans(from.toISOString(), to.toISOString());
          if (!isActive) return;
          const map: Record<string, { title: string; outfitId: number }> = {};
          const outfitsToCache: Outfit[] = [];
          plans.forEach((plan) => {
            const title = plan.outfit?.name || `Outfit #${plan.outfitId}`;
            const key = new Date(plan.planDate).toISOString().slice(0, 10);
            map[key] = {
              title,
              outfitId: plan.outfitId,
            };
            outfitsToCache.push({
              id: String(plan.outfitId),
              title,
              subtitle: plan.outfit?.occasion || "Planned look",
              image: FALLBACK_IMAGE,
              tags: [plan.outfit?.occasion || "Planned"],
              items: [],
              weather: plan.outfit?.weather || "Weather unavailable",
              mood: plan.planType || "Planned",
            });
          });
          setScheduledByDate(map);
          setOutfitCache(outfitsToCache);
        } catch {
          if (isActive) {
            setScheduledByDate({});
          }
        }
      };
      loadPlans();
      return () => {
        isActive = false;
      };
    }, []),
  );

  useEffect(() => {
    let isActive = true;
    const loadDailyWeather = async () => {
      setWeatherLoading(true);
      setWeatherError(null);
      try {
        const days = buildWeatherDays(7);
        const results = await Promise.all(
          days.map(async (day) => {
            try {
              const weather = await contextApi.getWeather({
                lat: 10.8231,
                lon: 106.6297,
                datetime: day.datetime,
              });
              return { key: day.key, label: day.label, dayNumber: day.dayNumber, weather };
            } catch {
              return { key: day.key, label: day.label, dayNumber: day.dayNumber, weather: null };
            }
          })
        );
        if (isActive) {
          setDailyWeather(results);
        }
      } catch (err) {
        if (isActive) {
          setWeatherError(err instanceof Error ? err.message : "Failed to load weather");
          setDailyWeather([]);
        }
      } finally {
        if (isActive) {
          setWeatherLoading(false);
        }
      }
    };

    loadDailyWeather();
    return () => {
      isActive = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroRow}>
              <View>
                <Text style={styles.heroTitle}>Hello!</Text>
                <Text style={styles.heroSubtitle}>
                  Good morning! Have a good day
                </Text>
              </View>
              <View style={styles.heroActions}>
                <TouchableOpacity style={styles.heroIcon}>
                  <Ionicons name="calendar-outline" size={18} color={theme.colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.heroIcon}>
                  <Ionicons name="notifications-outline" size={18} color={theme.colors.text} />
                </TouchableOpacity>
                <View style={styles.avatar}>
                  <Image
                    source={{ uri: FALLBACK_IMAGE }}
                    style={styles.avatarImage}
                  />
                </View>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statPill}>
                <Text style={styles.statValue}>{outfitCount}</Text>
                <Text style={styles.statLabel}>Outfits</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statValue}>{itemCount}</Text>
                <Text style={styles.statLabel}>Items</Text>
              </View>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={theme.colors.primaryDark} />
              <Text style={styles.loadingText}>Loading home...</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
          {requiresAuth ? (
            <View style={styles.authCard}>
              <Text style={styles.authText}>
                Sign in to unlock personalized outfit suggestions.
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
                Add items to your wardrobe to get better recommendations.
              </Text>
              <TouchableOpacity
                style={styles.authButton}
                onPress={() => router.push("/wardrobe")}
              >
                <Text style={styles.authButtonText}>Go to wardrobe</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {heroOutfit ? (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Today&apos;s outfit</Text>
                <Text style={styles.sectionNote}>{todayLabel}</Text>
              </View>
              <View style={styles.outfitWrap}>
                <OutfitCard
                  outfit={heroOutfit}
                  onPress={() => router.push(`/outfit/${heroOutfit.id}`)}
                />
              </View>
            </>
          ) : null}

          {dailyWeather.length ? (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Calendar</Text>
                <Text style={styles.sectionNote}>7-day forecast</Text>
              </View>
              {weatherLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={theme.colors.primaryDark} />
                  <Text style={styles.loadingText}>Loading weather...</Text>
                </View>
              ) : weatherError ? (
                <Text style={styles.errorText}>{weatherError}</Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.weatherRow}
                >
                  {dailyWeather.map((entry) => {
                    const scheduled = scheduledByDate[entry.key];
                    const temp = entry.weather?.tempC;
                    const label = entry.weather?.tags?.[0] || "N/A";
                    const humidity = entry.weather?.humidity;
                    const rain = entry.weather?.rainProbability;
                    return (
                      <TouchableOpacity
                        key={entry.label}
                        style={styles.weatherCard}
                        activeOpacity={scheduled ? 0.8 : 1}
                        onPress={() => {
                          if (scheduled) {
                            router.push(`/outfit/${scheduled.outfitId}`);
                          }
                        }}
                      >
                        <View style={styles.weatherHeader}>
                          <Text style={styles.weatherDay}>{entry.label}</Text>
                          <Text style={styles.weatherDate}>{entry.dayNumber}</Text>
                        </View>
                        <Text style={styles.weatherTemp}>
                          {temp !== null && temp !== undefined ? `${Math.round(temp)}°C` : "--"}
                        </Text>
                        <Text style={styles.weatherLabel}>{label}</Text>
                        {scheduled ? (
                          <Text style={styles.weatherSchedule} numberOfLines={1}>
                            {scheduled.title}
                          </Text>
                        ) : null}
                        <View style={styles.weatherMetaRow}>
                          <Text style={styles.weatherMeta}>
                            Hum {humidity !== null && humidity !== undefined ? `${humidity}%` : "--"}
                          </Text>
                          <Text style={styles.weatherMeta}>
                            Rain {rain !== null && rain !== undefined ? `${rain}%` : "--"}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </>
          ) : null}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick actions</Text>
          </View>

          <View style={styles.quickRow}>
            <TouchableOpacity
              style={[styles.quickCard, styles.quickPurple]}
              activeOpacity={0.85}
              onPress={() => router.push("/suggestions")}
            >
              <Ionicons name="sparkles" size={22} color="#FFFFFF" />
              <Text style={styles.quickTitle}>Outfits suggestions</Text>
              <Text style={styles.quickSubtitle}>Get outfit ideas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickCard, styles.quickBlue]}
              activeOpacity={0.85}
              onPress={() => router.push("/selection")}
            >
              <Ionicons name="calendar" size={22} color="#FFFFFF" />
              <Text style={styles.quickTitle}>Create outfit</Text>
              <Text style={styles.quickSubtitle}>Pick event and style</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <BottomNav active="home" />
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
  heroCard: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.text,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  heroActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  heroIcon: {
    height: 32,
    width: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    height: 36,
    width: 36,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  avatarImage: {
    height: "100%",
    width: "100%",
  },
  statsRow: {
    marginTop: theme.spacing.md,
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  statPill: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    alignItems: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
  },
  statLabel: {
    marginTop: 2,
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
    fontSize: 12,
    color: theme.colors.textSoft,
  },
  outfitCard: {
    marginTop: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  outfitImage: {
    width: "100%",
    height: 180,
  },
  outfitBody: {
    padding: theme.spacing.md,
  },
  outfitTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
  },
  outfitMeta: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  outfitMetaText: {
    fontSize: 11,
    color: theme.colors.textSoft,
  },
  outfitWrap: {
    paddingHorizontal: theme.spacing.lg,
  },
  emptyText: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
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
  quickRow: {
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  weatherRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  weatherCard: {
    width: 150,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  weatherHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  weatherDay: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textSoft,
  },
  weatherDate: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
  },
  weatherTemp: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  weatherLabel: {
    marginTop: 4,
    fontSize: 10,
    color: theme.colors.textSoft,
  },
  weatherSchedule: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.text,
  },
  weatherMetaRow: {
    marginTop: 6,
    gap: 2,
  },
  weatherMeta: {
    fontSize: 10,
    color: theme.colors.textSoft,
  },
  quickCard: {
    flex: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    minHeight: 120,
    justifyContent: "space-between",
  },
  quickPurple: {
    backgroundColor: "#D46BFF",
  },
  quickBlue: {
    backgroundColor: "#6E7BFF",
  },
  quickTitle: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  quickSubtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.9)",
  },
});
