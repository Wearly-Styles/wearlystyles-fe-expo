import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../constants/theme";

type NavKey = "home" | "wardrobe" | "explore" | "profile";

type BottomNavProps = {
  active: NavKey;
};

export default function BottomNav({ active }: BottomNavProps) {
  const router = useRouter();

  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => router.push("/")}
      >
        <Ionicons
          name="home"
          size={22}
          color={active === "home" ? theme.colors.text : theme.colors.textSoft}
        />
        <Text
          style={[
            styles.navText,
            active === "home" && styles.navTextActive,
          ]}
        >
          Home
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => router.push("/wardrobe")}
      >
        <Feather
          name="shopping-bag"
          size={20}
          color={active === "wardrobe" ? theme.colors.text : theme.colors.textSoft}
        />
        <Text
          style={[
            styles.navText,
            active === "wardrobe" && styles.navTextActive,
          ]}
        >
          Wardrobe
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => router.push("/explore")}
      >
        <MaterialCommunityIcons
          name="compass-outline"
          size={22}
          color={active === "explore" ? theme.colors.text : theme.colors.textSoft}
        />
        <Text
          style={[
            styles.navText,
            active === "explore" && styles.navTextActive,
          ]}
        >
          Explore
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => router.push("/profile")}
      >
        <Ionicons
          name="person-outline"
          size={22}
          color={active === "profile" ? theme.colors.text : theme.colors.textSoft}
        />
        <Text
          style={[
            styles.navText,
            active === "profile" && styles.navTextActive,
          ]}
        >
          Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 82,
    backgroundColor: theme.colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  navItem: {
    alignItems: "center",
    gap: 4,
  },
  navText: {
    fontSize: 10,
    color: theme.colors.textSoft,
    fontWeight: "600",
  },
  navTextActive: {
    color: theme.colors.text,
    fontWeight: "700",
  },
});
