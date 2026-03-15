import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import { theme } from "../constants/theme";
import { getAuthToken, isApiError } from "../services/apiClient";
import { clothingApi, contextApi } from "../services/outfitApi";
import { mapClosetToWardrobe } from "../utils/outfitMapper";

type WardrobeItem = {
  id: string;
  title: string;
  category: string;
  image: string;
  isFavorite: boolean;
};

const normalizeSearchValue = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export default function WardrobeScreen() {
  const router = useRouter();
  const filters = useMemo(
    () => ["All", "Top", "Bottom", "Outerwear", "Shoes", "Accessory"],
    [],
  );
  const [activeFilter, setActiveFilter] = useState(0);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const currentFilterLabel = filters[activeFilter] || filters[0] || "All";
  const visibleItems = useMemo(() => {
    const label = filters[activeFilter];
    const normalizedQuery = normalizeSearchValue(deferredSearchQuery);
    return items.filter((item) => {
      const matchesFilter =
        activeFilter === 0 || !label ? true : item.category === label;
      if (!matchesFilter) return false;
      if (!normalizedQuery) return true;
      return [item.title, item.category].some((value) =>
        normalizeSearchValue(value).includes(normalizedQuery),
      );
    });
  }, [activeFilter, deferredSearchQuery, filters, items]);

  const loadCloset = useCallback(() => {
    let isActive = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      const token = getAuthToken();
      if (!token) {
        setRequiresAuth(true);
        setLoading(false);
        return;
      }
      try {
        const closet = await contextApi.getCloset();
        const mapped = mapClosetToWardrobe(closet);
        if (isActive) {
          setItems(mapped);
          setRequiresAuth(false);
        }
      } catch (err) {
        if (isActive) {
          if (isApiError(err) && err.status === 401) {
            setRequiresAuth(true);
            setError("Please sign in to access your wardrobe.");
          } else {
            setError(err instanceof Error ? err.message : "Failed to load");
          }
          setItems([]);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    run();
    return () => {
      isActive = false;
    };
  }, []);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  };

  const handleDelete = (itemId: string) => {
    const numericId = Number(itemId);
    if (!Number.isFinite(numericId)) {
      showToast("error", "Invalid item id.");
      return;
    }
    Alert.alert(
      "Delete item",
      "Remove this item from your wardrobe?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(itemId);
            try {
              await clothingApi.deleteItem(numericId);
              setItems((prev) => prev.filter((item) => item.id !== itemId));
              showToast("success", "Item deleted.");
            } catch (err) {
              showToast(
                "error",
                err instanceof Error ? err.message : "Delete failed.",
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  const handleViewDetail = (item: WardrobeItem) => {
    router.push({
      pathname: "/detail-item",
      params: { id: item.id },
    });
  };

  const handleSelectFilter = (index: number) => {
    setActiveFilter(index);
    setIsFilterMenuOpen(false);
  };

  useEffect(() => loadCloset(), [loadCloset]);

  useFocusEffect(
    useCallback(() => {
      return loadCloset();
    }, [loadCloset]),
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => setIsFilterMenuOpen(false)}
        >
          <AppHeader
            title="My Wardrobe"
            subtitle="Pick pieces to build outfits faster"
            onBackPress={() => router.back()}
          />
          <View style={styles.controlsWrap}>
            <View style={styles.controlsRow}>
              <View style={styles.searchInputWrap}>
                <Ionicons
                  name="search"
                  size={18}
                  color={theme.colors.textSoft}
                  style={styles.searchIcon}
                />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onFocus={() => setIsFilterMenuOpen(false)}
                  placeholder="Search by name"
                  placeholderTextColor={theme.colors.textSoft}
                  style={styles.searchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                />
                {searchQuery ? (
                  <TouchableOpacity
                    onPress={() => setSearchQuery("")}
                    style={styles.clearSearchButton}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={theme.colors.textSoft}
                    />
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={styles.filterMenuWrap}>
                <TouchableOpacity
                  style={[
                    styles.filterTrigger,
                    isFilterMenuOpen && styles.filterTriggerActive,
                  ]}
                  onPress={() => setIsFilterMenuOpen((prev) => !prev)}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="options-outline"
                    size={18}
                    color={theme.colors.text}
                    style={styles.filterTriggerIcon}
                  />
                  <Text style={styles.filterTriggerText} numberOfLines={1}>
                    {currentFilterLabel}
                  </Text>
                  <Ionicons
                    name={isFilterMenuOpen ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={theme.colors.textSoft}
                  />
                </TouchableOpacity>
                {isFilterMenuOpen ? (
                  <View style={styles.filterDropdown}>
                    {filters.map((label, index) => {
                      const isActive = index === activeFilter;
                      return (
                        <TouchableOpacity
                          key={label}
                          style={[
                            styles.filterOption,
                            isActive && styles.filterOptionActive,
                          ]}
                          onPress={() => handleSelectFilter(index)}
                          activeOpacity={0.85}
                        >
                          <Text
                            style={[
                              styles.filterOptionText,
                              isActive && styles.filterOptionTextActive,
                            ]}
                          >
                            {label}
                          </Text>
                          {isActive ? (
                            <Ionicons
                              name="checkmark"
                              size={16}
                              color={theme.colors.text}
                            />
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            </View>
            {!loading && !requiresAuth ? (
              <Text style={styles.searchMeta}>
                {visibleItems.length} item{visibleItems.length === 1 ? "" : "s"}
              </Text>
            ) : null}
          </View>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={theme.colors.primaryDark} />
              <Text style={styles.loadingText}>Loading closet...</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
          {toast ? (
            <View
              style={[
                styles.toast,
                toast.type === "success"
                  ? styles.toastSuccess
                  : styles.toastError,
              ]}
            >
              <Text style={styles.toastText}>{toast.message}</Text>
            </View>
          ) : null}
          {requiresAuth ? (
            <View style={styles.authCard}>
              <Text style={styles.authText}>
                Sign in to view and manage your wardrobe.
              </Text>
              <TouchableOpacity
                style={styles.authButton}
                onPress={() => router.replace("/login")}
              >
                <Text style={styles.authButtonText}>Go to login</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {visibleItems.length ? (
            <View style={styles.grid}>
              {visibleItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.card}
                  activeOpacity={0.9}
                  onPress={() => handleViewDetail(item)}
                >
                  <Image
                    source={{ uri: item.image }}
                    style={styles.cardImage}
                  />

                  {item.isFavorite && (
                    <View style={styles.favoriteBadge}>
                      <Ionicons name="star" size={14} color="#FFD700" />
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.deleteText}>Delete</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.detailButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleViewDetail(item);
                    }}
                  >
                    <Text style={styles.detailText}>Detail</Text>
                  </TouchableOpacity>

                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardSubtitle}>{item.category}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : !loading && !requiresAuth && !error ? (
            <Text style={styles.emptyText}>
              {searchQuery
                ? "No wardrobe items match your search."
                : items.length
                  ? "No wardrobe items found for this category."
                  : "Your wardrobe is empty. Add your first item to get started."}
            </Text>
          ) : null}
        </ScrollView>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/add-item")}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color={theme.colors.surface} />
        </TouchableOpacity>

        <BottomNav active="wardrobe" />
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
  controlsWrap: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    paddingLeft: 14,
    paddingRight: 10,
    minHeight: 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    paddingVertical: 12,
  },
  clearSearchButton: {
    marginLeft: 8,
    paddingVertical: 6,
  },
  filterMenuWrap: {
    position: "relative",
    zIndex: 20,
  },
  filterTrigger: {
    minWidth: 126,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: 6,
  },
  filterTriggerActive: {
    borderColor: theme.colors.primaryDark,
    backgroundColor: "#FFF6D9",
  },
  filterTriggerIcon: {
    marginRight: 2,
  },
  filterTriggerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
  },
  filterDropdown: {
    position: "absolute",
    top: 52,
    right: 0,
    minWidth: 180,
    padding: 8,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  filterOption: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
  },
  filterOptionActive: {
    backgroundColor: "#FFF4CC",
  },
  filterOptionText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  filterOptionTextActive: {
    color: theme.colors.text,
  },
  searchMeta: {
    marginTop: 8,
    fontSize: 11,
    color: theme.colors.textSoft,
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
  toast: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  toastSuccess: {
    backgroundColor: "#E7F6EC",
  },
  toastError: {
    backgroundColor: "#FCE8E6",
  },
  toastText: {
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    gap: theme.spacing.md,
  },
  card: {
    width: "47%",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: 130,
  },
  favoriteBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 6,
    borderRadius: theme.radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  deleteText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  detailButton: {
    position: "absolute",
    top: 45,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(0,0,0,0.6)",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  detailText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
  },
  cardBody: {
    padding: theme.spacing.md,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text,
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 11,
    color: theme.colors.textSoft,
  },
});
