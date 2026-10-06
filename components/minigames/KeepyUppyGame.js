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
  PanResponder,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import {
  Trophy,
  Heart,
  X,
  Flame,
  RotateCcw,
  Check,
  Star,
  Play,
  Gamepad2,
  Zap,
} from 'lucide-react-native';

const { width: INITIAL_WIDTH, height: INITIAL_HEIGHT } = Dimensions.get('window');

// -----------------------------------------------------------------
// 1. Vector Ball Graphics
// -----------------------------------------------------------------
function SoccerBallGraphic({ size = 40 }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Circle cx="20" cy="20" r="18.5" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2.5" />
        <Path d="M20 12 L 26 16 L 24 23 L 16 23 L 14 16 Z" fill="#0F172A" />
        <Path d="M20 12 L 20 2" stroke="#0F172A" strokeWidth="2" />
        <Path d="M26 16 L 36 12" stroke="#0F172A" strokeWidth="2" />
        <Path d="M24 23 L 32 32" stroke="#0F172A" strokeWidth="2" />
        <Path d="M16 23 L 8 32" stroke="#0F172A" strokeWidth="2" />
        <Path d="M14 16 L 4 12" stroke="#0F172A" strokeWidth="2" />
      </Svg>
    </View>
  );
}

function GoldenBallGraphic({ size = 40 }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Circle cx="20" cy="20" r="18.5" fill="#F59E0B" stroke="#B45309" strokeWidth="2.5" />
        <Circle cx="20" cy="20" r="15" fill="#FBBF24" />
      </Svg>
      <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
        <Star size={size * 0.52} color="#FFFFFF" fill="#FFFFFF" />
      </View>
    </View>
  );
}

function NeonBallGraphic({ size = 40 }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Circle cx="20" cy="20" r="18.5" fill="#EC4899" stroke="#9D174D" strokeWidth="2.5" />
        <Circle cx="20" cy="20" r="15" fill="#F472B6" />
      </Svg>
      <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
        <Zap size={size * 0.54} color="#FFFFFF" fill="#FFFFFF" />
      </View>
    </View>
  );
}

function BallRenderer({ type, size = 40 }) {
  if (type === 'golden') return <GoldenBallGraphic size={size} />;
  if (type === 'neon') return <NeonBallGraphic size={size} />;
  return <SoccerBallGraphic size={size} />;
}

// -----------------------------------------------------------------
// 2. Constants & Settings
// -----------------------------------------------------------------
const BALL_SIZE = 40;
const PET_SIZE = 76;
const PADDLE_HEIGHT = 20;

const GAME_CONFIG = {
  paddleWidth: 105,
  baseSpeed: 6.8,
  maxSpeed: 13.5,
  lives: 3,
  secondBallRally: 8,
  thirdBallRally: 18,
};

// -----------------------------------------------------------------
// 3. Main Re-engineered KeepyUppyGame Component
// -----------------------------------------------------------------
export default function KeepyUppyGame({
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

  const [gameState, setGameState] = useState('ready'); // 'ready' | 'playing' | 'gameover'
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [rallyCount, setRallyCount] = useState(0);
  const [maxRally, setMaxRally] = useState(0);
  const [activeBallCount, setActiveBallCount] = useState(1);
  const [toasts, setToasts] = useState([]);

  const paddleWidth = GAME_CONFIG.paddleWidth;
  const [paddleX, setPaddleX] = useState((INITIAL_WIDTH - paddleWidth) / 2);
  const [petX, setPetX] = useState((INITIAL_WIDTH - PET_SIZE) / 2);
  const [balls, setBalls] = useState([]);

  // Animation values
  const paddleBounce = useRef(new Animated.Value(1)).current;
  const petBounce = useRef(new Animated.Value(1)).current;

  // Synchronization refs for 60fps game loop
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const screenWidthRef = useRef(screenWidth);
  screenWidthRef.current = screenWidth;

  const screenHeightRef = useRef(screenHeight);
  screenHeightRef.current = screenHeight;

  const paddleXRef = useRef((INITIAL_WIDTH - paddleWidth) / 2);
  const petXRef = useRef((INITIAL_WIDTH - PET_SIZE) / 2);
  const ballsRef = useRef([]);
  const rallyCountRef = useRef(0);
  const livesRef = useRef(3);
  const animFrameRef = useRef(null);

  // Floating Toast Notification
  const triggerToast = useCallback((text, color = '#10B981', yPos = null) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    const x = Math.max(30, Math.min(screenWidthRef.current - 140, screenWidthRef.current / 2 - 50));
    const y = yPos !== null ? yPos : screenHeightRef.current / 2;
    setToasts((prev) => [...prev.slice(-3), { id, text, color, x, y }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 850);
  }, []);

  // Smooth Paddle Positioning with Precise Touch Normalization
  const movePaddle = useCallback((eOrX) => {
    let clientX = null;
    if (typeof eOrX === 'number') {
      clientX = eOrX;
    } else if (eOrX && eOrX.nativeEvent) {
      const ne = eOrX.nativeEvent;
      const touches = ne.touches || eOrX.touches;
      if (touches && touches.length > 0) {
        clientX = typeof touches[0].pageX === 'number' ? touches[0].pageX : touches[0].clientX;
      } else if (typeof ne.pageX === 'number') {
        clientX = ne.pageX;
      } else if (typeof ne.locationX === 'number') {
        clientX = ne.locationX;
      } else if (typeof ne.clientX === 'number') {
        clientX = ne.clientX;
      }
    } else if (eOrX && typeof eOrX.clientX === 'number') {
      clientX = eOrX.clientX;
    }

    if (typeof clientX !== 'number' || isNaN(clientX)) return;

    const stageWidth = screenWidthRef.current;
    const pWidth = GAME_CONFIG.paddleWidth;
    const clampedX = Math.max(10, Math.min(stageWidth - pWidth - 10, clientX - pWidth / 2));
    paddleXRef.current = clampedX;
    setPaddleX(clampedX);
  }, []);

  // Gesture Responder for Touch/Mouse Dragging
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => movePaddle(evt),
        onPanResponderMove: (evt) => movePaddle(evt),
      }),
    [movePaddle]
  );

  // Spawn New Ball into Court
  const spawnBall = useCallback((type = 'normal', fromPaddle = false) => {
    const stageWidth = screenWidthRef.current;
    const stageHeight = screenHeightRef.current;

    const startX = Math.max(20, Math.min(stageWidth - BALL_SIZE - 20, stageWidth / 2 + (Math.random() - 0.5) * 80));
    const startY = fromPaddle ? stageHeight - 160 : 170;
    const vy = fromPaddle ? -GAME_CONFIG.baseSpeed : GAME_CONFIG.baseSpeed;
    const vx = (Math.random() > 0.5 ? 1 : -1) * (2.4 + Math.random() * 2.0);

    const newBall = {
      id: `ball_${Date.now()}_${Math.random()}`,
      type,
      x: startX,
      y: startY,
      vx,
      vy,
      multiplier: type === 'golden' ? 2 : (type === 'neon' ? 3 : 1),
    };

    ballsRef.current.push(newBall);
    setBalls([...ballsRef.current]);
    setActiveBallCount(ballsRef.current.length);
  }, []);

  // Clean Reset
  const resetToReady = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    ballsRef.current = [];
    setBalls([]);
    setToasts([]);
    rallyCountRef.current = 0;
    setRallyCount(0);
    setMaxRally(0);
    setGameState('ready');
  }, []);

  const handleExitPress = useCallback(() => {
    if (gameStateRef.current === 'playing') {
      Alert.alert(
        '게임 중단 ⚽',
        '핑퐁 리프팅을 그만두시겠습니까?\n지금 나가면 보상이 저장되지 않습니다.',
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

  const finishGame = useCallback(() => {
    setGameState('gameover');
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }, []);

  // Start Game
  const startGame = useCallback(() => {
    const stageWidth = screenWidthRef.current;
    const pWidth = GAME_CONFIG.paddleWidth;

    const initPaddle = (stageWidth - pWidth) / 2;
    const initPet = (stageWidth - PET_SIZE) / 2;

    paddleXRef.current = initPaddle;
    petXRef.current = initPet;
    setPaddleX(initPaddle);
    setPetX(initPet);

    setScore(0);
    setRallyCount(0);
    setMaxRally(0);
    rallyCountRef.current = 0;
    livesRef.current = GAME_CONFIG.lives;
    setLives(GAME_CONFIG.lives);
    setToasts([]);

    ballsRef.current = [];
    spawnBall('normal', false);

    setGameState('playing');
  }, [spawnBall]);

  // -----------------------------------------------------------------
  // 4. Deterministic 60FPS Continuous Collision Game Loop
  // -----------------------------------------------------------------
  useEffect(() => {
    if (gameState !== 'playing') return;

    let isRunning = true;

    const updatePhysics = () => {
      if (!isRunning || gameStateRef.current !== 'playing') return;

      const stageWidth = screenWidthRef.current;
      const stageHeight = screenHeightRef.current;
      const pWidth = GAME_CONFIG.paddleWidth;
      const paddleY = stageHeight - (Platform.OS === 'ios' ? 140 : 120);
      const petY = 110;

      const currentBalls = ballsRef.current;
      const activeBalls = [];
      let missedCount = 0;

      for (let i = 0; i < currentBalls.length; i++) {
        const ball = currentBalls[i];

        const prevX = ball.x;
        const prevY = ball.y;

        ball.x += ball.vx;
        ball.y += ball.vy;

        // 1) Left & Right Wall Bounce
        if (ball.x <= 10) {
          ball.x = 10;
          ball.vx = Math.abs(ball.vx);
        } else if (ball.x >= stageWidth - BALL_SIZE - 10) {
          ball.x = stageWidth - BALL_SIZE - 10;
          ball.vx = -Math.abs(ball.vx);
        }

        // 2) Petmong Header AI Bounce (Upper Court)
        if (ball.vy < 0 && ball.y <= petY + PET_SIZE - 10 && prevY >= petY) {
          const petLeft = petXRef.current - 14;
          const petRight = petXRef.current + PET_SIZE + 14;
          const ballCenter = ball.x + BALL_SIZE / 2;

          if (ballCenter >= petLeft && ballCenter <= petRight) {
            ball.vy = Math.abs(ball.vy);
            ball.y = petY + PET_SIZE - 6;

            const hitOffset = (ballCenter - (petXRef.current + PET_SIZE / 2)) / (PET_SIZE / 2);
            ball.vx = hitOffset * 4.4 + (Math.random() - 0.5) * 1.2;

            Animated.sequence([
              Animated.timing(petBounce, { toValue: 1.25, duration: 60, useNativeDriver: false }),
              Animated.timing(petBounce, { toValue: 1.0, duration: 60, useNativeDriver: false }),
            ]).start();

            rallyCountRef.current += 1;
            const curRally = rallyCountRef.current;
            setRallyCount(curRally);
            setMaxRally((m) => Math.max(m, curRally));

            const addedScore = (15 + Math.min(curRally * 2, 35)) * ball.multiplier;
            setScore((s) => s + addedScore);
            triggerToast(curRally % 5 === 0 ? `🔥 콤보 ${curRally}회!` : '반려몽 헤딩! 🐶', '#3B82F6', 150);

            // Multi-ball thresholds
            if (curRally === GAME_CONFIG.secondBallRally && ballsRef.current.length === 1) {
              triggerToast('⚡ 멀티 볼 투입! 공 2개!', '#F59E0B', 210);
              setTimeout(() => spawnBall('golden', false), 300);
            } else if (curRally === GAME_CONFIG.thirdBallRally && ballsRef.current.length === 2) {
              triggerToast('💥 익스트림 멀티볼! 공 3개!', '#EC4899', 210);
              setTimeout(() => spawnBall('neon', false), 300);
            }
          }
        } else if (ball.y <= 40 && ball.vy < 0) {
          // Top ceiling fallback bounce
          ball.vy = Math.abs(ball.vy);
          ball.y = 40;
        }

        // 3) True Bottom Paddle Bounce (Only on Paddle Top Surface Impact)
        const isDescending = ball.vy > 0;
        const prevBallBottom = prevY + BALL_SIZE;
        const curBallBottom = ball.y + BALL_SIZE;
        const paddleTop = paddleY;

        // Continuous interval intersection: The ball's bottom must cross or meet the paddle top line during this frame
        const crossedTopSurface = prevBallBottom <= paddleTop + 6 && curBallBottom >= paddleTop;
        const shallowContact = curBallBottom >= paddleTop && ball.y <= paddleTop + 8;

        if (isDescending && (crossedTopSurface || shallowContact)) {
          const pLeft = paddleXRef.current - 12;
          const pRight = paddleXRef.current + pWidth + 12;
          const ballCenter = ball.x + BALL_SIZE / 2;

          if (ballCenter >= pLeft && ballCenter <= pRight) {
            // Rebound ball upwards
            const currentSpeed = Math.max(Math.abs(ball.vy), GAME_CONFIG.baseSpeed);
            ball.vy = -currentSpeed;
            ball.y = paddleTop - BALL_SIZE;

            const paddleCenter = paddleXRef.current + pWidth / 2;
            const hitFactor = Math.max(-1, Math.min(1, (ballCenter - paddleCenter) / (pWidth / 2)));
            ball.vx = hitFactor * 5.8 + (Math.random() - 0.5) * 0.8;

            Animated.sequence([
              Animated.timing(paddleBounce, { toValue: 0.82, duration: 40, useNativeDriver: false }),
              Animated.timing(paddleBounce, { toValue: 1.15, duration: 50, useNativeDriver: false }),
              Animated.timing(paddleBounce, { toValue: 1.0, duration: 40, useNativeDriver: false }),
            ]).start();

            rallyCountRef.current += 1;
            const curRally = rallyCountRef.current;
            setRallyCount(curRally);
            setMaxRally((m) => Math.max(m, curRally));

            const addedScore = (20 + Math.min(curRally * 2, 45)) * ball.multiplier;
            setScore((s) => s + addedScore);

            triggerToast(
              Math.abs(hitFactor) < 0.28 ? 'PERFECT 리프팅! ⚽' : '나이스 킥! 👟',
              '#10B981',
              paddleY - 50
            );
          }
        }

        // 4) Check if ball fell completely past the bottom floor
        if (ball.y > stageHeight - 30) {
          missedCount += 1;
        } else {
          activeBalls.push(ball);
        }
      }

      // 5) Upper Pet AI: Track lowest descending ball
      if (activeBalls.length > 0) {
        const targetBall = activeBalls.filter((b) => b.vy < 0).sort((a, b) => a.y - b.y)[0] || activeBalls[0];
        const targetPetX = Math.max(10, Math.min(stageWidth - PET_SIZE - 10, targetBall.x - (PET_SIZE - BALL_SIZE) / 2));
        petXRef.current += (targetPetX - petXRef.current) * 0.26;
        petXRef.current = Math.max(10, Math.min(stageWidth - PET_SIZE - 10, petXRef.current));
        setPetX(petXRef.current);
      }

      // 6) Missed Ball Penalty Handling
      if (missedCount > 0) {
        if (activeBalls.length === 0) {
          livesRef.current -= 1;
          setLives(livesRef.current);
          triggerToast('공을 놓쳤어요! 💔', '#EF4444', stageHeight - 160);

          if (livesRef.current <= 0) {
            finishGame();
            return;
          } else {
            ballsRef.current = [];
            spawnBall('normal', true);
            setActiveBallCount(1);
          }
        } else {
          ballsRef.current = activeBalls;
          setBalls([...activeBalls]);
          setActiveBallCount(activeBalls.length);
          triggerToast('공 1개 실점! 남은 공 집중! ⚡', '#F59E0B', stageHeight - 160);
        }
      } else {
        ballsRef.current = activeBalls;
        setBalls([...activeBalls]);
      }

      animFrameRef.current = requestAnimationFrame(updatePhysics);
    };

    animFrameRef.current = requestAnimationFrame(updatePhysics);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, finishGame, paddleBounce, petBounce, spawnBall, triggerToast]);

  // Evaluation Grade
  const getGameGrade = (finalScore, finalRally) => {
    if (finalRally >= 25 || finalScore >= 600) {
      return { grade: 'S', color: '#FAAD14', title: '환상의 리프팅 마스터! 👑' };
    }
    if (finalRally >= 18 || finalScore >= 400) {
      return { grade: 'A', color: '#10B981', title: '찰떡궁합 핑퐁 듀오 ✨' };
    }
    if (finalRally >= 10 || finalScore >= 220) {
      return { grade: 'B', color: '#0284C7', title: '신나는 랠리 타임 ⚽' };
    }
    return { grade: 'C', color: '#94A3B8', title: '리프팅 입문자 🌱' };
  };

  const handleClaimAndClose = () => {
    const baseExp = Math.round(score / 14) + Math.round(maxRally * 1.5);
    const finalExp = canEarnReward ? Math.max(15, Math.min(50, Math.round(baseExp * 1.3))) : 0;

    if (onGameComplete) {
      onGameComplete({
        score,
        rallyCount: maxRally,
        exp: finalExp,
        isPractice: !canEarnReward,
        difficulty: 'normal',
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
        {...(gameState === 'playing' ? panResponder.panHandlers : {})}
        onTouchStart={gameState === 'playing' ? (e) => movePaddle(e) : undefined}
        onTouchMove={gameState === 'playing' ? (e) => movePaddle(e) : undefined}
        onMouseDown={gameState === 'playing' ? (e) => movePaddle(e) : undefined}
        onMouseMove={gameState === 'playing' ? (e) => movePaddle(e) : undefined}
      >
        {/* Grass Court Stadium Atmosphere */}
        <View style={styles.grassCourtLayer} pointerEvents="none">
          <View style={styles.courtCenterCircle} />
          <View style={styles.courtCenterLine} />
        </View>

        {/* --------------------------------------------------------- */}
        {/* TOP STATUS HUD BAR */}
        {/* --------------------------------------------------------- */}
        <View style={styles.topHudBar} pointerEvents="box-none">
          {/* Hearts / Lives */}
          <View style={styles.hudPill}>
            <View style={styles.heartRow}>
              {Array.from({ length: GAME_CONFIG.lives }).map((_, idx) => (
                <Heart
                  key={idx}
                  size={16}
                  color={idx < lives ? '#EF4444' : '#CBD5E1'}
                  fill={idx < lives ? '#EF4444' : 'transparent'}
                />
              ))}
            </View>
          </View>

          {/* Multi-Ball Indicator */}
          <View style={[styles.hudPill, activeBallCount >= 2 && styles.multiBallPill]}>
            <Text style={styles.multiBallText}>
              {activeBallCount >= 2 ? `🔥 멀티볼 x${activeBallCount}` : '⚽ 단일 공'}
            </Text>
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

        {/* Rally Combo Counter Badge */}
        <View style={styles.rallyBadgeRow} pointerEvents="none">
          {rallyCount >= 2 && (
            <View style={styles.rallyBadge}>
              <Flame size={15} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.rallyBadgeText}>랠리 {rallyCount}회</Text>
            </View>
          )}
        </View>

        {/* --------------------------------------------------------- */}
        {/* UPPER COURT: PETMONG HEADER AI */}
        {/* --------------------------------------------------------- */}
        <View
          style={[
            styles.petmongWrapper,
            { left: petX, top: 100 },
          ]}
          pointerEvents="none"
        >
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
            <View style={styles.petHeadband}>
              <Text style={styles.petHeadbandText}>⚽ 리프팅 몽이</Text>
            </View>
          </Animated.View>
        </View>

        {/* --------------------------------------------------------- */}
        {/* ACTIVE MULTIPLE BALLS IN FLIGHT */}
        {/* --------------------------------------------------------- */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {balls.map((b) => (
            <View
              key={b.id}
              style={[
                styles.ballWrapper,
                { left: b.x, top: b.y },
              ]}
            >
              <BallRenderer type={b.type} size={BALL_SIZE} />
            </View>
          ))}
        </View>

        {/* --------------------------------------------------------- */}
        {/* BOTTOM USER PADDLE */}
        {/* --------------------------------------------------------- */}
        <View
          style={[
            styles.paddleWrapper,
            {
              left: paddleX,
              top: screenHeight - (Platform.OS === 'ios' ? 140 : 120),
              width: paddleWidth,
            },
          ]}
          pointerEvents="none"
        >
          <Animated.View
            style={[
              styles.paddleBody,
              { transform: [{ scaleY: paddleBounce }] },
            ]}
          >
            <View style={styles.paddleGripLine} />
            <Text style={styles.paddleText}>리프팅 패들</Text>
            <View style={styles.paddleGripLine} />
          </Animated.View>
        </View>

        {/* Floating Score Toasts */}
        {toasts.map((toast) => (
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
                  <Text style={styles.gameNoBadgeText}>제2탄 미니게임</Text>
                </View>
                <View style={styles.categoryBadge}>
                  <Zap size={14} color="#0369A1" style={{ marginRight: 3 }} />
                  <Text style={styles.categoryBadgeText}>놀아주기</Text>
                </View>
              </View>

              <Text style={styles.readyTitle}>⚽ 핑퐁 리프팅 랠리</Text>
              <Text style={styles.readySubtitle}>
                손가락 패들로 공을 튕겨 올려 반려몽과 랠리를 주고받으세요! 랠리가 쌓이면 공이 2개, 3개로 증가해요!
              </Text>

              {/* Multi-Ball Guide Preview */}
              <View style={styles.previewBox}>
                <View style={styles.previewItem}>
                  <SoccerBallGraphic size={32} />
                  <Text style={styles.previewLabel}>기본 축구공</Text>
                  <Text style={styles.previewSub}>표준 점수</Text>
                </View>
                <View style={styles.previewItem}>
                  <GoldenBallGraphic size={32} />
                  <Text style={styles.previewLabel}>황금 별빛 볼</Text>
                  <Text style={[styles.previewSub, { color: '#D97706' }]}>랠리 8회 (2배)</Text>
                </View>
                <View style={styles.previewItem}>
                  <NeonBallGraphic size={32} />
                  <Text style={styles.previewLabel}>네온 핑크 볼</Text>
                  <Text style={[styles.previewSub, { color: '#EC4899' }]}>랠리 18회 (3배)</Text>
                </View>
              </View>

              {/* Instructions */}
              <View style={styles.instructionsList}>
                <View style={styles.instructionItem}>
                  <Gamepad2 size={16} color="#0369A1" style={{ marginRight: 8 }} />
                  <Text style={styles.instructionText}>
                    손가락으로 하단 패들을 좌우로 움직여 공이 바닥에 떨어지지 않게 튕겨 올리세요.
                  </Text>
                </View>
                <View style={styles.instructionItem}>
                  <Flame size={16} color="#F59E0B" style={{ marginRight: 8 }} />
                  <Text style={styles.instructionText}>
                    멀티 볼 진행 중에는 공 1개를 놓쳐도 나머지 공으로 계속 랠리를 유지할 수 있어요!
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
                <Text style={styles.startButtonText}>랠리 시작 (START)</Text>
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
                {character?.name || '반려몽'}과 땀 흘리며 최고의 핑퐁 랠리를 마쳤어요!
              </Text>

              {/* Stats */}
              <View style={styles.resultStatsRow}>
                <View style={styles.resultStatBox}>
                  <Text style={styles.resultStatLabel}>최종 점수</Text>
                  <Text style={styles.resultStatValue}>{score}점</Text>
                </View>
                <View style={styles.resultStatBox}>
                  <Text style={styles.resultStatLabel}>최대 랠리</Text>
                  <Text style={[styles.resultStatValue, { color: '#0284C7' }]}>{maxRally}회</Text>
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
                          성장 경험치 +{Math.max(15, Math.min(50, Math.round((Math.round(score / 14) + Math.round(maxRally * 1.5)) * 1.3)))} EXP 획득! 🌱
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
// 5. Styles
// -----------------------------------------------------------------
const styles = StyleSheet.create({
  gameContainer: {
    flex: 1,
    backgroundColor: '#064E3B',
    overflow: 'hidden',
  },
  grassCourtLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
  },
  courtCenterLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  courtCenterCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.25)',
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
  heartRow: {
    flexDirection: 'row',
    gap: 4,
  },
  multiBallPill: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  multiBallText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
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
  rallyBadgeRow: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 106 : 90,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 25,
  },
  rallyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EA580C',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  rallyBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFF',
  },
  petmongWrapper: {
    position: 'absolute',
    alignItems: 'center',
    width: PET_SIZE,
    zIndex: 10,
  },
  petBox: {
    alignItems: 'center',
  },
  petImageSprite: {
    width: 72,
    height: 72,
  },
  petEmojiSprite: {
    fontSize: 55,
  },
  petHeadband: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 2,
  },
  petHeadbandText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
  },
  ballWrapper: {
    position: 'absolute',
    zIndex: 15,
  },
  paddleWrapper: {
    position: 'absolute',
    height: PADDLE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  paddleBody: {
    width: '100%',
    height: PADDLE_HEIGHT,
    backgroundColor: '#0284C7',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#38BDF8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  paddleGripLine: {
    width: 4,
    height: 10,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  paddleText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  floatingToast: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    zIndex: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  floatingToastText: {
    fontSize: 13,
    fontWeight: '900',
  },
  overlayCenter: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 60,
    padding: 20,
  },
  readyCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  readyBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  gameNoBadge: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  gameNoBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369A1',
  },
  readyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  readySubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  previewBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewItem: {
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
    marginTop: 4,
  },
  previewSub: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 1,
  },
  instructionsList: {
    width: '100%',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  instructionText: {
    flex: 1,
    fontSize: 11,
    color: '#0369A1',
    fontWeight: '600',
    lineHeight: 16,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
  },
  resultCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  gradeCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  gradeText: {
    fontSize: 32,
    fontWeight: '900',
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  resultSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  resultStatsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  resultStatBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resultStatLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  resultStatValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  rewardBox: {
    width: '100%',
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  rewardBoxTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#B45309',
    marginBottom: 6,
  },
  rewardRow: {
    alignItems: 'flex-start',
  },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardPillText: {
    fontSize: 12,
  },
  resultBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  retryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    gap: 6,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  claimBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#0284C7',
    gap: 6,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  claimBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
  },
});
