import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { colors } from '../theme';

// 1. 앱 포그라운드(켜져 있을 때) 알림 수신 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * 2. 기기 푸시 토큰 요청 및 발급
 */
export async function registerForPushNotificationsAsync(
  projectId?: string
): Promise<string | null | undefined> {
  let token: string | undefined;

  if (Platform.OS === 'web') {
    return null;
  }

  const isExpoGo =
    Constants?.appOwnership === 'expo' ||
    Constants?.executionEnvironment === 'storeClient';
  if (Platform.OS === 'android' && isExpoGo) {
    console.log(
      'ℹ️ Expo Go 환경에서는 원격 푸시 알림이 지원되지 않습니다. (개발 빌드 eas build 권장)'
    );
    return null;
  }

  if (Device.isDevice) {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return null;
      }

      const resolvedProjectId =
        projectId ||
        Constants?.expoConfig?.extra?.eas?.projectId ||
        Constants?.easConfig?.projectId;

      if (!resolvedProjectId) {
        return null;
      }

      const pushTokenData = await Notifications.getExpoPushTokenAsync({
        projectId: resolvedProjectId,
      });
      token = pushTokenData.data;
      console.log('발급된 Expo Push Token:', token);
    } catch (e: any) {
      console.warn('Push Token 발급 안내:', e?.message || e);
    }
  } else {
    console.log(
      '시뮬레이터/에뮬레이터에서는 푸시 알림 테스트가 제한됩니다. 실기기를 사용해주세요.'
    );
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: colors.primary,
    });
  }

  return token;
}

/**
 * 3. Expo Push API로 직접 알림 발송 (테스트/자체 발송용)
 */
export async function sendExpoPushNotification(
  expoPushToken: string | null | undefined,
  title: string,
  body: string,
  data: Record<string, unknown> = {}
): Promise<void> {
  if (!expoPushToken) return;

  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data,
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}
