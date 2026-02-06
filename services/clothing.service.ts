import api from "./api";

export const createClothingItem = async ({
  name,
  season,
  description,
  categoryId,
  imageUri,
  userId,
}: {
  name: string;
  season: string;
  description: string;
  categoryId: number;
  imageUri: string;
  userId: number;
}) => {
  const formData = new FormData();

  formData.append("name", name);
  formData.append("season", season);
  formData.append("description", description);
  formData.append("categoryId", String(categoryId));
  formData.append("userId", String(userId));

  formData.append("image", {
    uri: imageUri,
    name: "clothing.jpg",
    type: "image/jpeg",
  } as any);

  const res = await api.post("/mobile/closet/items", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data.data;
};
export const getClosetItems = async (userId: number) => {
  const res = await api.get(`/mobile/closet?userId=${userId}`); 
  return res.data.data; 
};
