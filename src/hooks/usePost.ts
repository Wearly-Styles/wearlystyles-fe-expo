import { useEffect, useState } from "react";
import { getPosts } from "../services/postApi";

export const usePosts = (page: number, limit: number) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await getPosts(page, limit);
      setPosts(res || []); 
    } catch (err: any) {
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