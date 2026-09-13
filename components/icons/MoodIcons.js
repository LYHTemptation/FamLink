import React from 'react';
import { Text } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

/**
 * 1. 행복/미소 (MoodHappyIcon)
 */
export function MoodHappyIcon({ size = 20, color = '#F39C12', strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth={strokeWidth} fill={color + '18'} />
      {/* 초승달 눈 2개 */}
      <Path d="M8 9.5C8.5 8.5 9.5 8.5 10 9.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M14 9.5C14.5 8.5 15.5 8.5 16 9.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* 부드러운 미소 입 */}
      <Path d="M8.5 14C9.5 16 14.5 16 15.5 14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* 볼터치 홍조 */}
      <Circle cx="6.5" cy="12.5" r="1.2" fill={color} opacity={0.6} />
      <Circle cx="17.5" cy="12.5" r="1.2" fill={color} opacity={0.6} />
    </Svg>
  );
}

/**
 * 2. 신남/환호 (MoodExcitedIcon)
 */
export function MoodExcitedIcon({ size = 20, color = '#FF7E82', strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth={strokeWidth} fill={color + '18'} />
      {/* 활짝 웃는 눈 (^ ^) */}
      <Path d="M7.5 10L9 8.5L10.5 10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.5 10L15 8.5L16.5 10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      {/* 크게 벌린 웃는 입 */}
      <Path d="M8 13.5H16C16 16.5 14.2 18 12 18C9.8 18 8 16.5 8 13.5Z" stroke={color} strokeWidth={strokeWidth} fill={color} strokeLinejoin="round" />
      {/* 하얀 이 라인 */}
      <Path d="M9.5 13.5H14.5" stroke="#FFFFFF" strokeWidth={strokeWidth * 0.7} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * 3. 졸림/피곤 (MoodSleepyIcon)
 */
export function MoodSleepyIcon({ size = 20, color = '#4A90E2', strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle cx="11" cy="13" r="8.5" stroke={color} strokeWidth={strokeWidth} fill={color + '15'} />
      {/* 감은 눈 (- -) */}
      <Path d="M7.5 12H10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M12.5 12H15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* 살짝 벌린 작은 입 */}
      <Circle cx="11.2" cy="16" r="1.3" stroke={color} strokeWidth={strokeWidth * 0.8} />
      {/* 우측 상단 둥둥 떠가는 Zzz */}
      <Path d="M17 3H20L17 6.5H20" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14.5 5.5H16.5L14.5 8H16.5" stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * 4. 공부/열중 (MoodStudyIcon)
 */
export function MoodStudyIcon({ size = 20, color = '#2ECC71', strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      {/* 연필 본체 */}
      <Path d="M18.5 2.5L21.5 5.5L8.5 18.5L4 20L5.5 15.5L18.5 2.5Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill={color + '15'} />
      {/* 연필 팁 흑연 */}
      <Path d="M4 20L6 18L5 17L4 20Z" fill={color} />
      <Path d="M15.5 5.5L18.5 8.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* 사선 노트 밑줄 */}
      <Path d="M3 22H14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * 5. 쇼핑/외출 (MoodShoppingIcon)
 */
export function MoodShoppingIcon({ size = 20, color = '#9B59B6', strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      {/* 쇼핑백 몸통 */}
      <Path d="M5 8.5H19L20.5 21H3.5L5 8.5Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill={color + '15'} />
      {/* 둥근 핸들 손잡이 */}
      <Path d="M8.5 11V6C8.5 4.3 9.8 3 11.5 3H12.5C14.2 3 15.5 4.3 15.5 6V11" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      {/* 쇼핑백 중앙 미니 하트 */}
      <Path d="M12 16.5C12 16.5 9.5 14.5 9.5 13.2C9.5 12.3 10.2 11.8 11 11.8C11.5 11.8 11.8 12.1 12 12.3C12.2 12.1 12.5 11.8 13 11.8C13.8 11.8 14.5 12.3 14.5 13.2C14.5 14.5 12 16.5 12 16.5Z" fill={color} />
    </Svg>
  );
}

/**
 * 6. 식사/냠냠 (MoodMealIcon)
 */
export function MoodMealIcon({ size = 20, color = '#E67E22', strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      {/* 둥근 닭다리/음식 쉐입 */}
      <Path d="M14.5 3C17.5 3 20 5.5 20 8.5C20 12 16 15 13 15.5L9.5 12C10 9 11.5 3 14.5 3Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill={color + '18'} />
      {/* 뼈다귀 손잡이 */}
      <Path d="M9.5 12L5.5 16" stroke={color} strokeWidth={strokeWidth + 0.5} strokeLinecap="round" />
      <Circle cx="4" cy="18" r="1.6" stroke={color} strokeWidth={strokeWidth * 0.8} />
      <Circle cx="6.5" cy="19.5" r="1.6" stroke={color} strokeWidth={strokeWidth * 0.8} />
      {/* 모락모락 김 2줄 */}
      <Path d="M15 1C15 2 16 2.5 16 3.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M18.5 1C18.5 2 19.5 2.5 19.5 3.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * 7. 운동/파이팅 (MoodExerciseIcon)
 */
export function MoodExerciseIcon({ size = 20, color = '#E74C3C', strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      {/* 덤벨 아령 */}
      <Rect x="4" y="6" width="3.5" height="12" rx="1.5" stroke={color} strokeWidth={strokeWidth} fill={color + '20'} />
      <Rect x="16.5" y="6" width="3.5" height="12" rx="1.5" stroke={color} strokeWidth={strokeWidth} fill={color + '20'} />
      <Path d="M7.5 12H16.5" stroke={color} strokeWidth={strokeWidth + 1} strokeLinecap="round" />
      {/* 파워 스파크 에너지 */}
      <Path d="M12 4L10.5 8.5H13.5L12 13" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * 8. 사랑/감사 (MoodLoveIcon)
 */
export function MoodLoveIcon({ size = 20, color = '#FF7E82', strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={color + '20'}
      />
      {/* 작은 볼륨 빛 반사 */}
      <Path d="M6 7.5C6.5 6.5 7.5 6 8.5 6" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * 9. 집콕/휴식 (MoodHomeIcon)
 */
export function MoodHomeIcon({ size = 20, color = '#1ABC9C', strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      {/* 굴뚝과 몽실몽실 연기 */}
      <Path d="M17 8V4.5H19V10" stroke={color} strokeWidth={strokeWidth * 0.9} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M18 2C18 2.5 18.5 2.8 18.5 3.5" stroke={color} strokeWidth={1.3} strokeLinecap="round" />
      {/* 삼각 지붕 */}
      <Path d="M3 11L12 3.5L21 11" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      {/* 집 본체 */}
      <Path d="M5.5 10V20C5.5 20.6 6 21 6.5 21H17.5C18 21 18.5 20.6 18.5 20V10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill={color + '15'} />
      {/* 아늑한 창문 */}
      <Rect x="9.5" y="13" width="5" height="5" rx="1" stroke={color} strokeWidth={strokeWidth * 0.85} />
      <Path d="M9.5 15.5H14.5" stroke={color} strokeWidth={strokeWidth * 0.7} />
      <Path d="M12 13V18" stroke={color} strokeWidth={strokeWidth * 0.7} />
    </Svg>
  );
}

/**
 * 10. 게임/취미 (MoodGameIcon)
 */
export function MoodGameIcon({ size = 20, color = '#3498DB', strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      {/* 조이패드 본체 */}
      <Path
        d="M6 7H18C20.5 7 22.5 9 22 12.5L20.5 18C20.2 19.2 19 20 17.8 19.5L14.5 18H9.5L6.2 19.5C5 20 3.8 19.2 3.5 18L2 12.5C1.5 9 3.5 7 6 7Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={color + '18'}
      />
      {/* 십자키 */}
      <Path d="M7 11V15" stroke={color} strokeWidth={strokeWidth + 0.3} strokeLinecap="round" />
      <Path d="M5 13H9" stroke={color} strokeWidth={strokeWidth + 0.3} strokeLinecap="round" />
      {/* 오른쪽 액션 버튼 2개 */}
      <Circle cx="16" cy="11.5" r="1.3" fill={color} />
      <Circle cx="18" cy="13.5" r="1.3" fill={color} />
    </Svg>
  );
}

/**
 * 기분 매핑 테이블 및 호환 래퍼 컴포넌트
 */
const MOOD_MAP = {
  '😊': MoodHappyIcon,
  '😄': MoodExcitedIcon,
  '😴': MoodSleepyIcon,
  '✏️': MoodStudyIcon,
  '🛍️': MoodShoppingIcon,
  '🍗': MoodMealIcon,
  '💪': MoodExerciseIcon,
  '❤️': MoodLoveIcon,
  '🏠': MoodHomeIcon,
  '🎮': MoodGameIcon,
  happy: MoodHappyIcon,
  excited: MoodExcitedIcon,
  sleepy: MoodSleepyIcon,
  study: MoodStudyIcon,
  shopping: MoodShoppingIcon,
  meal: MoodMealIcon,
  exercise: MoodExerciseIcon,
  love: MoodLoveIcon,
  home: MoodHomeIcon,
  game: MoodGameIcon,
};

export const MOOD_ITEMS = [
  { id: '😊', label: '행복', component: MoodHappyIcon, color: '#F39C12' },
  { id: '😄', label: '신남', component: MoodExcitedIcon, color: '#FF7E82' },
  { id: '😴', label: '피곤', component: MoodSleepyIcon, color: '#4A90E2' },
  { id: '✏️', label: '공부', component: MoodStudyIcon, color: '#2ECC71' },
  { id: '🛍️', label: '쇼핑', component: MoodShoppingIcon, color: '#9B59B6' },
  { id: '🍗', label: '식사', component: MoodMealIcon, color: '#E67E22' },
  { id: '💪', label: '운동', component: MoodExerciseIcon, color: '#E74C3C' },
  { id: '❤️', label: '사랑', component: MoodLoveIcon, color: '#FF7E82' },
  { id: '🏠', label: '집콕', component: MoodHomeIcon, color: '#1ABC9C' },
  { id: '🎮', label: '게임', component: MoodGameIcon, color: '#3498DB' },
];

export function MoodIcon({ mood = '😊', size = 20, color, strokeWidth = 2, ...props }) {
  const IconComp = MOOD_MAP[mood];
  if (IconComp) {
    const matched = MOOD_ITEMS.find((item) => item.id === mood || item.id === mood);
    const defaultColor = matched ? matched.color : '#FF7E82';
    return <IconComp size={size} color={color || defaultColor} strokeWidth={strokeWidth} {...props} />;
  }
  return <Text style={{ fontSize: size * 0.85 }}>{mood}</Text>;
}
