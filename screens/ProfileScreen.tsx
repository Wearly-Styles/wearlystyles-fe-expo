//D:\wearlystyles-fe-expo\WearlyStyles\app\screens\ProfileScreen.tsx
import { View, Text, Button } from "react-native";
import { useRouter } from "expo-router";

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Profile Screen</Text>
      <Button
        title="Back to Home"
        onPress={() => router.push("/")}
      />
    </View>
  );
}
