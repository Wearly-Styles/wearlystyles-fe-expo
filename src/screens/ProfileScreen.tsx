// screens/ProfileScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
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
import { useUserPosts } from "../hooks/useUserPost";
import PostCard from "../components/PostCard";

export default function ProfileScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"info" | "wardrobe">("info");
  const [loggingOut, setLoggingOut] = useState(false);

  const { profile, loading: profileLoading, error: profileError } = useProfile();
  const userProfile = profile?.profile || profile;

  const userId =
    profile?.id ||
    userProfile?.id ||
    userProfile?.userId ||
    userProfile?._id;

  const {
    posts: userPosts,
    loading: postsLoading,
    error: postsError,
    refetch: refetchPosts,
  } = useUserPosts(1, 20);

  useEffect(() => {
  }, [userPosts, postsLoading, postsError]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authApi.logout();
    } catch (err) {
      console.error("[ProfileScreen] Logout API error:", err);
    } finally {
      setAuthToken(null);
      await setStoredToken(null);
      await setStoredRefreshToken(null);
      router.replace("/login");
    }
  };

  // --- RENDER INFO TAB ---
  const renderInfo = () => {
    const avatarUri =
      userProfile?.avatar || "https://via.placeholder.com/150";

    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.avatarContainer}>
          {profileLoading ? (
            <ActivityIndicator size="small" color="#F4B400" />
          ) : (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={20} color="#F4B400" />
            <Text style={styles.infoText}>{userProfile?.fullName || "N/A"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail" size={20} color="#F4B400" />
            <Text style={styles.infoText}>{profile?.email || "N/A"}</Text>
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
          <Text style={styles.bioText}>{userProfile?.bio || "No bio available"}</Text>
        </View>

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

  // --- RENDER WARDROBE TAB ---
  const renderWardrobe = () => {

    if (postsLoading)
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#F4B400" />
        </View>
      );

    if (postsError)
      return (
        <View style={styles.center}>
          <Text>{postsError}</Text>
        </View>
      );

    if (!userPosts.length)
      return (
        <View style={[styles.center, { marginTop: 50 }]}>
          <Text>No posts available</Text>
        </View>
      );

    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {userPosts.map((post) => {
          return <PostCard key={post.id} post={post} />;
        })}
      </ScrollView>
    );
  };

  // --- MAIN RENDER ---
  if (profileLoading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#F4B400" />
        <Text>Loading profile...</Text>
      </View>
    );

  if (profileError)
    return (
      <View style={styles.center}>
        <Text>Error loading profile: {profileError}</Text>
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

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === "info" && styles.activeTab]}
            onPress={() => {
              setActiveTab("info");
            }}
          >
            <Ionicons
              name="person-circle"
              size={22}
              color={activeTab === "info" ? "#F4B400" : "#aaa"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === "wardrobe" && styles.activeTab]}
            onPress={() => {
              setActiveTab("wardrobe");
            }}
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

// --- STYLES ---
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
  avatarContainer: { alignItems: "center", marginTop: 16, marginBottom: 10 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: "#F4B400" },
});