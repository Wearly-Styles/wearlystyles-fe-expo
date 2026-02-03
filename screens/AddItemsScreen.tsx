import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useCategories } from "../hooks/useCategories";
import { useClothing } from "../hooks/useClothing";

export default function AddClothingScreen() {
  // ===== FORM STATE =====
  const [name, setName] = useState("");
  const [season, setSeason] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<string | null>(null);

  // ===== CATEGORY STATE =====
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);

  // ===== API =====
  const { data: categories = [], isLoading } = useCategories();
  const { mutate: createItem, isPending } = useClothing();

  // ===== IMAGE PICKER =====
  const openGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission denied", "Gallery access is required");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    if (!name || !season || !description || !image || !selectedCategory) {
      Alert.alert("Missing information", "Please fill all fields");
      return;
    }

    createItem(
      {
        name,
        season,
        description,
        categoryId: selectedCategory.id,
        imageUri: image,
      },
      {
        onSuccess: () => {
          Alert.alert("Success", "Clothing item added!");
          router.back();
        },
        onError: (err: any) => {
          Alert.alert("Error", err.message || "Something went wrong");
        },
      },
    );
  };

  return (
    <View style={styles.container}>
      {/* BACK */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      {/* IMAGE */}
      <TouchableOpacity style={styles.uploadBox} onPress={openGallery}>
        {image ? (
          <Image source={{ uri: image }} style={styles.previewImage} />
        ) : (
          <>
            <Ionicons name="image-outline" size={40} color="#FFC107" />
            <Text style={styles.uploadText}>Choose from library</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Oversized Hoodie"
      />

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Season</Text>
          <TextInput
            style={styles.input}
            value={season}
            onChangeText={setSeason}
            placeholder="e.g. Winter"
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Category</Text>

          <View style={styles.dropdownWrapper}>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setOpen(!open)}
            >
              <Text style={{ color: selectedCategory ? "#000" : "#999" }}>
                {selectedCategory?.name || "Choose category"}
              </Text>
              <Ionicons
                name={open ? "chevron-up" : "chevron-down"}
                size={16}
                color="#666"
              />
            </TouchableOpacity>

            {open && (
              <View style={styles.dropdownAbsolute}>
                {isLoading && <Text style={{ padding: 12 }}>Loading...</Text>}

                {!isLoading &&
                  categories.map((item: any) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedCategory(item);
                        setOpen(false);
                      }}
                    >
                      <Text>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
              </View>
            )}
          </View>
        </View>
      </View>

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        multiline
        value={description}
        onChangeText={setDescription}
        placeholder="Describe the item"
      />

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        disabled={isPending}
      >
        <Text style={styles.saveText}>{isPending ? "Saving..." : "Save"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 16,
    marginTop: 50,
  },

  header: {
    backgroundColor: "#FFC107",
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
  },

  title: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "600",
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: -30,
    marginBottom: 16,
    elevation: 3,
  },

  searchInput: {
    flex: 1,
    marginRight: 8,
  },

  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },

  category: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#FFF3CD",
  },

  categoryActive: {
    backgroundColor: "#FFC107",
  },

  categoryText: {
    fontSize: 12,
  },

  categoryTextActive: {
    fontWeight: "600",
  },

  uploadBox: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#FFC107",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 8,
  },

  uploadButton: {
    marginTop: 12,
    backgroundColor: "#FFC107",
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 12,
  },

  uploadText: {
    fontWeight: "600",
  },

  helperText: {
    textAlign: "center",
    color: "#AAA",
    marginBottom: 16,
  },

  label: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },

  row: {
    flexDirection: "row",
    gap: 12,
  },

  textArea: {
    height: 80,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  dropdown: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    backgroundColor: "#FFF",
    marginTop: -8,
    marginBottom: 12,
    overflow: "hidden",
  },

  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },

  dropdownWrapper: {
    position: "relative",
    zIndex: 20, // Android cần
  },

  dropdownAbsolute: {
    position: "absolute",
    top: 52, // ngay dưới input
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    elevation: 6, // Android shadow
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },

  saveButton: {
    marginTop: 16,
    backgroundColor: "#FFC107",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  saveText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    elevation: 3, // Android shadow
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
