import { useState } from "react";
import { likePost } from "../services/postApi";

export const useLikePost = () => {

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLikePost = async (postId: number) => {

    setLoading(true);
    setError(null);

    console.log("🔄 handleLikePost called with:", postId);

    try {

      const result = await likePost(postId);

      console.log("✅ handleLikePost result:", result);

      return result;   // ⭐ QUAN TRỌNG

    } catch (err: any) {

      console.log("❌ handleLikePost error:", err);

      setError(err.message || "Something went wrong");

      return null;

    } finally {
      setLoading(false);
    }
  };

  return { loading, error, handleLikePost };
};