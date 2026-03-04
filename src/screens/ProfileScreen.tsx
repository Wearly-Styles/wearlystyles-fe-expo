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
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import { setAuthToken } from "../services/apiClient";
import { setStoredRefreshToken, setStoredToken } from "../services/authStore";
import { useProfile } from "../hooks/useProfile";
import { authApi } from "../services/outfitApi";

const WARDROBE_DATA = [
  { id: "1", image: "https://via.placeholder.com/150" },
  { id: "2", image: "https://via.placeholder.com/150" },
  { id: "3", image: "https://via.placeholder.com/150" },
  { id: "4", image: "https://via.placeholder.com/150" },
];

export default function ProfileScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"info" | "wardrobe">("info");
  const [loggingOut, setLoggingOut] = useState(false);

  const { profile, loading, error } = useProfile();
  const userProfile = profile?.profile;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authApi.logout();
    } catch {}
    finally {
      setAuthToken(null);
      await setStoredToken(null);
      await setStoredRefreshToken(null);
      router.replace("/login");
    }
  };

  const renderInfo = () => {
    // Debug profile và avatar
  console.log("Full profile data:", profile);
  console.log("User profile:", userProfile);
  console.log("Avatar URL:", userProfile?.avatar);
    const avatarUri =
      userProfile && userProfile.avatar
        ? userProfile.avatar
        : "https://via.placeholder.com/150";

    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {loading ? (
            <ActivityIndicator size="small" color="#F4B400" />
          ) : (
            <Image
              source={{ uri: avatarUri }}
              style={styles.avatar}
              resizeMode="cover"
            />
          )}
        </View>

        {/* Personal Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={20} color="#F4B400" />
            <Text style={styles.infoText}>{userProfile?.fullName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail" size={20} color="#F4B400" />
            <Text style={styles.infoText}>{profile?.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="gift" size={20} color="#F4B400" />
            <Text style={styles.infoText}>
              {userProfile?.dateOfBirth
                ? new Date(userProfile.dateOfBirth).toLocaleDateString()
                : "N/A"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color="#F4B400" />
            <Text style={styles.infoText}>{userProfile?.location || "N/A"}</Text>
          </View>
          <Text style={styles.sectionTitle}>Bio</Text>
          <Text style={styles.bioText}>
            {userProfile?.bio || "No bio available"}
          </Text>
        </View>

        {/* Account Actions */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Account Actions</Text>
          <TouchableOpacity
            style={[styles.logoutButton, loggingOut && { opacity: 0.6 }]}
            onPress={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.logoutText}>Sign Out</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderWardrobe = () => (
    <FlatList
      data={WARDROBE_DATA}
      numColumns={2}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingBottom: 120 }}
      renderItem={({ item }) => (
        <View style={styles.imageWrapper}>
          <Image source={{ uri: item.image }} style={styles.wardrobeImage} />
          <Ionicons
            name="heart"
            size={18}
            color="red"
            style={styles.heartIcon}
          />
        </View>
      )}
    />
  );

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#F4B400" />
      </View>
    );
  if (error)
    return (
      <View style={styles.center}>
        <Text>{error}</Text>
      </View>
    );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={{ flex: 1 }}>
        <AppHeader
          title="Profile"
          subtitle="Manage your personal style"
          onBackPress={() => router.back()}
          rightAction={
            <TouchableOpacity onPress={() => router.push("/edit-profile")}>
              <Ionicons name="create-outline" size={22} color="#F4B400" />
            </TouchableOpacity>
          }
        />

        {/* Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === "info" && styles.activeTab]}
            onPress={() => setActiveTab("info")}
          >
            <Ionicons
              name="person-circle"
              size={22}
              color={activeTab === "info" ? "#F4B400" : "#aaa"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === "wardrobe" && styles.activeTab]}
            onPress={() => setActiveTab("wardrobe")}
          >
            <Ionicons
              name="images"
              size={22}
              color={activeTab === "wardrobe" ? "#F4B400" : "#aaa"}
            />
          </TouchableOpacity>
        </View>

        {activeTab === "info" ? renderInfo() : renderWardrobe()}

        <BottomNav active="profile" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  tabBar: {
    flexDirection: "row",
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 12 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: "#F4B400" },
  card: {
    margin: 16,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  infoText: { fontSize: 14 },
  bioText: { marginTop: 10, fontSize: 14, color: "#666" },
  logoutButton: {
    marginTop: 10,
    backgroundColor: "#F4B400",
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: "center",
  },
  logoutText: { color: "#fff", fontWeight: "600" },
  imageWrapper: { flex: 1, margin: 6, borderRadius: 12, overflow: "hidden", position: "relative" },
  wardrobeImage: { width: "100%", height: 180 },
  heartIcon: { position: "absolute", top: 8, right: 8 },
  avatarContainer: { alignItems: "center", marginTop: 16, marginBottom: 10 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: "#F4B400" },
});