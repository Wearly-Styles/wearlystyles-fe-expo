import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCategory } from "../services/category.service";
const DEV_USER_ID = Number(process.env.EXPO_PUBLIC_DEV_USER_ID);

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createCategory(name, DEV_USER_ID),


    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["categories", DEV_USER_ID],
      });
    },
  });
};
