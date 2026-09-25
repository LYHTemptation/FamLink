import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { Trophy, Sparkles, X, Flame, RotateCcw, Check, Clock, Droplets, Zap } from 'lucide-react-native';

const { width: INITIAL_WIDTH, height: INITIAL_HEIGHT } = Dimensions.get('window');

const GAME_DURATION = 25; // 25 seconds
const SPAWN_INTERVAL = 400; // ms
const MAX_BUBBLES = 18;

// Bubble types configuration
const BUBBLE_TYPES = [
  { type: 'normal', emoji: '🫧', color: '#60A5FA', points: 10, size: 52, weight: 65 },
  { type: 'golden', emoji: '✨', color: '#F59E0B', points: 30, size: 56, weight: 15 },
  { type: 'timer', emoji: '⏱️', color: '#10B981', points: 15, size: 54, weight: 10, addTime: 3 },
  { type: 'soap', emoji: '🧼', color: '#EC4899', points: 40, size: 64, weight: 10 },
];

export default function BubblePopGame({
  visible,
  character,
  transparentUrl,
  onClose,
  onGameComplete,
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
  const [poppedCount, setPoppedCount] = useState(0);
  const [cleanliness, setCleanliness] = useState(0); // 0% ~ 100%
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [isSparkleFever, setIsSparkleFever] = useState(false);
  const [bubbles, setBubbles] = useState([]);
  const [popEffects, setPopEffects] = useState([]);
  const [toasts, setToasts] = useState([]);

  // Animation values
  const petBounce = useRef(new Animated.Value(1)).current;
  const feverPulse = useRef(new Animated.Value(1)).current;

  // State Refs for 60fps game loop
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const screenWidthRef = useRef(screenWidth);
  screenWidthRef.current = screenWidth;

  const screenHeightRef = useRef(screenHeight);
  screenHeightRef.current = screenHeight;

  const bubblesRef = useRef([]);
  const isSparkleFeverRef = useRef(false);
  const lastPopTimeRef = useRef(0);

  // Timers
  const gameTimerRef = useRef(null);
  const spawnTimerRef = useRef(null);
  const animFrameRef = useRef(null);
  const feverTimerRef = useRef(null);

  // Floating Toast Notification
  const triggerToast = useCallback((text, color = '#3B82F6', x = null, y = null) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    const toastX = x !== null ? Math.max(20, Math.min(screenWidthRef.current - 120, x - 40)) : screenWidthRef.current / 2 - 50;
    const toastY = y !== null ? Math.max(100, Math.min(screenHeightRef.current - 180, y - 30)) : screenHeightRef.current / 2;

    setToasts(prev => [...prev.slice(-4), { id, text, color, x: toastX, y: toastY }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 800);
  }, []);

  // Clean Reset to Ready state
  const resetToReady = useCallback(() => {
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }
    if (spawnTimerRef.current) {
      clearInterval(spawnTimerRef.current);
      spawnTimerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (feverTimerRef.current) {
      clearTimeout(feverTimerRef.current);
      feverTimerRef.current = null;
    }

    setScore(0);
    setPoppedCount(0);
    setCleanliness(0);
    setCombo(0);
    setMaxCombo(0);
    setTimeLeft(GAME_DURATION);
    setIsSparkleFever(false);
    setBubbles([]);
    setPopEffects([]);
    setToasts([]);
    bubblesRef.current = [];
    isSparkleFeverRef.current = false;
    setGameState('ready');
  }, []);

  // Auto-reset when modal becomes invisible
  useEffect(() => {
    if (!visible) {
      resetToReady();
    }
  }, [visible, resetToReady]);

  // Handle User Close / Exit Button
  const handleExitPress = useCallback(() => {
    if (gameStateRef.current === 'playing') {
      const doExit = () => {
        resetToReady();
        if (onClose) onClose();
      };

      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.confirm('게임을 중단하고 나가시겠습니까? 진행 중인 점수는 저장되지 않습니다.')) {
          doExit();
        }
      } else {
        Alert.alert(
          '게임 종료',
          '게임을 중단하고 나가시겠습니까? 진행 중인 점수는 저장되지 않습니다.',
          [
            { text: '계속하기', style: 'cancel' },
            { text: '나가기', style: 'destructive', onPress: doExit },
          ]
        );
      }
    } else {
      resetToReady();
      if (onClose) onClose();
    }
  }, [resetToReady, onClose]);

  // -----------------------------------------------------------------
  // Spawn Bubble
  // -----------------------------------------------------------------
  const spawnBubble = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    if (bubblesRef.current.length >= MAX_BUBBLES) return;

    const stageWidth = screenWidthRef.current;
    const stageHeight = screenHeightRef.current;

    // Pick type by weight
    const totalWeight = BUBBLE_TYPES.reduce((acc, t) => acc + t.weight, 0);
    let rand = Math.random() * totalWeight;
    let chosenType = BUBBLE_TYPES[0];
    for (const t of BUBBLE_TYPES) {
      if (rand < t.weight) {
        chosenType = t;
        break;
      }
      rand -= t.weight;
    }

    const startX = Math.max(15, Math.min(stageWidth - chosenType.size - 15, Math.random() * (stageWidth - chosenType.size)));
    const startY = stageHeight - 120 + Math.random() * 40; // float up from bottom bath
    const vy = -(2.2 + Math.random() * 2.2);
    const vx = (Math.random() - 0.5) * 1.8;

    const newBubble = {
      id: `bubble_${Date.now()}_${Math.random()}`,
      x: startX,
      y: startY,
      vx,
      vy,
      wobblePhase: Math.random() * Math.PI * 2,
      ...chosenType,
    };

    bubblesRef.current.push(newBubble);
    setBubbles([...bubblesRef.current]);
  }, []);

  // -----------------------------------------------------------------
  // Pop Bubble Trigger
  // -----------------------------------------------------------------
  const popBubble = useCallback((bubble, popX, popY) => {
    // 1. Remove from active list
    bubblesRef.current = bubblesRef.current.filter(b => b.id !== bubble.id);
    setBubbles([...bubblesRef.current]);

    // 2. Pet Joy Squish
    Animated.sequence([
      Animated.timing(petBounce, { toValue: 1.18, duration: 70, useNativeDriver: false }),
      Animated.timing(petBounce, { toValue: 0.95, duration: 80, useNativeDriver: false }),
      Animated.timing(petBounce, { toValue: 1.0, duration: 70, useNativeDriver: false }),
    ]).start();

    // 3. Pop Effect Particle
    const effectId = `pop_${Date.now()}_${Math.random()}`;
    setPopEffects(prev => [
      ...prev.slice(-8),
      {
        id: effectId,
        x: popX - bubble.size / 2,
        y: popY - bubble.size / 2,
        size: bubble.size * 1.3,
        color: bubble.color,
        emoji: bubble.emoji,
      },
    ]);
    setTimeout(() => {
      setPopEffects(prev => prev.filter(e => e.id !== effectId));
    }, 450);

    // 4. Combo Calculation (Within 0.85s)
    const now = Date.now();
    const isCombo = now - lastPopTimeRef.current < 850;
    lastPopTimeRef.current = now;

    let currentCombo = 1;
    if (isCombo) {
      setCombo(c => {
        currentCombo = c + 1;
        setMaxCombo(m => Math.max(m, currentCombo));
        if (currentCombo === 8 && !isSparkleFeverRef.current) {
          activateSparkleFever();
        }
        return currentCombo;
      });
    } else {
      setCombo(1);
    }

    // 5. Score & Cleanliness
    const multiplier = isSparkleFeverRef.current ? 2 : 1;
    const comboBonus = Math.min(currentCombo * 3, 25);
    const addedScore = (bubble.points + comboBonus) * multiplier;

    setScore(s => s + addedScore);
    setPoppedCount(p => p + 1);
    setCleanliness(c => Math.min(100, Math.round(c + (bubble.type === 'soap' ? 6 : 3))));

    // Extra Time bonus for timer bubble
    if (bubble.addTime) {
      setTimeLeft(t => Math.min(30, t + bubble.addTime));
      triggerToast(`+${bubble.addTime}초 시간 보너스! ⏱️`, '#10B981', popX, popY);
    } else {
      triggerToast(`+${addedScore} 팡! 🫧`, bubble.color, popX, popY);
    }
  }, [petBounce, triggerToast]);

  // Activate Sparkle Fever Mode
  const activateSparkleFever = useCallback(() => {
    setIsSparkleFever(true);
    isSparkleFeverRef.current = true;
    triggerToast('✨ 버블 스파클 피버! 2배 점수! ✨', '#F59E0B');

    Animated.loop(
      Animated.sequence([
        Animated.timing(feverPulse, { toValue: 1.1, duration: 250, useNativeDriver: false }),
        Animated.timing(feverPulse, { toValue: 1.0, duration: 250, useNativeDriver: false }),
      ])
    ).start();

    if (feverTimerRef.current) clearTimeout(feverTimerRef.current);
    feverTimerRef.current = setTimeout(() => {
      setIsSparkleFever(false);
      isSparkleFeverRef.current = false;
      feverPulse.setValue(1);
    }, 6000);
  }, [feverPulse, triggerToast]);

  // -----------------------------------------------------------------
  // Touch / Swipe Hit-Testing (Instant 0ms latency)
  // -----------------------------------------------------------------
  const checkTouch = useCallback((touchX, touchY) => {
    if (gameStateRef.current !== 'playing') return;
    if (typeof touchX !== 'number' || typeof touchY !== 'number') return;

    // Check collision against active bubbles
    const activeList = bubblesRef.current;
    for (let i = activeList.length - 1; i >= 0; i--) {
      const b = activeList[i];
      const bubbleCenterX = b.x + b.size / 2;
      const bubbleCenterY = b.y + b.size / 2;
      const dist = Math.hypot(touchX - bubbleCenterX, touchY - bubbleCenterY);

      if (dist <= b.size * 0.72) {
        popBubble(b, bubbleCenterX, bubbleCenterY);
        break; // Pop one bubble per touch frame
      }
    }
  }, [popBubble]);

  // -----------------------------------------------------------------
  // Start / Finish Game
  // -----------------------------------------------------------------
  const finishGame = useCallback(() => {
    setGameState('gameover');
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    if (feverTimerRef.current) clearTimeout(feverTimerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }, []);

  const startGame = useCallback(() => {
    setScore(0);
    setPoppedCount(0);
    setCleanliness(0);
    setCombo(0);
    setMaxCombo(0);
    setTimeLeft(GAME_DURATION);
    setIsSparkleFever(false);
    setBubbles([]);
    setPopEffects([]);
    setToasts([]);
    bubblesRef.current = [];
    isSparkleFeverRef.current = false;
    lastPopTimeRef.current = 0;

    setGameState('playing');
  }, []);

  // -----------------------------------------------------------------
  // 60FPS Game Physics Loop
  // -----------------------------------------------------------------
  useEffect(() => {
    if (gameState !== 'playing') return;

    let isRunning = true;

    const updatePhysics = () => {
      if (!isRunning || gameStateRef.current !== 'playing') return;

      const stageWidth = screenWidthRef.current;
      const activeList = bubblesRef.current;
      const remaining = [];

      for (let i = 0; i < activeList.length; i++) {
        const b = activeList[i];
        b.wobblePhase += 0.06;
        b.x += b.vx + Math.sin(b.wobblePhase) * 1.1;
        b.y += b.vy;

        // Keep inside horizontal walls
        if (b.x < 5) {
          b.x = 5;
          b.vx = Math.abs(b.vx);
        } else if (b.x > stageWidth - b.size - 5) {
          b.x = stageWidth - b.size - 5;
          b.vx = -Math.abs(b.vx);
        }

        // Float up to ceiling
        if (b.y > 60) {
          remaining.push(b);
        }
      }

      bubblesRef.current = remaining;
      setBubbles([...remaining]);

      animFrameRef.current = requestAnimationFrame(updatePhysics);
    };

    animFrameRef.current = requestAnimationFrame(updatePhysics);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState]);

  // Game Countdown & Spawn Timer
  useEffect(() => {
    if (gameState === 'playing') {
      gameTimerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(gameTimerRef.current);
            finishGame();
            return 0;
          }
          return t - 1;
        });
      }, 1000);

      spawnTimerRef.current = setInterval(() => {
        spawnBubble();
      }, isSparkleFever ? SPAWN_INTERVAL * 0.6 : SPAWN_INTERVAL);
    }

    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    };
  }, [gameState, isSparkleFever, spawnBubble, finishGame]);

  // Compute Grade & Rewards
  const getGameGrade = (finalScore, finalCleanliness) => {
    if (finalCleanliness >= 100 || finalScore >= 650) {
      return { grade: 'S', color: '#FAAD14', title: '목욕의 달인 👑' };
    }
    if (finalCleanliness >= 75 || finalScore >= 450) {
      return { grade: 'A', color: '#52C41A', title: '뽀송뽀송 몽이 🛁' };
    }
    if (finalCleanliness >= 50 || finalScore >= 250) {
      return { grade: 'B', color: '#1890FF', title: '향기 솔솔 🧼' };
    }
    return { grade: 'C', color: '#8C8C8C', title: '비누칠 입문자 🌱' };
  };

  const handleClaimAndClose = () => {
    const finalExp = Math.max(12, Math.min(35, Math.round(score / 25) + Math.round(cleanliness / 10)));
    const finalPoints = Math.max(4, Math.min(15, Math.round(score / 55)));

    if (onGameComplete) {
      onGameComplete({
        score,
        poppedCount,
        cleanliness,
        exp: finalExp,
        points: finalPoints,
      });
    }
    if (onClose) onClose();
  };

  if (!visible) return null;

  const currentGrade = getGameGrade(score, cleanliness);

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
        onTouchStart={
          gameState === 'playing' ? (e) => checkTouch(e.nativeEvent.pageX, e.nativeEvent.pageY) : undefined
        }
        onTouchMove={
          gameState === 'playing' ? (e) => checkTouch(e.nativeEvent.pageX, e.nativeEvent.pageY) : undefined
        }
      >
        {/* Bathroom Warm Aqua Atmosphere & Suds Background */}
        <View style={styles.bathBackgroundLayer} pointerEvents="none">
          <View style={styles.foamSudsWave1} />
          <View style={styles.foamSudsWave2} />
        </View>

        {/* --------------------------------------------------------- */}
        {/* TOP STATUS HUD BAR */}
        {/* --------------------------------------------------------- */}
        <View style={styles.topHudBar} pointerEvents="box-none">
          {/* Time Counter */}
          <View style={[styles.hudPill, timeLeft <= 5 && styles.hudPillUrgent]}>
            <Clock size={16} color={timeLeft <= 5 ? '#FF4D4F' : '#0284C7'} />
            <Text style={[styles.hudPillText, timeLeft <= 5 && { color: '#FF4D4F' }]}>
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
            <Text style={styles.scoreText}>{score} P</Text>
          </View>

          {/* Close Game Button */}
          <TouchableOpacity onPress={handleExitPress} style={styles.closeBtn} activeOpacity={0.8}>
            <X size={18} color="#475569" />
          </TouchableOpacity>
        </View>

        {/* Combo & Sparkle Fever Badge */}
        <View style={styles.comboRow} pointerEvents="none">
          {combo >= 2 && (
            <View style={[styles.comboBadge, isSparkleFever && styles.feverBadge]}>
              {isSparkleFever && <Flame size={16} color="#FFF" style={{ marginRight: 4 }} />}
              <Text style={styles.comboText}>
                {isSparkleFever ? '✨ SPARKLE FEVER! 2X' : `COMBO x${combo}`}
              </Text>
            </View>
          )}
        </View>

        {/* --------------------------------------------------------- */}
        {/* CENTER STAGE: PETMONG IN BATHTUB */}
        {/* --------------------------------------------------------- */}
        <View style={styles.centerTubStage} pointerEvents="none">
          <Animated.View
            style={[
              styles.petTubContainer,
              {
                transform: [{ scale: petBounce }],
              },
            ]}
          >
            {/* Wooden Bathtub Rim */}
            <View style={styles.woodenTubBack}>
              <View style={styles.tubWaterBubbles}>
                <Text style={{ fontSize: 20 }}>🫧 🫧 🫧</Text>
              </View>
            </View>

            {/* Pet Sprite */}
            <View style={styles.petTubSprite}>
              {character?.image_url ? (
                <ExpoImage
                  source={{ uri: transparentUrl || character.image_url }}
                  style={styles.petImageSprite}
                  contentFit="contain"
                />
              ) : (
                <Text style={styles.petEmojiSprite}>{character?.emoji || '🐶'}</Text>
              )}
              {/* Cute Soap Suds Foam on Petmong's Head */}
              <View style={styles.petFoamHat}>
                <Text style={{ fontSize: 24 }}>🫧</Text>
              </View>
            </View>

            {/* Front Bathtub Board */}
            <View style={styles.woodenTubFront}>
              <Text style={styles.tubLabelText}>{character?.name || '반려몽'}의 따뜻한 스파 🛁</Text>
            </View>
          </Animated.View>
        </View>

        {/* --------------------------------------------------------- */}
        {/* ACTIVE FLOATING BUBBLES */}
        {/* --------------------------------------------------------- */}
        <View style={styles.bubbleField} pointerEvents="none">
          {bubbles.map(bubble => (
            <View
              key={bubble.id}
              style={[
                styles.bubbleWrapper,
                {
                  left: bubble.x,
                  top: bubble.y,
                  width: bubble.size,
                  height: bubble.size,
                  borderRadius: bubble.size / 2,
                  borderColor: bubble.color,
                  backgroundColor: `${bubble.color}33`,
                },
              ]}
            >
              <Text style={[styles.bubbleEmoji, { fontSize: bubble.size * 0.48 }]}>
                {bubble.emoji}
              </Text>
            </View>
          ))}
        </View>

        {/* --------------------------------------------------------- */}
        {/* POP RIPPLE EFFECTS */}
        {/* --------------------------------------------------------- */}
        {popEffects.map(effect => (
          <View
            key={effect.id}
            style={[
              styles.popEffectCircle,
              {
                left: effect.x,
                top: effect.y,
                width: effect.size,
                height: effect.size,
                borderRadius: effect.size / 2,
                borderColor: effect.color,
              },
            ]}
            pointerEvents="none"
          >
            <Sparkles size={18} color={effect.color} />
          </View>
        ))}

        {/* --------------------------------------------------------- */}
        {/* FLOATING SCORE TOASTS */}
        {/* --------------------------------------------------------- */}
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
                  <Text style={styles.categoryBadgeText}>🧼 목욕하기</Text>
                </View>
              </View>

              <Text style={styles.readyTitle}>뽀득뽀득 버블 팝</Text>
              <Text style={styles.readySubtitle}>
                반려몽 주변에 피어오르는 무수한 비누방울을 손가락으로 팡팡 터트려 청결도 100%를 달성하세요!
              </Text>

              {/* Preview Box */}
              <View style={styles.readyPreviewBox}>
                <View style={styles.readyBubbleItem}>
                  <Text style={{ fontSize: 32 }}>🫧</Text>
                  <Text style={styles.readyBubbleLabel}>일반 버블</Text>
                  <Text style={styles.readyBubblePoints}>+10 P</Text>
                </View>
                <View style={styles.readyBubbleItem}>
                  <Text style={{ fontSize: 32 }}>✨</Text>
                  <Text style={styles.readyBubbleLabel}>황금 버블</Text>
                  <Text style={styles.readyBubblePoints}>+30 P</Text>
                </View>
                <View style={styles.readyBubbleItem}>
                  <Text style={{ fontSize: 32 }}>⏱️</Text>
                  <Text style={styles.readyBubbleLabel}>시간 연장</Text>
                  <Text style={[styles.readyBubblePoints, { color: '#10B981' }]}>+3초</Text>
                </View>
                <View style={styles.readyBubbleItem}>
                  <Text style={{ fontSize: 32 }}>🧼</Text>
                  <Text style={styles.readyBubbleLabel}>슈퍼 비누</Text>
                  <Text style={[styles.readyBubblePoints, { color: '#EC4899' }]}>+40 P</Text>
                </View>
              </View>

              {/* Instructions */}
              <View style={styles.instructionsList}>
                <View style={styles.instructionItem}>
                  <Text style={styles.instructionEmoji}>👆</Text>
                  <Text style={styles.instructionText}>
                    올라오는 거품을 연속 탭하거나 손가락으로 쓱- 슬라이스하여 터트립니다.
                  </Text>
                </View>
                <View style={styles.instructionItem}>
                  <Text style={styles.instructionEmoji}>🔥</Text>
                  <Text style={styles.instructionText}>
                    8콤보 달성 시 2배 점수의 스파클 피버 모드가 시작됩니다!
                  </Text>
                </View>
                <View style={styles.instructionItem}>
                  <Text style={styles.instructionEmoji}>🛁</Text>
                  <Text style={styles.instructionText}>
                    청결도 100% 완충 + 대량 EXP 및 가족 포인트 보상 지급!
                  </Text>
                </View>
              </View>

              {/* Start Button */}
              <TouchableOpacity
                style={styles.startButton}
                onPress={startGame}
                activeOpacity={0.85}
              >
                <Sparkles size={20} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.startButtonText}>목욕 시작하기 (START)</Text>
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
                {character?.name || '반려몽'}의 온몸이 뽀송뽀송 꽃향기로 가득해졌어요!
              </Text>

              {/* Stats */}
              <View style={styles.resultStatsRow}>
                <View style={styles.resultStatBox}>
                  <Text style={styles.resultStatLabel}>최종 점수</Text>
                  <Text style={styles.resultStatValue}>{score}점</Text>
                </View>
                <View style={styles.resultStatBox}>
                  <Text style={styles.resultStatLabel}>터트린 버블</Text>
                  <Text style={styles.resultStatValue}>{poppedCount}개</Text>
                </View>
                <View style={styles.resultStatBox}>
                  <Text style={styles.resultStatLabel}>달성 청결도</Text>
                  <Text style={[styles.resultStatValue, { color: '#06B6D4' }]}>{cleanliness}%</Text>
                </View>
              </View>

              {/* Rewards Box */}
              <View style={styles.rewardBox}>
                <Text style={styles.rewardBoxTitle}>🎉 목욕 완료 보상</Text>
                <View style={styles.rewardRow}>
                  <View style={styles.rewardPill}>
                    <Text style={styles.rewardPillEmoji}>🧼</Text>
                    <Text style={styles.rewardPillText}>청결도 100%</Text>
                  </View>
                  <View style={styles.rewardPill}>
                    <Text style={styles.rewardPillEmoji}>✨</Text>
                    <Text style={styles.rewardPillText}>
                      +{Math.max(12, Math.min(35, Math.round(score / 25) + Math.round(cleanliness / 10)))} EXP
                    </Text>
                  </View>
                  <View style={styles.rewardPill}>
                    <Text style={styles.rewardPillEmoji}>🏆</Text>
                    <Text style={styles.rewardPillText}>
                      +{Math.max(4, Math.min(15, Math.round(score / 55)))} P
                    </Text>
                  </View>
                </View>
              </View>

              {/* Buttons */}
              <View style={styles.resultBtnRow}>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={startGame}
                  activeOpacity={0.8}
                >
                  <RotateCcw size={18} color="#4B5563" />
                  <Text style={styles.retryBtnText}>다시하기</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.claimBtn}
                  onPress={handleClaimAndClose}
                  activeOpacity={0.85}
                >
                  <Check size={18} color="#FFF" />
                  <Text style={styles.claimBtnText}>보상받고 나가기</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  gameContainer: {
    flex: 1,
    backgroundColor: '#E0F2FE', // Warm sky aqua spa background
    overflow: 'hidden',
  },
  bathBackgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  foamSudsWave1: {
    position: 'absolute',
    bottom: 0,
    left: -20,
    right: -20,
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
  },
  foamSudsWave2: {
    position: 'absolute',
    bottom: -15,
    left: -10,
    right: -10,
    height: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
  },
  topHudBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 36,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 50,
  },
  hudPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  hudPillUrgent: {
    backgroundColor: '#FFF1F0',
    borderColor: '#FF4D4F',
    borderWidth: 1,
  },
  hudPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284C7',
    marginLeft: 4,
  },
  cleanlinessPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  cleanlinessText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0891B2',
    marginRight: 6,
  },
  cleanlinessBarBg: {
    width: 44,
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
  hudPillScore: {
    backgroundColor: '#FFFBE6',
    borderWidth: 1,
    borderColor: '#FFE58F',
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#D48806',
    marginLeft: 4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  comboRow: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 104 : 88,
    width: '100%',
    alignItems: 'center',
    zIndex: 45,
  },
  comboBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  feverBadge: {
    backgroundColor: '#EA580C',
    shadowColor: '#EA580C',
  },
  comboText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFF',
  },
  centerTubStage: {
    position: 'absolute',
    bottom: 45,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  petTubContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  woodenTubBack: {
    width: 170,
    height: 35,
    backgroundColor: '#B45309',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tubWaterBubbles: {
    alignItems: 'center',
  },
  petTubSprite: {
    alignItems: 'center',
    marginTop: -42,
    marginBottom: -22,
    zIndex: 22,
  },
  petImageSprite: {
    width: 90,
    height: 90,
  },
  petEmojiSprite: {
    fontSize: 64,
  },
  petFoamHat: {
    position: 'absolute',
    top: -12,
  },
  woodenTubFront: {
    width: 190,
    backgroundColor: '#D97706',
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FDE68A',
    shadowColor: '#B45309',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 25,
  },
  tubLabelText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
  },
  bubbleField: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 35,
  },
  bubbleWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  bubbleEmoji: {
    textAlign: 'center',
  },
  popEffectCircle: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
  },
  floatingToast: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    zIndex: 60,
  },
  floatingToastText: {
    fontSize: 13,
    fontWeight: '800',
  },
  overlayCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 100,
  },
  readyCard: {
    width: '100%',
    maxWidth: 380,
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
  readyBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  gameNoBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gameNoBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  categoryBadge: {
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
  },
  readyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E293B',
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
  readyPreviewBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  readyBubbleItem: {
    alignItems: 'center',
    flex: 1,
  },
  readyBubbleLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    marginTop: 4,
  },
  readyBubblePoints: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
    marginTop: 2,
  },
  instructionsList: {
    width: '100%',
    marginBottom: 20,
    gap: 8,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructionEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  instructionText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
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
    maxWidth: 380,
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
    alignItems: 'center',
  },
  rewardPillEmoji: {
    fontSize: 18,
    marginBottom: 2,
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
    backgroundColor: '#F3F4F6',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 6,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
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
