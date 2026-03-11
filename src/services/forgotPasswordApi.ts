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

export const verifyOtpApi = async (data: { email: string; otp: string }) => {
  return request("/mobile/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({
      email: data.email,
      otp: data.otp,
    }),
    skipAuth: true,
  });
};

export const resetPasswordApi = async (data: { email: string; newPassword: string }) => {

  const result = await request("/mobile/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({
      email: data.email,
      newPassword: data.newPassword,
    }),
    skipAuth: true,
  });

  await setStoredToken(null);
  await setStoredRefreshToken(null);

  return result;
};
