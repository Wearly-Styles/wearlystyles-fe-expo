import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AppHeader from "../components/AppHeader";

export default function EditProfileScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1 }}>
      <AppHeader
        title="Edit Profile"
        subtitle="Update your personal style"
        onBackPress={() => router.back()}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}

        {/* Avatar Section */}
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: "https://via.placeholder.com/150" }}
            style={styles.avatar}
          />
          <TouchableOpacity style={styles.editIcon}>
            <Ionicons name="camera" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor="#A0A0A0"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email, e.g., john@example.com"
            keyboardType="email-address"
          />

          {/* Birthday & Location on the same row */}
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Birthday</Text>
              <TextInput style={styles.input} placeholder="DD/MM/YYYY" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                placeholder="City, State, or Country"
              />
            </View>
          </View>

          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            multiline
            numberOfLines={4}
            placeholder="Share a bit about yourself, hobbies, or style preferences..."
            textAlignVertical="top"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.cancelBtn]}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonTextCancel}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.saveBtn]}>
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 50 },
  scrollContent: { alignItems: "center", paddingBottom: 120 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#F4B400" },
  avatarContainer: { position: "relative", marginBottom: 30 },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: "#eee",
  },
  editIcon: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: "#F4B400",
    borderRadius: 15,
    padding: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  form: { width: "100%", paddingHorizontal: 25 },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A202C",
    marginBottom: 8,
    marginTop: 15,
  },
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
  row: { flexDirection: "row", justifyContent: "space-between" },
  bioInput: { minHeight: 100, paddingTop: 12 }, // Cho phép nhập nhiều dòng
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 25,
    marginTop: 40,
  },
  button: {
    flex: 0.45,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  cancelBtn: { backgroundColor: "#a10808" },
  saveBtn: { backgroundColor: "#FFC107" },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  buttonTextCancel: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
