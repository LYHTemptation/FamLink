import styles from './InteriorStyles';
import React, { useState, useRef, useEffect } from 'react';
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
import { MoodIcon } from './icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BASE_CANVAS_SIZE = SCREEN_WIDTH - 64; // Account for scrollContent padding 32 + canvasCard padding 32
const MAX_DAILY_TOUCH = 10; // Daily touch EXP reward limit (10 times = +30 EXP)
const MAX_ACTIVE_ROAMING = 3; // Maximum active wandering family pets simultaneously

// High-Res 3 Sumone-Style Empty Room Shell Backgrounds & Classic Day/Night
const ROOM_BACKGROUNDS = {
  cottage: require('../assets/petmong/empty_room_cottage.jpg'),
  pastel: require('../assets/petmong/empty_room_pastel.jpg'),
  midnight: require('../assets/petmong/empty_room_midnight.jpg'),
  day: require('../assets/petmong/room_day.jpg'),
  night: require('../assets/petmong/room_night.jpg'),
};

const ROOM_THEMES = [
  { id: 'cottage', name: '코티지 원목', emoji: '🏡', desc: '따스한 햇살과 원목 바닥' },
  { id: 'pastel', name: '파스텔 핑크', emoji: '🌸', desc: '사랑스럽고 화사한 핑크 룸' },
  { id: 'midnight', name: '미드나잇 다락방', emoji: '🌌', desc: '신비롭고 아늑한 인디고 밤' },
];

// Sumone-Style Fixed Room Hotspot Slots (Adjusted for harmonious room perspective)
const ROOM_SLOTS = [
  { id: 'window', name: '벽면 창문/아트', category: 'wall', x: 28, y: 15, width: 110, height: 110, label: '+ 창문 자리', defaultEmoji: '🪟', desc: '벽면에 따뜻한 햇살과 바깥 풍경을 담는 창문' },
  { id: 'sofa', name: '휴식 소파/침대', category: 'rest', x: 8, y: 46, width: 130, height: 105, label: '+ 소파 자리', defaultEmoji: '🛋️', desc: '반려몽이 올라가 낮잠을 즐기는 아늑한 자리' },
  { id: 'rug', name: '바닥 러그', category: 'floor', x: 30, y: 68, width: 140, height: 95, label: '+ 러그 자리', defaultEmoji: '☁️', desc: '방 중앙 바닥을 포근하게 받쳐주는 러그' },
  { id: 'lamp', name: '스탠드 조명', category: 'deco', x: 74, y: 35, width: 70, height: 120, label: '+ 조명 자리', defaultEmoji: '💡', desc: '방 안을 은은하고 따뜻하게 밝혀주는 플로어 스탠드' },
  { id: 'plant', name: '식물 화분/소품', category: 'deco', x: 70, y: 55, width: 80, height: 90, label: '+ 화분 자리', defaultEmoji: '🪴', desc: '싱그러운 초록빛 감성을 더해주는 화분' },
];

// Sumone-Style Furniture Objects Catalog per Slot (Unlockable with Family Points & Real Illustration Assets)
const FURNITURE_CATALOG = [
  // 1. Window Slot (wall)
  {
    id: 'f_win_1',
    slotId: 'window',
    category: 'wall',
    name: '햇살 가득 원목 창문',
    emoji: '🪟',
    cost: 150,
    desc: '살랑이는 커튼 사이로 따스한 햇살이 비추는 감성 창문',
    image: require('../assets/petmong/obj_window_sunshine.png'),
  },
  {
    id: 'f_win_2',
    slotId: 'window',
    category: 'wall',
    name: '별빛 밤하늘 창문',
    emoji: '🌌',
    cost: 220,
    desc: '달콤한 밤하늘과 별똥별이 내다보이는 로맨틱 창문',
  },

  // 2. Sofa/Bed Slot (rest)
  {
    id: 'f_sofa_1',
    slotId: 'sofa',
    category: 'rest',
    name: '머스터드 패브릭 소파',
    emoji: '🛋️',
    cost: 200,
    desc: '반려몽이 뒹굴거리며 낮잠 자기 좋은 포근한 2인용 소파',
    image: require('../assets/petmong/obj_sofa_yellow.png'),
  },
  {
    id: 'f_sofa_2',
    slotId: 'sofa',
    category: 'rest',
    name: '구름 솜털 침대',
    emoji: '🛏️',
    cost: 260,
    desc: '누우면 바로 꿀잠에 빠져드는 마법의 폭신 침대',
  },
  {
    id: 'f_sofa_3',
    slotId: 'sofa',
    category: 'rest',
    name: '원목 흔들의자',
    emoji: '🪑',
    cost: 320,
    desc: '살랑살랑 흔들리며 피로를 풀어주는 빈티지 흔들의자',
  },

  // 3. Rug Slot (floor)
  {
    id: 'f_rug_1',
    slotId: 'rug',
    category: 'floor',
    name: '몽실몽실 구름 러그',
    emoji: '☁️',
    cost: 100,
    desc: '발이 편안해지는 부드럽고 폭신한 크림화이트 구름 카펫',
    image: require('../assets/petmong/obj_rug_cloud.png'),
  },
  {
    id: 'f_rug_2',
    slotId: 'rug',
    category: 'floor',
    name: '체크 파스텔 러그',
    emoji: '🧇',
    cost: 160,
    desc: '북유럽 감성이 물씬 풍기는 따뜻한 와플 러그',
  },
  {
    id: 'f_rug_3',
    slotId: 'rug',
    category: 'floor',
    name: '포근한 꽃잎 원형 러그',
    emoji: '🌸',
    cost: 220,
    desc: '봄날 벚꽃이 핀 듯 향긋한 원형 러그',
  },

  // 4. Floor Lamp Slot (deco)
  {
    id: 'f_lamp_1',
    slotId: 'lamp',
    category: 'deco',
    name: '클래식 빈티지 조명',
    emoji: '💡',
    cost: 130,
    desc: '고즈넉한 원목 기둥과 플리츠 갓의 아늑한 플로어 램프',
    image: require('../assets/petmong/obj_lamp_vintage.png'),
  },
  {
    id: 'f_lamp_2',
    slotId: 'lamp',
    category: 'deco',
    name: '따뜻한 별빛 무드등',
    emoji: '🌟',
    cost: 180,
    desc: '방 안을 은은하고 따뜻하게 비춰주는 수면등',
  },

  // 5. Plant & Shelf Slot (deco)
  {
    id: 'f_plant_1',
    slotId: 'plant',
    category: 'deco',
    name: '몬스테라 테라코타 화분',
    emoji: '🪴',
    cost: 140,
    desc: '피톤치드가 뿜어져 나오는 싱그럽고 생기 넘치는 관엽식물',
    image: require('../assets/petmong/obj_plant_pot.png'),
  },
  {
    id: 'f_plant_2',
    slotId: 'plant',
    category: 'deco',
    name: '장난감 곰인형',
    emoji: '🧸',
    cost: 160,
    desc: '반려몽이 잘 때 꼭 껴안고 자는 영원한 단짝 친구',
  },
  {
    id: 'f_plant_3',
    slotId: 'plant',
    category: 'deco',
    name: '감성 레트로 LP 오디오',
    emoji: '📻',
    cost: 240,
    desc: '잔잔한 재즈와 클래식이 흘러나오는 미니 턴테이블',
  },
];

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

// Sumone-Style Fixed Slot Object Component (Renders only equipped objects in normal room view)
const RoomSlotObject = React.memo(({
  slot,
  equippedItem,
  onPressSlot,
  styles,
}) => {
  // If no item is equipped in this slot, keep the room background clean (no plus badges)
  if (!equippedItem) {
    return null;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPressSlot(slot)}
      style={[
        styles.slotObjectWrapper,
        {
          left: `${slot.x}%`,
          top: `${slot.y}%`,
        },
      ]}
    >
      <View style={styles.slotEquippedContainer}>
        {equippedItem.image ? (
          <View
            style={[
              styles.slotItemImageWrapper,
              slot.width ? { width: slot.width, height: slot.height } : null,
            ]}
          >
            {Platform.OS === 'web' ? (
              <img
                src={equippedItem.image}
                alt={equippedItem.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  mixBlendMode: 'multiply',
                  display: 'block',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              />
            ) : (
              <Image
                source={equippedItem.image}
                style={styles.slotItemImage}
                resizeMode="contain"
              />
            )}
          </View>
        ) : (
          <Text style={styles.slotEquippedEmoji}>{equippedItem.emoji}</Text>
        )}
      </View>
    </TouchableOpacity>
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
  const [isRestingOnFurniture, setIsRestingOnFurniture] = useState(false);
  const [restingFurnitureName, setRestingFurnitureName] = useState(null);
  const isMountedRef = useRef(true);
  const walkTimerRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;

    // Bobbing loop for footstep vibration
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, { toValue: -3.5, duration: 220, useNativeDriver: true }),
        Animated.timing(bobAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ])
    );

    const wander = () => {
      if (!isMountedRef.current) return;

      // Furniture interaction: check if cozy furniture is placed on floor
      const cozyFurnitureList = (placedFurniture || []).filter(f => 
        RESTING_FURNITURE_EMOJIS.includes(f.emoji) && f.y >= 20 && f.y <= 75
      );

      // 30% chance to target a cozy placed furniture item if available
      const shouldTargetFurniture = cozyFurnitureList.length > 0 && Math.random() < 0.35;
      let nextX, nextY;
      let targetFurniture = null;

      if (shouldTargetFurniture) {
        targetFurniture = cozyFurnitureList[Math.floor(Math.random() * cozyFurnitureList.length)];
        // Slightly offset so the pet looks like sitting right on/beside the furniture
        nextX = Math.max(6, Math.min(84, Math.round(targetFurniture.x + 2)));
        nextY = Math.max(34, Math.min(68, Math.round(targetFurniture.y + 4)));
      } else {
        // Pick a random target within open floor areas (preferring sides & upper back area)
        const isSide = Math.random() > 0.3;
        if (isSide) {
          nextX = Math.random() > 0.5 
            ? Math.round(8 + Math.random() * 24)    // 8% ~ 32% (Left open floor)
            : Math.round(62 + Math.random() * 22);  // 62% ~ 84% (Right open floor)
          nextY = Math.round(38 + Math.random() * 22); // 38% ~ 60%
        } else {
          nextX = Math.round(12 + Math.random() * 70); // 12% ~ 82% (Upper back floor)
          nextY = Math.round(34 + Math.random() * 8);  // 34% ~ 42%
        }
      }

      const dx = nextX - currentX.current;
      const dy = nextY - currentY.current;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Face direction of walk
      if (dx < -2) {
        Animated.timing(scaleXAnim, { toValue: -1, duration: 160, useNativeDriver: true }).start();
      } else if (dx > 2) {
        Animated.timing(scaleXAnim, { toValue: 1, duration: 160, useNativeDriver: true }).start();
      }

      const duration = Math.max(2000, Math.min(4500, dist * 70));

      setIdleEmote(null);
      setIsRestingOnFurniture(false);
      setRestingFurnitureName(null);
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
          if (targetFurniture) {
            // Settled on cozy furniture! Show cute snoozing/relaxed state
            setIsRestingOnFurniture(true);
            setRestingFurnitureName(targetFurniture.name || '가구');
            const sleepEmotes = ['💤', '💤', '✨', '🥰', '☕'];
            setIdleEmote(sleepEmotes[Math.floor(Math.random() * sleepEmotes.length)]);

            // Longer resting duration on comfortable furniture
            const restDuration = 6000 + Math.random() * 5000;
            walkTimerRef.current = setTimeout(wander, restDuration);
          } else {
            // Normal arrival emotion bubble
            if (Math.random() < 0.6) {
              const ownerMood = owner?.mood || '😊';
              const emotes = [ownerMood, '💤', '❤️', '🐾', '✨', '🎵', '🌿'];
              const chosen = emotes[Math.floor(Math.random() * emotes.length)];
              setIdleEmote(chosen);
              setTimeout(() => {
                if (isMountedRef.current && !targetFurniture) setIdleEmote(null);
              }, 2600);
            }

            // Staggered pacing: only 2-3 characters wander simultaneously, others rest
            const nextDelay = 4500 + (index % 3) * 2500 + Math.random() * 4000;
            walkTimerRef.current = setTimeout(wander, nextDelay);
          }
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
      Animated.timing(tapBounceAnim, { toValue: -12, duration: 120, useNativeDriver: true }),
      Animated.spring(tapBounceAnim, { toValue: 0, friction: 3, tension: 60, useNativeDriver: true }),
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
            <Text style={styles.subCharOwnerAvatar}>{owner?.avatar || '👦'}</Text>
            <Text style={styles.subCharOwnerName}>{owner?.name || '가족'}의</Text>
          </View>
          <Text style={styles.subCharLabelText}>{char.name} (Lv.{char.level || 1})</Text>
          {isRestingOnFurniture && restingFurnitureName && (
            <View style={styles.restingBadge}>
              <Text style={styles.restingBadgeText}>{restingFurnitureName}에서 휴식 중 💤</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function InteriorScreen({
  points,
  onDeductPoints,
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
  
  // UI States
  const [shopModalVisible, setShopModalVisible] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState('sofa'); // Currently selected slot in shop modal: 'rug', 'sofa', 'shelf', 'play'
  const [unlockedFurnitureIds, setUnlockedFurnitureIds] = useState(['f_sofa_1', 'f_rug_1']); // Default starting unlocked items
  
  // Petmong States (Linked with Supabase)
  const [myCharacter, setMyCharacter] = useState(null);
  const [mainCharTransparentUrl, setMainCharTransparentUrl] = useState(null);
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

  // Sub Character Dialogue State
  const [subBubbleCharId, setSubBubbleCharId] = useState(null);
  const [subBubbleText, setSubBubbleText] = useState('');

  // Interaction Modal State
  const [interactionModalVisible, setInteractionModalVisible] = useState(false);
  const [selectedTargetChar, setSelectedTargetChar] = useState(null);

  // Family Petmong Book / Roster Modal State
  const [familyBookModalVisible, setFamilyBookModalVisible] = useState(false);

  // Sumone-Style 3 Room Theme State (Default: cottage 빈 방)
  const [roomTheme, setRoomTheme] = useState('cottage');
  const [themeModalVisible, setThemeModalVisible] = useState(false);

  // Main Character Float Animation
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (familyId && currentUserProfile?.id) {
      const mine = petmongCharacters.find(c => c.user_id === currentUserProfile.id);
      const others = petmongCharacters.filter(c => c.user_id !== currentUserProfile.id).map((c, idx) => ({
        ...c,
        x: 10 + (idx * 28) % 70,
        y: 54 + (idx * 14) % 24,
      }));
      
      if (mine) {
        setMyCharacter(mine);
        setCreateModalVisible(false);
      } else {
        setCreateModalVisible(true);
      }
      
      setFamilyCharacters(others);
    }
  }, [familyId, currentUserProfile, petmongCharacters]);

  useEffect(() => {
    if (myCharacter?.image_url) {
      if (transparentImageCache.has(myCharacter.image_url)) {
        setMainCharTransparentUrl(transparentImageCache.get(myCharacter.image_url));
      } else {
        makeBackgroundTransparent(myCharacter.image_url).then(url => {
          setMainCharTransparentUrl(url);
          // Persist the clean transparent PNG to Supabase so it permanently never has a white background
          if (myCharacter.id && !myCharacter.image_url.startsWith('data:image/png')) {
            supabase
              .from('petmong_characters')
              .update({ image_url: url })
              .eq('id', myCharacter.id)
              .then(() => {
                console.log('Successfully persisted transparent petmong character image in DB');
              });
          }
        });
      }
    } else {
      setMainCharTransparentUrl(null);
    }
  }, [myCharacter?.id, myCharacter?.image_url]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -3, duration: 1800, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, [floatAnim]);

  // Load daily touch count for today from DB (Supabase petmong_activities) & AsyncStorage
  useEffect(() => {
    if (!currentUserProfile?.id) return;
    const today = new Date().toISOString().split('T')[0];
    const key = `PETMONG_TOUCH_${currentUserProfile.id}_${today}`;

    // 1. Initial quick load from local storage
    AsyncStorage.getItem(key).then(val => {
      if (val !== null) {
        setDailyTouchCount(parseInt(val, 10) || 0);
      } else {
        setDailyTouchCount(0);
      }
    }).catch(err => console.log('Error loading daily touch count:', err));

    // Load unlocked furniture items
    AsyncStorage.getItem('PETMONG_UNLOCKED_FURNITURE').then(val => {
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setUnlockedFurnitureIds(prev => Array.from(new Set([...prev, ...parsed])));
          }
        } catch (e) {}
      }
    }).catch(() => {});

    // 2. Fetch ground-truth count from Supabase petmong_activities for cross-device sync (e.g. mobile <-> PC)
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
  }, [currentUserProfile?.id, myCharacter?.id]);

  // Handle Tap Interaction on My Petmong (Sumone Style)
  const handlePetTap = () => {
    if (!myCharacter) return;

    // 1. Bounce animation
    Animated.sequence([
      Animated.timing(bounceAnim, { toValue: -18, duration: 150, useNativeDriver: true }),
      Animated.spring(bounceAnim, { toValue: 0, friction: 3, tension: 70, useNativeDriver: true }),
    ]).start();

    // 2. Heart floating particle animation
    setHeartVisible(true);
    heartAnim.setValue(0);
    Animated.timing(heartAnim, {
      toValue: 1,
      duration: 1100,
      useNativeDriver: true,
    }).start(() => setHeartVisible(false));

    // 3. Speech bubble with personality & time-based quote
    const isLimitReached = dailyTouchCount >= MAX_DAILY_TOUCH;
    const quote = isLimitReached
      ? '오늘 사랑은 듬뿍 받았어요! 내일 또 쓰다듬어주세요 🥰'
      : getRandomDialogue(myCharacter.personality);
    setBubbleText(quote);
    setBubbleVisible(true);
    bubbleAnim.setValue(0);
    Animated.spring(bubbleAnim, {
      toValue: 1,
      friction: 5,
      tension: 60,
      useNativeDriver: true,
    }).start();

    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = setTimeout(() => {
      Animated.timing(bubbleAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
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

      if (onAwardExp && currentUserProfile?.id) {
        onAwardExp(currentUserProfile.id, 3, `반려몽 쓰다듬기 (${nextCount}/${MAX_DAILY_TOUCH})`);
      } else {
        setMyCharacter(prev => {
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

        if (error) {
          throw new Error(error.message || '서버 응답 오류');
        }

        const newCharData = {
          user_id: currentUserProfile.id,
          family_id: familyId,
          name: newName,
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

  // Sumone-Style Slot & Object Unlock/Equip Handlers
  const handleUnlockAndEquip = (item) => {
    if (points < item.cost) {
      Alert.alert('포인트 부족 ⚠️', `[${item.name}] 잠금 해제에는 ${item.cost}P가 필요합니다. 스몰톡 및 장보기로 포인트를 모아보세요!`);
      return;
    }

    Alert.alert(
      '오브젝트 잠금 해제 & 장착',
      `[${item.name}]을(를) ${item.cost} 포인트로 해금하여 방에 바로 장착하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '해금 & 장착 💖',
          onPress: () => {
            if (onDeductPoints) onDeductPoints(item.cost);

            // 1. Mark as unlocked
            const newUnlocked = Array.from(new Set([...unlockedFurnitureIds, item.id]));
            setUnlockedFurnitureIds(newUnlocked);
            AsyncStorage.setItem('PETMONG_UNLOCKED_FURNITURE', JSON.stringify(newUnlocked)).catch(() => {});

            // 2. Equip to the designated slot
            const otherSlots = (placedFurniture || []).filter(f => f.slotId !== item.slotId);
            const targetSlot = ROOM_SLOTS.find(s => s.id === item.slotId);
            const newPlacedItem = {
              id: `placed-${item.id}`,
              catalogId: item.id,
              slotId: item.slotId,
              name: item.name,
              emoji: item.emoji,
              x: targetSlot ? targetSlot.x : 42,
              y: targetSlot ? targetSlot.y : 55,
            };

            const updated = [...otherSlots, newPlacedItem];
            if (onUpdatePlacedFurniture) onUpdatePlacedFurniture(updated);

            setShopModalVisible(false);
            Alert.alert('장착 완료! ✨', `[${item.name}]이(가) 방에 예쁘게 배치되었습니다!`);
          },
        },
      ]
    );
  };

  const handleEquipUnlocked = (item) => {
    const otherSlots = (placedFurniture || []).filter(f => f.slotId !== item.slotId);
    const targetSlot = ROOM_SLOTS.find(s => s.id === item.slotId);
    const newPlacedItem = {
      id: `placed-${item.id}`,
      catalogId: item.id,
      slotId: item.slotId,
      name: item.name,
      emoji: item.emoji,
      x: targetSlot ? targetSlot.x : 42,
      y: targetSlot ? targetSlot.y : 55,
    };

    const updated = [...otherSlots, newPlacedItem];
    if (onUpdatePlacedFurniture) onUpdatePlacedFurniture(updated);
    setShopModalVisible(false);
    Alert.alert('교체 완료! 🛋️', `[${item.name}]으로 방 배치를 변경했습니다.`);
  };

  const handleUnequipSlot = (slotId) => {
    const updated = (placedFurniture || []).filter(f => f.slotId !== slotId);
    if (onUpdatePlacedFurniture) onUpdatePlacedFurniture(updated);
    setShopModalVisible(false);
    Alert.alert('해제 완료 🧹', '해당 슬롯의 가구를 보관함에 넣었습니다.');
  };

  const handlePressSlot = (slot) => {
    setSelectedSlotId(slot.id);
    setShopModalVisible(true);
  };

  const filteredCatalog = FURNITURE_CATALOG.filter((f) => f.slotId === selectedSlotId);

  return (
    <View style={styles.container}>
      {/* Sub-header Bar */}
      <View style={styles.subHeaderBar}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.subHeaderTitle}>반려몽 🐾</Text>
          <Text style={styles.subHeaderSub} numberOfLines={1} ellipsizeMode="tail">
            {myCharacter ? `${myCharacter.name} (${myCharacter.personality})` : '가족 AI 펫과 방 꾸미기'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.openShopBtn}
          onPress={() => setShopModalVisible(true)}
          activeOpacity={0.8}
        >
          <Layers size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.openShopBtnText}>방 꾸미기</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Points Status Bar */}
        <View style={styles.pointsBarCard}>
          <View style={styles.pointsBarLeft}>
            <Trophy size={18} color="#F1C40F" style={{ marginRight: 6 }} />
            <Text style={styles.pointsBarLabel}>사용 가능한 포인트</Text>
          </View>
          <Text style={styles.pointsBarValue}>{points} P</Text>
        </View>

        {/* Main Pet Room Interactive Canvas */}
        <View style={styles.canvasCard}>
          {/* Room Header & Quick Action Toolbar */}
          <View style={styles.canvasHeader}>
            <View style={styles.canvasTitleGroup}>
              <Text style={styles.canvasTitle}>우리 가족 아늑한 방</Text>
              <Text style={styles.canvasAreaSubtitle}>
                {myCharacter ? `${myCharacter.name}와 함께하는 공간` : '반려몽 생성 필요'}
              </Text>
            </View>

            {!myCharacter && (
              <TouchableOpacity
                style={[styles.logBtn, { backgroundColor: '#FFEBEB' }]}
                onPress={() => setCreateModalVisible(true)}
              >
                <Sparkles size={13} color="#FF7E82" style={{ marginRight: 4 }} />
                <Text style={[styles.logBtnText, { color: '#FF7E82' }]}>반려몽 만들기</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Control Toolbar (Room Theme, Family Book, Daily Touch) */}
          <View style={styles.roomActionBar}>
            {/* Room Theme Selector Button */}
            <TouchableOpacity
              style={styles.roomActionBtn}
              onPress={() => setThemeModalVisible(true)}
              activeOpacity={0.8}
            >
              <Palette size={14} color="#D9534F" style={{ marginRight: 4 }} />
              <Text style={styles.roomActionBtnEmoji}>
                {ROOM_THEMES.find(t => t.id === roomTheme)?.emoji || '🏡'}
              </Text>
              <Text style={styles.roomActionBtnText}>
                {ROOM_THEMES.find(t => t.id === roomTheme)?.name || '테마 변경'}
              </Text>
            </TouchableOpacity>

            {/* Family Petmong Book Button */}
            <TouchableOpacity
              style={[styles.roomActionBtn, styles.roomActionBtnBlue]}
              onPress={() => setFamilyBookModalVisible(true)}
              activeOpacity={0.8}
            >
              <BookOpen size={14} color="#3B82F6" style={{ marginRight: 4 }} />
              <Text style={[styles.roomActionBtnText, { color: '#2563EB' }]}>
                도감 ({petmongCharacters.length})
              </Text>
            </TouchableOpacity>

            {/* Daily Pet Touch Progress Chip */}
            {myCharacter && (
              <View
                style={[
                  styles.roomTouchChip,
                  dailyTouchCount >= MAX_DAILY_TOUCH
                    ? styles.roomTouchChipDone
                    : styles.roomTouchChipProgress,
                ]}
              >
                {dailyTouchCount >= MAX_DAILY_TOUCH ? (
                  <>
                    <Sparkles size={13} color="#059669" style={{ marginRight: 4 }} />
                    <Text style={styles.roomTouchChipTextDone}>오늘 완료 🎉</Text>
                  </>
                ) : (
                  <>
                    <Heart size={13} color="#FF4D6D" fill="#FF4D6D" style={{ marginRight: 4 }} />
                    <Text style={styles.roomTouchChipTextProgress}>
                      쓰다듬기 {dailyTouchCount}/{MAX_DAILY_TOUCH}
                    </Text>
                  </>
                )}
              </View>
            )}
          </View>

          {/* Interactive Room Canvas */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setSelectedFurnitureId(null)}
            style={styles.canvasContainer}
          >
            {/* High-Resolution Game Art Room Background Image */}
            <Image
              source={ROOM_BACKGROUNDS[roomTheme]}
              style={styles.roomBgImage}
              resizeMode="cover"
            />

            {/* Sumone-Style Fixed Room Slots & Equipped Objects */}
            {ROOM_SLOTS.map((slot) => {
              const equipped = (placedFurniture || []).find(f => f.slotId === slot.id);
              // Enrich equipped item with full catalog definition (e.g. image asset)
              const catalogItem = equipped ? FURNITURE_CATALOG.find(c => c.id === equipped.catalogId) : null;
              const mergedEquipped = equipped
                ? { ...equipped, image: catalogItem?.image || equipped.image }
                : null;

              return (
                <RoomSlotObject
                  key={slot.id}
                  slot={slot}
                  equippedItem={mergedEquipped}
                  onPressSlot={handlePressSlot}
                  styles={styles}
                />
              );
            })}

            {/* Autonomous Roaming Family Petmongs in Background (Optimized for up to MAX_ACTIVE_ROAMING concurrent pets) */}
            {familyCharacters.slice(0, MAX_ACTIVE_ROAMING).map((char, index) => {
              const owner = familyMembers.find(m => m.id === char.user_id);
              return (
                <RoamingFamilyPetmong
                  key={char.id}
                  char={char}
                  owner={owner}
                  index={index}
                  placedFurniture={placedFurniture}
                  subBubbleCharId={subBubbleCharId}
                  subBubbleText={subBubbleText}
                  onPress={() => handleSubCharPress(char)}
                  styles={styles}
                />
              );
            })}

            {/* My Main Petmong Character (Standing naturally in the room) */}
            {myCharacter && (
              <Animated.View
                style={[
                  styles.mainCharContainer,
                  { transform: [{ translateY: Animated.add(floatAnim, bounceAnim) }] },
                ]}
              >
                {/* Speech Bubble */}
                {bubbleVisible && (
                  <Animated.View
                    style={[
                      styles.speechBubbleContainer,
                      {
                        opacity: bubbleAnim,
                        transform: [
                          { scale: bubbleAnim },
                          { translateY: bubbleAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
                        ],
                      },
                    ]}
                  >
                    <Text style={styles.speechBubbleText}>{bubbleText}</Text>
                    <View style={styles.speechBubbleArrow} />
                  </Animated.View>
                )}

                {/* Floating Heart & EXP Toast on Tap */}
                {heartVisible && (
                  <Animated.View
                    style={[
                      styles.floatingHeartContainer,
                      {
                        opacity: heartAnim.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 0.9, 0] }),
                        transform: [
                          { translateY: heartAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -50] }) },
                          { scale: heartAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 1.3, 1] }) },
                        ],
                      },
                    ]}
                  >
                    <Heart size={26} color="#FF4D6D" fill="#FF4D6D" />
                    <Text
                      style={[
                        styles.touchExpText,
                        dailyTouchCount >= MAX_DAILY_TOUCH && styles.touchExpTextDone,
                      ]}
                    >
                      {dailyTouchCount < MAX_DAILY_TOUCH
                        ? `+3 EXP (${dailyTouchCount}/${MAX_DAILY_TOUCH})`
                        : dailyTouchCount === MAX_DAILY_TOUCH
                        ? `+3 EXP (${MAX_DAILY_TOUCH}/${MAX_DAILY_TOUCH} 완료)`
                        : '❤️ 애정 가득 (오늘 완료)'}
                    </Text>
                  </Animated.View>
                )}

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handlePetTap}
                  style={styles.charTouchArea}
                >
                  {/* Foreground Owner Badge: [내 기분] [이름] 반려몽 */}
                  <View style={styles.myCharOwnerBadge}>
                    <View style={styles.myCharMoodWrap}>
                      <MoodIcon mood={currentUserProfile?.mood || '😊'} size={13} />
                    </View>
                    <Text style={styles.myCharOwnerBadgeText}>
                      {currentUserProfile?.name || '내'} 반려몽
                    </Text>
                  </View>

                  {/* Character Sprite directly in room */}
                  {myCharacter.image_url ? (
                    <View style={styles.mainCharImageWrapper}>
                      {Platform.OS === 'web' ? (
                        <img
                          src={mainCharTransparentUrl || transparentImageCache.get(myCharacter.image_url) || myCharacter.image_url}
                          alt={myCharacter.name}
                          style={{
                            width: 100,
                            height: 100,
                            objectFit: 'contain',
                            mixBlendMode: 'multiply',
                            display: 'block',
                            pointerEvents: 'none',
                            userSelect: 'none',
                            opacity: (mainCharTransparentUrl || transparentImageCache.has(myCharacter.image_url) || myCharacter.image_url.startsWith('data:image/png')) ? 1 : 0,
                            transition: 'opacity 0.15s ease-in',
                          }}
                        />
                      ) : (
                        <Image
                          source={{ uri: mainCharTransparentUrl || transparentImageCache.get(myCharacter.image_url) || myCharacter.image_url }}
                          style={[
                            styles.mainCharImage,
                            { opacity: (mainCharTransparentUrl || transparentImageCache.has(myCharacter.image_url) || myCharacter.image_url.startsWith('data:image/png')) ? 1 : 0 }
                          ]}
                          resizeMode="contain"
                        />
                      )}
                    </View>
                  ) : (
                    <Text style={styles.mainCharEmoji}>{myCharacter.emoji || '🐶'}</Text>
                  )}

                  {/* Soft Natural Ground Contact Shadow under feet */}
                  <View style={styles.charGroundShadow} />

                  {/* Cute Touch Hint (shown while daily touch is active) */}
                  {dailyTouchCount < MAX_DAILY_TOUCH && (
                    <View style={styles.touchHintBadge}>
                      <Sparkles size={9} color="#FFFFFF" style={{ marginRight: 2 }} />
                      <Text style={styles.touchHintText}>톡톡!</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            )}
          </TouchableOpacity>

          {/* Dedicated My Petmong Status & Growth Card below Canvas */}
          {myCharacter && (
            <View style={styles.petStatusCardBelow}>
              <View style={styles.petStatusCardLeft}>
                <View style={styles.petStatusMoodWrap}>
                  <MoodIcon mood={currentUserProfile?.mood || '😊'} size={15} />
                </View>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.petStatusCardName}>{myCharacter.name}</Text>
                    <View style={styles.personalityTag}>
                      <Text style={styles.personalityTagText}>{myCharacter.personality || '다정한'}</Text>
                    </View>
                    <Text style={styles.petStatusCardLevel}>Lv.{myCharacter.level || 1}</Text>
                  </View>
                  <Text style={styles.petStatusCardSub}>
                    {currentUserProfile?.name || '내'} 반려몽 • {myCharacter.species || '반려동물'}
                  </Text>
                </View>
              </View>

              <View style={styles.petStatusCardRight}>
                <View style={styles.petStatusExpRow}>
                  <Text style={styles.petStatusExpLabel}>경험치</Text>
                  <Text style={styles.petStatusExpVal}>{myCharacter.exp || 0} / 100</Text>
                </View>
                <View style={styles.petStatusExpBarBg}>
                  <View style={[styles.petStatusExpBarFill, { width: `${Math.min(100, myCharacter.exp || 0)}%` }]} />
                </View>
              </View>
            </View>
          )}

          <Text style={styles.canvasGuideText}>
            💡 반려몽을 톡톡 터치하면 애정 대사와 함께 +3 EXP를 획득합니다! (오늘: {Math.min(dailyTouchCount, MAX_DAILY_TOUCH)}/{MAX_DAILY_TOUCH}회, 매일 자정 초기화)
          </Text>
        </View>
      </ScrollView>

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

      {/* Sumone-Style Room Object Shop Modal (슬롯별 오브젝트 잠금 해제 및 장착) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={shopModalVisible}
        onRequestClose={() => setShopModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleRow}>
                <Layers size={20} color="#FF7E82" style={{ marginRight: 6 }} />
                <Text style={styles.modalHeader}>우리 가족 방 꾸미기 🛋️</Text>
              </View>
              <TouchableOpacity onPress={() => setShopModalVisible(false)}>
                <X size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {/* Slot Tabs */}
            <View style={styles.categoryTabRow}>
              {ROOM_SLOTS.map((slot) => {
                const isEquippedInSlot = (placedFurniture || []).some(f => f.slotId === slot.id);
                return (
                  <TouchableOpacity
                    key={slot.id}
                    style={[
                      styles.categoryTab,
                      selectedSlotId === slot.id && styles.categoryTabActive,
                    ]}
                    onPress={() => setSelectedSlotId(slot.id)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.categoryTabText,
                        selectedSlotId === slot.id && styles.categoryTabTextActive,
                      ]}
                    >
                      {slot.name} {isEquippedInSlot ? '✨' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Active Slot Header & Unequip Button */}
            {(() => {
              const currentSlotObj = ROOM_SLOTS.find(s => s.id === selectedSlotId);
              const equippedInCurrentSlot = (placedFurniture || []).find(f => f.slotId === selectedSlotId);

              return (
                <View style={styles.slotCurrentBanner}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.slotBannerTitle}>{currentSlotObj?.name || '슬롯'}</Text>
                    <Text style={styles.slotBannerSub}>
                      {equippedInCurrentSlot ? `현재 장착: ${equippedInCurrentSlot.emoji} ${equippedInCurrentSlot.name}` : '현재 비어 있음 (미배치)'}
                    </Text>
                  </View>
                  {equippedInCurrentSlot && (
                    <TouchableOpacity
                      style={styles.unequipBtn}
                      onPress={() => handleUnequipSlot(selectedSlotId)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.unequipBtnText}>슬롯 비우기</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })()}

            {/* Catalog Grid for Current Slot */}
            <ScrollView style={styles.catalogList} showsVerticalScrollIndicator={false}>
              {filteredCatalog.map((item) => {
                const isUnlocked = unlockedFurnitureIds.includes(item.id);
                const isEquipped = (placedFurniture || []).some(f => f.catalogId === item.id || f.id === `placed-${item.id}`);

                return (
                  <View key={item.id} style={[styles.catalogCard, isEquipped && styles.catalogCardEquipped]}>
                    <View style={styles.catalogEmojiBox}>
                      {item.image ? (
                        Platform.OS === 'web' ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            style={{
                              width: 38,
                              height: 38,
                              objectFit: 'contain',
                              mixBlendMode: 'multiply',
                              display: 'block',
                            }}
                          />
                        ) : (
                          <Image
                            source={item.image}
                            style={{ width: 38, height: 38 }}
                            resizeMode="contain"
                          />
                        )
                      ) : (
                        <Text style={styles.catalogEmoji}>{item.emoji}</Text>
                      )}
                    </View>

                    <View style={styles.catalogInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.catalogName}>{item.name}</Text>
                        {isEquipped ? (
                          <View style={styles.equippedBadge}>
                            <Text style={styles.equippedBadgeText}>장착 중</Text>
                          </View>
                        ) : isUnlocked ? (
                          <View style={styles.unlockedBadge}>
                            <Text style={styles.unlockedBadgeText}>보유 중</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.catalogDesc}>{item.desc}</Text>
                      {!isUnlocked && (
                        <Text style={styles.catalogPrice}>{item.cost} P</Text>
                      )}
                    </View>

                    {isEquipped ? (
                      <View style={styles.alreadyEquippedBtn}>
                        <Check size={14} color="#059669" style={{ marginRight: 2 }} />
                        <Text style={styles.alreadyEquippedBtnText}>배치됨</Text>
                      </View>
                    ) : isUnlocked ? (
                      <TouchableOpacity
                        style={styles.equipBtn}
                        onPress={() => handleEquipUnlocked(item)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.equipBtnText}>장착하기</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.buyBtn}
                        onPress={() => handleUnlockAndEquip(item)}
                        activeOpacity={0.8}
                      >
                        <Lock size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.buyBtnText}>해금</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </ScrollView>
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
                        <Text style={styles.bookPetOwnerName}>
                          {owner?.avatar || '👤'} {owner?.name || '가족'} {isMine ? '(나)' : ''}
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
              원하는 분위기의 빈 방을 선택하고, 가구와 소품을 자유롭게 장착해보세요!
            </Text>

            <View style={{ gap: 12, marginTop: 4 }}>
              {ROOM_THEMES.map((theme) => {
                const isSelected = roomTheme === theme.id;
                return (
                  <TouchableOpacity
                    key={theme.id}
                    style={[
                      styles.themeCardItem,
                      isSelected && styles.themeCardItemActive,
                    ]}
                    onPress={() => {
                      setRoomTheme(theme.id);
                      setThemeModalVisible(false);
                    }}
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

