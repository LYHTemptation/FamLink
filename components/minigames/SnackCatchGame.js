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
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import {
  Trophy,
  Sparkles,
  Heart,
  X,
  Flame,
  RotateCcw,
  Check,
  Clock,
  Apple,
  Beef,
  Cake,
  Star,
  Play,
  PartyPopper,
} from 'lucide-react-native';

const { width: INITIAL_WIDTH, height: INITIAL_HEIGHT } = Dimensions.get('window');

// Custom Vector Icons for items without standard library equivalents
function ChiliPepperIcon({ size = 26 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 4C16.5 4 15.5 5 15 6C13.5 4.5 11 4 9 5.5C6 7.5 5 12 6.5 16C7.5 18.5 9.5 20.5 12 21C13.5 21.3 15 20.8 16 19.5C18.5 16.5 19.5 11 18.5 7C19.5 6.5 20.5 5.5 20 4C19.5 3.5 18.5 3.5 18 4Z"
        fill="#DC2626"
        stroke="#991B1B"
        strokeWidth="1.5"
      />
      <Path
        d="M15 6C15.5 3.5 17 2 19 2"
        stroke="#16A34A"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function BombIcon({ size = 26 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="13" r="8" fill="#1E293B" stroke="#0F172A" strokeWidth="1.5" />
      <Path d="M11 9A4 4 0 0 1 15 13" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" />
      <Rect x="15" y="6" width="3" height="3" rx="0.5" fill="#475569" transform="rotate(25 15 6)" />
      <Path d="M17 7C18.5 5.5 19 4 21 4" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
      <Circle cx="21" cy="4" r="1.5" fill="#F59E0B" />
    </Svg>
  );
}

function SnackItemIcon({ type, size = 26 }) {
  switch (type) {
    case 'apple':
      return <Apple size={size} color="#EF4444" fill="#FCA5A5" />;
    case 'meat':
      return <Beef size={size} color="#B45309" fill="#FCD34D" />;
    case 'cake':
      return <Cake size={size} color="#EC4899" fill="#FBCFE8" />;
    case 'star':
      return <Star size={size} color="#F59E0B" fill="#FDE68A" />;
    case 'pepper':
      return <ChiliPepperIcon size={size} />;
    case 'bomb':
      return <BombIcon size={size} />;
    default:
      return <Star size={size} color="#F59E0B" fill="#FDE68A" />;
  }
}

// Game Configuration
const GAME_DURATION = 30; // 30 seconds
const PET_WIDTH = 84;
const PET_HEIGHT = 84;
const ITEM_SIZE = 44;
const FLOOR_HEIGHT = 110; // Bottom stage floor height
const SPAWN_INTERVAL = 550; // ms between items

// Falling Items Table with Vector Icons & Color Palettes
const ITEMS_TABLE = [
  { type: 'apple', name: '사과', score: 10, isHazard: false, color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)' },
  { type: 'meat', name: '고기', score: 20, isHazard: false, color: '#B45309', bgColor: 'rgba(180, 83, 9, 0.15)' },
  { type: 'cake', name: '케이크', score: 30, isHazard: false, color: '#EC4899', bgColor: 'rgba(236, 72, 153, 0.15)' },
  { type: 'star', name: '별사탕', score: 50, isHazard: false, color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)' },
  { type: 'pepper', name: '매운고추', score: -15, isHazard: true, color: '#DC2626', bgColor: 'rgba(220, 38, 38, 0.15)' },
  { type: 'bomb', name: '폭탄', score: -25, isHazard: true, color: '#334155', bgColor: 'rgba(51, 65, 85, 0.2)' },
];

export default function SnackCatchGame({
  visible,
  character,
  transparentUrl,
  onClose,
  onGameComplete,
}) {
  // Screen Dimensions with live listener
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const screenWidth = dimensions.width;
  const screenHeight = dimensions.height;

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => sub?.remove?.();
  }, []);

  // Game Lifecycle States
  const [gameState, setGameState] = useState('ready'); // 'ready' | 'playing' | 'gameover'
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [isFever, setIsFever] = useState(false);
  const [items, setItems] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [isStunned, setIsStunned] = useState(false);

  // Bulletproof Character Position via React State (100% reliable on iOS/Android/Web)
  const [petX, setPetX] = useState((INITIAL_WIDTH - PET_WIDTH) / 2);
  const [petDirection, setPetDirection] = useState(1); // 1 = right, -1 = left
  const currentPetX = useRef((INITIAL_WIDTH - PET_WIDTH) / 2);

  // Animation values for squish bite and fever pulse
  const petBounce = useRef(new Animated.Value(1)).current;
  const feverPulse = useRef(new Animated.Value(1)).current;

  // State Refs for physics and callbacks
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const isStunnedRef = useRef(isStunned);
  isStunnedRef.current = isStunned;

  const isFeverRef = useRef(isFever);
  isFeverRef.current = isFever;

  const screenWidthRef = useRef(screenWidth);
  screenWidthRef.current = screenWidth;

  const screenHeightRef = useRef(screenHeight);
  screenHeightRef.current = screenHeight;

  const itemsRef = useRef([]);

  // Timers & Loop Refs
  const gameTimerRef = useRef(null);
  const spawnTimerRef = useRef(null);
  const animFrameRef = useRef(null);
  const feverTimerRef = useRef(null);
  const stunTimerRef = useRef(null);

  // -----------------------------------------------------------------
  // Move Pet to Target X (Direct Finger Tracking with 0ms Lag)
  // -----------------------------------------------------------------
  const movePetTo = useCallback((touchX) => {
    if (typeof touchX !== 'number' || isNaN(touchX)) return;
    const stageWidth = screenWidthRef.current;
    const targetX = Math.max(10, Math.min(stageWidth - PET_WIDTH - 10, touchX - PET_WIDTH / 2));

    if (targetX < currentPetX.current - 2) {
      setPetDirection(-1);
    } else if (targetX > currentPetX.current + 2) {
      setPetDirection(1);
    }

    currentPetX.current = targetX;
    setPetX(targetX);
  }, []);

  // -----------------------------------------------------------------
  // Start / Reset Game
  // -----------------------------------------------------------------
  const startGame = useCallback(() => {
    const stageWidth = screenWidthRef.current;
    const initialPetX = (stageWidth - PET_WIDTH) / 2;

    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setTimeLeft(GAME_DURATION);
    setIsFever(false);
    setIsStunned(false);
    setItems([]);
    setToasts([]);
    itemsRef.current = [];

    setPetX(initialPetX);
    currentPetX.current = initialPetX;
    setPetDirection(1);
    setGameState('playing');
  }, []);

  // -----------------------------------------------------------------
  // Fever Mode Controller
  // -----------------------------------------------------------------
  const activateFeverMode = useCallback(() => {
    setIsFever(true);
    triggerToast('FEVER TIME! 2배 점수!', '#FF6B00');

    Animated.loop(
      Animated.sequence([
        Animated.timing(feverPulse, { toValue: 1.08, duration: 250, useNativeDriver: false }),
        Animated.timing(feverPulse, { toValue: 1.0, duration: 250, useNativeDriver: false }),
      ])
    ).start();

    if (feverTimerRef.current) clearTimeout(feverTimerRef.current);
    feverTimerRef.current = setTimeout(() => {
      setIsFever(false);
      feverPulse.setValue(1);
    }, 6000);
  }, [feverPulse]);

  // Floating Toast Notification
  const triggerToast = (text, color = '#FF4D6D') => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    const x = Math.max(30, Math.min(screenWidthRef.current - 120, currentPetX.current + 8));
    const y = screenHeightRef.current - FLOOR_HEIGHT - 65;
    setToasts(prev => [...prev.slice(-4), { id, text, color, x, y }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 850);
  };

  // -----------------------------------------------------------------
  // Spawn Falling Item
  // -----------------------------------------------------------------
  const spawnItem = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;

    const stageWidth = screenWidthRef.current;
    let pool = ITEMS_TABLE;
    if (isFeverRef.current) {
      pool = ITEMS_TABLE.filter(i => !i.isHazard);
    }

    const template = pool[Math.floor(Math.random() * pool.length)];
    const startX = Math.max(20, Math.min(stageWidth - ITEM_SIZE - 20, Math.random() * (stageWidth - ITEM_SIZE)));
    const speed = isFeverRef.current ? 6.2 + Math.random() * 2.0 : 4.8 + Math.random() * 1.8;

    const newItem = {
      id: `item_${Date.now()}_${Math.random()}`,
      ...template,
      x: startX,
      y: 75,
      speed,
    };

    itemsRef.current.push(newItem);
    setItems([...itemsRef.current]);
  }, []);

  // -----------------------------------------------------------------
  // Item Collected Handler
  // -----------------------------------------------------------------
  const handleItemCollected = useCallback((item) => {
    // 1. Pet Squish Bounce
    Animated.sequence([
      Animated.timing(petBounce, { toValue: 0.78, duration: 70, useNativeDriver: false }),
      Animated.timing(petBounce, { toValue: 1.22, duration: 90, useNativeDriver: false }),
      Animated.timing(petBounce, { toValue: 1.0, duration: 80, useNativeDriver: false }),
    ]).start();

    if (item.isHazard) {
      // Penalty & Stun
      setCombo(0);
      setScore(s => Math.max(0, s + item.score));
      triggerToast(`${item.name}! ${item.score} (기절)`, '#DC2626');
      setIsStunned(true);

      if (stunTimerRef.current) clearTimeout(stunTimerRef.current);
      stunTimerRef.current = setTimeout(() => {
        setIsStunned(false);
      }, 700);
    } else {
      // Food Catch Success
      const multiplier = isFeverRef.current ? 2 : 1;
      const pointsGained = item.score * multiplier;
      setScore(s => s + pointsGained);

      setCombo(c => {
        const nextCombo = c + 1;
        setMaxCombo(m => Math.max(m, nextCombo));
        if (nextCombo === 8 && !isFeverRef.current) {
          activateFeverMode();
        }
        return nextCombo;
      });

      triggerToast(`+${pointsGained} 냠냠!`, '#10B981');
    }
  }, [activateFeverMode, petBounce]);

  // -----------------------------------------------------------------
  // Main Physics & Collision Detection Loop
  // -----------------------------------------------------------------
  useEffect(() => {
    if (gameState !== 'playing') return;

    let isRunning = true;

    const updatePhysics = () => {
      if (!isRunning || gameStateRef.current !== 'playing') return;

      const stageHeight = screenHeightRef.current;
      const petHitY = stageHeight - FLOOR_HEIGHT - PET_HEIGHT + 10;
      const nextActiveItems = [];

      for (let i = 0; i < itemsRef.current.length; i++) {
        const item = itemsRef.current[i];
        const nextY = item.y + item.speed;

        // Collision Check
        const isCollidingY = nextY + ITEM_SIZE >= petHitY && nextY <= petHitY + PET_HEIGHT * 0.75;
        const isCollidingX =
          item.x + ITEM_SIZE >= currentPetX.current - 14 &&
          item.x <= currentPetX.current + PET_WIDTH + 14;

        if (isCollidingY && isCollidingX) {
          handleItemCollected(item);
          continue; // Consumed
        }

        // Off-screen bottom
        if (nextY > stageHeight - FLOOR_HEIGHT + 20) {
          if (!item.isHazard) {
            setCombo(0);
          }
          continue;
        }

        nextActiveItems.push({ ...item, y: nextY });
      }

      itemsRef.current = nextActiveItems;
      setItems(nextActiveItems);

      animFrameRef.current = requestAnimationFrame(updatePhysics);
    };

    animFrameRef.current = requestAnimationFrame(updatePhysics);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, handleItemCollected]);

  // Finish Game
  const finishGame = useCallback(() => {
    setGameState('gameover');
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    if (feverTimerRef.current) clearTimeout(feverTimerRef.current);
    if (stunTimerRef.current) clearTimeout(stunTimerRef.current);
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
    if (stunTimerRef.current) {
      clearTimeout(stunTimerRef.current);
      stunTimerRef.current = null;
    }

    const stageWidth = screenWidthRef.current;
    const initialPetX = (stageWidth - PET_WIDTH) / 2;

    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setTimeLeft(GAME_DURATION);
    setIsFever(false);
    setIsStunned(false);
    setItems([]);
    setToasts([]);
    itemsRef.current = [];

    setPetX(initialPetX);
    currentPetX.current = initialPetX;
    setPetDirection(1);
    setGameState('ready');
  }, []);

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

  // Game Loop Timers
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
        spawnItem();
      }, isFever ? SPAWN_INTERVAL * 0.6 : SPAWN_INTERVAL);
    }

    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    };
  }, [gameState, isFever, spawnItem, finishGame]);

  // Compute Grade & Rewards
  const getGameGrade = (finalScore) => {
    if (finalScore >= 750) return { grade: 'S', color: '#FAAD14', title: '간식 마스터' };
    if (finalScore >= 500) return { grade: 'A', color: '#52C41A', title: '폭풍 먹방' };
    if (finalScore >= 300) return { grade: 'B', color: '#1890FF', title: '배부른 몽이' };
    return { grade: 'C', color: '#8C8C8C', title: '초보 미식가' };
  };

  const handleClaimAndClose = () => {
    const finalExp = Math.max(15, Math.min(50, Math.round(score / 15)));

    if (onGameComplete) {
      onGameComplete({
        score,
        maxCombo,
        exp: finalExp,
      });
    }
    if (onClose) onClose();
  };

  if (!visible) return null;

  const currentGrade = getGameGrade(score);

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
          gameState === 'playing' && !isStunned
            ? (e) => movePetTo(e.nativeEvent.pageX)
            : undefined
        }
        onTouchMove={
          gameState === 'playing' && !isStunned
            ? (e) => movePetTo(e.nativeEvent.pageX)
            : undefined
        }
      >
        {/* --------------------------------------------------------- */}
        {/* TOP STATUS HUD BAR */}
        {/* --------------------------------------------------------- */}
        <View style={styles.topHudBar} pointerEvents="box-none">
          {/* Time Counter */}
          <View style={[styles.hudPill, timeLeft <= 5 && styles.hudPillUrgent]}>
            <Clock size={16} color={timeLeft <= 5 ? '#FF4D4F' : '#FF7E82'} />
            <Text style={[styles.hudPillText, timeLeft <= 5 && { color: '#FF4D4F' }]}>
              {timeLeft}초
            </Text>
          </View>

          {/* Score Counter */}
          <View style={[styles.hudPill, styles.hudPillScore]}>
            <Trophy size={16} color="#D48806" />
            <Text style={styles.scoreText}>{score}점</Text>
          </View>

          {/* Close Game Button */}
          <TouchableOpacity onPress={handleExitPress} style={styles.closeBtn} activeOpacity={0.8}>
            <X size={18} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Combo & Fever Indicator */}
        <View style={styles.comboRow} pointerEvents="none">
          {combo >= 2 && (
            <View style={[styles.comboBadge, isFever && styles.feverBadge]}>
              {isFever && <Flame size={16} color="#FFF" style={{ marginRight: 4 }} />}
              <Text style={styles.comboText}>
                {isFever ? '🔥 FEVER TIME! 2X' : `COMBO x${combo}`}
              </Text>
            </View>
          )}
        </View>

        {/* --------------------------------------------------------- */}
        {/* PLAYING FIELD (Falling Items) */}
        {/* --------------------------------------------------------- */}
        <View style={styles.playField} pointerEvents="none">
          {items.map(item => (
            <View
              key={item.id}
              style={[
                styles.fallingItemBox,
                {
                  left: item.x,
                  top: item.y,
                  transform: [{ scale: isFever ? 1.15 : 1.0 }],
                },
              ]}
            >
              <View style={[styles.fallingItemBadge, { backgroundColor: item.bgColor, borderColor: item.color }]}>
                <SnackItemIcon type={item.type} size={24} />
              </View>
            </View>
          ))}
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
        {/* BOTTOM STAGE PLATFORM (Grounded Room Stage) */}
        {/* --------------------------------------------------------- */}
        <View style={styles.bottomStageArea} pointerEvents="none">
          <View style={styles.stageWoodFloor}>
            <View style={styles.stageWoodHighlight} />
            <Text style={styles.stageGuideText}>
              손가락으로 화면을 좌우로 쓱쓱 밀어 간식을 받아먹으세요!
            </Text>
          </View>
        </View>

        {/* --------------------------------------------------------- */}
        {/* PET ACTOR SPRITE (Controlled by User Swipe & Taps) */}
        {/* --------------------------------------------------------- */}
        <Animated.View
          style={[
            styles.petPlayerContainer,
            {
              left: petX,
              transform: [
                { scaleY: petBounce },
                { scaleX: petDirection },
                { scale: isFever ? feverPulse : 1.0 },
              ],
            },
            isStunned && styles.petStunned,
          ]}
          pointerEvents="none"
        >
          {character?.image_url ? (
            <ExpoImage
              source={{ uri: transparentUrl || character.image_url }}
              style={styles.petPlayerImage}
              contentFit="contain"
            />
          ) : (
            <Text style={styles.petPlayerEmoji}>{character?.emoji || '🐶'}</Text>
          )}

          {/* Stun Star Effect */}
          {isStunned && (
            <View style={styles.stunBadge}>
              <Flame size={12} color="#FFF" style={{ marginRight: 3 }} />
              <Text style={styles.stunBadgeText}>으악! 기절</Text>
            </View>
          )}

          {/* Ground Contact Shadow */}
          <View style={styles.playerShadow} />
        </Animated.View>

        {/* --------------------------------------------------------- */}
        {/* READY / START OVERLAY (Full-Screen Centered Modal) */}
        {/* --------------------------------------------------------- */}
        {gameState === 'ready' && (
          <View style={[styles.overlayCenter, { width: screenWidth, height: screenHeight }]}>
            <View style={styles.readyCard}>
              <View style={styles.readyHeaderIconRow}>
                <View style={[styles.readyMiniBadge, { backgroundColor: 'rgba(180, 83, 9, 0.15)' }]}>
                  <Beef size={24} color="#B45309" fill="#FCD34D" />
                </View>
                <View style={[styles.readyMiniBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Sparkles size={28} color="#F59E0B" fill="#FDE68A" />
                </View>
                <View style={[styles.readyMiniBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Apple size={24} color="#EF4444" fill="#FCA5A5" />
                </View>
              </View>

              <Text style={styles.readyTitle}>와구와구 간식 캐치!</Text>
              <Text style={styles.readyDesc}>
                하늘에서 떨어지는 맛있는 간식을{'\n'}
                반려몽을 좌우로 조작하여 마음껏 받아먹이세요!
              </Text>

              <View style={styles.rulePillBox}>
                <View style={styles.ruleRow}>
                  <View style={styles.ruleItemIcons}>
                    <Apple size={16} color="#EF4444" />
                    <Beef size={16} color="#B45309" />
                    <Cake size={16} color="#EC4899" />
                  </View>
                  <Text style={styles.rulePillText}>맛있는 간식 = +점수 & 콤보!</Text>
                </View>
                <View style={styles.ruleRow}>
                  <View style={styles.ruleItemIcons}>
                    <BombIcon size={16} />
                    <ChiliPepperIcon size={16} />
                  </View>
                  <Text style={styles.rulePillText}>폭탄 / 고추 = -점수 & 기절!</Text>
                </View>
                <View style={styles.ruleRow}>
                  <Flame size={16} color="#FF6B00" />
                  <Text style={[styles.rulePillText, { color: '#FF7E82', fontWeight: '800' }]}>
                    8콤보 달성 시 2배 FEVER TIME!
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.startBtn}
                onPress={startGame}
                activeOpacity={0.85}
              >
                <Play size={18} color="#FFF" fill="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.startBtnText}>게임 시작하기 (START)</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* --------------------------------------------------------- */}
        {/* GAME OVER RESULT OVERLAY (Full-Screen Centered Modal) */}
        {/* --------------------------------------------------------- */}
        {gameState === 'gameover' && (
          <View style={[styles.overlayCenter, { width: screenWidth, height: screenHeight }]}>
            <View style={styles.resultCard}>
              <View style={styles.resultHeaderIconBox}>
                <PartyPopper size={36} color="#F59E0B" />
              </View>
              <Text style={styles.resultTitle}>먹방 타임 종료!</Text>

              {/* Grade Badge */}
              <View style={[styles.gradePill, { backgroundColor: currentGrade.color }]}>
                <Text style={styles.gradePillText}>
                  Rank {currentGrade.grade} • {currentGrade.title}
                </Text>
              </View>

              {/* Score Display */}
              <View style={styles.resultScoreBox}>
                <Text style={styles.resultScoreLabel}>최종 획득 점수</Text>
                <Text style={styles.resultScoreVal}>{score}점</Text>
                <Text style={styles.resultMaxCombo}>최고 콤보: {maxCombo} Combo</Text>
              </View>

              {/* Earned Rewards */}
              <View style={styles.rewardsBox}>
                <View style={styles.rewardRow}>
                  <Trophy size={18} color="#D48806" />
                  <Text style={[styles.rewardText, { color: '#B45309', fontWeight: '800' }]}>
                    반려몽 성장 경험치 +{Math.max(15, Math.min(50, Math.round(score / 15)))} EXP 획득! 🌱
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.resultBtnRow}>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={startGame}
                  activeOpacity={0.85}
                >
                  <RotateCcw size={16} color="#4A90E2" style={{ marginRight: 6 }} />
                  <Text style={styles.retryBtnText}>다시 도전</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.claimBtn}
                  onPress={handleClaimAndClose}
                  activeOpacity={0.85}
                >
                  <Check size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.claimBtnText}>보상 받기</Text>
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
    backgroundColor: '#FFF9F2',
    position: 'relative',
    overflow: 'hidden',
  },
  topHudBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 32,
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
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FFE2D1',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  hudPillUrgent: {
    borderColor: '#FF4D4F',
    backgroundColor: '#FFF1F0',
  },
  hudPillText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#333333',
  },
  hudPillScore: {
    backgroundColor: '#FFFBE6',
    borderColor: '#FFE58F',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#D48806',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFE2D1',
  },
  comboRow: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 104 : 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 45,
  },
  comboBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF7E82',
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 16,
    shadowColor: '#FF7E82',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  feverBadge: {
    backgroundColor: '#FF4D00',
    borderColor: '#FFD700',
    borderWidth: 2,
    transform: [{ scale: 1.1 }],
  },
  comboText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  playField: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 25,
  },
  fallingItemBox: {
    position: 'absolute',
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallingItemBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomStageArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: FLOOR_HEIGHT,
    zIndex: 20,
  },
  stageWoodFloor: {
    flex: 1,
    backgroundColor: '#F3E5D8',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 3,
    borderColor: '#E6D2C0',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingHorizontal: 20,
    shadowColor: '#8D6E63',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  stageWoodHighlight: {
    position: 'absolute',
    top: 0,
    left: 40,
    right: 40,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 2,
  },
  stageGuideText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8D6E63',
    letterSpacing: -0.2,
  },
  petPlayerContainer: {
    position: 'absolute',
    bottom: FLOOR_HEIGHT - 12,
    width: PET_WIDTH,
    height: PET_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
  },
  petPlayerImage: {
    width: PET_WIDTH,
    height: PET_HEIGHT,
  },
  petPlayerEmoji: {
    fontSize: 60,
  },
  petStunned: {
    opacity: 0.65,
  },
  stunBadge: {
    position: 'absolute',
    top: -12,
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  stunBadgeText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '800',
  },
  playerShadow: {
    width: 54,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(141, 110, 99, 0.25)',
    position: 'absolute',
    bottom: 2,
  },
  floatingToast: {
    position: 'absolute',
    zIndex: 55,
  },
  floatingToastText: {
    fontSize: 15,
    fontWeight: '900',
    textShadowColor: 'rgba(255, 255, 255, 0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  overlayCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 100,
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
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  readyHeaderIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  readyMiniBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  readyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#2D3436',
    marginBottom: 8,
  },
  readyDesc: {
    fontSize: 13,
    color: '#636E72',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  rulePillBox: {
    width: '100%',
    backgroundColor: '#FFF4EB',
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  ruleItemIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rulePillText: {
    fontSize: 12,
    color: '#D46B08',
    fontWeight: '700',
    textAlign: 'center',
  },
  startBtn: {
    width: '100%',
    backgroundColor: '#FF7E82',
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF7E82',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
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
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  resultHeaderIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#2D3436',
    marginBottom: 10,
  },
  gradePill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 16,
  },
  gradePillText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  resultScoreBox: {
    width: '100%',
    backgroundColor: '#FFFBE6',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFE58F',
    padding: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  resultScoreLabel: {
    fontSize: 12,
    color: '#8C6B00',
    fontWeight: '700',
    marginBottom: 4,
  },
  resultScoreVal: {
    fontSize: 28,
    fontWeight: '900',
    color: '#D48806',
  },
  resultMaxCombo: {
    fontSize: 12,
    color: '#FA8C16',
    fontWeight: '800',
    marginTop: 4,
  },
  rewardsBox: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 12,
    gap: 8,
    marginBottom: 20,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rewardText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D3436',
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
    backgroundColor: '#E6F7FF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#91D5FF',
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1890FF',
  },
  claimBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#FF7E82',
    borderRadius: 14,
    shadowColor: '#FF7E82',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  claimBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
