import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AppHeader from "../components/AppHeader";
import { useRouter } from "expo-router";
import { getPosts } from "../services/postApi";
import { useCommentPost } from "../hooks/useCommentPost";

interface Comment {
  id: number;
  content: string;
  user: { id: number; name: string; avatar?: string };
}

export default function CommentScreen() {
  const { postId } = useLocalSearchParams();
  const [commentList, setCommentList] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");

  const { createComment } = useCommentPost(Number(postId));

  const router = useRouter();

  const fetchComments = async () => {
    try {
      const posts = await getPosts(1, 50);
      const post = posts.find((p: any) => p.id === Number(postId));

      if (post) {
        setCommentList(post.comments || []);
      }
    } catch (err) {
      console.log("Fetch comments error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (postId) fetchComments();
  }, [postId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const handleSendComment = async () => {
    if (!content.trim()) return;

    const newComment = await createComment(content);

    if (newComment) {
      setCommentList((prev) => [
        ...prev,
        {
          id: newComment.id ?? Date.now(),
          content,
          user: {
            id: newComment.user?.id ?? 0,
            name: newComment.user?.name ?? "You",
            avatar: newComment.user?.avatar,
          },
        },
      ]);

      setContent("");
      fetchComments();
    }
  };

  return (
    <View style={styles.wrapper}>
      <AppHeader
        title="Comments"
        subtitle="Join the discussion"
        onBackPress={() => router.back()}
      />

      <FlatList
        data={commentList}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.container}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No comments yet</Text>
            <Text style={styles.emptySub}>Be the first to comment</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.commentCard}>
            <Image
              source={{
                uri: item.user?.avatar,
              }}
              style={styles.avatar}
            />

            <View style={styles.commentBubble}>
              <Text style={styles.username}>{item.user.name}</Text>
              <Text style={styles.text}>{item.content}</Text>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Write a comment..."
            value={content}
            onChangeText={setContent}
          />

          <TouchableOpacity style={styles.sendBtn} onPress={handleSendComment}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#f8f9fb" },
  container: { padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  commentCard: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
  },

  commentBubble: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  username: {
    fontWeight: "600",
    fontSize: 14,
    marginBottom: 4,
  },

  text: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },

  divider: {
    height: 12,
  },

  emptyBox: {
    alignItems: "center",
    marginTop: 40,
  },

  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#444",
  },

  emptySub: {
    fontSize: 13,
    color: "#888",
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
    marginBottom: 40,
  },

  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 10,
  },

  sendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F4B400",
    borderRadius: 20,
  },

  sendText: {
    color: "#fff",
    fontWeight: "600",
    backgroundColor: "F4B400",
  },
});
