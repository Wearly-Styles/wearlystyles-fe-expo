import { useState } from "react";
import { deletePost } from "../services/postApi";
import {Alert} from "react-native";

export const useDeletePost = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeletePost = async (postId: number) => {
    setLoading(true);
    setError(null);

    try {
      await deletePost(postId);
      return true;
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, handleDeletePost };
};