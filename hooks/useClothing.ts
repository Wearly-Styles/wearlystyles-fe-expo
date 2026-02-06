import { useMutation, useQuery } from "@tanstack/react-query";
import { createClothingItem } from "../services/clothing.service";
import { getUserId } from "../utils/auth";

export const useClothing = () => {
  const { data: userId, isLoading } = useQuery({
    queryKey: ["userId"],
    queryFn: getUserId,
    staleTime: Infinity,
  });

  return useMutation({
    mutationFn: (payload: {
      name: string;
      season: string;
      description: string;
      categoryId: number;
      imageUri: string;
    }) => {
      if (!userId) {
        throw new Error("User ID not found");
      }

      return createClothingItem({
        ...payload,
        userId,
      });
    },
    enabled: !!userId && !isLoading,
  });
};
