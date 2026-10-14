import { Alert } from 'react-native';

export interface AppErrorLike {
  code?: string;
  message?: string;
}

/**
 * 전역 에러 핸들러
 */
export const showError = (
  error: AppErrorLike | Error | unknown,
  defaultMessage: string = '오류가 발생했습니다.'
): void => {
  if (__DEV__) {
    console.error('App Error:', error);
  }

  let title = '알림';
  let message = defaultMessage;

  if (error && typeof error === 'object') {
    const errObj = error as AppErrorLike;
    if (errObj.code === '23505') {
      message = '이미 존재하는 데이터입니다.';
    } else if (errObj.message && errObj.message.includes('Network')) {
      title = '네트워크 오류';
      message = '인터넷 연결을 확인해 주세요.';
    }
  }

  Alert.alert(title, message);
};
