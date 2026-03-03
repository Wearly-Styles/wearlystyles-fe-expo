import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function EditProfileScreen() {
  const router = useRouter();

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#F4B400" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit profile</Text>
        <View style={{ width: 28 }} /> 
      </View>

      {/* Avatar Section */}
      <View style={styles.avatarContainer}>
        <Image 
          source={{ uri: 'https://via.placeholder.com/150' }} 
          style={styles.avatar} 
        />
        <TouchableOpacity style={styles.editIcon}>
          <Ionicons name="camera" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Form Fields */}
      <View style={styles.form}>
        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} placeholder="Băng Băng" placeholderTextColor="#A0A0A0" />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} placeholder="bang@gmail.com" keyboardType="email-address" />

        {/* Birthday & Location nằm trên cùng 1 hàng */}
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.label}>Birthday</Text>
            <TextInput style={styles.input} placeholder="12/12/2005" />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.label}>Location</Text>
            <TextInput style={styles.input} placeholder="An Nhơn" />
          </View>
        </View>

        <Text style={styles.label}>Bio</Text>
        <TextInput 
          style={[styles.input, styles.bioInput]} 
          multiline 
          numberOfLines={4}
          placeholder="Fashion enthusiast passionate about sustainable style and wardrobe management." 
          textAlignVertical="top"
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.button, styles.cancelBtn]} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.saveBtn]}>
          <Text style={styles.buttonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 50 },
  scrollContent: { alignItems: 'center', paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 20, marginBottom: 30 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#F4B400' },
  avatarContainer: { position: 'relative', marginBottom: 30 },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 1, borderColor: '#eee' },
  editIcon: { position: 'absolute', bottom: 5, right: 5, backgroundColor: '#F4B400', borderRadius: 15, padding: 6, borderWidth: 2, borderColor: '#fff' },
  form: { width: '100%', paddingHorizontal: 25 },
  label: { fontSize: 16, fontWeight: '600', color: '#1A202C', marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 14, color: '#4A5568' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  bioInput: { minHeight: 100, paddingTop: 12 }, // Cho phép nhập nhiều dòng
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 25, marginTop: 40 },
  button: { flex: 0.45, paddingVertical: 15, borderRadius: 25, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#FFC107' },
  saveBtn: { backgroundColor: '#FFC107' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});