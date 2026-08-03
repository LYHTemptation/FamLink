import { Alert } from 'react-native';

/**
 * 전역 에러 핸들러
 * @param {Error} error - 발생한 에러 객체
 * @param {string} defaultMessage - 표시할 기본 알림 메시지
 */
export const showError = (error, defaultMessage = '오류가 발생했습니다.') => {
  // 개발 환경에서는 콘솔에 에러 출력 (디버깅 용도)
  if (__DEV__) {
    console.error('App Error:', error);
  }

  let title = '알림';
  let message = defaultMessage;

  // Supabase 등에서 발생하는 특별한 에러 코드를 확인하여 메시지 분기 처리 가능
  if (error) {
    if (error.code === '23505') {
      message = '이미 존재하는 데이터입니다.';
    } else if (error.message && error.message.includes('Network')) {
      title = '네트워크 오류';
      message = '인터넷 연결을 확인해 주세요.';
    }
    // 향후 추가적인 에러 코드(인증 실패 등)에 대한 처리 가능
  }

  Alert.alert(title, message);
};
