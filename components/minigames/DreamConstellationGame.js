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
import Svg, { Line, Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Image as ExpoImage } from 'expo-image';
import { Trophy, Sparkles, X, Moon, Star, RotateCcw, Check, Clock, Zap, Gift } from 'lucide-react-native';

const { width: INITIAL_WIDTH, height: INITIAL_HEIGHT } = Dimensions.get('window');

const GAME_DURATION = 40; // 40 seconds relaxed healing time
const STAR_RADIUS = 22;
const STAR_HIT_RADIUS = 28;

// 4 Exquisite Constellation Puzzles
const CONSTELLATIONS = [
  {
    id: 'bear',
    name: '꼬마 곰자리',
    emoji: '🐻',
    stars: [
      { id: 1, normX: 0.22, normY: 0.24 },
      { id: 2, normX: 0.38, normY: 0.20 },
      { id: 3, normX: 0.58, normY: 0.26 },
      { id: 4, normX: 0.74, normY: 0.36 },
      { id: 5, normX: 0.50, normY: 0.48 },
    ],
  },
  {
    id: 'heart',
    name: '우주 하트자리',
    emoji: '💖',
    stars: [
      { id: 1, normX: 0.50, normY: 0.26 },
      { id: 2, normX: 0.30, normY: 0.20 },
      { id: 3, normX: 0.20, normY: 0.32 },
      { id: 4, normX: 0.50, normY: 0.48 },
      { id: 5, normX: 0.80, normY: 0.32 },
      { id: 6, normX: 0.70, normY: 0.20 },
    ],
  },
  {
    id: 'crown',
    name: '황금 왕관자리',
    emoji: '👑',
    stars: [
      { id: 1, normX: 0.20, normY: 0.44 },
      { id: 2, normX: 0.28, normY: 0.25 },
      { id: 3, normX: 0.50, normY: 0.36 },
      { id: 4, normX: 0.72, normY: 0.25 },
      { id: 5, normX: 0.80, normY: 0.44 },
    ],
  },
  {
    id: 'paw',
    name: '반려몽 수호자리',
    emoji: '🐾',
    stars: [
      { id: 1, normX: 0.26, normY: 0.24 },
      { id: 2, normX: 0.46, normY: 0.20 },
      { id: 3, normX: 0.68, normY: 0.22 },
      { id: 4, normX: 0.78, normY: 0.34 },
      { id: 5, normX: 0.60, normY: 0.48 },
      { id: 6, normX: 0.34, normY: 0.46 },
    ],
  },
];

export default function DreamConstellationGame({
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

  // Game Lifecycle: 'ready' | 'playing' | 'gameover'
  const [gameState, setGameState] = useState('ready');
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [currentConstIndex, setCurrentConstIndex] = useState(0);
  const [connectedStarIds, setConnectedStarIds] = useState([1]); // First star starts active
  const [completedConstCount, setCompletedConstCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [shootingStar, setShootingStar] = useState(null); // { id, x, y }

  // Dragging active starlight beam line
  const [dragCurrentPos, setDragCurrentPos] = useState(null); // { x, y }

  // Animations
  const petBreath = useRef(new Animated.Value(1)).current;
  const constCompleteAnim = useRef(new Animated.Value(0)).current;

  // State Refs
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

  // Soft pet breathing loop
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(petBreath, { toValue: 1.06, duration: 1400, useNativeDriver: false }),
        Animated.timing(petBreath, { toValue: 0.96, duration: 1400, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [petBreath]);

  // Floating Toast Notification
  const triggerToast = useCallback((text, color = '#38BDF8', x = null, y = null) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    const toastX = x !== null ? Math.max(20, Math.min(screenWidthRef.current - 140, x - 40)) : screenWidthRef.current / 2 - 60;
    const toastY = y !== null ? Math.max(100, Math.min(screenHeightRef.current - 220, y - 30)) : screenHeightRef.current * 0.35;

    setToasts(prev => [...prev.slice(-4), { id, text, color, x: toastX, y: toastY }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 850);
  }, []);

  // Clean Reset to Ready state
  const resetToReady = useCallback(() => {
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }
    if (shootingStarTimerRef.current) {
      clearInterval(shootingStarTimerRef.current);
      shootingStarTimerRef.current = null;
    }
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    setScore(0);
    setTimeLeft(GAME_DURATION);
    setCurrentConstIndex(0);
    setConnectedStarIds([1]);
    setCompletedConstCount(0);
    setShootingStar(null);
    setDragCurrentPos(null);
    setToasts([]);
    constCompleteAnim.setValue(0);

    currentConstIndexRef.current = 0;
    connectedStarIdsRef.current = [1];
    completedConstCountRef.current = 0;
    setGameState('ready');
  }, [constCompleteAnim]);

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

  // Finish Game
  const finishGame = useCallback(() => {
    setGameState('gameover');
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (shootingStarTimerRef.current) clearInterval(shootingStarTimerRef.current);
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
  }, []);

  // -----------------------------------------------------------------
  // Connect Star in Order
  // -----------------------------------------------------------------
  const currentConstellation = CONSTELLATIONS[currentConstIndex] || CONSTELLATIONS[0];

  const handleConnectStar = useCallback((targetStarId, starPixelX, starPixelY) => {
    if (gameStateRef.current !== 'playing') return;

    const currentList = connectedStarIdsRef.current;
    const lastConnectedId = currentList[currentList.length - 1];
    const nextExpectedId = lastConnectedId + 1;

    // Star must be connected in sequential order!
    if (targetStarId === nextExpectedId) {
      const nextList = [...currentList, targetStarId];
      connectedStarIdsRef.current = nextList;
      setConnectedStarIds(nextList);
      setDragCurrentPos(null);

      // Score + Toast
      const addedPoints = 40;
      setScore(s => s + addedPoints);
      triggerToast(`✨ 별빛 연결! (+${addedPoints})`, '#38BDF8', starPixelX, starPixelY);

      // Check if all stars in this constellation are completed!
      if (nextList.length === currentConstellation.stars.length) {
        // Constellation Completed Celebration!
        completedConstCountRef.current += 1;
        setCompletedConstCount(completedConstCountRef.current);
        setScore(s => s + 200);

        Animated.sequence([
          Animated.timing(constCompleteAnim, { toValue: 1, duration: 350, useNativeDriver: false }),
          Animated.timing(constCompleteAnim, { toValue: 0, duration: 300, useNativeDriver: false }),
        ]).start();

        triggerToast(`🌟 [${currentConstellation.name}] 완성! +200 P`, '#F59E0B', screenWidthRef.current / 2, 220);

        // Next Constellation or Finish
        transitionTimerRef.current = setTimeout(() => {
          if (currentConstIndexRef.current + 1 < CONSTELLATIONS.length) {
            currentConstIndexRef.current += 1;
            setCurrentConstIndex(currentConstIndexRef.current);
            connectedStarIdsRef.current = [1];
            setConnectedStarIds([1]);
          } else {
            // All constellations completed!
            finishGame();
          }
        }, 1200);
      }
    } else if (targetStarId > nextExpectedId) {
      triggerToast(`💡 ${nextExpectedId}번 별을 먼저 연결해주세요!`, '#FBBF24', starPixelX, starPixelY);
    }
  }, [currentConstellation, constCompleteAnim, finishGame, triggerToast]);

  // Touch Move / Drag Line Handler
  const handleTouchMove = useCallback((touchX, touchY) => {
    if (gameStateRef.current !== 'playing') return;

    const currentList = connectedStarIdsRef.current;
    const lastConnectedId = currentList[currentList.length - 1];
    const nextExpectedId = lastConnectedId + 1;

    // Check distance to next expected star
    const targetStar = currentConstellation.stars.find(s => s.id === nextExpectedId);
    if (targetStar) {
      const targetPixelX = targetStar.normX * screenWidthRef.current;
      const targetPixelY = targetStar.normY * screenHeightRef.current;
      const dist = Math.hypot(touchX - targetPixelX, touchY - targetPixelY);

      if (dist <= STAR_HIT_RADIUS * 1.5) {
        handleConnectStar(targetStar.id, targetPixelX, targetPixelY);
        return;
      }
    }

    setDragCurrentPos({ x: touchX, y: touchY });
  }, [currentConstellation, handleConnectStar]);

  // Spawn Shooting Star occasionally
  useEffect(() => {
    if (gameState === 'playing') {
      shootingStarTimerRef.current = setInterval(() => {
        const randX = Math.random() * (screenWidthRef.current * 0.6) + 40;
        const randY = Math.random() * 120 + 80;
        setShootingStar({ id: Date.now(), x: randX, y: randY });

        setTimeout(() => setShootingStar(null), 3200);
      }, 12000);
    }
    return () => {
      if (shootingStarTimerRef.current) clearInterval(shootingStarTimerRef.current);
    };
  }, [gameState]);

  // Game Countdown Timer
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
    }
    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    };
  }, [gameState, finishGame]);

  const startGame = useCallback(() => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setCurrentConstIndex(0);
    setConnectedStarIds([1]);
    setCompletedConstCount(0);
    setShootingStar(null);
    setDragCurrentPos(null);
    setToasts([]);
    constCompleteAnim.setValue(0);

    currentConstIndexRef.current = 0;
    connectedStarIdsRef.current = [1];
    completedConstCountRef.current = 0;
    setGameState('playing');
  }, [constCompleteAnim]);

  // Compute Grade & Rewards
  const getGameGrade = (finalCompleted, finalScore) => {
    if (finalCompleted >= 4 || finalScore >= 800) {
      return { grade: 'S', color: '#FAAD14', title: '꿈나라 지휘자 👑' };
    }
    if (finalCompleted >= 3 || finalScore >= 550) {
      return { grade: 'A', color: '#52C41A', title: '밤하늘 천문학자 🌟' };
    }
    if (finalCompleted >= 2 || finalScore >= 350) {
      return { grade: 'B', color: '#38BDF8', title: '별빛 탐험가 🔭' };
    }
    return { grade: 'C', color: '#8C8C8C', title: '초보 별지기 🌱' };
  };

  const handleClaimAndClose = () => {
    const finalExp = Math.max(12, Math.min(35, Math.round(score / 25) + completedConstCount * 4));
    const finalPoints = Math.max(4, Math.min(15, Math.round(score / 60)));

    if (onGameComplete) {
      onGameComplete({
        score,
        completedCount: completedConstCount,
        exp: finalExp,
        points: finalPoints,
      });
    }
    if (onClose) onClose();
  };

  if (!visible) return null;

  const currentGrade = getGameGrade(completedConstCount, score);

  // Calculate lines between connected stars
  const connectedLines = [];
  for (let i = 0; i < connectedStarIds.length - 1; i++) {
    const fromStar = currentConstellation.stars.find(s => s.id === connectedStarIds[i]);
    const toStar = currentConstellation.stars.find(s => s.id === connectedStarIds[i + 1]);
    if (fromStar && toStar) {
      connectedLines.push({
        fromX: fromStar.normX * screenWidth,
        fromY: fromStar.normY * screenHeight,
        toX: toStar.normX * screenWidth,
        toY: toStar.normY * screenHeight,
      });
    }
  }

  // Constellation blueprint outline guide lines
  const guideLines = [];
  for (let i = 0; i < currentConstellation.stars.length - 1; i++) {
    const fromStar = currentConstellation.stars[i];
    const toStar = currentConstellation.stars[i + 1];
    guideLines.push({
      fromX: fromStar.normX * screenWidth,
      fromY: fromStar.normY * screenHeight,
      toX: toStar.normX * screenWidth,
      toY: toStar.normY * screenHeight,
    });
  }

  // Active dragging line from the latest connected star
  const latestStar = currentConstellation.stars.find(
    s => s.id === connectedStarIds[connectedStarIds.length - 1]
  );
  const dragLineFromX = latestStar ? latestStar.normX * screenWidth : 0;
  const dragLineFromY = latestStar ? latestStar.normY * screenHeight : 0;

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
        onTouchMove={
          gameState === 'playing' ? (e) => handleTouchMove(e.nativeEvent.pageX, e.nativeEvent.pageY) : undefined
        }
        onTouchEnd={() => setDragCurrentPos(null)}
      >
        {/* Midnight Celestial Sky Background with Ambient Stars */}
        <View style={styles.ambientSky} pointerEvents="none">
          {[...Array(24)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.ambientStar,
                {
                  left: `${(i * 17 + 13) % 92}%`,
                  top: `${(i * 23 + 9) % 75}%`,
                  opacity: 0.25 + ((i % 5) * 0.15),
                  transform: [{ scale: 0.6 + ((i % 4) * 0.3) }],
                },
              ]}
            />
          ))}
        </View>

        {/* --------------------------------------------------------- */}
        {/* TOP STATUS HUD BAR */}
        {/* --------------------------------------------------------- */}
        <View style={styles.topHudBar} pointerEvents="box-none">
          {/* Time Counter */}
          <View style={[styles.hudPill, timeLeft <= 8 && styles.hudPillUrgent]}>
            <Clock size={16} color={timeLeft <= 8 ? '#FF4D4F' : '#38BDF8'} />
            <Text style={[styles.hudPillText, timeLeft <= 8 && { color: '#FF4D4F' }]}>
              {timeLeft}초
            </Text>
          </View>

          {/* Constellation Progress */}
          <View style={styles.constProgressPill}>
            <Text style={{ fontSize: 13, marginRight: 4 }}>{currentConstellation.emoji}</Text>
            <Text style={styles.constProgressText}>
              {currentConstIndex + 1}/{CONSTELLATIONS.length} {currentConstellation.name}
            </Text>
          </View>

          {/* Score Counter */}
          <View style={[styles.hudPill, styles.hudPillScore]}>
            <Trophy size={16} color="#FBBF24" />
            <Text style={styles.scoreText}>{score} P</Text>
          </View>

          {/* Close Game Button */}
          <TouchableOpacity onPress={handleExitPress} style={styles.closeBtn} activeOpacity={0.8}>
            <X size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* --------------------------------------------------------- */}
        {/* SVG CONSTELLATION CONNECTION LINES LAYER */}
        {/* --------------------------------------------------------- */}
        <Svg
          width={screenWidth}
          height={screenHeight}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        >
          <Defs>
            <LinearGradient id="beamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#38BDF8" stopOpacity="0.95" />
              <Stop offset="100%" stopColor="#818CF8" stopOpacity="0.95" />
            </LinearGradient>
          </Defs>

          {/* Faint Constellation Blueprint Guide Lines */}
          {guideLines.map((line, idx) => (
            <Line
              key={`guide_line_${idx}`}
              x1={line.fromX}
              y1={line.fromY}
              x2={line.toX}
              y2={line.toY}
              stroke="rgba(148, 163, 184, 0.35)"
              strokeWidth="1.8"
              strokeDasharray="5, 5"
            />
          ))}

          {/* Connected Starlight Lines */}
          {connectedLines.map((line, idx) => (
            <G key={`conn_line_${idx}`}>
              {/* Outer glow stroke */}
              <Line
                x1={line.fromX}
                y1={line.fromY}
                x2={line.toX}
                y2={line.toY}
                stroke="#38BDF8"
                strokeWidth="7"
                strokeOpacity="0.4"
              />
              {/* Core starlight line */}
              <Line
                x1={line.fromX}
                y1={line.fromY}
                x2={line.toX}
                y2={line.toY}
                stroke="url(#beamGrad)"
                strokeWidth="3"
              />
            </G>
          ))}

          {/* Dynamic Dragging Starlight Line */}
          {dragCurrentPos && latestStar && (
            <Line
              x1={dragLineFromX}
              y1={dragLineFromY}
              x2={dragCurrentPos.x}
              y2={dragCurrentPos.y}
              stroke="#FDE047"
              strokeWidth="2.5"
              strokeDasharray="4, 4"
              strokeOpacity="0.85"
            />
          )}
        </Svg>

        {/* --------------------------------------------------------- */}
        {/* CONSTELLATION STARS INTERACTIVE TOUCH LAYER */}
        {/* --------------------------------------------------------- */}
        {gameState === 'playing' && (
          <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
            {currentConstellation.stars.map((star) => {
              const pixelX = star.normX * screenWidth;
              const pixelY = star.normY * screenHeight;
              const isConnected = connectedStarIds.includes(star.id);
              const isNext = star.id === connectedStarIds[connectedStarIds.length - 1] + 1;

              return (
                <TouchableOpacity
                  key={`star_${star.id}`}
                  style={[
                    styles.starTouchArea,
                    {
                      left: pixelX - STAR_HIT_RADIUS,
                      top: pixelY - STAR_HIT_RADIUS,
                    },
                  ]}
                  onPress={() => handleConnectStar(star.id, pixelX, pixelY)}
                  activeOpacity={0.75}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <View
                    style={[
                      styles.starGlowCircle,
                      isConnected && styles.starGlowConnected,
                      isNext && styles.starGlowNext,
                    ]}
                  >
                    {/* Pulsing Target Beacon Aura */}
                    {isNext && <View style={styles.nextStarPulseAura} />}

                    {/* Radiant Star Icon */}
                    <Star
                      size={isConnected ? 22 : isNext ? 26 : 20}
                      color={isConnected ? '#38BDF8' : isNext ? '#F59E0B' : '#FDE047'}
                      fill={isConnected ? '#38BDF8' : isNext ? '#F59E0B' : '#FEF08A'}
                    />

                    {/* Star Number Badge */}
                    <View
                      style={[
                        styles.starNumberBadge,
                        isConnected && styles.starNumberBadgeConnected,
                        isNext && styles.starNumberBadgeNext,
                      ]}
                    >
                      <Text
                        style={[
                          styles.starNumberText,
                          isConnected && styles.starNumberTextConnected,
                          isNext && styles.starNumberTextNext,
                        ]}
                      >
                        {star.id}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* --------------------------------------------------------- */}
        {/* SHOOTING STAR SURPRISE GIMMICK */}
        {/* --------------------------------------------------------- */}
        {shootingStar && (
          <TouchableOpacity
            style={[styles.shootingStarPill, { left: shootingStar.x, top: shootingStar.y }]}
            onPress={() => {
              setShootingStar(null);
              setScore(s => s + 80);
              triggerToast('🌠 별똥별 소원 보너스! (+80 P)', '#FBBF24', shootingStar.x, shootingStar.y);
            }}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 20 }}>🌠</Text>
            <Text style={styles.shootingStarText}>소원 빌기 탭!</Text>
          </TouchableOpacity>
        )}

        {/* --------------------------------------------------------- */}
        {/* BOTTOM STAGE: SLEEPING PETMONG ON COZY CLOUD BED */}
        {/* --------------------------------------------------------- */}
        <View style={styles.bottomSleepStage} pointerEvents="none">
          <Animated.View
            style={[
              styles.petSleepContainer,
              {
                transform: [{ scale: petBreath }],
              },
            ]}
          >
            {/* Dream Thought Bubble */}
            <View style={styles.dreamBubble}>
              <Text style={styles.dreamBubbleText}>
                {completedConstCount > 0 ? '✨ 포근한 별자리 꿈... 💭' : '쿠울... 쿨쿨 zZ 🌙'}
              </Text>
            </View>

            {/* Pet Sprite */}
            <View style={styles.petSleepSpriteWrapper}>
              {character?.image_url ? (
                <ExpoImage
                  source={{ uri: transparentUrl || character.image_url }}
                  style={styles.petImageSprite}
                  contentFit="contain"
                />
              ) : (
                <Text style={styles.petEmojiSprite}>{character?.emoji || '🐶'}</Text>
              )}
            </View>

            {/* Cozy Cloud Pillows */}
            <View style={styles.cozyCloudBed}>
              <Text style={styles.cloudBedEmoji}>☁️ ☁️ ☁️</Text>
            </View>
          </Animated.View>
        </View>

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
        {/* 1. READY / HOW-TO-PLAY OVERLAY */}
        {/* --------------------------------------------------------- */}
        {gameState === 'ready' && (
          <View style={[styles.overlayCenter, { width: screenWidth, height: screenHeight }]}>
            <View style={styles.readyCard}>
              <View style={styles.readyBadgeRow}>
                <View style={styles.gameNoBadge}>
                  <Text style={styles.gameNoBadgeText}>제4탄 미니게임</Text>
                </View>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>🌙 재우기</Text>
                </View>
              </View>

              <Text style={styles.readyTitle}>꿈나라 별자리 잇기</Text>
              <Text style={styles.readySubtitle}>
                밤하늘 천장의 빛나는 별들을 순서대로 선으로 이어 별자리를 완성하고 반려몽에게 꿀잠을 선물하세요!
              </Text>

              {/* Constellation Preview */}
              <View style={styles.readyPreviewBox}>
                <View style={styles.readyConstItem}>
                  <Text style={{ fontSize: 26 }}>🐻</Text>
                  <Text style={styles.readyConstLabel}>꼬마곰자리</Text>
                </View>
                <View style={styles.readyConstItem}>
                  <Text style={{ fontSize: 26 }}>💖</Text>
                  <Text style={styles.readyConstLabel}>하트자리</Text>
                </View>
                <View style={styles.readyConstItem}>
                  <Text style={{ fontSize: 26 }}>👑</Text>
                  <Text style={styles.readyConstLabel}>왕관자리</Text>
                </View>
                <View style={styles.readyConstItem}>
                  <Text style={{ fontSize: 26 }}>🐾</Text>
                  <Text style={styles.readyConstLabel}>수호자리</Text>
                </View>
              </View>

              {/* Instructions */}
              <View style={styles.instructionsList}>
                <View style={styles.instructionItem}>
                  <Text style={styles.instructionEmoji}>✨</Text>
                  <Text style={styles.instructionText}>
                    1번 별부터 시작하여 2번, 3번 별을 차례대로 탭하거나 드래그하여 잇습니다.
                  </Text>
                </View>
                <View style={styles.instructionItem}>
                  <Text style={styles.instructionEmoji}>🌠</Text>
                  <Text style={styles.instructionText}>
                    가끔 날아가는 별똥별을 터치하면 깜짝 추가 별가루 보너스!
                  </Text>
                </View>
                <View style={styles.instructionItem}>
                  <Text style={styles.instructionEmoji}>🎁</Text>
                  <Text style={styles.instructionText}>
                    완성 시 에너지 100% 완충 + 대량 EXP 및 포인트 보상 지급!
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
                <Text style={styles.startButtonText}>별자리 잇기 시작 (START)</Text>
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
                {character?.name || '반려몽'}이 아름다운 별자리 꿈을 꾸며 깊은 잠에 빠졌어요!
              </Text>

              {/* Stats */}
              <View style={styles.resultStatsRow}>
                <View style={styles.resultStatBox}>
                  <Text style={styles.resultStatLabel}>최종 점수</Text>
                  <Text style={styles.resultStatValue}>{score}점</Text>
                </View>
                <View style={styles.resultStatBox}>
                  <Text style={styles.resultStatLabel}>완성한 별자리</Text>
                  <Text style={[styles.resultStatValue, { color: '#F59E0B' }]}>
                    {completedConstCount}/{CONSTELLATIONS.length}개
                  </Text>
                </View>
              </View>

              {/* Rewards Box */}
              <View style={styles.rewardBox}>
                <Text style={styles.rewardBoxTitle}>🎉 꿀잠 수면 완료 보상</Text>
                <View style={styles.rewardRow}>
                  <View style={styles.rewardPill}>
                    <Text style={styles.rewardPillEmoji}>⚡</Text>
                    <Text style={styles.rewardPillText}>에너지 100%</Text>
                  </View>
                  <View style={styles.rewardPill}>
                    <Text style={styles.rewardPillEmoji}>✨</Text>
                    <Text style={styles.rewardPillText}>
                      +{Math.max(12, Math.min(35, Math.round(score / 25) + completedConstCount * 4))} EXP
                    </Text>
                  </View>
                  <View style={styles.rewardPill}>
                    <Text style={styles.rewardPillEmoji}>🏆</Text>
                    <Text style={styles.rewardPillText}>
                      +{Math.max(4, Math.min(15, Math.round(score / 60)))} P
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
    backgroundColor: '#0F172A', // Deep midnight celestial indigo
    overflow: 'hidden',
  },
  ambientSky: {
    ...StyleSheet.absoluteFillObject,
  },
  ambientStar: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFF',
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
    backgroundColor: 'rgba(30, 41, 59, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  hudPillUrgent: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderColor: '#EF4444',
  },
  hudPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#38BDF8',
    marginLeft: 4,
  },
  constProgressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#4F46E5',
  },
  constProgressText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C7D2FE',
  },
  hudPillScore: {
    backgroundColor: 'rgba(30, 41, 59, 0.92)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FBBF24',
    marginLeft: 4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  starTouchArea: {
    position: 'absolute',
    width: STAR_HIT_RADIUS * 2,
    height: STAR_HIT_RADIUS * 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 35,
  },
  starGlowCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    borderWidth: 2,
    borderColor: 'rgba(254, 240, 138, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FEF08A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 8,
    elevation: 6,
  },
  starGlowConnected: {
    backgroundColor: 'rgba(14, 165, 233, 0.25)',
    borderColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOpacity: 0.9,
    shadowRadius: 12,
  },
  starGlowNext: {
    backgroundColor: 'rgba(245, 158, 11, 0.3)',
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOpacity: 1.0,
    shadowRadius: 14,
    transform: [{ scale: 1.15 }],
  },
  nextStarPulseAura: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.8)',
    borderStyle: 'dashed',
    zIndex: -1,
  },
  starNumberBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#FDE047',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  starNumberBadgeConnected: {
    backgroundColor: '#0369A1',
    borderColor: '#BAE6FD',
  },
  starNumberBadgeNext: {
    backgroundColor: '#D97706',
    borderColor: '#FEF3C7',
  },
  starNumberText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FEF08A',
  },
  starNumberTextConnected: {
    color: '#FFFFFF',
  },
  starNumberTextNext: {
    color: '#FFFFFF',
  },
  shootingStarPill: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 40,
  },
  shootingStarText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
    marginLeft: 4,
  },
  bottomSleepStage: {
    position: 'absolute',
    bottom: 35,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  petSleepContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dreamBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 4,
    shadowColor: '#818CF8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  dreamBubbleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4338CA',
  },
  petSleepSpriteWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -18,
    zIndex: 22,
  },
  petImageSprite: {
    width: 86,
    height: 86,
  },
  petEmojiSprite: {
    fontSize: 60,
  },
  cozyCloudBed: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloudBedEmoji: {
    fontSize: 28,
  },
  floatingToast: {
    position: 'absolute',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
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
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 100,
  },
  readyCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
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
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gameNoBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A5B4FC',
  },
  categoryBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },
  readyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
    marginBottom: 6,
    textAlign: 'center',
  },
  readySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  readyPreviewBox: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  readyConstItem: {
    alignItems: 'center',
    flex: 1,
  },
  readyConstLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 4,
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
    color: '#CBD5E1',
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
    shadowOpacity: 0.4,
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
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
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
    backgroundColor: '#0F172A',
  },
  gradeText: {
    fontSize: 38,
    fontWeight: '900',
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 18,
  },
  resultStatsRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  resultStatBox: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  resultStatLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 4,
  },
  resultStatValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  rewardBox: {
    width: '100%',
    backgroundColor: 'rgba(79, 70, 229, 0.18)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(165, 180, 252, 0.3)',
    marginBottom: 20,
  },
  rewardBoxTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#A5B4FC',
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
    color: '#C7D2FE',
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
    backgroundColor: '#334155',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 6,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E2E8F0',
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
