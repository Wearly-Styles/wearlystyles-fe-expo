import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../components/AppHeader";
import { theme } from "../constants/theme";
import { clothingApi } from "../services/outfitApi";
import { Ionicons } from "@expo/vector-icons";

export default function ClothingDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [item, setItem] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDetail = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const res = await clothingApi.getItemById(Number(id) as any);

                const data = (res as any)?.name ? res : (res as any)?.data;
                if (data) {
                    setItem(data);
                } else {
                    setError("Item not found.");
                }
            } catch (err: any) {
                setError(err.message || "Failed to fetch item details.");
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
    }, [id]);

    const handleEditNavigation = () => {
        router.push({
            pathname: "/update-item",
            params: {
                id: id,
                initialData: JSON.stringify(item) 
            }
        });
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
            </SafeAreaView>
        );
    }

    if (error || !item) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <AppHeader title="Detail" onBackPress={() => router.back()} />
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error || "Item not found"}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <AppHeader
                    title="Item Details"
                    subtitle={item.name}
                    onBackPress={() => router.back()}
                />

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* IMAGE SECTION */}
                    <View style={styles.imageContainer}>
                        {item.image ? (
                            <Image source={{ uri: item.image }} style={styles.mainImage} resizeMode="cover" />
                        ) : (
                            <View style={[styles.mainImage, styles.placeholderImage]}>
                                <Text style={styles.imagePlaceholderText}>No Image</Text>
                            </View>
                        )}

                        {item.isFavorite && (
                            <View style={styles.favoriteBadge}>
                                <Text style={styles.favoriteBadgeText}>★ Favorite</Text>
                            </View>
                        )}
                    </View>

                    {/* INFO SECTION */}
                    <View style={styles.infoSection}>
                        <View style={styles.headerRow}>
                            <Text style={styles.itemName}>Name: {item.name}</Text>
                            <TouchableOpacity style={styles.editIconButton} onPress={handleEditNavigation}>
                                <Text style={styles.editText}>Edit</Text>
                            </TouchableOpacity>
                        </View>

                        {item.category?.name && (
                            <View style={styles.categoryPill}>
                                <Text style={styles.categoryText}>Category: {item.category.name}</Text>
                            </View>
                        )}

                        <View style={styles.detailsGrid}>
                            <DetailItem label="Color" value={item.color} />
                            <DetailItem label="Season" value={item.season} />
                            <DetailItem label="Material" value={item.material} />
                        </View>

                        {item.description && (
                            <View style={styles.descriptionBox}>
                                <Text style={styles.sectionTitle}>Description</Text>
                                <Text style={styles.descriptionText}>{item.description}</Text>
                            </View>
                        )}
                    </View>
                </ScrollView>

                {/* FIXED FOOTER BUTTON */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={handleEditNavigation}
                    >
                        <Text style={styles.primaryButtonText}>Edit This Item</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const DetailItem = ({ label, value }: { label: string, value: string }) => (
    <View style={styles.detailItem}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value || "Not set"}</Text>
    </View>
);

const styles = StyleSheet.create({
    safeArea: { 
        flex: 1, 
        backgroundColor: theme.colors.background 
    },
    container: { 
        flex: 1 
    },
    scrollContent: { 
        paddingBottom: 100 
    },
    imageContainer: {
        width: '100%',
        height: 340,
        backgroundColor: theme.colors.surface,
        position: 'relative',
    },
    mainImage: { 
        width: '100%', 
        height: '100%' 
    },
    placeholderImage: { 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    imagePlaceholderText: { 
        color: theme.colors.textSoft 
    },
    favoriteBadge: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: theme.radius.pill,
    },
    favoriteBadgeText: { 
        fontSize: 10, 
        fontWeight: '700', 
        color: theme.colors.text 
    },
    infoSection: {
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -20,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    itemName: { 
        fontSize: 18, 
        fontWeight: '700', 
        color: theme.colors.text, 
        flex: 1 
    },
    editIconButton: { 
        padding: 4 
    },
    editText: { 
        color: theme.colors.primary, 
        fontWeight: '600', 
        fontSize: 15
    },
    categoryPill: {
        backgroundColor: theme.colors.surface,
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: theme.radius.pill,
        marginBottom: 20,
    },
    categoryText: { 
        fontSize: 12, 
        color: theme.colors.textSoft, 
        fontWeight: '600' 
    },
    detailsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        marginBottom: 24,
    },
    detailItem: { 
        width: '30%', 
        marginBottom: 16 
    },
    detailLabel: { 
        fontSize: 11, 
        color: theme.colors.textSoft, 
        marginBottom: 4, 
        textTransform: 'uppercase' 
    },
    detailValue: { 
        fontSize: 14, 
        color: theme.colors.text, 
        fontWeight: '600' 
    },
    sectionTitle: { 
        fontSize: 13, 
        fontWeight: '700', 
        color: theme.colors.text, 
        marginBottom: 8 
    },
    descriptionBox: { 
        marginTop: 8 
    },
    descriptionText: { 
        fontSize: 13, 
        color: theme.colors.textSoft, 
        lineHeight: 20 
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.background,
    },
    primaryButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 14,
        borderRadius: theme.radius.pill,
        alignItems: "center",
        elevation: 4,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    primaryButtonText: { 
        fontSize: 14, 
        fontWeight: "700", 
        color: theme.colors.text 
    },
    errorContainer: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    errorText: { 
        color: '#C44536', 
        fontSize: 14 
    },
});