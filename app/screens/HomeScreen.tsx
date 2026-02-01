//D:\wearlystyles-fe-expo\WearlyStyles\app\screens\HomeScreen.tsx
import { View, Text, Button } from "react-native";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Home Screen</Text>
      <Button
        title="Go to Profile"
        onPress={() => router.push("/profile")}
      />
    </View>
  );
}
