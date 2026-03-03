import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

interface HeaderProps {
  name: string;
  avatarUrl: string;
  onPressSettings?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  name,
  avatarUrl,
  onPressSettings,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        <Text style={styles.name}>{name}</Text>
      </View>

      <TouchableOpacity 
        onPress={() => router.push("/profile/edit")} 
        style={styles.iconWrapper}
      >
        <Ionicons name="settings-outline" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

export default Header;

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F4B400",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    marginRight: 15,
    borderWidth: 2,
    borderColor: "#fff",
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  iconWrapper: {
    padding: 6,
  },
});