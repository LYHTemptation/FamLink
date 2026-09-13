import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

/**
 * 1. 메신저 탭 아이콘 (TabChatIcon)
 * 부드러운 둥근 말풍선과 3점 메시지 펄스
 */
export function TabChatIcon({ size = 20, color = '#8E8E93', focused = false, strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M21 11.5C21 16.2 16.97 20 12 20C10.37 20 8.85 19.59 7.53 18.88L3 20L4.3 16.11C3.48 14.76 3 13.2 3 11.5C3 6.81 7.03 3 12 3C16.97 3 21 6.81 21 11.5Z"
        stroke={color}
        strokeWidth={focused ? strokeWidth + 0.3 : strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={focused ? color + '18' : 'none'}
      />
      <Circle cx="8" cy="11.5" r="1.3" fill={color} />
      <Circle cx="12" cy="11.5" r="1.3" fill={color} />
      <Circle cx="16" cy="11.5" r="1.3" fill={color} />
    </Svg>
  );
}

/**
 * 2. 캘린더 탭 아이콘 (TabCalendarIcon)
 * 상단 바인딩 링과 패밀리 하트 체크가 새겨진 캘린더 시트
 */
export function TabCalendarIcon({ size = 20, color = '#8E8E93', focused = false, strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Rect
        x="3.5"
        y="4"
        width="17"
        height="17"
        rx="3.5"
        stroke={color}
        strokeWidth={focused ? strokeWidth + 0.3 : strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={focused ? color + '15' : 'none'}
      />
      <Path
        d="M3.5 9H20.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path
        d="M8 2.5V5.5"
        stroke={color}
        strokeWidth={strokeWidth + 0.2}
        strokeLinecap="round"
      />
      <Path
        d="M16 2.5V5.5"
        stroke={color}
        strokeWidth={strokeWidth + 0.2}
        strokeLinecap="round"
      />
      {/* 캘린더 중심의 따뜻한 하트 데코 */}
      <Path
        d="M12 17C12 17 9 14.8 9 13.2C9 12.2 9.8 11.5 10.7 11.5C11.3 11.5 11.8 11.8 12 12C12.2 11.8 12.7 11.5 13.3 11.5C14.2 11.5 15 12.2 15 13.2C15 14.8 12 17 12 17Z"
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={strokeWidth * 0.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * 3. 스몰톡 탭 아이콘 (TabSmallTalkIcon)
 * 대화와 아이디어가 반짝이는 패밀리 스몰톡 말풍선
 */
export function TabSmallTalkIcon({ size = 20, color = '#8E8E93', focused = false, strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M19.5 14C20.5 12.5 21 10.6 21 8.5C21 4.5 16.5 1.5 11.5 1.5C6.5 1.5 2 4.5 2 8.5C2 12.5 6.5 15.5 11.5 15.5C12.8 15.5 14.1 15.2 15.2 14.7L19.5 16.5L18.7 13.8"
        stroke={color}
        strokeWidth={focused ? strokeWidth + 0.3 : strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={focused ? color + '15' : 'none'}
      />
      {/* 안쪽 4각 반짝임 스파클 */}
      <Path
        d="M11.5 4.5C11.5 6.2 12 7 13.5 7C12 7 11.5 7.8 11.5 9.5C11.5 7.8 11 7 9.5 7C11 7 11.5 6.2 11.5 4.5Z"
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={strokeWidth * 0.8}
        strokeLinejoin="round"
      />
      <Circle cx="7.5" cy="11.5" r="1" fill={color} />
      <Circle cx="15.5" cy="11.5" r="1" fill={color} />
    </Svg>
  );
}

/**
 * 4. 장보기 탭 아이콘 (TabShoppingIcon)
 * 손잡이와 휠이 달린 둥근 패밀리 장바구니 카트
 */
export function TabShoppingIcon({ size = 20, color = '#8E8E93', focused = false, strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M2 3.5H5.2L7.6 15.2C7.8 16 8.5 16.6 9.3 16.6H17.8C18.6 16.6 19.3 16 19.5 15.2L21 8H6"
        stroke={color}
        strokeWidth={focused ? strokeWidth + 0.3 : strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx="9.5"
        cy="20"
        r="1.7"
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Circle
        cx="17.5"
        cy="20"
        r="1.7"
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Path
        d="M10 11.5H16.5"
        stroke={color}
        strokeWidth={strokeWidth * 0.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * 5. 앨범 탭 아이콘 (TabAlbumIcon)
 * 폴라로이드 사진 프레임과 자연 언덕&햇살
 */
export function TabAlbumIcon({ size = 20, color = '#8E8E93', focused = false, strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Rect
        x="3.5"
        y="3"
        width="17"
        height="18"
        rx="3"
        stroke={color}
        strokeWidth={focused ? strokeWidth + 0.3 : strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={focused ? color + '15' : 'none'}
      />
      <Circle
        cx="8.5"
        cy="8.5"
        r="1.6"
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={strokeWidth * 0.8}
      />
      <Path
        d="M4 16L9 12L13 15.5L16 13L20 16.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 19.5H15"
        stroke={color}
        strokeWidth={strokeWidth * 0.75}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * 6. 반려몽/펫 탭 아이콘 (TabPetIcon)
 * 하트 패드와 4개 발가락이 어우러진 사랑스러운 반려동물 발자국
 */
export function TabPetIcon({ size = 20, color = '#8E8E93', focused = false, strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      {/* 중심 하트 발바닥 패드 */}
      <Path
        d="M12 19C12 19 7.8 16.2 7.8 13.5C7.8 11.8 9.3 10.5 10.8 11.2C11.3 11.4 11.8 12 12 12C12.2 12 12.7 11.4 13.2 11.2C14.7 10.5 16.2 11.8 16.2 13.5C16.2 16.2 12 19 12 19Z"
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={focused ? strokeWidth + 0.2 : strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 4개 발가락 */}
      <Circle cx="6.8" cy="9.5" r="1.6" fill={focused ? color : 'none'} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="10.3" cy="6.2" r="1.6" fill={focused ? color : 'none'} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="13.7" cy="6.2" r="1.6" fill={focused ? color : 'none'} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="17.2" cy="9.5" r="1.6" fill={focused ? color : 'none'} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

/**
 * 7. 가족 탭 아이콘 (TabFamilyIcon)
 * 따뜻한 지붕과 중심에 하트가 깃든 패밀리 하우스
 */
export function TabFamilyIcon({ size = 20, color = '#8E8E93', focused = false, strokeWidth = 2, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M3 10.5L12 3L21 10.5"
        stroke={color}
        strokeWidth={focused ? strokeWidth + 0.3 : strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5 9.5V19.2C5 20.2 5.8 21 6.8 21H17.2C18.2 21 19 20.2 19 19.2V9.5"
        stroke={color}
        strokeWidth={focused ? strokeWidth + 0.3 : strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={focused ? color + '15' : 'none'}
      />
      {/* 집 안의 가족 하트 */}
      <Path
        d="M12 17C12 17 8.8 14.6 8.8 12.8C8.8 11.5 9.8 10.5 11 10.5C11.6 10.5 12 10.8 12 10.8C12 10.8 12.4 10.5 13 10.5C14.2 10.5 15.2 11.5 15.2 12.8C15.2 14.6 12 17 12 17Z"
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={strokeWidth * 0.85}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
