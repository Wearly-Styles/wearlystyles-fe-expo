import { View, Text, TouchableOpacity, StyleSheet, FlatList, Image } from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { DrawerActions } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useGetCloset } from "../hooks/useClothing";

export default function ClosetScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  
  // Lấy dữ liệu từ API qua Hook
  const { data: items = [], isLoading } = useGetCloset();

  // Hàm render từng thẻ Card (Khung Card bạn cần)
  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Image 
        source={{ uri: item.image || 'https://via.placeholder.com/150' }} 
        style={styles.cardImage} 
      />
      <View style={styles.cardInfo}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.itemCategory}>{item.category || "General"}</Text>
        <Text style={styles.itemWorn}>Worn {item.wornCount || 0}x</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Ionicons name="menu" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Closet</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* Content: Danh sách thẻ Card */}
      {isLoading ? (
        <View style={styles.center}><Text>Loading items...</Text></View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2} // Chia 2 cột như ảnh mẫu
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<View style={styles.center}><Text>Tủ đồ trống</Text></View>}
        />
      )}

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
  container: { flex: 1, backgroundColor: "#FFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: "600" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { paddingHorizontal: 8, paddingBottom: 100 },
  
  // Style cho thẻ Card
  card: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 16,
    margin: 8,
    padding: 10,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  cardImage: { 
    width: "100%", 
    height: 160, 
    borderRadius: 12, 
    backgroundColor: '#f0f0f0' 
  },
  cardInfo: { marginTop: 10 },
  itemName: { fontSize: 14, fontWeight: "700", color: "#333" },
  itemCategory: { fontSize: 12, color: "#666", marginTop: 2 },
  itemWorn: { fontSize: 11, color: "#999", marginTop: 4 },

  fab: {
    position: "absolute",
    bottom: 90,
    right: 24,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "#FFC107",
    justifyContent: "center", alignItems: "center",
    elevation: 6,
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
});