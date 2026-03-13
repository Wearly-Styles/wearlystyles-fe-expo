import { useEffect, useState } from "react";
import { getPostsByUser } from "../services/postApi";

export const useUserPosts = (page: number = 1, limit: number = 20) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const data = await getPostsByUser(page, limit);
      setPosts(data);
      setError(null);
    } catch (err: any) {
      console.error("[useUserPosts] error fetching posts:", err);
      setPosts([]);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [page, limit]);

  return { posts, loading, error, refetch: fetchPosts };
};