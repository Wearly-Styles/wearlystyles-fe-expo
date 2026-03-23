import { useEffect, useMemo, useState } from "react";
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
import { useRouter } from "expo-router";
import AppHeader from "../components/AppHeader";
import OutfitCard from "../components/OutfitCard";
import { theme } from "../constants/theme";
import { contextApi, outfitApi, outfitHistoryApi } from "../services/outfitApi";
import type {
  NormalizedClosetItem,
  OutfitEntity,
  OutfitHistoryEntity,
} from "../services/types";
import { getOutfitById, setOutfitCache } from "../utils/outfitStore";
import type { Outfit, OutfitItem } from "../constants/mockOutfits";
import { showErrorToast, showSuccessToast } from "../utils/toast";

type OutfitDetailScreenProps = {
  outfitId: string;
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80";

const getClosetItemId = (item: OutfitItem) =>
  Number(String(item.id).split("-")[0]);

const getPieceName = (item: OutfitItem) =>
  item.subtitle?.trim() || item.title?.trim() || "Wardrobe item";

const getPieceLabel = (item: OutfitItem) =>
  item.title?.trim() || "Piece";

const toOutfitItem = (item: NormalizedClosetItem): OutfitItem => ({
  id: String(item.id),
  title: item.category || "Item",
  subtitle: item.name || "Closet pick",
  image: item.image || FALLBACK_IMAGE,
});

const toOutfit = (entity: OutfitEntity): Outfit => {
  const items =
    entity.items?.map((entry, index) => {
      const clothingItem = entry.clothingItem;
      const categoryName = clothingItem?.category?.name || "Item";
      return {
        id: String(clothingItem?.id ?? entry.clothingItemId ?? entry.id ?? index),
        title: categoryName,
        subtitle: clothingItem?.name || "Wardrobe item",
        image: clothingItem?.image || FALLBACK_IMAGE,
      };
    }) || [];

  return {
    id: String(entity.id),
    title: entity.name || `Outfit #${entity.id}`,
    subtitle: entity.occasion || "Saved outfit",
    image: items[0]?.image || FALLBACK_IMAGE,
    tags: [entity.occasion, entity.weather].filter(
      (value): value is string => Boolean(value && value.trim()),
    ),
    items,
    weather: entity.weather || "Weather unavailable",
    mood: entity.occasion || "Scheduled",
  };
};

export default function OutfitDetailScreen({ outfitId }: OutfitDetailScreenProps) {
  const router = useRouter();
  const cachedOutfit = useMemo(() => getOutfitById(outfitId), [outfitId]);
  const [outfit, setOutfit] = useState<Outfit | null>(cachedOutfit ?? null);
  const [draftOutfit, setDraftOutfit] = useState<Outfit | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [closetItems, setClosetItems] = useState<NormalizedClosetItem[]>([]);
  const [closetLoading, setClosetLoading] = useState(false);
  const [savingChanges, setSavingChanges] = useState(false);
  const [savingLook, setSavingLook] = useState(false);
  const [wearingToday, setWearingToday] = useState(false);
  const [wearingLoading, setWearingLoading] = useState(false);

  const numericOutfitId = Number(outfitId);
  const isPersistedOutfit = Number.isInteger(numericOutfitId) && numericOutfitId > 0;
  const canEditItems = Boolean((outfit ?? cachedOutfit)?.items.length);
  const displayOutfit = isEditing ? draftOutfit ?? outfit : outfit;

  useEffect(() => {
    setOutfit(cachedOutfit ?? null);
    setLoadError(null);
  }, [cachedOutfit]);

  useEffect(() => {
    setDraftOutfit(null);
    setIsEditing(false);
    setSelectedSlot(0);
    setWearingToday(false);
  }, [outfitId]);

  useEffect(() => {
    let isActive = true;
    const needsRemoteDetail =
      isPersistedOutfit &&
      (!cachedOutfit || !cachedOutfit.items.length);

    if (!needsRemoteDetail) {
      return () => {
        isActive = false;
      };
    }

    const loadOutfit = async () => {
      setLoading(true);
      try {
        const entity = await outfitApi.getOutfitById(numericOutfitId);
        if (!isActive) return;
        const mapped = toOutfit(entity);
        setOutfit(mapped);
        setOutfitCache([mapped]);
        setLoadError(null);
      } catch (error) {
        if (!isActive) return;
        setLoadError(error instanceof Error ? error.message : "Failed to load outfit");
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void loadOutfit();
    return () => {
      isActive = false;
    };
  }, [cachedOutfit, isPersistedOutfit, numericOutfitId]);

  useEffect(() => {
    let isActive = true;
    if (!isPersistedOutfit) {
      return () => {
        isActive = false;
      };
    }

    const loadTodayStatus = async () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      try {
        const histories = await outfitHistoryApi.listHistories(
          from.toISOString(),
          to.toISOString(),
        );
        if (!isActive) return;
        setWearingToday(
          (histories || []).some(
            (entry: OutfitHistoryEntity) => Number(entry.outfitId) === numericOutfitId,
          ),
        );
      } catch {
        if (isActive) {
          setWearingToday(false);
        }
      }
    };

    void loadTodayStatus();
    return () => {
      isActive = false;
    };
  }, [isPersistedOutfit, numericOutfitId]);

  const selectedSwapCategory = useMemo(() => {
    if (!isEditing) return null;
    const selectedItem = draftOutfit?.items?.[selectedSlot];
    if (!selectedItem) return null;

    const selectedId = getClosetItemId(selectedItem);
    if (!Number.isFinite(selectedId)) {
      return selectedItem.title || null;
    }

    const matched = closetItems.find((item) => item.id === selectedId);
    return matched?.category || selectedItem.title || null;
  }, [closetItems, draftOutfit, isEditing, selectedSlot]);

  const swapOptions = useMemo<OutfitItem[]>(() => {
    if (!closetItems.length) return [];
    const all = closetItems.map(toOutfitItem);
    if (!isEditing) return all;

    const selectedItem = draftOutfit?.items?.[selectedSlot];
    if (!selectedItem) return all;

    const selectedId = getClosetItemId(selectedItem);
    if (!Number.isFinite(selectedId)) {
      return all;
    }

    const matched = closetItems.find((item) => item.id === selectedId);
    const matchedCategoryId = matched?.categoryId;

    if (matchedCategoryId) {
      return closetItems
        .filter((item) => item.categoryId === matchedCategoryId)
        .map(toOutfitItem);
    }

    const matchedCategory = (matched?.category || selectedItem.title || "").trim();
    if (!matchedCategory) return all;

    const normalized = matchedCategory.toLowerCase();
    return closetItems
      .filter((item) => (item.category || "").toLowerCase() === normalized)
      .map(toOutfitItem);
  }, [closetItems, draftOutfit, isEditing, selectedSlot]);

  const handleOpenEdit = async () => {
    if (!outfit) return;
    if (!outfit.items.length) {
      showErrorToast("This look doesn't have item details yet.", {
        title: "Can't edit items",
      });
      return;
    }

    setDraftOutfit(outfit);
    setIsEditing(true);
    setSelectedSlot(0);

    if (closetItems.length) {
      return;
    }

    setClosetLoading(true);
    try {
      const closet = await contextApi.getCloset();
      setClosetItems(closet || []);
    } catch (error) {
      setDraftOutfit(null);
      setIsEditing(false);
      showErrorToast(
        error instanceof Error ? error.message : "We couldn't load your wardrobe.",
        { title: "Wardrobe unavailable" },
      );
    } finally {
      setClosetLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setDraftOutfit(null);
    setIsEditing(false);
    setSelectedSlot(0);
  };

  const handleReplaceItem = (replacement: OutfitItem) => {
    setDraftOutfit((prev) => {
      if (!prev) return prev;
      const items = [...prev.items];
      if (!items[selectedSlot]) {
        return prev;
      }

      items[selectedSlot] = replacement;
      return {
        ...prev,
        image: items[0]?.image || prev.image,
        items,
      };
    });
  };

  const handleSaveChanges = async () => {
    if (!draftOutfit) {
      return;
    }

    const items = Array.from(
      new Set(
        draftOutfit.items
          .map((item) => getClosetItemId(item))
          .filter((id) => Number.isFinite(id)),
      ),
    );

    if (!items.length) {
      showErrorToast("Choose at least one wardrobe item.", {
        title: "Can't save changes",
      });
      return;
    }

    setSavingChanges(true);
    try {
      if (!isPersistedOutfit) {
        setOutfit(draftOutfit);
        setOutfitCache([draftOutfit]);
        setDraftOutfit(null);
        setIsEditing(false);
        setSelectedSlot(0);
        showSuccessToast("Your edits were applied to this suggestion.", {
          title: "Suggestion updated",
        });
        return;
      }

      const updated = await outfitApi.updateOutfit(numericOutfitId, {
        name: draftOutfit.title,
        occasion: draftOutfit.subtitle || undefined,
        weather: draftOutfit.weather || undefined,
        items,
      });
      const mapped = toOutfit(updated);
      setOutfit(mapped);
      setOutfitCache([mapped]);
      setDraftOutfit(null);
      setIsEditing(false);
      setSelectedSlot(0);
      showSuccessToast(
        "Saved changes to this outfit. Scheduled days using it will use the latest version.",
        { title: "Outfit updated" },
      );
    } catch (error) {
      showErrorToast(
        error instanceof Error ? error.message : "We couldn't save your outfit changes.",
        { title: "Couldn't update outfit" },
      );
    } finally {
      setSavingChanges(false);
    }
  };

  const handleSaveLook = async () => {
    const activeOutfit = displayOutfit ?? outfit;
    if (!activeOutfit) return;

    const items = Array.from(
      new Set(
        activeOutfit.items
          .map((item) => getClosetItemId(item))
          .filter((id) => Number.isFinite(id)),
      ),
    );

    if (!items.length) {
      showErrorToast("Choose at least one wardrobe item before saving this look.", {
        title: "Can't save look",
      });
      return;
    }

    setSavingLook(true);
    try {
      const saved = await outfitApi.createOutfit({
        name: activeOutfit.title,
        occasion: activeOutfit.subtitle || undefined,
        weather: activeOutfit.weather || undefined,
        items,
      });

      if (!saved?.id) {
        throw new Error("Save failed: missing outfit id.");
      }

      const savedOutfit: Outfit = {
        ...activeOutfit,
        id: String(saved.id),
      };

      setOutfit(savedOutfit);
      setOutfitCache([savedOutfit]);
      showSuccessToast("This look was added to Your Outfits.", {
        title: "Look saved",
      });
      router.replace(`/outfit/${saved.id}`);
    } catch (error) {
      showErrorToast(
        error instanceof Error ? error.message : "We couldn't save this look.",
        { title: "Couldn't save look" },
      );
    } finally {
      setSavingLook(false);
    }
  };

  const handleWearToday = async () => {
    if (!isPersistedOutfit) {
      showErrorToast("Save this look first before marking it as worn today.", {
        title: "Save the look first",
      });
      return;
    }

    setWearingLoading(true);
    try {
      await outfitHistoryApi.wearToday({ outfitId: numericOutfitId });
      setWearingToday(true);
      showSuccessToast("Added to your outfit history for today.", {
        title: "Marked as worn",
      });
    } catch (error) {
      showErrorToast(
        error instanceof Error ? error.message : "We couldn't update your outfit history.",
        { title: "Couldn't mark as worn" },
      );
    } finally {
      setWearingLoading(false);
    }
  };

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
              {loading
                ? "Loading outfit details..."
                : "We could not find this outfit. Try refreshing recommendations."}
            </Text>
            {loading ? (
              <ActivityIndicator color={theme.colors.primaryDark} />
            ) : (
              <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
                <Text style={styles.primaryText}>Go back</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const activeOutfit = displayOutfit ?? outfit;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <AppHeader
            title="Outfit Details"
            subtitle="See selected pieces"
            onBackPress={() => router.back()}
          />
          <View style={styles.outfitCardWrap}>
            <OutfitCard outfit={activeOutfit} variant="detail" />
          </View>
          {isEditing ? (
            <View style={styles.editingNotice}>
              <Text style={styles.editingNoticeText}>Editing this outfit</Text>
            </View>
          ) : null}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pieces</Text>
            {displayOutfit?.items.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.itemsRow}
              >
                {displayOutfit.items.map((item, index) => (
                  <TouchableOpacity
                    key={`${item.id}-${index}`}
                    style={[
                      styles.itemCard,
                      isEditing && index === selectedSlot && styles.itemCardActive,
                    ]}
                    activeOpacity={isEditing ? 0.85 : 1}
                    onPress={() => {
                      if (isEditing) {
                        setSelectedSlot(index);
                      }
                    }}
                  >
                    <View style={styles.itemImageWrap}>
                      <Image source={{ uri: item.image }} style={styles.itemImage} />
                    </View>
                    <View style={styles.itemBody}>
                      <View style={styles.itemCardHeader}>
                        <View style={styles.itemBadge}>
                          <Text style={styles.itemBadgeText} numberOfLines={1}>
                            {getPieceLabel(item)}
                          </Text>
                        </View>
                        {isEditing && index === selectedSlot ? (
                          <View style={[styles.itemBadge, styles.itemBadgeActive]}>
                            <Text style={styles.itemBadgeTextActive}>Selected</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {getPieceName(item)}
                      </Text>
                      {getPieceName(item) !== getPieceLabel(item) ? (
                        <Text style={styles.itemSubtitle} numberOfLines={1}>
                          {getPieceLabel(item)}
                        </Text>
                      ) : null}
                      {isEditing ? (
                        <Text style={styles.itemHint}>
                          {index === selectedSlot
                            ? "Choose a replacement from wardrobe below."
                            : "Tap to swap this piece."}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.reasonCard}>
                <Text style={styles.reasonText}>
                  Item details are not available for this scheduled outfit.
                </Text>
              </View>
            )}
            {loading && !outfit.items.length ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={theme.colors.primaryDark} />
                <Text style={styles.loadingText}>Loading item details...</Text>
              </View>
            ) : null}
            {loadError && !outfit.items.length ? (
              <Text style={styles.errorText}>{loadError}</Text>
            ) : null}
            {isEditing ? (
              <View style={styles.editPanel}>
                <Text style={styles.editTitle}>Swap from your wardrobe</Text>
                <Text style={styles.editSubtitle}>
                  {isPersistedOutfit
                    ? "Changes will update this saved outfit anywhere it is scheduled."
                    : "Changes update this local suggestion until you save the look."}
                </Text>
                {closetLoading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color={theme.colors.primaryDark} />
                    <Text style={styles.loadingText}>Loading matching wardrobe items...</Text>
                  </View>
                ) : swapOptions.length ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.swapRow}
                  >
                    {swapOptions.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.swapCard}
                        activeOpacity={0.85}
                        onPress={() => handleReplaceItem(item)}
                      >
                        <View style={styles.swapBadge}>
                          <Text style={styles.swapBadgeText} numberOfLines={1}>
                            {getPieceLabel(item)}
                          </Text>
                        </View>
                        <Image source={{ uri: item.image }} style={styles.swapImage} />
                        <Text style={styles.swapTitle} numberOfLines={1}>
                          {getPieceName(item)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.reasonCard}>
                    <Text style={styles.reasonText}>
                      {selectedSwapCategory
                        ? `No items found for ${selectedSwapCategory}.`
                        : "No wardrobe items available for swapping."}
                    </Text>
                  </View>
                )}
              </View>
            ) : null}
          </View>
        </ScrollView>
        <View style={styles.footer}>
          {isEditing ? (
            <>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleCancelEdit}>
                <Text style={styles.secondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, savingChanges && styles.buttonDisabled]}
                onPress={() => void handleSaveChanges()}
                disabled={savingChanges}
              >
                {savingChanges ? (
                  <ActivityIndicator color={theme.colors.text} />
                ) : (
                  <Text style={styles.primaryText}>Save changes</Text>
                )}
              </TouchableOpacity>
            </>
          ) : canEditItems ? (
            <>
              <TouchableOpacity
                style={[styles.secondaryButton, savingLook && styles.buttonDisabled]}
                onPress={() => void handleOpenEdit()}
                disabled={savingLook}
              >
                <Text style={styles.secondaryText}>Edit items</Text>
              </TouchableOpacity>
              {isPersistedOutfit ? (
                <TouchableOpacity
                  style={[styles.primaryButton, (wearingLoading || wearingToday) && styles.buttonDisabled]}
                  onPress={() => void handleWearToday()}
                  disabled={wearingLoading || wearingToday}
                >
                  {wearingLoading ? (
                    <ActivityIndicator color={theme.colors.text} />
                  ) : (
                    <Text style={styles.primaryText}>
                      {wearingToday ? "Worn today" : "Wear today"}
                    </Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.primaryButton, savingLook && styles.buttonDisabled]}
                  onPress={() => void handleSaveLook()}
                  disabled={savingLook}
                >
                  {savingLook ? (
                    <ActivityIndicator color={theme.colors.text} />
                  ) : (
                    <Text style={styles.primaryText}>Save look</Text>
                  )}
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>Save look</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={() => void handleWearToday()}>
                <Text style={styles.primaryText}>Wear today</Text>
              </TouchableOpacity>
            </>
          )}
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
  outfitCardWrap: {
    marginTop: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
  },
  editingNotice: {
    marginTop: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    alignSelf: "flex-start",
  },
  editingNoticeText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.accent,
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
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.xs,
  },
  itemCard: {
    width: 188,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    flexDirection: "column",
    alignItems: "stretch",
    gap: theme.spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  itemCardActive: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.card,
  },
  itemCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    flexWrap: "wrap",
  },
  itemBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.chip,
    maxWidth: "100%",
  },
  itemBadgeActive: {
    backgroundColor: theme.colors.primary,
  },
  itemBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: theme.colors.textSoft,
  },
  itemBadgeTextActive: {
    fontSize: 9,
    fontWeight: "700",
    color: theme.colors.text,
  },
  itemImageWrap: {
    height: 128,
    width: "100%",
    borderRadius: theme.radius.md,
    backgroundColor: "#F6F0E6",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemImage: {
    width: 96,
    height: 96,
    borderRadius: theme.radius.sm,
  },
  itemBody: {
    width: "100%",
    minWidth: 0,
  },
  itemTitle: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
  },
  itemSubtitle: {
    marginTop: 2,
    fontSize: 10,
    color: theme.colors.textSoft,
  },
  itemHint: {
    marginTop: 6,
    fontSize: 10,
    color: theme.colors.accent,
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
  loadingRow: {
    marginTop: theme.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  loadingText: {
    fontSize: 12,
    color: theme.colors.textSoft,
  },
  errorText: {
    marginTop: theme.spacing.sm,
    fontSize: 12,
    color: theme.colors.accent,
  },
  editPanel: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  editTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text,
  },
  editSubtitle: {
    fontSize: 11,
    color: theme.colors.textSoft,
  },
  swapRow: {
    gap: theme.spacing.sm,
    paddingVertical: 2,
  },
  swapCard: {
    width: 96,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    gap: 8,
  },
  swapBadge: {
    alignSelf: "stretch",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.chip,
  },
  swapBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: theme.colors.textSoft,
    textAlign: "center",
  },
  swapImage: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.sm,
  },
  swapTitle: {
    fontSize: 11,
    color: theme.colors.text,
    fontWeight: "600",
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
  buttonDisabled: {
    opacity: 0.6,
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
