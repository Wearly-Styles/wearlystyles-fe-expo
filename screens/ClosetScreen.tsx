import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { DrawerActions } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

export default function ClosetScreen() {
  const navigation = useNavigation();
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            navigation.dispatch(DrawerActions.openDrawer())
          }
        >
          <Ionicons name="menu" size={26} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Closet</Text>

        {/* placeholder để căn giữa title */}
        <View style={{ width: 26 }} />
      </View>

      {/* Content */}
      <View style={styles.center}>
        <Text>Trang này có Drawer</Text>
      </View>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => router.push("/closet/add")}
      >
        <Ionicons name="add" size={32} color="#000" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  fab: {
    position: "absolute",
    bottom:90,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFC107",
    justifyContent: "center",
    alignItems: "center",

    // Android
    elevation: 6,

    // iOS
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
});
