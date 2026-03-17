import { useState } from "react";
import { ApiError } from "../services/apiClient";
import { deletePost } from "../services/postApi";

export const useDeletePost = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeletePost = async (postId: number) => {
    setLoading(true);
    setError(null);

    try {
      await deletePost(postId);

      return {
        success: true,
      };
    } catch (err: any) {
      const statusCode = err instanceof ApiError ? err.status : undefined;
      const message =
        statusCode === 403
          ? "You cannot delete this post."
          : err?.response?.data?.message ||
            err?.message ||
            "Something went wrong";

      setError(message);

      return {
        success: false,
        message,
        statusCode,
      };
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, handleDeletePost };
};
