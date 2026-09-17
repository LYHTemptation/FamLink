import { registerRootComponent } from 'expo';
import { Platform, Alert } from 'react-native';

// Web Polyfill for Alert.alert (react-native-web has empty stub alert() {})
if (Platform.OS === 'web') {
  Alert.alert = (title, message, buttons) => {
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
    const cancelBtn = buttons.find(b => b.style === 'cancel');
    const confirmBtn = buttons.find(b => b.style !== 'cancel') || buttons[buttons.length - 1];

    if (typeof window !== 'undefined' && window.confirm) {
      const confirmed = window.confirm(text);
      if (confirmed) {
        if (confirmBtn && confirmBtn.onPress) confirmBtn.onPress();
      } else {
        if (cancelBtn && cancelBtn.onPress) cancelBtn.onPress();
      }
    } else {
      if (confirmBtn && confirmBtn.onPress) confirmBtn.onPress();
    }
  };
}

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

