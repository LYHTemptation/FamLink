import styles from './InteriorStyles';
import React, { useState, useRef, useEffect } from 'react';
import UserAvatar from './UserAvatar';
import PetmongGameEngine from './PetmongGameEngine';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  PanResponder,
  Dimensions,
  Animated,
  TextInput,
  Platform,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import {
  ShoppingBag,
  Trash2,
  RotateCw,
  X,
  Trophy,
  Sparkles,
  Heart,
  Gift,
  Smile,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Camera,
  MessageCircle,
  Plus,
  Users,
  Sun,
  Moon,
  Lock,
  Check,
  Layers,
  Palette,
  BookOpen,
} from 'lucide-react-native';
import { MoodIcon, DropHeartIcon, DropCloverIcon, DropStarIcon } from './icons';
import {
  getEvolutionStage,
  getEvolvedEmoji,
  isMilestoneLevel,
  EVOLUTION_STAGES,
  getStageEvolutionPrompt,
} from '../lib/petmongEvolution';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const BASE_CANVAS_SIZE = SCREEN_WIDTH - 64; // Account for scrollContent padding 32 + canvasCard padding 32
const MAX_DAILY_TOUCH = 10; // Daily touch EXP reward limit (10 times = +30 EXP)
const MAX_DAILY_HARVEST = 15; // Daily harvest limit (15 drops per day)
const MAX_DAILY_CARE = 2; // Daily care limit when visiting other family members (2 times = +2P)
const MAX_ACTIVE_ROAMING = 3; // Maximum active wandering family pets simultaneously

// High-Res 3 Sumone-Style Empty Room Shell Backgrounds & Classic Day/Night
const ROOM_BACKGROUNDS = {
  cottage: require('../assets/petmong/empty_room_cottage.jpg'),
  pastel: require('../assets/petmong/empty_room_pastel.jpg'),
  midnight: require('../assets/petmong/empty_room_midnight.jpg'),
  day: require('../assets/petmong/room_day.jpg'),
  night: require('../assets/petmong/room_night.jpg'),
};

// Immediate hardware & memory preloader for room backgrounds (iOS SDWebImage / Android Glide / Web)
try {
  Object.values(ROOM_BACKGROUNDS).forEach(src => {
    if (ExpoImage.prefetch) {
      ExpoImage.prefetch(src);
    }
  });
} catch (e) {}

const ROOM_THEMES = [
  { id: 'cottage', name: '코티지 원목', emoji: '🏡', desc: '따스한 햇살과 원목 바닥' },
  { id: 'pastel', name: '파스텔 핑크', emoji: '🌸', desc: '사랑스럽고 화사한 핑크 룸' },
  { id: 'midnight', name: '미드나잇 다락방', emoji: '🌌', desc: '신비롭고 아늑한 인디고 밤' },
  { id: 'day', name: '햇살 가득 낮', emoji: '☀️', desc: '싱그럽고 밝은 오후 햇살 룸' },
  { id: 'night', name: '달빛 포근한 밤', emoji: '🌙', desc: '조용하고 감성적인 달밤 룸' },
];

// Idle Resource Drop Bubbles Configuration & Generator
const BUBBLE_CONFIG = {
  heart: { type: 'heart', emoji: '💖', label: '행복 하트', color: '#FF4D6D', exp: 1 },
  clover: { type: 'clover', emoji: '🍀', label: '행운 클로버', color: '#10B981', exp: 2 },
  star: { type: 'star', emoji: '⭐', label: '별빛 방울', color: '#F59E0B', exp: 3 },
};

const createRandomDrop = (userId) => {
  const rand = Math.random();
  const type = rand < 0.62 ? 'heart' : (rand < 0.88 ? 'clover' : 'star');
  // Safe bounds within visible full-screen floor/room area (x: 15%~82%, y: 22%~64%)
  const x = Math.round(15 + Math.random() * 67);
  const y = Math.round(22 + Math.random() * 42);
  return {
    id: `drop_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`,
    userId,
    type,
    x,
    y,
    createdAt: Date.now(),
  };
};

const EMOJI_OPTIONS = ['🐶', '🐱', '🐰', '🐼', '🦊', '🐻', '🐹', '🐥'];
const PERSONALITY_OPTIONS = ['다정한', '장난꾸러기', '잠꾸러기', '애교쟁이', '호기심많은'];

const PETMONG_DIALOGUES = {
  '다정한': [
    '오늘 하루도 우리 가족 모두 행복했으면 좋겠어요! ❤️',
    '아빠, 엄마, 오늘 많이 고생하셨죠? 토닥토닥 힘내세요!',
    '가족들과 함께 있는 이 방이 세상에서 제일 따뜻해요 ✨',
    '따뜻한 물 한 잔 마시고 잠시 쉬어가는 건 어때요? ☕',
    '우리 가족이 웃을 때 저도 제일 행복해요! 🥰',
    '오늘 하루도 서로 다정하게 안아주는 건 어때요? 🫂',
  ],
  '장난꾸러기': [
    '메롱~ 오늘 스몰톡 답변 아직 안 한 사람 손 들어! 😜',
    '심심한데 나랑 방에서 술래잡기 할 가족 누구야?! 🏃',
    '가구 위치 또 맘대로 바꿔놓을까 보다 크큭 😆',
    '오늘 간식은 맛있는 치킨 먹자고 가족들한테 졸라줘! 🍗',
    '방 구석에 내 보물 숨겨놨지롱~ 맞춰봐라 몽!',
    '우다다다! 방 안을 10바퀴 돌고 올게요! 💨',
  ],
  '잠꾸러기': [
    '쿠울... 푹신한 가구 위에서 5분만 더 잘래요... zZ 💤',
    '하아암~ 졸린데 배는 고프다 몽... 🥐',
    '세상에서 제일 좋은 건 소파에 누워 뒹굴거리기야...',
    '눈이 솔솔 감겨요... 가족들 모두 좋은 꿈 꿔요 🌙',
    '낮잠 자고 일어나면 머리가 맑아진다몽~ 😴',
    '이불 밖은 너무 위험해 몽... 꼼짝 안 할래!',
  ],
  '애교쟁이': [
    '나 쓰다듬어줘서 너무너무 행복해 몽! 꼬리 살랑살랑~ 💕',
    '헤헤, 나만 바라봐줘! 내가 세상에서 제일 귀엽지? 🐾',
    '사랑해요 우리 가족! 뽀뽀 쪽~ 😘',
    '오늘도 가족들 얼굴 보니까 힘이 불끈 솟아나요! ✨',
    '내 곁에 항상 있어줘서 고마워요 몽몽! 💖',
    '안아줘 안아줘! 꼬옥 안아주면 기분이 최고야!',
  ],
  '호기심많은': [
    '킁킁, 오늘 저녁엔 무슨 맛있는 냄새가 날까?! 🍲',
    '방에 새로운 가구 또 들여놓으면 안 돼요? 궁금궁금 🌟',
    '오늘 가족들한테 무슨 재미있는 일이 있었을까?! 🧐',
    '저 창문 밖에는 어떤 신나는 모험이 기다리고 있을까? 🎈',
    '새로운 스몰톡 질문이 뭔지 얼른 확인하러 가자 몽!',
    '가족들의 기분 이모지는 오늘 뭘까? 궁금해 몽!',
  ],
  default: [
    '우리 가족 사랑해요! 오늘도 파이팅! 🍀',
    '함께라서 더 행복한 우리 집 FamLink! 🏡',
    '오늘도 나랑 눈 마주쳐줘서 고마워요 ✨',
  ],
};

const getRandomDialogue = (personality) => {
  const currentHour = new Date().getHours();
  if (currentHour >= 6 && currentHour < 10) {
    const morningQuotes = [
      '좋은 아침이에요! 오늘도 활기찬 하루 시작해봐요 ☀️',
      '상쾌한 아침 공기~ 오늘 하루도 힘내세요! 🥐',
    ];
    if (Math.random() < 0.35) {
      return morningQuotes[Math.floor(Math.random() * morningQuotes.length)];
    }
  } else if (currentHour >= 22 || currentHour < 5) {
    const nightQuotes = [
      '모두 오늘 하루도 수고 많았어요. 푹 자고 내일 만나요 🌙',
      '별빛이 반짝이는 밤... 좋은 꿈 꾸세요 몽 zZ 💤',
    ];
    if (Math.random() < 0.45) {
      return nightQuotes[Math.floor(Math.random() * nightQuotes.length)];
    }
  }

  const list = PETMONG_DIALOGUES[personality] || PETMONG_DIALOGUES['default'];
  return list[Math.floor(Math.random() * list.length)];
};

// Idle Resource Harvest Bubble Component with float & pop animations
const HarvestBubble = React.memo(({ drop, onHarvest }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const popScale = useRef(new Animated.Value(1)).current;
  const popOpacity = useRef(new Animated.Value(1)).current;
  const [popping, setPopping] = useState(false);

  useEffect(() => {
    const randomDuration = 1400 + Math.floor(Math.random() * 500);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: randomDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: randomDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [floatAnim]);

  const handlePress = () => {
    if (popping) return;
    setPopping(true);
    Animated.parallel([
      Animated.timing(popScale, {
        toValue: 1.45,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(popOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start(() => {
      onHarvest(drop);
    });
  };

  const config = BUBBLE_CONFIG[drop.type] || BUBBLE_CONFIG.heart;

  const renderDropIcon = () => {
    const iconProps = { size: 26, color: config.color };
    switch (drop.type) {
      case 'clover':
        return <DropCloverIcon {...iconProps} />;
      case 'star':
        return <DropStarIcon {...iconProps} />;
      case 'heart':
      default:
        return <DropHeartIcon {...iconProps} />;
    }
  };

  return (
    <Animated.View
      style={[
        styles.bubbleContainer,
        {
          left: `${drop.x}%`,
          top: `${drop.y}%`,
          opacity: popOpacity,
          transform: [
            { translateY: floatAnim },
            { scale: popScale },
          ],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.65}
        onPress={handlePress}
        style={styles.bubbleTouchable}
      >
        <View style={styles.bubbleIconWrapper}>
          {renderDropIcon()}
        </View>
        {popping && (
          <View style={styles.bubbleFloatParticle}>
            <Text style={[styles.bubbleFloatParticleText, { color: config.color }]}>
              +{config.exp} EXP
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

// Global In-Memory Cache for transparent images across tab switches
const transparentImageCache = new Map();

// Utility: Flood-fill transparency for AI-generated images with solid white backgrounds
function makeBackgroundTransparent(imageUrl, threshold = 232) {
  if (!imageUrl) return Promise.resolve(imageUrl);
  if (transparentImageCache.has(imageUrl)) {
    return Promise.resolve(transparentImageCache.get(imageUrl));
  }
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return resolve(imageUrl);
    }

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const w = img.naturalWidth || img.width || 200;
        const h = img.naturalHeight || img.height || 200;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // BFS flood fill from all 4 borders to remove connected background white pixels
        const visited = new Uint8Array(w * h);
        const queue = [];

        // Seed border pixels
        for (let x = 0; x < w; x++) {
          queue.push(x, 0);
          queue.push(x, h - 1);
        }
        for (let y = 0; y < h; y++) {
          queue.push(0, y);
          queue.push(w - 1, y);
        }

        const isNearWhite = (idx) => {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          return r >= threshold && g >= threshold && b >= threshold;
        };

        let head = 0;
        while (head < queue.length) {
          const x = queue[head++];
          const y = queue[head++];
          const pixelIdx = y * w + x;

          if (visited[pixelIdx]) continue;
          visited[pixelIdx] = 1;

          const dataIdx = pixelIdx * 4;
          if (isNearWhite(dataIdx)) {
            data[dataIdx + 3] = 0; // Alpha = 0 (Transparent)

            // Add 4-way neighbors
            if (x > 0 && !visited[pixelIdx - 1]) queue.push(x - 1, y);
            if (x < w - 1 && !visited[pixelIdx + 1]) queue.push(x + 1, y);
            if (y > 0 && !visited[pixelIdx - w]) queue.push(x, y - 1);
            if (y < h - 1 && !visited[pixelIdx + w]) queue.push(x, y + 1);
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const resultUrl = canvas.toDataURL('image/png');
        transparentImageCache.set(imageUrl, resultUrl);
        resolve(resultUrl);
      } catch (err) {
        console.error('Error removing background:', err);
        resolve(imageUrl);
      }
    };
    img.onerror = () => resolve(imageUrl);
    img.src = imageUrl;
  });
}

// Roaming Family Member's Petmong Component (Wandering AI Engine for up to 9 members)
const SPAWN_ZONES = [
  { x: 14, y: 38 }, // Zone 0: Left-Top
  { x: 70, y: 38 }, // Zone 1: Right-Top
  { x: 10, y: 50 }, // Zone 2: Far-Left Mid
  { x: 76, y: 48 }, // Zone 3: Far-Right Mid
  { x: 22, y: 56 }, // Zone 4: Left-Bottom
  { x: 66, y: 58 }, // Zone 5: Right-Bottom
  { x: 44, y: 35 }, // Zone 6: Center-Upper
  { x: 28, y: 36 }, // Zone 7: Left-Upper
  { x: 58, y: 35 }, // Zone 8: Right-Upper
];

const RESTING_FURNITURE_EMOJIS = ['🛋️', '☁️', '🧸', '📻', '🧺'];

const RoamingFamilyPetmong = React.memo(({
  char,
  owner,
  index,
  placedFurniture = [],
  onPress,
  subBubbleCharId,
  subBubbleText,
}) => {
  // Stagger initial spawn positions across 9 distinct room zones to avoid clustering
  const spawn = SPAWN_ZONES[index % SPAWN_ZONES.length];
  const initialX = spawn.x + (index % 3) * 2;
  const initialY = spawn.y + (index % 2) * 2;

  const currentX = useRef(initialX);
  const currentY = useRef(initialY);

  const posAnim = useRef(new Animated.ValueXY({ x: initialX, y: initialY })).current;
  const scaleXAnim = useRef(new Animated.Value(1)).current;
  const bobAnim = useRef(new Animated.Value(0)).current;
  const tapBounceAnim = useRef(new Animated.Value(0)).current;
  const [idleEmote, setIdleEmote] = useState(null);
  const isMountedRef = useRef(true);
  const walkTimerRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;

    // Bobbing loop for footstep vibration
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, { toValue: -3.5, duration: 220, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(bobAnim, { toValue: 0, duration: 220, useNativeDriver: USE_NATIVE_DRIVER }),
      ])
    );

    const wander = () => {
      if (!isMountedRef.current) return;

      // Pick a random target within open floor areas
      const isSide = Math.random() > 0.3;
      let nextX, nextY;
      if (isSide) {
        nextX = Math.random() > 0.5 
          ? Math.round(10 + Math.random() * 22)   // 10% ~ 32% (Left open floor)
          : Math.round(62 + Math.random() * 22);  // 62% ~ 84% (Right open floor)
        nextY = Math.round(36 + Math.random() * 24); // 36% ~ 60%
      } else {
        nextX = Math.round(14 + Math.random() * 68); // 14% ~ 82% (Upper back floor)
        nextY = Math.round(30 + Math.random() * 12); // 30% ~ 42%
      }

      const dx = nextX - currentX.current;
      const dy = nextY - currentY.current;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Face direction of walk
      if (dx < -2) {
        Animated.timing(scaleXAnim, { toValue: -1, duration: 160, useNativeDriver: USE_NATIVE_DRIVER }).start();
      } else if (dx > 2) {
        Animated.timing(scaleXAnim, { toValue: 1, duration: 160, useNativeDriver: USE_NATIVE_DRIVER }).start();
      }

      const duration = Math.max(2000, Math.min(4500, dist * 70));

      setIdleEmote(null);
      bobLoop.start();

      Animated.timing(posAnim, {
        toValue: { x: nextX, y: nextY },
        duration,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (!isMountedRef.current) return;
        currentX.current = nextX;
        currentY.current = nextY;
        bobLoop.stop();
        bobAnim.setValue(0);

        if (finished) {
          // Arrival emotion bubble (sleep, heart, mood, sparkles, music)
          if (Math.random() < 0.65) {
            const ownerMood = owner?.mood || '😊';
            const emotes = [ownerMood, '💤', '❤️', '🐾', '✨', '🎵', '🌿', '🍀'];
            const chosen = emotes[Math.floor(Math.random() * emotes.length)];
            setIdleEmote(chosen);
            setTimeout(() => {
              if (isMountedRef.current) setIdleEmote(null);
            }, 2600);
          }

          const nextDelay = 4500 + (index % 3) * 2500 + Math.random() * 4000;
          walkTimerRef.current = setTimeout(wander, nextDelay);
        }
      });
    };

    // Stagger initial start times across all family members
    const initialDelay = 1200 + index * 1600;
    walkTimerRef.current = setTimeout(wander, initialDelay);

    return () => {
      isMountedRef.current = false;
      if (walkTimerRef.current) clearTimeout(walkTimerRef.current);
      bobLoop.stop();
    };
  }, [index, owner?.mood, placedFurniture]);

  const handlePress = () => {
    // Tap reaction: happy jump
    Animated.sequence([
      Animated.timing(tapBounceAnim, { toValue: -12, duration: 120, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.spring(tapBounceAnim, { toValue: 0, friction: 3, tension: 60, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();
    onPress(char);
  };

  const isBubbleShowing = subBubbleCharId === char.id;

  return (
    <Animated.View
      style={[
        styles.roamingCharWrapper,
        {
          left: posAnim.x.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
          top: posAnim.y.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
          zIndex: posAnim.y.interpolate({ inputRange: [0, 100], outputRange: [4, 25] }),
        },
      ]}
    >
      {/* Speech Bubble when tapped */}
      {isBubbleShowing && (
        <View style={styles.subSpeechBubble}>
          <Text style={styles.subSpeechBubbleText}>{subBubbleText}</Text>
          <View style={styles.subSpeechBubbleArrow} />
        </View>
      )}

      {/* Idle Emote Bubble (e.g. 💤, ❤️, owner's mood) */}
      {!isBubbleShowing && idleEmote && (
        <View style={styles.idleEmoteBadge}>
          <Text style={styles.idleEmoteText}>{idleEmote}</Text>
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePress}
        style={styles.roamingCharTouch}
      >
        <Animated.View
          style={{
            transform: [
              { scaleX: scaleXAnim },
              { translateY: Animated.add(bobAnim, tapBounceAnim) },
            ],
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {char.image_url ? (
            <View style={styles.subCharImageWrapper}>
              {Platform.OS === 'web' ? (
                <img
                  src={char.image_url}
                  alt={char.name}
                  style={{
                    width: 34,
                    height: 34,
                    objectFit: 'contain',
                    mixBlendMode: 'multiply',
                    display: 'block',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                />
              ) : (
                <Image source={{ uri: char.image_url }} style={styles.subCharImage} resizeMode="contain" />
              )}
            </View>
          ) : (
            <Text style={styles.subCharEmoji}>{char.emoji || '🐱'}</Text>
          )}
        </Animated.View>

        {/* Footstep shadow on floor */}
        <View style={styles.subCharShadow} />

        {/* Owner & Pet Name Tag */}
        <View style={styles.subCharLabelBox}>
          <View style={styles.subCharOwnerRow}>
            <UserAvatar avatar={owner?.avatar} size={14} style={{ marginRight: 4 }} />
            <Text style={styles.subCharOwnerName}>{owner?.name || '가족'}의</Text>
          </View>
          <Text style={styles.subCharLabelText}>{char.name} (Lv.{char.level || 1})</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function InteriorScreen({
  points,
  onDeductPoints,
  onAwardPoints,
  placedFurniture,
  onUpdatePlacedFurniture,
  floorPlanUrl,
  onUpdateFloorPlan,
  currentUser,
  currentUserProfile,
  familyId,
  petmongCharacters = [],
  setPetmongCharacters,
  onAwardExp,
  familyMembers = [],
}) {
  const insets = useSafeAreaInsets();
  
  // Idle Game & Room Navigation States
  const [selectedRoomUserId, setSelectedRoomUserId] = useState(currentUserProfile?.id);
  const [dropsByRoom, setDropsByRoom] = useState({});
  const [dailyHarvestCount, setDailyHarvestCount] = useState(0);
  const [dailyCareCount, setDailyCareCount] = useState(0);

  // Petmong States (Linked with Supabase)
  const [myCharacter, setMyCharacter] = useState(null);
  const [displayedTransparentUrl, setDisplayedTransparentUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [familyCharacters, setFamilyCharacters] = useState([]);
  
  // Creation Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('🐶');
  const [newPersonality, setNewPersonality] = useState('다정한');

  // Touch & Dialogue States (Sumone Style)
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const heartAnim = useRef(new Animated.Value(0)).current;
  const bubbleAnim = useRef(new Animated.Value(0)).current;
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [bubbleText, setBubbleText] = useState('');
  const bubbleTimerRef = useRef(null);
  const [heartVisible, setHeartVisible] = useState(false);
  const [dailyTouchCount, setDailyTouchCount] = useState(0);

  // Level Up Modal State
  const [levelUpModalVisible, setLevelUpModalVisible] = useState(false);
  const [levelUpInfo, setLevelUpInfo] = useState({ name: '', level: 1 });

  // 4-Stage Evolution Milestone Modal State
  const [evolutionModalVisible, setEvolutionModalVisible] = useState(false);
  const [evolutionData, setEvolutionData] = useState(null);
  const prevLevelRef = useRef(myCharacter?.level || 1);
  const hasInitializedLevelRef = useRef(false);

  const handleCloseEvolutionModal = () => {
    if (evolutionData?.stage?.stage && myCharacter?.id) {
      AsyncStorage.setItem(`@famlink_celebrated_stage_${myCharacter.id}_${evolutionData.stage.stage}`, 'true').catch(() => {});
    }
    setEvolutionModalVisible(false);
  };

  // Sub Character Dialogue State
  const [subBubbleCharId, setSubBubbleCharId] = useState(null);
  const [subBubbleText, setSubBubbleText] = useState('');

  // Interaction Modal State
  const [interactionModalVisible, setInteractionModalVisible] = useState(false);
  const [selectedTargetChar, setSelectedTargetChar] = useState(null);

  // Family Petmong Book / Roster Modal State
  const [familyBookModalVisible, setFamilyBookModalVisible] = useState(false);

  // Sumone-Style Room Theme States (Per-room themes so each member's room has its own theme)
  const [roomThemesByRoom, setRoomThemesByRoom] = useState({});
  const [themeModalVisible, setThemeModalVisible] = useState(false);

  // Active room's theme (defaults to 'cottage')
  const activeRoomTheme = (selectedRoomUserId && roomThemesByRoom[selectedRoomUserId]) || 'cottage';

  // Floating Mini Capsule HUD State (Default: collapsed capsule for maximum room visibility)
  const [isHudExpanded, setIsHudExpanded] = useState(false);
  const hudCollapseTimer = useRef(null);

  const expandHudTemporarily = (durationMs = 4000) => {
    setIsHudExpanded(true);
    if (hudCollapseTimer.current) clearTimeout(hudCollapseTimer.current);
    hudCollapseTimer.current = setTimeout(() => {
      setIsHudExpanded(false);
    }, durationMs);
  };

  useEffect(() => {
    return () => {
      if (hudCollapseTimer.current) clearTimeout(hudCollapseTimer.current);
    };
  }, []);

  // Main Character Float Animation
  const floatAnim = useRef(new Animated.Value(0)).current;

  // Auto initialize selectedRoomUserId
  useEffect(() => {
    if (currentUserProfile?.id && !selectedRoomUserId) {
      setSelectedRoomUserId(currentUserProfile.id);
    }
  }, [currentUserProfile?.id]);

  const displayedCharacter = petmongCharacters.find(c => c.user_id === selectedRoomUserId) || (selectedRoomUserId === currentUserProfile?.id ? myCharacter : null);
  const displayedOwner = familyMembers.find(m => m.id === selectedRoomUserId) || (selectedRoomUserId === currentUserProfile?.id ? currentUserProfile : null);
  const isVisitingOther = selectedRoomUserId !== currentUserProfile?.id;
  const activeRoomDrops = dropsByRoom[selectedRoomUserId] || [];

  // 🎮 Real-time Petmong Game Vitals (Tamagotchi Engine)
  const [petVitals, setPetVitals] = useState({
    hunger: 80,
    happiness: 85,
    cleanliness: 90,
    energy: 95,
  });

  const activeCharId = displayedCharacter?.id || currentUserProfile?.id || currentUser;

  useEffect(() => {
    if (!activeCharId) return;
    AsyncStorage.getItem(`@famlink_game_vitals_${activeCharId}`)
      .then(res => {
        if (res) {
          try {
            setPetVitals(JSON.parse(res));
          } catch (e) {}
        }
      })
      .catch(() => {});
  }, [activeCharId]);

  const handleUpdateVitals = (updater) => {
    setPetVitals(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      if (activeCharId) {
        AsyncStorage.setItem(`@famlink_game_vitals_${activeCharId}`, JSON.stringify(next)).catch(() => {});
      }
      return next;
    });
  };

  const handleGameGainExp = (amount = 5) => {
    if (!displayedCharacter) return;
    if (onAwardExp && displayedCharacter.user_id) {
      onAwardExp(displayedCharacter.user_id, amount, '반려몽 게임 케어');
    } else {
      setMyCharacter(prev => {
        if (!prev) return prev;
        let newExp = (prev.exp || 0) + amount;
        let newLevel = prev.level || 1;
        if (newExp >= 100) {
          newExp -= 100;
          newLevel += 1;
          setLevelUpInfo({ name: prev.name, level: newLevel });
          setLevelUpModalVisible(true);
        }
        return { ...prev, exp: newExp, level: newLevel };
      });
    }
  };

  const handleGameCareAction = () => {
    if (!isVisitingOther) return;
    if (dailyCareCount >= MAX_DAILY_CARE) {
      Alert.alert('오늘의 돌봄 완료! 💕', `오늘 가족 반려몽 돌봄(일일 ${MAX_DAILY_CARE}회)을 이미 모두 완료했습니다!`);
      return;
    }
    const nextCare = dailyCareCount + 1;
    setDailyCareCount(nextCare);
    if (currentUserProfile?.id) {
      const today = new Date().toISOString().split('T')[0];
      const careKey = `PETMONG_CARE_${currentUserProfile.id}_${today}`;
      AsyncStorage.setItem(careKey, String(nextCare)).catch(() => {});
    }
    if (onAwardPoints) {
      onAwardPoints(1, `가족 반려몽 돌봄 보너스 (${nextCare}/${MAX_DAILY_CARE})`);
    }
    Alert.alert('가족 반려몽 돌봄 완료! 💖', `가족의 반려몽에게 맛있는 간식을 챙겨주었습니다!\n돌봄 보너스 +1P가 지급되었습니다. (${nextCare}/${MAX_DAILY_CARE}회)`);
  };

  // Dynamic roaming characters: all characters in family EXCEPT the owner of the active room
  const roamingList = petmongCharacters
    .filter(c => c.user_id !== selectedRoomUserId)
    .map((c, idx) => ({
      ...c,
      x: 10 + (idx * 28) % 70,
      y: 54 + (idx * 14) % 24,
    }))
    .slice(0, MAX_ACTIVE_ROAMING);

  useEffect(() => {
    if (familyId && currentUserProfile?.id) {
      const mine = petmongCharacters.find(c => c.user_id === currentUserProfile.id);
      if (mine) {
        setMyCharacter(mine);
        setCreateModalVisible(false);
      } else {
        setCreateModalVisible(true);
      }
    }
  }, [familyId, currentUserProfile, petmongCharacters]);

  useEffect(() => {
    if (displayedCharacter?.image_url) {
      if (transparentImageCache.has(displayedCharacter.image_url)) {
        setDisplayedTransparentUrl(transparentImageCache.get(displayedCharacter.image_url));
      } else {
        makeBackgroundTransparent(displayedCharacter.image_url).then(url => {
          setDisplayedTransparentUrl(url);
          // Persist the clean transparent PNG to Supabase so it permanently never has a white background
          if (displayedCharacter.id && !displayedCharacter.image_url.startsWith('data:image/png')) {
            supabase
              .from('petmong_characters')
              .update({ image_url: url })
              .eq('id', displayedCharacter.id)
              .then(() => {
                console.log('Successfully persisted transparent petmong character image in DB');
              });
          }
        });
      }
    } else {
      setDisplayedTransparentUrl(null);
    }
  }, [displayedCharacter?.id, displayedCharacter?.image_url]);

  // Method B: Image-to-Image AI Stage Evolution
  const triggerAiEvolution = async (char, stage) => {
    try {
      let base64Image = null;
      if (char.image_url.startsWith('data:image')) {
        base64Image = char.image_url;
      } else {
        const resp = await fetch(char.image_url);
        const blob = await resp.blob();
        base64Image = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      }

      const clientApiKey = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_GEMINI_API_KEY) || '';
      let evolvedImageUrl = null;

      // 1. Try Supabase Edge Function first
      try {
        const { data, error } = await supabase.functions.invoke('generate-petmong', {
          body: {
            imageBase64: base64Image,
            personality: char.personality || '다정한',
            mode: 'evolve',
            targetStage: stage.stage,
            characterName: char.name,
            apiKey: clientApiKey,
          }
        });
        if (!error && data?.imageUrl) {
          evolvedImageUrl = data.imageUrl;
        }
      } catch (edgeErr) {
        console.log('Edge function evolve try:', edgeErr);
      }

      // 2. Client-side Gemini + Imagen fallback if clientApiKey is available
      if (!evolvedImageUrl && clientApiKey) {
        try {
          const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
          const visionResp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${clientApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    { text: "Analyze this cute 2D pet monster. Describe its body color, shape, face traits, and cute vibe in 2 concise sentences so its evolved form retains 100% identity." },
                    { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } }
                  ]
                }]
              })
            }
          );
          let traits = "A cute 2D monster";
          if (visionResp.ok) {
            const vData = await visionResp.json();
            traits = vData.candidates?.[0]?.content?.parts?.[0]?.text || traits;
          }

          const stagePrompt = getStageEvolutionPrompt(stage.stage, traits, char.personality);
          const imagenResp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${clientApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                instances: [{ prompt: `${traits}. ${stagePrompt}` }],
                parameters: { sampleCount: 1, aspectRatio: "1:1", outputMimeType: "image/jpeg" }
              })
            }
          );
          if (imagenResp.ok) {
            const imgData = await imagenResp.json();
            const b64 = imgData.predictions?.[0]?.bytesBase64Encoded;
            if (b64) {
              evolvedImageUrl = `data:image/jpeg;base64,${b64}`;
            }
          }
        } catch (clientErr) {
          console.log('Client AI evolve fallback:', clientErr);
        }
      }

      if (evolvedImageUrl) {
        await supabase
          .from('petmong_characters')
          .update({ image_url: evolvedImageUrl })
          .eq('id', char.id);

        setMyCharacter(prev => ({ ...prev, image_url: evolvedImageUrl }));
        setPetmongCharacters(prev => prev.map(c => c.id === char.id ? { ...c, image_url: evolvedImageUrl } : c));
        setEvolutionData(prev => prev ? { ...prev, isAiEvolving: false, newImageUrl: evolvedImageUrl } : null);
      } else {
        setEvolutionData(prev => prev ? { ...prev, isAiEvolving: false } : null);
      }
    } catch (err) {
      console.log('AI Evolution note (graceful fallback):', err);
      setEvolutionData(prev => prev ? { ...prev, isAiEvolving: false } : null);
    }
  };

  // Detect Milestone Level Up for 4-Stage Evolution (Lv.5, Lv.10, Lv.20)
  useEffect(() => {
    if (!myCharacter?.level || !myCharacter?.id) return;

    // 1. Skip celebration on initial mount/data load to prevent repetitive popup loops
    if (!hasInitializedLevelRef.current) {
      hasInitializedLevelRef.current = true;
      prevLevelRef.current = myCharacter.level;
      return;
    }

    const oldLevel = prevLevelRef.current;
    const newLevel = myCharacter.level;
    prevLevelRef.current = newLevel;

    if (newLevel > oldLevel && isMilestoneLevel(newLevel)) {
      const stage = getEvolutionStage(newLevel);
      const celebrationKey = `@famlink_celebrated_stage_${myCharacter.id}_${stage.stage}`;

      AsyncStorage.getItem(celebrationKey).then(celebrated => {
        if (celebrated === 'true') {
          // Already celebrated this stage milestone, do not popup again!
          return;
        }

        // Mark as celebrated immediately so repeated events/renders don't re-trigger
        AsyncStorage.setItem(celebrationKey, 'true').catch(() => {});

        setEvolutionData({
          character: myCharacter,
          stage: stage,
          previousLevel: oldLevel,
          previousImageUrl: myCharacter.image_url,
          newLevel: newLevel,
          isAiEvolving: !!myCharacter.image_url,
          newImageUrl: null,
        });
        setEvolutionModalVisible(true);

        // Trigger AI Evolution if character has image_url, or evolve emoji
        if (myCharacter.image_url) {
          triggerAiEvolution(myCharacter, stage);
        } else if (myCharacter.emoji) {
          const newEmoji = getEvolvedEmoji(myCharacter.emoji, newLevel);
          if (newEmoji !== myCharacter.emoji) {
            supabase
              .from('petmong_characters')
              .update({ emoji: newEmoji })
              .eq('id', myCharacter.id)
              .then(() => {
                setMyCharacter(prev => ({ ...prev, emoji: newEmoji }));
                setPetmongCharacters(prev => prev.map(c => c.id === myCharacter.id ? { ...c, emoji: newEmoji } : c));
              })
              .catch(() => {});
          }
        }
      }).catch(() => {});
    }
  }, [myCharacter?.id, myCharacter?.level]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -3, duration: 1800, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1800, useNativeDriver: USE_NATIVE_DRIVER }),
      ])
    ).start();
  }, [floatAnim]);

  // Load daily touch count, daily harvest, daily care, room theme, and idle drops
  useEffect(() => {
    if (!currentUserProfile?.id) return;
    const today = new Date().toISOString().split('T')[0];
    const key = `PETMONG_TOUCH_${currentUserProfile.id}_${today}`;

    // 1. Load daily touch count from local storage
    AsyncStorage.getItem(key).then(val => {
      if (val !== null) {
        setDailyTouchCount(parseInt(val, 10) || 0);
      } else {
        setDailyTouchCount(0);
      }
    }).catch(err => console.log('Error loading daily touch count:', err));

    // 2. Load daily harvest & care counts
    AsyncStorage.getItem(`PETMONG_DAILY_HARVEST_${currentUserProfile.id}_${today}`).then(val => {
      if (val !== null) {
        const loaded = parseInt(val, 10) || 0;
        setDailyHarvestCount(Math.min(MAX_DAILY_HARVEST, loaded));
      }
    }).catch(() => {});

    AsyncStorage.getItem(`PETMONG_DAILY_CARE_${currentUserProfile.id}_${today}`).then(val => {
      if (val !== null) setDailyCareCount(parseInt(val, 10) || 0);
    }).catch(() => {});

    // 3. Load theme preference per room & idle drops
    if (familyId) {
      const themesKey = `PETMONG_ROOM_THEMES_${familyId}`;
      AsyncStorage.getItem(themesKey).then(val => {
        if (val) {
          try {
            const parsed = JSON.parse(val);
            if (parsed && typeof parsed === 'object') {
              setRoomThemesByRoom(parsed);
            }
          } catch (e) {}
        }
      }).catch(() => {});

      const dropsKey = `PETMONG_ROOM_DROPS_${familyId}`;
      const lastTimeKey = `PETMONG_LAST_IDLE_TIME_${familyId}`;

      Promise.all([
        AsyncStorage.getItem(dropsKey),
        AsyncStorage.getItem(lastTimeKey),
      ]).then(([storedDropsStr, lastTimeStr]) => {
        let currentDropsMap = {};
        if (storedDropsStr) {
          try {
            currentDropsMap = JSON.parse(storedDropsStr) || {};
          } catch (e) {}
        }

        const now = Date.now();
        const lastTime = lastTimeStr ? parseInt(lastTimeStr, 10) : now;
        const elapsedMinutes = Math.floor((now - lastTime) / (1000 * 60));
        // Offline accumulation: 1 drop per 4 minutes, maximum 10 drops
        const offlineSpawns = Math.min(10, Math.floor(elapsedMinutes / 4));

        const targetUserIds = [
          currentUserProfile.id,
          ...familyMembers.map(m => m.id).filter(id => id && id !== currentUserProfile.id),
        ];

        let updated = false;
        targetUserIds.forEach(uId => {
          const userDrops = currentDropsMap[uId] ? [...currentDropsMap[uId]] : [];
          // If it's current user's room and daily harvest reached limit, do not spawn more
          if (uId === currentUserProfile.id && dailyHarvestCount >= MAX_DAILY_HARVEST) {
            return;
          }
          const needed = offlineSpawns > 0 ? offlineSpawns : (userDrops.length === 0 ? 3 : 0);
          const toAdd = Math.min(needed, 10 - userDrops.length);
          if (toAdd > 0) {
            for (let i = 0; i < toAdd; i++) {
              userDrops.push(createRandomDrop(uId));
            }
            currentDropsMap[uId] = userDrops;
            updated = true;
          }
        });

        setDropsByRoom(currentDropsMap);
        AsyncStorage.setItem(lastTimeKey, String(now)).catch(() => {});
        if (updated) {
          AsyncStorage.setItem(dropsKey, JSON.stringify(currentDropsMap)).catch(() => {});
        }
      }).catch(err => console.log('Error loading idle drops:', err));
    }

    // 4. Fetch ground-truth count from Supabase petmong_activities for cross-device sync
    if (familyId) {
      // Query recent room theme updates for all members
      supabase
        .from('petmong_activities')
        .select('action_type, created_at')
        .eq('family_id', familyId)
        .ilike('action_type', 'ROOM_THEME_UPDATE:%')
        .order('created_at', { ascending: true })
        .then(({ data, error }) => {
          if (data && !error) {
            const dbThemes = {};
            data.forEach(row => {
              // Format: ROOM_THEME_UPDATE:userId:themeId
              const parts = row.action_type.split(':');
              if (parts.length >= 3) {
                const uId = parts[1];
                const tId = parts[2];
                if (ROOM_THEMES.some(t => t.id === tId)) {
                  dbThemes[uId] = tId;
                }
              }
            });
            if (Object.keys(dbThemes).length > 0) {
              setRoomThemesByRoom(prev => ({ ...prev, ...dbThemes }));
            }
          }
        })
        .catch(err => console.log('Error fetching DB room themes:', err));
    }

    if (myCharacter?.id) {
      const todayStart = `${today}T00:00:00.000Z`;
      supabase
        .from('petmong_activities')
        .select('action_type')
        .eq('actor_id', myCharacter.id)
        .ilike('action_type', '%반려몽 쓰다듬기%')
        .gte('created_at', todayStart)
        .then(({ data, error }) => {
          if (data && !error) {
            const dbCount = data.length;
            setDailyTouchCount(prev => Math.max(prev, dbCount));
            AsyncStorage.setItem(key, String(dbCount)).catch(() => {});
          }
        })
        .catch(err => console.log('Error syncing touch count with DB:', err));
    }
  }, [currentUserProfile?.id, myCharacter?.id, familyId, familyMembers.length, dailyHarvestCount]);

  // Real-time Supabase listener for Room Theme Updates across incognito/different devices
  useEffect(() => {
    if (!familyId) return;
    const themeChannel = supabase
      .channel(`realtime-room-themes-${familyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'petmong_activities',
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          const actionType = payload.new?.action_type || '';
          if (actionType.startsWith('ROOM_THEME_UPDATE:')) {
            const parts = actionType.split(':');
            if (parts.length >= 3) {
              const uId = parts[1];
              const tId = parts[2];
              if (ROOM_THEMES.some(t => t.id === tId)) {
                setRoomThemesByRoom(prev => {
                  const updated = { ...prev, [uId]: tId };
                  AsyncStorage.setItem(`PETMONG_ROOM_THEMES_${familyId}`, JSON.stringify(updated)).catch(() => {});
                  return updated;
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(themeChannel);
    };
  }, [familyId]);

  // Real-time idle drop generation interval (adds 1 drop every 22 seconds up to 10)
  useEffect(() => {
    if (!familyId || !selectedRoomUserId) return;
    // Do not spawn drops in my room if today's harvest limit is already reached
    if (selectedRoomUserId === currentUserProfile?.id && dailyHarvestCount >= MAX_DAILY_HARVEST) {
      return;
    }
    const interval = setInterval(() => {
      setDropsByRoom(prev => {
        // Double check daily limit
        if (selectedRoomUserId === currentUserProfile?.id && dailyHarvestCount >= MAX_DAILY_HARVEST) {
          return prev;
        }
        const currentList = prev[selectedRoomUserId] || [];
        if (currentList.length >= 10) return prev;
        const newDrop = createRandomDrop(selectedRoomUserId);
        const updated = {
          ...prev,
          [selectedRoomUserId]: [...currentList, newDrop],
        };
        AsyncStorage.setItem(`PETMONG_ROOM_DROPS_${familyId}`, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    }, 22000);

    return () => clearInterval(interval);
  }, [familyId, selectedRoomUserId, currentUserProfile?.id, dailyHarvestCount]);

  // Helper to trigger character bounce & speech bubble without EXP
  const handlePetBounceOnly = (text) => {
    Animated.sequence([
      Animated.timing(bounceAnim, { toValue: -18, duration: 150, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.spring(bounceAnim, { toValue: 0, friction: 3, tension: 70, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();

    setBubbleText(text);
    setBubbleVisible(true);
    bubbleAnim.setValue(0);
    Animated.spring(bubbleAnim, {
      toValue: 1,
      friction: 5,
      tension: 60,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();

    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = setTimeout(() => {
      Animated.timing(bubbleAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start(() => setBubbleVisible(false));
    }, 4500);
  };

  // Handle Tap Interaction on Active Petmong (Sumone Style)
  const handlePetTap = () => {
    const targetChar = displayedCharacter;
    if (!targetChar) return;

    // 1. Bounce animation
    Animated.sequence([
      Animated.timing(bounceAnim, { toValue: -18, duration: 150, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.spring(bounceAnim, { toValue: 0, friction: 3, tension: 70, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();

    // 2. Heart floating particle animation
    setHeartVisible(true);
    heartAnim.setValue(0);
    Animated.timing(heartAnim, {
      toValue: 1,
      duration: 1100,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start(() => setHeartVisible(false));

    // 3. Speech bubble with personality & time-based quote
    const isLimitReached = dailyTouchCount >= MAX_DAILY_TOUCH;
    const quote = isLimitReached
      ? '오늘 사랑은 듬뿍 받았어요! 내일 또 쓰다듬어주세요 🥰'
      : getRandomDialogue(targetChar.personality || '다정한');
    setBubbleText(quote);
    setBubbleVisible(true);
    bubbleAnim.setValue(0);
    Animated.spring(bubbleAnim, {
      toValue: 1,
      friction: 5,
      tension: 60,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();

    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = setTimeout(() => {
      Animated.timing(bubbleAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start(() => setBubbleVisible(false));
    }, 4500);

    // 4. Award EXP on touch (up to 10 times per day)
    if (!isLimitReached) {
      const nextCount = dailyTouchCount + 1;
      setDailyTouchCount(nextCount);

      if (currentUserProfile?.id) {
        const today = new Date().toISOString().split('T')[0];
        const key = `PETMONG_TOUCH_${currentUserProfile.id}_${today}`;
        AsyncStorage.setItem(key, String(nextCount)).catch(e => console.log(e));
      }

      if (onAwardExp && targetChar.user_id) {
        onAwardExp(targetChar.user_id, 3, `반려몽 쓰다듬기 (${nextCount}/${MAX_DAILY_TOUCH})`);
      } else {
        setMyCharacter(prev => {
          if (!prev) return prev;
          let newExp = (prev.exp || 0) + 3;
          let newLevel = prev.level || 1;
          if (newExp >= 100) {
            newExp -= 100;
            newLevel += 1;
            setLevelUpInfo({ name: prev.name, level: newLevel });
            setLevelUpModalVisible(true);
          }
          return { ...prev, exp: newExp, level: newLevel };
        });
      }
    }
  };

  // Handle Harvesting a Single Idle Drop (Heart, Clover, Star)
  const handleHarvestDrop = (drop) => {
    const config = BUBBLE_CONFIG[drop.type] || BUBBLE_CONFIG.heart;

    if (isVisitingOther) {
      // Visiting other family member: 품앗이 돌봄!
      const targetOwner = familyMembers.find(m => m.id === selectedRoomUserId);
      const targetName = targetOwner?.name || '가족';

      if (dailyCareCount >= MAX_DAILY_CARE) {
        Alert.alert(
          '오늘의 돌봄 완료! 💕',
          `오늘 가족 반려몽 돌봄(일일 ${MAX_DAILY_CARE}회)을 이미 모두 완료했습니다!\n내일 다시 사랑과 관심을 전해주세요 🥰`
        );
        return;
      }

      const currentList = dropsByRoom[selectedRoomUserId] || [];
      const updatedList = currentList.filter(d => d.id !== drop.id);
      const updatedMap = {
        ...dropsByRoom,
        [selectedRoomUserId]: updatedList,
      };
      setDropsByRoom(updatedMap);
      if (familyId) {
        AsyncStorage.setItem(`PETMONG_ROOM_DROPS_${familyId}`, JSON.stringify(updatedMap)).catch(() => {});
      }

      const nextCare = dailyCareCount + 1;
      setDailyCareCount(nextCare);
      const today = new Date().toISOString().split('T')[0];
      AsyncStorage.setItem(`PETMONG_DAILY_CARE_${currentUserProfile.id}_${today}`, String(nextCare)).catch(() => {});

      // Award EXP to visited petmong strictly within daily care limit
      if (onAwardExp) {
        onAwardExp(selectedRoomUserId, config.exp + 1, `가족 돌봄 방울 수확 (+${config.exp + 1} EXP) (${nextCare}/${MAX_DAILY_CARE})`);
      }

      if (onAwardPoints) {
        onAwardPoints(1, `${targetName} 반려몽 돌봄 보너스 (+1P)`);
      }

      if (familyId && displayedCharacter?.id) {
        supabase.from('petmong_activities').insert({
          family_id: familyId,
          actor_id: myCharacter?.id || displayedCharacter.id,
          target_id: displayedCharacter.id,
          action_type: `가족 반려몽 방울 돌봄 품앗이 (+1P) (${nextCare}/${MAX_DAILY_CARE})`,
        }).then(() => {}).catch(() => {});
      }

      Alert.alert(
        '돌봄 품앗이 완료! 💕',
        `${targetName} 님의 반려몽 방울을 대신 수확해주었습니다!\n경험치 +${config.exp + 1} EXP 선물 & 돌봄 보너스 1P 획득! 🪙 (오늘 ${nextCare}/${MAX_DAILY_CARE}회)`
      );

      handlePetBounceOnly(`${currentUserProfile?.name || '가족'} 님이 방울을 따줬어요! 헤헤 고마워요 💕`);
    } else {
      // My room harvest!
      if (dailyHarvestCount >= MAX_DAILY_HARVEST) {
        Alert.alert(
          '오늘의 수확 완료! 🌟',
          `오늘 수확 가능한 방울(${MAX_DAILY_HARVEST}개)을 모두 수확했습니다!\n내일 자정에 새로운 방울이 생성됩니다. 푹 쉬고 내일 만나요!`
        );
        return;
      }

      const currentList = dropsByRoom[selectedRoomUserId] || [];
      const updatedList = currentList.filter(d => d.id !== drop.id);
      const updatedMap = {
        ...dropsByRoom,
        [selectedRoomUserId]: updatedList,
      };
      setDropsByRoom(updatedMap);
      if (familyId) {
        AsyncStorage.setItem(`PETMONG_ROOM_DROPS_${familyId}`, JSON.stringify(updatedMap)).catch(() => {});
      }

      const prevCount = dailyHarvestCount;
      const nextCount = Math.min(MAX_DAILY_HARVEST, prevCount + 1);
      setDailyHarvestCount(nextCount);
      const today = new Date().toISOString().split('T')[0];
      AsyncStorage.setItem(`PETMONG_DAILY_HARVEST_${currentUserProfile.id}_${today}`, String(nextCount)).catch(() => {});

      expandHudTemporarily(3500);

      if (onAwardExp && currentUserProfile?.id) {
        onAwardExp(currentUserProfile.id, config.exp, `방치 자원 수확 (+${config.exp} EXP)`);
      }

      // Check economic milestones: 5 items = +1P, 15 items = +2P
      if (nextCount % 5 === 0 && nextCount <= MAX_DAILY_HARVEST) {
        if (onAwardPoints) {
          onAwardPoints(1, `반려몽 방치 수확 (${nextCount}개 달성)`);
        }
        Alert.alert(
          '수확 포인트 획득! 🎉',
          `행복 방울 ${nextCount}개 수확 달성! 1P를 획득했습니다! 🪙`
        );
      }

      if (nextCount === MAX_DAILY_HARVEST) {
        if (onAwardPoints) {
          onAwardPoints(2, '반려몽 방치 수확 일일 완판 (+2P)');
        }
        Alert.alert(
          '일일 완판 보너스! 🌟',
          `오늘의 방울 ${MAX_DAILY_HARVEST}개 완판을 달성했습니다! 일일 완판 보너스 2P를 획득했습니다! 🏆`
        );
      }

      const quotes = {
        heart: '방울 따줘서 고마워요! 사랑이 가득 채워졌어요~ 💖',
        clover: '행운의 클로버 방울이다! 오늘 우리 가족에게 좋은 일이 생길 거예요 🍀',
        star: '반짝반짝 별빛 방울! 오늘 밤엔 좋은 꿈 꿀게요 ⭐',
      };
      handlePetBounceOnly(quotes[drop.type] || '방울 따줘서 고마워요! 몸이 가벼워졌어요 🥰');
    }
  };

  // Handle Harvesting All Drops in Current Room
  const handleHarvestAll = () => {
    const currentList = dropsByRoom[selectedRoomUserId] || [];
    if (currentList.length === 0) return;

    if (isVisitingOther) {
      if (dailyCareCount >= MAX_DAILY_CARE) {
        Alert.alert(
          '오늘의 돌봄 완료! 💕',
          `오늘 가족 반려몽 돌봄(일일 ${MAX_DAILY_CARE}회)을 이미 모두 완료했습니다!\n내일 다시 사랑과 관심을 전해주세요 🥰`
        );
        return;
      }

      const availableCare = MAX_DAILY_CARE - dailyCareCount;
      const careCountToHarvest = Math.min(currentList.length, availableCare);
      const dropsToHarvest = currentList.slice(0, careCountToHarvest);
      const remainingDrops = currentList.slice(careCountToHarvest);

      const updatedMap = {
        ...dropsByRoom,
        [selectedRoomUserId]: remainingDrops,
      };
      setDropsByRoom(updatedMap);
      if (familyId) {
        AsyncStorage.setItem(`PETMONG_ROOM_DROPS_${familyId}`, JSON.stringify(updatedMap)).catch(() => {});
      }

      const nextCare = dailyCareCount + careCountToHarvest;
      setDailyCareCount(nextCare);
      const today = new Date().toISOString().split('T')[0];
      AsyncStorage.setItem(`PETMONG_DAILY_CARE_${currentUserProfile.id}_${today}`, String(nextCare)).catch(() => {});

      const targetOwner = familyMembers.find(m => m.id === selectedRoomUserId);
      const targetName = targetOwner?.name || '가족';
      const totalExp = dropsToHarvest.reduce((sum, d) => sum + ((BUBBLE_CONFIG[d.type]?.exp || 1) + 1), 0);

      if (onAwardExp) {
        onAwardExp(selectedRoomUserId, totalExp, `가족 돌봄 방울 일괄 수확 (+${totalExp} EXP) (${nextCare}/${MAX_DAILY_CARE})`);
      }

      if (onAwardPoints) {
        onAwardPoints(careCountToHarvest, `${targetName} 반려몽 돌봄 보너스 (+${careCountToHarvest}P)`);
      }

      if (familyId && displayedCharacter?.id) {
        supabase.from('petmong_activities').insert({
          family_id: familyId,
          actor_id: myCharacter?.id || displayedCharacter.id,
          target_id: displayedCharacter.id,
          action_type: `가족 반려몽 방울 일괄 돌봄 (+${careCountToHarvest}P) (${nextCare}/${MAX_DAILY_CARE})`,
        }).then(() => {}).catch(() => {});
      }

      Alert.alert(
        '모두 돌봄 완료! 💕',
        `${targetName} 님의 방울 ${careCountToHarvest}개를 돌봐주었습니다!\n${totalExp} EXP 선물 & 돌봄 보너스 ${careCountToHarvest}P를 획득했습니다! 🪙 (오늘 ${nextCare}/${MAX_DAILY_CARE}회 완료)`
      );

      handlePetBounceOnly(`${currentUserProfile?.name || '가족'} 님이 방울을 따줬어요! 최고야! 💕`);
    } else {
      if (dailyHarvestCount >= MAX_DAILY_HARVEST) {
        Alert.alert(
          '오늘의 수확 완료! 🌟',
          `오늘 수확 가능한 방울(${MAX_DAILY_HARVEST}개)을 모두 수확했습니다!\n내일 자정에 새로운 방울이 생성됩니다. 푹 쉬고 내일 만나요!`
        );
        return;
      }

      const availableHarvest = MAX_DAILY_HARVEST - dailyHarvestCount;
      const countToHarvest = Math.min(currentList.length, availableHarvest);
      const dropsToHarvest = currentList.slice(0, countToHarvest);
      const remainingDrops = currentList.slice(countToHarvest);

      const updatedMap = {
        ...dropsByRoom,
        [selectedRoomUserId]: remainingDrops,
      };
      setDropsByRoom(updatedMap);
      if (familyId) {
        AsyncStorage.setItem(`PETMONG_ROOM_DROPS_${familyId}`, JSON.stringify(updatedMap)).catch(() => {});
      }

      const totalExp = dropsToHarvest.reduce((acc, d) => acc + (BUBBLE_CONFIG[d.type]?.exp || 1), 0);
      if (onAwardExp && currentUserProfile?.id) {
        onAwardExp(currentUserProfile.id, totalExp, `방치 자원 모두 수확 (+${totalExp} EXP)`);
      }

      const prevCount = dailyHarvestCount;
      const nextCount = prevCount + countToHarvest;
      setDailyHarvestCount(nextCount);
      const today = new Date().toISOString().split('T')[0];
      AsyncStorage.setItem(`PETMONG_DAILY_HARVEST_${currentUserProfile.id}_${today}`, String(nextCount)).catch(() => {});

      expandHudTemporarily(4500);

      const milestonesPassed = Math.floor(nextCount / 5) - Math.floor(prevCount / 5);
      let bonusPoints = milestonesPassed;
      if (prevCount < MAX_DAILY_HARVEST && nextCount >= MAX_DAILY_HARVEST) {
        bonusPoints += 2;
      }

      if (bonusPoints > 0 && onAwardPoints) {
        onAwardPoints(bonusPoints, `반려몽 방치 수확 (${countToHarvest}개 일괄 수확 보너스)`);
        Alert.alert(
          '모두 수확 완료! 🎉',
          `방울 ${countToHarvest}개를 한 번에 수확하여 +${totalExp} EXP와 +${bonusPoints}P를 획득했습니다! 🪙 (오늘: ${nextCount}/${MAX_DAILY_HARVEST}개)`
        );
      } else {
        Alert.alert(
          '모두 수확 완료! ✨',
          `방울 ${countToHarvest}개를 한 번에 수확하여 +${totalExp} EXP를 획득했습니다! (오늘 수확: ${nextCount}/${MAX_DAILY_HARVEST}개)`
        );
      }

      handlePetBounceOnly('와아! 방울들을 전부 따줘서 몸이 깃털처럼 가벼워졌어요~ 💖');
    }
  };

  const handleSelectTheme = (themeId) => {
    if (!currentUserProfile?.id) return;
    const updatedThemes = {
      ...roomThemesByRoom,
      [currentUserProfile.id]: themeId,
    };
    setRoomThemesByRoom(updatedThemes);
    setThemeModalVisible(false);

    // 1. Local storage caching
    if (familyId) {
      AsyncStorage.setItem(`PETMONG_ROOM_THEMES_${familyId}`, JSON.stringify(updatedThemes)).catch(() => {});
    }

    // 2. Realtime sync across devices/incognito via Supabase
    if (familyId) {
      const myPetId = myCharacter?.id || (displayedCharacter?.user_id === currentUserProfile.id ? displayedCharacter.id : null);
      if (myPetId) {
        supabase.from('petmong_activities').insert({
          family_id: familyId,
          actor_id: myPetId,
          target_id: myPetId,
          action_type: `ROOM_THEME_UPDATE:${currentUserProfile.id}:${themeId}`,
        }).then(() => {
          console.log('Successfully synced room theme to Supabase');
        }).catch(err => {
          console.log('Error syncing room theme to DB:', err);
        });
      }
    }
  };

  // Handle Tap on Other Family Member's Petmong
  const handleSubCharPress = (char) => {
    setSelectedTargetChar(char);
    const quote = getRandomDialogue(char.personality || '다정한');
    setSubBubbleCharId(char.id);
    setSubBubbleText(quote);
    setTimeout(() => {
      setSubBubbleCharId(null);
    }, 3500);
    setInteractionModalVisible(true);
  };

  // Handle AI Character Creation
  const handlePickImageAndCreate = async () => {
    if (!newName.trim()) {
      Alert.alert('알림', '반려몽의 이름을 지어주세요!');
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('권한 필요', '사진첩 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setIsGenerating(true);
      try {
        const { data, error } = await supabase.functions.invoke('generate-petmong', {
          body: { imageBase64: result.assets[0].base64, personality: newPersonality }
        });

        if (error) throw new Error(error.message || '서버 응답 오류');

        const newCharData = {
          user_id: currentUserProfile.id,
          family_id: familyId,
          name: newName.trim(),
          emoji: null,
          image_url: data.imageUrl,
          personality: newPersonality,
          level: 1,
          exp: 0,
        };

        const { data: insertedChar, error: insertError } = await supabase
          .from('petmong_characters')
          .insert(newCharData)
          .select()
          .single();

        if (insertError) throw insertError;

        setIsGenerating(false);
        setMyCharacter(insertedChar);
        setCreateModalVisible(false);
        setPetmongCharacters(prev => [...prev, insertedChar]);
        Alert.alert('탄생 완료! 🎉', '나를 똑닮은 귀여운 반려몽이 부화했어요!');
      } catch (err) {
        setIsGenerating(false);
        console.error('Edge function error:', err);
        Alert.alert('오류 발생', '반려몽 생성에 실패했습니다. 사진을 다시 올려주세요.');
      }
    }
  };

  // Handle Quick Character Creation with Emoji
  const handleCreateWithEmoji = async () => {
    if (!newName.trim()) {
      Alert.alert('알림', '반려몽의 이름을 지어주세요!');
      return;
    }
    try {
      setIsGenerating(true);
      const newCharData = {
        user_id: currentUserProfile.id,
        family_id: familyId,
        name: newName.trim(),
        emoji: newEmoji || '🐶',
        image_url: null,
        personality: newPersonality,
        level: 1,
        exp: 0,
      };

      const { data: insertedChar, error: insertError } = await supabase
        .from('petmong_characters')
        .insert(newCharData)
        .select()
        .single();

      if (insertError) throw insertError;

      setIsGenerating(false);
      setMyCharacter(insertedChar);
      setCreateModalVisible(false);
      setPetmongCharacters(prev => [...prev, insertedChar]);
      Alert.alert('탄생 완료! 🎉', `${newName.trim()}(이)가 우리 집에 입주했습니다!`);
    } catch (err) {
      setIsGenerating(false);
      console.error('Emoji character creation error:', err);
      Alert.alert('오류 발생', '반려몽 생성에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // Handle Interaction
  const handleInteract = (actionType) => {
    if (!selectedTargetChar || !myCharacter) return;
    const expGain = actionType === 'gift' ? 15 : 5;

    if (onAwardExp && currentUserProfile?.id) {
      onAwardExp(currentUserProfile.id, expGain, `가족 반려몽과 상호작용 (+${expGain} EXP)`);
    } else {
      setMyCharacter(prev => {
        if (!prev) return prev;
        let newExp = (prev.exp || 0) + expGain;
        let newLevel = prev.level || 1;
        if (newExp >= 100) {
          newExp -= 100;
          newLevel += 1;
          Alert.alert('레벨업! 🎉', `${prev.name}의 레벨이 ${newLevel}이 되었습니다!`);
        }
        return { ...prev, exp: newExp, level: newLevel };
      });
    }

    setInteractionModalVisible(false);
  };

  return (
    <View style={styles.fullscreenContainer}>
      {/* Fullscreen High-Resolution Room Background Image (Hardware Accelerated by expo-image) */}
      <ExpoImage
        source={ROOM_BACKGROUNDS[activeRoomTheme] || ROOM_BACKGROUNDS.cottage}
        style={styles.fullscreenBg}
        contentFit="cover"
        transition={0}
        priority="high"
        cachePolicy="memory-disk"
      />

      {/* Top Floating Glass Header (Family Room Tabs & Quick Actions) */}
      <View style={styles.topFloatingHeader}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.familyTabsScroll}
          contentContainerStyle={styles.familyTabsRow}
        >
          {/* My Room Chip */}
          <TouchableOpacity
            style={[
              styles.familyRoomChip,
              selectedRoomUserId === currentUserProfile?.id && styles.familyRoomChipActive,
            ]}
            onPress={() => setSelectedRoomUserId(currentUserProfile?.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.familyRoomChipAvatar}>🏠</Text>
            <Text
              style={[
                styles.familyRoomChipText,
                selectedRoomUserId === currentUserProfile?.id && styles.familyRoomChipTextActive,
              ]}
            >
              내 방
            </Text>
            {myCharacter && (
              <Text style={{ fontSize: 11, marginLeft: 3 }}>
                {myCharacter.emoji || '🐾'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Other Family Members' Rooms Chips */}
          {familyMembers
            .filter((m) => m.id !== currentUserProfile?.id)
            .map((member) => {
              const memberPet = petmongCharacters.find(c => c.user_id === member.id);
              const isSelected = selectedRoomUserId === member.id;
              return (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.familyRoomChip,
                    isSelected && styles.familyRoomChipActive,
                  ]}
                  onPress={() => setSelectedRoomUserId(member.id)}
                  activeOpacity={0.8}
                >
                  <UserAvatar avatar={member.avatar} size={18} style={{ marginRight: 6 }} />
                  <Text
                    style={[
                      styles.familyRoomChipText,
                      isSelected && styles.familyRoomChipTextActive,
                    ]}
                  >
                    {member.name}의 방
                  </Text>
                  {memberPet && (
                    <Text style={{ fontSize: 11, marginLeft: 3 }}>
                      {memberPet.emoji || '🐾'}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
        </ScrollView>

        {/* Top Right Action Icons */}
        <View style={styles.topActionsRow}>
          {/* Room Theme Selector (Active for my room, informs owner theme when visiting) */}
          <TouchableOpacity
            style={[styles.topActionIconBtn, isVisitingOther && { opacity: 0.85 }]}
            onPress={() => {
              if (isVisitingOther) {
                const currentThemeObj = ROOM_THEMES.find(t => t.id === activeRoomTheme) || ROOM_THEMES[0];
                Alert.alert(
                  '방 테마 안내 🏡',
                  `${displayedOwner?.name || '가족'} 님이 설정한 '${currentThemeObj.name}' 테마입니다.\n방 테마 변경은 '내 방'에서 자유롭게 하실 수 있어요!`
                );
              } else {
                setThemeModalVisible(true);
              }
            }}
            activeOpacity={0.8}
          >
            <Palette size={14} color="#D9534F" />
            <Text style={styles.topActionBtnText}>테마</Text>
          </TouchableOpacity>

          {/* Family Pet Book Modal */}
          <TouchableOpacity
            style={[styles.topActionIconBtn, styles.topActionIconBtnBlue]}
            onPress={() => setFamilyBookModalVisible(true)}
            activeOpacity={0.8}
          >
            <BookOpen size={14} color="#2563EB" />
            <Text style={[styles.topActionBtnText, { color: '#2563EB' }]}>
              도감 ({petmongCharacters.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Fullscreen Interactive Room Game Engine */}
      {displayedCharacter ? (
        <PetmongGameEngine
          character={displayedCharacter}
          owner={displayedOwner}
          isVisiting={isVisitingOther}
          visitorCharacter={myCharacter}
          theme={activeRoomTheme}
          insets={insets}
          vitals={petVitals}
          onUpdateVitals={handleUpdateVitals}
          onGainExp={handleGameGainExp}
          onAwardPoints={onAwardPoints}
          dailyCareCount={dailyCareCount}
          maxDailyCare={MAX_DAILY_CARE}
          onCareAction={handleGameCareAction}
          transparentUrl={displayedTransparentUrl || transparentImageCache.get(displayedCharacter.image_url)}
        />
      ) : (
        /* Empty Room Banner */
        <View style={styles.fullscreenOverlayCanvas} pointerEvents="box-none">
          <View style={styles.createPromptBanner}>
            <Text style={styles.createPromptTitle}>
              {isVisitingOther
                ? `${displayedOwner?.name || '가족'} 님의 방`
                : '아늑한 우리 가족의 방 🏡'}
            </Text>
            <Text style={styles.createPromptSub}>
              {isVisitingOther
                ? '아직 반려몽이 태어나지 않은 방입니다.'
                : '나를 쏙 닮은 귀여운 AI 반려몽을 입주시켜보세요!'}
            </Text>
            {!isVisitingOther && (
              <TouchableOpacity
                style={styles.createPromptBtn}
                onPress={() => setCreateModalVisible(true)}
                activeOpacity={0.8}
              >
                <Sparkles size={16} color="#FFFFFF" />
                <Text style={styles.createPromptBtnText}>반려몽 태어나기 🐣</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* AI Character Creation Modal (FamLink Unified Style - Identical to SmallTalkScreen) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={createModalVisible}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalView}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleRow}>
                <Sparkles size={20} color="#FF7E82" style={{ marginRight: 6 }} />
                <Text style={styles.modalHeader}>나만의 AI 반려몽 태어나기 🐣</Text>
              </View>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <X size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubDesc}>
              얼굴 사진을 올리면 AI가 나를 닮은 귀여운 맞춤 캐릭터 반려몽을 만들어 드려요!
            </Text>

            <Text style={styles.modalLabel}>반려몽 이름</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="예: 몽몽이"
              value={newName}
              onChangeText={setNewName}
              placeholderTextColor="#AEAEB2"
            />

            <Text style={styles.modalLabel}>성격 선택</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginBottom: 12 }}>
              {PERSONALITY_OPTIONS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.traitSelectBtn,
                    newPersonality === p && styles.traitSelectBtnActive,
                  ]}
                  onPress={() => setNewPersonality(p)}
                >
                  <Text
                    style={[
                      styles.traitSelectText,
                      newPersonality === p && styles.traitSelectTextActive,
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>캐릭터 선택 (기본 캐릭터 또는 AI 사진 생성)</Text>
            <View style={styles.emojiPickerRow}>
              {['🐶', '🐱', '🐰', '🐻', '🦊', '🐥', '🐼', '🐨'].map((em) => (
                <TouchableOpacity
                  key={em}
                  style={[
                    styles.emojiPickBtn,
                    newEmoji === em && styles.emojiPickBtnActive,
                  ]}
                  onPress={() => setNewEmoji(em)}
                >
                  <Text style={{ fontSize: 24 }}>{em}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.creationBtnGroup}>
              <TouchableOpacity
                style={styles.modalEmojiConfirmBtn}
                onPress={handleCreateWithEmoji}
                activeOpacity={0.8}
              >
                <Text style={styles.modalEmojiConfirmBtnText}>
                  {newEmoji} 캐릭터로 바로 입주하기
                </Text>
              </TouchableOpacity>

              <View style={styles.orDividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>또는 AI로 특별하게</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handlePickImageAndCreate}
                activeOpacity={0.8}
              >
                <Camera size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.modalConfirmBtnText}>내 사진으로 AI 반려몽 그리기</Text>
              </TouchableOpacity>
            </View>

            {/* AI Generation Loading Overlay */}
            {isGenerating && (
              <View style={styles.generatingOverlay}>
                <ActivityIndicator size="large" color="#FF7E82" />
                <Text style={styles.generatingText}>
                  AI가 나를 닮은 귀여운 반려몽을{'\n'}정성껏 그리는 중입니다... 🎨
                </Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Character Interaction Modal (FamLink Unified Style) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={interactionModalVisible}
        onRequestClose={() => setInteractionModalVisible(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.interactModalBox}>
            <View style={styles.interactAvatarBox}>
              {selectedTargetChar?.image_url ? (
                <Image source={{ uri: selectedTargetChar.image_url }} style={{ width: 80, height: 80, borderRadius: 40 }} />
              ) : (
                <Text style={{ fontSize: 48 }}>{selectedTargetChar?.emoji || '🐱'}</Text>
              )}
            </View>

            <Text style={styles.interactTitle}>{selectedTargetChar?.name}에게 마음 전하기</Text>
            <Text style={styles.interactDesc}>상대방 반려몽에게 인사를 건네거나 선물을 해보세요!</Text>

            <View style={styles.interactBtnRow}>
              <TouchableOpacity style={styles.interactBtnItem} onPress={() => handleInteract('greet')}>
                <View style={[styles.interactIconBox, { backgroundColor: '#EBF5FF' }]}>
                  <Smile size={24} color="#4A90E2" />
                </View>
                <Text style={styles.interactBtnText}>인사하기 👋</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.interactBtnItem} onPress={() => handleInteract('gift')}>
                <View style={[styles.interactIconBox, { backgroundColor: '#FFEBEB' }]}>
                  <Gift size={24} color="#FF7E82" />
                </View>
                <Text style={styles.interactBtnText}>선물하기 🎁</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.interactBtnItem} onPress={() => handleInteract('pet')}>
                <View style={[styles.interactIconBox, { backgroundColor: '#FFF9E6' }]}>
                  <Heart size={24} color="#F1C40F" />
                </View>
                <Text style={styles.interactBtnText}>쓰다듬기 ✨</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.closeInteractBtn} onPress={() => setInteractionModalVisible(false)}>
              <Text style={styles.closeInteractText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 4-Stage Evolution Milestone Celebration Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={evolutionModalVisible}
        onRequestClose={handleCloseEvolutionModal}
      >
        <View style={styles.evolutionOverlay}>
          <View style={styles.evolutionCard}>
            <Text style={styles.evolutionHeaderEmoji}>🎊✨🎉</Text>
            <Text style={styles.evolutionTitle}>반려몽 단계 진화!</Text>
            
            {evolutionData && (
              <>
                <View style={[styles.evolutionStagePill, { backgroundColor: evolutionData.stage.badgeColor }]}>
                  <Text style={styles.evolutionStagePillText}>
                    Stage {evolutionData.stage.stage} • {evolutionData.stage.stageTitle}
                  </Text>
                </View>

                {/* AI Image Evolution Loading Indicator */}
                {evolutionData.isAiEvolving ? (
                  <View style={styles.evolutionGeneratingBox}>
                    <ActivityIndicator size="small" color="#EB2F96" />
                    <Text style={styles.evolutionGeneratingText}>
                      기존 모습을 바탕으로 AI가 성장한 버전을 생성하는 중입니다... 🎨
                    </Text>
                  </View>
                ) : (
                  /* Comparison View (Before vs After) */
                  <View style={styles.evolutionComparisonRow}>
                    <View style={styles.evolutionPreviewBox}>
                      <Text style={styles.evolutionPreviewLabel}>Lv.{evolutionData.previousLevel} 이전</Text>
                      {evolutionData.previousImageUrl || evolutionData.character.image_url ? (
                        <Image
                          source={{ uri: evolutionData.previousImageUrl || evolutionData.character.image_url }}
                          style={{ width: 55, height: 55, borderRadius: 28 }}
                          resizeMode="contain"
                        />
                      ) : (
                        <Text style={styles.evolutionPreviewEmoji}>
                          {getEvolvedEmoji(evolutionData.character.emoji, evolutionData.previousLevel)}
                        </Text>
                      )}
                    </View>

                    <ChevronRight size={22} color="#FF7E82" />

                    <View style={[styles.evolutionPreviewBox, styles.evolutionPreviewBoxActive]}>
                      <Text style={[styles.evolutionPreviewLabel, { color: '#D48806', fontWeight: '800' }]}>
                        Lv.{evolutionData.newLevel} 진화 ✨
                      </Text>
                      {evolutionData.character.image_url ? (
                        <Image
                          source={{ uri: evolutionData.newImageUrl || evolutionData.character.image_url }}
                          style={{ width: 70, height: 70, borderRadius: 35 }}
                          resizeMode="contain"
                        />
                      ) : (
                        <Text style={[styles.evolutionPreviewEmoji, { fontSize: 44 }]}>
                          {getEvolvedEmoji(evolutionData.character.emoji, evolutionData.newLevel)}
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                <Text style={styles.evolutionDesc}>
                  {evolutionData.character.name}이(가) 가족의 깊은 애정과 사랑으로 {evolutionData.stage.name}(으)로 멋지게 진화했습니다!
                  {'\n'}{evolutionData.stage.desc}
                </Text>

                <View style={styles.evolutionBonusBadge}>
                  <Sparkles size={14} color="#52C41A" />
                  <Text style={styles.evolutionBonusText}>
                    성장 효과: 방 안 캐릭터 크기 확대 & 단계별 전용 오라 해금!
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.evolutionConfirmBtn}
                  onPress={handleCloseEvolutionModal}
                  activeOpacity={0.85}
                >
                  <Text style={styles.evolutionConfirmBtnText}>멋지게 자란 모습 확인하기 💖</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Level Up Celebration Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={levelUpModalVisible}
        onRequestClose={() => setLevelUpModalVisible(false)}
      >
        <View style={styles.levelUpOverlay}>
          <View style={styles.levelUpCard}>
            <Text style={styles.levelUpEmoji}>🎊🌱✨</Text>
            <Text style={styles.levelUpTitle}>반려몽 레벨업!</Text>
            <Text style={styles.levelUpNameText}>
              {levelUpInfo.name}의 레벨이 Lv.{levelUpInfo.level}로 올랐습니다!
            </Text>
            <Text style={styles.levelUpDesc}>
              가족들의 따뜻한 관심과 소통으로 반려몽이 무럭무럭 자라고 있어요! 앞으로도 대화와 집안일을 함께하며 키워나가 봐요.
            </Text>
            <TouchableOpacity
              style={styles.levelUpBtn}
              onPress={() => setLevelUpModalVisible(false)}
            >
              <Text style={styles.levelUpBtnText}>신난다! 계속 키우기 💖</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Family Petmong Book / Roster Modal (가족 반려몽 도감) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={familyBookModalVisible}
        onRequestClose={() => setFamilyBookModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalView, { maxHeight: '85%' }]}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleRow}>
                <Users size={20} color="#4A90E2" style={{ marginRight: 6 }} />
                <Text style={styles.modalHeader}>우리 가족 반려몽 도감 ({petmongCharacters.length}마리)</Text>
              </View>
              <TouchableOpacity onPress={() => setFamilyBookModalVisible(false)}>
                <X size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubDesc}>
              온 가족의 반려몽 현황을 한눈에 보고 마음을 전해보세요! 방 안에는 쾌적한 환경을 위해 최대 {MAX_ACTIVE_ROAMING}마리가 번갈아 산책하고 가구에서 쉬어갑니다.
            </Text>

            <ScrollView style={{ marginTop: 8 }} showsVerticalScrollIndicator={false}>
              {petmongCharacters.map((char) => {
                const owner = familyMembers.find(m => m.id === char.user_id);
                const isMine = char.user_id === currentUserProfile?.id;
                const isRoaming = !isMine && familyCharacters.slice(0, MAX_ACTIVE_ROAMING).some(c => c.id === char.id);

                return (
                  <View key={char.id} style={[styles.bookPetCard, isMine && styles.bookPetCardMine]}>
                    <View style={styles.bookPetAvatarBox}>
                      {char.image_url ? (
                        <Image source={{ uri: char.image_url }} style={styles.bookPetImg} resizeMode="contain" />
                      ) : (
                        <Text style={{ fontSize: 32 }}>{char.emoji || '🐶'}</Text>
                      )}
                    </View>

                    <View style={styles.bookPetInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <UserAvatar avatar={owner?.avatar} size={16} />
                        <Text style={styles.bookPetOwnerName}>
                          {owner?.name || '가족'} {isMine ? '(나)' : ''}
                        </Text>
                        {isMine ? (
                          <View style={styles.bookTagMine}>
                            <Text style={styles.bookTagMineText}>내 반려몽</Text>
                          </View>
                        ) : isRoaming ? (
                          <View style={styles.bookTagRoaming}>
                            <Text style={styles.bookTagRoamingText}>방에서 배회 중 🐾</Text>
                          </View>
                        ) : (
                          <View style={styles.bookTagResting}>
                            <Text style={styles.bookTagRestingText}>가구에서 휴식 중 💤</Text>
                          </View>
                        )}
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.bookPetName}>{char.name}</Text>
                        <Text style={styles.bookPetLevel}>Lv.{char.level || 1}</Text>
                        <View style={styles.bookPetPersonalityTag}>
                          <Text style={styles.bookPetPersonalityText}>{char.personality || '다정한'}</Text>
                        </View>
                      </View>

                      {/* Small Exp Bar */}
                      <View style={styles.bookExpBarBg}>
                        <View style={[styles.bookExpBarFill, { width: `${Math.min(100, char.exp || 0)}%` }]} />
                      </View>
                    </View>

                    {!isMine && (
                      <TouchableOpacity
                        style={styles.bookInteractBtn}
                        onPress={() => {
                          setFamilyBookModalVisible(false);
                          handleSubCharPress(char);
                        }}
                        activeOpacity={0.8}
                      >
                        <Heart size={14} color="#FF4D6D" fill="#FF4D6D" style={{ marginRight: 4 }} />
                        <Text style={styles.bookInteractBtnText}>마음 전하기</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Sumone-Style Empty Room Theme Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={themeModalVisible}
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleRow}>
                <Layers size={20} color="#FF7E82" style={{ marginRight: 6 }} />
                <Text style={styles.modalHeader}>방 테마 선택</Text>
              </View>
              <TouchableOpacity onPress={() => setThemeModalVisible(false)}>
                <X size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubDesc}>
              원하는 분위기의 방을 선택하여 우리 가족만의 아늑한 힐링 공간을 꾸며보세요!
            </Text>

            <View style={{ gap: 12, marginTop: 4 }}>
              {ROOM_THEMES.map((theme) => {
                const isSelected = activeRoomTheme === theme.id;
                return (
                  <TouchableOpacity
                    key={theme.id}
                    style={[
                      styles.themeCardItem,
                      isSelected && styles.themeCardItemActive,
                    ]}
                    onPress={() => handleSelectTheme(theme.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.themeCardIconWrap}>
                      <Text style={{ fontSize: 28 }}>{theme.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.themeCardTitle}>{theme.name}</Text>
                        {isSelected && (
                          <View style={styles.themeSelectedBadge}>
                            <Check size={11} color="#FFFFFF" style={{ marginRight: 2 }} />
                            <Text style={styles.themeSelectedBadgeText}>사용 중</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.themeCardDesc}>{theme.desc}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

