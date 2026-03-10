import type { Outfit, OutfitItem } from "../constants/mockOutfits";
import type {
  NormalizedClosetItem,
  NormalizedWeather,
  OutfitRecommendation,
  RecommendationResponse,
} from "../services/types";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80";

type OutfitSlot =
  | "top"
  | "bottom"
  | "footwear"
  | "outerwear"
  | "onepiece"
  | "accessory"
  | "other";

const MIN_OUTFIT_ITEMS = 3;
const MAX_OUTFIT_ITEMS = 6;
const ROLE_LIMITS: Partial<Record<OutfitSlot, number>> = {
  top: 1,
  bottom: 1,
  footwear: 1,
  outerwear: 1,
  onepiece: 1,
};

const toWeatherLabel = (weather?: NormalizedWeather) => {
  if (!weather) return "Weather unavailable";
  const temp = weather.tempC !== null ? `${Math.round(weather.tempC)}C` : "N/A";
  const tag = weather.tags?.[0] ? weather.tags[0] : "Unknown";
  return `${tag} - ${temp}`;
};

const toMoodLabel = (rec: OutfitRecommendation) =>
  rec.style || rec.eventType || "Balanced";

const normalizeText = (value?: string | null) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\u0111/g, "d")
    .trim();

const buildItemText = (item: NormalizedClosetItem) =>
  [
    item.name,
    item.category,
    item.color,
    item.season,
    item.material,
    ...(item.tags || []),
  ]
    .map((value) => normalizeText(value))
    .join(" ");

const hasAnyKeyword = (text: string, keywords: string[]) =>
  keywords.some((keyword) => text.includes(keyword));

const getItemSlot = (item: NormalizedClosetItem): OutfitSlot => {
  const text = buildItemText(item);

  if (
    hasAnyKeyword(text, [
      "shoe",
      "sneaker",
      "boot",
      "heel",
      "sandal",
      "loafer",
      "flat",
      "trainer",
      "giay",
      "dep",
      "cao got",
    ])
  ) {
    return "footwear";
  }

  if (
    hasAnyKeyword(text, [
      "coat",
      "jacket",
      "blazer",
      "parka",
      "trench",
      "cardigan",
      "vest",
      "ao khoac",
      "khoac",
    ])
  ) {
    return "outerwear";
  }

  if (
    hasAnyKeyword(text, [
      "dress",
      "jumpsuit",
      "romper",
      "maxi dress",
      "mini dress",
      "bodycon",
      "dam",
      "ao dai",
    ])
  ) {
    return "onepiece";
  }

  if (
    hasAnyKeyword(text, [
      "pants",
      "jeans",
      "trouser",
      "trousers",
      "shorts",
      "skirt",
      "leggings",
      "jogger",
      "joggers",
      "chinos",
      "slacks",
      "culottes",
      "denim",
      "quan",
      "chan vay",
    ])
  ) {
    return "bottom";
  }

  if (
    hasAnyKeyword(text, [
      "shirt",
      "t-shirt",
      "tshirt",
      "tee",
      "blouse",
      "polo",
      "sweater",
      "sweatshirt",
      "hoodie",
      "tank",
      "camisole",
      "crop top",
      "top",
      "ao",
    ])
  ) {
    return "top";
  }

  if (
    hasAnyKeyword(text, [
      "bag",
      "hat",
      "cap",
      "scarf",
      "belt",
      "watch",
      "jewelry",
      "bracelet",
      "necklace",
      "glasses",
      "accessory",
      "tui",
      "non",
      "kinh",
      "that lung",
      "phu kien",
    ])
  ) {
    return "accessory";
  }

  return "other";
};

const getCategoryKey = (item: NormalizedClosetItem) => {
  if (typeof item.categoryId === "number") {
    return `category-id:${item.categoryId}`;
  }

  const normalizedCategory = normalizeText(item.category);
  if (normalizedCategory) {
    return `category-name:${normalizedCategory}`;
  }

  const normalizedName = normalizeText(item.name);
  if (normalizedName) {
    return `item-name:${normalizedName}`;
  }

  return `item-id:${item.id}`;
};

const dedupeById = (items: NormalizedClosetItem[]) => {
  const seen = new Set<number>();
  const unique: NormalizedClosetItem[] = [];
  items.forEach((item) => {
    if (!Number.isFinite(item.id) || seen.has(item.id)) return;
    seen.add(item.id);
    unique.push(item);
  });
  return unique;
};

const toOutfitItem = (item: NormalizedClosetItem, index: number): OutfitItem => ({
  id: String(item.id),
  title: item.category || `Item ${index + 1}`,
  subtitle: item.name || "Style pick",
  image: item.image || FALLBACK_IMAGE,
});

const scoreFallbackItem = (item: NormalizedClosetItem) => {
  let score = 0;
  if (item.isFavorite) score += 3;

  const slot = getItemSlot(item);
  if (slot === "footwear") score += 2;
  if (slot === "top" || slot === "bottom" || slot === "onepiece") score += 1;

  return score;
};

const sanitizeRecommendationItems = (
  rec: OutfitRecommendation,
  closet: NormalizedClosetItem[],
): OutfitItem[] => {
  const closetById = new Map<number, NormalizedClosetItem>();
  closet.forEach((item) => closetById.set(item.id, item));

  const sourceItems = dedupeById([
    ...(rec.outfit?.items || []),
    ...((rec.items || [])
      .map((id) => closetById.get(id))
      .filter((item): item is NormalizedClosetItem => Boolean(item))),
  ]);

  const rankedCloset = dedupeById([...closet]).sort((left, right) => {
    const scoreDiff = scoreFallbackItem(right) - scoreFallbackItem(left);
    if (scoreDiff !== 0) return scoreDiff;
    return left.id - right.id;
  });

  const candidatePool = dedupeById([...sourceItems, ...rankedCloset]);
  const selectedIds = new Set<number>();
  const selectedCategoryKeys = new Set<string>();
  const selectedRoleCounts: Partial<Record<OutfitSlot, number>> = {};
  const selectedItems: NormalizedClosetItem[] = [];

  const hasRole = (role: OutfitSlot) =>
    candidatePool.some((item) => getItemSlot(item) === role);

  const seedRoleScore = (roles: OutfitSlot[]) =>
    roles.reduce(
      (count, role) =>
        count + (sourceItems.some((item) => getItemSlot(item) === role) ? 1 : 0),
      0,
    );

  const canAdd = (item: NormalizedClosetItem) => {
    if (selectedIds.has(item.id)) return false;

    const categoryKey = getCategoryKey(item);
    if (selectedCategoryKeys.has(categoryKey)) return false;

    const slot = getItemSlot(item);
    const limit = ROLE_LIMITS[slot];
    if (typeof limit === "number" && (selectedRoleCounts[slot] || 0) >= limit) {
      return false;
    }

    if (
      slot === "onepiece" &&
      ((selectedRoleCounts.top || 0) > 0 || (selectedRoleCounts.bottom || 0) > 0)
    ) {
      return false;
    }

    if (
      (slot === "top" || slot === "bottom") &&
      (selectedRoleCounts.onepiece || 0) > 0
    ) {
      return false;
    }

    return true;
  };

  const addItem = (item: NormalizedClosetItem) => {
    if (!canAdd(item)) return false;

    selectedIds.add(item.id);
    selectedCategoryKeys.add(getCategoryKey(item));

    const slot = getItemSlot(item);
    selectedRoleCounts[slot] = (selectedRoleCounts[slot] || 0) + 1;
    selectedItems.push(item);
    return true;
  };

  const addFirstBySlot = (slot: OutfitSlot) => {
    for (const item of candidatePool) {
      if (getItemSlot(item) === slot && addItem(item)) {
        return true;
      }
    }
    return false;
  };

  const canBuildSeparates =
    hasRole("top") && hasRole("bottom") && hasRole("footwear");
  const canBuildOnepiece = hasRole("onepiece") && hasRole("footwear");
  const shouldUseOnepiece =
    canBuildOnepiece &&
    (!canBuildSeparates ||
      seedRoleScore(["onepiece", "footwear"]) >
        seedRoleScore(["top", "bottom", "footwear"]));

  if (shouldUseOnepiece) {
    addFirstBySlot("onepiece");
    addFirstBySlot("footwear");
    addFirstBySlot("outerwear");
  } else if (canBuildSeparates) {
    addFirstBySlot("top");
    addFirstBySlot("bottom");
    addFirstBySlot("footwear");
    addFirstBySlot("outerwear");
  } else if (canBuildOnepiece) {
    addFirstBySlot("onepiece");
    addFirstBySlot("footwear");
  }

  sourceItems.forEach((item) => {
    addItem(item);
  });

  const targetSize = Math.min(
    MAX_OUTFIT_ITEMS,
    Math.max(MIN_OUTFIT_ITEMS, sourceItems.length || MIN_OUTFIT_ITEMS),
  );

  candidatePool.forEach((item) => {
    if (selectedItems.length >= targetSize) return;
    addItem(item);
  });

  rankedCloset.forEach((item) => {
    if (selectedItems.length >= MIN_OUTFIT_ITEMS) return;
    addItem(item);
  });

  return selectedItems.slice(0, MAX_OUTFIT_ITEMS).map(toOutfitItem);
};

const mapRecommendation = (
  rec: OutfitRecommendation,
  closet: NormalizedClosetItem[],
  weather?: NormalizedWeather,
  index = 0,
): Outfit => {
  const items = sanitizeRecommendationItems(rec, closet);
  return {
    id: rec.eventId || `${index + 1}`,
    title: rec.outfit?.name || rec.style || rec.eventType || "Suggested Look",
    subtitle: rec.eventTitle || rec.notes?.[0] || "Generated for your context",
    image: items[0]?.image || FALLBACK_IMAGE,
    tags: [rec.style, rec.eventType, rec.notes?.[0]].filter(Boolean) as string[],
    items,
    weather: toWeatherLabel(weather),
    mood: toMoodLabel(rec),
  };
};

export const mapRecommendationsToOutfits = (
  response: RecommendationResponse,
  closet: NormalizedClosetItem[],
  weather?: NormalizedWeather,
): Outfit[] => {
  const recommended = response.recommendations || [];
  const all =
    recommended.length > 0
      ? recommended
      : [response.primary, ...(response.alternatives || [])].filter(Boolean);

  return all.map((rec, index) => mapRecommendation(rec, closet, weather, index));
};

export const mapClosetToWardrobe = (
  closet: NormalizedClosetItem[],
): Array<{ id: string; title: string; category: string; image: string }> =>
  closet.map((item) => ({
    id: String(item.id),
    title: item.name || "Unnamed",
    category: item.category || "Item",
    image: item.image || FALLBACK_IMAGE,
  }));
