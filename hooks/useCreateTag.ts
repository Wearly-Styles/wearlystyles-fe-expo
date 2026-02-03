import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTag } from "@/services/tag.service";
const DEV_USER_ID = Number(process.env.EXPO_PUBLIC_DEV_USER_ID);

export const useCreateTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createTag(name, DEV_USER_ID),


    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tags", DEV_USER_ID],
      });
    },
  });
};
