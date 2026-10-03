/**
 * 대한민국 법정 공휴일 및 대체공휴일 관리 유틸리티 (2024년 ~ 2030년 + 무기한 고정 공휴일 알고리즘)
 * - 관공서의 공휴일에 관한 규정(대통령령) 준수
 * - 양력 공휴일, 음력 명절(설날/추석 연휴), 부처님오신날, 대체공휴일 및 주요 임기만료 선거일 지원
 */

// 2024 ~ 2030년 정확한 법정 공휴일 및 대체공휴일 데이터셋
const KOREAN_HOLIDAYS_MAP = {
  // === 2024년 ===
  '2024-01-01': { name: '신정', isSubstitute: false },
  '2024-02-09': { name: '설날 연휴', isSubstitute: false },
  '2024-02-10': { name: '설날', isSubstitute: false },
  '2024-02-11': { name: '설날 연휴', isSubstitute: false },
  '2024-02-12': { name: '대체공휴일', isSubstitute: true },
  '2024-03-01': { name: '삼일절', isSubstitute: false },
  '2024-04-10': { name: '제22대 국회의원 선거', isSubstitute: false },
  '2024-05-05': { name: '어린이날', isSubstitute: false },
  '2024-05-06': { name: '대체공휴일', isSubstitute: true },
  '2024-05-15': { name: '부처님오신날', isSubstitute: false },
  '2024-06-06': { name: '현충일', isSubstitute: false },
  '2024-08-15': { name: '광복절', isSubstitute: false },
  '2024-09-16': { name: '추석 연휴', isSubstitute: false },
  '2024-09-17': { name: '추석', isSubstitute: false },
  '2024-09-18': { name: '추석 연휴', isSubstitute: false },
  '2024-10-01': { name: '국군의 날(임시)', isSubstitute: false },
  '2024-10-03': { name: '개천절', isSubstitute: false },
  '2024-10-09': { name: '한글날', isSubstitute: false },
  '2024-12-25': { name: '크리스마스', isSubstitute: false },

  // === 2025년 ===
  '2025-01-01': { name: '신정', isSubstitute: false },
  '2025-01-28': { name: '설날 연휴', isSubstitute: false },
  '2025-01-29': { name: '설날', isSubstitute: false },
  '2025-01-30': { name: '설날 연휴', isSubstitute: false },
  '2025-03-01': { name: '삼일절', isSubstitute: false },
  '2025-03-03': { name: '대체공휴일', isSubstitute: true },
  '2025-05-05': { name: '어린이날', isSubstitute: false },
  '2025-05-06': { name: '대체공휴일(부처님오신날)', isSubstitute: true },
  '2025-06-06': { name: '현충일', isSubstitute: false },
  '2025-08-15': { name: '광복절', isSubstitute: false },
  '2025-10-03': { name: '개천절', isSubstitute: false },
  '2025-10-05': { name: '추석 연휴', isSubstitute: false },
  '2025-10-06': { name: '추석', isSubstitute: false },
  '2025-10-07': { name: '추석 연휴', isSubstitute: false },
  '2025-10-08': { name: '대체공휴일', isSubstitute: true },
  '2025-10-09': { name: '한글날', isSubstitute: false },
  '2025-12-25': { name: '크리스마스', isSubstitute: false },

  // === 2026년 ===
  '2026-01-01': { name: '신정', isSubstitute: false },
  '2026-02-16': { name: '설날 연휴', isSubstitute: false },
  '2026-02-17': { name: '설날', isSubstitute: false },
  '2026-02-18': { name: '설날 연휴', isSubstitute: false },
  '2026-03-01': { name: '삼일절', isSubstitute: false },
  '2026-03-02': { name: '대체공휴일', isSubstitute: true },
  '2026-05-05': { name: '어린이날', isSubstitute: false },
  '2026-05-24': { name: '부처님오신날', isSubstitute: false },
  '2026-05-25': { name: '대체공휴일', isSubstitute: true },
  '2026-06-03': { name: '제9회 지방선거', isSubstitute: false },
  '2026-06-06': { name: '현충일', isSubstitute: false },
  '2026-08-15': { name: '광복절', isSubstitute: false },
  '2026-08-17': { name: '대체공휴일', isSubstitute: true },
  '2026-09-24': { name: '추석 연휴', isSubstitute: false },
  '2026-09-25': { name: '추석', isSubstitute: false },
  '2026-09-26': { name: '추석 연휴', isSubstitute: false },
  '2026-09-28': { name: '대체공휴일', isSubstitute: true },
  '2026-10-03': { name: '개천절', isSubstitute: false },
  '2026-10-05': { name: '대체공휴일', isSubstitute: true },
  '2026-10-09': { name: '한글날', isSubstitute: false },
  '2026-12-25': { name: '크리스마스', isSubstitute: false },

  // === 2027년 ===
  '2027-01-01': { name: '신정', isSubstitute: false },
  '2027-02-05': { name: '설날 연휴', isSubstitute: false },
  '2027-02-06': { name: '설날', isSubstitute: false },
  '2027-02-07': { name: '설날 연휴', isSubstitute: false },
  '2027-02-08': { name: '대체공휴일', isSubstitute: true },
  '2027-03-01': { name: '삼일절', isSubstitute: false },
  '2027-03-03': { name: '제21대 대통령 선거', isSubstitute: false },
  '2027-05-05': { name: '어린이날', isSubstitute: false },
  '2027-05-13': { name: '부처님오신날', isSubstitute: false },
  '2027-06-06': { name: '현충일', isSubstitute: false },
  '2027-08-15': { name: '광복절', isSubstitute: false },
  '2027-08-16': { name: '대체공휴일', isSubstitute: true },
  '2027-09-14': { name: '추석 연휴', isSubstitute: false },
  '2027-09-15': { name: '추석', isSubstitute: false },
  '2027-09-16': { name: '추석 연휴', isSubstitute: false },
  '2027-10-03': { name: '개천절', isSubstitute: false },
  '2027-10-04': { name: '대체공휴일', isSubstitute: true },
  '2027-10-09': { name: '한글날', isSubstitute: false },
  '2027-10-11': { name: '대체공휴일', isSubstitute: true },
  '2027-12-25': { name: '크리스마스', isSubstitute: false },
  '2027-12-27': { name: '대체공휴일', isSubstitute: true },

  // === 2028년 ===
  '2028-01-01': { name: '신정', isSubstitute: false },
  '2028-01-26': { name: '설날 연휴', isSubstitute: false },
  '2028-01-27': { name: '설날', isSubstitute: false },
  '2028-01-28': { name: '설날 연휴', isSubstitute: false },
  '2028-03-01': { name: '삼일절', isSubstitute: false },
  '2028-04-12': { name: '제23대 국회의원 선거', isSubstitute: false },
  '2028-05-02': { name: '부처님오신날', isSubstitute: false },
  '2028-05-05': { name: '어린이날', isSubstitute: false },
  '2028-06-06': { name: '현충일', isSubstitute: false },
  '2028-08-15': { name: '광복절', isSubstitute: false },
  '2028-10-02': { name: '추석 연휴', isSubstitute: false },
  '2028-10-03': { name: '추석·개천절', isSubstitute: false },
  '2028-10-04': { name: '추석 연휴', isSubstitute: false },
  '2028-10-05': { name: '대체공휴일', isSubstitute: true },
  '2028-10-09': { name: '한글날', isSubstitute: false },
  '2028-12-25': { name: '크리스마스', isSubstitute: false },

  // === 2029년 ===
  '2029-01-01': { name: '신정', isSubstitute: false },
  '2029-02-12': { name: '설날 연휴', isSubstitute: false },
  '2029-02-13': { name: '설날', isSubstitute: false },
  '2029-02-14': { name: '설날 연휴', isSubstitute: false },
  '2029-03-01': { name: '삼일절', isSubstitute: false },
  '2029-05-05': { name: '어린이날', isSubstitute: false },
  '2029-05-07': { name: '대체공휴일', isSubstitute: true },
  '2029-05-20': { name: '부처님오신날', isSubstitute: false },
  '2029-05-21': { name: '대체공휴일', isSubstitute: true },
  '2029-06-06': { name: '현충일', isSubstitute: false },
  '2029-08-15': { name: '광복절', isSubstitute: false },
  '2029-09-21': { name: '추석 연휴', isSubstitute: false },
  '2029-09-22': { name: '추석', isSubstitute: false },
  '2029-09-23': { name: '추석 연휴', isSubstitute: false },
  '2029-09-24': { name: '대체공휴일', isSubstitute: true },
  '2029-10-03': { name: '개천절', isSubstitute: false },
  '2029-10-09': { name: '한글날', isSubstitute: false },
  '2029-12-25': { name: '크리스마스', isSubstitute: false },

  // === 2030년 ===
  '2030-01-01': { name: '신정', isSubstitute: false },
  '2030-02-02': { name: '설날 연휴', isSubstitute: false },
  '2030-02-03': { name: '설날', isSubstitute: false },
  '2030-02-04': { name: '설날 연휴', isSubstitute: false },
  '2030-02-05': { name: '대체공휴일', isSubstitute: true },
  '2030-03-01': { name: '삼일절', isSubstitute: false },
  '2030-05-05': { name: '어린이날', isSubstitute: false },
  '2030-05-06': { name: '대체공휴일', isSubstitute: true },
  '2030-05-09': { name: '부처님오신날', isSubstitute: false },
  '2030-06-06': { name: '현충일', isSubstitute: false },
  '2030-08-15': { name: '광복절', isSubstitute: false },
  '2030-09-11': { name: '추석 연휴', isSubstitute: false },
  '2030-09-12': { name: '추석', isSubstitute: false },
  '2030-09-13': { name: '추석 연휴', isSubstitute: false },
  '2030-10-03': { name: '개천절', isSubstitute: false },
  '2030-10-09': { name: '한글날', isSubstitute: false },
  '2030-12-25': { name: '크리스마스', isSubstitute: false },
};

// 양력 고정 공휴일 (데이터셋 범위 밖 연도 폴백용)
const SOLAR_FIXED_HOLIDAYS = {
  '01-01': '신정',
  '03-01': '삼일절',
  '05-05': '어린이날',
  '06-06': '현충일',
  '08-15': '광복절',
  '10-03': '개천절',
  '10-09': '한글날',
  '12-25': '크리스마스',
};

/**
 * 특정 날짜("YYYY-MM-DD")의 공휴일 정보 반환
 * @param {string} dateStr 
 * @returns {{ name: string, isHoliday: boolean, isSubstitute: boolean } | null}
 */
export function getKoreanHoliday(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;

  // 1. 사전 정의된 2024~2030 매핑 검색
  if (KOREAN_HOLIDAYS_MAP[dateStr]) {
    const item = KOREAN_HOLIDAYS_MAP[dateStr];
    return {
      name: item.name,
      isHoliday: true,
      isSubstitute: Boolean(item.isSubstitute),
    };
  }

  // 2. 데이터셋 외 연도에 대한 양력 고정 공휴일 폴백
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const mmdd = `${parts[1]}-${parts[2]}`;
    if (SOLAR_FIXED_HOLIDAYS[mmdd]) {
      return {
        name: SOLAR_FIXED_HOLIDAYS[mmdd],
        isHoliday: true,
        isSubstitute: false,
      };
    }
  }

  return null;
}

/**
 * 특정 날짜가 법정 공휴일 또는 대체공휴일인지 여부
 * @param {string} dateStr 
 * @returns {boolean}
 */
export function isKoreanHoliday(dateStr) {
  return Boolean(getKoreanHoliday(dateStr));
}

/**
 * 특정 연·월에 해당하는 모든 공휴일 목록 반환
 * @param {number} year 
 * @param {number} month (1~12)
 * @returns {Array<{ date: string, name: string, isSubstitute: boolean }>}
 */
export function getMonthKoreanHolidays(year, month) {
  const mStr = String(month).padStart(2, '0');
  const prefix = `${year}-${mStr}`;
  const results = [];

  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${prefix}-${String(d).padStart(2, '0')}`;
    const h = getKoreanHoliday(dateStr);
    if (h) {
      results.push({
        date: dateStr,
        name: h.name,
        isSubstitute: h.isSubstitute,
      });
    }
  }

  return results;
}

/**
 * 기준일로부터 가장 가까운 다음 공휴일 정보 및 D-Day 계산
 * @param {string} fromDateStr ("YYYY-MM-DD")
 * @returns {{ date: string, name: string, diffDays: number, isToday: boolean } | null}
 */
export function getNextUpcomingHoliday(fromDateStr) {
  if (!fromDateStr) return null;
  const fromTime = new Date(`${fromDateStr}T00:00:00`).getTime();

  const allDates = Object.keys(KOREAN_HOLIDAYS_MAP).sort();
  for (const dateStr of allDates) {
    const targetTime = new Date(`${dateStr}T00:00:00`).getTime();
    const diffDays = Math.round((targetTime - fromTime) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0) {
      const h = KOREAN_HOLIDAYS_MAP[dateStr];
      return {
        date: dateStr,
        name: h.name,
        diffDays,
        isToday: diffDays === 0,
      };
    }
  }
  return null;
}
