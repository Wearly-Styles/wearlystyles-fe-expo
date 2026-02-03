import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
} from "react-native";
import { useCategories } from "../hooks/useCategories";
import { useCreateCategory } from "../hooks/useCreateCategory";
import { useTags } from "@/hooks/useTags";
import { useCreateTag } from "@/hooks/useCreateTag";

/* ===================== PILL ===================== */
const Pill = ({ label, active, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}
  >
    <Text style={[styles.pillText, active && styles.pillTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

/* ===================== ADD INPUT PILL ===================== */
const AddPillInput = ({ onSubmit, onCancel }) => {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    if (!value.trim()) return;
    onSubmit(value.trim());
    setValue("");
  };

  return (
    <View style={[styles.pill, styles.inputPill]}>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder="Add"
        autoFocus
        onBlur={onCancel}
        onSubmitEditing={handleSubmit}
        style={styles.input}
      />
    </View>
  );
};

/* ===================== SECTION ===================== */
const Section = ({ title, data, selectedIds, onToggle, onAdd }) => {
  const [adding, setAdding] = useState(false);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>

      <View style={styles.pillContainer}>
        {data.map((item) => (
          <Pill
            key={item.id}
            label={item.name}
            active={selectedIds.includes(item.id)}
            onPress={() => onToggle(item.id)}
          />
        ))}

        {/* ADD INPUT OR PLUS */}
        {adding ? (
          <AddPillInput
            onSubmit={(name) => {
              onAdd(name);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        ) : (
          <TouchableOpacity
            style={[styles.pill, styles.addPill]}
            onPress={() => setAdding(true)}
          >
            <Text style={styles.plus}>＋</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

/* ===================== MAIN ===================== */
export default function ClosetDrawerContent() {
  const { data, isLoading, isError } = useCategories();
  const { mutate: createCategoryMutation, isPending: isCategoryPending } = useCreateCategory();
  const { mutate: createTagMutation, isPending: isTagPending } = useCreateTag();  

  const {
    data: tagData,
    isLoading: isTagLoading,
    isError: isTagError,
  } = useTags();

  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);

  const toggle = (id: number, isTag = false) => {
    if (isTag) {
      setSelectedTags((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    } else {
      setSelectedCategories((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    }
  };

  const categories =
    data?.map((i) => ({ id: i.id, name: i.name })) || [];
  const tags =
    tagData?.map((i) => ({ id: i.id, name: i.name })) || [];

  return (
    <View style={styles.container}>
      <Text style={{ fontSize: 10, color: "#666" }}>
  BASE: {process.env.EXPO_PUBLIC_API_BASE_URL}
</Text>
<Text style={{ fontSize: 10, color: "#666" }}>
  USER ID: {process.env.EXPO_PUBLIC_DEV_USER_ID}
</Text>

      <Text style={styles.title}>Categories & Tags</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {!isLoading && !isError && (
          <Section
            title="Categories"
            data={categories}
            selectedIds={selectedCategories}
            onToggle={toggle}
            onAdd={(name) => {
  if (isCategoryPending) return;

  createCategoryMutation(name, {
    onError: (err) => {
      console.log("Create category failed:", err);
    },
  });
}}

          />
        )}

        {!isTagLoading && !isTagError && (
          <Section
            title="Tags"
            data={tags}
            selectedIds={selectedTags}
            onToggle={(id) => toggle(id, true)}
            onAdd={(name) => {
  if (isTagPending) return;

  createTagMutation(name, {
    onError: (err) => {
      console.log("Create tag failed:", err);
    },
  });
}}
          />
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.applyButton}
        onPress={() =>
          console.log(selectedCategories, selectedTags)
        }
      >
        <Text style={styles.applyText}>Apply Filters</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E5E5E5",
    padding: 16,
    marginTop: 40,
  },

  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },

  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },

  pillContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#FFF3CD",
    justifyContent: "center",
  },

  pillActive: {
    backgroundColor: "#FFC107",
  },

  pillText: {
    fontSize: 12,
  },

  pillTextActive: {
    fontWeight: "600",
  },

  addPill: {
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#FFC107",
    backgroundColor: "transparent",
  },

  plus: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFC107",
  },

  inputPill: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#FFC107",
    paddingHorizontal: 10,
  },

  input: {
    fontSize: 12,
    minWidth: 50,
    padding: 0,
  },

  applyButton: {
    backgroundColor: "#FFC107",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 70,
  },

  applyText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
