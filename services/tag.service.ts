import api from "./api";

export const getTags = async (userId: number) => {
  const res = await api.get(`/mobile/clothing/tags?userId=${userId}`);
  return res.data.data;
};

export const createTag = async (name: string, userId: number) => {
  const res = await api.post("/mobile/clothing/tags", { name, userId });
  return res.data.data;
}
