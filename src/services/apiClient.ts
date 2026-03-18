import { Platform } from "react-native";
import Constants from "expo-constants";
import type { ApiResponse } from "./types";
import {
  getStoredRefreshToken,
  setStoredRefreshToken,
  setStoredToken,
} from "./authStore";

const DEFAULT_PORT = 3002;
const DEFAULT_BASE_URL =
  Platform.OS === "android"
    ? `http://10.0.2.2:${DEFAULT_PORT}/api/v1`
    : `http://localhost:${DEFAULT_PORT}/api/v1`;

const resolveDevHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as unknown as { manifest?: { hostUri?: string } }).manifest?.hostUri;
  if (!hostUri) return null;
  const host = hostUri.split(":")[0];
  return host ? `http://${host}:${DEFAULT_PORT}/api/v1` : null;
};

const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const API_BASE_URL = envBaseUrl || resolveDevHost() || DEFAULT_BASE_URL;
const NORMALIZED_BASE_URL = API_BASE_URL.replace(/\/$/, "");

let authToken: string | null =
  process.env.EXPO_PUBLIC_API_TOKEN?.trim() || null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

export const getApiBaseUrl = () => NORMALIZED_BASE_URL;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const isApiError = (error: unknown): error is ApiError =>
  error instanceof ApiError;

export const getApiErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as any).message === "string"
  ) {
    return (error as any).message;
  }

  return "An unexpected error occurred";
};

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
  skipRefresh?: boolean;
};

const shouldSkipContentType = (body?: BodyInit | null) =>
  typeof FormData !== "undefined" && body instanceof FormData;

const buildHeaders = (options: RequestOptions) => {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!shouldSkipContentType(options.body)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  if (!options.skipAuth && authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  return headers;
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text().catch(() => "");
  let json: ApiResponse<T> | null = null;
  if (text) {
    try {
      json = JSON.parse(text) as ApiResponse<T>;
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    const message =
      json?.message || text || `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return (json?.data ?? json) as T;
};

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) return null;

  const url = `${NORMALIZED_BASE_URL}/mobile/auth/refresh-token`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await parseResponse<{ token: string }>(response);
  return data?.token || null;
};

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const isAbsolute = /^https?:\/\//i.test(path);
  const url = isAbsolute ? path : `${NORMALIZED_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: buildHeaders(options),
  });
  try {
    return await parseResponse<T>(response);
  } catch (err) {
    if (
      !options.skipAuth &&
      !options.skipRefresh &&
      err instanceof ApiError &&
      err.status === 401
    ) {
      const token = await refreshAccessToken();
      if (token) {
        setAuthToken(token);
        await setStoredToken(token);
        return request<T>(path, { ...options, skipRefresh: true });
      }
      setAuthToken(null);
      await setStoredToken(null);
      await setStoredRefreshToken(null);
    }
    throw err;
  }
}

export async function requestForm<T>(
  path: string,
  body: FormData,
  options: RequestOptions = {},
): Promise<T> {
  return request<T>(path, {
    ...options,
    method: options.method || "POST",
    body,
  });
}
