import { useMutation, useQuery } from "@tanstack/react-query";
import { createClothingItem, getClosetItems } from "../services/clothing.service"; 

const DEV_USER_ID = Number(process.env.EXPO_PUBLIC_DEV_USER_ID);

export const useClothing = () => {
  return useMutation({
    mutationFn: (payload: {
      name: string;
      season: string;
      description: string;
      categoryId: number;
      imageUri: string;
    }) => {
      if (!DEV_USER_ID) throw new Error("User ID not found");
      return createClothingItem({ ...payload, userId: DEV_USER_ID });
    },
  });
};

export const useGetCloset = () => {
  return useQuery({
    queryKey: ["closet-items", DEV_USER_ID],
    queryFn: () => getClosetItems(DEV_USER_ID),
    enabled: !!DEV_USER_ID,
  });
};