import { useQuery } from "@tanstack/react-query";
import { getCategories } from "../services/category.service";

const DEV_USER_ID = Number(process.env.EXPO_PUBLIC_DEV_USER_ID);

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories", DEV_USER_ID],
    queryFn: () => getCategories(DEV_USER_ID),
    enabled: !!DEV_USER_ID,
    staleTime: 1000 * 60 * 10,
  });
};
