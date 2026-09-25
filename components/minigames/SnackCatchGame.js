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
  PanResponder,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Trophy, Sparkles, Heart, X, Flame, RotateCcw, Check, Clock, ChevronLeft, ChevronRight } from 'lucide-react-native';

// Game Configuration
const GAME_DURATION = 30; // 30 seconds
const PET_WIDTH = 84;
const PET_HEIGHT = 84;
const ITEM_SIZE = 44;
const FLOOR_HEIGHT = 110; // Bottom stage floor height
const SPAWN_INTERVAL = 550; // ms between items

// Falling Items Table
const ITEMS_TABLE = [
  { type: 'apple', emoji: '🍎', name: '사과', score: 10, isHazard: false },
  { type: 'meat', emoji: '🍖', name: '고기', score: 20, isHazard: false },
  { type: 'cake', emoji: '🍰', name: '케이크', score: 30, isHazard: false },
  { type: 'star', emoji: '⭐', name: '별사탕', score: 50, isHazard: false },
  { type: 'pepper', emoji: '🌶️', name: '매운고추', score: -15, isHazard: true },
  { type: 'bomb', emoji: '💣', name: '폭탄', score: -25, isHazard: true },
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

  // State Refs for physics and gesture handlers (eliminates stale closures)
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

  // Character Movement & Animation Values (USE_NATIVE_DRIVER: false for 100% reliable gesture tracking)
  const petX = useRef(new Animated.Value((screenWidth - PET_WIDTH) / 2)).current;
  const currentPetX = useRef((screenWidth - PET_WIDTH) / 2);
  const petBounce = useRef(new Animated.Value(1)).current;
  const petScaleX = useRef(new Animated.Value(1)).current; // 1 = right, -1 = left

  // Fever Visual Pulse Animation
  const feverPulse = useRef(new Animated.Value(1)).current;

  // Timers & Loop Refs
  const gameTimerRef = useRef(null);
  const spawnTimerRef = useRef(null);
  const animFrameRef = useRef(null);
  const feverTimerRef = useRef(null);
  const stunTimerRef = useRef(null);

  // Sync petX animated value to currentPetX ref
  useEffect(() => {
    const listenerId = petX.addListener(({ value }) => {
      currentPetX.current = value;
    });
    return () => {
      petX.removeListener(listenerId);
    };
  }, [petX]);

  // -----------------------------------------------------------------
  // Move Pet to Target X (Direct Finger Tracking with 0ms Lag)
  // -----------------------------------------------------------------
  const movePetTo = useCallback((touchX, isTap = false) => {
    if (typeof touchX !== 'number' || isNaN(touchX)) return;
    const stageWidth = screenWidthRef.current;
    const targetX = Math.max(10, Math.min(stageWidth - PET_WIDTH - 10, touchX - PET_WIDTH / 2));

    if (targetX < currentPetX.current - 2) {
      petScaleX.setValue(-1);
    } else if (targetX > currentPetX.current + 2) {
      petScaleX.setValue(1);
    }

    currentPetX.current = targetX;

    if (isTap) {
      Animated.spring(petX, {
        toValue: targetX,
        friction: 7,
        tension: 110,
        useNativeDriver: false,
      }).start();
    } else {
      // Direct 1:1 Instant Finger Follow (Zero Latency)
      petX.setValue(targetX);
    }
  }, [petX, petScaleX]);

  // Step Move for Left/Right Assist Buttons
  const stepPetMove = useCallback((offset) => {
    if (gameStateRef.current !== 'playing' || isStunnedRef.current) return;
    const nextX = currentPetX.current + offset;
    movePetTo(nextX + PET_WIDTH / 2, true);
  }, [movePetTo]);

  // -----------------------------------------------------------------
  // PanResponder with Capture to Ensure Full Touch Priority on iOS/Android
  // -----------------------------------------------------------------
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 1;
      },
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        if (gameStateRef.current !== 'playing' || isStunnedRef.current) return;
        const touchX = gestureState.x0 || evt.nativeEvent.pageX || evt.nativeEvent.locationX;
        movePetTo(touchX, true);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gameStateRef.current !== 'playing' || isStunnedRef.current) return;
        const touchX = gestureState.moveX || evt.nativeEvent.pageX || evt.nativeEvent.locationX;
        movePetTo(touchX, false);
      },
    })
  ).current;

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

    petX.setValue(initialPetX);
    currentPetX.current = initialPetX;
    petScaleX.setValue(1);
    setGameState('playing');
  }, [petX, petScaleX]);

  // -----------------------------------------------------------------
  // Fever Mode Controller
  // -----------------------------------------------------------------
  const activateFeverMode = useCallback(() => {
    setIsFever(true);
    triggerToast('🔥 FEVER TIME! 2배 점수! 🔥', '#FF6B00');

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
      y: 75, // Spawn right below the top HUD
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
      triggerToast(`${item.name}! ${item.score} 💥`, '#DC2626');
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

      triggerToast(`+${pointsGained} 냠냠! 😋`, '#10B981');
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
    if (finalScore >= 750) return { grade: 'S', color: '#FAAD14', title: '간식 마스터 👑' };
    if (finalScore >= 500) return { grade: 'A', color: '#52C41A', title: '폭풍 먹방 🌟' };
    if (finalScore >= 300) return { grade: 'B', color: '#1890FF', title: '배부른 몽이 🍖' };
    return { grade: 'C', color: '#8C8C8C', title: '초보 미식가 🌱' };
  };

  const handleClaimAndClose = () => {
    const finalExp = Math.max(10, Math.min(35, Math.round(score / 30)));
    const finalPoints = Math.max(3, Math.min(15, Math.round(score / 60)));

    if (onGameComplete) {
      onGameComplete({
        score,
        maxCombo,
        exp: finalExp,
        points: finalPoints,
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
      transparent={true}
      presentationStyle="overFullScreen"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.gameContainer, { width: screenWidth, height: screenHeight }]}>
        {/* --------------------------------------------------------- */}
        {/* FULLSCREEN TOUCH CAPTURE LAYER FOR SMOOTH SWIPING */}
        {/* --------------------------------------------------------- */}
        <View style={StyleSheet.absoluteFillObject} {...panResponder.panHandlers} />

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
            <Text style={styles.scoreText}>{score} Pts</Text>
          </View>

          {/* Close Game Button */}
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.8}>
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
              <Text style={styles.fallingItemEmoji}>{item.emoji}</Text>
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
        <View style={styles.bottomStageArea} pointerEvents="box-none">
          <View style={styles.stageWoodFloor}>
            <View style={styles.stageWoodHighlight} />

            {/* Touch Assist Step Buttons */}
            {gameState === 'playing' && (
              <View style={styles.stageControlsRow}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => stepPetMove(-55)}
                  activeOpacity={0.7}
                >
                  <ChevronLeft size={20} color="#8D6E63" />
                  <Text style={styles.stepBtnText}>왼쪽</Text>
                </TouchableOpacity>

                <Text style={styles.stageGuideText}>화면 스와이프 or 버튼 탭</Text>

                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => stepPetMove(55)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.stepBtnText}>오른쪽</Text>
                  <ChevronRight size={20} color="#8D6E63" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* --------------------------------------------------------- */}
        {/* PET ACTOR SPRITE (Controlled by User Swipe & Buttons) */}
        {/* --------------------------------------------------------- */}
        <Animated.View
          style={[
            styles.petPlayerContainer,
            {
              transform: [
                { translateX: petX },
                { scaleY: petBounce },
                { scaleX: petScaleX },
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
              <Text style={styles.stunBadgeText}>💫 으악!</Text>
            </View>
          )}

          {/* Ground Contact Shadow */}
          <View style={styles.playerShadow} />
        </Animated.View>

        {/* --------------------------------------------------------- */}
        {/* READY / START OVERLAY (Full-Screen Dimensioned Backdrop) */}
        {/* --------------------------------------------------------- */}
        {gameState === 'ready' && (
          <View style={[styles.overlayCenter, { width: screenWidth, height: screenHeight }]}>
            <View style={styles.readyCard}>
              <Text style={styles.readyHeaderEmoji}>🍖✨😋</Text>
              <Text style={styles.readyTitle}>와구와구 간식 캐치!</Text>
              <Text style={styles.readyDesc}>
                하늘에서 떨어지는 맛있는 간식을{'\n'}
                반려몽을 좌우로 조작하여 마음껏 받아먹이세요!
              </Text>

              <View style={styles.rulePillBox}>
                <Text style={styles.rulePillText}>🍎 🍖 🍰 간식 = +점수 & 콤보!</Text>
                <Text style={styles.rulePillText}>💣 🌶️ 폭탄/고추 = -점수 & 기절!</Text>
                <Text style={[styles.rulePillText, { color: '#FF7E82', fontWeight: '800' }]}>
                  🔥 8콤보 달성 시 2배 FEVER TIME!
                </Text>
              </View>

              <TouchableOpacity style={styles.startBtn} onPress={startGame} activeOpacity={0.85}>
                <Text style={styles.startBtnText}>게임 시작하기 🚀</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* --------------------------------------------------------- */}
        {/* GAME OVER RESULT OVERLAY (Full-Screen Dimensioned Backdrop) */}
        {/* --------------------------------------------------------- */}
        {gameState === 'gameover' && (
          <View style={[styles.overlayCenter, { width: screenWidth, height: screenHeight }]}>
            <View style={styles.resultCard}>
              <Text style={styles.resultHeaderEmoji}>🎉🎊</Text>
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
                <Text style={styles.resultScoreVal}>{score} Pts</Text>
                <Text style={styles.resultMaxCombo}>최고 콤보: {maxCombo} Combo 🔥</Text>
              </View>

              {/* Earned Rewards */}
              <View style={styles.rewardsBox}>
                <View style={styles.rewardRow}>
                  <Heart size={16} color="#FF4D6D" fill="#FF4D6D" />
                  <Text style={styles.rewardText}>포만감 100% 가득 참! 🍗</Text>
                </View>
                <View style={styles.rewardRow}>
                  <Sparkles size={16} color="#52C41A" />
                  <Text style={styles.rewardText}>
                    반려몽 성장 +{Math.max(10, Math.min(35, Math.round(score / 30)))} EXP
                  </Text>
                </View>
                <View style={styles.rewardRow}>
                  <Trophy size={16} color="#D48806" />
                  <Text style={styles.rewardText}>
                    가족 보너스 +{Math.max(3, Math.min(15, Math.round(score / 60)))} P 지급
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
    top: Platform.OS === 'ios' ? 52 : 28,
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
    top: Platform.OS === 'ios' ? 100 : 76,
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
  },
  fallingItemBox: {
    position: 'absolute',
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallingItemEmoji: {
    fontSize: 34,
  },
  bottomStageArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: FLOOR_HEIGHT,
    zIndex: 30,
  },
  stageWoodFloor: {
    flex: 1,
    backgroundColor: '#F3E5D8',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 3,
    borderColor: '#E6D2C0',
    justifyContent: 'flex-end',
    paddingBottom: Platform.OS === 'ios' ? 26 : 14,
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
  stageControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6D2C0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  stepBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8D6E63',
  },
  stageGuideText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A1887F',
  },
  petPlayerContainer: {
    position: 'absolute',
    bottom: FLOOR_HEIGHT - 12,
    left: 0,
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
  readyHeaderEmoji: {
    fontSize: 42,
    marginBottom: 8,
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
    gap: 6,
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
    alignItems: 'center',
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
  resultHeaderEmoji: {
    fontSize: 40,
    marginBottom: 6,
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
