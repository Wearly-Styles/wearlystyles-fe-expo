import { useState } from "react";
import { updateProfile } from "../services/profileApi";
import { getApiErrorMessage } from "../services/apiClient";

export const useUpdateProfile = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveProfile = async (data: Parameters<typeof updateProfile>[0]) => {
    try {
      setLoading(true);
      setError(null);

      const res = await updateProfile(data);
      return res;
    } catch (err: unknown) {
      const message = getApiErrorMessage(err) || "Update profile failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    saveProfile,
    loading,
    error,
  };
};