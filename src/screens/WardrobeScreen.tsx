import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../components/AppHeader";
import FilterPills from "../components/FilterPills";
import BottomNav from "../components/BottomNav";
import { theme } from "../constants/theme";
import { getAuthToken, isApiError } from "../services/apiClient";
import { clothingApi, contextApi } from "../services/outfitApi";
import { mapClosetToWardrobe } from "../utils/outfitMapper";
import { ClothingItem } from "../services";

export default function WardrobeScreen() {
  const router = useRouter();
  const filters = useMemo(
    () => ["All", "Top", "Bottom", "Outerwear", "Shoes", "Accessory"],
    []
  );
  const [activeFilter, setActiveFilter] = useState(0);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<
    Array<{ id: string; title: string; category: string; image: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );
  const visibleItems = useMemo(() => {
    if (activeFilter === 0) return items;
    const label = filters[activeFilter];
    if (!label) return items;
    return items.filter((item) => item.category === label);
  }, [activeFilter, filters, items]);

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
              showToast("error", err instanceof Error ? err.message : "Delete failed.");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  const handleEdit = (item: {
    id: string;
    title: string;
    category: string;
    image: string;
  }) => {
    router.push({
      pathname: "/add-item",
      params: { id: item.id },
    });
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
        >
          <AppHeader
            title="My Wardrobe"
            subtitle="Pick pieces to build outfits faster"
            onBackPress={() => router.back()}
          />
          <View style={styles.filterWrap}>
            <FilterPills
              filters={filters}
              activeIndex={activeFilter}
              onPress={setActiveFilter}
            />
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
                toast.type === "success" ? styles.toastSuccess : styles.toastError,
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
                <View key={item.id} style={styles.card}>
                  <Image source={{ uri: item.image }} style={styles.cardImage} />
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? (
                      <ActivityIndicator color={theme.colors.text} size="small" />
                    ) : (
                      <Text style={styles.deleteText}>Delete</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEdit(item)}
                  >
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardSubtitle}>{item.category}</Text>
                  </View>
                </View>
              ))}
            </View>
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
  filterWrap: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
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
  editButton: {
    position: "absolute",
    top: 45,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(0,0,0,0.6)",
  },

  editText: {
    fontSize: 10,
    fontWeight: "700",
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
