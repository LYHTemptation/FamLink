import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

/**
 * 1. 행복 하트 방울 아이콘 (DropHeartIcon)
 * 사랑스럽고 생동감 넘치는 하트 + 하이라이트 광택
 */
export function DropHeartIcon({ size = 26, color = '#FF4D6D', ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none" {...props}>
      {/* 본체 하트 */}
      <Path
        d="M16 28.5C15.2 28.5 6 20.8 3.5 14.5C1.3 8.9 5.5 3.5 11.2 3.5C13.8 3.5 15.2 4.9 16 6C16.8 4.9 18.2 3.5 20.8 3.5C26.5 3.5 30.7 8.9 28.5 14.5C26 20.8 16.8 28.5 16 28.5Z"
        fill={color}
      />
      {/* 부드러운 하이라이트 글레어 */}
      <Path
        d="M9 8.5C7.2 10.2 6.8 12.5 7.2 14"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.85}
      />
      <Circle cx="8.5" cy="8.5" r="1.1" fill="#FFFFFF" opacity={0.95} />
    </Svg>
  );
}

/**
 * 2. 행운 클로버 방울 아이콘 (DropCloverIcon)
 * 4잎 행운의 클로버 + 자연스러운 줄기 & 잎맥
 */
export function DropCloverIcon({ size = 26, color = '#10B981', ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none" {...props}>
      {/* 4잎 본체 */}
      <Circle cx="13.2" cy="8.8" r="4.3" fill={color} />
      <Circle cx="18.8" cy="8.8" r="4.3" fill={color} />

      <Circle cx="23.2" cy="13.2" r="4.3" fill={color} />
      <Circle cx="23.2" cy="18.8" r="4.3" fill={color} />

      <Circle cx="18.8" cy="23.2" r="4.3" fill={color} />
      <Circle cx="13.2" cy="23.2" r="4.3" fill={color} />

      <Circle cx="8.8" cy="18.8" r="4.3" fill={color} />
      <Circle cx="8.8" cy="13.2" r="4.3" fill={color} />

      {/* 중심 코어 */}
      <Circle cx="16" cy="16" r="4" fill={color} />

      {/* 클로버 줄기 (살짝 곡선) */}
      <Path
        d="M16 18C16 23 13 26.5 10.5 28.5"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* 좌상단 잎 하이라이트 글레어 */}
      <Path
        d="M11 6.5C12.8 5.6 14.8 6 15.2 6.8"
        stroke="#FFFFFF"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity={0.8}
      />
    </Svg>
  );
}

/**
 * 3. 별빛 방울 아이콘 (DropStarIcon)
 * 앙증맞고 반짝이는 5각 별 + 광택
 */
export function DropStarIcon({ size = 26, color = '#F59E0B', ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none" {...props}>
      {/* 5각 별 본체 */}
      <Path
        d="M16 3L19.8 11.2C20.2 12.1 21 12.7 22 12.8L30.8 13.7C31.9 13.8 32.3 15.2 31.5 15.9L24.9 21.8C24.1 22.4 23.8 23.5 24 24.5L25.9 33.2C26.1 34.3 24.9 35.1 24 34.6L16.2 30.2C15.3 29.7 14.2 29.7 13.3 30.2L5.5 34.6C4.6 35.1 3.4 34.3 3.6 33.2L5.5 24.5C5.7 23.5 5.4 22.4 4.6 21.8L-2 15.9C-2.8 15.2 -2.4 13.8 -1.3 13.7L7.5 12.8C8.5 12.7 9.3 12.1 9.7 11.2L13.5 3C13.9 2 15.3 2 16 3Z"
        transform="scale(0.86) translate(2.5, 1.2)"
        fill={color}
      />
      {/* 하이라이트 글레어 */}
      <Circle cx="12.5" cy="11.5" r="1.3" fill="#FFFFFF" opacity={0.9} />
      <Path
        d="M13.5 8C14.5 9.5 14 11.2 13 12"
        stroke="#FFFFFF"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity={0.8}
      />
      {/* 앙증맞은 반짝임 */}
      <Path
        d="M24 5.5V9.5M22 7.5H26"
        stroke="#FCD34D"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </Svg>
  );
}
