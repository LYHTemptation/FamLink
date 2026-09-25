import React, { useState, useRef, useEffect, useCallback } from 'react';
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
} from 'react-native';
import {
  Heart,
  Sparkles,
  Sun,
  Moon,
  Smile,
  Zap,
  Droplets,
  X,
  ChevronUp,
  Flame,
} from 'lucide-react-native';
import { getEvolutionStage, getEvolvedEmoji } from '../lib/petmongEvolution';
import SnackCatchGame from './minigames/SnackCatchGame';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

// 4 Delightful Snack Items
const FOOD_MENU = [
  { id: 'kibble', name: '영양 사료', emoji: '🥫', hunger: 30, happiness: 10, exp: 4, desc: '바삭바삭 든든한 한 끼' },
  { id: 'strawberry', name: '달콤 딸기', emoji: '🍓', hunger: 15, happiness: 25, exp: 5, desc: '비타민 듬뿍 새콤달콤' },
  { id: 'meat', name: '황금 고기', emoji: '🍖', hunger: 40, happiness: 30, exp: 8, desc: '반려몽 최애 특식' },
  { id: 'fish', name: '싱싱 생선', emoji: '🐟', hunger: 25, happiness: 35, exp: 7, desc: '고소하고 부드러운 맛' },
];

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
}) {
  // Tool & Menu States
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Radial Care Hub open/closed
  const [activeTool, setActiveTool] = useState('none'); // 'none' | 'feed' | 'bath'
  const [isLightsOff, setIsLightsOff] = useState(false);
  const [showConditionPopup, setShowConditionPopup] = useState(false);
  const [isSnackGameVisible, setIsSnackGameVisible] = useState(false);

  // Pet Action State: 'idle' | 'walking' | 'eating' | 'playing' | 'bathing' | 'sleeping' | 'happy'
  const [petAction, setPetAction] = useState('idle');
  const [dialogue, setDialogue] = useState('안녕 몽! 오늘 나랑 신나게 놀아줄 거지? 🐾');

  // Physics Objects
  const [droppedFood, setDroppedFood] = useState(null); // { x, y, emoji, id }
  const [ballActive, setBallActive] = useState(false);
  const [soapBubbles, setSoapBubbles] = useState([]); // [{ id, x, y }]
  const [floatingHearts, setFloatingHearts] = useState([]); // [{ id, x, y, text }]

  // Main Pet Animations
  const INITIAL_PET_X = Math.round(SCREEN_WIDTH * 0.5 - 70);
  const petPosX = useRef(new Animated.Value(INITIAL_PET_X)).current; // Center-floor X
  const petScaleX = useRef(new Animated.Value(1)).current; // 1 = right, -1 = left
  const petScaleY = useRef(new Animated.Value(1)).current; // Squash & stretch
  const petHopY = useRef(new Animated.Value(0)).current; // Vertical hop / jump
  const petRotate = useRef(new Animated.Value(0)).current; // Wiggle rotation

  // Visitor Pet Animations
  const visitorPosX = useRef(new Animated.Value(Math.round(SCREEN_WIDTH * 0.16))).current;
  const visitorHopY = useRef(new Animated.Value(0)).current;
  const visitorScaleX = useRef(new Animated.Value(1)).current;

  // Ball Animations
  const ballAnimX = useRef(new Animated.Value(Math.round(SCREEN_WIDTH * 0.72))).current;
  const ballAnimY = useRef(new Animated.Value(0)).current;
  const ballScale = useRef(new Animated.Value(1)).current;

  // Lights Dimming Animation
  const lightsDimAnim = useRef(new Animated.Value(0)).current;

  // Radial Menu Spring Animation
  const menuAnim = useRef(new Animated.Value(0)).current;

  // Track current pet position
  const currentPetXRef = useRef(INITIAL_PET_X);
  useEffect(() => {
    const id = petPosX.addListener(({ value }) => {
      currentPetXRef.current = value;
    });
    return () => petPosX.removeListener(id);
  }, [petPosX]);

  // Toggle Radial Menu
  const toggleMenu = () => {
    const nextState = !isMenuOpen;
    setIsMenuOpen(nextState);
    if (!nextState) setActiveTool('none');

    Animated.spring(menuAnim, {
      toValue: nextState ? 1 : 0,
      friction: 6,
      tension: 65,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  };

  // 1. Idle Breathing (Squash & Stretch)
  useEffect(() => {
    if (petAction === 'sleeping') {
      const sleepLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(petScaleY, { toValue: 0.88, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(petScaleY, { toValue: 0.95, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE_DRIVER }),
        ])
      );
      sleepLoop.start();
      return () => sleepLoop.stop();
    }

    if (petAction === 'idle') {
      const idleLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(petScaleY, { toValue: 1.05, duration: 850, easing: Easing.inOut(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(petScaleY, { toValue: 0.97, duration: 850, easing: Easing.inOut(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
        ])
      );
      idleLoop.start();
      return () => idleLoop.stop();
    }
  }, [petAction, petScaleY]);

  // 2. Autonomous Gentle Wandering (Every 12s)
  useEffect(() => {
    if (petAction !== 'idle' || isLightsOff) return;

    const wanderInterval = setInterval(() => {
      if (petAction !== 'idle' || isLightsOff) return;
      const targetX = Math.round(Math.max(16, Math.min(SCREEN_WIDTH - 156, SCREEN_WIDTH * (0.15 + Math.random() * 0.55) - 70)));
      walkToPosition(targetX, () => {
        const cuteQuotes = [
          '킁킁~ 방에서 포근한 냄새가 나요! 🌸',
          '기지개 쭈우욱~ 개운하다 몽! ✨',
          '가족들과 함께 있는 이 방이 제일 따뜻해 💕',
          '심심한데 공놀이 한 판 어때요? ⚽',
          '배가 살짝 꼬르륵하는 것 같기도... 🍓',
        ];
        setDialogue(cuteQuotes[Math.floor(Math.random() * cuteQuotes.length)]);
      });
    }, 13000);

    return () => clearInterval(wanderInterval);
  }, [petAction, isLightsOff]);

  // Helper: Walk to Target with Hop and Flip
  const walkToPosition = useCallback((targetX, onFinish, speedMultiplier = 1) => {
    const startX = currentPetXRef.current;
    const distance = Math.abs(targetX - startX);
    if (distance < 10) {
      if (onFinish) onFinish();
      return;
    }

    setPetAction('walking');

    // Direction facing
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
        setPetAction('idle');
        if (onFinish) onFinish();
      }
    });
  }, [petPosX, petScaleX, petHopY]);

  // Particle Emitter
  const spawnHeartToast = (text = '+EXP') => {
    const id = `heart_${Date.now()}_${Math.random()}`;
    const x = Math.max(20, Math.min(SCREEN_WIDTH - 80, currentPetXRef.current + 70 + (Math.random() * 40 - 20)));
    setFloatingHearts(prev => [...prev, { id, x, text }]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== id));
    }, 1400);
  };

  // -------------------------------------------------------------
  // ACTION 1: 🍖 Feed Food
  // -------------------------------------------------------------
  const handleDropFood = (foodItem, customX = null) => {
    if (petAction === 'eating' || isLightsOff) return;

    const dropX = customX 
      ? Math.round(Math.max(16, Math.min(SCREEN_WIDTH - 156, customX - 70)))
      : Math.round(Math.max(16, Math.min(SCREEN_WIDTH - 156, SCREEN_WIDTH * (0.2 + Math.random() * 0.45) - 70)));

    setDroppedFood({ ...foodItem, x: dropX + 70 });
    setPetAction('walking');
    setDialogue(`우와! ${foodItem.name}이다! 냠냠 먹으러 가자~ 💨`);
    setActiveTool('none');
    if (isMenuOpen) toggleMenu();

    walkToPosition(dropX, () => {
      setPetAction('eating');
      setDialogue('오물오물 와구와구! 정말 맛있다 몽! 😋✨');

      Animated.sequence([
        Animated.timing(petScaleY, { toValue: 0.82, duration: 160, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(petScaleY, { toValue: 1.15, duration: 160, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(petScaleY, { toValue: 0.82, duration: 160, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(petScaleY, { toValue: 1.15, duration: 160, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(petScaleY, { toValue: 1.0, duration: 200, useNativeDriver: USE_NATIVE_DRIVER }),
      ]).start(() => {
        setDroppedFood(null);
        setPetAction('happy');

        Animated.sequence([
          Animated.timing(petHopY, { toValue: -28, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(petHopY, { toValue: 0, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(petHopY, { toValue: -18, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(petHopY, { toValue: 0, duration: 160, easing: Easing.in(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
        ]).start(() => {
          setPetAction('idle');
          setDialogue('배가 든든해요! 밥 챙겨줘서 고마워요 💕');
        });

        if (onUpdateVitals) {
          onUpdateVitals(prev => ({
            ...prev,
            hunger: Math.min(100, (prev.hunger || 80) + foodItem.hunger),
            happiness: Math.min(100, (prev.happiness || 85) + foodItem.happiness),
          }));
        }
        if (onGainExp) onGainExp(foodItem.exp);
        spawnHeartToast(`+${foodItem.exp} EXP 💖`);

        if (isVisiting && onCareAction) {
          onCareAction();
        }
      });
    }, 1.5);
  };

  // -------------------------------------------------------------
  // ACTION 2: ⚽ Bouncing Toy Ball
  // -------------------------------------------------------------
  const handleLaunchBall = () => {
    if (ballActive || isLightsOff) return;
    if (isMenuOpen) toggleMenu();

    setBallActive(true);
    setPetAction('playing');
    setDialogue('공이다! 내가 잡으러 갈게 몽! ⚽🐾');

    const startX = SCREEN_WIDTH * 0.25;
    const endX = SCREEN_WIDTH * 0.72;

    ballAnimX.setValue(startX);
    ballAnimY.setValue(0);

    Animated.parallel([
      Animated.timing(ballAnimX, {
        toValue: endX,
        duration: 1500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.sequence([
        Animated.timing(ballAnimY, { toValue: -80, duration: 360, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(ballAnimY, { toValue: 0, duration: 360, easing: Easing.in(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(ballAnimY, { toValue: -45, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(ballAnimY, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
      ]),
    ]).start(() => {
      walkToPosition(endX - 30, () => {
        Animated.sequence([
          Animated.timing(petHopY, { toValue: -24, duration: 180, useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(petHopY, { toValue: 0, duration: 180, useNativeDriver: USE_NATIVE_DRIVER }),
        ]).start();

        Animated.sequence([
          Animated.timing(ballAnimY, { toValue: -110, duration: 300, useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(ballAnimY, { toValue: 0, duration: 350, useNativeDriver: USE_NATIVE_DRIVER }),
        ]).start(() => {
          setDialogue('나이스 슛! 골인이다 몽! 🏆 신난다!');
          setBallActive(false);
          setPetAction('idle');

          if (onUpdateVitals) {
            onUpdateVitals(prev => ({
              ...prev,
              happiness: Math.min(100, (prev.happiness || 85) + 25),
              energy: Math.max(0, (prev.energy || 95) - 6),
            }));
          }
          if (onGainExp) onGainExp(6);
          spawnHeartToast('+6 EXP ⚽');
        });
      }, 1.6);
    });
  };

  // -------------------------------------------------------------
  // ACTION 3: 🧼 Soap Bath & Rubbing
  // -------------------------------------------------------------
  const handleApplySoap = (e) => {
    if (isLightsOff) return;
    const clickX = e.nativeEvent.locationX || SCREEN_WIDTH * 0.5;
    const clickY = e.nativeEvent.locationY || SCREEN_HEIGHT * 0.45;

    const newBubbles = [1, 2, 3].map(i => ({
      id: `bubble_${Date.now()}_${i}`,
      x: clickX + (Math.random() * 60 - 30),
      y: clickY + (Math.random() * 40 - 20),
    }));

    setSoapBubbles(prev => [...prev.slice(-10), ...newBubbles]);
    setPetAction('bathing');
    setDialogue('간질간질 보글보글~ 거품 목욕 너무 시원해요! 🫧');

    Animated.sequence([
      Animated.timing(petRotate, { toValue: 1, duration: 120, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(petRotate, { toValue: -1, duration: 120, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(petRotate, { toValue: 0, duration: 120, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start(() => {
      if (onUpdateVitals) {
        onUpdateVitals(prev => ({
          ...prev,
          cleanliness: 100,
          happiness: Math.min(100, (prev.happiness || 85) + 12),
        }));
      }
      spawnHeartToast('청결도 100% 뽀송! ✨');
      setPetAction('idle');
    });
  };

  // -------------------------------------------------------------
  // ACTION 4: 💡 Lights Out & Sleep Routine
  // -------------------------------------------------------------
  const handleToggleLights = () => {
    const next = !isLightsOff;
    setIsLightsOff(next);
    if (isMenuOpen) toggleMenu();

    Animated.timing(lightsDimAnim, {
      toValue: next ? 1 : 0,
      duration: 650,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();

    if (next) {
      setDialogue('하아암~ 조명이 꺼지니 솔솔 졸려요... 쿨쿨 zZ 🌙');
      walkToPosition(SCREEN_WIDTH * 0.35, () => {
        setPetAction('sleeping');
        if (onUpdateVitals) {
          onUpdateVitals(prev => ({
            ...prev,
            energy: 100,
            happiness: Math.min(100, (prev.happiness || 85) + 15),
          }));
        }
      }, 0.8);
    } else {
      setPetAction('idle');
      setDialogue('좋은 아침! 푹 자고 일어났더니 힘이 솟아요 몽! ☀️');
    }
  };

  // -------------------------------------------------------------
  // ACTION 5: 🐾 Petting & Diagnostics
  // -------------------------------------------------------------
  const handlePetPress = () => {
    if (petAction === 'sleeping') {
      setDialogue('쿠울... 5분만 더 잘게요 몽... 💤');
      return;
    }

    setPetAction('happy');
    setDialogue('헤헤, 간지러워요 몽! 쓰다듬어줘서 너무 좋아~ 💕');

    // Show emotional condition popup for 3.5 seconds
    setShowConditionPopup(true);
    setTimeout(() => setShowConditionPopup(false), 3800);

    Animated.sequence([
      Animated.timing(petHopY, { toValue: -22, duration: 160, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(petHopY, { toValue: 0, duration: 160, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(petHopY, { toValue: -14, duration: 140, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(petHopY, { toValue: 0, duration: 140, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start(() => setPetAction('idle'));

    if (onUpdateVitals) {
      onUpdateVitals(prev => ({
        ...prev,
        happiness: Math.min(100, (prev.happiness || 85) + 8),
      }));
    }
    if (onGainExp) onGainExp(2);
    spawnHeartToast('+2 EXP 💕');
  };

  // Character stage info
  const stage = getEvolutionStage(character?.level || 1);
  const evolvedEmoji = character?.image_url
    ? null
    : getEvolvedEmoji(character?.emoji || '🐶', character?.level || 1);

  // Overall Happiness Score (0~100)
  const avgCondition = Math.round(
    ((vitals.hunger || 80) + (vitals.happiness || 85) + (vitals.cleanliness || 90) + (vitals.energy || 95)) / 4
  );

  return (
    <View style={styles.engineContainer} pointerEvents="box-none">
      {/* 1. Real-time Lights Out Overlay */}
      <Animated.View
        style={[
          styles.lightsOverlay,
          {
            opacity: lightsDimAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.82],
            }),
          },
        ]}
        pointerEvents={isLightsOff ? 'auto' : 'none'}
      >
        {isLightsOff && (
          <TouchableOpacity
            style={styles.nightLampTapTarget}
            onPress={handleToggleLights}
            activeOpacity={0.8}
          >
            <View style={styles.nightLampGlow}>
              <Text style={styles.nightZzzText}>zZ Z 🌙</Text>
              <Text style={styles.nightTapHint}>탭하여 불켜기 💡</Text>
            </View>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* 2. Fullscreen Interactive Room Canvas */}
      <TouchableOpacity
        activeOpacity={1}
        style={styles.roomGameField}
        onPress={(e) => {
          if (activeTool === 'bath') {
            handleApplySoap(e);
          } else if (activeTool === 'feed') {
            handleDropFood(FOOD_MENU[0], e.nativeEvent.locationX);
          } else if (isMenuOpen) {
            toggleMenu();
          }
        }}
      >
        {/* Visiting Banner (Subtle, non-intrusive floating pill at top) */}
        {isVisiting && (
          <View style={styles.visitingFloatingPill}>
            <Heart size={13} color="#FF4D6D" fill="#FF4D6D" />
            <Text style={styles.visitingPillText}>
              {owner?.name || '가족'} 님의 방 놀러옴 • 돌봄 선물 가능 ({dailyCareCount}/{maxDailyCare}회)
            </Text>
          </View>
        )}

        {/* Dropped Food on Floor */}
        {droppedFood && (
          <View style={[styles.droppedFoodItem, { left: droppedFood.x - 20, bottom: 110 }]}>
            <Text style={styles.droppedFoodEmoji}>{droppedFood.emoji}</Text>
            <View style={styles.droppedFoodShadow} />
          </View>
        )}

        {/* Bouncing Toy Ball */}
        {ballActive && (
          <Animated.View
            style={[
              styles.toyBallContainer,
              {
                transform: [
                  { translateX: ballAnimX },
                  { translateY: ballAnimY },
                  { scale: ballScale },
                ],
              },
            ]}
          >
            <Text style={styles.toyBallEmoji}>⚽</Text>
            <View style={styles.toyBallShadow} />
          </Animated.View>
        )}

        {/* Soap Bubbles */}
        {soapBubbles.map((b) => (
          <View key={b.id} style={[styles.soapBubble, { left: b.x, top: b.y }]}>
            <Text style={{ fontSize: 24 }}>🫧</Text>
          </View>
        ))}

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
            {/* Thought Bubble / Dialogue */}
            <View style={styles.petSpeechBubble}>
              <Text style={styles.petSpeechText}>{dialogue}</Text>
              <View style={styles.petSpeechArrow} />
            </View>

            {/* Emotional Needs Alert Balloon (if hungry or sleepy) */}
            {(vitals.hunger || 80) < 40 && petAction === 'idle' && (
              <View style={styles.needsBalloon}>
                <Text style={styles.needsBalloonText}>💭 🍖 배고파요!</Text>
              </View>
            )}

            {/* Emotional Condition Card (Shown on Pet Tap) */}
            {showConditionPopup && (
              <View style={styles.conditionPopup}>
                <View style={styles.conditionScoreRow}>
                  <Heart size={14} color="#FF4D6D" fill="#FF4D6D" />
                  <Text style={styles.conditionScoreText}>컨디션 {avgCondition}%</Text>
                </View>
                <View style={styles.conditionMiniPillsRow}>
                  <Text style={styles.conditionMiniPill}>🍗 {vitals.hunger || 80}%</Text>
                  <Text style={styles.conditionMiniPill}>💖 {vitals.happiness || 85}%</Text>
                  <Text style={styles.conditionMiniPill}>🧼 {vitals.cleanliness || 90}%</Text>
                  <Text style={styles.conditionMiniPill}>⚡ {vitals.energy || 95}%</Text>
                </View>
              </View>
            )}

            {/* Stage 4 Guardian Aura */}
            {stage.stage === 4 && <View style={styles.guardianAura} />}

            {/* Pet Sprite Touch Area */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handlePetPress}
              style={styles.petTouchWrapper}
            >
              {/* Pet Stage Badge */}
              <View style={[styles.stageBadge, { backgroundColor: stage.badgeColor }]}>
                <Text style={styles.stageBadgeText}>Lv.{character.level || 1} • {stage.name}</Text>
              </View>

              {/* Character Visual Body (Only body flips/squishes, keeping texts upright) */}
              <Animated.View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [
                    { scaleX: petScaleX },
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
                {/* Character Image / Emoji */}
                <View style={{ transform: [{ scale: stage.scale }] }}>
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
                </View>

                {/* Ground Contact Shadow */}
                <View style={styles.petGroundShadow} />
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VISITING COMPANION PET */}
        {/* ------------------------------------------------------------- */}
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
            <View style={styles.visitorBadge}>
              <Text style={styles.visitorBadgeText}>내 반려몽 놀러옴 🐾</Text>
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
      {/* 3. FLOATING SNACK DRAWER (Slides up smoothly when Feed active) */}
      {/* ------------------------------------------------------------- */}
      {activeTool === 'feed' && (
        <View style={styles.floatingSnackDrawer}>
          <View style={styles.snackDrawerHeader}>
            <Text style={styles.snackDrawerTitle}>반려몽 밥주기 & 간식 모드 🍖</Text>
            <TouchableOpacity onPress={() => setActiveTool('none')} style={styles.snackCloseBtn}>
              <X size={16} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          {/* Action A: Interactive Mini-Game Launcher */}
          <TouchableOpacity
            style={styles.snackGameBanner}
            onPress={() => {
              setActiveTool('none');
              setIsSnackGameVisible(true);
            }}
            activeOpacity={0.85}
          >
            <View style={styles.snackGameBannerLeft}>
              <View style={styles.snackGameTag}>
                <Flame size={12} color="#FFF" style={{ marginRight: 3 }} />
                <Text style={styles.snackGameTagText}>체류형 게임 모드</Text>
              </View>
              <Text style={styles.snackGameTitle}>🎮 와구와구 간식 캐치 도전!</Text>
              <Text style={styles.snackGameSubtitle}>직접 조작하여 떨어지는 간식을 받아먹고 폭풍 성장!</Text>
            </View>
            <View style={styles.snackGameStartBadge}>
              <Text style={styles.snackGameStartText}>START ⚡</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.snackDrawerDivider}>
            <Text style={styles.snackDrawerDividerText}>또는 개별 간식 바로 먹이기</Text>
          </View>

          <View style={styles.snackGridRow}>
            {FOOD_MENU.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.snackCard}
                onPress={() => handleDropFood(item)}
                activeOpacity={0.75}
              >
                <Text style={styles.snackEmoji}>{item.emoji}</Text>
                <Text style={styles.snackName}>{item.name}</Text>
                <Text style={styles.snackExp}>+{item.exp} EXP</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. RADIAL FLOATING CARE HUB (Minimal 95% Open Layout) */}
      {/* ------------------------------------------------------------- */}
      <View style={styles.floatingHubContainer} pointerEvents="box-none">
        {/* Arc of Expanded Care Action Buttons */}
        <Animated.View
          style={[
            styles.radialActionRow,
            {
              opacity: menuAnim,
              transform: [
                { scale: menuAnim },
                {
                  translateY: menuAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
          pointerEvents={isMenuOpen ? 'auto' : 'none'}
        >
          {/* Feed Button */}
          <TouchableOpacity
            style={[styles.careMiniOrb, activeTool === 'feed' && styles.careMiniOrbActive]}
            onPress={() => setActiveTool(prev => prev === 'feed' ? 'none' : 'feed')}
            activeOpacity={0.8}
          >
            <Text style={styles.careOrbIcon}>🍗</Text>
            <Text style={styles.careOrbLabel}>밥주기</Text>
          </TouchableOpacity>

          {/* Play Ball Button */}
          <TouchableOpacity
            style={[styles.careMiniOrb, ballActive && styles.careMiniOrbActive]}
            onPress={handleLaunchBall}
            activeOpacity={0.8}
          >
            <Text style={styles.careOrbIcon}>⚽</Text>
            <Text style={styles.careOrbLabel}>놀기</Text>
          </TouchableOpacity>

          {/* Bath Button */}
          <TouchableOpacity
            style={[styles.careMiniOrb, activeTool === 'bath' && styles.careMiniOrbActive]}
            onPress={() => {
              const next = activeTool === 'bath' ? 'none' : 'bath';
              setActiveTool(next);
              if (next === 'bath') {
                setDialogue('비누 스펀지를 들었어요! 반려몽을 톡톡 터치해 씻겨주세요 🧼');
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.careOrbIcon}>🧼</Text>
            <Text style={styles.careOrbLabel}>{activeTool === 'bath' ? '완료' : '목욕'}</Text>
          </TouchableOpacity>

          {/* Lights / Sleep Button */}
          <TouchableOpacity
            style={[styles.careMiniOrb, isLightsOff && styles.careMiniOrbNight]}
            onPress={handleToggleLights}
            activeOpacity={0.8}
          >
            <Text style={styles.careOrbIcon}>{isLightsOff ? '☀️' : '🌙'}</Text>
            <Text style={styles.careOrbLabel}>{isLightsOff ? '불켜기' : '재우기'}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Master Floating Orb Button */}
        <TouchableOpacity
          style={[styles.masterOrbBtn, isMenuOpen && styles.masterOrbBtnActive]}
          onPress={toggleMenu}
          activeOpacity={0.85}
        >
          <Text style={styles.masterOrbEmoji}>{isMenuOpen ? '✕' : '🐾'}</Text>
          {!isMenuOpen && <Text style={styles.masterOrbLabel}>케어</Text>}
        </TouchableOpacity>
      </View>

      {/* ------------------------------------------------------------- */}
      {/* 5. INTERACTIVE SNACK CATCH MINI-GAME MODAL */}
      {/* ------------------------------------------------------------- */}
      <SnackCatchGame
        visible={isSnackGameVisible}
        character={character}
        transparentUrl={transparentUrl}
        onClose={() => setIsSnackGameVisible(false)}
        onGameComplete={({ score, exp, points, maxCombo }) => {
          if (onUpdateVitals) {
            onUpdateVitals(prev => ({
              ...prev,
              hunger: 100,
              happiness: 100,
            }));
          }
          if (onGainExp) onGainExp(exp);
          if (onAwardPoints) onAwardPoints(points, '간식 캐치 미니게임');
          setPetAction('happy');
          setDialogue(`와구와구 정말 배불러요! ${score}점 기록, 최고 ${maxCombo}콤보 달성! 💖`);
          spawnHeartToast(`+${exp} EXP & +${points}P 🏆`);
        }}
      />
    </View>
  );
}

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
    zIndex: 25,
  },
  nightLampTapTarget: {
    position: 'absolute',
    top: '30%',
    right: '15%',
    padding: 20,
  },
  nightLampGlow: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(254, 240, 138, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(254, 240, 138, 0.4)',
  },
  nightZzzText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FEF08A',
    letterSpacing: 4,
  },
  nightTapHint: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(254, 240, 138, 0.85)',
    marginTop: 6,
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
    zIndex: 50,
  },
  visitingPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#E11D48',
  },
  droppedFoodItem: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 35,
  },
  droppedFoodEmoji: {
    fontSize: 34,
  },
  droppedFoodShadow: {
    width: 30,
    height: 8,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    marginTop: -2,
  },
  toyBallContainer: {
    position: 'absolute',
    bottom: 110,
    left: 0,
    width: 50,
    alignItems: 'center',
    zIndex: 36,
  },
  toyBallEmoji: {
    fontSize: 38,
  },
  toyBallShadow: {
    width: 26,
    height: 7,
    borderRadius: 13,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  soapBubble: {
    position: 'absolute',
    zIndex: 40,
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
  // Main Pet Actor
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
    borderColor: '#FFD4D7',
    maxWidth: 220,
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#FF7E82',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  petSpeechText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
  },
  petSpeechArrow: {
    position: 'absolute',
    bottom: -6,
    width: 10,
    height: 10,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#FFD4D7',
    transform: [{ rotate: '45deg' }],
  },
  needsBalloon: {
    position: 'absolute',
    top: -28,
    right: -24,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  needsBalloonText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  // Condition Card (Shown on Tap)
  conditionPopup: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFE4E8',
    marginBottom: 6,
    alignItems: 'center',
    shadowColor: '#FF7E82',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  conditionScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  conditionScoreText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF4D6D',
  },
  conditionMiniPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  conditionMiniPill: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#6B7280',
  },
  stageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
  },
  stageBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  petImageSprite: {
    width: 100,
    height: 100,
  },
  petEmojiSprite: {
    fontSize: 74,
  },
  petGroundShadow: {
    width: 76,
    height: 14,
    borderRadius: 38,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    marginTop: 2,
  },
  guardianAura: {
    position: 'absolute',
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: 'rgba(250, 204, 21, 0.25)',
    borderWidth: 2,
    borderColor: 'rgba(250, 204, 21, 0.6)',
    top: -10,
    zIndex: -1,
  },
  // Visitor Pet
  visitorPetContainer: {
    position: 'absolute',
    bottom: 110,
    left: 0,
    width: 100,
    alignItems: 'center',
    zIndex: 34,
  },
  visitorBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 2,
  },
  visitorBadgeText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '800',
  },
  visitorEmoji: {
    fontSize: 48,
  },
  // Floating Snack Drawer
  floatingSnackDrawer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 94,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#FFE4E8',
    shadowColor: '#FF7E82',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 1000,
  },
  snackDrawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  snackDrawerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF7E82',
  },
  snackCloseBtn: {
    padding: 4,
  },
  snackGameBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF0F2',
    borderWidth: 1.5,
    borderColor: '#FFCCD3',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  snackGameBannerLeft: {
    flex: 1,
    marginRight: 8,
  },
  snackGameTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF7E82',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  snackGameTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  snackGameTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  snackGameSubtitle: {
    fontSize: 10,
    color: '#666',
  },
  snackGameStartBadge: {
    backgroundColor: '#FF7E82',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#FF7E82',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  snackGameStartText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  snackDrawerDivider: {
    alignItems: 'center',
    marginVertical: 6,
  },
  snackDrawerDividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E93',
  },
  snackGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  snackCard: {
    flex: 1,
    backgroundColor: '#FFF8F5',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE4D6',
  },
  snackEmoji: {
    fontSize: 26,
    marginBottom: 2,
  },
  snackName: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  snackExp: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FF4D6D',
    marginTop: 1,
  },
  // Radial Floating Care Hub
  floatingHubContainer: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    width: 60,
    height: 60,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    zIndex: 999,
    elevation: 10,
  },
  radialActionRow: {
    position: 'absolute',
    bottom: 72,
    right: 0,
    flexDirection: 'column',
    gap: 10,
    alignItems: 'flex-end',
    zIndex: 1000,
  },
  careMiniOrb: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#FFE4E8',
    shadowColor: '#FF7E82',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 5,
    gap: 7,
    minWidth: 92,
  },
  careMiniOrbActive: {
    backgroundColor: '#FFE4E8',
    borderColor: '#FF7E82',
  },
  careMiniOrbNight: {
    backgroundColor: '#1E293B',
    borderColor: '#475569',
  },
  careOrbIcon: {
    fontSize: 18,
  },
  careOrbLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#374151',
  },
  masterOrbBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF7E82',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF4D6D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  masterOrbBtnActive: {
    backgroundColor: '#4B5563',
  },
  masterOrbEmoji: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  masterOrbLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: -2,
  },
});
