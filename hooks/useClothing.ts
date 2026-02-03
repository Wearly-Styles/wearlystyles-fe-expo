import { useMutation } from "@tanstack/react-query";
import { createClothingItem } from "../services/clothing.service";

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
      if (!DEV_USER_ID) {
        throw new Error("User ID not found");
      }

      return createClothingItem({
        ...payload,
        userId: DEV_USER_ID,
      });
    },
  });
};
