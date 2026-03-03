//D:\wearlystyles-fe-expo\WearlyStyles\app\(tabs)\closet\_layout.tsx
import { Drawer } from "expo-router/drawer";
import ClosetDrawerContent from "@/screens/ClosetDrawerContent";

export default function ClosetDrawerLayout() {
  return (
    <Drawer
      drawerContent={() => <ClosetDrawerContent />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { width: "60%" },
      }}
    >
      <Drawer.Screen name="index" options={{ title: "" }} />
    </Drawer>
  );
}
