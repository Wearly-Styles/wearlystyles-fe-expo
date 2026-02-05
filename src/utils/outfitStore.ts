import type { Outfit } from "../constants/mockOutfits";

let cachedOutfits: Outfit[] = [];

export const setOutfitCache = (outfits: Outfit[]) => {
  cachedOutfits = outfits;
};

export const getOutfitCache = () => cachedOutfits;

export const getOutfitById = (id: string) =>
  cachedOutfits.find((outfit) => outfit.id === id);
