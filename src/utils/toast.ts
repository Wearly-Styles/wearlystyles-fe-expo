import Toast from "react-native-root-toast";

type ToastTone = "success" | "error" | "info";

const TOAST_CONFIG: Record<
  ToastTone,
  {
    backgroundColor: string;
    textColor: string;
  }
> = {
  success: {
    backgroundColor: "#2E7D32",
    textColor: "#ffffff",
  },
  error: {
    backgroundColor: "#C62828",
    textColor: "#ffffff",
  },
  info: {
    backgroundColor: "#212121",
    textColor: "#ffffff",
  },
};

type ToastOptions = {
  title?: string;
  duration?: number;
};

const buildToastMessage = (message: string, title?: string) =>
  title ? `${title}\n${message}` : message;

export const showToast = (
  tone: ToastTone,
  message: string,
  options: ToastOptions = {},
) => {
  const config = TOAST_CONFIG[tone];

  Toast.show(buildToastMessage(message, options.title), {
    duration: options.duration ?? 1500,
    position: Toast.positions.TOP,
    shadow: true,
    animation: true,
    hideOnPress: true,
    backgroundColor: config.backgroundColor,
    opacity: 0.92,
    textColor: config.textColor,
  });
};

export const showSuccessToast = (message: string, options?: ToastOptions) =>
  showToast("success", message, options);

export const showErrorToast = (message: string, options?: ToastOptions) =>
  showToast("error", message, options);

export const showInfoToast = (message: string, options?: ToastOptions) =>
  showToast("info", message, options);
