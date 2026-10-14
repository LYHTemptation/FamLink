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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { colors } from '../theme';
import Svg, { Circle, Line, G, Text as SvgText } from 'react-native-svg';
import {
  Heart,
  Sparkles,
  BookOpen,
  PawPrint,
  ChevronRight,
  Mail,
  Flame,
  Star,
  RotateCcw,
  Moon,
  Sun,
} from 'lucide-react-native';
import { getEvolutionStage, getEvolvedEmoji } from '../lib/petmongEvolution';
import { useTransparentImage } from '../lib/imageTransparencyService';
import {
  GUARDIAN_CONSTELLATIONS,
  PETTING_DIALOGUES,
  WarmthFruitIcon,
  FloatingHeartParticle,
  FloorTapRipple,
} from './petmong/petmongConstants';
import PetmongWarmthModal from './petmong/PetmongWarmthModal';
import styles from './petmong/PetmongStyles';
import { PetmongCharacter, PetmongVitals, PetmongWhisper, ChatMessage, UserProfile } from '../types/domain';

export interface FloorRipple {
  id: string;
  x: number;
  y: number;
}

export interface FloatingHeart {
  id: string;
  x: number;
  text: string;
}

export interface DragPos {
  x: number;
  y: number;
}

export interface PetmongGameEngineProps {
  character?: PetmongCharacter | any;
  owner?: UserProfile | any;
  isVisiting?: boolean;
  visitorCharacter?: PetmongCharacter | any | null;
  theme?: string;
  insets?: { top: number; bottom: number };
  vitals?: PetmongVitals | any;
  onUpdateVitals?: (newVitals: any) => void;
  onGainExp?: (amount: number, reason?: string) => void;
  onAwardPoints?: (amount: number, reason?: string) => void;
  onCareAction?: (action: string, bonusExp?: number) => void;
  onOpenGrowthBook?: (() => void) | null;
  unreadWhispers?: PetmongWhisper[] | any[];
  onOpenWhisper?: ((whisper: any) => void) | null;
  onOpenWriteWhisper?: (() => void) | null;
  messages?: ChatMessage[] | any[];
  smallTalkState?: any;
  onNavigateScreen?: ((screenName: string) => void) | null;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

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
  onCareAction,
  onOpenGrowthBook = null,
  unreadWhispers = [],
  onOpenWhisper = null,
  onOpenWriteWhisper = null,
  messages = [],
  smallTalkState = {},
  onNavigateScreen = null,
}: PetmongGameEngineProps) {
  const transparentCharImageUrl = useTransparentImage(character?.image_url);

  // -------------------------------------------------------------
  // 1. 가족 대화 흡수 & 온기 지수 (Sumone Family Warmth Analysis)
  // -------------------------------------------------------------
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayStartIso = useMemo(() => `${todayStr}T00:00:00.000Z`, [todayStr]);

  const todayMessages = useMemo(() => {
    return (messages || []).filter((m) => {
      const t = new Date(m.created_at || m.timestamp || Date.now()).getTime();
      return t >= todayStart;
    });
  }, [messages, todayStart]);

  const todayResponsesCount = useMemo(() => {
    const responses = smallTalkState?.responses || {};
    return Object.keys(responses).length;
  }, [smallTalkState]);

  const familyWarmth = useMemo(() => {
    const chatScore = Math.min(60, todayMessages.length * 10);
    const smallTalkScore = Math.min(40, todayResponsesCount * 20);
    return Math.min(100, Math.max(20, chatScore + smallTalkScore));
  }, [todayMessages.length, todayResponsesCount]);

  // 대화 온기 열매 일일 수확 상태 (AsyncStorage 영속화)
  const [hasHarvestedToday, setHasHarvestedToday] = useState(false);
  const harvestStorageKey = useMemo(
    () => `@famlink_warmth_harvest_${todayStr}_${character?.id || 'default'}`,
    [todayStr, character?.id]
  );

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(harvestStorageKey)
      .then((val) => {
        if (isMounted && val === 'true') {
          setHasHarvestedToday(true);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [harvestStorageKey]);

  const canHarvestFruit =
    !hasHarvestedToday && (todayMessages.length > 0 || todayResponsesCount > 0);

  // -------------------------------------------------------------
  // 2. State & Animation References (낮/밤 시간대 자동 연동 + 수동 토글 지원)
  // -------------------------------------------------------------
  const checkIsNightTime = useCallback(() => {
    const currentHour = new Date().getHours();
    return currentHour >= 22 || currentHour < 7 || theme === 'midnight' || theme === 'night';
  }, [theme]);

  const [isNightMode, setIsNightMode] = useState(checkIsNightTime);
  const isLightsOff = isNightMode;
  const [showWarmthModal, setShowWarmthModal] = useState(false);
  const [livingRoutine, setLivingRoutine] = useState(
    checkIsNightTime() ? 'napping' : 'happy'
  );

  // 쓰다듬기 콤보 & 바닥 탭 물결 리플 상태
  const [pettingCombo, setPettingCombo] = useState(0);
  const [floorRipples, setFloorRipples] = useState<FloorRipple[]>([]);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const comboResetTimerRef = useRef<any>(null);
  const particleTimersRef = useRef<Set<any>>(new Set());
  const nightReturnTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (comboResetTimerRef.current) clearTimeout(comboResetTimerRef.current);
      if (nightReturnTimerRef.current) clearTimeout(nightReturnTimerRef.current);
      particleTimersRef.current.forEach((t) => clearTimeout(t));
      particleTimersRef.current.clear();
    };
  }, []);

  // 오늘의 가족 수호 별자리 인룸 캔버스 상태
  const [constellationIndex, setConstellationIndex] = useState(() =>
    Math.floor(Math.random() * GUARDIAN_CONSTELLATIONS.length)
  );
  const currentConstellation =
    GUARDIAN_CONSTELLATIONS[constellationIndex] || GUARDIAN_CONSTELLATIONS[0];

  const [connectedStarIds, setConnectedStarIds] = useState([1]);
  const [dragCurrentPos, setDragCurrentPos] = useState<DragPos | null>(null);
  const [isConstCompleted, setIsConstCompleted] = useState(false);
  const [canvasLayout, setCanvasLayout] = useState({
    width: SCREEN_WIDTH,
    height: 230,
  });
  const constGlowAnim = useRef(new Animated.Value(1.0)).current;
  const isMouseActiveRef = useRef(false);

  const [hasAwardedConstExpToday, setHasAwardedConstExpToday] = useState(false);

  // 오늘 별자리 완성 EXP 보상을 이미 수령했는지 DB(petmong_activities) 및 로컬 캐시 확인
  useEffect(() => {
    let isMounted = true;
    const expKey = `@famlink_const_exp_${todayStr}`;

    const checkConstellationCompleted = async () => {
      if (character?.id) {
        try {
          const { data, error } = await supabase
            .from('petmong_activities')
            .select('id, action_type')
            .eq('actor_id', character.id)
            .gte('created_at', todayStartIso)
            .ilike('action_type', 'CONSTELLATION:%');

          if (!error && Array.isArray(data) && data.length > 0) {
            if (isMounted) {
              setHasAwardedConstExpToday(true);
              AsyncStorage.setItem(expKey, 'true').catch(() => {});
            }
            return;
          }
        } catch (e) {
          console.warn('Constellation db sync note:', e);
        }
      }

      AsyncStorage.getItem(expKey)
        .then((val) => {
          if (!isMounted) return;
          if (val === 'true') {
            setHasAwardedConstExpToday(true);
          }
        })
        .catch(() => {});
    };

    checkConstellationCompleted();
    return () => {
      isMounted = false;
    };
  }, [character?.id, todayStr, todayStartIso]);

  const [dialogue, setDialogue] = useState(
    unreadWhispers && unreadWhispers.length > 0
      ? '쉿! 저한테 몰래 맡겨진 비밀 귓속말이 있어요! 💌'
      : checkIsNightTime()
      ? '새근새근... 조용한 밤이에요. 천장의 수호 별자리를 스윽 이어보세요 zZ 🌙'
      : '가족들의 따뜻한 대화와 사랑을 먹고 자라는 중이에요 몽 💕'
  );

  // Main Pet Physics & Spring Animation Values
  const INITIAL_PET_X = Math.round(SCREEN_WIDTH * 0.5 - 70);
  const petPosX = useRef(new Animated.Value(INITIAL_PET_X)).current;
  const petScaleX = useRef(new Animated.Value(1)).current;
  const petScaleY = useRef(new Animated.Value(1)).current;
  const petHopY = useRef(new Animated.Value(0)).current;
  const petRotate = useRef(new Animated.Value(0)).current;

  // Fruit & Whisper & Star Bobbing
  const whisperBobAnim = useRef(new Animated.Value(0)).current;
  const fruitFloatAnim = useRef(new Animated.Value(0)).current;
  const lightsDimAnim = useRef(
    new Animated.Value(checkIsNightTime() ? 1 : 0)
  ).current;
  const starPulseAnim = useRef(new Animated.Value(0)).current;
  const lastActionTimeRef = useRef(0);

  // Visitor Pet Autonomous Physics Animations
  const visitorPosX = useRef(
    new Animated.Value(Math.round(SCREEN_WIDTH * 0.16))
  ).current;
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
  // 3. Loops: Whisper & Fruit Floating Bob + Visitor Pet Wandering
  // -------------------------------------------------------------
  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(fruitFloatAnim, {
          toValue: -8,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(fruitFloatAnim, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
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
          Animated.timing(whisperBobAnim, {
            toValue: -6,
            duration: 600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(whisperBobAnim, {
            toValue: 0,
            duration: 600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [unreadWhispers, whisperBobAnim]);

  // 방문자 반려몽 자율 산책 및 홉 애니메이션 루프
  useEffect(() => {
    if (!isVisiting || !visitorCharacter) return;

    const wanderInterval = setInterval(() => {
      const nextX = Math.round(
        SCREEN_WIDTH * (0.12 + Math.random() * 0.55)
      );
      Animated.parallel([
        Animated.timing(visitorScaleX, {
          toValue: Math.random() > 0.5 ? 1 : -1,
          duration: 120,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(visitorPosX, {
          toValue: nextX,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.sequence([
          Animated.timing(visitorHopY, {
            toValue: -14,
            duration: 220,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(visitorHopY, {
            toValue: 0,
            duration: 220,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(visitorHopY, {
            toValue: -12,
            duration: 220,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(visitorHopY, {
            toValue: 0,
            duration: 220,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
      ]).start();
    }, 6500);

    return () => clearInterval(wanderInterval);
  }, [isVisiting, visitorCharacter, visitorPosX, visitorHopY, visitorScaleX]);

  // -------------------------------------------------------------
  // 4. Idle Breathing & Waddle Walk Physics
  // -------------------------------------------------------------
  useEffect(() => {
    if (isLightsOff || livingRoutine === 'napping') {
      const sleepLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(petScaleY, {
            toValue: 0.88,
            duration: 1300,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(petScaleY, {
            toValue: 0.96,
            duration: 1300,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ])
      );
      sleepLoop.start();
      return () => sleepLoop.stop();
    }

    const idleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(petScaleY, {
          toValue: 1.04,
          duration: 850,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(petScaleY, {
          toValue: 0.98,
          duration: 850,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    idleLoop.start();
    return () => idleLoop.stop();
  }, [isLightsOff, livingRoutine, petScaleY]);

  // 총총걸음 + 좌우 갸우뚱(Waddle Tilt) + 착지 탄성 물리 보행 엔진
  const walkToPosition = useCallback(
    (targetX: number, onFinish?: () => void, speedMultiplier = 1) => {
      const clampedTargetX = Math.max(
        16,
        Math.min(SCREEN_WIDTH - 150, targetX)
      );
      const startX = currentPetXRef.current;
      const distance = Math.abs(clampedTargetX - startX);
      if (distance < 10) {
        if (onFinish) onFinish();
        return;
      }

      Animated.timing(petScaleX, {
        toValue: clampedTargetX > startX ? 1 : -1,
        duration: 120,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();

      const duration = Math.max(
        650,
        Math.min(2200, distance / 0.21 / speedMultiplier)
      );
      const hopCycles = Math.max(2, Math.floor(duration / 250));
      const hopSeq = [];
      const tiltSeq = [];

      for (let i = 0; i < hopCycles; i++) {
        const tiltDir = i % 2 === 0 ? 0.55 : -0.55;
        hopSeq.push(
          Animated.timing(petHopY, {
            toValue: -14,
            duration: 125,
            easing: Easing.out(Easing.quad),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(petHopY, {
            toValue: 0,
            duration: 125,
            easing: Easing.in(Easing.quad),
            useNativeDriver: USE_NATIVE_DRIVER,
          })
        );
        tiltSeq.push(
          Animated.timing(petRotate, {
            toValue: tiltDir,
            duration: 125,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(petRotate, {
            toValue: 0,
            duration: 125,
            useNativeDriver: USE_NATIVE_DRIVER,
          })
        );
      }

      Animated.parallel([
        Animated.sequence(hopSeq),
        Animated.sequence(tiltSeq),
        Animated.timing(petPosX, {
          toValue: clampedTargetX,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          petHopY.setValue(0);
          petRotate.setValue(0);
          if (onFinish) onFinish();
        }
      });
    },
    [petPosX, petScaleX, petHopY, petRotate]
  );

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
          setDialogue(
            '가족들이 남긴 소중한 말들을 몽이 비밀 일기장에 적는 중이에요 몽 ✍️'
          );
        } else if (nextRoutine === 'photo') {
          setDialogue(
            '가족들과 함께 찍은 사진을 보면 가슴이 뭉클하고 따뜻해져요 💕'
          );
        } else if (nextRoutine === 'window') {
          setDialogue(
            '창밖 햇살이 너무 포근해요! 오늘도 우리 가족 모두 좋은 하루 되길 ☀️'
          );
        } else if (nextRoutine === 'napping') {
          setDialogue(
            '새근새근... 가족들과 다 함께 소풍 가는 꿈을 꾸고 있어요 zZ'
          );
        } else {
          setDialogue(
            '가족들과 함께 있는 이 거실이 세상에서 제일 따뜻해요 ☕'
          );
        }
      });
    }, 20000);

    return () => clearInterval(routineInterval);
  }, [isLightsOff, walkToPosition, INITIAL_PET_X]);

  // -------------------------------------------------------------
  // 6. Particle Emitter (애니메이션 하트 파티클 & 바닥 물결 리플)
  // -------------------------------------------------------------
  const spawnHeartToast = useCallback((text = '+EXP') => {
    const id = `heart_${Date.now()}_${Math.random()}`;
    const x = Math.max(
      20,
      Math.min(
        SCREEN_WIDTH - 110,
        currentPetXRef.current + 45 + (Math.random() * 44 - 22)
      )
    );
    setFloatingHearts((prev) => [...prev.slice(-6), { id, x, text }]);
    const timer = setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== id));
      particleTimersRef.current.delete(timer);
    }, 1300);
    particleTimersRef.current.add(timer);
  }, []);

  const spawnFloorRipple = useCallback((x: number, y: number) => {
    const id = `ripple_${Date.now()}_${Math.random()}`;
    setFloorRipples((prev) => [...prev.slice(-4), { id, x, y }]);
    const timer = setTimeout(() => {
      setFloorRipples((prev) => prev.filter((r) => r.id !== id));
      particleTimersRef.current.delete(timer);
    }, 650);
    particleTimersRef.current.add(timer);
  }, []);

  // -------------------------------------------------------------
  // 7. 대화 온기 수확 (Harvest Conversation Fruit)
  // -------------------------------------------------------------
  const handleHarvestWarmth = () => {
    if (hasHarvestedToday) {
      spawnHeartToast('오늘 대화 온기를 이미 수확했어요! 💖');
      setShowWarmthModal(true);
      return;
    }
    if (!canHarvestFruit) {
      spawnHeartToast('아직 오늘 나눈 대화가 없어요! 💬');
      setDialogue(
        '가족들이 단톡방이나 스몰톡에서 대화를 나누면 달콤한 대화 열매가 열려요 몽! 🌟'
      );
      setShowWarmthModal(true);
      return;
    }

    setHasHarvestedToday(true);
    AsyncStorage.setItem(harvestStorageKey, 'true').catch(() => {});
    const expGain = 30;

    if (onGainExp) onGainExp(expGain);
    if (onAwardPoints) onAwardPoints(30, '반려몽 대화 온기 열매 수확');
    if (onUpdateVitals) {
      onUpdateVitals((prev: any) => ({
        ...prev,
        happiness: 100,
        energy: 100,
      }));
    }

    spawnHeartToast(`+${expGain} EXP 대화 온기 수확! 💖`);
    setDialogue(
      `오늘 가족들이 나눈 ${todayMessages.length}개의 대화와 스몰톡 온기를 듬뿍 먹고 쑥쑥 자랐어요! 몽글몽글 사랑해요 몽 💕✨`
    );

    Animated.sequence([
      Animated.timing(petHopY, {
        toValue: -32,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(petHopY, {
        toValue: 0,
        duration: 240,
        easing: Easing.bounce,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start();
  };

  // -------------------------------------------------------------
  // 8. 🌙 낮/밤 조명 전환 & 거실 바닥 탭 호출 인터랙션
  // -------------------------------------------------------------
  const handleToggleNightLights = () => {
    if (nightReturnTimerRef.current) clearTimeout(nightReturnTimerRef.current);
    const nextNight = !isNightMode;
    setIsNightMode(nextNight);
    Animated.timing(lightsDimAnim, {
      toValue: nextNight ? 1 : 0,
      duration: 650,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();

    if (nextNight) {
      setLivingRoutine('napping');
      setDialogue(
        isConstCompleted
          ? '조명을 낮춰 은하수 별빛을 밝혔어요 🌙 몽이가 포근하게 자고 있어요 zZ'
          : '조명을 살짝 낮췄어요 🌙 천장에 떠오른 수호 별자리를 순서대로 이어보세요 ✨'
      );
      spawnHeartToast('밤하늘 별자리 모드 🌙');
    } else {
      setLivingRoutine('happy');
      setDialogue('거실 조명이 환하게 켜졌어요! 바닥을 탭하면 제가 총총 달려가요 🐾');
      spawnHeartToast('따스한 거실 조명 ☀️');
    }
  };

  // 거실 바닥을 탭하면 해당 위치로 반려몽이 총총걸음으로 달려오는 인터랙션
  const handleRoomFloorTap = (e: any) => {
    const now = Date.now();
    if (now - lastActionTimeRef.current < 420) return;
    lastActionTimeRef.current = now;

    const nativeEv = e?.nativeEvent;
    const tapX =
      nativeEv?.locationX ?? nativeEv?.pageX ?? SCREEN_WIDTH * 0.5;
    const tapY =
      nativeEv?.locationY ?? nativeEv?.pageY ?? 420;

    spawnFloorRipple(tapX, tapY);

    if (isNightMode) {
      setDialogue(
        '새근새근... 조용한 밤이에요. 위쪽 밤하늘의 수호 별자리를 스윽 이어보세요 zZ 🌙'
      );
      spawnHeartToast('+포근한 밤 🌙');
      Animated.sequence([
        Animated.timing(petHopY, {
          toValue: -12,
          duration: 150,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(petHopY, {
          toValue: 0,
          duration: 170,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start();
      return;
    }

    const targetPetX = tapX - 70;
    setLivingRoutine('happy');
    walkToPosition(
      targetPetX,
      () => {
        setDialogue('부르셨나요? 총총총 달려왔어요 몽! 쓰담쓰담 해주세요 🐾💕');
        spawnHeartToast('총총총! 🐾');
      },
      1.25
    );
  };

  // 마운트 시 밤 시간대 조명 동기화: 별자리 완성 여부와 관계없이 밤 시간대라면 아늑한 밤 조명 유지
  useEffect(() => {
    if (checkIsNightTime()) {
      setIsNightMode(true);
      setLivingRoutine('napping');

      Animated.timing(lightsDimAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
    } else {
      setIsNightMode(false);
      lightsDimAnim.setValue(0);
    }
  }, [checkIsNightTime, lightsDimAnim]);

  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (isNightMode) {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(starPulseAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(starPulseAnim, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ])
      );
      anim.start();
    } else {
      starPulseAnim.setValue(0);
    }
    return () => anim?.stop?.();
  }, [isNightMode, starPulseAnim]);

  // -------------------------------------------------------------
  // 9. 인룸 수호 별자리 잇기 (In-Room Constellation Tracing)
  // -------------------------------------------------------------
  const processConstellationPoint = (x: number, y: number) => {
    if (isConstCompleted) return;
    setDragCurrentPos({ x, y });

    const stars = currentConstellation.stars;
    const w = canvasLayout.width || SCREEN_WIDTH;
    const h = canvasLayout.height || 230;

    const currentList = connectedStarIds;
    if (currentList.length === 0) {
      const star1 = stars[0];
      const s1x = star1.normX * w;
      const s1y = star1.normY * h;
      if (Math.hypot(x - s1x, y - s1y) < 38) {
        setConnectedStarIds([star1.id]);
        spawnHeartToast('✨ 첫 번째 별 연결!');
      }
      return;
    }

    const lastConnectedId = currentList[currentList.length - 1];
    if (lastConnectedId < stars.length) {
      const nextStar = stars.find((s) => s.id === lastConnectedId + 1);
      if (nextStar) {
        const nx = nextStar.normX * w;
        const ny = nextStar.normY * h;
        if (Math.hypot(x - nx, y - ny) < 38) {
          const nextList = [...currentList, nextStar.id];
          setConnectedStarIds(nextList);

          if (nextList.length === stars.length) {
            handleCompleteInRoomConstellation();
          } else {
            spawnHeartToast(`✨ ${nextStar.id}번 별 연결!`);
          }
        }
      }
    }
  };

  const handleCompleteInRoomConstellation = () => {
    setIsConstCompleted(true);
    setDragCurrentPos(null);

    Animated.parallel([
      Animated.timing(lightsDimAnim, {
        toValue: 0,
        duration: 1100,
        easing: Easing.out(Easing.ease),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.sequence([
        Animated.timing(constGlowAnim, {
          toValue: 1.45,
          duration: 400,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(constGlowAnim, {
          toValue: 1.0,
          duration: 700,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    ]).start();

    const isFirstTimeToday = !hasAwardedConstExpToday;
    const awardedExp = isFirstTimeToday ? 35 : 0;
    if (awardedExp > 0 && onGainExp) {
      onGainExp(awardedExp);
    }
    if (onUpdateVitals) {
      onUpdateVitals((prev: any) => ({
        ...prev,
        energy: 100,
        happiness: 100,
      }));
    }

    if (isFirstTimeToday) {
      setHasAwardedConstExpToday(true);
      const expKey = `@famlink_const_exp_${todayStr}`;
      AsyncStorage.setItem(expKey, 'true').catch(() => {});
      spawnHeartToast(`+${awardedExp} EXP [${currentConstellation.name}] 완성! 🌟`);
      setDialogue(
        `별자리가 완성되어 은하수가 환하게 빛났어요! "${currentConstellation.meaning}"의 별빛 축복으로 몽이의 꿀잠 에너지가 충전됐어요 몽 🌟✨`
      );

      // Supabase petmong_activities 정규 컬럼(family_id, actor_id, action_type)으로 저장
      if (character?.id && character?.family_id) {
        supabase
          .from('petmong_activities')
          .insert({
            family_id: character.family_id,
            actor_id: character.id,
            action_type: `CONSTELLATION:${currentConstellation.id}`,
          })
          .then(
            () => {},
            (e) => console.warn('Constellation log error:', e)
          );
      }
    } else {
      spawnHeartToast(`[${currentConstellation.name}] 완성! 🌟`);
      setDialogue(
        `새로운 별자리가 완성되어 은하수가 포근하게 빛났어요! "${currentConstellation.meaning}"의 별빛을 받으며 몽이가 쉬고 있어요 몽 🌟✨`
      );
    }

    // 🌟 5초간 환한 축하 후, 다음 별자리로 자동 리셋되어 언제든 새로 이을 수 있게 전환
    if (nightReturnTimerRef.current) clearTimeout(nightReturnTimerRef.current);
    nightReturnTimerRef.current = setTimeout(() => {
      const nextIdx = (constellationIndex + 1) % GUARDIAN_CONSTELLATIONS.length;
      setConstellationIndex(nextIdx);
      setIsConstCompleted(false);
      setConnectedStarIds([1]);
      setDragCurrentPos(null);

      if (checkIsNightTime() || isNightMode) {
        Animated.timing(lightsDimAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }).start();
        setLivingRoutine('napping');
        setDialogue(
          `몽이가 은하수 별빛을 받으며 다시 포근하게 잠들었어요 zZ 🌙 새로운 별자리 "${GUARDIAN_CONSTELLATIONS[nextIdx]?.name}"를 이어보세요 ✨`
        );
        spawnHeartToast(`새로운 별자리: ${GUARDIAN_CONSTELLATIONS[nextIdx]?.name} ✨`);
      }
    }, 5000);
  };

  const handleResetConstellation = () => {
    if (nightReturnTimerRef.current) clearTimeout(nightReturnTimerRef.current);
    const nextIdx = (constellationIndex + 1) % GUARDIAN_CONSTELLATIONS.length;
    setConstellationIndex(nextIdx);
    setIsConstCompleted(false);
    setConnectedStarIds([1]);
    setDragCurrentPos(null);
    Animated.timing(lightsDimAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
    spawnHeartToast(
      `새로운 수호 별자리: ${GUARDIAN_CONSTELLATIONS[nextIdx]?.name} ✨`
    );
    setDialogue(
      `새로운 수호 별자리 "${GUARDIAN_CONSTELLATIONS[nextIdx]?.name}"가 밤하늘에 떠올랐어요 🌙 별을 순서대로 이어보세요 ✨`
    );
  };

  const handleConstellationTouch = (e: any) => {
    if (isConstCompleted) return;
    const t = e.nativeEvent?.touches?.[0] || e.nativeEvent;
    const x = t.locationX != null ? t.locationX : t.pageX || 0;
    const y = t.locationY != null ? t.locationY : t.pageY ? t.pageY - 55 : 0;
    processConstellationPoint(x, y);
  };

  const handleConstellationWebMouse = (e: any) => {
    if (isConstCompleted) return;
    const x =
      e.nativeEvent?.offsetX ?? (e.nativeEvent?.locationX ?? (e.clientX || 0));
    const y =
      e.nativeEvent?.offsetY ??
      (e.nativeEvent?.locationY ?? (e.clientY ? e.clientY - 55 : 0));
    processConstellationPoint(x, y);
  };

  const handleConstellationTouchEnd = () => {
    isMouseActiveRef.current = false;
    setDragCurrentPos(null);
  };

  const connectedConstellationLines = useMemo(() => {
    const lines = [];
    const stars = currentConstellation.stars;
    const w = canvasLayout.width || SCREEN_WIDTH;
    const h = canvasLayout.height || 230;

    for (let i = 0; i < connectedStarIds.length - 1; i++) {
      const s1 = stars.find((s) => s.id === connectedStarIds[i]);
      const s2 = stars.find((s) => s.id === connectedStarIds[i + 1]);
      if (s1 && s2) {
        lines.push({
          id: `line_${s1.id}_${s2.id}`,
          x1: s1.normX * w,
          y1: s1.normY * h,
          x2: s2.normX * w,
          y2: s2.normY * h,
        });
      }
    }
    return lines;
  }, [connectedStarIds, currentConstellation, canvasLayout]);

  const lastConnectedStar = useMemo(() => {
    const lastId = connectedStarIds[connectedStarIds.length - 1];
    return currentConstellation.stars.find((s) => s.id === lastId);
  }, [connectedStarIds, currentConstellation]);

  const dragStartPoint = useMemo(() => {
    if (!lastConnectedStar) return null;
    const w = canvasLayout.width || SCREEN_WIDTH;
    const h = canvasLayout.height || 230;
    return {
      x: lastConnectedStar.normX * w,
      y: lastConnectedStar.normY * h,
    };
  }, [lastConnectedStar, canvasLayout]);

  const nextTargetStarId = useMemo(() => {
    const lastId = connectedStarIds[connectedStarIds.length - 1] || 0;
    return lastId < currentConstellation.stars.length ? lastId + 1 : null;
  }, [connectedStarIds, currentConstellation]);

  // -------------------------------------------------------------
  // 10. 반려몽 2D 젤리 스쿼시 & 쓰다듬기 콤보 물리 (Petting Combo Engine)
  // -------------------------------------------------------------
  const handlePetPress = () => {
    if (unreadWhispers && unreadWhispers.length > 0 && typeof onOpenWhisper === 'function') {
      onOpenWhisper(unreadWhispers[0]);
      return;
    }

    const nextCombo = pettingCombo + 1;
    setPettingCombo(nextCombo);

    if (comboResetTimerRef.current) clearTimeout(comboResetTimerRef.current);
    comboResetTimerRef.current = setTimeout(() => {
      setPettingCombo(0);
    }, 3500);

    // 2D Jelly Squash & Stretch + Happy Waggle Physics
    Animated.parallel([
      Animated.sequence([
        Animated.timing(petScaleY, {
          toValue: 0.78,
          duration: 95,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.spring(petScaleY, {
          toValue: 1.0,
          friction: 4,
          tension: 160,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
      Animated.sequence([
        Animated.timing(petHopY, {
          toValue: nextCombo % 5 === 0 ? -26 : -14,
          duration: 130,
          easing: Easing.out(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(petHopY, {
          toValue: 0,
          duration: 170,
          easing: Easing.bounce,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
      Animated.sequence([
        Animated.timing(petRotate, {
          toValue: -0.8,
          duration: 70,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(petRotate, {
          toValue: 0.8,
          duration: 90,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(petRotate, {
          toValue: 0,
          duration: 80,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    ]).start();

    if (nextCombo % 5 === 0) {
      if (onGainExp) onGainExp(5);
      spawnHeartToast(`🔥 ${nextCombo}콤보 행복 폭발! +5 EXP 💖`);
      setDialogue(
        `${nextCombo}번 연속 쓰담쓰담이라니! 사랑이 넘쳐서 경험치(+5 EXP)가 쑥 올랐어요 몽 💖✨`
      );
    } else {
      const msg =
        PETTING_DIALOGUES[(nextCombo - 1) % PETTING_DIALOGUES.length];
      setDialogue(msg);
      spawnHeartToast(
        nextCombo > 1 ? `쓰담쓰담 x${nextCombo} 💕` : '+친밀도 💕'
      );
    }
  };

  if (!character) return null;

  const stage = getEvolutionStage(character.level || 1);
  const evolvedEmoji = getEvolvedEmoji(
    character.emoji || '🐶',
    character.level || 1
  );

  return (
    <View style={styles.engineContainer} pointerEvents="box-none">
      {/* 1. Real-time Lights Out Darkness Overlay */}
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
      />

      {/* 🌟 밤 시간대 / 야간 모드: 인룸 천장 수호 별자리 캔버스 */}
      {isNightMode && (
        <View
          style={[styles.inRoomConstellationCanvas, { width: SCREEN_WIDTH }]}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (width > 0 && height > 0) {
              setCanvasLayout({ width, height });
            }
          }}
          onTouchStart={handleConstellationTouch}
          onTouchMove={handleConstellationTouch}
          onTouchEnd={handleConstellationTouchEnd}
          {...({
            onMouseDown: (e: any) => {
              isMouseActiveRef.current = true;
              handleConstellationWebMouse(e);
            },
            onMouseMove: (e: any) => {
              if (isMouseActiveRef.current) handleConstellationWebMouse(e);
            },
            onMouseUp: handleConstellationTouchEnd,
            onMouseLeave: handleConstellationTouchEnd,
          } as any)}
        >
          <View style={styles.constellationHeaderRow} pointerEvents="box-none">
            {!isConstCompleted ? (
              <View style={styles.constellationHeaderPill}>
                <Sparkles size={12} color="#FDE047" fill="#FDE047" />
                <Text
                  style={styles.constellationHeaderText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  수호 별자리: {currentConstellation.name} · 별을 순서대로 이어보세요
                </Text>
              </View>
            ) : (
              <View style={styles.constellationCompletedRow}>
                <View style={styles.constellationHeaderPillDone}>
                  <Star size={12} color="#FDE047" fill="#FDE047" />
                  <Text
                    style={styles.constellationHeaderTextDone}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {currentConstellation.name} 완성! ✨ {currentConstellation.meaning}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleResetConstellation}
                  style={styles.constellationResetBtn}
                  activeOpacity={0.7}
                >
                  <RotateCcw size={11} color="#FEF08A" />
                  <Text style={styles.constellationResetText}>다음 별자리</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <Svg
            width={canvasLayout.width}
            height={canvasLayout.height}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            {connectedConstellationLines.map((line) => (
              <Line
                key={line.id}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={isConstCompleted ? '#FDE047' : '#93C5FD'}
                strokeWidth={isConstCompleted ? 2.8 : 2.2}
                strokeLinecap="round"
                opacity={isConstCompleted ? 0.95 : 0.85}
              />
            ))}

            {dragStartPoint && dragCurrentPos && (
              <Line
                x1={dragStartPoint.x}
                y1={dragStartPoint.y}
                x2={dragCurrentPos.x}
                y2={dragCurrentPos.y}
                stroke="#FDE047"
                strokeWidth={2.2}
                strokeDasharray="4, 4"
                strokeLinecap="round"
                opacity={0.9}
              />
            )}

            {currentConstellation.stars.map((star) => {
              const sx = star.normX * canvasLayout.width;
              const sy = star.normY * canvasLayout.height;
              const isConnected = connectedStarIds.includes(star.id);
              const isNext = star.id === nextTargetStarId;

              return (
                <G key={`star_${star.id}`}>
                  {isConnected && (
                    <Circle
                      cx={sx}
                      cy={sy}
                      r={isConstCompleted ? 14 : 11}
                      fill={
                        isConstCompleted
                          ? 'rgba(253, 224, 71, 0.35)'
                          : 'rgba(147, 197, 253, 0.35)'
                      }
                    />
                  )}
                  {isNext && (
                    <Circle cx={sx} cy={sy} r={13} fill="rgba(253, 224, 71, 0.3)" />
                  )}
                  <Circle
                    cx={sx}
                    cy={sy}
                    r={isConnected ? (isConstCompleted ? 6.5 : 5.5) : isNext ? 5.5 : 4}
                    fill={isConnected ? '#FDE047' : isNext ? '#FEF08A' : '#CBD5E1'}
                    stroke={isConnected ? '#FFFFFF' : '#94A3B8'}
                    strokeWidth={1.5}
                  />
                  <SvgText
                    x={sx}
                    y={sy - 9}
                    fill={isConnected ? '#FEF08A' : isNext ? '#FDE047' : '#94A3B8'}
                    fontSize="10"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {star.id}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        </View>
      )}

      {/* 2. Fullscreen Interactive Room Canvas (바닥 탭 시 반려몽 호출 이동) */}
      <TouchableOpacity
        activeOpacity={1}
        style={styles.roomGameField}
        onPress={handleRoomFloorTap}
      >
        {isVisiting && (
          <View style={styles.visitingFloatingPill}>
            <Heart size={13} color="#FF4D6D" fill="#FF4D6D" />
            <Text style={styles.visitingPillText}>
              {owner?.name || '가족'} 님의 방 놀러옴 • 소통 선물 가능
            </Text>
          </View>
        )}

        {/* 바닥 터치 물결 리플 */}
        {floorRipples.map((r) => (
          <FloorTapRipple key={r.id} ripple={r} />
        ))}

        {/* 부유 애니메이션 하트 / EXP 파티클 */}
        {floatingHearts.map((h) => (
          <FloatingHeartParticle key={h.id} item={h} />
        ))}

        {/* MAIN PET SPRITE ACTOR */}
        {character && (
          <Animated.View
            style={[
              styles.petActorContainer,
              {
                transform: [{ translateX: petPosX }, { translateY: petHopY }],
              },
            ]}
          >
            {/* Secret Whisper Courier Badge */}
            {unreadWhispers && unreadWhispers.length > 0 && (
              <TouchableOpacity
                style={styles.whisperDeliveryBadge}
                onPress={() => onOpenWhisper?.(unreadWhispers[0])}
                activeOpacity={0.85}
              >
                <Animated.View
                  style={[
                    styles.whisperDeliveryInner,
                    { transform: [{ translateY: whisperBobAnim }] },
                  ]}
                >
                  <View style={styles.whisperLetterPill}>
                    <Text style={{ fontSize: 15, marginRight: 4 }}>💌</Text>
                    <Text style={styles.whisperDeliveryTitle}>
                      비밀 귓속말 ({unreadWhispers.length})
                    </Text>
                  </View>
                  <Text style={styles.whisperDeliveryHint}>탭해서 편지 열기 🤫</Text>
                </Animated.View>
              </TouchableOpacity>
            )}

            {/* Conversation Warmth Fruit Bead */}
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

            {/* 연속 쓰다듬기 콤보 배지 */}
            {pettingCombo >= 2 && (
              <View style={styles.pettingComboBadge}>
                <Flame size={11} color={colors.primary} fill={colors.primary} />
                <Text style={styles.pettingComboText}>
                  쓰담쓰담 {pettingCombo} COMBO!
                </Text>
              </View>
            )}

            {/* Thought Bubble / Dialogue */}
            <TouchableOpacity
              style={styles.petSpeechBubble}
              activeOpacity={0.85}
              onPress={() => setShowWarmthModal(true)}
            >
              <Text style={styles.petSpeechText}>{dialogue}</Text>
              <View style={styles.petSpeechArrow} />
            </TouchableOpacity>

            {/* Stage 4 Guardian Aura */}
            {stage.stage === 4 && <View style={styles.guardianAura} />}

            {/* Pet Sprite Touch Area */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handlePetPress}
              style={styles.petTouchWrapper}
            >
              <TouchableOpacity
                style={[
                  styles.stageBadge,
                  {
                    backgroundColor: stage.badgeColor,
                    flexDirection: 'row',
                    alignItems: 'center',
                  },
                ]}
                onPress={() => {
                  onOpenGrowthBook?.();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.stageBadgeText}>
                  Lv.{character.level || 1} • {stage.name}
                </Text>
                <BookOpen size={9} color="#FFFFFF" style={{ marginLeft: 3 }} />
              </TouchableOpacity>

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
                <Animated.View
                  style={{
                    transform: [{ scaleX: petScaleX }, { scale: stage.scale }],
                    mixBlendMode: 'multiply',
                  }}
                >
                  {character.image_url ? (
                    Platform.OS === 'web' ? (
                      <img
                        src={transparentCharImageUrl || character.image_url}
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
                        source={{ uri: transparentCharImageUrl || character.image_url }}
                        style={styles.petImageSprite}
                        resizeMode="contain"
                      />
                    )
                  ) : (
                    <Text style={styles.petEmojiSprite}>{evolvedEmoji}</Text>
                  )}
                </Animated.View>

                {livingRoutine === 'reading' && (
                  <TouchableOpacity
                    style={[
                      styles.routinePill,
                      { backgroundColor: '#EDE9FE', borderColor: '#C4B5FD' },
                    ]}
                    onPress={() => onNavigateScreen?.('smalltalk')}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.routineEmoji}>📖</Text>
                    <Text style={[styles.routineText, { color: '#6D28D9' }]}>
                      스몰톡 읽는 중
                    </Text>
                    <ChevronRight size={10} color="#6D28D9" />
                  </TouchableOpacity>
                )}
                {livingRoutine === 'photo' && (
                  <TouchableOpacity
                    style={[
                      styles.routinePill,
                      { backgroundColor: '#FCE7F3', borderColor: '#FBCFE8' },
                    ]}
                    onPress={() => onNavigateScreen?.('album')}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.routineEmoji}>🖼️</Text>
                    <Text style={[styles.routineText, { color: '#BE185D' }]}>
                      가족 앨범 구경
                    </Text>
                    <ChevronRight size={10} color="#BE185D" />
                  </TouchableOpacity>
                )}
                {livingRoutine === 'window' && (
                  <TouchableOpacity
                    style={[
                      styles.routinePill,
                      { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' },
                    ]}
                    onPress={() => onNavigateScreen?.('calendar')}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.routineEmoji}>🪟</Text>
                    <Text style={[styles.routineText, { color: '#B45309' }]}>
                      가족 일정 확인
                    </Text>
                    <ChevronRight size={10} color="#B45309" />
                  </TouchableOpacity>
                )}
                {livingRoutine === 'napping' && (
                  <TouchableOpacity
                    style={[
                      styles.routinePill,
                      { backgroundColor: '#E0E7FF', borderColor: '#C7D2FE' },
                    ]}
                    onPress={() => onNavigateScreen?.('family')}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.routineEmoji}>💤</Text>
                    <Text style={[styles.routineText, { color: '#4338CA' }]}>
                      가족 공간 산책
                    </Text>
                    <ChevronRight size={10} color="#4338CA" />
                  </TouchableOpacity>
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
            <View
              style={[
                styles.visitorBadge,
                { flexDirection: 'row', alignItems: 'center' },
              ]}
            >
              <PawPrint
                size={11}
                color="#4F46E5"
                fill="#4F46E5"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.visitorBadgeText}>내 반려몽 놀러옴</Text>
            </View>
            <Animated.View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ scaleX: visitorScaleX }],
              }}
            >
              <Text style={styles.visitorEmoji}>
                {visitorCharacter.emoji || '🐶'}
              </Text>
            </Animated.View>
          </Animated.View>
        )}
      </TouchableOpacity>

      {/* 3. SUMONE-STYLE FLOATING HUB BAR (가족 온기 수확 & 밤/낮 조명 & 귓속말) */}
      <View style={styles.floatingWarmthBar} pointerEvents="box-none">
        {/* 1. 대화 온기 수확 / 리포트 버튼 */}
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
            <Text style={styles.warmthActionBtnLabel}>
              {canHarvestFruit ? '온기 수확!' : '가족 온기'}
            </Text>
            <Text style={styles.warmthActionBtnVal}>{familyWarmth}%</Text>
          </View>
        </TouchableOpacity>

        {/* 2. 밤/낮 조명 & 별자리 모드 전환 버튼 */}
        <TouchableOpacity
          style={[
            styles.warmthActionBtn,
            isNightMode && styles.warmthActionBtnNight,
          ]}
          onPress={handleToggleNightLights}
          activeOpacity={0.8}
        >
          {isNightMode ? (
            <Sun size={19} color="#FDE047" />
          ) : (
            <Moon size={19} color="#6366F1" />
          )}
          <View>
            <Text
              style={[
                styles.warmthActionBtnLabel,
                isNightMode && { color: '#CBD5E1' },
              ]}
            >
              {isNightMode ? '별자리 밤' : '거실 조명'}
            </Text>
            <Text
              style={[
                styles.warmthActionBtnVal,
                { color: isNightMode ? '#FDE047' : '#6366F1' },
              ]}
            >
              {isNightMode ? '불 켜기' : '불 끄기'}
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
              <Text style={[styles.warmthActionBtnVal, { color: '#EC4899' }]}>
                편지 쓰기
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* 4. 가족 온기 & 대화 성장 상세 모달 */}
      <PetmongWarmthModal
        visible={showWarmthModal}
        onClose={() => setShowWarmthModal(false)}
        characterName={character.name}
        characterLevel={character.level || 1}
        familyWarmth={familyWarmth}
        todayMessagesCount={todayMessages.length}
        todayResponsesCount={todayResponsesCount}
        onOpenGrowthBook={onOpenGrowthBook}
        onOpenWriteWhisper={onOpenWriteWhisper}
      />
    </View>
  );
}
