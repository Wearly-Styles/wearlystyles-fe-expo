import { useQuery } from "@tanstack/react-query";
import { getCategories } from "../services/category.service";
import { getUserId } from "../utils/auth";

export const useCategories = () => {
  const { data: userId, isLoading: loadingUser } = useQuery({
    queryKey: ["userId"],
    queryFn: getUserId,
    staleTime: Infinity,
  });

  return useQuery({
    queryKey: ["categories", userId],
    queryFn: () => getCategories(userId as number),
    enabled: !!userId && !loadingUser,
    staleTime: 1000 * 60 * 10,
  });
};
