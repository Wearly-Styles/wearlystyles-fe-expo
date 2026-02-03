import { useQuery } from "@tanstack/react-query";
import { getTags } from "../services/tag.service";

const DEV_USER_ID = Number(process.env.EXPO_PUBLIC_DEV_USER_ID);

export const useTags = () => {
  return useQuery({
    queryKey: ["tags", DEV_USER_ID],
    queryFn: () => getTags(DEV_USER_ID),
    enabled: !!DEV_USER_ID,
    staleTime: 1000 * 60 * 10, // cache 10 phút
  });
};
