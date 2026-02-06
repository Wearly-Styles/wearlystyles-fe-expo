//D:\wearlystyles-fe-expo\WearlyStyles\app\_layout.tsx
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
<<<<<<< HEAD
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
=======
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="register" />
      <Stack.Screen name="(tabs)" /> 
    </Stack>
>>>>>>> 4245dbbb68e962c0facd5cc01f24e242daa6c805
  );
}