import { request } from "./apiClient";

export const getMyProfile = async () => {
  return request("/mobile/profile/me");
};