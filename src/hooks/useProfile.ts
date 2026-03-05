import { useEffect, useState } from "react";
import { getMyProfile } from "../services/profileApi";

export const useProfile = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await getMyProfile();
      console.log("Fetched profile:", data); // <-- debug
      setProfile(data);
    } catch (err: any) {
      console.error("Error fetching profile:", err); // <-- debug
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  return { profile, loading, error, refetch: fetchProfile };
};