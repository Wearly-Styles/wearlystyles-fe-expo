import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("accessToken");
    console.log("==== AXIOS REQUEST ====");
    console.log("URL:", config.url);
    console.log("TOKEN FROM STORAGE:", token);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("Authorization header set");
    }

    console.log("Config.headers:", config.headers);

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log("==== AXIOS RESPONSE SUCCESS ====");
    console.log("URL:", response.config.url);
    console.log("DATA:", response.data);
    return response;
  },
  (error) => {
    console.log("==== AXIOS RESPONSE ERROR ====");
    console.log("URL:", error.config?.url);
    console.log("STATUS:", error.response?.status);
    console.log("DATA:", error.response?.data);
    return Promise.reject(error);
  }
);

export default api;