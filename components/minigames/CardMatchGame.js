import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Modal,
  Animated,
  Platform,
  Alert,
  Image,
  StatusBar,
} from 'react-native';
import Svg, { Circle, Path, Rect, G } from 'react-native-svg';
import {
  Trophy,
  Sparkles,
  Heart,
  X,
  RotateCcw,
  Check,
  Clock,
  Play,
  Zap,
  Flame,
  Award,
  Layers,
} from 'lucide-react-native';
import { useTransparentImage } from '../../lib/imageTransparencyService';
import { colors } from '../../theme/colors';

// -----------------------------------------------------------------
// Sound Synthesizer via Web Audio API (Silent fallback on native)
// -----------------------------------------------------------------
const playAudioTone = (freq, duration = 0.08, type = 'sine') => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!window.__famlinkCardAudioCtx) {
      window.__famlinkCardAudioCtx = new AudioCtx();
    }
    const ctx = window.__famlinkCardAudioCtx;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.09, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Non-blocking sound fallback
  }
};

const playMatchChime = () => {
  playAudioTone(523.25, 0.09, 'triangle'); // C5
  setTimeout(() => playAudioTone(659.25, 0.09, 'triangle'), 65); // E5
  setTimeout(() => playAudioTone(783.99, 0.16, 'triangle'), 130); // G5
};

const playFlipTick = () => {
  playAudioTone(440, 0.05, 'sine');
};

const playMismatchBoing = () => {
  playAudioTone(260, 0.08, 'sawtooth');
  setTimeout(() => playAudioTone(196, 0.12, 'sawtooth'), 50);
};

// -----------------------------------------------------------------
// 9-Pair Definitions for 3x6 (18 Cards)
// -----------------------------------------------------------------
const CARD_PAIR_DEFINITIONS = [
  {
    pairId: 1,
    name: '반려몽',
    emoji: '🐶',
    color: '#FF6B47',
    bgColor: '#FFF5F2',
    isHero: true,
  },
  {
    pairId: 2,
    name: '황금 닭다리',
    emoji: '🍗',
    color: '#EA580C',
    bgColor: '#FFEDD5',
    isHero: false,
  },
  {
    pairId: 3,
    name: '폭신 털실공',
    emoji: '🧶',
    color: '#E11D48',
    bgColor: '#FFE4E6',
    isHero: false,
  },
  {
    pairId: 4,
    name: '뽀득 비누',
    emoji: '🧼',
    color: '#0284C7',
    bgColor: '#E0F2FE',
    isHero: false,
  },
  {
    pairId: 5,
    name: '꿈나라 달',
    emoji: '🌙',
    color: '#7C3AED',
    bgColor: '#F3E8FF',
    isHero: false,
  },
  {
    pairId: 6,
    name: '가족 편지',
    emoji: '💌',
    color: '#DB2777',
    bgColor: '#FCE7F3',
    isHero: false,
  },
  {
    pairId: 7,
    name: '골든 왕관',
    emoji: '👑',
    color: '#D97706',
    bgColor: '#FEF3C7',
    isHero: false,
  },
  {
    pairId: 8,
    name: '가족 사진',
    emoji: '📸',
    color: '#059669',
    bgColor: '#D1FAE5',
    isHero: false,
  },
  {
    pairId: 9,
    name: '행운 클로버',
    emoji: '🍀',
    color: '#16A34A',
    bgColor: '#DCFCE7',
    isHero: false,
  },
];

// Helper: Shuffle Array (Fisher-Yates)
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// -----------------------------------------------------------------
// Vector Paw Stamp for Card Back
// -----------------------------------------------------------------
function PawVectorStamp({ size = 26, color = '#FF6B47' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Circle cx="8.5" cy="5.5" r="2.2" />
      <Circle cx="15.5" cy="5.5" r="2.2" />
      <Circle cx="5.2" cy="10.5" r="2" />
      <Circle cx="18.8" cy="10.5" r="2" />
      <Path d="M12 9.5C9.2 9.5 7 11.8 7 15C7 17.5 9 19.5 12 19.5C15 19.5 17 17.5 17 15C17 11.8 14.8 9.5 12 9.5Z" />
    </Svg>
  );
}

// -----------------------------------------------------------------
// Main Component: CardMatchGame (3x6 = 18 Cards)
// -----------------------------------------------------------------
export default function CardMatchGame({
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

  const cleanPetUrl = useTransparentImage(transparentUrl || character?.image_url);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => sub?.remove?.();
  }, []);

  // Game Lifecycle States: 'ready' | 'playing' | 'gameover'
  const [gameState, setGameState] = useState('ready');

  // Deck of 18 Cards
  const [cards, setCards] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState([]); // indices currently flipped open (max 2)
  const [matchedPairIds, setMatchedPairIds] = useState(new Set()); // set of matched pairIds
  const [turns, setTurns] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Animation values for 18 cards
  const flipAnims = useRef(Array.from({ length: 18 }, () => new Animated.Value(0))).current;
  const scaleAnims = useRef(Array.from({ length: 18 }, () => new Animated.Value(1))).current;
  const shakeAnims = useRef(Array.from({ length: 18 }, () => new Animated.Value(0))).current;

  // Pet Cheer Animation
  const petHopY = useRef(new Animated.Value(0)).current;

  // Timer Ref
  const timerRef = useRef(null);
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // Floating Toast Notification
  const triggerToast = useCallback((text, color = '#10B981') => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev.slice(-2), { id, text, color }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 900);
  }, []);

  // Pet Cheer Hop
  const cheerPetHop = useCallback(() => {
    Animated.sequence([
      Animated.timing(petHopY, { toValue: -14, duration: 130, useNativeDriver: true }),
      Animated.timing(petHopY, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [petHopY]);

  // ---------------------------------------------------------------
  // Deck Initialization (3x6 Grid = 9 Pairs x 2 = 18 Cards)
  // ---------------------------------------------------------------
  const initGameDeck = useCallback(() => {
    const initialDeck = [];
    CARD_PAIR_DEFINITIONS.forEach((pair) => {
      // 2 identical cards for each pair
      initialDeck.push({
        id: initialDeck.length,
        pairId: pair.pairId,
        name: pair.name,
        emoji: pair.isHero ? (character?.emoji || pair.emoji) : pair.emoji,
        color: pair.color,
        bgColor: pair.bgColor,
        isHero: pair.isHero,
      });
      initialDeck.push({
        id: initialDeck.length,
        pairId: pair.pairId,
        name: pair.name,
        emoji: pair.isHero ? (character?.emoji || pair.emoji) : pair.emoji,
        color: pair.color,
        bgColor: pair.bgColor,
        isHero: pair.isHero,
      });
    });

    const shuffled = shuffleArray(initialDeck).map((c, idx) => ({ ...c, gridIndex: idx }));

    // Reset all animations
    flipAnims.forEach((anim) => anim.setValue(0));
    scaleAnims.forEach((anim) => anim.setValue(1));
    shakeAnims.forEach((anim) => anim.setValue(0));

    setCards(shuffled);
    setFlippedIndices([]);
    setMatchedPairIds(new Set());
    setTurns(0);
    setElapsedSeconds(0);
    setCombo(0);
    setMaxCombo(0);
    setIsChecking(false);
    setToasts([]);
  }, [character?.emoji, flipAnims, scaleAnims, shakeAnims]);

  // ---------------------------------------------------------------
  // Game Timer
  // ---------------------------------------------------------------
  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  // Start Playing
  const handleStartGame = useCallback(() => {
    initGameDeck();
    setGameState('playing');
    playFlipTick();
  }, [initGameDeck]);

  // Exit Handler with Confirm
  const handleExitPress = useCallback(() => {
    if (gameStateRef.current === 'playing') {
      Alert.alert(
        '게임 나가기 🃏',
        '카드 짝맞추기를 중단하시겠습니까?\n지금 나가면 진행 상황이 저장되지 않습니다.',
        [
          { text: '계속하기', style: 'cancel' },
          {
            text: '나가기',
            style: 'destructive',
            onPress: () => {
              if (timerRef.current) clearInterval(timerRef.current);
              setGameState('ready');
              if (onClose) onClose();
            },
          },
        ]
      );
    } else {
      setGameState('ready');
      if (onClose) onClose();
    }
  }, [onClose]);

  // ---------------------------------------------------------------
  // Card Flip and Match Logic
  // ---------------------------------------------------------------
  const handleCardPress = useCallback((index) => {
    if (isChecking) return;
    if (flippedIndices.includes(index)) return;

    const targetCard = cards[index];
    if (!targetCard) return;
    if (matchedPairIds.has(targetCard.pairId)) return;

    // Flip open selected card
    playFlipTick();
    Animated.spring(flipAnims[index], {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    const nextFlipped = [...flippedIndices, index];
    setFlippedIndices(nextFlipped);

    // If 2 cards are now open, evaluate match
    if (nextFlipped.length === 2) {
      setIsChecking(true);
      setTurns((prev) => prev + 1);

      const [firstIdx, secondIdx] = nextFlipped;
      const firstCard = cards[firstIdx];
      const secondCard = cards[secondIdx];

      if (firstCard.pairId === secondCard.pairId) {
        // MATCH SUCCESS!
        setTimeout(() => {
          playMatchChime();
          cheerPetHop();

          // Scale pulse animation for matched pair
          [firstIdx, secondIdx].forEach((idx) => {
            Animated.sequence([
              Animated.timing(scaleAnims[idx], { toValue: 1.15, duration: 140, useNativeDriver: true }),
              Animated.timing(scaleAnims[idx], { toValue: 1.0, duration: 150, useNativeDriver: true }),
            ]).start();
          });

          const newMatched = new Set(matchedPairIds);
          newMatched.add(firstCard.pairId);
          setMatchedPairIds(newMatched);
          setFlippedIndices([]);
          setIsChecking(false);

          // Combo tracking
          setCombo((prevCombo) => {
            const nextCombo = prevCombo + 1;
            setMaxCombo((m) => Math.max(m, nextCombo));
            if (nextCombo > 1) {
              triggerToast(`🔥 ${nextCombo}연속 콤보!`, '#EA580C');
            } else {
              triggerToast(`✨ [${firstCard.name}] 짝 완성!`, '#10B981');
            }
            return nextCombo;
          });

          // Check Game Clear Condition (All 9 pairs matched!)
          if (newMatched.size === CARD_PAIR_DEFINITIONS.length) {
            setTimeout(() => {
              handleGameClear();
            }, 600);
          }
        }, 220);
      } else {
        // MATCH FAILED (MISMATCH)
        setTimeout(() => {
          playMismatchBoing();
          setCombo(0);

          // Shake animation on both cards
          [firstIdx, secondIdx].forEach((idx) => {
            Animated.sequence([
              Animated.timing(shakeAnims[idx], { toValue: 7, duration: 60, useNativeDriver: true }),
              Animated.timing(shakeAnims[idx], { toValue: -7, duration: 60, useNativeDriver: true }),
              Animated.timing(shakeAnims[idx], { toValue: 4, duration: 60, useNativeDriver: true }),
              Animated.timing(shakeAnims[idx], { toValue: 0, duration: 60, useNativeDriver: true }),
            ]).start();
          });

          // Flip back to face-down
          setTimeout(() => {
            [firstIdx, secondIdx].forEach((idx) => {
              Animated.timing(flipAnims[idx], {
                toValue: 0,
                duration: 220,
                useNativeDriver: true,
              }).start();
            });
            setFlippedIndices([]);
            setIsChecking(false);
          }, 380);
        }, 400);
      }
    }
  }, [
    isChecking,
    flippedIndices,
    cards,
    matchedPairIds,
    flipAnims,
    scaleAnims,
    shakeAnims,
    cheerPetHop,
    triggerToast,
  ]);

  // ---------------------------------------------------------------
  // Game Clear & Score Calculation
  // ---------------------------------------------------------------
  const handleGameClear = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameState('gameover');

    // Score & EXP Evaluation
    // Base score 1000, penalty for extra turns & elapsed time
    const timePenalty = Math.min(400, elapsedSeconds * 5);
    const turnPenalty = Math.max(0, (turns - 9) * 25);
    const comboBonus = maxCombo * 40;
    const finalScore = Math.max(300, 1000 - timePenalty - turnPenalty + comboBonus);

    // EXP reward: 25 ~ 50 EXP
    const awardedExp = Math.min(50, Math.max(25, Math.round(finalScore / 20)));

    if (onGameComplete) {
      onGameComplete({
        score: finalScore,
        exp: awardedExp,
        isPractice: !canEarnReward || remainingRewards <= 0,
        stats: {
          turns,
          time: elapsedSeconds,
          maxCombo,
        },
      });
    }
  };

  // Rank Badge Calculator
  const rankInfo = useMemo(() => {
    if (turns <= 13 && elapsedSeconds <= 45) {
      return { grade: 'S', color: '#F59E0B', title: '기억력 마스터 👑' };
    }
    if (turns <= 18 && elapsedSeconds <= 70) {
      return { grade: 'A', color: '#10B981', title: '환상의 호흡 듀오 ✨' };
    }
    return { grade: 'B', color: '#6366F1', title: '참 잘했어요 🌱' };
  }, [turns, elapsedSeconds]);

  // Format mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // ---------------------------------------------------------------
  // Responsive Card Sizing for 3 Rows x 6 Columns Table
  // ---------------------------------------------------------------
  const { cardWidth, cardHeight } = useMemo(() => {
    const backdropPadding = 20; // 10px left + 10px right
    const containerInnerPadding = 24; // 12px left + 12px right
    const cols = 6;
    const colGap = 5;

    const availableContainerW = Math.min(screenWidth - backdropPadding, 420);
    const availableW = availableContainerW - containerInnerPadding - (cols - 1) * colGap;
    const cw = Math.max(46, Math.floor(availableW / cols));
    const ch = Math.round(cw * 1.32); // standard card aspect ratio

    return { cardWidth: cw, cardHeight: ch };
  }, [screenWidth]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleExitPress}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.modalBackdrop}>
        <View style={styles.gameContainer}>
          {/* 1. Header Bar */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={handleExitPress} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color="#78716C" />
            </TouchableOpacity>

            <View style={styles.headerTitleBox}>
              <Layers size={17} color="#FF6B47" />
              <Text style={styles.headerTitle}>반려몽 카드 짝맞추기</Text>
            </View>

            <View style={styles.rewardPill}>
              <Sparkles size={13} color="#FF6B47" fill="#FF6B47" />
              <Text style={styles.rewardPillText}>
                {canEarnReward ? `보상 ${remainingRewards}회 남음` : '자유 연습'}
              </Text>
            </View>
          </View>

          {/* 2. State Switcher: READY / PLAYING / GAMEOVER */}
          {gameState === 'ready' && (
            <View style={styles.readyContainer}>
              <View style={styles.readyHeroCard}>
                <View style={styles.readyAvatarRing}>
                  {cleanPetUrl ? (
                    <Image source={{ uri: cleanPetUrl }} style={styles.readyPetImg} resizeMode="contain" />
                  ) : (
                    <Text style={styles.readyPetEmoji}>{character?.emoji || '🐶'}</Text>
                  )}
                </View>

                <Text style={styles.readyTitle}>3×6 카드 짝맞추기</Text>
                <Text style={styles.readyDesc}>
                  뒤집혀 있는 18장의 카드 중{'\n'}
                  <Text style={{ fontWeight: '800', color: '#FF6B47' }}>{character?.name || '반려몽'}</Text>과
                  최애 보물 9쌍을 모두 찾아보세요!
                </Text>

                <View style={styles.readyStatsBadgeRow}>
                  <View style={styles.readyBadgeItem}>
                    <Text style={styles.readyBadgeNum}>18장</Text>
                    <Text style={styles.readyBadgeLabel}>3 × 6 그리드</Text>
                  </View>
                  <View style={styles.readyBadgeDivider} />
                  <View style={styles.readyBadgeItem}>
                    <Text style={styles.readyBadgeNum}>9쌍</Text>
                    <Text style={styles.readyBadgeLabel}>보물 짝맞추기</Text>
                  </View>
                  <View style={styles.readyBadgeDivider} />
                  <View style={styles.readyBadgeItem}>
                    <Text style={[styles.readyBadgeNum, { color: '#10B981' }]}>+35~50</Text>
                    <Text style={styles.readyBadgeLabel}>성장 EXP</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.startBtn} onPress={handleStartGame} activeOpacity={0.85}>
                <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
                <Text style={styles.startBtnText}>게임 시작하기</Text>
              </TouchableOpacity>
            </View>
          )}

          {gameState === 'playing' && (
            <View style={styles.playingContainer}>
              {/* Stats HUD Ribbon */}
              <View style={styles.hudRibbon}>
                <View style={styles.hudItem}>
                  <Clock size={14} color="#78716C" />
                  <Text style={styles.hudText}>{formatTime(elapsedSeconds)}</Text>
                </View>

                <View style={styles.hudItemCenter}>
                  <Trophy size={14} color="#F59E0B" />
                  <Text style={styles.hudTextHighlight}>
                    {matchedPairIds.size} / {CARD_PAIR_DEFINITIONS.length} 쌍
                  </Text>
                </View>

                <View style={styles.hudItem}>
                  <RotateCcw size={14} color="#78716C" />
                  <Text style={styles.hudText}>{turns} 턴</Text>
                </View>

                {combo > 1 && (
                  <View style={styles.comboBadge}>
                    <Flame size={12} color="#FFFFFF" fill="#FFFFFF" />
                    <Text style={styles.comboText}>{combo} COMBO!</Text>
                  </View>
                )}
              </View>

              {/* 3행 6열 카드 테이블 (3 Rows x 6 Columns Table) */}
              <View style={styles.tableContainer}>
                {[0, 1, 2].map((rowIdx) => (
                  <View key={`table_row_${rowIdx}`} style={styles.tableRow}>
                    {[0, 1, 2, 3, 4, 5].map((colIdx) => {
                      const idx = rowIdx * 6 + colIdx;
                      const card = cards[idx];
                      if (!card) return null;

                      const isMatched = matchedPairIds.has(card.pairId);

                      const frontRotate = flipAnims[idx].interpolate({
                        inputRange: [0, 1],
                        outputRange: ['180deg', '360deg'],
                      });
                      const backRotate = flipAnims[idx].interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '180deg'],
                      });

                      return (
                        <Animated.View
                          key={`card_${card.id}_${idx}`}
                          style={[
                            styles.cardWrapper,
                            {
                              width: cardWidth,
                              height: cardHeight,
                              transform: [
                                { scale: scaleAnims[idx] },
                                { translateX: shakeAnims[idx] },
                              ],
                            },
                          ]}
                        >
                          <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => handleCardPress(idx)}
                            disabled={isChecking || isMatched}
                            style={styles.cardTouchArea}
                          >
                            {/* --- Card Face: FRONT (Open) --- */}
                            <Animated.View
                              style={[
                                styles.cardFace,
                                styles.cardFront,
                                {
                                  backgroundColor: card.bgColor || '#FFFFFF',
                                  borderColor: isMatched ? '#F59E0B' : '#E8E0D0',
                                  borderWidth: isMatched ? 2 : 1,
                                  transform: [{ rotateY: frontRotate }],
                                },
                              ]}
                            >
                              {card.isHero ? (
                                <View style={styles.heroCardContent}>
                                  {cleanPetUrl ? (
                                    <Image
                                      source={{ uri: cleanPetUrl }}
                                      style={styles.heroCardPetImg}
                                      resizeMode="contain"
                                    />
                                  ) : (
                                    <Text style={styles.heroCardEmoji}>{card.emoji}</Text>
                                  )}
                                  <Text style={styles.heroCardLabel} numberOfLines={1}>
                                    {character?.name || '반려몽'}
                                  </Text>
                                </View>
                              ) : (
                                <View style={styles.standardCardContent}>
                                  <Text style={styles.cardEmojiText}>{card.emoji}</Text>
                                  <Text style={[styles.cardNameText, { color: card.color }]} numberOfLines={1}>
                                    {card.name}
                                  </Text>
                                </View>
                              )}

                              {isMatched && (
                                <View style={styles.matchedCheckBadge}>
                                  <Check size={10} color="#FFFFFF" strokeWidth={3} />
                                </View>
                              )}
                            </Animated.View>

                            {/* --- Card Face: BACK (Closed) --- */}
                            <Animated.View
                              style={[
                                styles.cardFace,
                                styles.cardBack,
                                {
                                  transform: [{ rotateY: backRotate }],
                                },
                              ]}
                            >
                              <View style={styles.cardBackInner}>
                                {cleanPetUrl ? (
                                  <Image
                                    source={{ uri: cleanPetUrl }}
                                    style={styles.cardBackPetSilhouette}
                                    resizeMode="contain"
                                  />
                                ) : (
                                  <PawVectorStamp size={18} color="#FF6B47" />
                                )}
                                <View style={styles.cardBackMiniDot} />
                              </View>
                            </Animated.View>
                          </TouchableOpacity>
                        </Animated.View>
                      );
                    })}
                  </View>
                ))}
              </View>

              {/* Bottom Cheer & Pet Companion Bar */}
              <View style={styles.bottomCompanionRow}>
                <Animated.View style={[styles.bottomPetBox, { transform: [{ translateY: petHopY }] }]}>
                  {cleanPetUrl ? (
                    <Image source={{ uri: cleanPetUrl }} style={styles.bottomPetImg} resizeMode="contain" />
                  ) : (
                    <Text style={styles.bottomPetEmoji}>{character?.emoji || '🐶'}</Text>
                  )}
                </Animated.View>

                <View style={styles.speechBubble}>
                  <Text style={styles.speechBubbleText}>
                    {matchedPairIds.size === 0
                      ? '어디에 숨었을까 몽? 잘 기억해봐요! 🐾'
                      : matchedPairIds.size < 5
                      ? '우와! 짝을 맞췄어요! 계속 찾아봐요 ✨'
                      : matchedPairIds.size < 8
                      ? '거의 다 찾았어요! 기억력 최고예요 몽! 🌟'
                      : '마지막 짝을 찾아봐요! 화이팅! 💖'}
                  </Text>
                </View>
              </View>

              {/* Floating Notifications */}
              {toasts.map((t) => (
                <View key={t.id} style={[styles.toastContainer, { backgroundColor: t.color }]}>
                  <Text style={styles.toastText}>{t.text}</Text>
                </View>
              ))}
            </View>
          )}

          {gameState === 'gameover' && (
            <View style={styles.gameOverContainer}>
              <View style={styles.gameOverCard}>
                <View style={[styles.rankBadgeCircle, { backgroundColor: rankInfo.color }]}>
                  <Text style={styles.rankBadgeText}>{rankInfo.grade}</Text>
                </View>

                <Text style={styles.gameOverTitle}>{rankInfo.title}</Text>
                <Text style={styles.gameOverSub}>
                  {character?.name || '반려몽'}의 최애 보물 9쌍을 완벽하게 맞췄어요! ✨
                </Text>

                {/* Score Stats Summary */}
                <View style={styles.resultStatsRow}>
                  <View style={styles.resultStatBox}>
                    <Text style={styles.resultStatLabel}>소요 시간</Text>
                    <Text style={styles.resultStatVal}>{formatTime(elapsedSeconds)}</Text>
                  </View>
                  <View style={styles.resultStatDivider} />
                  <View style={styles.resultStatBox}>
                    <Text style={styles.resultStatLabel}>시도 턴 수</Text>
                    <Text style={styles.resultStatVal}>{turns}회</Text>
                  </View>
                  <View style={styles.resultStatDivider} />
                  <View style={styles.resultStatBox}>
                    <Text style={styles.resultStatLabel}>최대 콤보</Text>
                    <Text style={[styles.resultStatVal, { color: '#EA580C' }]}>{maxCombo}연속</Text>
                  </View>
                </View>

                {/* Reward Banner */}
                <View style={styles.resultRewardBanner}>
                  <Sparkles size={16} color="#FF6B47" fill="#FF6B47" />
                  <Text style={styles.resultRewardText}>
                    {canEarnReward
                      ? `성장 EXP +${Math.min(50, Math.max(25, Math.round(1000 / 25)))} 획득! (에너지 100% 충전)`
                      : '자유 연습 모드 클리어! 🎯'}
                  </Text>
                </View>

                {/* Pet Celebration Graphic */}
                <View style={styles.resultPetCelebration}>
                  {cleanPetUrl ? (
                    <Image source={{ uri: cleanPetUrl }} style={styles.resultPetImg} resizeMode="contain" />
                  ) : (
                    <Text style={styles.resultPetEmoji}>{character?.emoji || '🐶'}</Text>
                  )}
                  <Text style={styles.resultPetCheerText}>"가족의 기억력은 최고예요 몽! 💕"</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.gameOverBtnRow}>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={handleStartGame}
                  activeOpacity={0.85}
                >
                  <RotateCcw size={16} color="#78716C" />
                  <Text style={styles.retryBtnText}>다시 하기</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={() => {
                    setGameState('ready');
                    if (onClose) onClose();
                  }}
                  activeOpacity={0.85}
                >
                  <Check size={16} color="#FFFFFF" />
                  <Text style={styles.confirmBtnText}>완료</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// -----------------------------------------------------------------
// Stylesheet
// -----------------------------------------------------------------
const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  gameContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FAF8F3', // Warm cozy canvas
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: '#F5F0E8',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: { elevation: 10 },
      web: { boxShadow: '0 10px 25px rgba(0,0,0,0.2)' },
    }),
  },

  // 1. Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F5F0E8',
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C1917',
  },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF5F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE8E0',
  },
  rewardPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6B47',
  },

  // 2. Ready State
  readyContainer: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  readyHeroCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F5F0E8',
    marginBottom: 18,
  },
  readyAvatarRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#FFF5F2',
    borderWidth: 2,
    borderColor: '#FFE8E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  readyPetImg: {
    width: 66,
    height: 66,
  },
  readyPetEmoji: {
    fontSize: 42,
  },
  readyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1C1917',
    marginBottom: 6,
  },
  readyDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  readyStatsBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F3',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F5F0E8',
    width: '100%',
    justifyContent: 'space-around',
  },
  readyBadgeItem: {
    alignItems: 'center',
  },
  readyBadgeNum: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1917',
  },
  readyBadgeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#A8A29E',
    marginTop: 2,
  },
  readyBadgeDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#F5F0E8',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF6B47',
    width: '100%',
    height: 50,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#FF6B47',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
      web: { boxShadow: '0 4px 12px rgba(255,107,71,0.35)' },
    }),
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // 3. Playing HUD
  playingContainer: {
    alignItems: 'center',
  },
  hudRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#F5F0E8',
    width: '100%',
    marginBottom: 10,
  },
  hudItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  hudItemCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  hudText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78716C',
  },
  hudTextHighlight: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1C1917',
  },
  comboBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EA580C',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  comboText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // 4. Table Container (3 rows x 6 columns)
  tableContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 6,
    marginVertical: 8,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: 5,
  },
  cardWrapper: {
    position: 'relative',
  },
  cardTouchArea: {
    width: '100%',
    height: '100%',
  },
  cardFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 5px rgba(0,0,0,0.06)', cursor: 'pointer', userSelect: 'none' },
    }),
  },

  // Card Front (Open)
  cardFront: {
    padding: 2,
  },
  heroCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCardPetImg: {
    width: 30,
    height: 30,
  },
  heroCardEmoji: {
    fontSize: 22,
  },
  heroCardLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#FF6B47',
    marginTop: 1,
  },
  standardCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmojiText: {
    fontSize: 20,
  },
  cardNameText: {
    fontSize: 8.5,
    fontWeight: '700',
    marginTop: 1,
  },
  matchedCheckBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Card Back (Closed)
  cardBack: {
    backgroundColor: '#FFF5F2',
    borderWidth: 1.2,
    borderColor: '#FFE8E0',
  },
  cardBackInner: {
    width: '84%',
    height: '84%',
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBackPetSilhouette: {
    width: 20,
    height: 20,
    opacity: 0.85,
  },
  cardBackMiniDot: {
    position: 'absolute',
    bottom: 2,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FED7AA',
  },

  // Bottom Companion Bar
  bottomCompanionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#F5F0E8',
    width: '100%',
    marginTop: 10,
    gap: 10,
  },
  bottomPetBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF5F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomPetImg: {
    width: 28,
    height: 28,
  },
  bottomPetEmoji: {
    fontSize: 20,
  },
  speechBubble: {
    flex: 1,
  },
  speechBubbleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78716C',
  },

  // Toast
  toastContainer: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 100,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6 },
      android: { elevation: 6 },
      web: { boxShadow: '0 4px 10px rgba(0,0,0,0.15)' },
    }),
  },
  toastText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // 5. Game Over / Clear Screen
  gameOverContainer: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  gameOverCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F5F0E8',
    marginBottom: 14,
  },
  rankBadgeCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  rankBadgeText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  gameOverTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C1917',
    marginBottom: 4,
  },
  gameOverSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716C',
    textAlign: 'center',
    marginBottom: 14,
  },
  resultStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F3',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#F5F0E8',
    width: '100%',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  resultStatBox: {
    alignItems: 'center',
  },
  resultStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#A8A29E',
    marginBottom: 2,
  },
  resultStatVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1917',
  },
  resultStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#F5F0E8',
  },
  resultRewardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF5F2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE8E0',
    width: '100%',
    justifyContent: 'center',
    marginBottom: 12,
  },
  resultRewardText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF6B47',
  },
  resultPetCelebration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultPetImg: {
    width: 32,
    height: 32,
  },
  resultPetEmoji: {
    fontSize: 24,
  },
  resultPetCheerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78716C',
  },

  // Game Over Action Buttons
  gameOverBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  retryBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1,
    borderColor: '#F5F0E8',
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78716C',
  },
  confirmBtn: {
    flex: 1.4,
    height: 48,
    backgroundColor: '#FF6B47',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
