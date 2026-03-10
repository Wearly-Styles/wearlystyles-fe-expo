import axios from "axios";
import { request } from "./apiClient";
import { setStoredToken, setStoredRefreshToken } from "./authStore";

export const requestForgotPassword = async (email: string) => {
  // Gửi email lên để BE tạo OTP và gửi mail
  return request("/mobile/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
    skipAuth: true,
  });
};

export const resetPasswordApi = async (data: { token: string; newPassword: string }) => {
  // data.token ở đây chính là mã OTP 6 số đã nối lại từ FE
  const result = await request("/mobile/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({
      token: data.token,
      newPassword: data.newPassword,
    }),
    skipAuth: true,
  });

  // Sau khi reset thành công, xóa token cũ để bắt đăng nhập lại
  await setStoredToken(null);
  await setStoredRefreshToken(null);

  return result;
};
