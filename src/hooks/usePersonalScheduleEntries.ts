import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  PersonalScheduleEntry,
  getPersonalScheduleEntries,
} from "../utils/personalSchedule";

export const usePersonalScheduleEntries = () => {
  const [entries, setEntries] = useState<PersonalScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const stored = await getPersonalScheduleEntries();
    setEntries(stored);
    setLoading(false);
    return stored;
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setLoading(true);

      const load = async () => {
        const stored = await getPersonalScheduleEntries();
        if (!isActive) return;
        setEntries(stored);
        setLoading(false);
      };

      load();
      return () => {
        isActive = false;
      };
    }, []),
  );

  return { entries, setEntries, loading, reload };
};
