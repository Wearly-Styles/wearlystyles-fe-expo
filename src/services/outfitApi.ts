import { request, requestForm } from "./apiClient";
import type {
  NormalizedWeather,
  NormalizedClosetItem,
  NormalizedEvent,
  RecommendationResponse,
  User,
  AuthPayload,
  Category,
  Tag,
  ClothingItem,
  OutfitEntity,
  OutfitPlan,
} from "./types";

type WeatherQuery = {
  lat: number;
  lon: number;
  datetime?: string;
};

export const contextApi = {
  getWeather: (query: WeatherQuery) =>
    request<NormalizedWeather>(
      `/mobile/context/weather?lat=${query.lat}&lon=${query.lon}${query.datetime ? `&datetime=${encodeURIComponent(query.datetime)}` : ""
      }`,
      { skipAuth: true },
    ),
  getCloset: () => request<NormalizedClosetItem[]>("/mobile/context/closet"),
  getCalendar: (payload: {
    accessToken: string;
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
  }) =>
    request<NormalizedEvent[]>("/mobile/context/calendar", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export const recommendationApi = {
  recommendByContext: (payload: {
    weather?: NormalizedWeather;
    calendar?: NormalizedEvent[];
    closet: NormalizedClosetItem[];
    preferences?: string[];
  }) =>
    request<RecommendationResponse>("/mobile/recommendations/by-context", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  recommendBySelection: (payload: {
    selectedEventType: string;
    selectedStyle: string;
    closet: NormalizedClosetItem[];
    weather?: NormalizedWeather;
    calendar?: NormalizedEvent[];
  }) =>
    request<RecommendationResponse>("/mobile/recommendations/by-selection", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export const userApi = {
  listUsers: (page = 1, limit = 1) =>
    request<User[]>(`/mobile/users?page=${page}&limit=${limit}`, {
      skipAuth: true,
    }),
  getUserById: (id: number) =>
    request<User>(`/mobile/users/${id}`, { skipAuth: true }),
};

export const authApi = {
  login: (payload: { email: string; password: string }) =>
    request<AuthPayload>("/mobile/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  register: (payload: { email: string; password: string; fullName?: string }) =>
    request<AuthPayload>("/mobile/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  loginWithGoogle: (payload: { idToken: string }) =>
    request<AuthPayload>("/mobile/auth/login/google", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  loginWithGoogleCode: (payload: { code: string; redirectUri: string }) =>
    request<AuthPayload>("/mobile/auth/login/google-code", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  logout: () =>
    request<{ success: boolean }>("/mobile/auth/logout", {
      method: "POST",
    }),
};

export const clothingApi = {
  listCategories: (search?: string) =>
    request<Category[]>(
      `/mobile/clothing/categories${search ? `?search=${encodeURIComponent(search)}` : ""}`,
    ),
  listTags: (search?: string) =>
    request<Tag[]>(
      `/mobile/clothing/tags${search ? `?search=${encodeURIComponent(search)}` : ""}`,
    ),
  createCategory: (payload: { name: string }) =>
    request<Category>("/mobile/clothing/categories", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createTag: (payload: { name: string }) =>
    request<Tag>("/mobile/clothing/tags", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createItem: (formData: FormData) =>
    requestForm<ClothingItem>("/mobile/clothing/items", formData, {
      method: "POST",
    }),
  updateItem: (id: number, formData: FormData) =>
    requestForm(`/mobile/clothing/items/${id}`, formData, {
      method: "PATCH",
    }),
  deleteItem: (id: number) =>
    request<{ id: number }>(`/mobile/clothing/items/${id}`, {
      method: "DELETE",
    }),
};

export const outfitApi = {
  createOutfit: (payload: {
    name?: string;
    occasion?: string;
    weather?: string;
    isFavorite?: boolean;
    items: number[];
  }) =>
    request<OutfitEntity>("/mobile/outfits", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export const outfitPlanApi = {
  createPlans: (items: Array<{
    outfitId: number;
    planDate: string;
    planType?: string;
    reminderSent?: boolean;
  }>) =>
    request<OutfitPlan[]>("/mobile/outfit-plans", {
      method: "POST",
      body: JSON.stringify({ items }),
    }),
  listPlans: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request<OutfitPlan[]>(`/mobile/outfit-plans${suffix}`);
  },
  updatePlan: (
    id: number,
    payload: {
      outfitId?: number;
      planDate?: string;
      planType?: string;
      reminderSent?: boolean;
    },
  ) =>
    request<OutfitPlan>(`/mobile/outfit-plans/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deletePlan: (id: number) =>
    request<{ id: number }>(`/mobile/outfit-plans/${id}`, {
      method: "DELETE",
    }),
};
