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
import Svg, { Line, Circle, G, Defs, RadialGradient, Stop, Path } from 'react-native-svg';
import { Image as ExpoImage } from 'expo-image';
import {
  Trophy,
  Sparkles,
  X,
  Moon,
  Star,
  RotateCcw,
  Check,
  Clock,
  Zap,
  Play,
  Gamepad2,
  Compass,
} from 'lucide-react-native';

const { width: INITIAL_WIDTH, height: INITIAL_HEIGHT } = Dimensions.get('window');

// -----------------------------------------------------------------
// Crystal Music Box Chime Synth (Web Audio API)
// -----------------------------------------------------------------
function playChimeNote(freq = 523.25) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!window._starlightAudioCtx) {
        window._starlightAudioCtx = new AudioCtx();
      }
      const ctx = window._starlightAudioCtx;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.28, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.9);
    } catch {
      // Audio fallback silent
    }
  }
}

const CHIME_FREQS = [523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.5];

// -----------------------------------------------------------------
// 4 Exquisite Constellation Definitions (Normalized Coordinates)
// -----------------------------------------------------------------
const CONSTELLATIONS = [
  {
    id: 'bear',
    name: '꼬마 곰자리',
    emoji: '🐻',
    stars: [
      { id: 1, normX: 0.22, normY: 0.26 },
      { id: 2, normX: 0.38, normY: 0.22 },
      { id: 3, normX: 0.58, normY: 0.27 },
      { id: 4, normX: 0.74, normY: 0.36 },
      { id: 5, normX: 0.52, normY: 0.46 },
    ],
    silhouetteSvg: (
      <Path
        d="M 60 40 C 40 20 100 10 140 30 C 180 50 220 80 200 120 C 170 140 120 150 90 120 Z"
        fill="rgba(56, 189, 248, 0.08)"
        stroke="rgba(56, 189, 248, 0.4)"
        strokeWidth="1.5"
      />
    ),
  },
  {
    id: 'heart',
    name: '우주 하트자리',
    emoji: '💖',
    stars: [
      { id: 1, normX: 0.50, normY: 0.26 },
      { id: 2, normX: 0.32, normY: 0.20 },
      { id: 3, normX: 0.22, normY: 0.32 },
      { id: 4, normX: 0.50, normY: 0.48 },
      { id: 5, normX: 0.78, normY: 0.32 },
      { id: 6, normX: 0.68, normY: 0.20 },
    ],
    silhouetteSvg: (
      <Path
        d="M 120 70 C 80 20 20 50 50 100 C 80 130 120 160 120 160 C 120 160 160 130 190 100 C 220 50 160 20 120 70 Z"
        fill="rgba(244, 114, 182, 0.08)"
        stroke="rgba(244, 114, 182, 0.4)"
        strokeWidth="1.5"
      />
    ),
  },
  {
    id: 'crown',
    name: '황금 왕관자리',
    emoji: '👑',
    stars: [
      { id: 1, normX: 0.20, normY: 0.42 },
      { id: 2, normX: 0.30, normY: 0.25 },
      { id: 3, normX: 0.50, normY: 0.35 },
      { id: 4, normX: 0.70, normY: 0.25 },
      { id: 5, normX: 0.80, normY: 0.42 },
    ],
    silhouetteSvg: (
      <Path
        d="M 50 130 L 75 75 L 125 105 L 175 75 L 200 130 Z"
        fill="rgba(251, 191, 36, 0.08)"
        stroke="rgba(251, 191, 36, 0.4)"
        strokeWidth="1.5"
      />
    ),
  },
  {
    id: 'paw',
    name: '반려몽 수호자리',
    emoji: '🐾',
    stars: [
      { id: 1, normX: 0.26, normY: 0.25 },
      { id: 2, normX: 0.44, normY: 0.20 },
      { id: 3, normX: 0.64, normY: 0.21 },
      { id: 4, normX: 0.76, normY: 0.33 },
      { id: 5, normX: 0.58, normY: 0.46 },
      { id: 6, normX: 0.36, normY: 0.45 },
    ],
    silhouetteSvg: (
      <Path
        d="M 90 130 C 60 110 60 80 90 90 C 120 100 120 130 90 130 Z"
        fill="rgba(129, 140, 248, 0.08)"
        stroke="rgba(129, 140, 248, 0.4)"
        strokeWidth="1.5"
      />
    ),
  },
];

const GAME_DURATION = 45; // 45 seconds relaxed cosmic healing

export default function DreamConstellationGame({
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
  const [currentConstIndex, setCurrentConstIndex] = useState(0);
  const [connectedStarIds, setConnectedStarIds] = useState([1]);
  const [completedConstCount, setCompletedConstCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [shootingStar, setShootingStar] = useState(null);

  // Live Dragging Beam Line
  const [dragCurrentPos, setDragCurrentPos] = useState(null);

  // Animation Refs
  const petBreath = useRef(new Animated.Value(1)).current;
  const auraPulse = useRef(new Animated.Value(1)).current;
  const constCompleteAnim = useRef(new Animated.Value(0)).current;

  // Refs for Game State
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const currentConstIndexRef = useRef(0);
  const connectedStarIdsRef = useRef([1]);
  const completedConstCountRef = useRef(0);

  const screenWidthRef = useRef(screenWidth);
  screenWidthRef.current = screenWidth;

  const screenHeightRef = useRef(screenHeight);
  screenHeightRef.current = screenHeight;

  // Timers
  const gameTimerRef = useRef(null);
  const shootingStarTimerRef = useRef(null);
  const transitionTimerRef = useRef(null);

  // -----------------------------------------------------------------
  // 1. Generate Starry Night Sky Field (40 background stars)
  // -----------------------------------------------------------------
  const backgroundStars = useMemo(() => {
    const count = 40;
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push({
        id: `bg_star_${i}`,
        normX: 0.05 + Math.random() * 0.9,
        normY: 0.12 + Math.random() * 0.48,
        radius: 1.5 + Math.random() * 2.5,
        opacity: 0.35 + Math.random() * 0.55,
        twinkleDuration: 1500 + Math.random() * 2500,
      });
    }
    return list;
  }, []);

  // Breathing & Aura Pulsing Animations
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(auraPulse, { toValue: 1.25, duration: 900, useNativeDriver: true }),
        Animated.timing(auraPulse, { toValue: 1.0, duration: 900, useNativeDriver: true }),
      ])
    );
    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(petBreath, { toValue: 1.08, duration: 1800, useNativeDriver: true }),
        Animated.timing(petBreath, { toValue: 1.0, duration: 1800, useNativeDriver: true }),
      ])
    );

    pulseLoop.start();
    breathLoop.start();

    return () => {
      pulseLoop.stop();
      breathLoop.stop();
    };
  }, [auraPulse, petBreath]);

  // Toast Trigger
  const triggerToast = useCallback((text, color = '#38BDF8', x = null, y = null) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    const toastX = x !== null ? Math.max(20, Math.min(screenWidthRef.current - 140, x - 50)) : screenWidthRef.current / 2 - 60;
    const toastY = y !== null ? Math.max(90, Math.min(screenHeightRef.current - 180, y - 30)) : screenHeightRef.current / 2;

    setToasts(prev => [...prev.slice(-3), { id, text, color, x: toastX, y: toastY }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 850);
  }, []);

  // Reset to Ready
  const resetToReady = useCallback(() => {
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (shootingStarTimerRef.current) clearInterval(shootingStarTimerRef.current);
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);

    currentConstIndexRef.current = 0;
    connectedStarIdsRef.current = [1];
    completedConstCountRef.current = 0;

    setCurrentConstIndex(0);
    setConnectedStarIds([1]);
    setCompletedConstCount(0);
    setDragCurrentPos(null);
    setShootingStar(null);
    setToasts([]);
    setGameState('ready');
  }, []);

  const handleExitPress = useCallback(() => {
    if (gameStateRef.current === 'playing') {
      Alert.alert(
        '게임 중단 🌙',
        '별자리 잇기를 그만두시겠습니까?\n지금 나가면 보상이 저장되지 않습니다.',
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
  }, [resetToReady, onClose]);

  // Finish Game
  const finishGame = useCallback(() => {
    setGameState('gameover');
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (shootingStarTimerRef.current) clearInterval(shootingStarTimerRef.current);
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
  }, []);

  // Current Target Constellation Object
  const currentConstellation = CONSTELLATIONS[currentConstIndex] || CONSTELLATIONS[0];

  // -----------------------------------------------------------------
  // Connect Target Star in Order
  // -----------------------------------------------------------------
  const handleConnectStar = useCallback((targetStarId, starPixelX, starPixelY) => {
    if (gameStateRef.current !== 'playing') return;

    const currentList = connectedStarIdsRef.current;
    const lastConnectedId = currentList[currentList.length - 1];
    const nextExpectedId = lastConnectedId + 1;

    if (targetStarId === nextExpectedId) {
      const nextList = [...currentList, targetStarId];
      connectedStarIdsRef.current = nextList;
      setConnectedStarIds(nextList);
      setDragCurrentPos(null);

      // Play authentic crystal chime sound!
      const chimeIndex = (nextList.length - 2) % CHIME_FREQS.length;
      playChimeNote(CHIME_FREQS[Math.max(0, chimeIndex)]);

      // Score + Toast Chime
      const notes = ['도 🎵', '레 🎵', '미 🎵', '파 🎵', '솔 🎵', '라 🎵', '시 🎵', '높은 도 ✨'];
      const noteName = notes[(nextList.length - 2) % notes.length] || '별빛 멜로디 🎵';
      const addedPoints = 40;
      setScore(s => s + addedPoints);
      triggerToast(`${noteName} (+${addedPoints})`, '#38BDF8', starPixelX, starPixelY);

      // All Stars in Constellation Connected!
      if (nextList.length === currentConstellation.stars.length) {
        completedConstCountRef.current += 1;
        setCompletedConstCount(completedConstCountRef.current);
        setScore(s => s + 250);

        Animated.sequence([
          Animated.timing(constCompleteAnim, { toValue: 1, duration: 450, useNativeDriver: false }),
          Animated.timing(constCompleteAnim, { toValue: 0, duration: 350, useNativeDriver: false }),
        ]).start();

        triggerToast(`🌟 [${currentConstellation.name}] 각성! +250점`, '#F59E0B', screenWidthRef.current / 2, 210);

        transitionTimerRef.current = setTimeout(() => {
          if (currentConstIndexRef.current + 1 < CONSTELLATIONS.length) {
            currentConstIndexRef.current += 1;
            setCurrentConstIndex(currentConstIndexRef.current);
            connectedStarIdsRef.current = [1];
            setConnectedStarIds([1]);
          } else {
            finishGame();
          }
        }, 1300);
      }
    } else if (targetStarId === lastConnectedId) {
      // Tap on the star currently active
      playChimeNote(CHIME_FREQS[0]);
      triggerToast(`✨ ${targetStarId}번 별이 빛납니다! ${nextExpectedId}번 별을 눌러 이어보세요!`, '#FBBF24', starPixelX, starPixelY);
    } else if (targetStarId < lastConnectedId) {
      // Already connected earlier
      triggerToast(`✓ ${targetStarId}번 별빛은 이미 연결되었어요!`, '#94A3B8', starPixelX, starPixelY);
    } else if (targetStarId > nextExpectedId) {
      triggerToast(`💡 ${nextExpectedId}번 별빛을 먼저 이어주세요!`, '#FBBF24', starPixelX, starPixelY);
    }
  }, [currentConstellation, constCompleteAnim, finishGame, triggerToast]);

  // Touch Move / Drag Beam Line
  const handleTouchMove = useCallback((touchX, touchY) => {
    if (gameStateRef.current !== 'playing') return;
    if (typeof touchX !== 'number' || typeof touchY !== 'number') return;

    const currentList = connectedStarIdsRef.current;
    const lastConnectedId = currentList[currentList.length - 1];
    const nextExpectedId = lastConnectedId + 1;

    const targetStar = currentConstellation.stars.find(s => s.id === nextExpectedId);
    if (targetStar) {
      const targetPixelX = targetStar.normX * screenWidthRef.current;
      const targetPixelY = targetStar.normY * screenHeightRef.current;
      const dist = Math.hypot(touchX - targetPixelX, touchY - targetPixelY);

      // Hit-Testing: Within generous star radius (44px)
      if (dist <= 44) {
        handleConnectStar(targetStar.id, targetPixelX, targetPixelY);
        return;
      }
    }

    setDragCurrentPos({ x: touchX, y: touchY });
  }, [currentConstellation, handleConnectStar]);

  // Start Game
  const startGame = useCallback(() => {
    setScore(0);
    setCurrentConstIndex(0);
    currentConstIndexRef.current = 0;
    setConnectedStarIds([1]);
    connectedStarIdsRef.current = [1];
    setCompletedConstCount(0);
    completedConstCountRef.current = 0;
    setTimeLeft(GAME_DURATION);
    setDragCurrentPos(null);
    setShootingStar(null);
    setToasts([]);

    setGameState('playing');
  }, []);

  // 1-second Countdown & Periodic Shooting Star
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

    shootingStarTimerRef.current = setInterval(() => {
      const randX = Math.random() * (screenWidthRef.current * 0.6) + 40;
      const randY = Math.random() * 120 + 80;
      setShootingStar({ id: Date.now(), x: randX, y: randY });

      setTimeout(() => setShootingStar(null), 1400);
    }, 7500);

    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (shootingStarTimerRef.current) clearInterval(shootingStarTimerRef.current);
    };
  }, [gameState, finishGame]);

  // Tap Shooting Star for Bonus
  const handleShootingStarPress = () => {
    if (!shootingStar) return;
    setShootingStar(null);
    setScore(s => s + 60);
    triggerToast('🌠 소원을 빌었어요! +60점!', '#F59E0B', shootingStar.x, shootingStar.y);
  };

  // Evaluation Grade
  const getGameGrade = (finalScore, completedCount) => {
    if (completedCount >= 4 || finalScore >= 800) {
      return { grade: 'S', color: '#FAAD14', title: '은하수 별자리 마스터! 👑' };
    }
    if (completedCount >= 3 || finalScore >= 550) {
      return { grade: 'A', color: '#10B981', title: '꿈나라 수호 천사 ✨' };
    }
    if (completedCount >= 1 || finalScore >= 300) {
      return { grade: 'B', color: '#0284C7', title: '포근한 밤하늘 탐험 🌙' };
    }
    return { grade: 'C', color: '#94A3B8', title: '별빛 입문자 🌱' };
  };

  const handleClaimAndClose = () => {
    const baseExp = Math.round(score / 15) + completedConstCount * 10;
    const finalExp = canEarnReward ? Math.max(15, Math.min(50, Math.round(baseExp * 1.3))) : 0;

    if (onGameComplete) {
      onGameComplete({
        score,
        completedCount: completedConstCount,
        exp: finalExp,
        isPractice: !canEarnReward,
        difficulty: 'normal',
      });
    }
    if (onClose) onClose();
  };

  if (!visible) return null;

  const currentGrade = getGameGrade(score, completedConstCount);

  // Pre-calculate connected line segments
  const connectedLines = [];
  for (let i = 0; i < connectedStarIds.length - 1; i++) {
    const s1 = currentConstellation.stars.find(s => s.id === connectedStarIds[i]);
    const s2 = currentConstellation.stars.find(s => s.id === connectedStarIds[i + 1]);
    if (s1 && s2) {
      connectedLines.push({
        id: `line_${s1.id}_${s2.id}`,
        x1: s1.normX * screenWidth,
        y1: s1.normY * screenHeight,
        x2: s2.normX * screenWidth,
        y2: s2.normY * screenHeight,
      });
    }
  }

  // Active dragging beam line from last connected star
  const lastConnectedStar = currentConstellation.stars.find(
    s => s.id === connectedStarIds[connectedStarIds.length - 1]
  );
  const dragStartPoint = lastConnectedStar
    ? { x: lastConnectedStar.normX * screenWidth, y: lastConnectedStar.normY * screenHeight }
    : null;

  // Next expected star for hint glow
  const nextTargetStar = currentConstellation.stars.find(
    s => s.id === connectedStarIds[connectedStarIds.length - 1] + 1
  );

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
        onTouchStart={(e) => {
          const t = e.nativeEvent?.touches?.[0] || e.nativeEvent;
          const x = t?.pageX || e.nativeEvent?.pageX || 0;
          const y = t?.pageY || e.nativeEvent?.pageY || 0;
          handleTouchMove(x, y);
        }}
        onTouchMove={(e) => {
          const t = e.nativeEvent?.touches?.[0] || e.nativeEvent;
          const x = t?.pageX || e.nativeEvent?.pageX || 0;
          const y = t?.pageY || e.nativeEvent?.pageY || 0;
          handleTouchMove(x, y);
        }}
        onTouchEnd={() => setDragCurrentPos(null)}
        onMouseDown={(e) => {
          const x = e.nativeEvent?.pageX || e.clientX || 0;
          const y = e.nativeEvent?.pageY || e.clientY || 0;
          handleTouchMove(x, y);
        }}
        onMouseMove={(e) => {
          if (e.buttons === 1 || e.nativeEvent?.which === 1) {
            const x = e.nativeEvent?.pageX || e.clientX || 0;
            const y = e.nativeEvent?.pageY || e.clientY || 0;
            handleTouchMove(x, y);
          }
        }}
        onMouseUp={() => setDragCurrentPos(null)}
      >
        {/* Deep Romantic Night Sky Atmosphere */}
        <View style={styles.deepSkyLayer} pointerEvents="none" />

        {/* --------------------------------------------------------- */}
        {/* TOP STATUS HUD BAR */}
        {/* --------------------------------------------------------- */}
        <View style={styles.topHudBar} pointerEvents="box-none">
          {/* Time Counter */}
          <View style={[styles.hudPill, timeLeft <= 10 && styles.hudPillUrgent]}>
            <Clock size={16} color={timeLeft <= 10 ? '#EF4444' : '#6366F1'} />
            <Text style={[styles.hudPillText, timeLeft <= 10 && { color: '#EF4444' }]}>
              {timeLeft}초
            </Text>
          </View>

          {/* Current Target Constellation Indicator */}
          <View style={styles.targetConstPill}>
            <Text style={{ fontSize: 16 }}>{currentConstellation.emoji}</Text>
            <Text style={styles.targetConstText}>{currentConstellation.name}</Text>
          </View>

          {/* Score Counter */}
          <View style={[styles.hudPill, styles.hudPillScore]}>
            <Trophy size={16} color="#D48806" />
            <Text style={styles.scoreText}>{score}점</Text>
          </View>

          {/* Close Game Button */}
          <TouchableOpacity onPress={handleExitPress} style={styles.closeBtn} activeOpacity={0.8}>
            <X size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* --------------------------------------------------------- */}
        {/* FULL NIGHT SKY: BACKGROUND STARS FIELD (30~45 STARS) */}
        {/* --------------------------------------------------------- */}
        <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {backgroundStars.map(s => (
            <Circle
              key={s.id}
              cx={s.normX * screenWidth}
              cy={s.normY * screenHeight}
              r={s.radius}
              fill="#FFFFFF"
              opacity={s.opacity}
            />
          ))}

          {/* Permanently Connected Starlight Lines */}
          {connectedLines.map(l => (
            <G key={l.id}>
              {/* Outer Cyan Glow Beam */}
              <Line
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                stroke="#38BDF8"
                strokeWidth="5"
                strokeOpacity="0.45"
                strokeLinecap="round"
              />
              {/* Core Bright White Starlight Beam */}
              <Line
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </G>
          ))}

          {/* Active Dragging Starlight Beam */}
          {dragStartPoint && dragCurrentPos && (
            <G>
              <Line
                x1={dragStartPoint.x}
                y1={dragStartPoint.y}
                x2={dragCurrentPos.x}
                y2={dragCurrentPos.y}
                stroke="#FBBF24"
                strokeWidth="4"
                strokeOpacity="0.5"
                strokeLinecap="round"
              />
              <Line
                x1={dragStartPoint.x}
                y1={dragStartPoint.y}
                x2={dragCurrentPos.x}
                y2={dragCurrentPos.y}
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </G>
          )}
        </Svg>

        {/* --------------------------------------------------------- */}
        {/* TARGET CONSTELLATION KEY STARS (INTERACTIVE TOUCH TARGETS) */}
        {/* --------------------------------------------------------- */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          {currentConstellation.stars.map(s => {
            const posX = s.normX * screenWidth;
            const posY = s.normY * screenHeight;
            const isConnected = connectedStarIds.includes(s.id);
            const isNextTarget = nextTargetStar?.id === s.id;

            return (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.targetStarTouchArea,
                  { left: posX - 32, top: posY - 32, pointerEvents: 'auto' },
                ]}
                pointerEvents="auto"
                onPress={() => handleConnectStar(s.id, posX, posY)}
                activeOpacity={0.7}
              >
                {/* Pulsing Aura for Next Target Star */}
                {isNextTarget && (
                  <Animated.View
                    style={[
                      styles.starPulseAura,
                      { transform: [{ scale: auraPulse }] },
                    ]}
                  />
                )}

                {/* Star Sphere Icon */}
                <View
                  style={[
                    styles.targetStarSphere,
                    isConnected && styles.targetStarConnected,
                    isNextTarget && styles.targetStarNext,
                  ]}
                >
                  <Star
                    size={isConnected ? 16 : 14}
                    color={isConnected ? '#FEF08A' : (isNextTarget ? '#FDE047' : '#94A3B8')}
                    fill={isConnected ? '#FEF08A' : (isNextTarget ? '#FDE047' : 'transparent')}
                  />
                </View>

                {/* Luminous Number Badge (Always Visible for clear gameplay guidance) */}
                <View
                  style={[
                    styles.starBadgePill,
                    isConnected && styles.starBadgePillDone,
                    isNextTarget && styles.starBadgePillNext,
                  ]}
                >
                  <Text
                    style={[
                      styles.starNumberText,
                      isConnected && styles.starNumberTextDone,
                      isNextTarget && styles.starNumberTextNext,
                    ]}
                  >
                    {isConnected ? '✓' : `${s.id}`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* --------------------------------------------------------- */}
        {/* OCCASIONAL SHOOTING STAR (BONUS TAP TARGET) */}
        {/* --------------------------------------------------------- */}
        {shootingStar && (
          <TouchableOpacity
            style={[styles.shootingStarTouch, { left: shootingStar.x, top: shootingStar.y }]}
            onPress={handleShootingStarPress}
            activeOpacity={0.8}
          >
            <Svg width="54" height="24" viewBox="0 0 54 24">
              <Line x1="4" y1="20" x2="48" y2="4" stroke="#FDE047" strokeWidth="2.5" strokeOpacity="0.8" />
              <Circle cx="48" cy="4" r="3.5" fill="#FFFFFF" />
            </Svg>
            <Text style={styles.shootingStarHint}>소원 빌기 🌠</Text>
          </TouchableOpacity>
        )}

        {/* --------------------------------------------------------- */}
        {/* SLEEPING PETMONG (BOTTOM STAGE) */}
        {/* --------------------------------------------------------- */}
        <View style={styles.bottomSleepingPetStage} pointerEvents="none">
          <Animated.View style={[styles.petSleepBox, { transform: [{ scale: petBreath }] }]}>
            {character?.image_url ? (
              <ExpoImage
                source={{ uri: transparentUrl || character.image_url }}
                style={styles.petImageSprite}
                contentFit="contain"
              />
            ) : (
              <Text style={styles.petEmojiSprite}>{character?.emoji || '🐶'}</Text>
            )}
            <View style={styles.sleepZzzBadge}>
              <Text style={styles.sleepZzzText}>쿨쿨... zZ 🌙</Text>
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
                  <Text style={styles.gameNoBadgeText}>제4탄 미니게임</Text>
                </View>
                <View style={styles.categoryBadge}>
                  <Moon size={14} color="#6366F1" style={{ marginRight: 3 }} />
                  <Text style={styles.categoryBadgeText}>재우기</Text>
                </View>
              </View>

              <Text style={styles.readyTitle}>🌌 꿈나라 별자리 잇기</Text>
              <Text style={styles.readySubtitle}>
                무수히 많은 밤하늘 별바다 속에서, 우리 가족의 수호 별자리를 찾아 은하수 선으로 이어보세요!
              </Text>

              {/* Constellation Gallery Preview */}
              <View style={styles.galleryPreviewBox}>
                <Text style={styles.galleryTitle}>✨ 밤하늘에 수놓을 4대 별자리</Text>
                <View style={styles.galleryRow}>
                  {CONSTELLATIONS.map(c => (
                    <View key={c.id} style={styles.galleryItem}>
                      <Text style={{ fontSize: 24, marginBottom: 2 }}>{c.emoji}</Text>
                      <Text style={styles.galleryLabel}>{c.name}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Instructions */}
              <View style={styles.instructionsList}>
                <View style={styles.instructionItem}>
                  <Compass size={16} color="#4F46E5" style={{ marginRight: 8 }} />
                  <Text style={styles.instructionText}>
                    반짝이는 목표 별에서 다음 별로 손가락을 스윽- 드래그해 선을 연결하세요.
                  </Text>
                </View>
                <View style={styles.instructionItem}>
                  <Sparkles size={16} color="#F59E0B" style={{ marginRight: 8 }} />
                  <Text style={styles.instructionText}>
                    별을 이을 때마다 맑은 오르골 선율이 울려 퍼지며 별자리가 완성됩니다.
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
                <Text style={styles.startButtonText}>별빛 관측 시작 (START)</Text>
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
                {character?.name || '반려몽'}이 아름다운 별빛 자장가를 들으며 깊은 단꿈에 빠졌어요!
              </Text>

              {/* Stats */}
              <View style={styles.resultStatsRow}>
                <View style={styles.resultStatBox}>
                  <Text style={styles.resultStatLabel}>최종 점수</Text>
                  <Text style={styles.resultStatValue}>{score}점</Text>
                </View>
                <View style={styles.resultStatBox}>
                  <Text style={styles.resultStatLabel}>완성 별자리</Text>
                  <Text style={[styles.resultStatValue, { color: '#6366F1' }]}>
                    {completedConstCount}개 완성
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
                          성장 경험치 +{Math.max(15, Math.min(50, Math.round((Math.round(score / 15) + completedConstCount * 10) * 1.3)))} EXP 획득! 🌱
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
    backgroundColor: '#090D16',
    overflow: 'hidden',
  },
  deepSkyLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0B1120',
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
    color: '#4F46E5',
  },
  targetConstPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  targetConstText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1E1B4B',
  },
  hudPillScore: {
    backgroundColor: '#FEF3C7',
  },
  scoreText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#B45309',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetStarTouchArea: {
    position: 'absolute',
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    cursor: 'pointer',
  },
  starPulseAura: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(251, 191, 36, 0.28)',
  },
  targetStarSphere: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderWidth: 1.5,
    borderColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetStarConnected: {
    backgroundColor: 'rgba(234, 179, 8, 0.95)',
    borderColor: '#FEF08A',
    shadowColor: '#FEF08A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  targetStarNext: {
    borderColor: '#FDE047',
    borderWidth: 2,
  },
  starBadgePill: {
    marginTop: 3,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderWidth: 1,
    borderColor: '#475569',
  },
  starBadgePillDone: {
    backgroundColor: '#CA8A04',
    borderColor: '#FEF08A',
  },
  starBadgePillNext: {
    backgroundColor: '#D97706',
    borderColor: '#FDE047',
    shadowColor: '#FDE047',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 3,
  },
  starNumberText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#CBD5E1',
  },
  starNumberTextDone: {
    color: '#FEF08A',
  },
  starNumberTextNext: {
    color: '#FFFFFF',
  },
  shootingStarTouch: {
    position: 'absolute',
    padding: 10,
    alignItems: 'center',
    zIndex: 25,
  },
  shootingStarHint: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FDE047',
    marginTop: -2,
  },
  bottomSleepingPetStage: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  petSleepBox: {
    alignItems: 'center',
  },
  petImageSprite: {
    width: 76,
    height: 76,
  },
  petEmojiSprite: {
    fontSize: 55,
  },
  sleepZzzBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 2,
  },
  sleepZzzText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C7D2FE',
  },
  floatingToast: {
    position: 'absolute',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
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
    backgroundColor: 'rgba(11, 17, 32, 0.85)',
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
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  gameNoBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4F46E5',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6366F1',
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
  galleryPreviewBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  galleryTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 8,
  },
  galleryRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
  },
  galleryItem: {
    alignItems: 'center',
  },
  galleryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  instructionsList: {
    width: '100%',
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructionText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#3730A3',
    lineHeight: 16,
  },
  startButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#4F46E5',
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
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    marginBottom: 20,
  },
  rewardBoxTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#3730A3',
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
    color: '#312E81',
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
    backgroundColor: '#4F46E5',
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
