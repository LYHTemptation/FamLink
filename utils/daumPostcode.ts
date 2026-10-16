import { Platform, Alert } from 'react-native';

export interface AddressSearchResult {
  zonecode: string;
  fullAddress: string;
  buildingName?: string;
  roadAddress?: string;
  jibunAddress?: string;
}

/**
 * 카카오(다음) 공식 우편번호 스크립트 비동기 로더
 * 완전 무료, API 키 발급 불필요, 행정안전부 최신 도로명주소 실시간 연동
 */
export function loadDaumPostcodeScript(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return reject(new Error('Daum Postcode script requires a browser environment.'));
    }

    if ((window as any).daum?.Postcode) {
      return resolve((window as any).daum.Postcode);
    }

    const existingScript = document.getElementById('daum-postcode-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve((window as any).daum.Postcode));
      return;
    }

    const script = document.createElement('script');
    script.id = 'daum-postcode-script';
    script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    script.onload = () => {
      if ((window as any).daum?.Postcode) {
        resolve((window as any).daum.Postcode);
      } else {
        reject(new Error('Daum Postcode object not found after script load'));
      }
    };
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}

/**
 * 표준 카카오 우편번호 검색 팝업 실행기
 */
export async function openAddressSearch(
  onComplete: (result: AddressSearchResult) => void
): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      const Postcode = await loadDaumPostcodeScript();
      new Postcode({
        oncomplete: (data: any) => {
          let fullAddress = data.roadAddress || data.address || '';
          let extraAddress = '';

          // 법정동 및 아파트/건물명 보정 가이드
          if (data.bname !== '' && /[동|로|가]$/g.test(data.bname)) {
            extraAddress += data.bname;
          }
          if (data.buildingName !== '') {
            extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
          }
          if (extraAddress !== '') {
            fullAddress += ` (${extraAddress})`;
          }

          onComplete({
            zonecode: data.zonecode || '',
            fullAddress,
            buildingName: data.buildingName || '',
            roadAddress: data.roadAddress || '',
            jibunAddress: data.jibunAddress || '',
          });
        },
      }).open();
    } catch (err) {
      console.warn('카카오 우편번호 검색기 로드 실패:', err);
      Alert.alert(
        '주소 검색 안내',
        '주소 검색 창을 띄우지 못했습니다. 주소 입력란에 직접 입력해 주셔도 정상 접수됩니다.'
      );
    }
  } else {
    Alert.alert(
      '주소 입력 안내',
      '현재 모바일 앱 환경에서는 주소 입력창에 도로명 또는 지번 주소를 직접 입력해 주시면 안전하게 배송됩니다.'
    );
  }
}
