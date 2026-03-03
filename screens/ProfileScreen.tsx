// ProfileScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Header from "@/components/Header";
import { useProfile } from "@/hooks/useProfile";

const WARDROBE_DATA = [
  { id: "1", image: "https://via.placeholder.com/150" },
  { id: "2", image: "https://via.placeholder.com/150" },
  { id: "3", image: "https://via.placeholder.com/150" },
  { id: "4", image: "https://via.placeholder.com/150" },
  { id: "5", image: "https://via.placeholder.com/150" },
  { id: "6", image: "https://via.placeholder.com/150" },
];

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState("info");
  const { profile, loading, error } = useProfile();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#F4B400" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text>{error}</Text>
      </View>
    );
  }

  const user = profile;
  const userProfile = profile?.profile;

  const renderInfo = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={styles.infoContainer}>
        <Text style={styles.sectionTitle}>Personal Information</Text>

        {/* Email */}
        <View style={styles.infoRow}>
          <View style={[styles.iconBox, { backgroundColor: "#FFD700" }]}>
            <Ionicons name="mail" size={20} color="#fff" />
          </View>
          <View>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
        </View>

        {/* Birthday */}
        <View style={styles.infoRow}>
          <View style={[styles.iconBox, { backgroundColor: "#FFA500" }]}>
            <Ionicons name="gift" size={20} color="#fff" />
          </View>
          <View>
            <Text style={styles.infoLabel}>Birthday</Text>
            <Text style={styles.infoValue}>
              {userProfile?.dateOfBirth
                ? new Date(userProfile.dateOfBirth).toLocaleDateString()
                : "N/A"}
            </Text>
          </View>
        </View>

        {/* Location */}
        <View style={styles.infoRow}>
          <View style={[styles.iconBox, { backgroundColor: "#FF8C00" }]}>
            <Ionicons name="location" size={20} color="#fff" />
          </View>
          <View>
            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoValue}>
              {userProfile?.location || "N/A"}
            </Text>
          </View>
        </View>

        {/* Bio */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Bio</Text>
        <Text style={styles.bioText}>
          {userProfile?.bio || "No bio available"}
        </Text>
      </View>
    </ScrollView>
  );

  const renderWardrobe = () => (
    <FlatList
      data={WARDROBE_DATA}
      numColumns={2}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.gridContainer}
      renderItem={({ item }) => (
        <View style={styles.imageWrapper}>
          <Image source={{ uri: item.image }} style={styles.wardrobeImage} />
          <TouchableOpacity style={styles.heartIcon}>
            <Ionicons name="heart" size={18} color="red" />
          </TouchableOpacity>
        </View>
      )}
    />
  );

  return (
    <View style={styles.container}>
      <Header
        name={userProfile?.fullName || "User"}
        avatarUrl={
          userProfile?.avatar || "https://via.placeholder.com/100"
        }
        onPressSettings={() => {}}
      />

      {/* Tab */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === "info" && styles.activeTab]}
          onPress={() => setActiveTab("info")}
        >
          <Ionicons
            name="person-circle"
            size={24}
            color={activeTab === "info" ? "#F4B400" : "#CCC"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === "wardrobe" && styles.activeTab]}
          onPress={() => setActiveTab("wardrobe")}
        >
          <Ionicons
            name="document-text"
            size={24}
            color={activeTab === "wardrobe" ? "#F4B400" : "#CCC"}
          />
        </TouchableOpacity>
      </View>

      {activeTab === "info" ? renderInfo() : renderWardrobe()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tabBar: {
    flexDirection: "row",
    marginTop: 20,
    marginBottom: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "#eee",
  },
  activeTab: {
    borderBottomColor: "#F4B400",
  },
  infoContainer: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  infoLabel: {
    fontSize: 14,
    color: "#888",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "500",
  },
  bioText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  gridContainer: {
    paddingBottom: 100,
  },
  imageWrapper: {
    flex: 1,
    margin: 5,
    borderRadius: 15,
    overflow: "hidden",
    position: "relative",
  },
  wardrobeImage: {
    width: "100%",
    height: 200,
    backgroundColor: "#f0f0f0",
  },
  heartIcon: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
  },
});