import { Stack } from "expo-router";

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // Ẩn header mặc định của Stack vì bạn đã có Header tự chế
        animation: "slide_from_right", // Hiệu ứng chuyển trang
      }}
    >
      {/* Trang index sẽ là trang Profile chính */}
      <Stack.Screen name="index" />
      
      {/* Trang edit sẽ nằm chồng lên trên khi được gọi */}
      <Stack.Screen 
        name="edit" 
        options={{
          presentation: "card", // Hiển thị như một thẻ mới
        }} 
      />
    </Stack>
  );
}