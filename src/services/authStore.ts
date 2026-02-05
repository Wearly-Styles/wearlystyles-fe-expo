import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS_TOKEN_KEY = "wearlystyles.accessToken";
const REFRESH_TOKEN_KEY = "wearlystyles.refreshToken";

export const getStoredToken = async () => {
  try {
    return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setStoredToken = async (token: string | null) => {
  try {
    if (!token) {
      await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
    } else {
      await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
    }
  } catch {
    // no-op
  }
};

export const getStoredRefreshToken = async () => {
  try {
    return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setStoredRefreshToken = async (token: string | null) => {
  try {
    if (!token) {
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    } else {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
    }
  } catch {
    // no-op
  }
};
