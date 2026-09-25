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
import { Trophy, Sparkles, Heart, X, Flame, RotateCcw, Check, Clock } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

// Game Boundaries & Configuration
const GAME_DURATION = 30; // 30 seconds
const PET_WIDTH = 90;
const PET_HEIGHT = 90;
const ITEM_SIZE = 42;
const SPAWN_INTERVAL = 620; // ms between items

// Falling Items Table
const ITEMS_TABLE = [
  { type: 'apple', emoji: '🍎', name: '사과', score: 10, exp: 1, isHazard: false },
  { type: 'meat', emoji: '🍖', name: '고기', score: 20, exp: 2, isHazard: false },
  { type: 'cake', emoji: '🍰', name: '케이크', score: 30, exp: 3, isHazard: false },
  { type: 'star', emoji: '⭐', name: '별사탕', score: 50, exp: 5, isHazard: false },
  { type: 'pepper', emoji: '🌶️', name: '매운고추', score: -15, exp: 0, isHazard: true },
  { type: 'bomb', emoji: '💣', name: '폭탄', score: -25, exp: 0, isHazard: true },
];

export default function SnackCatchGame({
  visible,
  character,
  transparentUrl,
  onClose,
  onGameComplete,
}) {
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

  // Character Movement & Physics Animation
  const petX = useRef(new Animated.Value((SCREEN_WIDTH - PET_WIDTH) / 2)).current;
  const currentPetX = useRef((SCREEN_WIDTH - PET_WIDTH) / 2);
  const petBounce = useRef(new Animated.Value(1)).current;
  const petDirection = useRef(1); // 1 = right, -1 = left

  // Fever Visual Pulse Animation
  const feverPulse = useRef(new Animated.Value(1)).current;

  // Game Loop Timers
  const gameTimerRef = useRef(null);
  const spawnTimerRef = useRef(null);
  const animFrameRef = useRef(null);
  const feverTimerRef = useRef(null);
  const stunTimerRef = useRef(null);

  // Sync petX animated value to currentPetX ref for collision detection
  useEffect(() => {
    const listenerId = petX.addListener(({ value }) => {
      currentPetX.current = value;
    });
    return () => {
      petX.removeListener(listenerId);
    };
  }, [petX]);

  // Touch / Pan Controls for Moving Pet Left & Right
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        if (gameState !== 'playing' || isStunned) return;
        movePetTo(evt.nativeEvent.pageX);
      },
      onPanResponderMove: (evt) => {
        if (gameState !== 'playing' || isStunned) return;
        movePetTo(evt.nativeEvent.pageX);
      },
    })
  ).current;

  const movePetTo = (touchX) => {
    const targetX = Math.max(12, Math.min(SCREEN_WIDTH - PET_WIDTH - 12, touchX - PET_WIDTH / 2));
    if (targetX < currentPetX.current) {
      petDirection.current = -1;
    } else if (targetX > currentPetX.current) {
      petDirection.current = 1;
    }
    Animated.spring(petX, {
      toValue: targetX,
      friction: 8,
      tension: 100,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  };

  // Start / Reset Game
  const startGame = useCallback(() => {
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setTimeLeft(GAME_DURATION);
    setIsFever(false);
    setIsStunned(false);
    setItems([]);
    setToasts([]);
    petX.setValue((SCREEN_WIDTH - PET_WIDTH) / 2);
    currentPetX.current = (SCREEN_WIDTH - PET_WIDTH) / 2;
    setGameState('playing');
  }, [petX]);

  // -----------------------------------------------------------------
  // Fever Mode Controller
  // -----------------------------------------------------------------
  const activateFeverMode = useCallback(() => {
    setIsFever(true);
    triggerToast('🔥 FEVER TIME! 2배 점수! 🔥', '#FF6B00');

    Animated.loop(
      Animated.sequence([
        Animated.timing(feverPulse, { toValue: 1.08, duration: 250, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(feverPulse, { toValue: 1.0, duration: 250, useNativeDriver: USE_NATIVE_DRIVER }),
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
    const x = Math.max(30, Math.min(SCREEN_WIDTH - 120, currentPetX.current + 10));
    const y = SCREEN_HEIGHT * 0.72;
    setToasts(prev => [...prev.slice(-4), { id, text, color, x, y }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 900);
  };

  // -----------------------------------------------------------------
  // Spawn Falling Item
  // -----------------------------------------------------------------
  const spawnItem = useCallback(() => {
    if (gameState !== 'playing') return;

    let pool = ITEMS_TABLE;
    if (isFever) {
      // During fever: only high-score treats and stars, no hazards!
      pool = ITEMS_TABLE.filter(i => !i.isHazard);
    }

    const template = pool[Math.floor(Math.random() * pool.length)];
    const startX = Math.max(20, Math.min(SCREEN_WIDTH - ITEM_SIZE - 20, Math.random() * (SCREEN_WIDTH - ITEM_SIZE)));
    const speed = isFever ? 4.5 + Math.random() * 2 : 3.2 + Math.random() * 1.8;

    const newItem = {
      id: `item_${Date.now()}_${Math.random()}`,
      ...template,
      x: startX,
      y: -ITEM_SIZE,
      speed,
    };

    setItems(prev => [...prev.slice(-18), newItem]);
  }, [gameState, isFever]);

  // -----------------------------------------------------------------
  // Main Physics & Collision Detection Loop (60 FPS)
  // -----------------------------------------------------------------
  useEffect(() => {
    if (gameState !== 'playing') return;

    const petHitY = SCREEN_HEIGHT * 0.77;
    const petHitHeight = PET_HEIGHT;

    const updatePhysics = () => {
      setItems(prevItems => {
        const nextItems = [];

        for (let i = 0; i < prevItems.length; i++) {
          const item = prevItems[i];
          const nextY = item.y + item.speed;

          // Check Collision with Pet Catch Box
          const isCollidingY = nextY + ITEM_SIZE >= petHitY && nextY <= petHitY + petHitHeight * 0.65;
          const isCollidingX =
            item.x + ITEM_SIZE >= currentPetX.current - 12 &&
            item.x <= currentPetX.current + PET_WIDTH + 12;

          if (isCollidingY && isCollidingX) {
            // Collision HIT!
            handleItemCollected(item);
            continue; // Item consumed, do not push to nextItems
          }

          // Off-screen bottom
          if (nextY > SCREEN_HEIGHT + 30) {
            if (!item.isHazard) {
              // Missed food resets combo
              setCombo(0);
            }
            continue;
          }

          nextItems.push({ ...item, y: nextY });
        }

        return nextItems;
      });

      animFrameRef.current = requestAnimationFrame(updatePhysics);
    };

    animFrameRef.current = requestAnimationFrame(updatePhysics);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState]);

  // -----------------------------------------------------------------
  // Item Collected Handler
  // -----------------------------------------------------------------
  const handleItemCollected = (item) => {
    // 1. Pet Bite Squish Bounce Animation
    Animated.sequence([
      Animated.timing(petBounce, { toValue: 0.78, duration: 80, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(petBounce, { toValue: 1.22, duration: 110, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(petBounce, { toValue: 1.0, duration: 100, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();

    if (item.isHazard) {
      // Stun & Score Penalty
      setCombo(0);
      setScore(s => Math.max(0, s + item.score));
      triggerToast(`${item.name}! ${item.score} 💥`, '#DC2626');
      setIsStunned(true);

      if (stunTimerRef.current) clearTimeout(stunTimerRef.current);
      stunTimerRef.current = setTimeout(() => {
        setIsStunned(false);
      }, 750);
    } else {
      // Success Treat Catch
      const multiplier = isFever ? 2 : 1;
      const pointsGained = item.score * multiplier;
      setScore(s => s + pointsGained);

      setCombo(c => {
        const nextCombo = c + 1;
        setMaxCombo(m => Math.max(m, nextCombo));
        if (nextCombo === 8 && !isFever) {
          activateFeverMode();
        }
        return nextCombo;
      });

      triggerToast(`+${pointsGained} 냠냠! 😋`, '#10B981');
    }
  };

  // -----------------------------------------------------------------
  // Game Loop Timers (Clock countdown & Spawner)
  // -----------------------------------------------------------------
  useEffect(() => {
    if (gameState === 'playing') {
      // Clock Timer
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

      // Item Spawner
      spawnTimerRef.current = setInterval(() => {
        spawnItem();
      }, isFever ? SPAWN_INTERVAL * 0.55 : SPAWN_INTERVAL);
    }

    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    };
  }, [gameState, isFever, spawnItem]);

  // Finish Game & Calculate Rewards
  const finishGame = useCallback(() => {
    setGameState('gameover');
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    if (feverTimerRef.current) clearTimeout(feverTimerRef.current);
    if (stunTimerRef.current) clearTimeout(stunTimerRef.current);
  }, []);

  // Compute Final Grade & Rewards
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
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <View style={styles.gameContainer} {...panResponder.panHandlers}>
        {/* --------------------------------------------------------- */}
        {/* TOP STATUS HUD */}
        {/* --------------------------------------------------------- */}
        <View style={styles.topHudBar}>
          {/* Time Counter */}
          <View style={[styles.hudPill, timeLeft <= 5 && styles.hudPillUrgent]}>
            <Clock size={16} color={timeLeft <= 5 ? '#FF4D4F' : '#333'} />
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
            <X size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Combo & Fever Indicator */}
        <View style={styles.comboRow}>
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
        {/* PET ACTOR SPRITE (Controlled by User Swipe) */}
        {/* --------------------------------------------------------- */}
        <Animated.View
          style={[
            styles.petPlayerContainer,
            {
              transform: [
                { translateX: petX },
                { scaleY: petBounce },
                { scaleX: petDirection.current },
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

          {/* Catch Plate / Shadow */}
          <View style={styles.playerShadow} />
        </Animated.View>

        {/* Guidance Prompt at Bottom */}
        {gameState === 'playing' && (
          <View style={styles.swipeGuideBox} pointerEvents="none">
            <Text style={styles.swipeGuideText}>👈 화면을 좌우로 문질러 간식을 받아먹으세요! 👉</Text>
          </View>
        )}

        {/* --------------------------------------------------------- */}
        {/* READY / START OVERLAY */}
        {/* --------------------------------------------------------- */}
        {gameState === 'ready' && (
          <View style={styles.overlayCenter}>
            <View style={styles.readyCard}>
              <Text style={styles.readyHeaderEmoji}>🍖✨😋</Text>
              <Text style={styles.readyTitle}>와구와구 간식 캐치!</Text>
              <Text style={styles.readyDesc}>
                30초 동안 하늘에서 떨어지는 맛있는 간식을{'\n'}
                반려몽을 좌우로 조작하여 마음껏 먹여주세요!
              </Text>

              <View style={styles.rulePillBox}>
                <Text style={styles.rulePillText}>🍎 🍖 🍰 간식 = +점수 & 콤보!</Text>
                <Text style={styles.rulePillText}>💣 🌶️ 폭탄/고추 = -점수 & 기절!</Text>
                <Text style={[styles.rulePillText, { color: '#FF7E82', fontWeight: '800' }]}>
                  🔥 8콤보 달성 시 피버 타임 발동!
                </Text>
              </View>

              <TouchableOpacity style={styles.startBtn} onPress={startGame} activeOpacity={0.85}>
                <Text style={styles.startBtnText}>게임 시작하기 🚀</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* --------------------------------------------------------- */}
        {/* GAME OVER RESULT OVERLAY */}
        {/* --------------------------------------------------------- */}
        {gameState === 'gameover' && (
          <View style={styles.overlayCenter}>
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
    flex: 1,
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
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 14,
    paddingVertical: 8,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFE2D1',
  },
  comboRow: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 104 : 82,
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
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#FF7E82',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  feverBadge: {
    backgroundColor: '#FF4D00',
    borderColor: '#FFD700',
    borderWidth: 2,
    transform: [{ scale: 1.1 }],
  },
  comboText: {
    fontSize: 14,
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
  petPlayerContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 110 : 80,
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
    fontSize: 66,
  },
  petStunned: {
    opacity: 0.65,
  },
  stunBadge: {
    position: 'absolute',
    top: -14,
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
    width: 60,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    position: 'absolute',
    bottom: 2,
  },
  floatingToast: {
    position: 'absolute',
    zIndex: 55,
  },
  floatingToastText: {
    fontSize: 16,
    fontWeight: '900',
    textShadowColor: 'rgba(255, 255, 255, 0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  swipeGuideBox: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 25,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  swipeGuideText: {
    fontSize: 13,
    color: '#B08873',
    fontWeight: '600',
  },
  overlayCenter: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
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
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  readyHeaderEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  readyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  readyDesc: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  rulePillBox: {
    width: '100%',
    backgroundColor: '#FFF9F2',
    padding: 12,
    borderRadius: 14,
    gap: 6,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE8D6',
  },
  rulePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555555',
  },
  startBtn: {
    width: '100%',
    backgroundColor: '#FF7E82',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: '800',
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
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  resultHeaderEmoji: {
    fontSize: 42,
    marginBottom: 6,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  gradePill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  gradePillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  resultScoreBox: {
    width: '100%',
    backgroundColor: '#FFFBE6',
    borderWidth: 1,
    borderColor: '#FFE58F',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  resultScoreLabel: {
    fontSize: 12,
    color: '#8C6B00',
    fontWeight: '600',
    marginBottom: 2,
  },
  resultScoreVal: {
    fontSize: 32,
    fontWeight: '900',
    color: '#D48806',
    marginBottom: 4,
  },
  resultMaxCombo: {
    fontSize: 12,
    color: '#FA8C16',
    fontWeight: '700',
  },
  rewardsBox: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rewardText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  resultBtnRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  retryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F5FF',
    borderWidth: 1.5,
    borderColor: '#ADC6FF',
    paddingVertical: 13,
    borderRadius: 12,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2F54EB',
  },
  claimBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF7E82',
    paddingVertical: 13,
    borderRadius: 12,
  },
  claimBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
