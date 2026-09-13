import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

/**
 * 1. 전송 아이콘 (IconSend)
 * 부드러운 라운드 팁의 감성적인 종이비행기
 */
export function IconSend({ size = 20, color = '#FFFFFF', strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M21.5 2.5L10 14"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M21.5 2.5L14.5 21.5C14.3 22 13.6 22.1 13.2 21.7L9.5 17.5L3.5 13.5C3 13.1 3.1 12.4 3.6 12.2L21.5 2.5Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * 2. 뒤로가기 꺾쇠 (IconChevronLeft)
 */
export function IconChevronLeft({ size = 20, color = '#1C1C1E', strokeWidth = 2.2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M15 18L9 12L15 6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * 3. 앞으로/상세 꺾쇠 (IconChevronRight)
 */
export function IconChevronRight({ size = 20, color = '#AEAEB2', strokeWidth = 2.2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M9 18L15 12L9 6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * 4. 닫기 아이콘 (IconClose / IconX)
 */
export function IconClose({ size = 20, color = '#8E8E93', strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M18 6L6 18M6 6L18 18"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
export const IconX = IconClose;

/**
 * 5. 추가 아이콘 (IconPlus)
 */
export function IconPlus({ size = 20, color = '#FFFFFF', strokeWidth = 2.2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M12 5V19M5 12H19"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * 6. 수정/편집 아이콘 (IconEdit)
 */
export function IconEdit({ size = 20, color = '#4A90E2', strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M12 20H21"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path
        d="M16.5 3.5C17.3 2.7 18.7 2.7 19.5 3.5C20.3 4.3 20.3 5.7 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * 7. 삭제/휴지통 아이콘 (IconTrash)
 */
export function IconTrash({ size = 20, color = '#FF3B30', strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M4 7H20"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path
        d="M9 7V4C9 3.4 9.4 3 10 3H14C14.6 3 15 3.4 15 4V7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6 7L7 19.5C7.1 20.3 7.8 21 8.6 21H15.4C16.2 21 16.9 20.3 17 19.5L18 7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10 11V17M14 11V17"
        stroke={color}
        strokeWidth={strokeWidth * 0.9}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * 8. 검색/돋보기 아이콘 (IconSearch)
 */
export function IconSearch({ size = 20, color = '#8E8E93', strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle
        cx="11"
        cy="11"
        r="7.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path
        d="M20.5 20.5L16.5 16.5"
        stroke={color}
        strokeWidth={strokeWidth + 0.3}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * 9. 사진/갤러리 아이콘 (IconImage)
 */
export function IconImage({ size = 20, color = '#8E8E93', strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="8.5" cy="8.5" r="1.5" fill={color} />
      <Path
        d="M21 15L16 10L6 20"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconSquare({ size = 20, color = '#8E8E93', strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * 10. 체크 및 완료 서클 아이콘 (IconCheck, IconCheckCircle)
 */
export function IconCheck({ size = 20, color = '#2ECC71', strokeWidth = 2.4, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M20 6L9 17L4 12"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconCheckCircle({ size = 20, color = '#2ECC71', strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle
        cx="12"
        cy="12"
        r="9.5"
        stroke={color}
        strokeWidth={strokeWidth}
        fill={color + '15'}
      />
      <Path
        d="M16 9L10.5 14.5L8 12"
        stroke={color}
        strokeWidth={strokeWidth + 0.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * 11. 하트/응원 아이콘 (IconHeart)
 */
export function IconHeart({ size = 20, color = '#FF7E82', filled = false, strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? color : 'none'}
      />
    </Svg>
  );
}

/**
 * 12. 복사 아이콘 (IconCopy)
 */
export function IconCopy({ size = 20, color = '#8E8E93', strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Rect
        x="8.5"
        y="8.5"
        width="11.5"
        height="11.5"
        rx="2.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4.5 15.5H4C3.4 15.5 3 15.1 3 14.5V4C3 3.4 3.4 3 4 3H14.5C15.1 3 15.5 3.4 15.5 4V4.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * 13. 공유 아이콘 (IconShare)
 */
export function IconShare({ size = 20, color = '#8E8E93', strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle cx="18" cy="5" r="2.5" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="6" cy="12" r="2.5" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="18" cy="19" r="2.5" stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M8.3 10.8L15.7 6.2M8.3 13.2L15.7 17.8"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}
