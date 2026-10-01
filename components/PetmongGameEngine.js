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
  Modal,
  ScrollView,
} from 'react-native';
import Svg, { Circle, Path, Polygon, Rect } from 'react-native-svg';
import {
  Heart,
  Sparkles,
  Sun,
  Moon,
  Zap,
  Droplets,
  X,
  ChevronUp,
  Flame,
  Utensils,
  Gamepad2,
  PawPrint,
  Lightbulb,
  Beef,
  BookOpen,
  Trophy,
  Play,
} from 'lucide-react-native';
import { getEvolutionStage, getEvolvedEmoji } from '../lib/petmongEvolution';
import SnackCatchGame from './minigames/SnackCatchGame';
import KeepyUppyGame from './minigames/KeepyUppyGame';
import BubblePopGame from './minigames/BubblePopGame';
import DreamConstellationGame from './minigames/DreamConstellationGame';

// Crisp Vector Soccer Ball Component
function SoccerBallIcon({ size = 38 }) {
  const strokeW = Math.max(1.5, size * 0.05);
  return (
    <Svg width={size} height={size} viewBox="0 0 38 38">
      <Circle cx="19" cy="19" r="17.5" fill="#FFFFFF" stroke="#1E293B" strokeWidth={strokeW} />
      <Polygon points="19,13 24,17 22,23 16,23 14,17" fill="#1E293B" />
      <Path d="M19 13 L19 2" stroke="#1E293B" strokeWidth={strokeW} strokeLinecap="round" />
      <Path d="M24 17 L33.5 14" stroke="#1E293B" strokeWidth={strokeW} strokeLinecap="round" />
      <Path d="M22 23 L31 29" stroke="#1E293B" strokeWidth={strokeW} strokeLinecap="round" />
      <Path d="M16 23 L7 29" stroke="#1E293B" strokeWidth={strokeW} strokeLinecap="round" />
      <Path d="M14 17 L4.5 14" stroke="#1E293B" strokeWidth={strokeW} strokeLinecap="round" />
    </Svg>
  );
}

// Custom Vector Soap Bar Icon
function SoapBarIcon({ size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="6" width="20" height="13" rx="4" fill="#F472B6" stroke="#DB2777" strokeWidth={1.5} />
      <Path d="M6 10 C8 9, 10 9, 12 10 C14 11, 16 11, 18 10" stroke="#FFF" strokeWidth={1.5} strokeLinecap="round" opacity="0.85" />
      <Circle cx="17" cy="4" r="2" fill="#FBCFE8" stroke="#DB2777" strokeWidth={1} />
      <Circle cx="21" cy="7" r="1.2" fill="#FBCFE8" />
    </Svg>
  );
}

// Custom Vector Shower Head Icon
function ShowerHeadIcon({ size = 46 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 46 46" fill="none">
      <Path
        d="M42 4 L30 4 C24 4, 20 8, 20 14 L20 20"
        stroke="#64748B"
        strokeWidth={4.5}
        strokeLinecap="round"
      />
      <Path
        d="M8 22 C8 20, 32 20, 32 22 L36 30 C36 32, 4 32, 4 30 Z"
        fill="#0EA5E9"
        stroke="#0284C7"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Rect x="4" y="30" width="32" height="4" rx="2" fill="#E0F2FE" stroke="#38BDF8" strokeWidth={1} />
      <Circle cx="10" cy="32" r="1.2" fill="#0284C7" />
      <Circle cx="15" cy="32" r="1.2" fill="#0284C7" />
      <Circle cx="20" cy="32" r="1.2" fill="#0284C7" />
      <Circle cx="25" cy="32" r="1.2" fill="#0284C7" />
      <Circle cx="30" cy="32" r="1.2" fill="#0284C7" />
    </Svg>
  );
}

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
  onOpenGrowthBook = null,
  unreadWhispers = [],
  onOpenWhisper = null,
  onOpenWriteWhisper = null,
}) {
  // Tool & Menu States
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Radial Care Hub open/closed
  const [activeTool, setActiveTool] = useState('none'); // 'none' | 'feed' | 'play' | 'bath' | 'sleep'
  const [isLightsOff, setIsLightsOff] = useState(false);
  const [showConditionPopup, setShowConditionPopup] = useState(false);
  const [isSnackGameVisible, setIsSnackGameVisible] = useState(false);
  const [isKeepyUppyGameVisible, setIsKeepyUppyGameVisible] = useState(false);
  const [isBubbleGameVisible, setIsBubbleGameVisible] = useState(false);
  const [isDreamGameVisible, setIsDreamGameVisible] = useState(false);
  const [isPlaygroundModalVisible, setIsPlaygroundModalVisible] = useState(false);

  // Pet Action State: 'idle' | 'walking' | 'eating' | 'playing' | 'bathing' | 'sleeping' | 'happy'
  const [petAction, setPetAction] = useState('idle');
  const [dialogue, setDialogue] = useState(
    unreadWhispers && unreadWhispers.length > 0
      ? '쉿! 저한테 몰래 맡겨진 비밀 귓속말이 있어요! 💌'
      : '안녕 몽! 오늘 나랑 신나게 놀아줄 거지? 🐾'
  );

  // Whisper Bobbing Animation
  const whisperBobAnim = useRef(new Animated.Value(0)).current;

  // 다마고치 생체 게이지 및 귓속말 반응 실시간 말풍선
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
    } else if (vitals && (vitals.hunger || 80) <= 30) {
      setDialogue('배가 꼬르륵 고파요... 맛있는 밥 챙겨주세요 몽 🥺');
    } else if (vitals && (vitals.cleanliness || 90) <= 30) {
      setDialogue('몸이 꼬질꼬질해요... 따뜻한 거품 목욕하고 싶어요 🧼');
    } else if (vitals && (vitals.energy || 95) <= 30) {
      setDialogue('하아암... 졸려요 몽... 불 끄고 코 잘래요 💤');
    } else if (vitals && (vitals.happiness || 85) <= 30) {
      setDialogue('심심해요 몽... 저랑 같이 공놀이 해주세요 🐾');
    }
  }, [unreadWhispers, whisperBobAnim, vitals?.hunger, vitals?.cleanliness, vitals?.energy, vitals?.happiness]);

  // Physics Objects
  const [droppedFood, setDroppedFood] = useState(null); // { x, y, emoji, id }
  const [ballActive, setBallActive] = useState(false);
  const [soapBubbles, setSoapBubbles] = useState([]); // [{ id, x, y, size }]
  const [floatingHearts, setFloatingHearts] = useState([]); // [{ id, x, y, text }]

  // Bath Shower & Washing Animations
  const [bathShowerActive, setBathShowerActive] = useState(false);
  const [bathSparklesActive, setBathSparklesActive] = useState(false);
  const [bathSplashes, setBathSplashes] = useState([]); // [{ id, dx, dy, size }]
  const showerHeadAnim = useRef(new Animated.Value(0)).current;
  const showerWaterAnim = useRef(new Animated.Value(0)).current;
  const showerWaterLoopRef = useRef(null);
  const bathTimeoutsRef = useRef([]);
  const lastCareActionTimeRef = useRef(0);

  // Cleanup bath timers and animation loops on unmount
  useEffect(() => {
    return () => {
      bathTimeoutsRef.current.forEach(clearTimeout);
      if (showerWaterLoopRef.current) {
        showerWaterLoopRef.current.stop();
      }
    };
  }, []);

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

        if (onCareAction) {
          onCareAction('FEED', foodItem);
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
          if (onCareAction) onCareAction('PLAY');
        });
      }, 1.6);
    });
  };

  // -------------------------------------------------------------
  // ACTION 3: 🧼 Soap Bath & Rubbing
  // -------------------------------------------------------------
  const handleApplySoap = () => {
    handleQuickBath();
  };

  // -------------------------------------------------------------
  // ACTION 4: 💡 Lights Out & Sleep Routine
  // -------------------------------------------------------------
  const handleToggleLights = () => {
    const now = Date.now();
    if (now - lastCareActionTimeRef.current < 600) return;
    lastCareActionTimeRef.current = now;

    const next = !isLightsOff;
    setIsLightsOff(next);
    if (isMenuOpen) toggleMenu();

    Animated.timing(lightsDimAnim, {
      toValue: next ? 1 : 0,
      duration: 650,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();

    if (next) {
      const isAlreadyFullEnergy = (vitals.energy || 95) >= 100;
      if (isAlreadyFullEnergy) {
        setDialogue('아직 에너지가 넘치지만... 불 끄고 코 잘게요 몽 zZ 🌙');
        spawnHeartToast('이미 에너지 100% 충전 상태!');
      } else {
        setDialogue('하아암~ 조명이 꺼지니 솔솔 졸려요... 쿨쿨 zZ 🌙');
      }

      walkToPosition(SCREEN_WIDTH * 0.35, () => {
        setPetAction('sleeping');
        if (onUpdateVitals) {
          onUpdateVitals(prev => ({
            ...prev,
            energy: 100,
            happiness: Math.min(100, (prev.happiness || 85) + (isAlreadyFullEnergy ? 0 : 15)),
          }));
        }
      }, 0.8);

      // Only award care action if vital actually replenished (어뷰징 방지)
      if (onCareAction && !isAlreadyFullEnergy) {
        onCareAction('SLEEP');
      }
    } else {
      setPetAction('idle');
      setDialogue('좋은 아침! 푹 자고 일어났더니 힘이 솟아요 몽! ☀️');
      if (onCareAction) {
        onCareAction('WAKE');
      }
    }
  };

  // -------------------------------------------------------------
  // 1-TAP QUICK CARE HANDLERS (원터치 즉시 다마고치 케어)
  // -------------------------------------------------------------
  const handleQuickFeed = () => {
    const now = Date.now();
    if (now - lastCareActionTimeRef.current < 500) return;
    lastCareActionTimeRef.current = now;

    if (petAction === 'eating' || droppedFood !== null) {
      spawnHeartToast('지금 맛있게 냠냠 먹는 중이에요! 🥫');
      return;
    }
    if (isLightsOff) {
      spawnHeartToast('반려몽이 코 자고 있어요... zZ 🌙');
      return;
    }

    if (isMenuOpen) toggleMenu();

    // 포만감 100% 시 귀여운 거절 리액션 & 어뷰징 차단
    if ((vitals.hunger || 80) >= 100) {
      setDialogue('배가 빵빵해서 더는 못 먹어요 몽! 🤰✨');
      Animated.sequence([
        Animated.timing(petRotate, { toValue: -0.6, duration: 90, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(petRotate, { toValue: 0.6, duration: 90, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(petRotate, { toValue: -0.6, duration: 90, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(petRotate, { toValue: 0.6, duration: 90, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(petRotate, { toValue: 0, duration: 80, useNativeDriver: USE_NATIVE_DRIVER }),
      ]).start();
      spawnHeartToast('이미 배가 든든해요! (100%)');
      return;
    }

    const randomFood = FOOD_MENU[Math.floor(Math.random() * FOOD_MENU.length)];
    handleDropFood(randomFood);
  };

  const handleQuickPlay = () => {
    const now = Date.now();
    if (now - lastCareActionTimeRef.current < 500) return;
    lastCareActionTimeRef.current = now;

    if (ballActive || petAction === 'playing') {
      spawnHeartToast('공을 쫓아 신나게 달리는 중이에요! ⚽');
      return;
    }
    if (isLightsOff) {
      spawnHeartToast('반려몽이 코 자고 있어요... zZ 🌙');
      return;
    }

    if (isMenuOpen) toggleMenu();

    // 에너지 부족 체크
    if ((vitals.energy || 95) <= 15) {
      setDialogue('너무 지쳐서 지금은 뛸 힘이 없어요... 쿨쿨 잘래요 몽 💤');
      spawnHeartToast('에너지가 부족해요! (잠자기 필요 ⚡)');
      return;
    }

    // 행복도 100% 시 귀여운 거절/휴식 리액션 & 어뷰징 차단
    if ((vitals.happiness || 85) >= 100) {
      setDialogue('지금 기분이 최고조라 너무 행복해요! 잠시 숨 고르고 또 놀아요 몽! 🐾✨');
      Animated.sequence([
        Animated.timing(petHopY, { toValue: -14, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(petHopY, { toValue: 0, duration: 150, easing: Easing.bounce, useNativeDriver: USE_NATIVE_DRIVER }),
      ]).start();
      spawnHeartToast('이미 행복도 100% 만족! 💕');
      return;
    }

    handleLaunchBall();
  };

  const handleQuickBath = () => {
    const now = Date.now();
    if (now - lastCareActionTimeRef.current < 500) return;
    lastCareActionTimeRef.current = now;

    if (isLightsOff) {
      spawnHeartToast('반려몽이 코 자고 있어요... zZ 🌙');
      return;
    }
    if (petAction === 'bathing' || bathShowerActive) {
      spawnHeartToast('지금 시원하게 샤워 중이에요! 🚿');
      return;
    }

    if (isMenuOpen) toggleMenu();

    // 청결도 100% 시 귀여운 거절 리액션 & 어뷰징 차단
    if ((vitals.cleanliness || 90) >= 100) {
      setDialogue('이미 온몸이 뽀송뽀송 윤기나요 몽! 간지러워요~ 🫧✨');
      setBathSparklesActive(true);
      const t = setTimeout(() => {
        setBathSparklesActive(false);
      }, 1200);
      bathTimeoutsRef.current.push(t);
      spawnHeartToast('이미 청결도 100% 뽀송!');
      return;
    }

    // 1. Enter Showering Mode
    setPetAction('bathing');
    setBathShowerActive(true);
    setBathSparklesActive(false);
    setBathSplashes([]);
    setDialogue('샤워기 쏴아아~! 시원하게 물 맞고 비누칠해요! 🚿🫧');

    // Shower slides down from ceiling above pet
    Animated.spring(showerHeadAnim, {
      toValue: 1,
      friction: 6,
      tension: 50,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();

    // Water spray cascading loop
    showerWaterAnim.setValue(0);
    const sprayLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(showerWaterAnim, { toValue: 1, duration: 240, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(showerWaterAnim, { toValue: 0, duration: 240, useNativeDriver: USE_NATIVE_DRIVER }),
      ])
    );
    showerWaterLoopRef.current = sprayLoop;
    sprayLoop.start();

    // 2. Foaming Soap Bubbles Emerge around Pet Body
    const bubbles = [
      { id: 'b_1', x: 14, y: 18, size: 26 },
      { id: 'b_2', x: 66, y: 20, size: 24 },
      { id: 'b_3', x: 18, y: 50, size: 30 },
      { id: 'b_4', x: 64, y: 56, size: 22 },
      { id: 'b_5', x: 40, y: 10, size: 28 },
      { id: 'b_6', x: 38, y: 66, size: 25 },
    ];
    setSoapBubbles(bubbles);

    // 3. Pet Wiggles Gently Under Warm Water
    Animated.sequence([
      Animated.timing(petRotate, { toValue: 0.6, duration: 180, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(petRotate, { toValue: -0.6, duration: 180, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(petRotate, { toValue: 0.6, duration: 180, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(petRotate, { toValue: -0.6, duration: 180, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(petRotate, { toValue: 0, duration: 120, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();

    // 4. Retract Shower & Start VIGOROUS SHAKE & SPLASH!
    const t1 = setTimeout(() => {
      if (showerWaterLoopRef.current) {
        showerWaterLoopRef.current.stop();
      }
      Animated.timing(showerHeadAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start(() => {
        setBathShowerActive(false);
      });

      // Clear foam bubbles & trigger radial water splash drops
      setSoapBubbles([]);
      setDialogue('부르르르 털기! 💦 뽀송하게 물방울 털기!');

      const splashes = [
        { id: 's1', dx: -55, dy: -28, size: 16 },
        { id: 's2', dx: 55, dy: -24, size: 18 },
        { id: 's3', dx: -45, dy: 15, size: 14 },
        { id: 's4', dx: 45, dy: 20, size: 15 },
        { id: 's5', dx: -60, dy: -5, size: 16 },
        { id: 's6', dx: 60, dy: -8, size: 16 },
      ];
      setBathSplashes(splashes);

      // Fast, vigorous shaking rotation
      Animated.sequence([
        Animated.timing(petRotate, { toValue: 1.2, duration: 70, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(petRotate, { toValue: -1.2, duration: 70, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(petRotate, { toValue: 1.2, duration: 70, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(petRotate, { toValue: -1.2, duration: 70, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(petRotate, { toValue: 0.8, duration: 70, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(petRotate, { toValue: -0.8, duration: 70, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(petRotate, { toValue: 0, duration: 70, useNativeDriver: USE_NATIVE_DRIVER }),
      ]).start();

      // Hop with joy
      Animated.sequence([
        Animated.timing(petHopY, { toValue: -26, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(petHopY, { toValue: 0, duration: 200, easing: Easing.bounce, useNativeDriver: USE_NATIVE_DRIVER }),
      ]).start();

      // 5. Sparkle Gleam & Happy finish
      const t2 = setTimeout(() => {
        setBathSplashes([]);
        setBathSparklesActive(true);
        setPetAction('happy');
        setDialogue('온몸이 뽀송뽀송 윤기가 흘러요 몽! ✨🧼');

        if (onUpdateVitals) {
          onUpdateVitals(prev => ({
            ...prev,
            cleanliness: 100,
            happiness: Math.min(100, (prev.happiness || 85) + 15),
          }));
        }
        if (onGainExp) onGainExp(5);
        spawnHeartToast('청결도 100% 뽀송 완충! ✨');

        if (isVisiting && onCareAction) {
          onCareAction('BATH');
        }

        const t3 = setTimeout(() => {
          setBathSparklesActive(false);
          setPetAction('idle');
        }, 1800);
        bathTimeoutsRef.current.push(t3);
      }, 650);
      bathTimeoutsRef.current.push(t2);

    }, 1300);
    bathTimeoutsRef.current.push(t1);
  };

  const handleQuickSleep = () => {
    handleToggleLights();
  };

  // -------------------------------------------------------------
  // ACTION 5: 🐾 Petting & Diagnostics
  // -------------------------------------------------------------
  const handlePetPress = () => {
    if (unreadWhispers && unreadWhispers.length > 0 && onOpenWhisper) {
      onOpenWhisper(unreadWhispers[0]);
      return;
    }

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
            activeOpacity={0.85}
          >
            <View style={styles.nightLampGlow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
                <Text style={styles.nightZzzText}>zZ Z</Text>
                <Moon size={20} color="#FBBF24" fill="#FBBF24" />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Text style={styles.nightTapHint}>화면을 탭하여 불켜기</Text>
                <Lightbulb size={14} color="#FBBF24" />
              </View>
            </View>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* 2. Fullscreen Interactive Room Canvas */}
      <TouchableOpacity
        activeOpacity={1}
        style={styles.roomGameField}
        onPress={(e) => {
          if (isLightsOff) {
            handleToggleLights();
            return;
          }
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
            <SoccerBallIcon size={36} />
            <View style={styles.toyBallShadow} />
          </Animated.View>
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
            {/* Shower Head & Cascading Water Streams (When Shower Active) */}
            {bathShowerActive && (
              <Animated.View
                style={[
                  styles.showerRig,
                  {
                    transform: [
                      {
                        translateY: showerHeadAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-90, -30],
                        }),
                      },
                    ],
                  },
                ]}
                pointerEvents="none"
              >
                <ShowerHeadIcon size={46} />
                <View style={styles.waterStreamsBox}>
                  {[0, 1, 2, 3].map((streamIdx) => (
                    <Animated.View
                      key={`stream_${streamIdx}`}
                      style={[
                        styles.waterStreamLine,
                        {
                          left: 10 + streamIdx * 7,
                          opacity: showerWaterAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: streamIdx % 2 === 0 ? [0.35, 0.95] : [0.95, 0.35],
                          }),
                          height: showerWaterAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: streamIdx % 2 === 0 ? [45, 70] : [65, 45],
                          }),
                        },
                      ]}
                    />
                  ))}
                  <View style={styles.waterDropletsSprayRow}>
                    <Droplets size={12} color="#38BDF8" fill="#BAE6FD" />
                    <Droplets size={14} color="#0284C7" fill="#38BDF8" style={{ marginTop: 6 }} />
                    <Droplets size={11} color="#38BDF8" fill="#BAE6FD" />
                  </View>
                </View>
              </Animated.View>
            )}

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

            {/* Thought Bubble / Dialogue */}
            <View style={styles.petSpeechBubble}>
              <Text style={styles.petSpeechText}>{dialogue}</Text>
              <View style={styles.petSpeechArrow} />
            </View>

            {/* Emotional Needs Alert Balloon (if hungry or sleepy) */}
            {(vitals.hunger || 80) < 40 && petAction === 'idle' && (
              <View style={[styles.needsBalloon, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                <Utensils size={13} color="#E11D48" />
                <Text style={styles.needsBalloonText}>배고파요!</Text>
              </View>
            )}

            {/* Emotional Condition Card (Shown on Pet Tap) */}
            {showConditionPopup && (
              <View style={styles.conditionPopup}>
                <View style={styles.conditionScoreRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Heart size={14} color="#FF4D6D" fill="#FF4D6D" />
                    <Text style={styles.conditionScoreText}>컨디션 {avgCondition}%</Text>
                  </View>
                  {onOpenGrowthBook && (
                    <TouchableOpacity
                      style={styles.conditionGrowthBtn}
                      onPress={() => {
                        setShowConditionPopup(false);
                        onOpenGrowthBook();
                      }}
                      activeOpacity={0.75}
                    >
                      <BookOpen size={11} color="#2563EB" style={{ marginRight: 3 }} />
                      <Text style={styles.conditionGrowthBtnText}>성장 도감</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.conditionMiniPillsRow}>
                  <View style={styles.conditionMiniPillItem}>
                    <Utensils size={11} color="#EF4444" />
                    <Text style={styles.conditionMiniPillText}>{vitals.hunger || 80}%</Text>
                  </View>
                  <View style={styles.conditionMiniPillItem}>
                    <Heart size={11} color="#EC4899" fill="#EC4899" />
                    <Text style={styles.conditionMiniPillText}>{vitals.happiness || 85}%</Text>
                  </View>
                  <View style={styles.conditionMiniPillItem}>
                    <Droplets size={11} color="#06B6D4" fill="#06B6D4" />
                    <Text style={styles.conditionMiniPillText}>{vitals.cleanliness || 90}%</Text>
                  </View>
                  <View style={styles.conditionMiniPillItem}>
                    <Zap size={11} color="#EAB308" fill="#EAB308" />
                    <Text style={styles.conditionMiniPillText}>{vitals.energy || 95}%</Text>
                  </View>
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
                        inputRange: [-1.5, -1, 0, 1, 1.5],
                        outputRange: ['-18deg', '-11deg', '0deg', '11deg', '18deg'],
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

                {/* Dirty / Dusty Indicator when Cleanliness < 50% and not currently bathing */}
                {(vitals.cleanliness || 90) < 50 && petAction !== 'bathing' && (
                  <View style={styles.dirtyStateContainer} pointerEvents="none">
                    <View style={styles.dirtyStatePuff}>
                      <Text style={styles.dirtyStateText}>꼬질꼬질 💨</Text>
                    </View>
                    <View style={[styles.dustSpeck, { top: 25, left: 15 }]} />
                    <View style={[styles.dustSpeck, { top: 55, right: 18, width: 9, height: 9 }]} />
                  </View>
                )}

                {/* Foaming Soap Bubbles on Pet Body */}
                {soapBubbles.map((b) => (
                  <View
                    key={b.id}
                    style={[
                      styles.soapBubbleOrb,
                      {
                        left: b.x,
                        top: b.y,
                        width: b.size,
                        height: b.size,
                        borderRadius: b.size / 2,
                      },
                    ]}
                    pointerEvents="none"
                  >
                    <View style={styles.bubbleGlossLight} />
                    <Droplets size={Math.max(10, Math.round(b.size * 0.45))} color="#38BDF8" fill="#BAE6FD" />
                  </View>
                ))}

                {/* Water Splash Particles when Pet Shakes */}
                {bathSplashes.map((s) => (
                  <View
                    key={s.id}
                    style={[
                      styles.splashDropletParticle,
                      {
                        transform: [{ translateX: s.dx }, { translateY: s.dy }],
                      },
                    ]}
                    pointerEvents="none"
                  >
                    <Droplets size={s.size} color="#0284C7" fill="#7DD3FC" />
                  </View>
                ))}

                {/* Post-bath Sparkles Gleam */}
                {bathSparklesActive && (
                  <View style={styles.bathSparkleOverlay} pointerEvents="none">
                    <View style={[styles.bathSparklePin, { top: 5, left: 10 }]}>
                      <Sparkles size={24} color="#FBBF24" fill="#FDE047" />
                    </View>
                    <View style={[styles.bathSparklePin, { top: 8, right: 10 }]}>
                      <Sparkles size={26} color="#38BDF8" fill="#BAE6FD" />
                    </View>
                    <View style={[styles.bathSparklePin, { top: 55, left: -10 }]}>
                      <Sparkles size={20} color="#A855F7" fill="#DDD6FE" />
                    </View>
                    <View style={[styles.bathSparklePin, { top: 60, right: -10 }]}>
                      <Sparkles size={22} color="#F43F5E" fill="#FECDD3" />
                    </View>
                    <View style={styles.bathFreshHalo} />
                  </View>
                )}
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
      {/* 3. PLAYGROUND / MINI-GAME HUB MODAL (온 가족 반려몽 놀이터) */}
      {/* ------------------------------------------------------------- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isPlaygroundModalVisible}
        onRequestClose={() => setIsPlaygroundModalVisible(false)}
      >
        <View style={styles.playgroundModalOverlay}>
          <View style={styles.playgroundModalCard}>
            {/* Header */}
            <View style={styles.playgroundHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Gamepad2 size={22} color="#DB2777" style={{ marginRight: 8 }} />
                <Text style={styles.playgroundHeaderTitle}>반려몽 놀이터 🎮</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsPlaygroundModalVisible(false)}
                style={styles.playgroundCloseBtn}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.playgroundSubDesc}>
              체류형 4대 미니게임에 도전하고 S등급 달성 & 대량 EXP와 가족 포인트를 획득하세요! 🏆
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Game 1: 와구와구 간식 캐치 */}
              <TouchableOpacity
                style={[styles.playgroundCard, { borderColor: '#FECDD3', backgroundColor: '#FFF1F2' }]}
                onPress={() => {
                  setIsPlaygroundModalVisible(false);
                  setIsSnackGameVisible(true);
                }}
                activeOpacity={0.85}
              >
                <View style={[styles.playgroundCardIconWrap, { backgroundColor: '#FFE4E6' }]}>
                  <Text style={{ fontSize: 28 }}>🍎</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.playgroundCardTitle}>와구와구 간식 캐치</Text>
                    <View style={[styles.playgroundTagBadge, { backgroundColor: '#E11D48' }]}>
                      <Text style={styles.playgroundTagBadgeText}>밥주기</Text>
                    </View>
                  </View>
                  <Text style={styles.playgroundCardDesc}>
                    30초 동안 떨어지는 간식을 직접 좌우로 받아먹는 아케이드 캐치 게임!
                  </Text>
                  <Text style={[styles.playgroundCardReward, { color: '#E11D48' }]}>
                    🎁 보상: 포만감 100% + 대량 EXP + S/A등급 포인트(P)
                  </Text>
                </View>
                <View style={[styles.playgroundPlayBtn, { backgroundColor: '#E11D48' }]}>
                  <Play size={14} color="#FFF" fill="#FFF" />
                </View>
              </TouchableOpacity>

              {/* Game 2: 핑퐁 리프팅 랠리 */}
              <TouchableOpacity
                style={[styles.playgroundCard, { borderColor: '#BAE6FD', backgroundColor: '#F0F9FF' }]}
                onPress={() => {
                  setIsPlaygroundModalVisible(false);
                  setIsKeepyUppyGameVisible(true);
                }}
                activeOpacity={0.85}
              >
                <View style={[styles.playgroundCardIconWrap, { backgroundColor: '#E0F2FE' }]}>
                  <Text style={{ fontSize: 28 }}>⚽</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.playgroundCardTitle}>핑퐁 리프팅 랠리</Text>
                    <View style={[styles.playgroundTagBadge, { backgroundColor: '#0284C7' }]}>
                      <Text style={styles.playgroundTagBadgeText}>놀아주기</Text>
                    </View>
                  </View>
                  <Text style={styles.playgroundCardDesc}>
                    손가락 패들로 공을 튕겨 올려 반려몽과 탁구/배구 랠리 대결!
                  </Text>
                  <Text style={[styles.playgroundCardReward, { color: '#0284C7' }]}>
                    🎁 보상: 행복도 100% + 대량 EXP + 최고 랠리 갱신
                  </Text>
                </View>
                <View style={[styles.playgroundPlayBtn, { backgroundColor: '#0284C7' }]}>
                  <Play size={14} color="#FFF" fill="#FFF" />
                </View>
              </TouchableOpacity>

              {/* Game 3: 뽀득뽀득 버블 팝 */}
              <TouchableOpacity
                style={[styles.playgroundCard, { borderColor: '#99F6E4', backgroundColor: '#F0FDFA' }]}
                onPress={() => {
                  setIsPlaygroundModalVisible(false);
                  setIsBubbleGameVisible(true);
                }}
                activeOpacity={0.85}
              >
                <View style={[styles.playgroundCardIconWrap, { backgroundColor: '#CCFBF1' }]}>
                  <Text style={{ fontSize: 28 }}>🧼</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.playgroundCardTitle}>뽀득뽀득 버블 팝</Text>
                    <View style={[styles.playgroundTagBadge, { backgroundColor: '#0D9488' }]}>
                      <Text style={styles.playgroundTagBadgeText}>목욕하기</Text>
                    </View>
                  </View>
                  <Text style={styles.playgroundCardDesc}>
                    피어오르는 비누방울을 손가락으로 팡팡 터트리는 쾌감 액션!
                  </Text>
                  <Text style={[styles.playgroundCardReward, { color: '#0D9488' }]}>
                    🎁 보상: 청결도 100% + 대량 EXP + 황금 버블 보너스
                  </Text>
                </View>
                <View style={[styles.playgroundPlayBtn, { backgroundColor: '#0D9488' }]}>
                  <Play size={14} color="#FFF" fill="#FFF" />
                </View>
              </TouchableOpacity>

              {/* Game 4: 꿈나라 별자리 잇기 */}
              <TouchableOpacity
                style={[styles.playgroundCard, { borderColor: '#C7D2FE', backgroundColor: '#EEF2FF' }]}
                onPress={() => {
                  setIsPlaygroundModalVisible(false);
                  setIsDreamGameVisible(true);
                }}
                activeOpacity={0.85}
              >
                <View style={[styles.playgroundCardIconWrap, { backgroundColor: '#E0E7FF' }]}>
                  <Text style={{ fontSize: 28 }}>🌙</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.playgroundCardTitle}>꿈나라 별자리 잇기</Text>
                    <View style={[styles.playgroundTagBadge, { backgroundColor: '#4F46E5' }]}>
                      <Text style={styles.playgroundTagBadgeText}>재우기</Text>
                    </View>
                  </View>
                  <Text style={styles.playgroundCardDesc}>
                    밤하늘의 빛나는 별들을 순서대로 이어 별자리를 완성하는 힐링 퍼즐!
                  </Text>
                  <Text style={[styles.playgroundCardReward, { color: '#4F46E5' }]}>
                    🎁 보상: 꿀잠 에너지 100% + 대량 EXP + 별똥별 선물
                  </Text>
                </View>
                <View style={[styles.playgroundPlayBtn, { backgroundColor: '#4F46E5' }]}>
                  <Play size={14} color="#FFF" fill="#FFF" />
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* 4. RADIAL FLOATING CARE HUB (1-Tap Quick Actions + 놀이터) */}
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
          {/* 1. Feed Button (1-Tap Quick Feed) */}
          <TouchableOpacity
            style={[
              styles.careMiniOrb,
              petAction === 'eating' && styles.careMiniOrbActive,
              (petAction === 'eating' || droppedFood !== null) && styles.careMiniOrbCooldown,
            ]}
            onPress={handleQuickFeed}
            activeOpacity={0.8}
          >
            <Utensils size={18} color="#EA580C" opacity={(petAction === 'eating' || droppedFood !== null) ? 0.45 : 1} />
            <Text style={[styles.careOrbLabel, { color: '#EA580C', opacity: (petAction === 'eating' || droppedFood !== null) ? 0.5 : 1 }]}>
              {petAction === 'eating' ? '식사중' : '밥주기'}
            </Text>
          </TouchableOpacity>

          {/* 2. Play Ball Button (1-Tap Quick Ball Toss) */}
          <TouchableOpacity
            style={[
              styles.careMiniOrb,
              (ballActive || petAction === 'playing') && styles.careMiniOrbActive,
              (ballActive || petAction === 'playing') && styles.careMiniOrbCooldown,
            ]}
            onPress={handleQuickPlay}
            activeOpacity={0.8}
          >
            <View style={{ opacity: (ballActive || petAction === 'playing') ? 0.45 : 1 }}>
              <SoccerBallIcon size={20} />
            </View>
            <Text style={[styles.careOrbLabel, { color: '#0284C7', opacity: (ballActive || petAction === 'playing') ? 0.5 : 1 }]}>
              {ballActive || petAction === 'playing' ? '놀이중' : '놀기'}
            </Text>
          </TouchableOpacity>

          {/* 3. Bath Button (1-Tap Quick Bubble Bath) */}
          <TouchableOpacity
            style={[
              styles.careMiniOrb,
              (petAction === 'bathing' || bathShowerActive) && styles.careMiniOrbActive,
              (petAction === 'bathing' || bathShowerActive) && styles.careMiniOrbCooldown,
            ]}
            onPress={handleQuickBath}
            activeOpacity={0.8}
          >
            <Droplets size={18} color="#0D9488" fill={petAction === 'bathing' ? '#99F6E4' : 'none'} opacity={(petAction === 'bathing' || bathShowerActive) ? 0.45 : 1} />
            <Text style={[styles.careOrbLabel, { color: '#0D9488', opacity: (petAction === 'bathing' || bathShowerActive) ? 0.5 : 1 }]}>
              {petAction === 'bathing' || bathShowerActive ? '목욕중' : '목욕'}
            </Text>
          </TouchableOpacity>

          {/* 4. Lights / Sleep Button (1-Tap Sleep/Wake Toggle) */}
          <TouchableOpacity
            style={[styles.careMiniOrb, isLightsOff && styles.careMiniOrbNight]}
            onPress={handleQuickSleep}
            activeOpacity={0.8}
          >
            {isLightsOff ? (
              <Sun size={18} color="#FBBF24" fill="#FBBF24" />
            ) : (
              <Moon size={18} color="#6366F1" fill="#6366F1" />
            )}
            <Text style={[styles.careOrbLabel, isLightsOff && { color: '#A5B4FC' }]}>
              {isLightsOff ? '불켜기' : '재우기'}
            </Text>
          </TouchableOpacity>

          {/* 5. Playground / Mini-Game Hub Button */}
          <TouchableOpacity
            style={[styles.careMiniOrb, { borderColor: '#EC4899', backgroundColor: '#FDF2F8' }]}
            onPress={() => {
              if (isMenuOpen) toggleMenu();
              setIsPlaygroundModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Gamepad2 size={18} color="#DB2777" />
            <Text style={[styles.careOrbLabel, { color: '#DB2777', fontWeight: '800' }]}>놀이터</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Master Floating Orb Button */}
        <TouchableOpacity
          style={[styles.masterOrbBtn, isMenuOpen && styles.masterOrbBtnActive]}
          onPress={toggleMenu}
          activeOpacity={0.85}
        >
          {isMenuOpen ? (
            <X size={24} color="#FFFFFF" strokeWidth={2.5} />
          ) : (
            <PawPrint size={24} color="#FFFFFF" fill="#FFFFFF" />
          )}
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

      {/* ------------------------------------------------------------- */}
      {/* 6. INTERACTIVE KEEPY-UPPY PING-PONG MINI-GAME MODAL */}
      {/* ------------------------------------------------------------- */}
      <KeepyUppyGame
        visible={isKeepyUppyGameVisible}
        character={character}
        transparentUrl={transparentUrl}
        onClose={() => setIsKeepyUppyGameVisible(false)}
        onGameComplete={({ score, exp, points, maxRally }) => {
          if (onUpdateVitals) {
            onUpdateVitals(prev => ({
              ...prev,
              happiness: 100,
              energy: Math.max(0, (prev.energy || 95) - 6),
            }));
          }
          if (onGainExp) onGainExp(exp);
          if (onAwardPoints) onAwardPoints(points, '핑퐁 리프팅 랠리');
          setPetAction('happy');
          setDialogue(`환상의 랠리였어요 몽! ${maxRally}회 연속 성공, ${score}점 달성! ⚽🎉`);
          spawnHeartToast(`+${exp} EXP & +${points}P 🏆`);
        }}
      />

      {/* ------------------------------------------------------------- */}
      {/* 7. INTERACTIVE BUBBLE POP MINI-GAME MODAL */}
      {/* ------------------------------------------------------------- */}
      <BubblePopGame
        visible={isBubbleGameVisible}
        character={character}
        transparentUrl={transparentUrl}
        onClose={() => setIsBubbleGameVisible(false)}
        onGameComplete={({ score, poppedCount, cleanliness, exp, points }) => {
          if (onUpdateVitals) {
            onUpdateVitals(prev => ({
              ...prev,
              cleanliness: 100,
              happiness: Math.min(100, (prev.happiness || 85) + 20),
            }));
          }
          if (onGainExp) onGainExp(exp);
          if (onAwardPoints) onAwardPoints(points, '뽀득뽀득 버블 팝');
          setPetAction('happy');
          setDialogue(`뽀득뽀득 기분 최고 몽! 청결도 100% 완충, ${poppedCount}개 버블 팝! 🫧✨`);
          spawnHeartToast(`+${exp} EXP & +${points}P 🧼`);
        }}
      />

      {/* ------------------------------------------------------------- */}
      {/* 8. INTERACTIVE DREAM CONSTELLATION MINI-GAME MODAL */}
      {/* ------------------------------------------------------------- */}
      <DreamConstellationGame
        visible={isDreamGameVisible}
        character={character}
        transparentUrl={transparentUrl}
        onClose={() => setIsDreamGameVisible(false)}
        onGameComplete={({ score, completedCount, exp, points }) => {
          if (onUpdateVitals) {
            onUpdateVitals(prev => ({
              ...prev,
              energy: 100,
              happiness: Math.min(100, (prev.happiness || 85) + 20),
            }));
          }
          if (onGainExp) onGainExp(exp);
          if (onAwardPoints) onAwardPoints(points, '꿈나라 별자리 잇기');
          setPetAction('sleeping');
          setDialogue(`반려몽이 아름다운 별자리 꿈을 꾸며 깊은 잠에 빠졌어요... 에너지 100% 완충! 🌙✨`);
          spawnHeartToast(`+${exp} EXP & +${points}P 🌙`);
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
    zIndex: 40,
  },
  nightLampTapTarget: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nightLampGlow: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(254, 240, 138, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(254, 240, 138, 0.45)',
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
  // Shower Rig & Water Streams
  showerRig: {
    position: 'absolute',
    top: -55,
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 60,
  },
  waterStreamsBox: {
    width: 46,
    height: 75,
    alignItems: 'center',
    overflow: 'hidden',
  },
  waterStreamLine: {
    position: 'absolute',
    top: 0,
    width: 2.5,
    backgroundColor: '#38BDF8',
    borderRadius: 1.5,
  },
  waterDropletsSprayRow: {
    position: 'absolute',
    bottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  // Foaming Bubbles on Pet Body
  soapBubbleOrb: {
    position: 'absolute',
    backgroundColor: 'rgba(224, 242, 254, 0.88)',
    borderWidth: 1.5,
    borderColor: '#7DD3FC',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 45,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  bubbleGlossLight: {
    position: 'absolute',
    top: 3,
    left: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    opacity: 0.9,
  },
  // Water Splash Particles
  splashDropletParticle: {
    position: 'absolute',
    top: 50,
    left: 50,
    zIndex: 50,
  },
  // Post-bath Sparkles & Gleam
  bathSparkleOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 55,
  },
  bathSparklePin: {
    position: 'absolute',
  },
  bathFreshHalo: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: 'rgba(56, 189, 248, 0.45)',
    backgroundColor: 'rgba(224, 242, 254, 0.15)',
  },
  // Dirty / Smudge Indicators
  dirtyStateContainer: {
    position: 'absolute',
    top: -18,
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 40,
  },
  dirtyStatePuff: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  dirtyStateText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
  },
  dustSpeck: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(100, 116, 139, 0.45)',
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
  conditionGrowthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginLeft: 6,
  },
  conditionGrowthBtnText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#2563EB',
  },
  conditionMiniPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  conditionMiniPillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  conditionMiniPillText: {
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
  careMiniOrbCooldown: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    opacity: 0.85,
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
  whisperDeliveryBadge: {
    position: 'absolute',
    top: -72,
    alignSelf: 'center',
    zIndex: 95,
  },
  whisperDeliveryInner: {
    alignItems: 'center',
  },
  whisperLetterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE4E8',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FF4D6D',
    shadowColor: '#FF4D6D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  whisperDeliveryTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E11D48',
  },
  whisperDeliveryHint: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#BE123C',
    marginTop: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },

  // Playground Modal Styles
  playgroundModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  playgroundModalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  playgroundHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  playgroundHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  playgroundCloseBtn: {
    padding: 4,
  },
  playgroundSubDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 17,
  },
  playgroundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  playgroundCardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playgroundCardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  playgroundTagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  playgroundTagBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  playgroundCardDesc: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
    lineHeight: 15,
  },
  playgroundCardReward: {
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 4,
  },
  playgroundPlayBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
