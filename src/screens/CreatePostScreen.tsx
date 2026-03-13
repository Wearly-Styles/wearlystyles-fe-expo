import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";

import AppHeader from "../components/AppHeader";
import { theme } from "../constants/theme";
import { useCreatePost } from "../hooks/useCreatePost";

type PickedImage = {
  uri: string;
  name: string;
  type: string;
};

const STATUS = ["public", "private"];

export default function CreatePostScreen() {
  const router = useRouter();

  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState("public");
  const [image, setImage] = useState<PickedImage | null>(null);

  const { loading, error, handleCreatePost } = useCreatePost();

  const handlePickImage = async () => {

    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      alert("Allow photo access");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.7,
        });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setImage({
      uri: asset.uri,
      name: asset.fileName || "image.jpg",
      type: asset.mimeType || "image/jpeg",
    });
  };

const handleSubmit = async () => {
  const res = await handleCreatePost(caption, image, status);

  if (res) {
    router.replace("/(tabs)/explore");
  }
};

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <AppHeader
          title="Create a new post"
          subtitle="Share your style with the world"
          onBackPress={() => router.back()}
        />

        {/* IMAGE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photo</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
            {image ? (
              <Image source={{ uri: image.uri }} style={styles.imagePreview} />
            ) : (
              <Text style={styles.imagePlaceholder}>Tap to upload</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* CAPTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Caption</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Write something..."
            placeholderTextColor={theme.colors.textSoft}
            value={caption}
            onChangeText={setCaption}
            multiline
          />
        </View>

        {/* STATUS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visibility</Text>
          <View style={styles.pillRow}>
            {STATUS.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.pill, status === item && styles.pillActive]}
                onPress={() => setStatus(item)}
              >
                <Text style={[styles.pillText, status === item && styles.pillTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={styles.primaryButton}
          disabled={loading}
          onPress={handleSubmit}
        >
          {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.primaryText}>Post</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { paddingBottom: 120 },
  section: { marginTop: theme.spacing.lg, paddingHorizontal: theme.spacing.lg },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: theme.colors.text, marginBottom: theme.spacing.sm },
  imagePicker: {
    height: 200,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  imagePreview: { width: "100%", height: "100%" },
  imagePlaceholder: { fontSize: 12, color: theme.colors.textSoft },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontSize: 13,
    color: theme.colors.text,
    backgroundColor: "#FFF9F0",
  },
  inputMultiline: { minHeight: 100, textAlignVertical: "top" },
  pillRow: { flexDirection: "row", gap: theme.spacing.sm },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surface },
  pillActive: { backgroundColor: theme.colors.primary },
  pillText: { fontSize: 11, color: theme.colors.textSoft, fontWeight: "600" },
  pillTextActive: { color: theme.colors.text },
  primaryButton: { marginTop: theme.spacing.lg, marginHorizontal: theme.spacing.lg, backgroundColor: theme.colors.primary, paddingVertical: 12, borderRadius: theme.radius.pill, alignItems: "center" },
  primaryText: { fontSize: 13, fontWeight: "700", color: theme.colors.text },
  errorText: { paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.sm, fontSize: 12, color: "#C44536" },
});