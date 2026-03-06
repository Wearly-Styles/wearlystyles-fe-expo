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
  gender?: string;
  file?: any;
}) => {
  const formData = new FormData();

  if (data.fullName) formData.append("fullName", data.fullName);
  if (data.email) formData.append("email", data.email);
  if (data.dateOfBirth) formData.append("dateOfBirth", data.dateOfBirth);
  if (data.location) formData.append("location", data.location);
  if (data.bio) formData.append("preferences", data.bio);
  if (data.gender) formData.append("gender", data.gender);

  if (data.file) {
    formData.append("avatar", {
      uri: data.file.uri,
      name: data.file.name || "avatar.jpg",
      type: data.file.type || "image/jpeg",
    } as any);
  }

  // 🔥 DEBUG ĐẶT Ở ĐÂY
  console.log("------ FORM DATA DEBUG ------");
  // React Native dùng _parts
  // @ts-ignore
  formData._parts?.forEach((part: any) => {
    console.log("KEY:", part[0]);
  });

  return requestForm("/mobile/profile/me", formData, {
    method: "POST",
  });
};