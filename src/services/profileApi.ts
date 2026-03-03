//D:\wearlystyles-fe-expo\WearlyStyles\services\profile.service.ts
import api from "./api";

export const getMyProfile = async () => {
  const response = await api.get("/mobile/profile/me");
  return response.data;
};