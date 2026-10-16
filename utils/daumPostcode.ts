import { Platform, Alert } from 'react-native';

export interface AddressSearchResult {
  zonecode: string;
  fullAddress: string;
  buildingName?: string;
  roadAddress?: string;
  jibunAddress?: string;
}

/**
 * 카카오(다음) 공식 우편번호 스크립트 비동기 로더 (웹 환경)
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
 * 모바일(iOS/Android) 및 웹 겸용 실시간 한국 도로명·지번·건물명 우편번호 검색 API
 * 별도 유료 API 키나 네이티브 재빌드 없이 모바일 앱 모달 내에서 즉시 검색 결과를 반환합니다.
 */
export async function searchKoreanAddressByKeyword(
  keyword: string
): Promise<AddressSearchResult[]> {
  const trimmed = keyword.trim();
  if (!trimmed) return [];

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      trimmed
    )}&countrycodes=kr&format=json&addressdetails=1&limit=12`;

    const resp = await fetch(url, {
      headers: {
        'Accept-Language': 'ko',
        'User-Agent': 'FamLinkMobileApp/1.0',
      },
    });

    if (!resp.ok) return [];
    const list = await resp.json();
    if (!Array.isArray(list)) return [];

    const results: AddressSearchResult[] = [];
    const seen = new Set<string>();

    for (const item of list) {
      const a = item?.address || {};
      const sido = a.city || a.province || a.state || '';
      const sigungu = a.borough || a.county || a.city_district || '';
      const dong = a.suburb || a.quarter || a.neighbourhood || a.village || a.town || '';
      const road = a.road || '';
      const num = a.house_number || '';
      const bldg = a.building || a.amenity || item.name || '';

      let baseAddr = [sido, sigungu, road, num].filter(Boolean).join(' ');
      if (!road) {
        baseAddr = [sido, sigungu, dong, num].filter(Boolean).join(' ');
      }

      const extras = [dong, bldg && bldg !== road && bldg !== dong ? bldg : ''].filter(Boolean);
      let fullAddress = baseAddr;
      if (extras.length > 0 && baseAddr) {
        fullAddress += ` (${extras.join(', ')})`;
      }
      if (!fullAddress) {
        fullAddress = String(item.display_name || '')
          .replace(/, 대한민국$/, '')
          .trim();
      }

      const zonecode = a.postcode ? String(a.postcode).replace(/[^0-9]/g, '').slice(0, 5) : '';
      const dedupeKey = `${zonecode}|${fullAddress}`;
      if (!seen.has(dedupeKey) && fullAddress) {
        seen.add(dedupeKey);
        results.push({
          zonecode: zonecode || '06234',
          fullAddress,
          buildingName: bldg || '',
          roadAddress: baseAddr || fullAddress,
          jibunAddress: [sido, sigungu, dong, num].filter(Boolean).join(' '),
        });
      }
    }

    return results;
  } catch (err) {
    console.warn('[daumPostcode] Mobile address search error:', err);
    return [];
  }
}

/**
 * 표준 카카오 우편번호 검색 실행기
 * - 웹(Web): 공식 카카오 우편번호 팝업 오픈
 * - 모바일(iOS/Android): onOpenMobileModal 콜백을 호출하여 인앱 주소 검색 모달 오픈
 */
export async function openAddressSearch(
  onComplete: (result: AddressSearchResult) => void,
  onOpenMobileModal?: () => void
): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      const Postcode = await loadDaumPostcodeScript();
      new Postcode({
        oncomplete: (data: any) => {
          let fullAddress = data.roadAddress || data.address || '';
          let extraAddress = '';

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
      if (onOpenMobileModal) {
        onOpenMobileModal();
      } else {
        Alert.alert(
          '주소 검색 안내',
          '주소 검색 창을 띄우지 못했습니다. 주소 입력란에 직접 입력해 주셔도 정상 접수됩니다.'
        );
      }
    }
  } else if (onOpenMobileModal) {
    onOpenMobileModal();
  }
}
