import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import AppHeader from "../components/AppHeader";
import { theme } from "../constants/theme";
import { clothingApi } from "../services/outfitApi";
import { getAuthToken } from "../services/apiClient";
import type { Category } from "../services/types";

type PickedImage = {
  uri: string;
  name: string;
  type: string;
};

const SEASONS = ["All", "Spring", "Summer", "Autumn", "Winter"];

const getFileNameFromUri = (uri: string) => {
  const parts = uri.split("/");
  return parts[parts.length - 1] || `image_${Date.now()}.jpg`;
};

export default function AddClothingItemScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [material, setMaterial] = useState("");
  const [description, setDescription] = useState("");
  const [season, setSeason] = useState(SEASONS[0]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [image, setImage] = useState<PickedImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);

  const canSubmit = useMemo(
    () => Boolean(image),
    [image],
  );

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setRequiresAuth(true);
      return;
    }
    let isActive = true;
    const loadCategories = async () => {
      try {
        const data = await clothingApi.listCategories();
        if (isActive) {
          setCategories(data);
        }
      } catch {
        if (isActive) {
          setCategories([]);
        }
      }
    };
    loadCategories();
    return () => {
      isActive = false;
    };
  }, []);

  const handlePickImage = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Please allow photo access to upload an item.");
      return;
    }

    const mediaTypeEnum =
      (ImagePicker as unknown as { MediaType?: { Images?: string } }).MediaType
        ?.Images;
    const mediaTypes =
      mediaTypeEnum
        ? [mediaTypeEnum]
        : (ImagePicker as unknown as { MediaTypeOptions?: { Images?: string } })
            .MediaTypeOptions?.Images;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];
    const name = asset.fileName || getFileNameFromUri(asset.uri);
    const type = asset.mimeType || "image/jpeg";
    setImage({ uri: asset.uri, name, type });
  };

  const handleCreateCategory = async () => {
    if (!newCategory.trim()) return;
    setError(null);
    try {
      const created = await clothingApi.createCategory({ name: newCategory.trim() });
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedCategoryId(created.id);
      setNewCategory("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create category");
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      setError("Please select an image before saving.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const form = new FormData();
      if (image) {
        form.append(
          "image",
          {
            uri: image.uri,
            name: image.name,
            type: image.type,
          } as unknown as Blob,
        );
      }
      if (name.trim()) form.append("name", name.trim());
      if (selectedCategoryId) form.append("categoryId", String(selectedCategoryId));
      if (color.trim()) form.append("color", color.trim());
      if (material.trim()) form.append("material", material.trim());
      if (description.trim()) form.append("description", description.trim());
      if (season && season !== "All") form.append("season", season);
      form.append("isFavorite", String(isFavorite));

      await clothingApi.createItem(form);
      setSuccess("Item added to your wardrobe.");
      router.replace("/wardrobe");
      setName("");
      setColor("");
      setMaterial("");
      setDescription("");
      setSeason(SEASONS[0]);
      setIsFavorite(false);
      setImage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <AppHeader
            title="Add wardrobe item"
            subtitle="Upload a photo and details"
            onBackPress={() => router.back()}
          />

          {requiresAuth ? (
            <View style={styles.authCard}>
              <Text style={styles.authText}>
                Sign in to add items to your wardrobe.
              </Text>
              <TouchableOpacity
                style={styles.authButton}
                onPress={() => router.replace("/login")}
              >
                <Text style={styles.authButtonText}>Go to login</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photo</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
              {image ? (
                <Image source={{ uri: image.uri }} style={styles.imagePreview} />
              ) : (
                <Text style={styles.imagePlaceholder}>Tap to upload</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basics</Text>
            <TextInput
              style={styles.input}
              placeholder="Item name (optional)"
              placeholderTextColor={theme.colors.textSoft}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Color"
              placeholderTextColor={theme.colors.textSoft}
              value={color}
              onChangeText={setColor}
            />
            <TextInput
              style={styles.input}
              placeholder="Material"
              placeholderTextColor={theme.colors.textSoft}
              value={material}
              onChangeText={setMaterial}
            />
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Description"
              placeholderTextColor={theme.colors.textSoft}
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Season</Text>
            <View style={styles.pillRow}>
              {SEASONS.map((label) => (
                <TouchableOpacity
                  key={label}
                  style={[
                    styles.pill,
                    season === label ? styles.pillActive : null,
                  ]}
                  onPress={() => setSeason(label)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      season === label ? styles.pillTextActive : null,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category</Text>
            <View style={styles.pillRow}>
              {categories.length ? (
                categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.pill,
                      selectedCategoryId === category.id ? styles.pillActive : null,
                    ]}
                    onPress={() =>
                      setSelectedCategoryId(
                        selectedCategoryId === category.id ? null : category.id,
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.pillText,
                        selectedCategoryId === category.id
                          ? styles.pillTextActive
                          : null,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyText}>No categories yet.</Text>
              )}
            </View>
            <View style={styles.inlineRow}>
              <TextInput
                style={styles.inlineInput}
                placeholder="New category"
                placeholderTextColor={theme.colors.textSoft}
                value={newCategory}
                onChangeText={setNewCategory}
              />
              <TouchableOpacity style={styles.inlineButton} onPress={handleCreateCategory}>
                <Text style={styles.inlineButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.favoriteToggle, isFavorite && styles.favoriteToggleActive]}
              onPress={() => setIsFavorite((prev) => !prev)}
            >
              <Text
                style={[
                  styles.favoriteText,
                  isFavorite && styles.favoriteTextActive,
                ]}
              >
                Mark as favorite
              </Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {success ? <Text style={styles.successText}>{success}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryButton, !canSubmit && styles.buttonDisabled]}
            disabled={!canSubmit || loading}
            onPress={handleSubmit}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.text} />
            ) : (
              <Text style={styles.primaryText}>Save item</Text>
            )}
          </TouchableOpacity>
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
  section: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  imagePicker: {
    height: 180,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    fontSize: 12,
    color: theme.colors.textSoft,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontSize: 13,
    color: theme.colors.text,
    backgroundColor: "#FFF9F0",
    marginBottom: theme.spacing.sm,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
  },
  pillActive: {
    backgroundColor: theme.colors.primary,
  },
  pillText: {
    fontSize: 11,
    color: theme.colors.textSoft,
    fontWeight: "600",
  },
  pillTextActive: {
    color: theme.colors.text,
  },
  inlineRow: {
    marginTop: theme.spacing.sm,
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  inlineInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    fontSize: 12,
    color: theme.colors.text,
    backgroundColor: "#FFF9F0",
  },
  inlineButton: {
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.text,
  },
  favoriteToggle: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
  },
  favoriteToggleActive: {
    backgroundColor: theme.colors.primary,
  },
  favoriteText: {
    fontSize: 12,
    color: theme.colors.textSoft,
    fontWeight: "600",
  },
  favoriteTextActive: {
    color: theme.colors.text,
  },
  primaryButton: {
    marginTop: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  primaryText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorText: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    fontSize: 12,
    color: "#C44536",
  },
  successText: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    fontSize: 12,
    color: "#2E7D32",
  },
  emptyText: {
    fontSize: 11,
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
