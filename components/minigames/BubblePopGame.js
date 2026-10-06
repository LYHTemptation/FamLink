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
import Svg, { Circle, Path, Defs, RadialGradient, Stop, Line } from 'react-native-svg';
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
  Droplets,
  Zap,
  ArrowDown,
} from 'lucide-react-native';

const { width: INITIAL_WIDTH, height: INITIAL_HEIGHT } = Dimensions.get('window');

// -----------------------------------------------------------------
// 9-Tier Bubble Evolution Hierarchy (Suika / Watermelon Style)
// -----------------------------------------------------------------
export const BUBBLE_TIERS = [
  { level: 1, name: '미니 방울', radius: 18, color: '#38BDF8', stroke: '#0284C7', points: 4, emoji: '💧' },
  { level: 2, name: '아기 거품', radius: 24, color: '#A7F3D0', stroke: '#059669', points: 8, emoji: '🫧' },
  { level: 3, name: '향기 비누', radius: 30, color: '#FDE047', stroke: '#D97706', points: 16, emoji: '🧼' },
  { level: 4, name: '꽃잎 스파', radius: 37, color: '#F472B6', stroke: '#DB2777', points: 32, emoji: '🌸' },
  { level: 5, name: '레몬 버블', radius: 45, color: '#FBBF24', stroke: '#B45309', points: 64, emoji: '🍋' },
  { level: 6, name: '라벤더 팝', radius: 54, color: '#C084FC', stroke: '#7E22CE', points: 128, emoji: '🍇' },
  { level: 7, name: '골든 크라운', radius: 64, color: '#F59E0B', stroke: '#B45309', points: 256, emoji: '👑' },
  { level: 8, name: '크리스탈 젬', radius: 75, color: '#2DD4BF', stroke: '#0F766E', points: 512, emoji: '💎' },
  { level: 9, name: '대왕 무지개', radius: 88, color: '#EC4899', stroke: '#BE185D', points: 1000, emoji: '🌈' },
];

function BubbleSphere({ tier, radius, scaleAnim = null }) {
  const r = radius || tier.radius;
  const size = r * 2;

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        transform: scaleAnim ? [{ scale: scaleAnim }] : undefined,
      }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id={`bubble_grad_${tier.level}`} cx="32%" cy="30%" r="68%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <Stop offset="45%" stopColor={tier.color} stopOpacity="0.5" />
            <Stop offset="100%" stopColor={tier.stroke} stopOpacity="0.9" />
          </RadialGradient>
        </Defs>

        {/* Outer Glowing Bubble Sphere */}
        <Circle
          cx={r}
          cy={r}
          r={r - 2}
          fill={`url(#bubble_grad_${tier.level})`}
          stroke={tier.stroke}
          strokeWidth="2.5"
        />

        {/* 3D Glass Crescent Specular Highlight */}
        <Path
          d={`M ${r * 0.45} ${r * 0.3} A ${r * 0.65} ${r * 0.65} 0 0 1 ${r * 1.5} ${r * 0.65}`}
          stroke="#FFFFFF"
          strokeWidth={Math.max(2, r * 0.1)}
          strokeLinecap="round"
          fill="none"
          opacity="0.85"
        />

        {/* Small Specular Highlight Dot */}
        <Circle cx={r * 0.42} cy={r * 0.42} r={Math.max(1.8, r * 0.08)} fill="#FFFFFF" opacity="0.9" />
      </Svg>

      {/* Center Fruit / Emoji Icon */}
      <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
        <Text style={{ fontSize: Math.max(13, r * 0.68) }}>{tier.emoji}</Text>
      </View>
    </Animated.View>
  );
}

// -----------------------------------------------------------------
// Physics Constants
// -----------------------------------------------------------------
const GRAVITY = 0.45;
const RESTITUTION = 0.28; // Bounciness
const DAMPING = 0.985; // Air friction
const GAME_DURATION = 60; // 60 seconds

export default function BubblePopGame({
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
  const [mergeCount, setMergeCount] = useState(0);
  const [highestLevel, setHighestLevel] = useState(1);
  const [cleanliness, setCleanliness] = useState(0); // 0% ~ 100%

  // Current Dropping Bubble & Next Preview
  const [currentTierIndex, setCurrentTierIndex] = useState(0);
  const [nextTierIndex, setNextTierIndex] = useState(1);
  const [dropperX, setDropperX] = useState(INITIAL_WIDTH / 2);
  const [canDrop, setCanDrop] = useState(true);

  // Active Bubbles in Tub
  const [bubbles, setBubbles] = useState([]);
  const [particles, setParticles] = useState([]);
  const [toasts, setToasts] = useState([]);

  // Bathtub Container Dimensions
  const tubPadding = 24;
  const tubTop = 130;
  const tubBottom = screenHeight - (Platform.OS === 'ios' ? 120 : 90);
  const tubLeft = tubPadding;
  const tubRight = screenWidth - tubPadding;
  const tubWidth = tubRight - tubLeft;
  const dangerLineY = tubTop + 55;

  // Animation values
  const petBounce = useRef(new Animated.Value(1)).current;

  // Refs for 60fps Physics Loop
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const bubblesRef = useRef([]);
  const canDropRef = useRef(true);
  canDropRef.current = canDrop;

  const dropperXRef = useRef(dropperX);
  dropperXRef.current = dropperX;

  const currentTierIndexRef = useRef(currentTierIndex);
  currentTierIndexRef.current = currentTierIndex;

  const dangerTimerRef = useRef(0);
  const animFrameRef = useRef(null);
  const gameTimerRef = useRef(null);

  // Trigger Score / Message Toast
  const triggerToast = useCallback((text, color = '#38BDF8', x = null, y = null) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    const toastX = x !== null ? Math.max(20, Math.min(screenWidth - 140, x - 50)) : screenWidth / 2 - 60;
    const toastY = y !== null ? Math.max(90, Math.min(screenHeight - 180, y - 30)) : screenHeight / 2;

    setToasts(prev => [...prev.slice(-4), { id, text, color, x: toastX, y: toastY }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 850);
  }, [screenWidth, screenHeight]);

  // Clean Reset
  const resetToReady = useCallback(() => {
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    bubblesRef.current = [];
    setBubbles([]);
    setParticles([]);
    setToasts([]);
    setCanDrop(true);
    dangerTimerRef.current = 0;
    setGameState('ready');
  }, []);

  const handleExitPress = useCallback(() => {
    if (gameState === 'playing') {
      Alert.alert(
        '게임 중단 🫧',
        '비누방울 머지를 그만두시겠습니까?\n지금 나가면 보상이 저장되지 않습니다.',
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

  // Pick Random Tier for Dropper (Level 1~3, or rare Lv 4)
  const getRandomDropTier = useCallback(() => {
    const rand = Math.random();
    if (rand < 0.45) return 0; // Lv 1
    if (rand < 0.8) return 1; // Lv 2
    if (rand > 0.94) return 3; // Lv 4 (rare)
    return 2; // Lv 3
  }, []);

  // -----------------------------------------------------------------
  // Drop Active Bubble into Tub
  // -----------------------------------------------------------------
  const dropBubble = useCallback(() => {
    if (!canDropRef.current || gameStateRef.current !== 'playing') return;

    setCanDrop(false);
    canDropRef.current = false;

    const tier = BUBBLE_TIERS[currentTierIndexRef.current];
    const spawnX = Math.max(tubLeft + tier.radius, Math.min(tubRight - tier.radius, dropperXRef.current));
    const spawnY = tubTop + 20;

    const newBubble = {
      id: `b_${Date.now()}_${Math.random()}`,
      level: tier.level,
      x: spawnX,
      y: spawnY,
      vx: (Math.random() - 0.5) * 0.4,
      vy: 1.5,
      radius: tier.radius,
      tier,
    };

    bubblesRef.current.push(newBubble);
    setBubbles([...bubblesRef.current]);

    // Pet joyful bounce
    Animated.sequence([
      Animated.timing(petBounce, { toValue: 1.15, duration: 80, useNativeDriver: true }),
      Animated.timing(petBounce, { toValue: 1.0, duration: 80, useNativeDriver: true }),
    ]).start();

    // Prepare Next Dropper Bubble after short delay
    setTimeout(() => {
      setCurrentTierIndex(nextTierIndex);
      setNextTierIndex(getRandomDropTier());
      setCanDrop(true);
      canDropRef.current = true;
    }, 450);
  }, [tubLeft, tubRight, tubTop, nextTierIndex, getRandomDropTier, petBounce]);

  // -----------------------------------------------------------------
  // Merge Animation & Score Award
  // -----------------------------------------------------------------
  const handleMerge = useCallback((b1, b2, newLevel) => {
    const midX = (b1.x + b2.x) / 2;
    const midY = (b1.y + b2.y) / 2;
    const nextTier = BUBBLE_TIERS[newLevel - 1];

    // Splash Particles
    const pId = `p_${Date.now()}_${Math.random()}`;
    setParticles(prev => [
      ...prev.slice(-6),
      { id: pId, x: midX, y: midY, color: nextTier.color, size: nextTier.radius * 2 },
    ]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== pId));
    }, 450);

    // Score & Cleanliness Increase
    setScore(s => s + nextTier.points);
    setMergeCount(m => m + 1);
    setHighestLevel(hl => Math.max(hl, newLevel));
    setCleanliness(c => Math.min(100, c + Math.round(newLevel * 1.8)));

    if (newLevel >= 7) {
      triggerToast(`✨ 대박! [${nextTier.name}] 완성! +${nextTier.points}`, nextTier.stroke, midX, midY);
    } else {
      triggerToast(`+${nextTier.points}`, nextTier.stroke, midX, midY);
    }

    // Spawn merged bigger bubble
    return {
      id: `b_merged_${Date.now()}_${Math.random()}`,
      level: newLevel,
      x: midX,
      y: midY,
      vx: (b1.vx + b2.vx) * 0.4,
      vy: (b1.vy + b2.vy) * 0.4 - 1.2, // Pop up slightly
      radius: nextTier.radius,
      tier: nextTier,
    };
  }, [triggerToast]);

  // -----------------------------------------------------------------
  // 60FPS Physics Simulation Loop (Circle-Circle Collision & Gravity)
  // -----------------------------------------------------------------
  useEffect(() => {
    if (gameState !== 'playing') return;

    let isRunning = true;

    const updatePhysics = () => {
      if (!isRunning || gameStateRef.current !== 'playing') return;

      const active = bubblesRef.current;
      const len = active.length;

      // 1. Apply Gravity & Velocity
      for (let i = 0; i < len; i++) {
        const b = active[i];
        b.vy += GRAVITY;
        b.vx *= DAMPING;
        b.vy *= DAMPING;
        b.x += b.vx;
        b.y += b.vy;

        // Tub Left & Right Wall Boundaries
        if (b.x - b.radius < tubLeft) {
          b.x = tubLeft + b.radius;
          b.vx = -b.vx * RESTITUTION;
        } else if (b.x + b.radius > tubRight) {
          b.x = tubRight - b.radius;
          b.vx = -b.vx * RESTITUTION;
        }

        // Tub Bottom Boundary
        if (b.y + b.radius > tubBottom) {
          b.y = tubBottom - b.radius;
          b.vy = -b.vy * RESTITUTION;
          // Apply friction on tub floor
          b.vx *= 0.88;
        }
      }

      // 2. Circle-Circle Collision & Merge Check (Multiple iterations for stability)
      const toRemove = new Set();
      const toAdd = [];

      for (let iter = 0; iter < 4; iter++) {
        for (let i = 0; i < len; i++) {
          if (toRemove.has(active[i].id)) continue;
          for (let j = i + 1; j < len; j++) {
            if (toRemove.has(active[j].id)) continue;

            const b1 = active[i];
            const b2 = active[j];

            const dx = b2.x - b1.x;
            const dy = b2.y - b1.y;
            const dist = Math.hypot(dx, dy);
            const minDist = b1.radius + b2.radius;

            if (dist < minDist && dist > 0) {
              // Check Same Level Merge (If not already at max level 9)
              if (b1.level === b2.level && b1.level < 9 && iter === 0) {
                toRemove.add(b1.id);
                toRemove.add(b2.id);
                const merged = handleMerge(b1, b2, b1.level + 1);
                toAdd.push(merged);
                break;
              }

              // Normal Elastic Collision Push-Apart
              const overlap = (minDist - dist) * 0.5;
              const nx = dx / dist;
              const ny = dy / dist;

              b1.x -= nx * overlap;
              b1.y -= ny * overlap;
              b2.x += nx * overlap;
              b2.y += ny * overlap;

              // Exchange impulse
              const kx = b1.vx - b2.vx;
              const ky = b1.vy - b2.vy;
              const p = 2 * (nx * kx + ny * ky) / (b1.radius + b2.radius);

              b1.vx -= p * b2.radius * nx * RESTITUTION;
              b1.vy -= p * b2.radius * ny * RESTITUTION;
              b2.vx += p * b1.radius * nx * RESTITUTION;
              b2.vy += p * b1.radius * ny * RESTITUTION;
            }
          }
        }
      }

      // Filter merged bubbles
      if (toRemove.size > 0 || toAdd.length > 0) {
        bubblesRef.current = [
          ...active.filter(b => !toRemove.has(b.id)),
          ...toAdd,
        ];
      }

      setBubbles([...bubblesRef.current]);

      // 3. Danger Overflow Check (Bubbles resting above danger line)
      let isOverflowing = false;
      for (let i = 0; i < bubblesRef.current.length; i++) {
        const b = bubblesRef.current[i];
        if (b.y - b.radius < dangerLineY && Math.abs(b.vy) < 0.8) {
          isOverflowing = true;
          break;
        }
      }

      if (isOverflowing) {
        dangerTimerRef.current += 1;
        if (dangerTimerRef.current > 180) { // Overflown for ~3 seconds
          finishGame();
          return;
        }
      } else {
        dangerTimerRef.current = Math.max(0, dangerTimerRef.current - 1);
      }

      animFrameRef.current = requestAnimationFrame(updatePhysics);
    };

    animFrameRef.current = requestAnimationFrame(updatePhysics);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, tubLeft, tubRight, tubBottom, dangerLineY, handleMerge]);

  // -----------------------------------------------------------------
  // Countdown Timer
  // -----------------------------------------------------------------
  const finishGame = useCallback(() => {
    setGameState('gameover');
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }, []);

  const startGame = useCallback(() => {
    setScore(0);
    setMergeCount(0);
    setHighestLevel(1);
    setCleanliness(0);
    setTimeLeft(GAME_DURATION);
    bubblesRef.current = [];
    setBubbles([]);
    setParticles([]);
    setToasts([]);
    setCurrentTierIndex(0);
    setNextTierIndex(1);
    setCanDrop(true);
    canDropRef.current = true;
    dangerTimerRef.current = 0;

    setGameState('playing');
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') return;

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
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    };
  }, [gameState, finishGame]);

  // Handle Touch/Mouse Drag to aim dropper
  const handleAimMove = (pageX) => {
    if (gameStateRef.current !== 'playing') return;
    const currentTier = BUBBLE_TIERS[currentTierIndex];
    const clamped = Math.max(tubLeft + currentTier.radius, Math.min(tubRight - currentTier.radius, pageX));
    setDropperX(clamped);
  };

  // Evaluation Grade
  const getGameGrade = (finalScore, finalCleanliness) => {
    if (finalCleanliness >= 80 || finalScore >= 800) {
      return { grade: 'S', color: '#FAAD14', title: '무지개 버블 마스터! 👑' };
    }
    if (finalCleanliness >= 55 || finalScore >= 500) {
      return { grade: 'A', color: '#10B981', title: '향기 가득 목욕 스파 🫧' };
    }
    if (finalCleanliness >= 35 || finalScore >= 250) {
      return { grade: 'B', color: '#0284C7', title: '개운한 비누 거품 🧼' };
    }
    return { grade: 'C', color: '#94A3B8', title: '비누방울 입문자 🌱' };
  };

  const handleClaimAndClose = () => {
    const baseExp = Math.round(score / 15) + Math.round(cleanliness / 8);
    const finalExp = canEarnReward ? Math.max(15, Math.min(50, Math.round(baseExp * 1.3))) : 0;

    if (onGameComplete) {
      onGameComplete({
        score,
        mergeCount,
        cleanliness,
        exp: finalExp,
        isPractice: !canEarnReward,
        difficulty: 'normal',
      });
    }
    if (onClose) onClose();
  };

  if (!visible) return null;

  const currentGrade = getGameGrade(score, cleanliness);
  const currentDropperTier = BUBBLE_TIERS[currentTierIndex];
  const nextPreviewTier = BUBBLE_TIERS[nextTierIndex];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent={true}
      onRequestClose={handleExitPress}
    >
      <View
        style={[styles.gameContainer, { width: screenWidth, height: screenHeight }]}
        onTouchMove={(e) => handleAimMove(e.nativeEvent.pageX)}
        onTouchEnd={() => dropBubble()}
        onMouseMove={(e) => {
          const x = e.nativeEvent.pageX || e.clientX || 0;
          handleAimMove(x);
        }}
        onMouseUp={() => dropBubble()}
      >
        {/* Soft Cozy Bathroom Atmosphere Background */}
        <View style={styles.bathBackgroundLayer} pointerEvents="none">
          <View style={styles.foamSudsWave} />
        </View>

        {/* --------------------------------------------------------- */}
        {/* TOP STATUS HUD BAR */}
        {/* --------------------------------------------------------- */}
        <View style={styles.topHudBar} pointerEvents="box-none">
          {/* Time Counter */}
          <View style={[styles.hudPill, timeLeft <= 10 && styles.hudPillUrgent]}>
            <Clock size={16} color={timeLeft <= 10 ? '#EF4444' : '#0284C7'} />
            <Text style={[styles.hudPillText, timeLeft <= 10 && { color: '#EF4444' }]}>
              {timeLeft}초
            </Text>
          </View>

          {/* Cleanliness Progress Pill */}
          <View style={styles.cleanlinessPill}>
            <Droplets size={16} color="#06B6D4" style={{ marginRight: 4 }} />
            <Text style={styles.cleanlinessText}>청결도 {cleanliness}%</Text>
            <View style={styles.cleanlinessBarBg}>
              <View style={[styles.cleanlinessBarFill, { width: `${cleanliness}%` }]} />
            </View>
          </View>

          {/* Score Counter */}
          <View style={[styles.hudPill, styles.hudPillScore]}>
            <Trophy size={16} color="#D48806" />
            <Text style={styles.scoreText}>{score}점</Text>
          </View>

          {/* Close Game Button */}
          <TouchableOpacity onPress={handleExitPress} style={styles.closeBtn} activeOpacity={0.8}>
            <X size={18} color="#475569" />
          </TouchableOpacity>
        </View>

        {/* Next Bubble Preview Badge */}
        <View style={styles.nextPreviewRow} pointerEvents="none">
          <View style={styles.nextPreviewBadge}>
            <Text style={styles.nextPreviewLabel}>다음 버블</Text>
            <Text style={{ fontSize: 16 }}>{nextPreviewTier.emoji}</Text>
          </View>
        </View>

        {/* --------------------------------------------------------- */}
        {/* BATHTUB CONTAINER CONTAINER (SUIKA BOX) */}
        {/* --------------------------------------------------------- */}
        <View
          style={[
            styles.bathtubBox,
            {
              left: tubLeft,
              top: tubTop,
              width: tubWidth,
              height: tubBottom - tubTop,
            },
          ]}
          pointerEvents="none"
        >
          {/* Glass Bath Back Wall */}
          <View style={styles.bathtubGlassBack} />

          {/* Danger Line (Top overflow warning) */}
          <View style={[styles.dangerLine, { top: dangerLineY - tubTop }]}>
            <Text style={styles.dangerLineText}>⚠️ 넘침 주의 (DANGER)</Text>
          </View>

          {/* Bottom Water Foam Layer */}
          <View style={styles.tubFloorWater}>
            <Text style={styles.tubWaterLabel}>따뜻한 아로마 입욕제 🫧</Text>
          </View>
        </View>

        {/* --------------------------------------------------------- */}
        {/* DROPPER AIM & CURRENT BUBBLE */}
        {/* --------------------------------------------------------- */}
        {gameState === 'playing' && canDrop && (
          <View
            style={[
              styles.dropperContainer,
              { left: dropperX - currentDropperTier.radius, top: tubTop - currentDropperTier.radius - 8 },
            ]}
            pointerEvents="none"
          >
            {/* Vertical Laser Aim Line */}
            <View
              style={[
                styles.aimGuideLine,
                {
                  left: currentDropperTier.radius - 1,
                  height: tubBottom - tubTop + 20,
                },
              ]}
            />
            {/* Dropper Bubble */}
            <BubbleSphere tier={currentDropperTier} radius={currentDropperTier.radius} />
            <ArrowDown size={14} color="#0284C7" style={styles.dropIndicatorArrow} />
          </View>
        )}

        {/* --------------------------------------------------------- */}
        {/* ACTIVE PHYSICS BUBBLES IN BATHTUB */}
        {/* --------------------------------------------------------- */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {bubbles.map(b => (
            <View
              key={b.id}
              style={[
                styles.physicsBubbleWrapper,
                {
                  left: b.x - b.radius,
                  top: b.y - b.radius,
                },
              ]}
            >
              <BubbleSphere tier={b.tier} radius={b.radius} />
            </View>
          ))}
        </View>

        {/* --------------------------------------------------------- */}
        {/* MERGE SPLASH PARTICLES */}
        {/* --------------------------------------------------------- */}
        {particles.map(p => (
          <View
            key={p.id}
            style={[
              styles.particleSplash,
              { left: p.x - p.size / 2, top: p.y - p.size / 2, width: p.size, height: p.size },
            ]}
            pointerEvents="none"
          >
            <Sparkles size={Math.max(24, p.size * 0.45)} color="#FFF" />
          </View>
        ))}

        {/* --------------------------------------------------------- */}
        {/* PETMONG REACTION IN BATH (BOTTOM RIGHT) */}
        {/* --------------------------------------------------------- */}
        <View style={styles.bottomPetStage} pointerEvents="none">
          <Animated.View style={[styles.petBox, { transform: [{ scale: petBounce }] }]}>
            {character?.image_url ? (
              <ExpoImage
                source={{ uri: transparentUrl || character.image_url }}
                style={styles.petImageSprite}
                contentFit="contain"
              />
            ) : (
              <Text style={styles.petEmojiSprite}>{character?.emoji || '🐶'}</Text>
            )}
            <View style={styles.petSoapHat}>
              <Text style={{ fontSize: 16 }}>🫧</Text>
            </View>
          </Animated.View>
        </View>

        {/* Floating Score Toasts */}
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
                  <Text style={styles.gameNoBadgeText}>제3탄 미니게임</Text>
                </View>
                <View style={styles.categoryBadge}>
                  <Droplets size={14} color="#0D9488" fill="#0D9488" style={{ marginRight: 3 }} />
                  <Text style={styles.categoryBadgeText}>목욕하기</Text>
                </View>
              </View>

              <Text style={styles.readyTitle}>🫧 비누방울 머지 (Bubble Merge)</Text>
              <Text style={styles.readySubtitle}>
                수박게임 스타일! 같은 비누방울을 떨어뜨려 합치면 더 큰 무지개 거품으로 퐁퐁 진화해요!
              </Text>

              {/* Evolution Tree Preview */}
              <View style={styles.evolutionPreviewBox}>
                <Text style={styles.evolutionTitle}>✨ 버블 진화 트리 (Evolution)</Text>
                <View style={styles.evolutionRow}>
                  {BUBBLE_TIERS.slice(0, 5).map((t, i) => (
                    <React.Fragment key={t.level}>
                      <View style={styles.evoNode}>
                        <BubbleSphere tier={t} radius={14} />
                        <Text style={styles.evoLabel}>Lv.{t.level}</Text>
                      </View>
                      {i < 4 && <Text style={styles.evoArrow}>→</Text>}
                    </React.Fragment>
                  ))}
                  <Text style={styles.evoEllipsis}>… 🌈</Text>
                </View>
              </View>

              {/* Instructions */}
              <View style={styles.instructionsList}>
                <View style={styles.instructionItem}>
                  <ArrowDown size={16} color="#0284C7" style={{ marginRight: 8 }} />
                  <Text style={styles.instructionText}>
                    화면을 좌우로 드래그해 조준하고 손을 떼면 비누방울이 톡! 떨어집니다.
                  </Text>
                </View>
                <View style={styles.instructionItem}>
                  <Sparkles size={16} color="#F59E0B" style={{ marginRight: 8 }} />
                  <Text style={styles.instructionText}>
                    같은 레벨 버블이 부딪히면 합체! 대왕 무지개 거품을 완성해보세요.
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
                <Text style={styles.startButtonText}>스파 시작하기 (START)</Text>
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
                {character?.name || '반려몽'}의 온몸이 향기로운 비누 거품으로 뽀송해졌어요!
              </Text>

              {/* Stats */}
              <View style={styles.resultStatsRow}>
                <View style={styles.resultStatBox}>
                  <Text style={styles.resultStatLabel}>최종 점수</Text>
                  <Text style={styles.resultStatValue}>{score}점</Text>
                </View>
                <View style={styles.resultStatBox}>
                  <Text style={styles.resultStatLabel}>합친 횟수</Text>
                  <Text style={styles.resultStatValue}>{mergeCount}회</Text>
                </View>
                <View style={styles.resultStatBox}>
                  <Text style={styles.resultStatLabel}>최고 레벨</Text>
                  <Text style={[styles.resultStatValue, { color: '#0284C7' }]}>
                    Lv.{highestLevel} {BUBBLE_TIERS[highestLevel - 1]?.emoji}
                  </Text>
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
                          성장 경험치 +{Math.max(15, Math.min(50, Math.round((Math.round(score / 15) + Math.round(cleanliness / 8)) * 1.3)))} EXP 획득! 🌱
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
      </View>
    </Modal>
  );
}

// -----------------------------------------------------------------
// Styles
// -----------------------------------------------------------------
const styles = StyleSheet.create({
  gameContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
  },
  bathBackgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0284C7',
  },
  foamSudsWave: {
    position: 'absolute',
    bottom: -60,
    left: -40,
    right: -40,
    height: 180,
    backgroundColor: '#38BDF8',
    borderTopLeftRadius: 200,
    borderTopRightRadius: 200,
    opacity: 0.3,
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
    color: '#0284C7',
  },
  hudPillScore: {
    backgroundColor: '#FEF3C7',
  },
  scoreText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#B45309',
  },
  cleanlinessPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  cleanlinessText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0891B2',
  },
  cleanlinessBarBg: {
    width: 55,
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  cleanlinessBarFill: {
    height: '100%',
    backgroundColor: '#06B6D4',
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
  nextPreviewRow: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 104 : 88,
    right: 20,
    zIndex: 25,
  },
  nextPreviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  nextPreviewLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  bathtubBox: {
    position: 'absolute',
    borderRadius: 24,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    overflow: 'hidden',
    zIndex: 5,
  },
  bathtubGlassBack: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  dangerLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerLineText: {
    position: 'absolute',
    top: -16,
    fontSize: 10,
    fontWeight: '800',
    color: '#FCA5A5',
  },
  tubFloorWater: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 32,
    backgroundColor: 'rgba(14, 165, 233, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tubWaterLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  dropperContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  aimGuideLine: {
    position: 'absolute',
    top: 30,
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  dropIndicatorArrow: {
    position: 'absolute',
    bottom: -16,
  },
  physicsBubbleWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  particleSplash: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 22,
  },
  bottomPetStage: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    zIndex: 10,
  },
  petBox: {
    alignItems: 'center',
  },
  petImageSprite: {
    width: 60,
    height: 60,
  },
  petEmojiSprite: {
    fontSize: 45,
  },
  petSoapHat: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  floatingToast: {
    position: 'absolute',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
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
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
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
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  gameNoBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0D9488',
  },
  readyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  readySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  evolutionPreviewBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  evolutionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 8,
  },
  evolutionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  evoNode: {
    alignItems: 'center',
  },
  evoLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    marginTop: 2,
  },
  evoArrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#CBD5E1',
  },
  evoEllipsis: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    marginLeft: 4,
  },
  instructionsList: {
    width: '100%',
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructionText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
    lineHeight: 16,
  },
  startButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#0284C7',
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
    color: '#1E293B',
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 13,
    color: '#64748B',
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
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resultStatLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  resultStatValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  rewardBox: {
    width: '100%',
    backgroundColor: '#F0FDFA',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    marginBottom: 20,
  },
  rewardBoxTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F766E',
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
    color: '#115E59',
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
    backgroundColor: '#F1F5F9',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 6,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  claimBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
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
