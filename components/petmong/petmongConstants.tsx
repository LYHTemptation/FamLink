import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Heart } from 'lucide-react-native';
import { colors } from '../../theme';
import styles from './PetmongStyles';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

export interface ConstellationStar {
  id: number;
  normX: number;
  normY: number;
}

export interface GuardianConstellation {
  id: string;
  name: string;
  meaning: string;
  stars: ConstellationStar[];
}

export interface FloatingHeartItem {
  id: string;
  x: number;
  text: string;
}

export interface FloorRippleItem {
  id: string;
  x: number;
  y: number;
}

export const GUARDIAN_CONSTELLATIONS: GuardianConstellation[] = [
  {
    id: 'ursa_major',
    name: '북두칠성',
    meaning: '언제나 가족의 앞길을 밝혀주는 일곱 개의 빛',
    stars: [
      { id: 1, normX: 0.15, normY: 0.35 },
      { id: 2, normX: 0.16, normY: 0.65 },
      { id: 3, normX: 0.36, normY: 0.68 },
      { id: 4, normX: 0.38, normY: 0.38 },
      { id: 5, normX: 0.54, normY: 0.44 },
      { id: 6, normX: 0.70, normY: 0.56 },
      { id: 7, normX: 0.86, normY: 0.72 },
    ],
  },
  {
    id: 'cassiopeia',
    name: '카시오페이아자리',
    meaning: '밤하늘 가장 높이 빛나는 어머니의 포근한 품',
    stars: [
      { id: 1, normX: 0.14, normY: 0.36 },
      { id: 2, normX: 0.32, normY: 0.68 },
      { id: 3, normX: 0.50, normY: 0.38 },
      { id: 4, normX: 0.68, normY: 0.70 },
      { id: 5, normX: 0.86, normY: 0.32 },
    ],
  },
  {
    id: 'ursa_minor',
    name: '작은곰자리 북극성',
    meaning: '언제나 변함없이 북쪽을 지켜주는 수호별',
    stars: [
      { id: 1, normX: 0.86, normY: 0.28 },
      { id: 2, normX: 0.70, normY: 0.38 },
      { id: 3, normX: 0.54, normY: 0.46 },
      { id: 4, normX: 0.38, normY: 0.48 },
      { id: 5, normX: 0.22, normY: 0.42 },
      { id: 6, normX: 0.14, normY: 0.64 },
      { id: 7, normX: 0.30, normY: 0.70 },
    ],
  },
  {
    id: 'lyra',
    name: '거문고자리',
    meaning: '포근한 꿈나라로 이끄는 직녀성의 자장가',
    stars: [
      { id: 1, normX: 0.50, normY: 0.22 },
      { id: 2, normX: 0.36, normY: 0.44 },
      { id: 3, normX: 0.34, normY: 0.72 },
      { id: 4, normX: 0.64, normY: 0.74 },
      { id: 5, normX: 0.66, normY: 0.44 },
    ],
  },
  {
    id: 'orion',
    name: '오리온자리',
    meaning: '어떤 추위에도 가족을 지켜주는 든든한 밤하늘 사냥꾼',
    stars: [
      { id: 1, normX: 0.28, normY: 0.26 },
      { id: 2, normX: 0.72, normY: 0.26 },
      { id: 3, normX: 0.62, normY: 0.48 },
      { id: 4, normX: 0.50, normY: 0.50 },
      { id: 5, normX: 0.38, normY: 0.52 },
      { id: 6, normX: 0.28, normY: 0.74 },
      { id: 7, normX: 0.72, normY: 0.74 },
    ],
  },
  {
    id: 'pegasus',
    name: '페가수스자리',
    meaning: '가족의 소원을 싣고 밤하늘을 날아오르는 날개',
    stars: [
      { id: 1, normX: 0.14, normY: 0.32 },
      { id: 2, normX: 0.24, normY: 0.52 },
      { id: 3, normX: 0.38, normY: 0.66 },
      { id: 4, normX: 0.72, normY: 0.66 },
      { id: 5, normX: 0.74, normY: 0.30 },
      { id: 6, normX: 0.38, normY: 0.30 },
    ],
  },
  {
    id: 'delphinus',
    name: '돌고래자리',
    meaning: '은하수 바다를 뛰노는 행복과 행운의 돌고래',
    stars: [
      { id: 1, normX: 0.16, normY: 0.70 },
      { id: 2, normX: 0.34, normY: 0.56 },
      { id: 3, normX: 0.52, normY: 0.64 },
      { id: 4, normX: 0.74, normY: 0.48 },
      { id: 5, normX: 0.56, normY: 0.34 },
    ],
  },
  {
    id: 'corona_borealis',
    name: '북쪽왕관자리',
    meaning: '가족 모두의 머리 위에 씌워진 반짝이는 보석 왕관',
    stars: [
      { id: 1, normX: 0.14, normY: 0.38 },
      { id: 2, normX: 0.24, normY: 0.54 },
      { id: 3, normX: 0.38, normY: 0.66 },
      { id: 4, normX: 0.54, normY: 0.68 },
      { id: 5, normX: 0.68, normY: 0.56 },
      { id: 6, normX: 0.78, normY: 0.44 },
      { id: 7, normX: 0.86, normY: 0.32 },
    ],
  },
];

export const PETTING_DIALOGUES: string[] = [
  '헤헤, 쓰담쓰담 해주시니까 온몸이 몽글몽글 녹아내려요 몽 💕',
  '가족의 따뜻한 손길이 세상에서 제일 좋아요! 더 쓰다듬어 주세요 ✨',
  '간질간질~ 기분이 너무 좋아서 꼬리가 프로펠러처럼 돌아가요 🐾',
  '오늘도 우리 가족 곁에 있을 수 있어서 가장 행복한 반려몽이에요 💖',
  '사랑 듬뿍 충전 완료! 오늘도 가족들에게 행운을가득 물어다 줄게요 🍀',
];

export function WarmthFruitIcon({ size = 32 }: { size?: number }): React.ReactElement {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Circle cx="16" cy="16" r="14" fill={colors.primaryLight} stroke={colors.primary} strokeWidth={2} />
      <Path
        d="M16 22C16 22 9 17.5 9 13C9 10.5 11 8.5 13.5 8.5C14.8 8.5 15.6 9.2 16 9.8C16.4 9.2 17.2 8.5 18.5 8.5C21 8.5 23 10.5 23 13C23 17.5 16 22 16 22Z"
        fill="#FF4D6D"
      />
      <Circle cx="13" cy="11" r="1" fill="#FFFFFF" opacity={0.8} />
    </Svg>
  );
}

/**
 * 탄성 팝업 + 상향 부유 + 페이드아웃 물리가 적용된 하트/경험치 파티클 컴포넌트
 */
export function FloatingHeartParticle({
  item,
}: {
  item: FloatingHeartItem;
}): React.ReactElement {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.45)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const swayDir = Math.random() > 0.5 ? 12 : -12;
    const anim = Animated.parallel([
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.12,
          friction: 5,
          tension: 140,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(scale, {
          toValue: 1.0,
          duration: 180,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
      Animated.timing(translateY, {
        toValue: -68,
        duration: 1250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: swayDir,
          duration: 600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(translateX, {
          toValue: -swayDir * 0.5,
          duration: 650,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
      Animated.sequence([
        Animated.delay(750),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    ]);
    anim.start();
    return () => anim.stop();
  }, [opacity, scale, translateX, translateY]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.floatingHeartBadge,
        {
          left: item.x,
          bottom: 235,
          opacity,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    >
      <Heart size={15} color="#FF4D6D" fill="#FF4D6D" />
      <Text style={styles.floatingHeartText}>{item.text}</Text>
    </Animated.View>
  );
}

/**
 * 바닥 터치 시 반려몽 이동 목표 지점에 퍼지는 물결 리플 이펙트
 */
export function FloorTapRipple({
  ripple,
}: {
  ripple: FloorRippleItem;
}): React.ReactElement {
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(scale, {
        toValue: 1.85,
        duration: 620,
        easing: Easing.out(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 620,
        easing: Easing.out(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [opacity, scale]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.floorTapRipple,
        {
          left: ripple.x - 22,
          top: ripple.y - 11,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}
