import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Alert,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useDeletePost } from "../hooks/useDeletePost";
import { useLikePost } from "../hooks/useLikePost";
import { useState, useEffect } from "react";
import Toast from "react-native-root-toast";

interface Comment {
  id: number;
  content: string;
}

interface Post {
  id: number;
  userId: number;

  user: {
    id: number;
    name: string;
    avatar?: string;
  };

  image: string | null;
  caption: string;
  likes: number;
  liked?: boolean;

  comments: Comment[];

  createdAt?: string;
}

interface Props {
  post: Post;
  onDelete?: (postId: number) => void;
}

export default function PostCard({ post, onDelete }: Props) {
  const [menuVisible, setMenuVisible] = useState(false);

  const { handleDeletePost } = useDeletePost();
  const { handleLikePost } = useLikePost();

  const [liked, setLiked] = useState(post.liked ?? false);
  const [likes, setLikes] = useState(post.likes);

  useEffect(() => {
    setLiked(post.liked ?? false);
    setLikes(post.likes);
  }, [post]);

  const likePostInFeed = async () => {
    const res = await handleLikePost(post.id);
    if (res) {
      const likedFromServer = res.liked ?? res.data?.liked;
      const likesFromServer = res.likesCount ?? res.data?.likesCount;
      setLiked(likedFromServer);
      setLikes(likesFromServer);
    }
  };

  const handleDelete = async () => {
    setMenuVisible(false);

    try {
      const res = await handleDeletePost(post.id);

      if (res.success) {
        Toast.show("Post deleted successfully", {
          duration: 1500,
          position: Toast.positions.TOP,
        });

        if (onDelete) {
          onDelete(post.id);
        } else {
          router.replace("/(tabs)/explore");
        }
      } else {
        Toast.show(res.message || "Failed to delete post", {
          duration: 1500,
          position: Toast.positions.TOP,
          backgroundColor: "#C62828",
        });
      }
    } catch (err) {
      Toast.show("Failed to delete post", {
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

  return (
    <View style={styles.card}>
      {/* HEADER */}

      <View style={styles.header}>
        <Image
          source={{
            uri:
              post.user.avatar ??
              "https://res.cloudinary.com/deriibors/image/upload/v1772733817/clothing-items/1772733812152-avatar.jpg",
          }}
          style={styles.avatar}
        />

        <View style={styles.userInfo}>
          <Text style={styles.username}>
            {post.user.name || `User ${post.userId}`}
          </Text>

          {post.createdAt && (
            <Text style={styles.timestamp}>
              {new Date(post.createdAt).toLocaleTimeString()}
            </Text>
          )}
        </View>

        <TouchableOpacity onPress={() => setMenuVisible(true)}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#888" />
        </TouchableOpacity>
      </View>

      {/* MENU */}

      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.overlay}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menu}>
            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="create-outline" size={18} color="#333" />
              <Text style={styles.menuText}>Edit Post</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color="red" />
              <Text style={[styles.menuText, { color: "red" }]}>
                Delete Post
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* CAPTION */}

      {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}

      {/* IMAGE */}

      {post.image && (
        <Image
          source={{ uri: post.image }}
          style={styles.image}
          resizeMode="cover"
        />
      )}

      {/* ACTIONS */}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.iconRow} onPress={likePostInFeed}>
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={24}
            color={liked ? "red" : "#333"}
          />
          <Text style={styles.count}>{likes}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconRow}
          onPress={() => router.push(`/comment?postId=${post.id}`)}
        >
          <Ionicons name="chatbubble-outline" size={24} color="#333" />
          <Text style={styles.count}>{post.comments.length}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },

  userInfo: {
    flex: 1,
  },

  username: {
    fontWeight: "600",
    fontSize: 14,
  },

  timestamp: {
    fontSize: 11,
    color: "#888",
  },

  caption: {
    paddingHorizontal: 10,
    paddingBottom: 8,
    fontSize: 13,
    color: "#333",
  },

  image: {
    width: "100%",
    height: 300,
    backgroundColor: "#eee",
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },

  count: {
    marginLeft: 6,
    fontSize: 12,
  },

  overlay: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 60,
    paddingRight: 20,
    backgroundColor: "rgba(0,0,0,0.2)",
  },

  menu: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 6,
    width: 150,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },

  menuText: {
    marginLeft: 10,
    fontSize: 14,
  },
});
