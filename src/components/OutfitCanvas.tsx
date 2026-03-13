import { Image, StyleSheet, Text, View } from "react-native";
import { theme } from "../constants/theme";
import type { Outfit, OutfitItem } from "../constants/mockOutfits";

type OutfitCanvasVariant = "default" | "compact" | "hero" | "detail";

type OutfitCanvasProps = {
  outfit: Outfit;
  variant?: OutfitCanvasVariant;
};

type OutfitCanvasSlot =
  | "top"
  | "bottom"
  | "footwear"
  | "outerwear"
  | "onepiece"
  | "accessory"
  | "other";

type OutfitCanvasLayout = {
  primary: OutfitItem[];
  accents: OutfitItem[];
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80";

const normalizeText = (value?: string | null) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\u0111/g, "d");

const buildItemText = (item: OutfitItem) =>
  normalizeText([item.title, item.subtitle].filter(Boolean).join(" "));

const getPieceName = (item: OutfitItem) =>
  item.subtitle?.trim() || item.title?.trim() || "Wardrobe item";

const getPieceLabel = (item: OutfitItem) => {
  const slot = getItemSlot(item);

  switch (slot) {
    case "onepiece":
      return "One-piece";
    case "outerwear":
      return "Layer";
    case "footwear":
      return "Shoes";
    case "accessory":
      return "Accent";
    case "bottom":
      return "Bottom";
    case "top":
      return "Top";
    default:
      return item.title?.trim() || "Piece";
  }
};

const hasAnyKeyword = (text: string, keywords: string[]) =>
  keywords.some((keyword) => text.includes(keyword));

const getItemSlot = (item: OutfitItem): OutfitCanvasSlot => {
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
      "outer",
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
      "slacks",
      "quan",
      "chan vay",
      "bottom",
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

const buildLayout = (items: OutfitItem[]): OutfitCanvasLayout => {
  const buckets: Record<OutfitCanvasSlot, OutfitItem[]> = {
    top: [],
    bottom: [],
    footwear: [],
    outerwear: [],
    onepiece: [],
    accessory: [],
    other: [],
  };

  items.forEach((item) => {
    buckets[getItemSlot(item)].push(item);
  });

  const take = (slot: OutfitCanvasSlot) => buckets[slot].shift();
  const takeAny = () => {
    const ordered: OutfitCanvasSlot[] = [
      "top",
      "bottom",
      "footwear",
      "onepiece",
      "outerwear",
      "accessory",
      "other",
    ];

    for (const slot of ordered) {
      const item = take(slot);
      if (item) {
        return item;
      }
    }

    return undefined;
  };

  const primary: OutfitItem[] = [];
  const onepiece = take("onepiece");

  if (onepiece) {
    primary.push(onepiece);
  } else {
    const top = take("top") || takeAny();
    const bottom = take("bottom") || takeAny();
    if (top) primary.push(top);
    if (bottom) primary.push(bottom);
  }

  const footwear = take("footwear") || takeAny();
  if (footwear) {
    primary.push(footwear);
  }

  const accents = [
    take("outerwear"),
    take("accessory"),
    take("other"),
    take("outerwear"),
    take("accessory"),
    take("other"),
  ].filter((item): item is OutfitItem => Boolean(item));

  return { primary, accents };
};

const buildPalette = (outfit: Outfit) => {
  const base = outfit.tags[0] || outfit.mood || "curated";
  const seed = normalizeText(base);

  if (seed.includes("formal") || seed.includes("work") || seed.includes("smart")) {
    return {
      base: "#F1E8DE",
      board: "#FFFBF7",
      accent: "#8F5E40",
      accentSoft: "rgba(143,94,64,0.14)",
      dark: "#211914",
    };
  }

  if (seed.includes("sport") || seed.includes("gym") || seed.includes("active")) {
    return {
      base: "#ECECE5",
      board: "#FBFBF7",
      accent: "#65715C",
      accentSoft: "rgba(101,113,92,0.15)",
      dark: "#23261F",
    };
  }

  return {
    base: "#EFE5DA",
    board: "#FFF9F3",
    accent: "#A76C47",
    accentSoft: "rgba(167,108,71,0.14)",
    dark: "#251B15",
  };
};

const getAccentPositions = (variant: OutfitCanvasVariant) => {
  if (variant === "compact") {
    return [
      { top: 18, left: 10, rotate: "-5deg" },
      { top: 28, right: 10, rotate: "5deg" },
    ] as const;
  }

  if (variant === "hero") {
    return [
      { top: 34, left: 18, rotate: "-5deg" },
      { top: 62, right: 18, rotate: "5deg" },
      { bottom: 88, left: 16, rotate: "-4deg" },
      { bottom: 62, right: 18, rotate: "4deg" },
    ] as const;
  }

  return [
    { top: 28, left: 16, rotate: "-5deg" },
    { top: 52, right: 16, rotate: "5deg" },
    { bottom: 78, left: 14, rotate: "-4deg" },
    { bottom: 56, right: 16, rotate: "4deg" },
  ] as const;
};

export default function OutfitCanvas({
  outfit,
  variant = "default",
}: OutfitCanvasProps) {
  const isDefault = variant === "default";
  const isCompact = variant === "compact";
  const isHero = variant === "hero";
  const isDetail = variant === "detail";
  const layout = buildLayout(outfit.items || []);
  const palette = buildPalette(outfit);
  const accentPositions = getAccentPositions(variant);
  const pieceCountLabel = `${outfit.items.length} piece${outfit.items.length === 1 ? "" : "s"}`;

  if (isCompact) {
    const compactItems = [...layout.primary, ...layout.accents].filter(Boolean).slice(0, 4);

    return (
      <View style={[styles.canvas, styles.canvasCompactBoard, styles.canvasPlain]}>
        <View
          style={[
            styles.compactBoard,
            styles.plainBoard,
            { borderColor: palette.accentSoft },
          ]}
        >
          {compactItems.length ? (
            <View style={styles.compactGrid}>
              {compactItems.map((item, index) => (
                <View
                  key={`${item.id}-compact-${index}`}
                  style={[
                    styles.compactTile,
                    compactItems.length === 1 && styles.compactTileSingle,
                    compactItems.length === 3 &&
                      index === 2 &&
                      styles.compactTileWide,
                    { backgroundColor: "#FFFDF9", borderColor: palette.accentSoft },
                  ]}
                >
                  <Image
                    source={{ uri: item.image || FALLBACK_IMAGE }}
                    style={styles.compactImage}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </View>
          ) : (
            <Image
              source={{ uri: outfit.image || FALLBACK_IMAGE }}
              style={styles.fallbackImage}
              resizeMode="cover"
            />
          )}
        </View>
      </View>
    );
  }

  if (isDefault) {
    const previewItems = [...layout.primary, ...layout.accents].filter(Boolean);
    const isDense = previewItems.length > 4;

    return (
      <View style={[styles.canvas, styles.canvasDefault, styles.canvasPlain]}>
        <View
          style={[
            styles.defaultBoard,
            styles.plainBoard,
            { borderColor: palette.accentSoft },
          ]}
        >
          {previewItems.length ? (
            <View style={[styles.defaultGrid, isDense && styles.defaultGridDense]}>
              {previewItems.map((item, index) => (
                <View
                  key={`${item.id}-default-${index}`}
                  style={[
                    styles.defaultTile,
                    previewItems.length === 1 && styles.defaultTileSingle,
                    previewItems.length === 3 && index === 2 && styles.defaultTileWide,
                    isDense && styles.defaultTileDense,
                    { backgroundColor: "#FFFDF9", borderColor: palette.accentSoft },
                  ]}
                >
                  <Image
                    source={{ uri: item.image || FALLBACK_IMAGE }}
                    style={[styles.defaultImage, isDense && styles.defaultImageDense]}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </View>
          ) : (
            <Image
              source={{ uri: outfit.image || FALLBACK_IMAGE }}
              style={styles.fallbackImage}
              resizeMode="cover"
            />
          )}
        </View>
      </View>
    );
  }

  if (isDetail) {
    const detailItems = [...layout.primary, ...layout.accents].filter(Boolean);
    const isDense = detailItems.length > 4;

    return (
      <View style={[styles.canvas, styles.canvasDetail, { backgroundColor: palette.base }]}>
        <View style={[styles.shapeLarge, styles.shapeLargeDetail, { backgroundColor: palette.accentSoft }]} />
        <View style={[styles.shapeOrb, styles.shapeOrbDetail, { backgroundColor: "rgba(255,255,255,0.34)" }]} />
        <View style={[styles.shapeSlash, styles.shapeSlashDetail, { backgroundColor: palette.dark }]} />

        <View
          style={[
            styles.detailBoard,
            { backgroundColor: palette.board, borderColor: palette.accentSoft },
          ]}
        >
          <View
            style={[
              styles.detailGrid,
              isDense && styles.detailGridDense,
            ]}
          >
            {detailItems.map((item, index) => (
              <View
                key={`${item.id}-detail-${index}`}
                style={[
                  styles.detailTile,
                  detailItems.length === 1 && styles.detailTileSingle,
                  detailItems.length === 2 && styles.detailTileTwoUp,
                  detailItems.length === 3 &&
                    index === 2 &&
                    styles.detailTileWide,
                  isDense && styles.detailTileDense,
                  { backgroundColor: "#FFFDF9", borderColor: palette.accentSoft },
                ]}
              >
                <Image
                  source={{ uri: item.image || FALLBACK_IMAGE }}
                  style={[styles.detailImage, isDense && styles.detailImageDense]}
                  resizeMode="contain"
                />
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  if (isHero) {
    const accentItems = layout.accents.slice(0, 2);

    return (
      <View style={[styles.canvas, styles.canvasHero, { backgroundColor: palette.base }]}>
        <View style={[styles.shapeLarge, { backgroundColor: palette.accentSoft }]} />
        <View style={[styles.shapeOrb, { backgroundColor: "rgba(255,255,255,0.46)" }]} />
        <View style={[styles.shapeSlash, { backgroundColor: palette.dark }]} />

        <View
          style={[
            styles.heroBoard,
            { backgroundColor: palette.board, borderColor: palette.accentSoft },
          ]}
        >
          <View style={[styles.heroBoardHeader, { borderColor: palette.accentSoft }]}>
            <Text style={[styles.heroBoardEyebrow, { color: palette.accent }]}>EDITORIAL</Text>
            <Text style={[styles.heroBoardCount, { color: palette.dark }]}>
              {pieceCountLabel}
            </Text>
          </View>

          {layout.primary.length ? (
            <View
              style={[
                styles.heroPrimaryStack,
                layout.primary.length === 2 && styles.heroPrimaryStackTwo,
                layout.primary.length === 1 && styles.heroPrimaryStackOne,
              ]}
            >
              {layout.primary.slice(0, 3).map((item, index) => (
                <View
                  key={`${item.id}-${index}`}
                  style={[
                    styles.heroPieceCard,
                    layout.primary.length === 1 && styles.heroPieceCardSingle,
                    layout.primary.length === 2 && styles.heroPieceCardTwo,
                    { borderColor: palette.accentSoft },
                  ]}
                >
                  <View style={[styles.heroPieceBadge, { backgroundColor: palette.accentSoft }]}>
                    <Text style={[styles.heroPieceBadgeText, { color: palette.dark }]}>
                      {getPieceLabel(item)}
                    </Text>
                  </View>
                  <Image
                    source={{ uri: item.image || FALLBACK_IMAGE }}
                    style={styles.heroPieceImage}
                    resizeMode="contain"
                  />
                  <Text style={[styles.heroPieceTitle, { color: palette.dark }]} numberOfLines={1}>
                    {getPieceName(item)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Image
              source={{ uri: outfit.image || FALLBACK_IMAGE }}
              style={styles.fallbackImage}
              resizeMode="cover"
            />
          )}

          {accentItems.length ? (
            <View style={styles.heroAccentRow}>
              {accentItems.map((item, index) => (
                <View
                  key={`${item.id}-hero-accent-${index}`}
                  style={[
                    styles.heroAccentCard,
                    { backgroundColor: palette.board, borderColor: palette.accentSoft },
                  ]}
                >
                  <Image
                    source={{ uri: item.image || FALLBACK_IMAGE }}
                    style={styles.heroAccentImage}
                    resizeMode="contain"
                  />
                  <View style={[styles.heroAccentBadge, { backgroundColor: palette.accentSoft }]}>
                    <Text style={[styles.heroAccentBadgeText, { color: palette.dark }]} numberOfLines={1}>
                      {getPieceLabel(item)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.canvas,
        isCompact && styles.canvasCompact,
        isHero && styles.canvasHero,
        { backgroundColor: palette.base },
      ]}
    >
      <View style={[styles.shapeLarge, { backgroundColor: palette.accentSoft }]} />
      <View style={[styles.shapeOrb, { backgroundColor: "rgba(255,255,255,0.46)" }]} />
      <View style={[styles.shapeSlash, { backgroundColor: palette.dark }]} />
      <View
        style={[
          styles.board,
          isCompact && styles.boardCompact,
          isHero && styles.boardHero,
          { backgroundColor: palette.board, borderColor: palette.accentSoft },
        ]}
      >
        <View style={[styles.boardRail, { backgroundColor: palette.accent }]} />
        <View
          style={[
            styles.boardHeader,
            isCompact && styles.boardHeaderCompact,
            { borderColor: palette.accentSoft },
          ]}
        >
          <View style={styles.boardHeaderRow}>
            <Text style={[styles.boardEyebrow, { color: palette.accent }]}>THE EDIT</Text>
            {!isCompact ? (
              <Text style={[styles.boardCount, { color: palette.dark }]}>{pieceCountLabel}</Text>
            ) : null}
          </View>
        </View>
        {layout.primary.length ? (
          <View
            style={[
              styles.stack,
              isCompact && styles.stackCompact,
              isHero && styles.stackHero,
            ]}
          >
            {layout.primary.slice(0, 3).map((item, index) => {
              const rotation =
                index === 0 ? "-2deg" : index === 1 ? "2deg" : "-1deg";

              return (
                <View
                  key={`${item.id}-${index}`}
                  style={[
                    styles.stackCard,
                    index === 0 && styles.stackCardTop,
                    index === 1 && styles.stackCardMid,
                    index === 2 && styles.stackCardBottom,
                    isCompact && styles.stackCardCompact,
                    isCompact && index === 0 && styles.stackCardTopCompact,
                    isCompact && index === 1 && styles.stackCardMidCompact,
                    isCompact && index === 2 && styles.stackCardBottomCompact,
                    isHero && styles.stackCardHero,
                    isHero && index === 0 && styles.stackCardTopHero,
                    isHero && index === 1 && styles.stackCardMidHero,
                    isHero && index === 2 && styles.stackCardBottomHero,
                    { transform: [{ rotate: rotation }] },
                  ]}
                >
                  <Image
                    source={{ uri: item.image || FALLBACK_IMAGE }}
                    style={styles.stackImage}
                    resizeMode="contain"
                  />
                </View>
              );
            })}
          </View>
        ) : (
          <Image
            source={{ uri: outfit.image || FALLBACK_IMAGE }}
            style={styles.fallbackImage}
            resizeMode="cover"
          />
        )}
      </View>

      {layout.accents.slice(0, accentPositions.length).map((item, index) => {
        const position = accentPositions[index];
        return (
          <View
            key={`${item.id}-accent-${index}`}
            style={[
              styles.accentCard,
              isCompact && styles.accentCardCompact,
              isHero && styles.accentCardHero,
              position,
              { backgroundColor: palette.board, borderColor: palette.accentSoft, transform: [{ rotate: position.rotate }] },
            ]}
          >
            <Image
              source={{ uri: item.image || FALLBACK_IMAGE }}
              style={styles.accentImage}
              resizeMode="contain"
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    height: 298,
    overflow: "hidden",
    position: "relative",
    borderBottomWidth: 0,
  },
  canvasPlain: {
    backgroundColor: "transparent",
  },
  canvasCompact: {
    height: 186,
  },
  canvasCompactBoard: {
    height: 188,
    borderBottomWidth: 0,
  },
  canvasDefault: {
    height: 248,
    borderBottomWidth: 0,
  },
  canvasHero: {
    height: 312,
    borderBottomWidth: 0,
  },
  canvasDetail: {
    height: 272,
    borderBottomWidth: 0,
  },
  shapeLarge: {
    position: "absolute",
    top: -28,
    left: -14,
    width: 228,
    height: 188,
    borderRadius: 44,
    opacity: 0.9,
  },
  shapeLargeDetail: {
    top: -20,
    left: -8,
    width: 240,
    height: 162,
  },
  shapeLargeCompact: {
    top: -18,
    left: -10,
    width: 150,
    height: 122,
    borderRadius: 28,
  },
  shapeOrb: {
    position: "absolute",
    top: 34,
    right: 26,
    width: 84,
    height: 84,
    borderRadius: 24,
    opacity: 0.7,
  },
  shapeOrbDetail: {
    top: 26,
    right: 18,
    width: 104,
    height: 104,
    borderRadius: 28,
  },
  shapeOrbCompact: {
    top: 14,
    right: 12,
    width: 54,
    height: 54,
    borderRadius: 16,
  },
  shapeSlash: {
    position: "absolute",
    bottom: -10,
    right: -20,
    width: 198,
    height: 92,
    borderRadius: 26,
    opacity: 0.09,
    transform: [{ rotate: "-8deg" }],
  },
  shapeSlashDetail: {
    bottom: -2,
    right: -18,
    width: 184,
    height: 72,
  },
  compactBoard: {
    position: "absolute",
    top: 8,
    bottom: 8,
    left: 8,
    right: 8,
    borderRadius: 22,
    borderWidth: 0,
    padding: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  compactGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignContent: "center",
  },
  compactTile: {
    width: "47.5%",
    minHeight: 64,
    borderRadius: 16,
    borderWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  compactTileSingle: {
    width: "100%",
  },
  compactTileWide: {
    width: "100%",
  },
  compactImage: {
    width: "100%",
    height: 52,
  },
  defaultBoard: {
    position: "absolute",
    top: 12,
    bottom: 12,
    left: 12,
    right: 12,
    borderRadius: 30,
    borderWidth: 0,
    overflow: "hidden",
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.09,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  plainBoard: {
    backgroundColor: "#FFFCF8",
  },
  defaultGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignContent: "center",
  },
  defaultGridDense: {
    gap: 8,
    alignContent: "flex-start",
  },
  defaultTile: {
    width: "47.5%",
    minHeight: 84,
    borderRadius: 22,
    borderWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  defaultTileSingle: {
    width: "100%",
  },
  defaultTileWide: {
    width: "100%",
  },
  defaultTileDense: {
    width: "31%",
    minHeight: 68,
    padding: 8,
  },
  defaultImage: {
    width: "100%",
    height: 74,
  },
  defaultImageDense: {
    height: 50,
  },
  board: {
    position: "absolute",
    top: 20,
    bottom: 20,
    left: "50%",
    marginLeft: -84,
    width: 168,
    borderRadius: 34,
    borderWidth: 0,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  boardCompact: {
    top: 12,
    bottom: 12,
    marginLeft: -54,
    width: 108,
    borderRadius: 24,
  },
  boardHero: {
    top: 18,
    bottom: 18,
    marginLeft: -92,
    width: 184,
    borderRadius: 36,
  },
  heroBoard: {
    position: "absolute",
    top: 14,
    bottom: 14,
    left: 14,
    right: 14,
    borderRadius: 28,
    borderWidth: 0,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  detailBoard: {
    position: "absolute",
    top: 18,
    bottom: 18,
    left: 18,
    right: 18,
    borderRadius: 30,
    borderWidth: 0,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  detailGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignContent: "center",
  },
  detailGridDense: {
    gap: 8,
    alignContent: "flex-start",
  },
  detailTile: {
    width: "47.5%",
    minHeight: 98,
    borderRadius: 22,
    borderWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  detailTileSingle: {
    width: "100%",
  },
  detailTileTwoUp: {
    width: "47.5%",
  },
  detailTileWide: {
    width: "100%",
  },
  detailTileDense: {
    width: "31%",
    minHeight: 76,
    padding: 8,
  },
  detailImage: {
    width: "100%",
    height: 82,
  },
  detailImageDense: {
    height: 58,
  },
  heroBoardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  heroBoardEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.6,
  },
  heroBoardCount: {
    fontSize: 11,
    fontWeight: "600",
  },
  boardRail: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 8,
  },
  boardHeader: {
    marginTop: 18,
    marginHorizontal: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  boardHeaderCompact: {
    marginTop: 10,
    marginHorizontal: 10,
    paddingBottom: 5,
  },
  boardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  boardEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.7,
  },
  boardCount: {
    fontSize: 9,
    fontWeight: "600",
  },
  heroPrimaryStack: {
    flex: 1,
    marginTop: 12,
    gap: 10,
  },
  heroPrimaryStackTwo: {
    justifyContent: "center",
  },
  heroPrimaryStackOne: {
    justifyContent: "center",
  },
  heroPieceCard: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 0,
    backgroundColor: "#FFFDF9",
    padding: 10,
  },
  heroPieceCardSingle: {
    flex: 0,
    minHeight: 168,
  },
  heroPieceCardTwo: {
    minHeight: 94,
  },
  heroPieceBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
  },
  heroPieceBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  heroPieceImage: {
    flex: 1,
    width: "100%",
    marginTop: 10,
    borderRadius: 16,
    backgroundColor: "#F6EFE7",
  },
  heroPieceTitle: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "700",
  },
  heroAccentRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  heroAccentCard: {
    flex: 1,
    minHeight: 64,
    borderRadius: 16,
    borderWidth: 0,
    padding: 6,
    justifyContent: "space-between",
  },
  heroAccentImage: {
    width: "100%",
    height: 26,
    borderRadius: 10,
    backgroundColor: "#F6EFE7",
  },
  heroAccentBadge: {
    marginTop: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  heroAccentBadgeText: {
    fontSize: 8,
    fontWeight: "700",
  },
  stack: {
    flex: 1,
    paddingTop: 18,
    alignItems: "center",
  },
  stackCompact: {
    paddingTop: 10,
  },
  stackHero: {
    paddingTop: 20,
  },
  stackCard: {
    position: "absolute",
    width: 112,
    height: 100,
    borderRadius: 24,
    backgroundColor: "#FFFDF9",
    borderWidth: 0,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  stackCardCompact: {
    width: 72,
    height: 62,
    borderRadius: 14,
    padding: 5,
  },
  stackCardHero: {
    width: 122,
    height: 110,
  },
  stackCardTop: {
    top: 20,
    left: 22,
  },
  stackCardMid: {
    top: 104,
    right: 20,
  },
  stackCardBottom: {
    bottom: 18,
    left: 28,
  },
  stackCardTopCompact: {
    top: 12,
    left: 16,
  },
  stackCardMidCompact: {
    top: 62,
    right: 14,
  },
  stackCardBottomCompact: {
    bottom: 12,
    left: 18,
  },
  stackCardTopHero: {
    top: 26,
    left: 28,
  },
  stackCardMidHero: {
    top: 120,
    right: 24,
  },
  stackCardBottomHero: {
    bottom: 22,
    left: 32,
  },
  stackImage: {
    flex: 1,
    width: "100%",
    borderRadius: 16,
    backgroundColor: "#F6EFE7",
  },
  accentCard: {
    position: "absolute",
    width: 88,
    height: 98,
    borderRadius: 24,
    borderWidth: 1,
    padding: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  accentCardCompact: {
    width: 54,
    height: 58,
    borderRadius: 14,
    padding: 5,
  },
  accentCardHero: {
    width: 102,
    height: 112,
  },
  accentImage: {
    flex: 1,
    width: "100%",
    borderRadius: 14,
    backgroundColor: "#F6EFE7",
  },
  fallbackImage: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: "100%",
    height: "100%",
  },
});
