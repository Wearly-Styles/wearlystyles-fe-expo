import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    ActivityIndicator,
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
import { theme } from "../constants/theme";
import { clothingApi } from "../services/outfitApi";
import type { Category } from "../services/types";
import { showErrorToast, showInfoToast, showSuccessToast } from "../utils/toast";

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

export default function UpdateClothingItemScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

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

    const [loadingItem, setLoadingItem] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canSubmit = useMemo(() => {
        return Boolean(name.trim()) && Boolean(image?.uri);
    }, [name, image]);


    useEffect(() => {
        const fetchData = async () => {
            if (!id) {
                return;
            }

            setLoadingItem(true);
            setError(null);

            try {
                const [catRes, itemRes] = await Promise.all([
                    clothingApi.listCategories(),
                    clothingApi.getItemById(id as any)
                ]);

                const categoriesData = (catRes as any)?.data || catRes || [];
                setCategories(Array.isArray(categoriesData) ? categoriesData : []);

                const item = (itemRes as any)?.name ? itemRes : (itemRes as any)?.data;

                if (item) {
                    setName(item.name || "");
                    setColor(item.color || "");
                    setMaterial(item.material || "");
                    setDescription(item.description || "");

                    const validSeason = SEASONS.includes(item.season) ? item.season : SEASONS[0];
                    setSeason(validSeason);
                    setIsFavorite(Boolean(item.isFavorite));

                    const cId = item.categoryId || item.category?.id;
                    setSelectedCategoryId(cId ? Number(cId) : null);

                    if (item.image) {
                        setImage({
                            uri: item.image,
                            name: "current_image.jpg",
                            type: "image/jpeg",
                        });
                    }
                } else {
                    setError("Item not found.");
                }

            } catch (err: any) {
                const serverMessage = err.response?.data?.message || err.message;
                const status = err.response?.status || err.status;

                if (status === 404) {
                    setError("Item not found.");
                } else {
                    setError(serverMessage || "Failed to connect to the server.");
                }
            } finally {
                setLoadingItem(false);
            }
        };

        fetchData();
    }, [id]);

    const handlePickImage = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            showInfoToast("Allow photo access to change this item image.", {
                title: "Permission needed",
            });
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
        });

        if (!result.canceled && result.assets?.[0]) {
            const asset = result.assets[0];
            setImage({
                uri: asset.uri,
                name: asset.fileName || getFileNameFromUri(asset.uri),
                type: asset.mimeType || "image/jpeg",
            });
        }
    };

    const handleCreateCategory = async () => {
        if (!newCategory.trim()) {
            showInfoToast("Enter a category name first.", {
                title: "Category name required",
            });
            return;
        }

        try {
            const created = await clothingApi.createCategory({
                name: newCategory.trim(),
            });

            setCategories((prev) =>
                [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
            );
            setSelectedCategoryId(created.id);
            setNewCategory("");
            showSuccessToast(`"${created.name}" is ready to use.`, {
                title: "Category added",
            });
        } catch {
            setError("We couldn't create that category.");
            showErrorToast("We couldn't create that category.", {
                title: "Category not added",
            });
        }
    };

    const handleDeleteCategory = (categoryId: number, categoryName: string) => {
        Alert.alert(
            "Delete category",
            `Delete "${categoryName}" from your categories?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await clothingApi.deleteCategory(categoryId);

                            setCategories((prev) => prev.filter((cat) => cat.id !== categoryId));

                            if (selectedCategoryId === categoryId) {
                                setSelectedCategoryId(null);
                            }
                            showInfoToast(`"${categoryName}" was removed.`, {
                                title: "Category deleted",
                            });
                        } catch (err: any) {
                            console.error("Delete category error:", err);
                            const message =
                                err instanceof Error
                                    ? err.message
                                    : "We couldn't delete that category.";
                            showErrorToast(message, {
                                title: "Category not deleted",
                            });
                        }
                    }
                },
            ]
        );
    };

    const handleSubmit = async () => {
        if (!id || !canSubmit) return;

        setLoading(true);
        setError(null);

        try {
            const form = new FormData();

            if (image && image.uri && !image.uri.startsWith('http')) {
                form.append("image", {
                    uri: image.uri,
                    name: image.name || "upload.jpg",
                    type: image.type || "image/jpeg",
                } as any);
            }

            form.append("name", name.trim());
            form.append("color", color.trim());
            form.append("material", material.trim());
            form.append("description", description.trim());
            form.append("season", season);
            form.append("isFavorite", String(isFavorite));

            if (selectedCategoryId) {
                form.append("categoryId", String(selectedCategoryId));
            }

            await clothingApi.updateItem(Number(id), form);
            showSuccessToast("Item details were updated.", {
                title: "Wardrobe item updated",
            });
            setTimeout(() => {
                router.replace("/wardrobe");
            }, 200);

        } catch (err: any) {
            console.error("Update error:", err);
            const message =
                err.response?.data?.message || "We couldn't update this item.";
            setError(message);
            showErrorToast(message, {
                title: "Wardrobe item not updated",
            });
        } finally {
            setLoading(false);
        }
    };

    if (loadingItem) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <ActivityIndicator style={{ marginTop: 40 }} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <AppHeader
                        title="Update wardrobe item"
                        subtitle="Edit your item details"
                        onBackPress={() => router.back()}
                    />

                    {/* PHOTO */}
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

                    {/* BASICS */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Basics</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Item name"
                            value={name}
                            onChangeText={setName}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Color"
                            value={color}
                            onChangeText={setColor}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Material"
                            value={material}
                            onChangeText={setMaterial}
                        />
                        <TextInput
                            style={[styles.input, styles.inputMultiline]}
                            placeholder="Description"
                            value={description}
                            onChangeText={setDescription}
                            multiline
                        />
                    </View>

                    {/* SEASON */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Season</Text>
                        <View style={styles.pillRow}>
                            {SEASONS.map((label) => (
                                <TouchableOpacity
                                    key={label}
                                    style={[
                                        styles.pill,
                                        season === label && styles.pillActive,
                                    ]}
                                    onPress={() => setSeason(label)}
                                >
                                    <Text
                                        style={[
                                            styles.pillText,
                                            season === label && styles.pillTextActive,
                                        ]}
                                    >
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* CATEGORY SECTION */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Category</Text>

                        <View>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.categoryScrollContainer}
                            >
                                {categories.map((category) => (
                                    <TouchableOpacity
                                        key={category.id}
                                        style={[
                                            styles.pill,
                                            selectedCategoryId === category.id && styles.pillActive,
                                        ]}
                                        onPress={() =>
                                            setSelectedCategoryId(
                                                selectedCategoryId === category.id ? null : category.id
                                            )
                                        }
                                        onLongPress={() => handleDeleteCategory(category.id, category.name)}
                                        delayLongPress={500}
                                    >
                                        <Text
                                            style={[
                                                styles.pillText,
                                                selectedCategoryId === category.id && styles.pillTextActive,
                                            ]}
                                        >
                                            {category.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.inlineRow}>
                            <TextInput
                                style={styles.inlineInput}
                                placeholder="New category"
                                value={newCategory}
                                onChangeText={setNewCategory}
                            />
                            <TouchableOpacity
                                style={styles.inlineButton}
                                onPress={handleCreateCategory}
                            >
                                <Text style={styles.inlineButtonText}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* FAVORITE */}
                    <View style={styles.section}>
                        <TouchableOpacity
                            style={[
                                styles.favoriteToggle,
                                isFavorite && styles.favoriteToggleActive,
                            ]}
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

                    {error && <Text style={styles.errorText}>{error}</Text>}

                    <TouchableOpacity
                        style={[
                            styles.primaryButton,
                            !canSubmit && styles.buttonDisabled,
                        ]}
                        disabled={!canSubmit || loading}
                        onPress={handleSubmit}
                    >
                        {loading ? (
                            <ActivityIndicator color={theme.colors.text} />
                        ) : (
                            <Text style={styles.primaryText}>Update item</Text>
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
    categoryScrollContainer: {
        paddingHorizontal: theme.spacing.lg,
        flexDirection: "row",
        alignItems: "center",
        paddingBottom: 4,
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
        marginRight: 8
    },
    pillActive: {
        backgroundColor: theme.colors.primary,
    },
    pillText: {
        fontSize: 12,
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
