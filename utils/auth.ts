// utils/auth.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export const getUserId = async (): Promise<number | null> => {
  const userId = await AsyncStorage.getItem("USER_ID");
  return userId ? Number(userId) : null;
};

export const getToken = async (): Promise<string | null> => {
  const token = await AsyncStorage.getItem("accessToken");
  return token;
}
