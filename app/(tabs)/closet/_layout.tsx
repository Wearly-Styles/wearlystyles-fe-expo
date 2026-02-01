// app/(tabs)/closet/_layout.tsx
import { Drawer } from "expo-router/drawer";

export default function ClosetDrawerLayout() {
  return (
    <Drawer
      screenOptions={{
        headerShown: true,
        drawerStyle: { width: "50%" }, 
      }}
    >
      <Drawer.Screen
        name="index"
        options={{ title: "My Closet" }}
      />
    </Drawer>
  );
}
