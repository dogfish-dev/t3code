import { requestRecordingPermissionsAsync } from "expo-audio";
import { AppState, Platform } from "react-native";

export function createVoiceRecordingPermission(handlers: {
  readonly onBackground: () => void;
  readonly onActive: () => void;
}) {
  let requesting = false;
  let disposed = false;
  let resume: (() => void) | null = null;
  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "active") resume?.();
    if (requesting) return;
    if (state === "active") handlers.onActive();
    if (state === "background") handlers.onBackground();
  });
  return {
    requestPermission: async () => {
      if (Platform.OS !== "android") return requestRecordingPermissionsAsync();
      // Android's permission activity backgrounds the app; resume before preparing Google's model.
      requesting = true;
      try {
        const permission = await requestRecordingPermissionsAsync();
        if (!disposed && AppState.currentState !== "active") {
          await new Promise<void>((resolve) => {
            resume = resolve;
          });
        }
        return permission;
      } finally {
        requesting = false;
        resume = null;
      }
    },
    dispose: () => {
      disposed = true;
      subscription.remove();
      resume?.();
    },
  };
}
