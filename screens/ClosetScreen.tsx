import { View, Text, Button } from "react-native";
import { useNavigation } from "expo-router";
import { DrawerActions } from "@react-navigation/native";

export default function ClosetScreen() {
  const navigation = useNavigation();

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Trang này có Drawer</Text>

      <Button
        title="Open Drawer"
        onPress={() =>
          navigation.dispatch(DrawerActions.openDrawer())
        }
      />
    </View>
  );
}
