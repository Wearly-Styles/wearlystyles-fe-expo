export type OutfitItem = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
};

export type Outfit = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  tags: string[];
  items: OutfitItem[];
  weather: string;
  mood: string;
};

export const outfitItems: OutfitItem[] = [
  {
    id: "top",
    title: "Top",
    subtitle: "White t-shirt",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "bottom",
    title: "Bottom",
    subtitle: "Beige shorts",
    image:
      "https://images.unsplash.com/photo-1521575107034-e0fa0b594529?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "shoes",
    title: "Shoes",
    subtitle: "White shoes",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "accessory",
    title: "Accessories",
    subtitle: "White cap",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=300&q=80",
  },
];

export const outfits: Outfit[] = [
  {
    id: "1",
    title: "Soft Summer",
    subtitle: "Clean neutrals, airy layers",
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80",
    tags: ["Casual", "Light", "Neutral"],
    items: outfitItems,
    weather: "Sunny • 29°C",
    mood: "Relaxed & minimal",
  },
  {
    id: "2",
    title: "Campus Day",
    subtitle: "Comfort-first with a tidy finish",
    image:
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
    tags: ["Study", "Comfort"],
    items: outfitItems,
    weather: "Cloudy • 26°C",
    mood: "Focused",
  },
  {
    id: "3",
    title: "City Walk",
    subtitle: "Light tones, easy movement",
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
    tags: ["Casual", "Weekend"],
    items: outfitItems,
    weather: "Breeze • 27°C",
    mood: "Active",
  },
];
