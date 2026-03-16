import { request, requestForm} from "./apiClient";

export const getMyProfile = async () => {
  return request("/mobile/profile/me");
};

export const updateProfile = async (data: {
  fullName?: string;
  email?: string;
  dateOfBirth?: string;
  location?: string;
  bio?: string;
  preferences?: string;
  gender?: string;
  file?: any;
}) => {
  const formData = new FormData();

  if (data.fullName) formData.append("fullName", data.fullName);
  if (data.email) formData.append("email", data.email);
  if (data.dateOfBirth) formData.append("dateOfBirth", data.dateOfBirth);
  if (data.location) formData.append("location", data.location);

  // map bio -> preferences
  if (data.bio) formData.append("preferences", data.bio);

  if (data.gender) formData.append("gender", data.gender);

  if (data.file) {
    formData.append("avatar", {
      uri: data.file.uri,
      name: data.file.name || "avatar.jpg",
      type: data.file.type || "image/jpeg",
    } as any);
  }

  return requestForm("/mobile/profile/me", formData, {
    method: "POST",
  });
};