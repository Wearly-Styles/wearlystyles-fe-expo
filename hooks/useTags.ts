import { useQuery } from "@tanstack/react-query";
import { getTags } from "../services/tag.service";
import { getUserId } from "../utils/auth";


export const useTags = () => {
   const { data: userId, isLoading: loadingUser } = useQuery({
    queryKey: ["userId"],
    queryFn: getUserId,
    staleTime: Infinity,
  });

  return useQuery({
    queryKey: ["tags", userId],
    queryFn: () => getTags(userId as number),
    enabled: !!userId && !loadingUser,
    staleTime: 1000 * 60 * 10, 
  });
};
