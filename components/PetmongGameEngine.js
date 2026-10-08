import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
  Platform,
  Image,
  Modal,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import {
  Heart,
  Sparkles,
  Sun,
  Moon,
  MessageCircle,
  BookOpen,
  PawPrint,
  Lightbulb,
  ChevronRight,
  Mail,
  Smile,
  Flame,
} from 'lucide-react-native';
import { getEvolutionStage, getEvolvedEmoji } from '../lib/petmongEvolution';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

// -------------------------------------------------------------
// Vector Decorative Components
// -------------------------------------------------------------
function WarmthFruitIcon({ size = 32 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Circle cx="16" cy="16" r="14" fill="#FFE4E8" stroke="#FF7E82" strokeWidth={2} />
      <Path
        d="M16 22C16 22 9 17.5 9 13C9 10.5 11 8.5 13.5 8.5C14.8 8.5 15.6 9.2 16 9.8C16.4 9.2 17.2 8.5 18.5 8.5C21 8.5 23 10.5 23 13C23 17.5 16 22 16 22Z"
        fill="#FF4D6D"
      />
      <Circle cx="13" cy="11" r="1" fill="#FFFFFF" opacity={0.8} />
    </Svg>
  );
}

export default function PetmongGameEngine({
  character,
  owner,
  isVisiting = false,
  visitorCharacter = null,
  theme = 'cottage',
  insets = { top: 0, bottom: 0 },
  vitals = { hunger: 80, happiness: 85, cleanliness: 90, energy: 95 },
  onUpdateVitals,
  onGainExp,
  onAwardPoints,
  dailyCareCount = 0,
  maxDailyCare = 2,
  onCareAction,
  transparentUrl = null,
  onOpenGrowthBook = null,
  unreadWhispers = [],
  onOpenWhisper = null,
  onOpenWriteWhisper = null,
  messages = [],
  smallTalkState = {},
}) {
  // -------------------------------------------------------------
  // 1. 가족 대화 흡수 & 온기 지수 (Sumone Family Warmth Analysis)
  // -------------------------------------------------------------
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const todayMessages = useMemo(() => {
    return (messages || []).filter(m => {
      const t = new Date(m.created_at || m.timestamp || Date.now()).getTime();
      return t >= todayStart;
    });
  }, [messages, todayStart]);

  const todayResponsesCount = useMemo(() => {
    const responses = smallTalkState?.responses || {};
    return Object.keys(responses).length;
  }, [smallTalkState]);

  // 가족 온기 지수 (0% ~ 100%)
  const familyWarmth = useMemo(() => {
    const chatScore = Math.min(60, todayMessages.length * 10);
    const smallTalkScore = Math.min(40, todayResponsesCount * 20);
    return Math.min(100, Math.max(20, chatScore + smallTalkScore));
  }, [todayMessages.length, todayResponsesCount]);

  // 대화 온기 열매 수확 상태
  const [hasHarvestedToday, setHasHarvestedToday] = useState(false);
  const canHarvestFruit = !hasHarvestedToday && (todayMessages.length > 0 || todayResponsesCount > 0);

  // -------------------------------------------------------------
  // 2. State & Animation References (스마트폰 실제 시간대 자동 연동)
  // -------------------------------------------------------------
  const checkIsNightTime = useCallback(() => {
    const currentHour = new Date().getHours();
    // 밤 10시(22:00)부터 아침 7시(07:00)까지는 자동 소등 & 꿀잠 시간
    return currentHour >= 22 || currentHour < 7;
  }, []);

  const [isNightMode, setIsNightMode] = useState(checkIsNightTime);
  const isLightsOff = isNightMode;
  const [showWarmthModal, setShowWarmthModal] = useState(false);
  const [livingRoutine, setLivingRoutine] = useState(checkIsNightTime() ? 'napping' : 'happy');

  const [dialogue, setDialogue] = useState(
    unreadWhispers && unreadWhispers.length > 0
      ? '쉿! 저한테 몰래 맡겨진 비밀 귓속말이 있어요! 💌'
      : (checkIsNightTime()
          ? '새근새근... 조용한 밤이에요. 몽이도 좋은 꿈 꾸고 있어요 zZ 🌙'
          : '가족들의 따뜻한 대화와 사랑을 먹고 자라는 중이에요 몽 💕')
  );

  const [floatingHearts, setFloatingHearts] = useState([]); // [{ id, x, text }]

  // Main Pet Animations
  const INITIAL_PET_X = Math.round(SCREEN_WIDTH * 0.5 - 70);
  const petPosX = useRef(new Animated.Value(INITIAL_PET_X)).current;
  const petScaleX = useRef(new Animated.Value(1)).current;
  const petScaleY = useRef(new Animated.Value(1)).current;
  const petHopY = useRef(new Animated.Value(0)).current;
  const petRotate = useRef(new Animated.Value(0)).current;

  // Fruit & Whisper Bobbing
  const whisperBobAnim = useRef(new Animated.Value(0)).current;
  const fruitFloatAnim = useRef(new Animated.Value(0)).current;
  const lightsDimAnim = useRef(new Animated.Value(checkIsNightTime() ? 1 : 0)).current;
  const lastActionTimeRef = useRef(0);

  // Visitor Pet Animations
  const visitorPosX = useRef(new Animated.Value(Math.round(SCREEN_WIDTH * 0.16))).current;
  const visitorHopY = useRef(new Animated.Value(0)).current;
  const visitorScaleX = useRef(new Animated.Value(1)).current;

  const currentPetXRef = useRef(INITIAL_PET_X);
  useEffect(() => {
    const id = petPosX.addListener(({ value }) => {
      currentPetXRef.current = value;
    });
    return () => petPosX.removeListener(id);
  }, [petPosX]);

  // -------------------------------------------------------------
  // 3. Loops: Whisper & Fruit Floating Bob
  // -------------------------------------------------------------
  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(fruitFloatAnim, { toValue: -8, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(fruitFloatAnim, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE_DRIVER }),
      ])
    );
    floatLoop.start();
    return () => floatLoop.stop();
  }, [fruitFloatAnim]);

  useEffect(() => {
    if (unreadWhispers && unreadWhispers.length > 0) {
      setDialogue('쉿! 저한테 몰래 맡겨진 비밀 귓속말이 있어요! 💌');
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(whisperBobAnim, { toValue: -6, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(whisperBobAnim, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE_DRIVER }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [unreadWhispers, whisperBobAnim]);

  // -------------------------------------------------------------
  // 4. Idle Breathing Animation
  // -------------------------------------------------------------
  useEffect(() => {
    if (isLightsOff || livingRoutine === 'napping') {
      const sleepLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(petScaleY, { toValue: 0.88, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(petScaleY, { toValue: 0.96, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE_DRIVER }),
        ])
      );
      sleepLoop.start();
      return () => sleepLoop.stop();
    }

    const idleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(petScaleY, { toValue: 1.04, duration: 850, easing: Easing.inOut(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(petScaleY, { toValue: 0.98, duration: 850, easing: Easing.inOut(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
      ])
    );
    idleLoop.start();
    return () => idleLoop.stop();
  }, [isLightsOff, livingRoutine, petScaleY]);

  // Helper: Walk to Target with Hop and Flip
  const walkToPosition = useCallback((targetX, onFinish, speedMultiplier = 1) => {
    const startX = currentPetXRef.current;
    const distance = Math.abs(targetX - startX);
    if (distance < 10) {
      if (onFinish) onFinish();
      return;
    }

    Animated.timing(petScaleX, {
      toValue: targetX > startX ? 1 : -1,
      duration: 120,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();

    const duration = Math.max(700, Math.min(2400, (distance / 0.19) / speedMultiplier));
    const hopCycles = Math.max(2, Math.floor(duration / 260));
    const hopSeq = [];
    for (let i = 0; i < hopCycles; i++) {
      hopSeq.push(
        Animated.timing(petHopY, { toValue: -12, duration: 130, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(petHopY, { toValue: 0, duration: 130, easing: Easing.in(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER })
      );
    }
    Animated.sequence(hopSeq).start();

    Animated.timing(petPosX, {
      toValue: targetX,
      duration,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start(({ finished }) => {
      if (finished) {
        petHopY.setValue(0);
        if (onFinish) onFinish();
      }
    });
  }, [petPosX, petScaleX, petHopY]);

  // -------------------------------------------------------------
  // 5. 썸원 스타일 자율 관찰형 루틴 (Living Routines - 20s 주기)
  // -------------------------------------------------------------
  useEffect(() => {
    if (isLightsOff) return;

    const routines = ['reading', 'photo', 'window', 'napping', 'happy'];
    const routineInterval = setInterval(() => {
      if (isLightsOff) return;

      const nextRoutine = routines[Math.floor(Math.random() * routines.length)];
      setLivingRoutine(nextRoutine);

      // 위치 이동
      let targetX = INITIAL_PET_X;
      if (nextRoutine === 'window') {
        targetX = Math.round(SCREEN_WIDTH * 0.18);
      } else if (nextRoutine === 'photo') {
        targetX = Math.round(SCREEN_WIDTH * 0.65);
      } else if (nextRoutine === 'reading') {
        targetX = Math.round(SCREEN_WIDTH * 0.38);
      } else if (nextRoutine === 'napping') {
        targetX = Math.round(SCREEN_WIDTH * 0.5 - 70);
      }

      walkToPosition(targetX, () => {
        if (nextRoutine === 'reading') {
          setDialogue('가족들이 남긴 소중한 말들을 몽이 비밀 일기장에 적는 중이에요 몽 ✍️');
        } else if (nextRoutine === 'photo') {
          setDialogue('가족들과 함께 찍은 사진을 보면 가슴이 뭉클하고 따뜻해져요 💕');
        } else if (nextRoutine === 'window') {
          setDialogue('창밖 햇살이 너무 포근해요! 오늘도 우리 가족 모두 좋은 하루 되길 ☀️');
        } else if (nextRoutine === 'napping') {
          setDialogue('새근새근... 가족들과 다 함께 소풍 가는 꿈을 꾸고 있어요 zZ');
        } else {
          setDialogue('가족들과 함께 있는 이 거실이 세상에서 제일 따뜻해요 ☕');
        }
      });
    }, 20000);

    return () => clearInterval(routineInterval);
  }, [isLightsOff, walkToPosition, INITIAL_PET_X]);

  // -------------------------------------------------------------
  // 6. Particle Emitter (하트 토스트)
  // -------------------------------------------------------------
  const spawnHeartToast = (text = '+EXP') => {
    const id = `heart_${Date.now()}_${Math.random()}`;
    const x = Math.max(20, Math.min(SCREEN_WIDTH - 80, currentPetXRef.current + 70 + (Math.random() * 40 - 20)));
    setFloatingHearts(prev => [...prev, { id, x, text }]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== id));
    }, 1400);
  };

  // -------------------------------------------------------------
  // 7. 대화 온기 수확 (Harvest Conversation Fruit)
  // -------------------------------------------------------------
  const handleHarvestWarmth = () => {
    if (hasHarvestedToday) {
      spawnHeartToast('오늘 대화 온기를 이미 수확했어요! 💖');
      return;
    }
    if (!canHarvestFruit) {
      spawnHeartToast('아직 오늘 나눈 대화가 없어요! 💬');
      setDialogue('가족들이 단톡방이나 스몰톡에서 대화를 나누면 달콤한 대화 열매가 열려요 몽! 🌟');
      return;
    }

    setHasHarvestedToday(true);
    const expGain = 30;

    if (onGainExp) onGainExp(expGain);
    if (onUpdateVitals) {
      onUpdateVitals(prev => ({
        ...prev,
        happiness: 100,
        energy: 100,
      }));
    }

    spawnHeartToast(`+${expGain} EXP 대화 온기 수확! 💖`);
    setDialogue(`오늘 가족들이 나눈 ${todayMessages.length}개의 대화와 스몰톡 온기를 듬뿍 먹고 쑥쑥 자랐어요! 몽글몽글 사랑해요 몽 💕✨`);

    Animated.sequence([
      Animated.timing(petHopY, { toValue: -28, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(petHopY, { toValue: 0, duration: 200, easing: Easing.bounce, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();
  };

  // -------------------------------------------------------------
  // 8. 🌙 실시간 스마트폰 시계 연동 (낮/밤 자동 전환 & 토닥토닥 교감)
  // -------------------------------------------------------------
  useEffect(() => {
    const syncTimeRoutine = () => {
      const night = checkIsNightTime();
      if (night !== isNightMode) {
        setIsNightMode(night);
        Animated.timing(lightsDimAnim, {
          toValue: night ? 1 : 0,
          duration: 900,
          useNativeDriver: USE_NATIVE_DRIVER,
        }).start();

        if (night) {
          setDialogue('하아암~ 밤 10시가 지나 방이 은은하게 소등되었어요... 쿨쿨 zZ 🌙');
          walkToPosition(Math.round(SCREEN_WIDTH * 0.35), () => {
            setLivingRoutine('napping');
          }, 0.8);
          if (onCareAction) onCareAction('SLEEP');
        } else {
          setLivingRoutine('happy');
          setDialogue('좋은 아침이에요! 상쾌한 아침 햇살을 받으며 일어났어요 몽 ☀️');
          if (onCareAction) onCareAction('WAKE');
        }
      }
    };

    // 30초마다 현재 시간 검사하여 실시간 전환
    const timer = setInterval(syncTimeRoutine, 30000);
    return () => clearInterval(timer);
  }, [checkIsNightTime, isNightMode, lightsDimAnim, onCareAction, walkToPosition]);

  // 마운트 시 밤 시간대면 자동으로 침대 위치 수면 모드 세팅
  useEffect(() => {
    if (checkIsNightTime()) {
      setLivingRoutine('napping');
      Animated.timing(lightsDimAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
    }
  }, [checkIsNightTime, lightsDimAnim]);

  // 밤 시간대 토닥토닥 & 낮 시간대 활기찬 터치 교감
  const handleNightComfort = () => {
    const now = Date.now();
    if (now - lastActionTimeRef.current < 600) return;
    lastActionTimeRef.current = now;

    if (isNightMode) {
      setDialogue('토닥토닥... 몽... 밤에도 가족이 곁에 있어줘서 마음이 포근해요 zZ 💕');
      spawnHeartToast('+포근한 밤 🌙');
      Animated.sequence([
        Animated.timing(petHopY, { toValue: -12, duration: 160, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(petHopY, { toValue: 0, duration: 180, useNativeDriver: USE_NATIVE_DRIVER }),
      ]).start();
    } else {
      setDialogue('화창한 낮이에요! 오늘도 우리 가족 모두 좋은 하루 되길 바라요 몽 ☀️');
      spawnHeartToast('+행복 ☀️');
      Animated.sequence([
        Animated.timing(petHopY, { toValue: -20, duration: 160, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(petHopY, { toValue: 0, duration: 180, useNativeDriver: USE_NATIVE_DRIVER }),
      ]).start();
    }
  };

  // -------------------------------------------------------------
  // 9. 반려몽 탭 교감 & 쓰다듬기 (Petting)
  // -------------------------------------------------------------
  const handlePetPress = () => {
    if (unreadWhispers && unreadWhispers.length > 0 && onOpenWhisper) {
      onOpenWhisper(unreadWhispers[0]);
      return;
    }

    // Squish & bounce interaction
    Animated.sequence([
      Animated.timing(petScaleY, { toValue: 0.82, duration: 120, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(petScaleY, { toValue: 1.15, duration: 150, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(petScaleY, { toValue: 1.0, duration: 120, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();

    if (isNightMode) {
      setDialogue('새근새근... 조용한 밤이에요. 가족의 따뜻한 손길에 기분 좋은 꿈을 꿔요 zZ 🌙');
      spawnHeartToast('+3 토닥토닥 💕');
    } else {
      spawnHeartToast('+3 친밀도 💕');
    }
    setShowWarmthModal(true);
  };

  if (!character) return null;

  const stage = getEvolutionStage(character.level || 1, character.name);
  const evolvedEmoji = getEvolvedEmoji(character.level || 1, character.emoji || '🐶');

  return (
    <View style={styles.engineContainer} pointerEvents="box-none">
      {/* 1. Real-time Lights Out Darkness Overlay (밤 10시 ~ 아침 7시 자동 소등) */}
      <Animated.View
        style={[
          styles.lightsOverlay,
          {
            opacity: lightsDimAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.85],
            }),
          },
        ]}
        pointerEvents="none"
      >
        {isNightMode && (
          <View style={styles.nightAmbientHeader}>
            <View style={styles.nightStatusBadge}>
              <Moon size={13} color="#FBBF24" fill="#FBBF24" />
              <Text style={styles.nightStatusBadgeText}>밤 꿀잠 시간 (22:00 ~ 07:00)</Text>
            </View>
          </View>
        )}
      </Animated.View>

      {/* 2. Fullscreen Interactive Room Canvas */}
      <TouchableOpacity
        activeOpacity={1}
        style={styles.roomGameField}
        onPress={() => {
          if (isNightMode) {
            handleNightComfort();
          }
        }}
      >
        {/* Visiting Banner */}
        {isVisiting && (
          <View style={styles.visitingFloatingPill}>
            <Heart size={13} color="#FF4D6D" fill="#FF4D6D" />
            <Text style={styles.visitingPillText}>
              {owner?.name || '가족'} 님의 방 놀러옴 • 소통 선물 가능
            </Text>
          </View>
        )}

        {/* Floating Heart / EXP Particles */}
        {floatingHearts.map((h) => (
          <View key={h.id} style={[styles.floatingHeartBadge, { left: h.x, bottom: 235 }]}>
            <Heart size={15} color="#FF4D6D" fill="#FF4D6D" />
            <Text style={styles.floatingHeartText}>{h.text}</Text>
          </View>
        ))}

        {/* ------------------------------------------------------------- */}
        {/* MAIN PET SPRITE ACTOR */}
        {/* ------------------------------------------------------------- */}
        {character && (
          <Animated.View
            style={[
              styles.petActorContainer,
              {
                transform: [
                  { translateX: petPosX },
                  { translateY: petHopY },
                ],
              },
            ]}
          >
            {/* Secret Whisper Courier Badge */}
            {unreadWhispers && unreadWhispers.length > 0 && (
              <TouchableOpacity
                style={styles.whisperDeliveryBadge}
                onPress={() => onOpenWhisper && onOpenWhisper(unreadWhispers[0])}
                activeOpacity={0.85}
              >
                <Animated.View style={[styles.whisperDeliveryInner, { transform: [{ translateY: whisperBobAnim }] }]}>
                  <View style={styles.whisperLetterPill}>
                    <Text style={{ fontSize: 15, marginRight: 4 }}>💌</Text>
                    <Text style={styles.whisperDeliveryTitle}>비밀 귓속말 ({unreadWhispers.length})</Text>
                  </View>
                  <Text style={styles.whisperDeliveryHint}>탭해서 편지 열기 🤫</Text>
                </Animated.View>
              </TouchableOpacity>
            )}

            {/* Conversation Warmth Fruit Bead (썸원 방식 대화 열매) */}
            {canHarvestFruit && (
              <TouchableOpacity
                style={styles.warmthFruitAnchor}
                onPress={handleHarvestWarmth}
                activeOpacity={0.8}
              >
                <Animated.View style={{ transform: [{ translateY: fruitFloatAnim }] }}>
                  <View style={styles.warmthFruitGlow}>
                    <WarmthFruitIcon size={34} />
                    <View style={styles.warmthFruitPill}>
                      <Sparkles size={10} color="#FF4D6D" fill="#FF4D6D" />
                      <Text style={styles.warmthFruitPillText}>대화 온기</Text>
                    </View>
                  </View>
                </Animated.View>
              </TouchableOpacity>
            )}

            {/* Thought Bubble / Dialogue */}
            <View style={styles.petSpeechBubble}>
              <Text style={styles.petSpeechText}>{dialogue}</Text>
              <View style={styles.petSpeechArrow} />
            </View>

            {/* Stage 4 Guardian Aura */}
            {stage.stage === 4 && <View style={styles.guardianAura} />}

            {/* Pet Sprite Touch Area */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handlePetPress}
              style={styles.petTouchWrapper}
            >
              {/* Pet Stage Badge (Interactive to open Growth Book) */}
              <TouchableOpacity
                style={[styles.stageBadge, { backgroundColor: stage.badgeColor, flexDirection: 'row', alignItems: 'center' }]}
                onPress={() => {
                  if (onOpenGrowthBook) onOpenGrowthBook();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.stageBadgeText}>Lv.{character.level || 1} • {stage.name}</Text>
                <BookOpen size={9} color="#FFFFFF" style={{ marginLeft: 3 }} />
              </TouchableOpacity>

              {/* Character Visual Body */}
              <Animated.View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [
                    { scaleY: petScaleY },
                    {
                      rotate: petRotate.interpolate({
                        inputRange: [-1, 0, 1],
                        outputRange: ['-10deg', '0deg', '10deg'],
                      }),
                    },
                  ],
                }}
              >
                {/* Character Image / Emoji (scaleX only applied here so text badges below are never mirrored) */}
                <Animated.View style={{ transform: [{ scaleX: petScaleX }, { scale: stage.scale }] }}>
                  {character.image_url ? (
                    Platform.OS === 'web' ? (
                      <img
                        src={transparentUrl || character.image_url}
                        alt={character.name}
                        style={{
                          width: 104,
                          height: 104,
                          objectFit: 'contain',
                          mixBlendMode: 'multiply',
                          display: 'block',
                          pointerEvents: 'none',
                          userSelect: 'none',
                        }}
                      />
                    ) : (
                      <Image
                        source={{ uri: transparentUrl || character.image_url }}
                        style={styles.petImageSprite}
                        resizeMode="contain"
                      />
                    )
                  ) : (
                    <Text style={styles.petEmojiSprite}>{evolvedEmoji}</Text>
                  )}
                </Animated.View>

                {/* Ground Contact Shadow */}
                <View style={styles.petGroundShadow} />

                {/* Autonomous Routine Indicator Badges */}
                {livingRoutine === 'reading' && (
                  <View style={[styles.routinePill, { backgroundColor: '#EDE9FE', borderColor: '#C4B5FD' }]}>
                    <Text style={styles.routineEmoji}>📖</Text>
                    <Text style={[styles.routineText, { color: '#6D28D9' }]}>일기 쓰는 중</Text>
                  </View>
                )}
                {livingRoutine === 'photo' && (
                  <View style={[styles.routinePill, { backgroundColor: '#FCE7F3', borderColor: '#FBCFE8' }]}>
                    <Text style={styles.routineEmoji}>🖼️</Text>
                    <Text style={[styles.routineText, { color: '#BE185D' }]}>가족 사진 감상</Text>
                  </View>
                )}
                {livingRoutine === 'window' && (
                  <View style={[styles.routinePill, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                    <Text style={styles.routineEmoji}>🪟</Text>
                    <Text style={[styles.routineText, { color: '#B45309' }]}>창밖 구경</Text>
                  </View>
                )}
                {livingRoutine === 'napping' && (
                  <View style={[styles.routinePill, { backgroundColor: '#E0E7FF', borderColor: '#C7D2FE' }]}>
                    <Text style={styles.routineEmoji}>💤</Text>
                    <Text style={[styles.routineText, { color: '#4338CA' }]}>쿨쿨 낮잠</Text>
                  </View>
                )}
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Visitor Pet Companion */}
        {isVisiting && visitorCharacter && (
          <Animated.View
            style={[
              styles.visitorPetContainer,
              {
                transform: [
                  { translateX: visitorPosX },
                  { translateY: visitorHopY },
                ],
              },
            ]}
          >
            <View style={[styles.visitorBadge, { flexDirection: 'row', alignItems: 'center' }]}>
              <PawPrint size={11} color="#4F46E5" fill="#4F46E5" style={{ marginRight: 4 }} />
              <Text style={styles.visitorBadgeText}>내 반려몽 놀러옴</Text>
            </View>
            <Animated.View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ scaleX: visitorScaleX }],
              }}
            >
              <Text style={styles.visitorEmoji}>{visitorCharacter.emoji || '🐶'}</Text>
              <View style={styles.petGroundShadow} />
            </Animated.View>
          </Animated.View>
        )}
      </TouchableOpacity>

      {/* ------------------------------------------------------------- */}
      {/* 3. SUMONE-STYLE FLOATING HUB BAR (가족 온기 수확 & 소등 & 귓속말) */}
      {/* ------------------------------------------------------------- */}
      <View style={styles.floatingWarmthBar} pointerEvents="box-none">
        {/* 1. 대화 온기 수확 버튼 */}
        <TouchableOpacity
          style={[
            styles.warmthActionBtn,
            canHarvestFruit && styles.warmthActionBtnActive,
          ]}
          onPress={handleHarvestWarmth}
          activeOpacity={0.8}
        >
          <WarmthFruitIcon size={24} />
          <View>
            <Text style={styles.warmthActionBtnLabel}>가족 온기</Text>
            <Text style={styles.warmthActionBtnVal}>{familyWarmth}%</Text>
          </View>
        </TouchableOpacity>

        {/* 2. 실시간 스마트폰 시간대 (밤 꿀잠 모드 / 낮 활동 모드) 인디케이터 */}
        <TouchableOpacity
          style={[
            styles.warmthActionBtn,
            isNightMode && styles.warmthActionBtnDark,
          ]}
          onPress={handleNightComfort}
          activeOpacity={0.8}
        >
          {isNightMode ? (
            <Moon size={20} color="#818CF8" fill="#818CF8" />
          ) : (
            <Sun size={20} color="#F59E0B" fill="#F59E0B" />
          )}
          <View>
            <Text style={[styles.warmthActionBtnLabel, isNightMode && { color: '#E2E8F0' }]}>
              {isNightMode ? '밤 꿀잠' : '낮 활동'}
            </Text>
            <Text style={[styles.warmthActionBtnVal, isNightMode && { color: '#FBBF24' }]}>
              {isNightMode ? '토닥토닥' : '활기참'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* 3. 비밀 귓속말 남기기 버튼 */}
        {onOpenWriteWhisper && (
          <TouchableOpacity
            style={styles.warmthActionBtn}
            onPress={onOpenWriteWhisper}
            activeOpacity={0.8}
          >
            <Mail size={20} color="#EC4899" />
            <View>
              <Text style={styles.warmthActionBtnLabel}>비밀 귓속말</Text>
              <Text style={[styles.warmthActionBtnVal, { color: '#EC4899' }]}>편지 쓰기</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* ------------------------------------------------------------- */}
      {/* 4. 가족 온기 & 대화 성장 상세 모달 (썸원 스타일)               */}
      {/* ------------------------------------------------------------- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showWarmthModal}
        onRequestClose={() => setShowWarmthModal(false)}
      >
        <TouchableOpacity
          style={styles.warmthModalBackdrop}
          activeOpacity={1}
          onPress={() => setShowWarmthModal(false)}
        >
          <View style={styles.warmthModalCard}>
            <View style={styles.warmthModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Heart size={20} color="#FF4D6D" fill="#FF4D6D" />
                <Text style={styles.warmthModalTitle}>우리 가족 대화 온기</Text>
              </View>
              <TouchableOpacity onPress={() => setShowWarmthModal(false)}>
                <Text style={styles.warmthModalClose}>닫기</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.warmthModalSubtitle}>
              {character.name}은(는) 가족들의 다정한 대화와 스몰톡을 먹고 자라요 🌱
            </Text>

            {/* 온기 프로그레스 게이지 */}
            <View style={styles.warmthProgressCard}>
              <View style={styles.warmthProgressTop}>
                <Text style={styles.warmthScoreTitle}>오늘의 가족 온기 지수</Text>
                <Text style={styles.warmthScoreValue}>{familyWarmth}%</Text>
              </View>
              <View style={styles.warmthProgressBarBg}>
                <View style={[styles.warmthProgressBarFill, { width: `${familyWarmth}%` }]} />
              </View>
              <Text style={styles.warmthProgressDesc}>
                {familyWarmth >= 80
                  ? '💖 온기가 가득 차서 반려몽이 무척 행복해해요!'
                  : familyWarmth >= 50
                  ? '☕ 훈훈한 대화가 오가며 무럭무럭 자라는 중이에요.'
                  : '💌 가족들의 안부와 대화가 더 필요해요!'}
              </Text>
            </View>

            {/* 오늘 소통 활동 스탯 */}
            <View style={styles.warmthStatsGrid}>
              <View style={styles.warmthStatBox}>
                <MessageCircle size={20} color="#2563EB" />
                <Text style={styles.warmthStatNum}>{todayMessages.length}개</Text>
                <Text style={styles.warmthStatLabel}>오늘 나눈 대화</Text>
              </View>

              <View style={styles.warmthStatBox}>
                <Smile size={20} color="#16A34A" />
                <Text style={styles.warmthStatNum}>{todayResponsesCount}명</Text>
                <Text style={styles.warmthStatLabel}>스몰톡 답변 가족</Text>
              </View>

              <View style={styles.warmthStatBox}>
                <Flame size={20} color="#EA580C" />
                <Text style={styles.warmthStatNum}>Lv.{character.level || 1}</Text>
                <Text style={styles.warmthStatLabel}>수호 성장 단계</Text>
              </View>
            </View>

            {/* 빠른 액션 버튼들 */}
            <View style={styles.warmthActionGrid}>
              {onOpenGrowthBook && (
                <TouchableOpacity
                  style={styles.warmthSubActionBtn}
                  onPress={() => {
                    setShowWarmthModal(false);
                    onOpenGrowthBook();
                  }}
                  activeOpacity={0.8}
                >
                  <BookOpen size={16} color="#4F46E5" />
                  <Text style={styles.warmthSubActionBtnText}>4단계 성장 도감</Text>
                  <ChevronRight size={14} color="#A5B4FC" />
                </TouchableOpacity>
              )}

              {onOpenWriteWhisper && (
                <TouchableOpacity
                  style={styles.warmthSubActionBtn}
                  onPress={() => {
                    setShowWarmthModal(false);
                    onOpenWriteWhisper();
                  }}
                  activeOpacity={0.8}
                >
                  <Mail size={16} color="#EC4899" />
                  <Text style={styles.warmthSubActionBtnText}>비밀 귓속말 맡기기</Text>
                  <ChevronRight size={14} color="#FBCFE8" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// -------------------------------------------------------------
// Stylesheet
// -------------------------------------------------------------
const styles = StyleSheet.create({
  engineContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  lightsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#0F172A',
    zIndex: 40,
  },
  nightAmbientHeader: {
    position: 'absolute',
    top: 55,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  nightStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.45)',
    gap: 6,
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  nightStatusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FEF08A',
    letterSpacing: 0.3,
  },
  roomGameField: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 30,
  },
  visitingFloatingPill: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFD4D7',
    shadowColor: '#FF7E82',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    gap: 6,
    zIndex: 32,
  },
  visitingPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  floatingHeartBadge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F3',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFCCD4',
    zIndex: 50,
    gap: 4,
  },
  floatingHeartText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF4D6D',
  },
  petActorContainer: {
    position: 'absolute',
    bottom: 110,
    left: 0,
    width: 140,
    alignItems: 'center',
    zIndex: 35,
  },
  petTouchWrapper: {
    alignItems: 'center',
  },
  petSpeechBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFE4E8',
    marginBottom: 8,
    maxWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  petSpeechText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 16,
  },
  petSpeechArrow: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -5,
    width: 10,
    height: 6,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFE4E8',
  },
  stageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  stageBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  petEmojiSprite: {
    fontSize: 78,
  },
  petImageSprite: {
    width: 104,
    height: 104,
  },
  petGroundShadow: {
    width: 68,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    marginTop: -4,
  },
  guardianAura: {
    position: 'absolute',
    top: 40,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(251, 191, 36, 0.25)',
    borderWidth: 2,
    borderColor: 'rgba(251, 191, 36, 0.45)',
    zIndex: -1,
  },
  // Routine indicator pill
  routinePill: {
    position: 'absolute',
    bottom: -16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  routineEmoji: {
    fontSize: 10,
  },
  routineText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  // Warmth Fruit Bead
  warmthFruitAnchor: {
    position: 'absolute',
    top: -46,
    right: -24,
    zIndex: 50,
  },
  warmthFruitGlow: {
    alignItems: 'center',
  },
  warmthFruitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD4D7',
    marginTop: 2,
    gap: 2,
    shadowColor: '#FF4D6D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  warmthFruitPillText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#FF4D6D',
  },
  // Whisper Badge
  whisperDeliveryBadge: {
    position: 'absolute',
    top: -55,
    zIndex: 60,
  },
  whisperDeliveryInner: {
    alignItems: 'center',
  },
  whisperLetterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FCD34D',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  whisperDeliveryTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  whisperDeliveryHint: {
    fontSize: 9,
    fontWeight: '700',
    color: '#B45309',
    marginTop: 2,
  },
  // Visitor Pet
  visitorPetContainer: {
    position: 'absolute',
    bottom: 110,
    alignItems: 'center',
    zIndex: 34,
  },
  visitorBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 4,
  },
  visitorBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#4338CA',
  },
  visitorEmoji: {
    fontSize: 54,
  },
  // Floating Warmth Bar
  floatingWarmthBar: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    zIndex: 999,
  },
  warmthActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#FFE4E8',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  warmthActionBtnActive: {
    backgroundColor: '#FFF0F3',
    borderColor: '#FF7E82',
    borderWidth: 2,
  },
  warmthActionBtnDark: {
    backgroundColor: '#1E293B',
    borderColor: '#475569',
  },
  warmthActionBtnLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E93',
  },
  warmthActionBtnVal: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1C1917',
  },
  // Warmth Modal Card
  warmthModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  warmthModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  warmthModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  warmthModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C1917',
  },
  warmthModalClose: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8E8E93',
  },
  warmthModalSubtitle: {
    fontSize: 12.5,
    color: '#78716C',
    lineHeight: 18,
    marginBottom: 16,
  },
  warmthProgressCard: {
    backgroundColor: '#FFF8F6',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFE4DF',
    marginBottom: 16,
  },
  warmthProgressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  warmthScoreTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#44403C',
  },
  warmthScoreValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FF4D6D',
  },
  warmthProgressBarBg: {
    height: 10,
    backgroundColor: '#F5EBE6',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  warmthProgressBarFill: {
    height: '100%',
    backgroundColor: '#FF4D6D',
    borderRadius: 5,
  },
  warmthProgressDesc: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#78716C',
  },
  warmthStatsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  warmthStatBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  warmthStatNum: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E293B',
  },
  warmthStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
  },
  warmthActionGrid: {
    gap: 8,
  },
  warmthSubActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  warmthSubActionBtnText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginLeft: 8,
  },
});
