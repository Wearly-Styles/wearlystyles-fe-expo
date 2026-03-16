import {useState} from "react";
import {commentPost} from "../services/postApi";

export const useCommentPost = (postId: number) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createComment = async (content: string) => {
    try {
      setLoading(true);

      const res = await commentPost(postId, content);

      setError(null);

      return res?.data || res;
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { createComment, loading, error };
};