import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import Toast from "react-native-root-toast";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import AppHeader from "../components/AppHeader";
import { useProfile } from "../hooks/useProfile";
import { useUpdateProfile } from "../hooks/useUpdateProfile";
import { replace } from "expo-router/build/global-state/routing";

export default function EditProfileScreen() {
  const router = useRouter();
  const { profile, loading, refetch } = useProfile();
  const { saveProfile, loading: saving } = useUpdateProfile();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [file, setFile] = useState<any>(null);

  useEffect(() => {
    if (profile) {
      const p = profile.profile;

      setFullName(p?.fullName || "");
      setEmail(profile?.email || "");
      setBirthday(
        p?.dateOfBirth
          ? new Date(p.dateOfBirth).toISOString().slice(0, 10)
          : "",
      );
      setLocation(p?.location || "");
      setBio(p?.preferences || "");
      setAvatar(p?.avatar || null);
    }
  }, [profile]);

  const pickImage = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return alert("Please allow access to photo library");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      setAvatar(result.assets[0].uri);
      setFile({
        uri: result.assets[0].uri,
        name: "avatar.jpg",
        type: "image/jpeg",
      });
    }
  };

  const handleSave = async () => {
    try {
      const res = await saveProfile({
        fullName,
        email,
        dateOfBirth: birthday,
        location,
        bio,
        file,
      });

      Toast.show("Profile updated successfully!", {
        duration: 1500,
        position: Toast.positions.TOP,
        shadow: true,
        animation: true,
        hideOnPress: true,
        backgroundColor: "#2E7D32",
        opacity: 0.9,
        textColor: "#ffffff",
      });

      if (res) router.replace("/(tabs)/profile");

      await refetch();
    } catch (err) {
      console.error("Update error:", err);
      Toast.show("Failed to update profile.", {
        duration: 1500,
        position: Toast.positions.TOP,
        shadow: true,
        animation: true,
        hideOnPress: true,
        backgroundColor: "#C62828",
        opacity: 0.9,
        textColor: "#ffffff",
      });
    }
  };
  if (loading)
    return (
      <ActivityIndicator style={{ flex: 1 }} size="large" color="#F4B400" />
    );

  return (
    <View style={{ flex: 1, backgroundColor: "#f9f9f9" }}>
      <AppHeader
        title="Edit Profile"
        subtitle="Update your style"
        onBackPress={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: avatar || "https://via.placeholder.com/150" }}
            style={styles.avatar}
          />
          <TouchableOpacity style={styles.editIcon} onPress={pickImage}>
            <Ionicons name="camera" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <FormField
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your name"
          />
          <FormField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholder="john@example.com"
          />
          <FormField
            label="Birthday"
            value={birthday}
            onChangeText={setBirthday}
            placeholder="YYYY-MM-DD"
          />
          <FormField
            label="Location"
            value={location}
            onChangeText={setLocation}
            placeholder="City, State, or Country"
          />
          <FormField
            label="Bio"
            value={bio}
            onChangeText={setBio}
            multiline
            placeholder="Tell something about yourself"
          />
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.cancelBtn]}
            onPress={() => router.back()}
            disabled={saving}
          >
            <Text style={styles.cancelTextCompact}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// Reusable FormField component
const FormField = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = "default",
}: any) => (
  <View style={{ marginBottom: 18 }}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[
        styles.input,
        multiline && { minHeight: 100, textAlignVertical: "top" },
      ]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#A0A0A0"
      multiline={multiline}
      keyboardType={keyboardType}
    />
  </View>
);

const styles = StyleSheet.create({
  scrollContent: { alignItems: "center", paddingBottom: 100, paddingTop: 20 },
  avatarContainer: { position: "relative", marginBottom: 30 },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: "#F4B400",
  },
  editIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#F4B400",
    borderRadius: 18,
    padding: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  form: {
    width: "90%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 6 },
  input: {
    backgroundColor: "#F7FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    color: "#4A5568",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "90%",
    marginTop: 30,
  },
  button: {
    flex: 0.48,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  cancelBtn: { backgroundColor: "#FCE8E6" },
  saveBtn: { backgroundColor: "#F4B400" },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  cancelTextCompact: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#C44536",
  },
});
