import { useState } from "react";
import { createPost } from "../services/postApi";

export const useCreatePost = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

const handleCreatePost = async (
  caption: string,
  image: { uri: string; name: string; type: string } | null,
  status: string
) => {
  setLoading(true);
  setError(null);

  try {
    const res = await createPost(caption, image, status);
    return res;
  } catch (err: any) {
    setError(err.message || "Something went wrong");
  } finally {
    setLoading(false);
  }
};

  return { loading, error, handleCreatePost };
};