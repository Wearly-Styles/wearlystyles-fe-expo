import type { Outfit } from "../constants/mockOutfits";

const outfitById = new Map<string, Outfit>();

export const setOutfitCache = (outfits: Outfit[]) => {
  outfits.forEach((outfit) => {
    outfitById.set(outfit.id, outfit);
  });
};

export const getOutfitCache = () => Array.from(outfitById.values());

export const getOutfitById = (id: string) =>
  outfitById.get(id);
