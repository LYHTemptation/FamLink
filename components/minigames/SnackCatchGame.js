import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Svg, { Circle, Path, Defs, RadialGradient, Stop, Polyline, G, Rect } from 'react-native-svg';
import {
  Trophy,
  Sparkles,
  Heart,
  X,
  Flame,
  RotateCcw,
  Check,
  Clock,
  Play,
  Gamepad2,
  Sword,
  Zap,
  Bomb as BombLucide,
} from 'lucide-react-native';

const { width: INITIAL_WIDTH, height: INITIAL_HEIGHT } = Dimensions.get('window');

// -----------------------------------------------------------------
// Beautiful Vector Fruit Icons (Whole & Sliced Halves)
// -----------------------------------------------------------------

// 1. Watermelon
function WatermelonWhole({ size = 58 }) {
  const r = size / 2;
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Circle cx="30" cy="30" r="27" fill="#15803D" stroke="#14532D" strokeWidth="2.5" />
      {/* Dark Green Stripes */}
      <Path d="M12 12 Q 30 25 18 48" stroke="#14532D" strokeWidth="3" fill="none" />
      <Path d="M26 6 Q 30 30 32 54" stroke="#14532D" strokeWidth="3.5" fill="none" />
      <Path d="M42 10 Q 32 30 46 48" stroke="#14532D" strokeWidth="3" fill="none" />
      {/* Specular Highlight */}
      <Circle cx="20" cy="18" r="4" fill="#86EFAC" opacity="0.6" />
    </Svg>
  );
}

function WatermelonHalf({ size = 58, isLeft = true }) {
  return (
    <Svg width={size * 0.65} height={size} viewBox="0 0 35 60">
      {isLeft ? (
        <G>
          <Path d="M32 5 A 26 26 0 0 0 32 55 Z" fill="#15803D" stroke="#14532D" strokeWidth="2" />
          <Path d="M30 8 A 22 22 0 0 0 30 52 Z" fill="#EF4444" />
          {/* Seeds */}
          <Circle cx="22" cy="22" r="2" fill="#1E293B" />
          <Circle cx="18" cy="30" r="2" fill="#1E293B" />
          <Circle cx="22" cy="38" r="2" fill="#1E293B" />
        </G>
      ) : (
        <G>
          <Path d="M3 5 A 26 26 0 0 1 3 55 Z" fill="#15803D" stroke="#14532D" strokeWidth="2" />
          <Path d="M5 8 A 22 22 0 0 1 5 52 Z" fill="#EF4444" />
          {/* Seeds */}
          <Circle cx="13" cy="22" r="2" fill="#1E293B" />
          <Circle cx="17" cy="30" r="2" fill="#1E293B" />
          <Circle cx="13" cy="38" r="2" fill="#1E293B" />
        </G>
      )}
    </Svg>
  );
}

// 2. Apple
function AppleWhole({ size = 52 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 54 54">
      {/* Stem & Leaf */}
      <Path d="M27 6 Q 28 14 27 16" stroke="#78350F" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Path d="M28 10 Q 36 6 38 12 Q 32 14 28 10" fill="#22C55E" />
      {/* Apple Body */}
      <Path
        d="M27 16 C 18 13 8 20 10 32 C 12 44 24 50 27 48 C 30 50 42 44 44 32 C 46 20 36 13 27 16 Z"
        fill="#DC2626"
        stroke="#991B1B"
        strokeWidth="2"
      />
      {/* Highlight */}
      <Circle cx="18" cy="24" r="3.5" fill="#FCA5A5" opacity="0.8" />
    </Svg>
  );
}

function AppleHalf({ size = 52, isLeft = true }) {
  return (
    <Svg width={size * 0.6} height={size} viewBox="0 0 30 54">
      {isLeft ? (
        <G>
          <Path d="M28 16 C 16 13 8 22 10 34 C 12 46 24 49 28 48 Z" fill="#DC2626" stroke="#991B1B" strokeWidth="1.5" />
          <Path d="M26 18 C 16 16 12 24 13 34 C 14 44 23 46 26 45 Z" fill="#FEF08A" />
          <Circle cx="22" cy="32" r="2" fill="#78350F" />
        </G>
      ) : (
        <G>
          <Path d="M2 16 C 14 13 22 22 20 34 C 18 46 6 49 2 48 Z" fill="#DC2626" stroke="#991B1B" strokeWidth="1.5" />
          <Path d="M4 18 C 14 16 18 24 17 34 C 16 44 7 46 4 45 Z" fill="#FEF08A" />
          <Circle cx="8" cy="32" r="2" fill="#78350F" />
        </G>
      )}
    </Svg>
  );
}

// 3. Banana
function BananaWhole({ size = 54 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Path
        d="M10 42 C 16 48 38 48 48 24 C 49 20 45 16 42 18 C 34 36 18 36 10 42 Z"
        fill="#FACC15"
        stroke="#CA8A04"
        strokeWidth="2"
      />
      {/* Banana Tip */}
      <Circle cx="47" cy="20" r="2.5" fill="#713F12" />
      <Circle cx="11" cy="41" r="2" fill="#854D0E" />
    </Svg>
  );
}

function BananaHalf({ size = 54, isLeft = true }) {
  return (
    <Svg width={size * 0.55} height={size} viewBox="0 0 30 56">
      <Path
        d={isLeft ? "M8 42 C 14 46 26 44 28 32 L 28 30 C 18 36 12 38 8 42 Z" : "M2 30 C 12 36 22 34 26 18 C 24 16 20 20 2 30 Z"}
        fill="#FACC15"
        stroke="#CA8A04"
        strokeWidth="1.5"
      />
    </Svg>
  );
}

// 4. Strawberry
function StrawberryWhole({ size = 50 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 50 50">
      <Path d="M25 8 Q 20 2 16 8 Q 25 11 25 8" fill="#16A34A" />
      <Path d="M25 8 Q 30 2 34 8 Q 25 11 25 8" fill="#16A34A" />
      <Path
        d="M14 14 C 10 24 16 40 25 44 C 34 40 40 24 36 14 C 30 10 20 10 14 14 Z"
        fill="#E11D48"
        stroke="#9F1239"
        strokeWidth="1.5"
      />
      {/* Seeds */}
      <Circle cx="20" cy="22" r="1.5" fill="#FEF08A" />
      <Circle cx="28" cy="20" r="1.5" fill="#FEF08A" />
      <Circle cx="24" cy="30" r="1.5" fill="#FEF08A" />
      <Circle cx="18" cy="32" r="1.5" fill="#FEF08A" />
      <Circle cx="30" cy="32" r="1.5" fill="#FEF08A" />
    </Svg>
  );
}

// 5. Golden Pineapple
function PineappleWhole({ size = 58 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      {/* Crown Leaves */}
      <Path d="M30 4 L 26 18 L 30 14 L 34 18 Z" fill="#15803D" />
      <Path d="M22 8 L 24 18 L 28 15 Z" fill="#16A34A" />
      <Path d="M38 8 L 32 15 L 36 18 Z" fill="#16A34A" />
      {/* Pineapple Oval */}
      <Path
        d="M20 20 C 14 28 14 44 22 52 C 30 56 38 54 42 46 C 46 38 44 24 38 18 C 30 14 24 16 20 20 Z"
        fill="#F59E0B"
        stroke="#B45309"
        strokeWidth="2"
      />
      {/* Diamond Texture */}
      <Path d="M20 30 L 40 38" stroke="#D97706" strokeWidth="2" />
      <Path d="M18 42 L 38 24" stroke="#D97706" strokeWidth="2" />
      <Circle cx="30" cy="34" r="3" fill="#FDE68A" opacity="0.8" />
    </Svg>
  );
}

// 6. Ticking Bomb
function TickingBombIcon({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      {/* Spark Fuse */}
      <Path d="M38 12 Q 44 8 46 4" stroke="#92400E" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Burning Spark */}
      <Circle cx="48" cy="4" r="4" fill="#F59E0B" />
      <Circle cx="48" cy="4" r="2" fill="#EF4444" />
      {/* Bomb Cap */}
      <Rect x="26" y="10" width="12" height="6" rx="2" fill="#475569" transform="rotate(-15 32 13)" />
      {/* Bomb Shell */}
      <Circle cx="28" cy="34" r="22" fill="#0F172A" stroke="#334155" strokeWidth="2.5" />
      {/* Highlight */}
      <Circle cx="20" cy="24" r="4.5" fill="#64748B" opacity="0.7" />
    </Svg>
  );
}

function FruitWholeRenderer({ type, size = 56 }) {
  switch (type) {
    case 'watermelon': return <WatermelonWhole size={size} />;
    case 'apple': return <AppleWhole size={size} />;
    case 'banana': return <BananaWhole size={size} />;
    case 'strawberry': return <StrawberryWhole size={size} />;
    case 'pineapple': return <PineappleWhole size={size} />;
    case 'bomb': return <TickingBombIcon size={size} />;
    default: return <AppleWhole size={size} />;
  }
}

function FruitHalfRenderer({ type, size = 56, isLeft = true }) {
  switch (type) {
    case 'watermelon': return <WatermelonHalf size={size} isLeft={isLeft} />;
    case 'apple': return <AppleHalf size={size} isLeft={isLeft} />;
    case 'banana': return <BananaHalf size={size} isLeft={isLeft} />;
    default: return <AppleHalf size={size} isLeft={isLeft} />;
  }
}

// -----------------------------------------------------------------
// Game Configuration
// -----------------------------------------------------------------
const GAME_DURATION = 30; // 30 seconds
const GRAVITY = 0.36; // Physics gravity (smooth and floaty high arc)

const FRUIT_TABLE = [
  { type: 'watermelon', name: '수박', points: 30, size: 64, color: '#EF4444', splashColor: '#DC2626' },
  { type: 'apple', name: '사과', points: 15, size: 54, color: '#EF4444', splashColor: '#B91C1C' },
  { type: 'banana', name: '바나나', points: 20, size: 56, color: '#FACC15', splashColor: '#F59E0B' },
  { type: 'strawberry', name: '딸기', points: 25, size: 48, color: '#E11D48', splashColor: '#BE123C' },
  { type: 'pineapple', name: '황금 파인애플', points: 50, size: 62, color: '#F59E0B', splashColor: '#D97706', isRare: true },
];

const GAME_CONFIG = {
  tossInterval: 1100,
  batchSize: [2, 3],
  bombChance: 0.18, // 18% chance of bombs
  apexRatioMin: 0.18,
  apexRatioMax: 0.36,
};

// Distance from point to line segment
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

export default function SnackCatchGame({
  visible,
  character,
  transparentUrl,
  onClose,
  onGameComplete,
  canEarnReward = true,
  remainingRewards = 1,
}) {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const screenWidth = dimensions.width;
  const screenHeight = dimensions.height;

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => sub?.remove?.();
  }, []);

  // Game Lifecycle States: 'ready' | 'playing' | 'gameover'
  const [gameState, setGameState] = useState('ready');
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [slicedCount, setSlicedCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lives, setLives] = useState(3);
  const [fullness, setFullness] = useState(0); // 0% ~ 100%

  // Active Flying Fruits & Sliced Halves
  const [fruits, setFruits] = useState([]);
  const [halves, setHalves] = useState([]);
  const [splashes, setSplashes] = useState([]);
  const [toasts, setToasts] = useState([]);

  // Blade Slash Trail
  const [slashPoints, setSlashPoints] = useState([]);
  const lastTouchPosRef = useRef(null);

  // Animations
  const petBounce = useRef(new Animated.Value(1)).current;
  const screenShake = useRef(new Animated.Value(0)).current;

  // State Refs for 60fps loop
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const screenWidthRef = useRef(screenWidth);
  screenWidthRef.current = screenWidth;

  const screenHeightRef = useRef(screenHeight);
  screenHeightRef.current = screenHeight;

  const fruitsRef = useRef([]);
  const halvesRef = useRef([]);
  const comboRef = useRef(0);
  const lastSliceTimeRef = useRef(0);

  // Timers
  const gameTimerRef = useRef(null);
  const tossTimerRef = useRef(null);
  const animFrameRef = useRef(null);
  const slashClearTimerRef = useRef(null);

  // Trigger Score / Message Toast
  const triggerToast = useCallback((text, color = '#F59E0B', x = null, y = null) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    const toastX = x !== null ? Math.max(20, Math.min(screenWidthRef.current - 140, x - 50)) : screenWidthRef.current / 2 - 60;
    const toastY = y !== null ? Math.max(90, Math.min(screenHeightRef.current - 180, y - 30)) : screenHeightRef.current / 2;

    setToasts(prev => [...prev.slice(-4), { id, text, color, x: toastX, y: toastY }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 850);
  }, []);

  // Screen Shake (on bomb hit)
  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(screenShake, { toValue: 12, duration: 40, useNativeDriver: true }),
      Animated.timing(screenShake, { toValue: -12, duration: 40, useNativeDriver: true }),
      Animated.timing(screenShake, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(screenShake, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(screenShake, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  }, [screenShake]);

  // Reset to Ready
  const resetToReady = useCallback(() => {
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (tossTimerRef.current) clearInterval(tossTimerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (slashClearTimerRef.current) clearTimeout(slashClearTimerRef.current);

    fruitsRef.current = [];
    halvesRef.current = [];
    setFruits([]);
    setHalves([]);
    setSplashes([]);
    setToasts([]);
    setSlashPoints([]);
    lastTouchPosRef.current = null;
    setGameState('ready');
  }, []);

  const handleExitPress = useCallback(() => {
    if (gameState === 'playing') {
      Alert.alert(
        '게임 중단 🍉',
        '후르츠 닌자를 그만두시겠습니까?\n지금 나가면 보상이 저장되지 않습니다.',
        [
          { text: '계속하기', style: 'cancel' },
          {
            text: '나가기',
            style: 'destructive',
            onPress: () => {
              resetToReady();
              if (onClose) onClose();
            },
          },
        ]
      );
    } else {
      resetToReady();
      if (onClose) onClose();
    }
  }, [gameState, resetToReady, onClose]);

  // -----------------------------------------------------------------
  // Toss Fruit Wave (Arc Projectile Physics)
  // -----------------------------------------------------------------
  const tossWave = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    const stageWidth = screenWidthRef.current;
    const stageHeight = screenHeightRef.current;
    const cfg = GAME_CONFIG;

    const count = Math.floor(Math.random() * (cfg.batchSize[1] - cfg.batchSize[0] + 1)) + cfg.batchSize[0];

    for (let i = 0; i < count; i++) {
      const isBomb = Math.random() < cfg.bombChance;

      let fruitData;
      if (isBomb) {
        fruitData = { type: 'bomb', name: '시한폭탄', points: -50, size: 56, color: '#0F172A', isBomb: true };
      } else {
        const randIndex = Math.floor(Math.random() * FRUIT_TABLE.length);
        fruitData = FRUIT_TABLE[randIndex];
      }

      // Starting X position: somewhere across the bottom width
      const startX = 40 + Math.random() * (stageWidth - 80 - fruitData.size);
      const startY = stageHeight + 10; // below screen

      // Calculate vertical launch velocity so the fruit reaches high up into the screen
      // Target apex Y is between apexRatioMin and apexRatioMax of screen height (e.g. 18% ~ 35% from the top)
      const targetRatio = cfg.apexRatioMin + Math.random() * (cfg.apexRatioMax - cfg.apexRatioMin);
      const targetApexY = stageHeight * targetRatio;
      const targetRise = Math.max(250, startY - targetApexY);
      const speedY = Math.sqrt(2 * GRAVITY * targetRise);

      // Horizontal velocity: curve inward toward screen center
      const centerX = stageWidth / 2;
      const dirX = (centerX - startX) / (stageWidth / 2);
      const speedX = dirX * (2.2 + Math.random() * 2.6);

      const rotationSpeed = (Math.random() - 0.5) * 8.0;

      const newFruit = {
        id: `fruit_${Date.now()}_${Math.random()}`,
        x: startX,
        y: startY,
        vx: speedX,
        vy: -speedY,
        rotation: Math.random() * 360,
        rotationSpeed,
        ...fruitData,
      };

      fruitsRef.current.push(newFruit);
    }

    setFruits([...fruitsRef.current]);
  }, []);

  // -----------------------------------------------------------------
  // Slice Single Fruit
  // -----------------------------------------------------------------
  const sliceFruit = useCallback((fruit, sliceX, sliceY, sliceAngle) => {
    // 1. Bomb Explosion
    if (fruit.isBomb) {
      triggerShake();
      triggerToast('💥 콰광! 폭탄 폭발!', '#EF4444', sliceX, sliceY);
      setScore(s => Math.max(0, s - 50));
      comboRef.current = 0;
      setCombo(0);
      setLives(l => {
        const next = l - 1;
        if (next <= 0) {
          finishGame();
        }
        return Math.max(0, next);
      });
      return;
    }

    // 2. Pet Joy React & Eat
    Animated.sequence([
      Animated.timing(petBounce, { toValue: 1.25, duration: 60, useNativeDriver: false }),
      Animated.timing(petBounce, { toValue: 0.95, duration: 70, useNativeDriver: false }),
      Animated.timing(petBounce, { toValue: 1.0, duration: 60, useNativeDriver: false }),
    ]).start();

    // 3. Juice Splatter on Background
    const splashId = `splash_${Date.now()}_${Math.random()}`;
    setSplashes(prev => [
      ...prev.slice(-6),
      {
        id: splashId,
        x: sliceX,
        y: sliceY,
        color: fruit.splashColor || '#EF4444',
      },
    ]);
    setTimeout(() => {
      setSplashes(prev => prev.filter(s => s.id !== splashId));
    }, 1200);

    // 4. Create Sliced Halves flying apart
    const halfLeftId = `half_L_${Date.now()}_${Math.random()}`;
    const halfRightId = `half_R_${Date.now()}_${Math.random()}`;

    const halfLeft = {
      id: halfLeftId,
      type: fruit.type,
      size: fruit.size,
      isLeft: true,
      x: sliceX - fruit.size / 2,
      y: sliceY - fruit.size / 2,
      vx: -3.5 - Math.random() * 2.5,
      vy: -2.5 - Math.random() * 2,
      rotation: sliceAngle,
      rotSpeed: -14,
    };

    const halfRight = {
      id: halfRightId,
      type: fruit.type,
      size: fruit.size,
      isLeft: false,
      x: sliceX,
      y: sliceY - fruit.size / 2,
      vx: 3.5 + Math.random() * 2.5,
      vy: -2.5 - Math.random() * 2,
      rotation: sliceAngle,
      rotSpeed: 14,
    };

    halvesRef.current.push(halfLeft, halfRight);
    setHalves([...halvesRef.current]);

    // 5. Score & Stats
    setScore(s => s + fruit.points);
    setSlicedCount(c => c + 1);
    setFullness(f => Math.min(100, f + 4));
  }, [petBounce, triggerShake, triggerToast]);

  // -----------------------------------------------------------------
  // Process Continuous Blade Slash
  // -----------------------------------------------------------------
  const processBladeSlash = useCallback((currentX, currentY) => {
    if (gameStateRef.current !== 'playing') return;
    if (typeof currentX !== 'number' || typeof currentY !== 'number') return;

    // Track Blade Line Points
    const newPoint = { x: currentX, y: currentY, time: Date.now() };
    setSlashPoints(prev => [...prev.slice(-8), newPoint]);

    if (slashClearTimerRef.current) clearTimeout(slashClearTimerRef.current);
    slashClearTimerRef.current = setTimeout(() => {
      setSlashPoints([]);
      lastTouchPosRef.current = null;
    }, 160);

    const prevPos = lastTouchPosRef.current;
    lastTouchPosRef.current = { x: currentX, y: currentY };

    if (!prevPos) return;

    const dx = currentX - prevPos.x;
    const dy = currentY - prevPos.y;
    const moveDist = Math.hypot(dx, dy);
    if (moveDist < 6) return;

    const sliceAngle = Math.atan2(dy, dx) * (180 / Math.PI);

    // Collision Detection against active flying fruits
    const activeList = fruitsRef.current;
    const sliced = [];
    const remaining = [];

    for (let i = 0; i < activeList.length; i++) {
      const f = activeList[i];
      const cx = f.x + f.size / 2;
      const cy = f.y + f.size / 2;
      const dist = distToSegment(cx, cy, prevPos.x, prevPos.y, currentX, currentY);

      if (dist <= f.size * 0.6) {
        sliced.push(f);
      } else {
        remaining.push(f);
      }
    }

    if (sliced.length > 0) {
      fruitsRef.current = remaining;
      setFruits([...remaining]);

      // Combo Tracking
      const now = Date.now();
      const isQuick = now - lastSliceTimeRef.current < 900;
      lastSliceTimeRef.current = now;

      const nextCombo = isQuick ? comboRef.current + sliced.length : sliced.length;
      comboRef.current = nextCombo;
      setCombo(nextCombo);
      setMaxCombo(mc => Math.max(mc, nextCombo));

      // Multi-Slice Feedback
      if (sliced.length >= 3) {
        triggerToast(`🔥 COMBO x${sliced.length}! +50점`, '#EC4899', currentX, currentY);
        setScore(s => s + 50);
      } else if (sliced.length === 2) {
        triggerToast('⚡ DOUBLE SLICE! +20점', '#8B5CF6', currentX, currentY);
        setScore(s => s + 20);
      }

      // Slice each fruit
      sliced.forEach(f => {
        sliceFruit(f, f.x + f.size / 2, f.y + f.size / 2, sliceAngle);
      });
    }
  }, [sliceFruit, triggerToast]);

  // -----------------------------------------------------------------
  // Start / Finish Game
  // -----------------------------------------------------------------
  const finishGame = useCallback(() => {
    setGameState('gameover');
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (tossTimerRef.current) clearInterval(tossTimerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }, []);

  const startGame = useCallback(() => {
    setScore(0);
    setSlicedCount(0);
    setCombo(0);
    setMaxCombo(0);
    setLives(3);
    setFullness(0);
    comboRef.current = 0;
    setTimeLeft(GAME_DURATION);
    setFruits([]);
    setHalves([]);
    setSplashes([]);
    setToasts([]);
    setSlashPoints([]);
    fruitsRef.current = [];
    halvesRef.current = [];
    lastSliceTimeRef.current = 0;
    lastTouchPosRef.current = null;

    setGameState('playing');
  }, []);

  // -----------------------------------------------------------------
  // 60FPS Arc Physics Loop
  // -----------------------------------------------------------------
  useEffect(() => {
    if (gameState !== 'playing') return;

    let isRunning = true;

    const updatePhysics = () => {
      if (!isRunning || gameStateRef.current !== 'playing') return;

      const stageHeight = screenHeightRef.current;

      // 1. Update whole fruits (gravity + arc + rotation)
      const currentFruits = fruitsRef.current;
      const remainingFruits = [];

      for (let i = 0; i < currentFruits.length; i++) {
        const f = currentFruits[i];
        f.x += f.vx;
        f.y += f.vy;
        f.vy += GRAVITY;
        f.rotation += f.rotationSpeed;

        // Keep until falls below screen bottom
        if (f.y < stageHeight + 60) {
          remainingFruits.push(f);
        }
      }

      fruitsRef.current = remainingFruits;
      setFruits([...remainingFruits]);

      // 2. Update sliced halves (flying apart + spinning)
      const currentHalves = halvesRef.current;
      const remainingHalves = [];

      for (let i = 0; i < currentHalves.length; i++) {
        const h = currentHalves[i];
        h.x += h.vx;
        h.y += h.vy;
        h.vy += GRAVITY * 1.1;
        h.rotation += h.rotSpeed;

        if (h.y < stageHeight + 60) {
          remainingHalves.push(h);
        }
      }

      halvesRef.current = remainingHalves;
      setHalves([...remainingHalves]);

      animFrameRef.current = requestAnimationFrame(updatePhysics);
    };

    animFrameRef.current = requestAnimationFrame(updatePhysics);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState]);

  // -----------------------------------------------------------------
  // Toss Waves & Countdown Timer
  // -----------------------------------------------------------------
  useEffect(() => {
    if (gameState !== 'playing') return;

    const cfg = GAME_CONFIG;

    // Toss fruit waves periodically
    tossWave(); // Immediate first wave
    tossTimerRef.current = setInterval(() => {
      tossWave();
    }, cfg.tossInterval);

    // 1-second countdown
    gameTimerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          finishGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (tossTimerRef.current) clearInterval(tossTimerRef.current);
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    };
  }, [gameState, tossWave, finishGame]);

  // Evaluation Grade
  const getGameGrade = (finalScore, finalFullness) => {
    if (finalFullness >= 90 || finalScore >= 550) {
      return { grade: 'S', color: '#FAAD14', title: '전설의 후르츠 닌자 마스터! 👑' };
    }
    if (finalFullness >= 70 || finalScore >= 380) {
      return { grade: 'A', color: '#10B981', title: '배부른 과일 파티 🍉' };
    }
    if (finalFullness >= 45 || finalScore >= 220) {
      return { grade: 'B', color: '#0284C7', title: '달콤한 과일 간식 🍎' };
    }
    return { grade: 'C', color: '#94A3B8', title: '과일 썰기 입문자 🌱' };
  };

  const handleClaimAndClose = () => {
    const baseExp = Math.round(score / 12) + Math.round(fullness / 10);
    const finalExp = canEarnReward ? Math.max(15, Math.min(50, Math.round(baseExp * 1.3))) : 0;

    if (onGameComplete) {
      onGameComplete({
        score,
        slicedCount,
        fullness,
        exp: finalExp,
        isPractice: !canEarnReward,
        difficulty: 'normal',
      });
    }
    if (onClose) onClose();
  };

  if (!visible) return null;

  const currentGrade = getGameGrade(score, fullness);
  const slashPolylinePoints = slashPoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent={true}
      onRequestClose={handleExitPress}
    >
      <Animated.View
        style={[
          styles.gameContainer,
          { width: screenWidth, height: screenHeight },
          { transform: [{ translateX: screenShake }] },
        ]}
        // Mobile Touch Handlers
        onTouchStart={
          gameState === 'playing' ? (e) => processBladeSlash(e.nativeEvent.pageX, e.nativeEvent.pageY) : undefined
        }
        onTouchMove={
          gameState === 'playing' ? (e) => processBladeSlash(e.nativeEvent.pageX, e.nativeEvent.pageY) : undefined
        }
        onTouchEnd={() => {
          lastTouchPosRef.current = null;
          setSlashPoints([]);
        }}
        // Web Mouse Drag Handlers
        onMouseDown={
          gameState === 'playing'
            ? (e) => {
                const targetX = e.nativeEvent.pageX || e.clientX || 0;
                const targetY = e.nativeEvent.pageY || e.clientY || 0;
                processBladeSlash(targetX, targetY);
              }
            : undefined
        }
        onMouseMove={
          gameState === 'playing'
            ? (e) => {
                if (e.buttons === 1 || e.nativeEvent.which === 1) {
                  const targetX = e.nativeEvent.pageX || e.clientX || 0;
                  const targetY = e.nativeEvent.pageY || e.clientY || 0;
                  processBladeSlash(targetX, targetY);
                }
              }
            : undefined
        }
        onMouseUp={() => {
          lastTouchPosRef.current = null;
          setSlashPoints([]);
        }}
      >
        {/* Japanese Dojo / Wooden Cutting Board Theme Background */}
        <View style={styles.dojoBackgroundLayer} pointerEvents="none">
          <View style={styles.woodTextureBoard} />
        </View>

        {/* Juice Splatters on Cutting Board */}
        {splashes.map(sp => (
          <View
            key={sp.id}
            style={[styles.juiceSplatter, { left: sp.x - 35, top: sp.y - 35 }]}
            pointerEvents="none"
          >
            <Svg width="70" height="70" viewBox="0 0 70 70">
              <Circle cx="35" cy="35" r="22" fill={sp.color} opacity="0.35" />
              <Circle cx="20" cy="24" r="8" fill={sp.color} opacity="0.4" />
              <Circle cx="50" cy="40" r="10" fill={sp.color} opacity="0.38" />
              <Circle cx="44" cy="20" r="6" fill={sp.color} opacity="0.4" />
            </Svg>
          </View>
        ))}

        {/* --------------------------------------------------------- */}
        {/* TOP STATUS HUD BAR */}
        {/* --------------------------------------------------------- */}
        <View style={styles.topHudBar} pointerEvents="box-none">
          {/* Time Counter */}
          <View style={[styles.hudPill, timeLeft <= 5 && styles.hudPillUrgent]}>
            <Clock size={16} color={timeLeft <= 5 ? '#EF4444' : '#C2410C'} />
            <Text style={[styles.hudPillText, timeLeft <= 5 && { color: '#EF4444' }]}>
              {timeLeft}초
            </Text>
          </View>

          {/* Fullness Gauge */}
          <View style={styles.fullnessPill}>
            <Text style={styles.fullnessEmoji}>🍗</Text>
            <Text style={styles.fullnessText}>포만감 {fullness}%</Text>
            <View style={styles.fullnessBarBg}>
              <View style={[styles.fullnessBarFill, { width: `${fullness}%` }]} />
            </View>
          </View>

          {/* Score Counter */}
          <View style={[styles.hudPill, styles.hudPillScore]}>
            <Trophy size={16} color="#B45309" />
            <Text style={styles.scoreText}>{score}점</Text>
          </View>

          {/* Close Game Button */}
          <TouchableOpacity onPress={handleExitPress} style={styles.closeBtn} activeOpacity={0.8}>
            <X size={18} color="#475569" />
          </TouchableOpacity>
        </View>

        {/* Combo Badge */}
        <View style={styles.comboRow} pointerEvents="none">
          {combo >= 2 && (
            <View style={styles.comboBadge}>
              <Flame size={16} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.comboText}>COMBO x{combo}!</Text>
            </View>
          )}
        </View>

        {/* --------------------------------------------------------- */}
        {/* ACTIVE FLYING WHOLE FRUITS */}
        {/* --------------------------------------------------------- */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {fruits.map(fruit => (
            <View
              key={fruit.id}
              style={[
                styles.fruitWrapper,
                {
                  left: fruit.x,
                  top: fruit.y,
                  width: fruit.size,
                  height: fruit.size,
                  transform: [{ rotate: `${fruit.rotation}deg` }],
                },
              ]}
            >
              <FruitWholeRenderer type={fruit.type} size={fruit.size} />
            </View>
          ))}
        </View>

        {/* --------------------------------------------------------- */}
        {/* SLICED FRUIT HALVES (FLYING APART) */}
        {/* --------------------------------------------------------- */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {halves.map(half => (
            <View
              key={half.id}
              style={[
                styles.halfWrapper,
                {
                  left: half.x,
                  top: half.y,
                  transform: [{ rotate: `${half.rotation}deg` }],
                },
              ]}
            >
              <FruitHalfRenderer type={half.type} size={half.size} isLeft={half.isLeft} />
            </View>
          ))}
        </View>

        {/* --------------------------------------------------------- */}
        {/* NEON BLADE SLASH TRAIL */}
        {/* --------------------------------------------------------- */}
        {slashPoints.length >= 2 && (
          <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
            {/* Outer Laser Glow */}
            <Polyline
              points={slashPolylinePoints}
              fill="none"
              stroke="#F59E0B"
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="0.45"
            />
            {/* Inner White Core Blade */}
            <Polyline
              points={slashPolylinePoints}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="0.95"
            />
          </Svg>
        )}

        {/* --------------------------------------------------------- */}
        {/* BOTTOM PETMONG RECEIVER (EATING ANIMATION) */}
        {/* --------------------------------------------------------- */}
        <View style={styles.bottomPetStage} pointerEvents="none">
          <Animated.View
            style={[
              styles.petBox,
              { transform: [{ scale: petBounce }] },
            ]}
          >
            {character?.image_url ? (
              <ExpoImage
                source={{ uri: transparentUrl || character.image_url }}
                style={styles.petImageSprite}
                contentFit="contain"
              />
            ) : (
              <Text style={styles.petEmojiSprite}>{character?.emoji || '🐶'}</Text>
            )}
            <View style={styles.petBowlContainer}>
              <Text style={styles.petBowlText}>와구와구 냠냠! 🍽️</Text>
            </View>
          </Animated.View>
        </View>

        {/* Floating Toasts */}
        {toasts.map(toast => (
          <View
            key={toast.id}
            style={[styles.floatingToast, { left: toast.x, top: toast.y }]}
            pointerEvents="none"
          >
            <Text style={[styles.floatingToastText, { color: toast.color }]}>
              {toast.text}
            </Text>
          </View>
        ))}

        {/* --------------------------------------------------------- */}
        {/* 1. READY OVERLAY */}
        {/* --------------------------------------------------------- */}
        {gameState === 'ready' && (
          <View style={[styles.overlayCenter, { width: screenWidth, height: screenHeight }]}>
            <View style={styles.readyCard}>
              <View style={styles.readyBadgeRow}>
                <View style={styles.gameNoBadge}>
                  <Text style={styles.gameNoBadgeText}>제1탄 미니게임</Text>
                </View>
                <View style={styles.categoryBadge}>
                  <Sword size={14} color="#EA580C" style={{ marginRight: 3 }} />
                  <Text style={styles.categoryBadgeText}>후르츠 닌자</Text>
                </View>
              </View>

              <Text style={styles.readyTitle}>🍉 반려몽 후르츠 닌자</Text>
              <Text style={styles.readySubtitle}>
                솟구쳐 오르는 수박과 과일을 샥- 썰어서 반려몽에게 배부르게 먹여주세요!
              </Text>

              {/* Fruit Previews */}
              <View style={styles.readyPreviewBox}>
                <View style={styles.readyFruitItem}>
                  <WatermelonWhole size={36} />
                  <Text style={styles.readyFruitLabel}>대왕 수박</Text>
                  <Text style={styles.readyFruitPoints}>+30점</Text>
                </View>
                <View style={styles.readyFruitItem}>
                  <AppleWhole size={32} />
                  <Text style={styles.readyFruitLabel}>사과</Text>
                  <Text style={styles.readyFruitPoints}>+15점</Text>
                </View>
                <View style={styles.readyFruitItem}>
                  <PineappleWhole size={34} />
                  <Text style={styles.readyFruitLabel}>황금 파인애플</Text>
                  <Text style={[styles.readyFruitPoints, { color: '#D97706' }]}>+50점</Text>
                </View>
                <View style={styles.readyFruitItem}>
                  <TickingBombIcon size={34} />
                  <Text style={styles.readyFruitLabel}>시한폭탄</Text>
                  <Text style={[styles.readyFruitPoints, { color: '#EF4444' }]}>회피! (-50)</Text>
                </View>
              </View>

              {/* Instructions */}
              <View style={styles.instructionsList}>
                <View style={styles.instructionItem}>
                  <Sword size={16} color="#EA580C" style={{ marginRight: 8 }} />
                  <Text style={styles.instructionText}>
                    손가락으로 화면을 긁어 솟구치는 과일을 단칼에 싹둑 썰어보세요!
                  </Text>
                </View>
                <View style={styles.instructionItem}>
                  <Flame size={16} color="#EA580C" style={{ marginRight: 8 }} />
                  <Text style={styles.instructionText}>
                    한 번의 칼질에 여러 과일을 동시에 베면 콤보 보너스 획득!
                  </Text>
                </View>
              </View>

              {/* Start Button */}
              <TouchableOpacity
                style={styles.startButton}
                onPress={startGame}
                activeOpacity={0.85}
              >
                <Play size={18} color="#FFF" fill="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.startButtonText}>닌자 출격 (START)</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* --------------------------------------------------------- */}
        {/* 2. GAME OVER / RESULT OVERLAY */}
        {/* --------------------------------------------------------- */}
        {gameState === 'gameover' && (
          <View style={[styles.overlayCenter, { width: screenWidth, height: screenHeight }]}>
            <View style={styles.resultCard}>
              <View style={[styles.gradeCircle, { borderColor: currentGrade.color }]}>
                <Text style={[styles.gradeText, { color: currentGrade.color }]}>
                  {currentGrade.grade}
                </Text>
              </View>

              <Text style={styles.resultTitle}>{currentGrade.title}</Text>
              <Text style={styles.resultSubtitle}>
                {character?.name || '반려몽'}이 맛있는 과일들을 배부르게 먹고 행복해해요!
              </Text>

              {/* Stats */}
              <View style={styles.resultStatsRow}>
                <View style={styles.resultStatBox}>
                  <Text style={styles.resultStatLabel}>최종 점수</Text>
                  <Text style={styles.resultStatValue}>{score}점</Text>
                </View>
                <View style={styles.resultStatBox}>
                  <Text style={styles.resultStatLabel}>썬 과일</Text>
                  <Text style={styles.resultStatValue}>{slicedCount}개</Text>
                </View>
                <View style={styles.resultStatBox}>
                  <Text style={styles.resultStatLabel}>최대 콤보</Text>
                  <Text style={[styles.resultStatValue, { color: '#EA580C' }]}>{maxCombo}회</Text>
                </View>
              </View>

              {/* Rewards Box */}
              <View style={styles.rewardBox}>
                <Text style={styles.rewardBoxTitle}>
                  {canEarnReward ? '🎉 미니게임 완료 보상' : '🎯 자유 연습 모드 기록'}
                </Text>
                <View style={styles.rewardRow}>
                  {canEarnReward ? (
                    <View style={styles.rewardPill}>
                      <Trophy size={16} color="#D48806" style={{ marginRight: 6 }} />
                      <View>
                        <Text style={[styles.rewardPillText, { fontWeight: '800', color: '#B45309' }]}>
                          성장 경험치 +{Math.max(15, Math.min(50, Math.round((Math.round(score / 12) + Math.round(fullness / 10)) * 1.3)))} EXP 획득! 🌱
                        </Text>
                        <Text style={{ fontSize: 11, color: '#92400E', marginTop: 2, fontWeight: '600' }}>
                          오늘 내 남은 성장 보상: {remainingRewards}회
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View style={[styles.rewardPill, { backgroundColor: '#F5F0E8' }]}>
                      <Gamepad2 size={16} color="#78716C" style={{ marginRight: 6 }} />
                      <View>
                        <Text style={[styles.rewardPillText, { fontWeight: '800', color: '#44403C' }]}>
                          자유 연습 모드 완료! (EXP +0)
                        </Text>
                        <Text style={{ fontSize: 11, color: '#78716C', marginTop: 2, fontWeight: '600' }}>
                          오늘의 성장 보상 한도를 달성했습니다.
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Buttons */}
              <View style={styles.resultBtnRow}>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={startGame}
                  activeOpacity={0.85}
                >
                  <RotateCcw size={16} color="#475569" />
                  <Text style={styles.retryBtnText}>다시하기</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.claimBtn}
                  onPress={handleClaimAndClose}
                  activeOpacity={0.85}
                >
                  <Check size={16} color="#FFF" />
                  <Text style={styles.claimBtnText}>확인</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

// -----------------------------------------------------------------
// Styles
// -----------------------------------------------------------------
const styles = StyleSheet.create({
  gameContainer: {
    flex: 1,
    backgroundColor: '#1C1917',
    overflow: 'hidden',
  },
  dojoBackgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#292524',
  },
  woodTextureBoard: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#44403C',
    opacity: 0.15,
  },
  juiceSplatter: {
    position: 'absolute',
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topHudBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 36,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 30,
  },
  hudPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    gap: 6,
  },
  hudPillUrgent: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  hudPillText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#C2410C',
  },
  hudPillScore: {
    backgroundColor: '#FEF3C7',
  },
  scoreText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#B45309',
  },
  fullnessPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  fullnessEmoji: {
    fontSize: 14,
  },
  fullnessText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
  },
  fullnessBarBg: {
    width: 60,
    height: 8,
    backgroundColor: '#E7E5E4',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fullnessBarFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comboRow: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 108 : 90,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 25,
  },
  comboBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EA580C',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  comboText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
  },
  fruitWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  halfWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomPetStage: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  petBox: {
    alignItems: 'center',
  },
  petImageSprite: {
    width: 90,
    height: 90,
  },
  petEmojiSprite: {
    fontSize: 65,
  },
  petBowlContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  petBowlText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
  },
  floatingToast: {
    position: 'absolute',
    backgroundColor: 'rgba(28, 25, 23, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 35,
  },
  floatingToastText: {
    fontSize: 13,
    fontWeight: '800',
  },
  overlayCenter: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 50,
  },
  readyCard: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  readyBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  gameNoBadge: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  gameNoBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C2410C',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EA580C',
  },
  readyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1C1917',
    marginBottom: 6,
    textAlign: 'center',
  },
  readySubtitle: {
    fontSize: 13,
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  readyPreviewBox: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#FAFAF9',
    borderRadius: 16,
    padding: 12,
    justifyContent: 'space-around',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  readyFruitItem: {
    alignItems: 'center',
    gap: 4,
  },
  readyFruitLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#57534E',
  },
  readyFruitPoints: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EA580C',
  },
  instructionsList: {
    width: '100%',
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructionText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#9A3412',
    lineHeight: 16,
  },
  startButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EA580C',
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  resultCard: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  gradeCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
  },
  gradeText: {
    fontSize: 38,
    fontWeight: '900',
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1C1917',
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 13,
    color: '#78716C',
    textAlign: 'center',
    marginBottom: 18,
  },
  resultStatsRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  resultStatBox: {
    flex: 1,
    backgroundColor: '#FAFAF9',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  resultStatLabel: {
    fontSize: 11,
    color: '#78716C',
    marginBottom: 4,
  },
  resultStatValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1C1917',
  },
  rewardBox: {
    width: '100%',
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFEDD5',
    marginBottom: 20,
  },
  rewardBoxTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#C2410C',
    marginBottom: 8,
    textAlign: 'center',
  },
  rewardRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9A3412',
  },
  resultBtnRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  retryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F4',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 6,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#57534E',
  },
  claimBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EA580C',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 6,
  },
  claimBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
});
