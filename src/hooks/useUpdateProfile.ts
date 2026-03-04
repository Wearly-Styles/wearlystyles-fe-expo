// hooks/useUpdateProfile.ts
import { useState } from "react";
import { updateProfile } from "../services/profileApi";

export const useUpdateProfile = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveProfile = async (data: Parameters<typeof updateProfile>[0]) => {
    setLoading(true);
    setError(null);
    try {
      const res = await updateProfile(data);
      return res;
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { saveProfile, loading, error };
};

