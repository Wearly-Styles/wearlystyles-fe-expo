import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCategory } from "../services/category.service";
import { getUserId } from "../utils/auth";

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  const { data: userId } = useQuery({
    queryKey: ["userId"],
    queryFn: getUserId,
    staleTime: Infinity,
  });

  return useMutation({
    mutationFn: (name: string) => {
      if (!userId) {
        throw new Error("User ID not found");
      }
      return createCategory(name, userId);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["categories", userId],
      });
    },
  });
};
