import type { Outfit } from "../constants/mockOutfits";

const outfitById = new Map<string, Outfit>();

const mergeOutfit = (current: Outfit, incoming: Outfit): Outfit => {
  const incomingHasItems = incoming.items.length > 0;

  return {
    ...current,
    ...incoming,
    image: incomingHasItems ? incoming.image : current.image || incoming.image,
    tags: incoming.tags.length ? incoming.tags : current.tags,
    items: incomingHasItems ? incoming.items : current.items,
    weather: incoming.weather || current.weather,
    mood: incoming.mood || current.mood,
  };
};

export const setOutfitCache = (outfits: Outfit[]) => {
  outfits.forEach((outfit) => {
    const current = outfitById.get(outfit.id);
    outfitById.set(outfit.id, current ? mergeOutfit(current, outfit) : outfit);
  });
};

export const getOutfitCache = () => Array.from(outfitById.values());

export const getOutfitById = (id: string) =>
  outfitById.get(id);
