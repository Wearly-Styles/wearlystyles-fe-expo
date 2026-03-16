import { useState } from "react";
import { likePost } from "../services/postApi";

export const useLikePost = () => {

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLikePost = async (postId: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await likePost(postId);
      return result; 

    } catch (err: any) {
      setError(err.message || "Something went wrong");

      return null;

    } finally {
      setLoading(false);
    }
  };

  return { loading, error, handleLikePost };
};