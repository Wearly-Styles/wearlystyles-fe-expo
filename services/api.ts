import axios from "axios";

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = process.env.EXPO_PUBLIC_DEV_TOKEN;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  console.log("➡️ API REQUEST:", {
    url: config.url,
    auth: config.headers.Authorization,
  });
  console.log("🧪 RAW TOKEN:", process.env.EXPO_PUBLIC_DEV_TOKEN);


  return config;
});

export default api;
