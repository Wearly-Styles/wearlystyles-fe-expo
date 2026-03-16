import { request, requestForm } from "./apiClient";
import { getStoredToken } from "./authStore";
import { setAuthToken } from "./apiClient";

export const getPosts = async (page: number, limit: number) => {
  let res = await request(`/mobile/posts?page=${page}&limit=${limit}`);
  let postsArray: any[] = [];

  if (Array.isArray(res)) {
    postsArray = res;
  } else if (res?.data && Array.isArray(res.data)) {
    postsArray = res.data;
  } else if (res?.data?.data && Array.isArray(res.data.data)) {
    postsArray = res.data.data;
  } else {
    console.warn("[postApi] no posts array found, returning []");
  }

  postsArray.sort((a, b) => {
    const tA = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
    const tB = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
    return tB - tA;
  });

  return postsArray;
};

export const getPostsByUser = async (page = 1, limit = 20) => {
  try {
    const token = await getStoredToken();
    setAuthToken(token);

    const url = `/mobile/posts/user?page=${page}&limit=${limit}`;

    const res = await request(url);

    let postsArray: any[] = [];

    if (Array.isArray(res)) {
      postsArray = res;
    } else if (res?.data && Array.isArray(res.data)) {
      postsArray = res.data;
    } else if (res?.data?.data && Array.isArray(res.data.data)) {
      postsArray = res.data.data;
    } else {
      console.warn("[postApi] no posts array found, returning []");
    }

    postsArray.sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
      return tB - tA;
    });

    return postsArray;
  } catch (err: any) {
    console.error("[postApi] fetch error:", err);
    if (err?.status === 404) return [];
    throw err;
  }
};
export const createPost = async (
  caption: string,
  file: any,
  status: string,
) => {
  const formData = new FormData();

  formData.append("caption", caption);
  formData.append("status", status);

  if (file?.uri) {
    const imageData = {
      uri: file.uri,
      name: file.name || "photo.jpg",
      type: file.type || "image/jpeg",
    };

    formData.append("image", imageData as any);
  }

  const res = await requestForm("/mobile/posts", formData, {
    method: "POST",
  });

  return res;
};

export const deletePost = async (postId: number) => {
  return request(`/mobile/posts/${postId}`, {
    method: "DELETE",
  });
}

export const likePost = async (postId: number) => {
  const res = await request(`/mobile/posts/${postId}/like`, {
    method: "POST",
  });
  return res;
};

export const commentPost = async (postId: number, content: string) => {
  const res = await request(`/mobile/posts/${postId}/comment`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });

  return res;
};


