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
import Svg, { Circle, Path, Polygon } from 'react-native-svg';
import {
  Trophy,
  Sparkles,
  Heart,
  X,
  Flame,
  RotateCcw,
  Check,
  Zap,
  Play,
  Hand,
  Gift,
  Activity,
  Star,
  PawPrint,
} from 'lucide-react-native';

const { width: INITIAL_WIDTH, height: INITIAL_HEIGHT } = Dimensions.get('window');

// Crisp Vector Soccer Ball Component
function SoccerBallIcon({ size = 38 }) {
  const r = size / 2;
  const strokeW = Math.max(1.5, size * 0.05);
  return (
    <Svg width={size} height={size} viewBox="0 0 38 38">
      <Circle cx="19" cy="19" r="17.5" fill="#FFFFFF" stroke="#1E293B" strokeWidth={strokeW} />
      {/* Center Pentagon */}
      <Polygon points="19,13 24,17 22,23 16,23 14,17" fill="#1E293B" />
      {/* Connecting Seam Lines */}
      <Path d="M19 13 L19 2" stroke="#1E293B" strokeWidth={strokeW} strokeLinecap="round" />
      <Path d="M24 17 L33.5 14" stroke="#1E293B" strokeWidth={strokeW} strokeLinecap="round" />
      <Path d="M22 23 L31 29" stroke="#1E293B" strokeWidth={strokeW} strokeLinecap="round" />
      <Path d="M16 23 L7 29" stroke="#1E293B" strokeWidth={strokeW} strokeLinecap="round" />
      <Path d="M14 17 L4.5 14" stroke="#1E293B" strokeWidth={strokeW} strokeLinecap="round" />
    </Svg>
  );
}

// Golden Star Ball Component
function GoldenBallIcon({ size = 38 }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 38 38" style={StyleSheet.absoluteFillObject}>
        <Circle cx="19" cy="19" r="17.5" fill="#F59E0B" stroke="#FDE68A" strokeWidth="2.5" />
      </Svg>
      <Star size={size * 0.58} color="#FFFFFF" fill="#FFFFFF" />
    </View>
  );
}

// Game Dimensions & Constants
const PADDLE_WIDTH = 105;
const PADDLE_HEIGHT = 20;
const BALL_SIZE = 38;
const PET_SIZE = 76;
const BASE_SPEED = 7.5;
const MAX_SPEED = 14.5;
const INITIAL_LIVES = 3;

export default function KeepyUppyGame({
  visible,
  character,
  transparentUrl,
  onClose,
  onGameComplete,
}) {
  // Screen Dimensions with dynamic listener
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
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [score, setScore] = useState(0);
  const [rallyCount, setRallyCount] = useState(0);
  const [maxRally, setMaxRally] = useState(0);
  const [isGoldenBall, setIsGoldenBall] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Paddle & Ball State
  const [paddleX, setPaddleX] = useState((INITIAL_WIDTH - PADDLE_WIDTH) / 2);
  const [petX, setPetX] = useState((INITIAL_WIDTH - PET_SIZE) / 2);
  const [ballPos, setBallPos] = useState({
    x: INITIAL_WIDTH / 2 - BALL_SIZE / 2,
    y: 190,
  });

  // Animation values
  const paddleBounce = useRef(new Animated.Value(1)).current;
  const petBounce = useRef(new Animated.Value(1)).current;
  const ballSpin = useRef(new Animated.Value(0)).current;
  const goldenPulse = useRef(new Animated.Value(1)).current;

  // Refs for 60fps Game Loop & Collision Detection
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const screenWidthRef = useRef(screenWidth);
  screenWidthRef.current = screenWidth;

  const screenHeightRef = useRef(screenHeight);
  screenHeightRef.current = screenHeight;

  const paddleXRef = useRef((INITIAL_WIDTH - PADDLE_WIDTH) / 2);
  const petXRef = useRef((INITIAL_WIDTH - PET_SIZE) / 2);
  const ballRef = useRef({
    x: INITIAL_WIDTH / 2 - BALL_SIZE / 2,
    y: 190,
    vx: 3.2,
    vy: BASE_SPEED,
    speedMultiplier: 1.0,
  });

  const rallyCountRef = useRef(0);
  const livesRef = useRef(INITIAL_LIVES);
  const isGoldenBallRef = useRef(false);
  const animFrameRef = useRef(null);

  // -----------------------------------------------------------------
  // Paddle Control (Zero-latency direct finger tracking)
  // -----------------------------------------------------------------
  const movePaddle = useCallback((touchX) => {
    if (typeof touchX !== 'number' || isNaN(touchX)) return;
    const stageWidth = screenWidthRef.current;
    const targetX = Math.max(10, Math.min(stageWidth - PADDLE_WIDTH - 10, touchX - PADDLE_WIDTH / 2));
    paddleXRef.current = targetX;
    setPaddleX(targetX);
  }, []);

  // Floating Toast Notification
  const triggerToast = (text, color = '#10B981', yPos = null) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    const x = Math.max(30, Math.min(screenWidthRef.current - 130, ballRef.current.x - 40));
    const y = yPos !== null ? yPos : Math.max(120, Math.min(screenHeightRef.current - 180, ballRef.current.y));
    setToasts(prev => [...prev.slice(-3), { id, text, color, x, y }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 850);
  };

  // -----------------------------------------------------------------
  // Start / Reset Game
  // -----------------------------------------------------------------
  const resetBall = useCallback((serveFromPlayer = false) => {
    const stageWidth = screenWidthRef.current;
    const stageHeight = screenHeightRef.current;
    const initialX = stageWidth / 2 - BALL_SIZE / 2;
    const initialY = serveFromPlayer ? stageHeight - 160 : 180;
    const initialVy = serveFromPlayer ? -BASE_SPEED : BASE_SPEED;
    const initialVx = (Math.random() > 0.5 ? 1 : -1) * (2.5 + Math.random() * 2);

    ballRef.current = {
      x: initialX,
      y: initialY,
      vx: initialVx,
      vy: initialVy,
      speedMultiplier: Math.min(1.0 + rallyCountRef.current * 0.03, 1.8),
    };
    setBallPos({ x: initialX, y: initialY });
  }, []);

  const startGame = useCallback(() => {
    const stageWidth = screenWidthRef.current;
    const initialPaddle = (stageWidth - PADDLE_WIDTH) / 2;
    const initialPet = (stageWidth - PET_SIZE) / 2;

    paddleXRef.current = initialPaddle;
    petXRef.current = initialPet;
    setPaddleX(initialPaddle);
    setPetX(initialPet);

    setScore(0);
    setRallyCount(0);
    setMaxRally(0);
    setLives(INITIAL_LIVES);
    setIsGoldenBall(false);
    setToasts([]);
    rallyCountRef.current = 0;
    livesRef.current = INITIAL_LIVES;
    isGoldenBallRef.current = false;

    resetBall(false);
    setGameState('playing');
  }, [resetBall]);

  // Finish Game
  const finishGame = useCallback(() => {
    setGameState('gameover');
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }, []);

  // Clean Reset to Ready state
  const resetToReady = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    const stageWidth = screenWidthRef.current;
    const initialPaddle = (stageWidth - PADDLE_WIDTH) / 2;
    const initialPet = (stageWidth - PET_SIZE) / 2;

    paddleXRef.current = initialPaddle;
    petXRef.current = initialPet;
    setPaddleX(initialPaddle);
    setPetX(initialPet);

    setScore(0);
    setRallyCount(0);
    setMaxRally(0);
    setLives(INITIAL_LIVES);
    setIsGoldenBall(false);
    setToasts([]);
    rallyCountRef.current = 0;
    livesRef.current = INITIAL_LIVES;
    isGoldenBallRef.current = false;

    resetBall(false);
    setGameState('ready');
  }, [resetBall]);

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

  // Auto-reset when modal becomes invisible
  useEffect(() => {
    if (!visible) {
      resetToReady();
    }
  }, [visible, resetToReady]);

  // -----------------------------------------------------------------
  // 60FPS Game Loop & Physics
  // -----------------------------------------------------------------
  useEffect(() => {
    if (gameState !== 'playing') return;

    let isRunning = true;

    const updatePhysics = () => {
      if (!isRunning || gameStateRef.current !== 'playing') return;

      const stageWidth = screenWidthRef.current;
      const stageHeight = screenHeightRef.current;
      const ball = ballRef.current;
      const paddleY = stageHeight - 120; // Bottom paddle height
      const petY = 110; // Top pet height

      // 1. Move Ball
      ball.x += ball.vx * ball.speedMultiplier;
      ball.y += ball.vy * ball.speedMultiplier;

      // 2. Left & Right Wall Collision
      if (ball.x <= 10) {
        ball.x = 10;
        ball.vx = Math.abs(ball.vx);
      } else if (ball.x >= stageWidth - BALL_SIZE - 10) {
        ball.x = stageWidth - BALL_SIZE - 10;
        ball.vx = -Math.abs(ball.vx);
      }

      // 3. AI: Smooth Petmong Tracking (Upper Court)
      const targetPetX = Math.max(10, Math.min(stageWidth - PET_SIZE - 10, ball.x - (PET_SIZE - BALL_SIZE) / 2));
      const petSpeed = Math.min(8.5, 3.8 + rallyCountRef.current * 0.15);
      petXRef.current += (targetPetX - petXRef.current) * 0.22;
      petXRef.current = Math.max(10, Math.min(stageWidth - PET_SIZE - 10, petXRef.current));
      setPetX(petXRef.current);

      // 4. Petmong Header / Kick (Top Bounce)
      if (ball.y <= petY + PET_SIZE - 10 && ball.vy < 0) {
        const petLeft = petXRef.current - 18;
        const petRight = petXRef.current + PET_SIZE + 18;

        if (ball.x + BALL_SIZE >= petLeft && ball.x <= petRight) {
          // Petmong successfully intercepts!
          ball.vy = Math.abs(ball.vy);
          ball.y = petY + PET_SIZE - 8;

          // Angle variation based on Petmong hit position
          const hitOffset = (ball.x + BALL_SIZE / 2 - (petXRef.current + PET_SIZE / 2)) / (PET_SIZE / 2);
          ball.vx = hitOffset * 4.2 + (Math.random() - 0.5) * 1.5;

          // Pet jump animation
          Animated.sequence([
            Animated.timing(petBounce, { toValue: 1.25, duration: 80, useNativeDriver: false }),
            Animated.timing(petBounce, { toValue: 1.0, duration: 80, useNativeDriver: false }),
          ]).start();

          // Rally combo count increment
          rallyCountRef.current += 1;
          const currentRally = rallyCountRef.current;
          setRallyCount(currentRally);
          setMaxRally(m => Math.max(m, currentRally));

          // Golden ball check
          if (currentRally % 8 === 0 && !isGoldenBallRef.current) {
            isGoldenBallRef.current = true;
            setIsGoldenBall(true);
            triggerToast('황금 볼 타임! 2배 점수!', '#F59E0B', 220);
          }

          const multiplier = isGoldenBallRef.current ? 2 : 1;
          const addedScore = (15 + Math.min(currentRally * 2, 30)) * multiplier;
          setScore(s => s + addedScore);

          triggerToast(
            currentRally % 5 === 0 ? `콤보 ${currentRally}회!` : '반려몽 헤딩!',
            '#3B82F6',
            160
          );

          // Speed scaling
          ball.speedMultiplier = Math.min(MAX_SPEED / BASE_SPEED, 1.0 + currentRally * 0.025);
        } else if (ball.y <= 40) {
          // Rebounded off top net/ceiling if Petmong slightly missed
          ball.vy = Math.abs(ball.vy);
        }
      }

      // 5. User Paddle Bounce (Bottom Bounce)
      if (ball.y + BALL_SIZE >= paddleY && ball.y <= paddleY + PADDLE_HEIGHT + 14 && ball.vy > 0) {
        const pLeft = paddleXRef.current - 14;
        const pRight = paddleXRef.current + PADDLE_WIDTH + 14;

        if (ball.x + BALL_SIZE >= pLeft && ball.x <= pRight) {
          // Perfect paddle hit!
          ball.vy = -Math.abs(ball.vy);
          ball.y = paddleY - BALL_SIZE - 2;

          // Angular deflection: hitting edges imparts directional velocity
          const paddleCenter = paddleXRef.current + PADDLE_WIDTH / 2;
          const ballCenter = ball.x + BALL_SIZE / 2;
          const hitFactor = (ballCenter - paddleCenter) / (PADDLE_WIDTH / 2); // -1.0 to 1.0
          ball.vx = hitFactor * 5.2 + (Math.random() - 0.5);

          // Paddle squish feedback
          Animated.sequence([
            Animated.timing(paddleBounce, { toValue: 0.82, duration: 60, useNativeDriver: false }),
            Animated.timing(paddleBounce, { toValue: 1.15, duration: 80, useNativeDriver: false }),
            Animated.timing(paddleBounce, { toValue: 1.0, duration: 70, useNativeDriver: false }),
          ]).start();

          rallyCountRef.current += 1;
          const currentRally = rallyCountRef.current;
          setRallyCount(currentRally);
          setMaxRally(m => Math.max(m, currentRally));

          const multiplier = isGoldenBallRef.current ? 2 : 1;
          const addedScore = (20 + Math.min(currentRally * 2, 40)) * multiplier;
          setScore(s => s + addedScore);

          triggerToast(
            Math.abs(hitFactor) < 0.25 ? 'PERFECT 리프팅!' : '나이스 킥!',
            '#10B981',
            paddleY - 50
          );
        }
      }

      // 6. Ball Dropped Past Bottom (Miss / Lose Life)
      if (ball.y >= stageHeight - 40) {
        livesRef.current -= 1;
        setLives(livesRef.current);
        triggerToast('공을 놓쳤어요!', '#EF4444', stageHeight - 170);

        if (livesRef.current <= 0) {
          finishGame();
          return;
        } else {
          // Serve fresh ball from player paddle
          resetBall(true);
        }
      }

      setBallPos({ x: ball.x, y: ball.y });
      animFrameRef.current = requestAnimationFrame(updatePhysics);
    };

    animFrameRef.current = requestAnimationFrame(updatePhysics);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, finishGame, paddleBounce, petBounce, resetBall]);

  // Compute Grade & Rewards
  const getGameGrade = (finalScore, finalRally) => {
    if (finalRally >= 25 || finalScore >= 600) {
      return { grade: 'S', color: '#FAAD14', title: '랠리 마스터' };
    }
    if (finalRally >= 18 || finalScore >= 400) {
      return { grade: 'A', color: '#52C41A', title: '환상의 콤비' };
    }
    if (finalRally >= 10 || finalScore >= 220) {
      return { grade: 'B', color: '#1890FF', title: '찰떡 호흡' };
    }
    return { grade: 'C', color: '#8C8C8C', title: '새싹 드리블러' };
  };

  const handleClaimAndClose = () => {
    const finalExp = Math.max(12, Math.min(35, Math.round(score / 25) + maxRally));
    const finalPoints = Math.max(4, Math.min(15, Math.round(score / 50)));

    if (onGameComplete) {
      onGameComplete({
        score,
        maxRally,
        exp: finalExp,
        points: finalPoints,
      });
    }
    if (onClose) onClose();
  };

  if (!visible) return null;

  const currentGrade = getGameGrade(score, maxRally);

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
          gameState === 'playing' ? (e) => movePaddle(e.nativeEvent.pageX) : undefined
        }
        onTouchMove={
          gameState === 'playing' ? (e) => movePaddle(e.nativeEvent.pageX) : undefined
        }
      >
        {/* Pitch Green Grass Lines & Markings */}
        <View style={styles.pitchLines} pointerEvents="none">
          <View style={styles.pitchCenterLine} />
          <View style={styles.pitchCenterCircle} />
          <View style={styles.pitchGoalTop} />
          <View style={styles.pitchGoalBottom} />
        </View>

        {/* --------------------------------------------------------- */}
        {/* TOP STATUS HUD BAR */}
        {/* --------------------------------------------------------- */}
        <View style={styles.topHudBar} pointerEvents="box-none">
          {/* Lives Counter */}
          <View style={styles.hudPill}>
            <View style={styles.livesRow}>
              {[1, 2, 3].map((heartIndex) => (
                <Heart
                  key={heartIndex}
                  size={18}
                  color={heartIndex <= lives ? '#FF4D6D' : '#D1D5DB'}
                  fill={heartIndex <= lives ? '#FF4D6D' : '#F3F4F6'}
                  style={{ marginRight: 3 }}
                />
              ))}
            </View>
          </View>

          {/* Rally Counter */}
          <View style={[styles.hudPill, isGoldenBall && styles.hudPillGolden]}>
            <Flame size={16} color={isGoldenBall ? '#FFF' : '#FF6B00'} />
            <Text style={[styles.rallyText, isGoldenBall && { color: '#FFF' }]}>
              랠리 {rallyCount}회
            </Text>
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

        {/* --------------------------------------------------------- */}
        {/* UPPER COURT: PETMONG PARTNER */}
        {/* --------------------------------------------------------- */}
        <Animated.View
          style={[
            styles.petSpriteContainer,
            {
              left: petX,
              top: 110,
              transform: [{ scale: petBounce }],
            },
          ]}
          pointerEvents="none"
        >
          <View style={[styles.petPartnerBadge, { flexDirection: 'row', alignItems: 'center' }]}>
            <PawPrint size={11} color="#FFF" style={{ marginRight: 4 }} />
            <Text style={styles.petPartnerBadgeText}>{character?.name || '반려몽'}</Text>
          </View>

          {character?.image_url ? (
            <ExpoImage
              source={{ uri: transparentUrl || character.image_url }}
              style={styles.petSpriteImage}
              contentFit="contain"
            />
          ) : (
            <Text style={styles.petSpriteEmoji}>{character?.emoji || '🐶'}</Text>
          )}
        </Animated.View>

        {/* --------------------------------------------------------- */}
        {/* PLAYING BALL */}
        {/* --------------------------------------------------------- */}
        {gameState === 'playing' && (
          <View
            style={[
              styles.ballContainer,
              {
                left: ballPos.x,
                top: ballPos.y,
              },
            ]}
            pointerEvents="none"
          >
            {isGoldenBall ? (
              <View style={styles.goldenBallWrapper}>
                <GoldenBallIcon size={BALL_SIZE} />
                <Sparkles size={16} color="#F59E0B" style={styles.goldenBallSparkle} />
              </View>
            ) : (
              <SoccerBallIcon size={BALL_SIZE} />
            )}
          </View>
        )}

        {/* --------------------------------------------------------- */}
        {/* LOWER COURT: USER PADDLE */}
        {/* --------------------------------------------------------- */}
        <Animated.View
          style={[
            styles.userPaddle,
            {
              left: paddleX,
              top: screenHeight - 120,
              transform: [{ scaleY: paddleBounce }],
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.paddleGripLeft} />
          <View style={styles.paddleCenterBeam}>
            <Text style={styles.paddleBeamText}>SWIPE PADDLE</Text>
          </View>
          <View style={styles.paddleGripRight} />
        </Animated.View>

        {/* --------------------------------------------------------- */}
        {/* FLOATING TOASTS */}
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
                  <Text style={styles.gameNoBadgeText}>제2탄 미니게임</Text>
                </View>
                <View style={styles.categoryBadge}>
                  <SoccerBallIcon size={14} />
                  <Text style={styles.categoryBadgeText}>놀아주기</Text>
                </View>
              </View>

              <Text style={styles.readyTitle}>핑퐁 리프팅 랠리</Text>
              <Text style={styles.readySubtitle}>
                공이 바닥에 떨어지지 않도록 손가락으로 패들을 밀어 반려몽과 환상의 랠리를 이어가세요!
              </Text>

              {/* Character Preview */}
              <View style={styles.readyPreviewBox}>
                <View style={styles.readyPreviewPet}>
                  {character?.image_url ? (
                    <ExpoImage
                      source={{ uri: transparentUrl || character.image_url }}
                      style={{ width: 68, height: 68 }}
                      contentFit="contain"
                    />
                  ) : (
                    <Text style={{ fontSize: 44 }}>{character?.emoji || '🐶'}</Text>
                  )}
                  <Text style={styles.readyPreviewPetLabel}>반려몽 헤딩</Text>
                </View>

                <View style={styles.readyVsIcon}>
                  <Activity size={24} color="#0284C7" />
                  <Text style={styles.readyVsText}>랠리 콤보</Text>
                </View>

                <View style={styles.readyPreviewPaddle}>
                  <View style={styles.readyPaddleBar} />
                  <Text style={styles.readyPreviewPetLabel}>손가락 패들</Text>
                </View>
              </View>

              {/* Instructions List */}
              <View style={styles.instructionsList}>
                <View style={styles.instructionItem}>
                  <Hand size={18} color="#0284C7" style={{ marginRight: 8 }} />
                  <Text style={styles.instructionText}>
                    화면 하단을 손가락으로 좌우 드래그하여 패들을 조작합니다.
                  </Text>
                </View>
                <View style={styles.instructionItem}>
                  <Heart size={18} color="#FF4D6D" fill="#FF4D6D" style={{ marginRight: 8 }} />
                  <Text style={styles.instructionText}>
                    하트 3개 모두 소진 전까지 최고 랠리 기록을 세워보세요!
                  </Text>
                </View>
                <View style={styles.instructionItem}>
                  <Gift size={18} color="#F59E0B" style={{ marginRight: 8 }} />
                  <Text style={styles.instructionText}>
                    클리어 시 행복도 100% 완충 + 대량 EXP & 가족 포인트 보상!
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
                <Text style={styles.startButtonText}>게임 시작하기 (START)</Text>
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
                {character?.name || '반려몽'}이와 함께 땀 흘리며 신나게 놀았어요!
              </Text>

              {/* Stats Grid */}
              <View style={styles.resultStatsRow}>
                <View style={styles.resultStatBox}>
                  <Text style={styles.resultStatLabel}>최종 점수</Text>
                  <Text style={styles.resultStatValue}>{score}점</Text>
                </View>
                <View style={styles.resultStatBox}>
                  <Text style={styles.resultStatLabel}>최대 랠리</Text>
                  <Text style={styles.resultStatValue}>{maxRally}회</Text>
                </View>
              </View>

              {/* Rewards Box */}
              <View style={styles.rewardBox}>
                <Text style={styles.rewardBoxTitle}>놀아주기 완료 보상</Text>
                <View style={styles.rewardRow}>
                  <View style={styles.rewardPill}>
                    <Heart size={14} color="#FF4D6D" fill="#FF4D6D" style={{ marginRight: 4 }} />
                    <Text style={styles.rewardPillText}>행복도 100%</Text>
                  </View>
                  <View style={styles.rewardPill}>
                    <Sparkles size={14} color="#52C41A" style={{ marginRight: 4 }} />
                    <Text style={styles.rewardPillText}>
                      +{Math.max(12, Math.min(35, Math.round(score / 25) + maxRally))} EXP
                    </Text>
                  </View>
                  <View style={styles.rewardPill}>
                    <Trophy size={14} color="#D48806" style={{ marginRight: 4 }} />
                    <Text style={styles.rewardPillText}>
                      +{Math.max(4, Math.min(15, Math.round(score / 50)))} P
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
    backgroundColor: '#2E7D32', // Lush soccer field green
    overflow: 'hidden',
  },
  pitchLines: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pitchCenterLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  pitchCenterCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  pitchGoalTop: {
    position: 'absolute',
    top: 50,
    width: 180,
    height: 70,
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 8,
  },
  pitchGoalBottom: {
    position: 'absolute',
    bottom: 40,
    width: 200,
    height: 80,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 8,
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
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  hudPillGolden: {
    backgroundColor: '#F59E0B',
  },
  hudPillScore: {
    backgroundColor: '#FFFBE6',
    borderWidth: 1,
    borderColor: '#FFE58F',
  },
  livesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rallyText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF6B00',
    marginLeft: 4,
  },
  scoreText: {
    fontSize: 14,
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
  petSpriteContainer: {
    position: 'absolute',
    width: PET_SIZE,
    height: PET_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  petPartnerBadge: {
    position: 'absolute',
    top: -18,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  petPartnerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  petSpriteImage: {
    width: PET_SIZE,
    height: PET_SIZE,
  },
  petSpriteEmoji: {
    fontSize: 48,
  },
  ballContainer: {
    position: 'absolute',
    width: BALL_SIZE,
    height: BALL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 25,
  },
  ballEmoji: {
    fontSize: 32,
  },
  goldenBallWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldenBallSparkle: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  userPaddle: {
    position: 'absolute',
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    backgroundColor: '#0284C7',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 30,
  },
  paddleGripLeft: {
    width: 6,
    height: 10,
    backgroundColor: '#BAE6FD',
    borderRadius: 3,
  },
  paddleGripRight: {
    width: 6,
    height: 10,
    backgroundColor: '#BAE6FD',
    borderRadius: 3,
  },
  paddleCenterBeam: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  paddleBeamText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#F0F9FF',
    letterSpacing: 1.2,
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
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gameNoBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  categoryBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
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
    marginBottom: 18,
  },
  readyPreviewBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  readyPreviewPet: {
    alignItems: 'center',
  },
  readyPreviewPetLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginTop: 4,
  },
  readyVsIcon: {
    alignItems: 'center',
  },
  readyVsText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F97316',
    marginTop: 2,
  },
  readyPreviewPaddle: {
    alignItems: 'center',
  },
  readyPaddleBar: {
    width: 65,
    height: 14,
    backgroundColor: '#0284C7',
    borderRadius: 7,
    marginTop: 24,
    marginBottom: 8,
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
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#16A34A',
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
    gap: 12,
    marginBottom: 16,
  },
  resultStatBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resultStatLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  resultStatValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  rewardBox: {
    width: '100%',
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 20,
  },
  rewardBoxTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
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
    color: '#78350F',
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
    backgroundColor: '#16A34A',
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
