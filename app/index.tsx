import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { getStoredToken } from "../src/services/authStore";
import { setAuthToken } from "../src/services/apiClient";
import { theme } from "../src/constants/theme";

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    let isActive = true;
    const loadToken = async () => {
      const token = await getStoredToken();
      if (!isActive) return;
      if (token) {
        setAuthToken(token);
        setHasToken(true);
      }
      setLoading(false);
    };
    loadToken();
    return () => {
      isActive = false;
    };
  }, []);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator color={theme.colors.primaryDark} />
      </View>
    );
  }

  return <Redirect href={hasToken ? "/(tabs)" : "/login"} />;
}
