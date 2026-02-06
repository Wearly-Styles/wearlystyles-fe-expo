import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTag } from "@/services/tag.service";
import { getUserId } from "../utils/auth";

export const useCreateTag = () => {
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
      return createTag(name, userId);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tags", userId],
      });
    },
  });
};
