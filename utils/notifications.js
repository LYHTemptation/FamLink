import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

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
export async function registerForPushNotificationsAsync(projectId) {
  let token;

  // 에뮬레이터 검사 (실제 실기기에서만 푸시 토큰 발급 가능)
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('푸시 알림 권한 거부됨');
      return null;
    }

    try {
      const pushTokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId || undefined,
      });
      token = pushTokenData.data;
      console.log('발급된 Expo Push Token:', token);
    } catch (e) {
      console.error('Push Token 발급 오류:', e);
    }
  } else {
    console.log('시뮬레이터/에뮬레이터에서는 푸시 알림 테스트가 제한됩니다. 실기기를 사용해주세요.');
  }

  // Android 전용 알림 채널 설정
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF7E82',
    });
  }

  return token;
}

/**
 * 3. Expo Push API로 직접 알림 발송 (테스트/자체 발송용)
 */
export async function sendExpoPushNotification(expoPushToken, title, body, data = {}) {
  if (!expoPushToken) return;

  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
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
