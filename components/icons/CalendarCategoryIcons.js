import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

/**
 * 1. 식사/외식 아이콘 (CategoryMealIcon)
 * 따뜻한 김이 피어오르는 정갈한 밥공기와 온기, 받침대 디자인
 */
export function CategoryMealIcon({ size = 20, color = '#E74C3C', strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      {/* 밥공기 본체 (부드러운 곡선) */}
      <Path
        d="M3 11C3.5 16.5 7.2 20 12 20C16.8 20 20.5 16.5 21 11"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 밥공기 림(윗선) */}
      <Path
        d="M2.5 11H21.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* 밥공기 굽(받침대) */}
      <Path
        d="M8.5 20L7.8 22H16.2L15.5 20"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 모락모락 피어오르는 온기(스팀) 3줄 */}
      <Path
        d="M7.5 7.5C6.8 6 8.2 4.8 7.5 3.2"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path
        d="M12 7.5C11.3 5.8 12.7 4.5 12 2.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path
        d="M16.5 7.5C15.8 6 17.2 4.8 16.5 3.2"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * 2. 기념일/생일 아이콘 (CategoryAnniversaryIcon)
 * 촛불 불꽃과 크림 데코가 얹어진 축하 2단 케이크 디자인
 */
export function CategoryAnniversaryIcon({ size = 20, color = '#9B59B6', strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      {/* 촛불 불꽃 */}
      <Path
        d="M12 2C11 3.5 11 4.5 12 5.5C13 4.5 13 3.5 12 2Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 양초 기둥 */}
      <Path
        d="M12 5.5V8.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* 상단 케이크 층 */}
      <Path
        d="M7 8.5H17V13.5H7V8.5Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 상단 층 크림 웨이브 */}
      <Path
        d="M7 11C8.2 11.8 9.8 11.8 11 11C12.2 10.2 13.8 10.2 15 11C15.7 11.5 16.4 11.5 17 11"
        stroke={color}
        strokeWidth={strokeWidth * 0.8}
        strokeLinecap="round"
      />
      {/* 하단 케이크 층 */}
      <Path
        d="M4 13.5H20V20C20 20.6 19.5 21 18.9 21H5.1C4.5 21 4 20.6 4 20V13.5Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 하단 층 크림 웨이브 */}
      <Path
        d="M4 16.5C6 17.5 8 17.5 10 16.5C12 15.5 14 15.5 16 16.5C18 17.5 19.2 17.2 20 16.5"
        stroke={color}
        strokeWidth={strokeWidth * 0.8}
        strokeLinecap="round"
      />
      {/* 케이크 받침 접시 */}
      <Path
        d="M2 21H22"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * 3. 여행/나들이 아이콘 (CategoryTripIcon)
 * 아늑한 가족 캠핑 텐트와 햇살, 지면 디자인
 */
export function CategoryTripIcon({ size = 20, color = '#2ECC71', strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      {/* 지면 라인 */}
      <Path
        d="M2 20.5H22"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* 텐트 삼각형 외곽 */}
      <Path
        d="M12 4.5L3.5 20.5H20.5L12 4.5Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 텐트 입구 중앙 기둥 */}
      <Path
        d="M12 4.5V20.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* 텐트 걷어올린 문 플랩 */}
      <Path
        d="M12 12L8.5 20.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path
        d="M12 12L15.5 20.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* 우측 상단 따사로운 햇살 */}
      <Circle
        cx="19"
        cy="5.5"
        r="2"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Path
        d="M19 1.8V2.8M22.7 5.5H21.7M21.5 3L20.8 3.7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * 4. 집안일/청소 아이콘 (CategoryHouseworkIcon)
 * 깨끗하고 산뜻한 친환경 분무기 스프레이와 반짝이는 매직 스파클 디자인
 */
export function CategoryHouseworkIcon({ size = 20, color = '#F39C12', strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      {/* 분무기 용기 몸통 */}
      <Path
        d="M7.5 13C7.5 12 8.5 11 9.5 11H13.5C14.5 11 15.5 12 15.5 13V19.5C15.5 20.3 14.8 21 14 21H9C8.2 21 7.5 20.3 7.5 19.5V13Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 분무기 목 & 트리거 헤드 */}
      <Path
        d="M10 11V8.5H13V11"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 분사 헤드 윗부분 */}
      <Path
        d="M8 6H14.5C15 6 15.5 6.5 15.5 7V8.5H9.5L8 6Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 분무기 노즐 팁 */}
      <Path
        d="M8 6.8H6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* 트리거 손잡이 */}
      <Path
        d="M9.5 8.5C8.8 9.5 8.8 10.5 9.2 11.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* 반짝이는 마법 스파클 (청결/클린) */}
      <Path
        d="M19.5 3C19.5 4.8 20 5.5 21.8 5.5C20 5.5 19.5 6.2 19.5 8C19.5 6.2 19 5.5 17.2 5.5C19 5.5 19.5 4.8 19.5 3Z"
        stroke={color}
        strokeWidth={strokeWidth * 0.9}
        strokeLinejoin="round"
      />
      {/* 작은 보조 스파클 */}
      <Path
        d="M18 14C18 15 18.3 15.5 19.3 15.5C18.3 15.5 18 16 18 17C18 16 17.7 15.5 16.7 15.5C17.7 15.5 18 15 18 14Z"
        stroke={color}
        strokeWidth={strokeWidth * 0.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * 5. 기타/메모 아이콘 (CategoryOtherIcon)
 * 가족 메모 및 책갈피 리본 태그와 별 각인 디자인
 */
export function CategoryOtherIcon({ size = 20, color = '#95A5A6', strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      {/* 북마크 리본 몸체 */}
      <Path
        d="M6 3.5C6 2.7 6.7 2 7.5 2H16.5C17.3 2 18 2.7 18 3.5V22L12 18.2L6 22V3.5Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 중앙 별 각인 */}
      <Path
        d="M12 6.5L12.7 8.3L14.6 8.5L13.1 9.8L13.6 11.6L12 10.6L10.4 11.6L10.9 9.8L9.4 8.5L11.3 8.3L12 6.5Z"
        stroke={color}
        strokeWidth={strokeWidth * 0.85}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 상단 장식 라인 */}
      <Path
        d="M8.5 4.5H15.5"
        stroke={color}
        strokeWidth={strokeWidth * 0.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * 6. 직접 입력/커스텀 카테고리 아이콘 (CategoryCustomIcon)
 * 직접 입력 카테고리를 나타내는 네임태그와 플러스 디자인
 */
export function CategoryCustomIcon({ size = 20, color = '#3498DB', strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M20.59 13.41L13.42 20.58C12.64 21.36 11.37 21.36 10.59 20.58L2 12V2H12L20.59 10.59C21.37 11.37 21.37 12.64 20.59 13.41Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="7" cy="7" r="1.5" fill={color} />
      <Path
        d="M12 12H16M14 10V14"
        stroke={color}
        strokeWidth={strokeWidth * 0.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
