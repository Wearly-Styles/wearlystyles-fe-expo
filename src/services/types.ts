export type ApiResponse<T> = {
  success: boolean;
  statusCode?: number;
  message?: string;
  data?: T;
  timestamp?: string;
};

export type NormalizedWeather = {
  tempC: number | null;
  conditionCode: number | null;
  rainProbability: number;
  humidity: number | null;
  tags: string[];
  source: string;
  observedAt: string;
};

export type NormalizedEvent = {
  id?: string;
  title: string;
  start?: string;
  end?: string;
  location?: string;
  eventType: string;
  dressCode: string;
  timeOfDay: string;
};

export type NormalizedClosetItem = {
  id: number;
  name?: string;
  categoryId?: number | null;
  category?: string;
  color?: string;
  image?: string;
  season?: string;
  material?: string;
  isFavorite?: boolean;
  tags: string[];
};

export type MissingItem = {
  name: string;
  category?: string;
  reason?: string;
};

export type OutfitRecommendation = {
  outfit?: {
    name?: string;
    items?: NormalizedClosetItem[];
  };
  eventId?: string;
  eventTitle?: string;
  eventType?: string;
  style?: string;
  items: number[];
  notes: string[];
  missingItems?: MissingItem[];
};

export type RecommendationResponse = {
  primary: OutfitRecommendation;
  alternatives: OutfitRecommendation[];
  recommendations?: OutfitRecommendation[];
  model: string;
};

export type RecommendationPriorOutfit = {
  source: "plan" | "history";
  date: string;
  outfitId?: number;
  outfitName?: string;
  eventType?: string;
  itemIds: number[];
};

export type User = {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
};

export type AuthPayload = {
  user: Partial<User>;
  token: string;
  refreshToken: string;
};

export type Category = {
  id: number;
  name: string;
};

export type Tag = {
  id: number;
  name: string;
};

export type ClothingItem = {
  id: number;
  name?: string;
  categoryId?: number | null;
  color?: string;
  image?: string;
  season?: string;
  material?: string;
  description?: string;
  isFavorite?: boolean;
};

export type ClothingItemCategory = {
  id: number;
  name: string;
};

export type ClothingItemTagLink = {
  tag?: Tag | null;
};

export type OutfitEntityItem = {
  id: number;
  clothingItemId: number;
  clothingItem?: (ClothingItem & {
    category?: ClothingItemCategory | null;
    tags?: ClothingItemTagLink[];
  }) | null;
};

export type OutfitEntity = {
  id: number;
  name?: string;
  occasion?: string;
  weather?: string;
  isFavorite?: boolean;
  items?: OutfitEntityItem[];
};

export type OutfitPlan = {
  id: number;
  outfitId: number;
  planDate: string;
  planType?: string | null;
  reminderSent?: boolean | null;
  outfit?: OutfitEntity;
};

export type OutfitHistoryEntity = {
  id: number;
  userId?: number | null;
  outfitId?: number | null;
  wornDate?: string | null;
  note?: string | null;
  outfit?: OutfitEntity | null;
};
