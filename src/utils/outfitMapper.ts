import type { Outfit, OutfitItem } from "../constants/mockOutfits";
import type {
  NormalizedClosetItem,
  NormalizedWeather,
  OutfitRecommendation,
  RecommendationResponse,
} from "../services/types";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80";

const toWeatherLabel = (weather?: NormalizedWeather) => {
  if (!weather) return "Weather unavailable";
  const temp = weather.tempC !== null ? `${Math.round(weather.tempC)}C` : "N/A";
  const tag = weather.tags?.[0] ? weather.tags[0] : "Unknown";
  return `${tag} - ${temp}`;
};

const toMoodLabel = (rec: OutfitRecommendation) =>
  rec.style || rec.eventType || "Balanced";

const mapItems = (
  ids: number[],
  closet: NormalizedClosetItem[],
): OutfitItem[] => {
  if (!ids.length) {
    return [];
  }

  return ids.map((id, index) => {
    const item = closet.find((closetItem) => closetItem.id === id);
    return {
      id: String(id),
      title: item?.category || `Item ${index + 1}`,
      subtitle: item?.name || "Style pick",
      image: item?.image || FALLBACK_IMAGE,
    };
  });
};

const mapRecommendation = (
  rec: OutfitRecommendation,
  closet: NormalizedClosetItem[],
  weather?: NormalizedWeather,
  index = 0,
): Outfit => {
  const items = mapItems(rec.items ?? [], closet);
  return {
    id: rec.eventId || `${index + 1}`,
    title: rec.style || rec.eventType || "Suggested Look",
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
