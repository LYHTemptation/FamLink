import { Alert, Platform, AlertButton } from 'react-native';

/**
 * React Native Web 환경에서 비어있는 Alert.alert 스텁을
 * 브라우저 표준 window.alert / window.confirm으로 연결하는 폴리필
 */
export function setupWebAlertPolyfill(): void {
  if (Platform.OS !== 'web') return;

  Alert.alert = (
    title: string,
    message?: string,
    buttons?: AlertButton[]
  ): void => {
    const text = [title, message].filter(Boolean).join('\n\n');
    if (!buttons || buttons.length === 0) {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(text);
      }
      return;
    }
    if (buttons.length === 1) {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(text);
      }
      if (buttons[0].onPress) buttons[0].onPress();
      return;
    }

    const cancelBtn = buttons.find((b) => b.style === 'cancel');
    const confirmBtn =
      buttons.find((b) => b.style !== 'cancel') || buttons[buttons.length - 1];

    if (typeof window !== 'undefined' && window.confirm) {
      const confirmed = window.confirm(text);
      if (confirmed) {
        if (confirmBtn && confirmBtn.onPress) confirmBtn.onPress();
      } else {
        if (cancelBtn && cancelBtn.onPress) cancelBtn.onPress();
      }
    } else if (confirmBtn && confirmBtn.onPress) {
      confirmBtn.onPress();
    }
  };
}
