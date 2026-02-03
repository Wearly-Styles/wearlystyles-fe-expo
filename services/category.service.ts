import api from "./api";

export const getCategories = async (userId: number) => {
  const res = await api.get(`/mobile/clothing/categories?userId=${userId}`);
  return res.data.data;
};

export const createCategory = async (name: string, userId: number) => {
  const res = await api.post("/mobile/clothing/categories", { name, userId });
  return res.data.data;
}
