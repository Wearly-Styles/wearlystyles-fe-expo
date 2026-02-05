import { useLocalSearchParams } from "expo-router";
import OutfitDetailScreen from "../../src/screens/OutfitDetailScreen";

export default function OutfitDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <OutfitDetailScreen outfitId={id ?? "1"} />;
}
