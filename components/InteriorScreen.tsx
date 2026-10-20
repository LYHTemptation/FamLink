import styles from './InteriorStyles';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import UserAvatar from './UserAvatar';
import PetmongGameEngine from './PetmongGameEngine';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Dimensions,
  Animated,
  TextInput,
  Platform,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import {
  X,
  Sparkles,
  Heart,
  ChevronRight,
  Camera,
  Check,
  Palette,
  BookOpen,
  Mail,
  Send,
} from 'lucide-react-native';
import {
  getEvolutionStage,
  getEvolvedEmoji,
  isMilestoneLevel,
  getStageNameWithPet,
  getRequiredExpForLevel,
} from '../lib/petmongEvolution';
import PetmongGrowthBookModal from './PetmongGrowthBookModal';
import {
  getPetmongStageImages,
  savePetmongStageImage,
  resetPetmongStageImages,
  generateStageAiImage,
  startBackgroundStagePreGeneration,
  createPetmongSvg,
} from '../lib/petmongEvolutionService';
import { makeBackgroundTransparentOnDevice } from '../lib/imageTransparencyService';
import { generatePetmongMascotFromPhoto } from '../services/geminiService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const MAX_DAILY_WHISPER_SEND_EXP = 2; // 하루 귓속말 발송 EXP 보상 최대 2회 (+5 EXP씩)
const MAX_DAILY_WHISPER_READ_EXP = 2; // 하루 귓속말 확인/하트 EXP 보상 최대 2회 (+10 EXP씩)

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

const PERSONALITY_OPTIONS = ['다정한', '장난꾸러기', '잠꾸러기', '애교쟁이', '호기심많은'];

export interface PetmongStyleItem {
  id: PetmongStylePreset;
  title: string;
  emoji: string;
  tag: string;
  desc: string;
}

export const STYLE_PRESET_OPTIONS: PetmongStyleItem[] = [
  {
    id: 'cozy_creature',
    title: '포근한 동물 요정',
    emoji: '🐾',
    tag: 'Sumone풍 2D',
    desc: '동글동글 사랑스러운 2D 동물 마스코트',
  },
  {
    id: 'chibi_family',
    title: '귀여운 웹툰 인물',
    emoji: '👦',
    tag: '치비 캐리커처',
    desc: '헤어·안경·표정을 쏙 빼닮은 캐릭터',
  },
  {
    id: 'warm_watercolor',
    title: '동화책 수채화',
    emoji: '🎨',
    tag: '따뜻한 감성',
    desc: '색연필과 수채화로 그린 따뜻한 동화 삽화',
  },
  {
    id: 'comic_caricature',
    title: '유쾌한 코미디 카툰',
    emoji: '🤪',
    tag: '익살 명랑 만화',
    desc: '과장된 표정과 재치 있는 짤방 감성',
  },
];

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

import {
  FamilyMember,
  UserProfile,
  ChatMessage,
  SmallTalkState,
  PetmongCharacter,
  PetmongStylePreset,
} from '../types/domain';

export interface PetVitals {
  warmth?: number;
  hunger?: number;
  happiness?: number;
  cleanliness?: number;
  energy?: number;
  [key: string]: any;
}

export interface WhisperItem {
  id: string;
  family_id?: string;
  from_user_id: string;
  to_user_id: string;
  message: string;
  is_read: boolean;
  has_heart?: boolean;
  heart_count?: number;
  created_at: string;
  from_user_name?: string;
  to_user_name?: string;
  [key: string]: any;
}

export interface EvolutionData {
  character?: PetmongCharacter;
  stage?: any;
  previousLevel?: number;
  previousImageUrl?: string | null;
  newLevel?: number;
  isAiEvolving?: boolean;
  newImageUrl?: string | null;
}

export interface InteriorScreenProps {
  points?: number;
  onDeductPoints?: (pts: number, reason?: string) => Promise<boolean> | boolean | void;
  onAwardPoints?: (pts: number, reason?: string) => Promise<boolean> | boolean | void;
  currentUser?: any;
  currentUserProfile?: UserProfile | null;
  familyId?: string | null;
  petmongCharacters?: PetmongCharacter[];
  setPetmongCharacters?: React.Dispatch<React.SetStateAction<PetmongCharacter[]>> | ((chars: any) => void);
  onAwardExp?: (userIdOrExp: any, amount?: number, reason?: string) => Promise<void> | void;
  familyMembers?: FamilyMember[];
  petVitals?: PetVitals;
  onUpdateVitals?: (vitals: any) => void;
  messages?: ChatMessage[];
  smallTalkState?: SmallTalkState | any;
  onNavigateScreen?: ((screenName: string, params?: any) => void) | null;
}

const getRandomDialogue = (personality?: string): string => {
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

  const list = (personality && (PETMONG_DIALOGUES as Record<string, string[]>)[personality]) || PETMONG_DIALOGUES['default'];
  return list[Math.floor(Math.random() * list.length)];
};

export default function InteriorScreen({
  points = 0,
  onDeductPoints,
  onAwardPoints,
  currentUser,
  currentUserProfile,
  familyId,
  petmongCharacters = [],
  setPetmongCharacters,
  onAwardExp,
  familyMembers = [],
  petVitals: propPetVitals,
  onUpdateVitals: propOnUpdateVitals,
  messages = [],
  smallTalkState = {},
  onNavigateScreen = null,
}: InteriorScreenProps) {
  const insets = useSafeAreaInsets();
  
  // Idle Game & Room Navigation States
  const [selectedRoomUserId, setSelectedRoomUserId] = useState<string | undefined>(currentUserProfile?.id);

  // Petmong States (Linked with Supabase)
  const [myCharacter, setMyCharacter] = useState<PetmongCharacter | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [familyCharacters, setFamilyCharacters] = useState<PetmongCharacter[]>([]);
  
  // Unified Decorate Modal State (거실 테마 & 반려몽 외형 변경)
  const [decorModalVisible, setDecorModalVisible] = useState(false);
  const [decorModalTab, setDecorModalTab] = useState<'theme' | 'appearance'>('theme');
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('🐶');
  const [newPersonality, setNewPersonality] = useState('다정한');
  const [selectedStylePreset, setSelectedStylePreset] = useState<PetmongStylePreset>('cozy_creature');

  // Compatibility helpers
  const setCreateModalVisible = (val: boolean) => {
    if (val) setDecorModalTab('appearance');
    setDecorModalVisible(val);
  };
  const setThemeModalVisible = (val: boolean) => {
    if (val) setDecorModalTab('theme');
    setDecorModalVisible(val);
  };

  // Secret Whisper States (반려몽 비밀 귓속말 & 편지 배달부)
  const [whispers, setWhispers] = useState<WhisperItem[]>([]);
  const [whisperWriteModalVisible, setWhisperWriteModalVisible] = useState(false);
  const [whisperReadModalVisible, setWhisperReadModalVisible] = useState(false);
  const [activeWhisperToRead, setActiveWhisperToRead] = useState<WhisperItem | null>(null);
  const [whisperTargetUser, setWhisperTargetUser] = useState<FamilyMember | UserProfile | null>(null);
  const [whisperMessage, setWhisperMessage] = useState('');
  const [isSendingWhisper, setIsSendingWhisper] = useState(false);
  const [dailyWhisperSendExpCount, setDailyWhisperSendExpCount] = useState(0);
  const [dailyWhisperReadExpCount, setDailyWhisperReadExpCount] = useState(0);

  // Load today's whisper EXP reward counts directly from DB (petmong_activities) for cross-device source of truth
  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayStartIso = useMemo(() => `${todayDateStr}T00:00:00.000Z`, [todayDateStr]);

  const refreshWhisperExpCounts = useCallback(async () => {
    if (!currentUserProfile?.id) return;
    try {
      const { data, error } = await supabase
        .from('petmong_activities')
        .select('activity_type, exp_earned')
        .eq('user_id', currentUserProfile.id)
        .gte('created_at', todayStartIso)
        .in('activity_type', ['WHISPER', 'WHISPER_READ']);

      if (!error && Array.isArray(data)) {
        const sendCount = data.filter(d => d.activity_type === 'WHISPER' && (d.exp_earned || 0) > 0).length;
        const readCount = data.filter(d => d.activity_type === 'WHISPER_READ' && (d.exp_earned || 0) > 0).length;
        setDailyWhisperSendExpCount(sendCount);
        setDailyWhisperReadExpCount(readCount);
      }
    } catch (e) {
      console.warn('Failed to query petmong_activities for whisper exp counts:', e);
    }
  }, [currentUserProfile?.id, todayStartIso]);

  useEffect(() => {
    refreshWhisperExpCounts();
  }, [refreshWhisperExpCounts]);

  // Unread whispers addressed to the current user
  const unreadWhispers = (whispers || []).filter(
    w => w.to_user_id === currentUserProfile?.id && !w.is_read
  );

  // Level Up Modal State
  const [levelUpModalVisible, setLevelUpModalVisible] = useState(false);
  const [levelUpInfo, setLevelUpInfo] = useState({ name: '', level: 1 });

  // 4-Stage Evolution Milestone Modal State
  const [evolutionModalVisible, setEvolutionModalVisible] = useState(false);
  const [evolutionData, setEvolutionData] = useState<EvolutionData | null>(null);
  const prevLevelRef = useRef(myCharacter?.level || 1);
  const hasInitializedLevelRef = useRef(false);

  const handleCloseEvolutionModal = () => {
    if (evolutionData?.stage?.stage && myCharacter?.id) {
      AsyncStorage.setItem(`@famlink_celebrated_stage_${myCharacter.id}_${evolutionData.stage.stage}`, 'true').catch(() => {});
    }
    setEvolutionModalVisible(false);
  };

  // Family Petmong Book / Roster Modal State & Growth Tab State
  const [familyBookModalVisible, setFamilyBookModalVisible] = useState(false);
  const [growthBookTargetChar, setGrowthBookTargetChar] = useState<PetmongCharacter | null>(null);
  const [growthBookInitialTab, setGrowthBookInitialTab] = useState('growth');

  // Sumone-Style Family Room Theme States (온 가족이 공유하는 거실 테마)
  const [familyRoomTheme, setFamilyRoomTheme] = useState('cottage');
  const activeRoomTheme = familyRoomTheme || 'cottage';

  // Main Character Float Animation
  const floatAnim = useRef(new Animated.Value(0)).current;

  // 1가족 1공동 반려몽: 온 가족이 함께 돌보는 단 하나의 대표 수호 반려몽
  const familyPetmong = (petmongCharacters && petmongCharacters.length > 0) ? petmongCharacters[0] : myCharacter;
  const displayedCharacter = familyPetmong;
  const displayedOwner = currentUserProfile;

  // Current evolution stage based on level (1, 2, 3, 4)
  const currentCharStageNum = getEvolutionStage(displayedCharacter?.level || 1).stage;
  const [activeStageImageUrl, setActiveStageImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (displayedCharacter?.id) {
      getPetmongStageImages(displayedCharacter.id, displayedCharacter.image_url).then(stages => {
        if (stages && stages[currentCharStageNum]) {
          setActiveStageImageUrl(stages[currentCharStageNum]);
        } else if (stages && stages[1]) {
          setActiveStageImageUrl(stages[1]);
        } else {
          setActiveStageImageUrl(displayedCharacter.image_url || null);
        }
      }).catch(() => {
        setActiveStageImageUrl(displayedCharacter.image_url || null);
      });
    } else {
      setActiveStageImageUrl(null);
    }
  }, [displayedCharacter?.id, displayedCharacter?.level, displayedCharacter?.image_url, currentCharStageNum]);

  // Background Pre-Generation of Missing Stages for Family Shared Petmong Character (Cloud-synced via Supabase Storage)
  useEffect(() => {
    const targetChar = displayedCharacter || myCharacter;
    if (targetChar?.id && targetChar?.image_url) {
      getPetmongStageImages(targetChar.id).then(stages => {
        if (!stages[1]) {
          savePetmongStageImage(targetChar.id as string, 1, targetChar.image_url as string);
        }
        if (!stages[2] || !stages[3] || !stages[4]) {
          startBackgroundStagePreGeneration(targetChar, (stg, url) => {
            if (stg === currentCharStageNum) {
              setActiveStageImageUrl(url);
            }
          });
        }
      }).catch(() => {});
    }
  }, [displayedCharacter?.id, displayedCharacter?.image_url, myCharacter?.id, myCharacter?.image_url, currentCharStageNum]);
  // 🎮 Real-time Petmong Game Vitals (Centralized via App.js & Supabase)
  const [localPetVitals, setLocalPetVitals] = useState({
    hunger: 80,
    happiness: 85,
    cleanliness: 90,
    energy: 95,
  });

  const activeVitals = propPetVitals || localPetVitals;
  const activeCharId: string = displayedCharacter?.id || currentUserProfile?.id || (typeof currentUser === 'string' ? currentUser : '') || 'default-pet';

  useEffect(() => {
    if (!activeCharId || propPetVitals) return;
    AsyncStorage.getItem(`@famlink_game_vitals_${activeCharId}`)
      .then(res => {
        if (res) {
          try {
            setLocalPetVitals(JSON.parse(res));
          } catch (e) {}
        }
      })
      .catch(() => {});
  }, [activeCharId, propPetVitals]);

  const handleUpdateVitals = (updater: any) => {
    if (propOnUpdateVitals) {
      propOnUpdateVitals(updater);
    } else {
      setLocalPetVitals(prev => {
        const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
        if (activeCharId) {
          AsyncStorage.setItem(`@famlink_game_vitals_${activeCharId}`, JSON.stringify(next)).catch(() => {});
        }
        return next;
      });
    }
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
        let reqExp = getRequiredExpForLevel(newLevel);
        while (newExp >= reqExp) {
          newExp -= reqExp;
          newLevel += 1;
          reqExp = getRequiredExpForLevel(newLevel);
          setLevelUpInfo({ name: prev.name, level: newLevel });
          setLevelUpModalVisible(true);
        }
        return { ...prev, exp: newExp, level: newLevel };
      });
    }
  };

  const handleGameCareAction = (actionType = 'CARE', detail: any = null) => {
    if (familyId && familyPetmong?.id && currentUserProfile?.id) {
      const actionLabels: Record<string, string> = {
        FEED: `${currentUserProfile.name || '가족'}님이 몽이에게 맛있는 ${detail?.name || '밥'}을 챙겨주었습니다 🥫`,
        PLAY: `${currentUserProfile.name || '가족'}님이 몽이와 신나는 공놀이를 즐겼습니다 ⚽`,
        BATH: `${currentUserProfile.name || '가족'}님이 몽이에게 보글보글 거품 목욕을 시켜주었습니다 🧼`,
        SLEEP: `${currentUserProfile.name || '가족'}님이 몽이의 방 조명을 끄고 잠을 재워주었습니다 🌙`,
        WAKE: `${currentUserProfile.name || '가족'}님이 몽이를 깨워 활기찬 아침을 열었습니다 ☀️`,
      };

      const note = actionLabels[actionType] || `${currentUserProfile.name || '가족'}님이 반려몽을 따뜻하게 돌봐주었습니다 💕`;

      try {
        supabase.from('petmong_activities').insert({
          family_id: familyId,
          character_id: familyPetmong.id,
          user_id: currentUserProfile.id,
          activity_type: actionType,
          notes: note,
          exp_earned: 5,
        }).then(() => {}, (e) => console.warn('Activity log error:', e));
      } catch (e) {
        console.warn('Activity log error:', e);
      }
    }
  };

  useEffect(() => {
    if (familyId) {
      if (petmongCharacters && petmongCharacters.length > 0) {
        setMyCharacter(petmongCharacters[0]);
        setCreateModalVisible(false);
      } else {
        setMyCharacter(null);
      }
    }
  }, [familyId, petmongCharacters]);

  // -------------------------------------------------------------
  // 반려친구 비밀 귓속말 & 감성 편지 배달부 (petmong_whispers)
  // -------------------------------------------------------------
  const fetchWhispers = useCallback(async () => {
    if (!familyId) return;
    const cacheKey = `@famlink_petmong_whispers_${familyId}`;
    try {
      // 1. Optimistic Local Load
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        try {
          setWhispers(JSON.parse(cached));
        } catch (_) {}
      }

      // 2. Fetch from Supabase (if table exists)
      const { data, error } = await supabase
        .from('petmong_whispers')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setWhispers(data);
        AsyncStorage.setItem(cacheKey, JSON.stringify(data)).catch(() => {});
      }
    } catch (e: any) {
      console.warn('fetchWhispers note (using local cache):', e?.message || e);
    }
  }, [familyId]);

  useEffect(() => {
    fetchWhispers();
    if (!familyId) return;
    let channel: any = null;
    try {
      channel = supabase
        .channel(`whispers_${familyId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'petmong_whispers',
          filter: `family_id=eq.${familyId}`,
        }, () => {
          fetchWhispers();
        })
        .subscribe();
    } catch (subErr) {
      console.warn('Whisper realtime subscribe note:', subErr);
    }
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [familyId, fetchWhispers]);

  const handleSendWhisper = async () => {
    if (!whisperTargetUser) {
      Alert.alert('알림', '귓속말을 전할 가족을 선택해주세요!');
      return;
    }
    if (!whisperMessage.trim()) {
      Alert.alert('알림', '전하고 싶은 따뜻한 한마디를 적어주세요!');
      return;
    }

    try {
      setIsSendingWhisper(true);
      const cacheKey = `@famlink_petmong_whispers_${familyId}`;
      const tempId = 'whisper_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const newWhisper: WhisperItem = {
        id: tempId,
        family_id: familyId || undefined,
        from_user_id: currentUserProfile?.id || '',
        to_user_id: whisperTargetUser.id,
        message: whisperMessage.trim(),
        is_read: false,
        created_at: new Date().toISOString(),
      };

      // 1. Optimistic Local Update (항상 즉시 저장 & 전송 성공)
      setWhispers(prev => {
        const next = [newWhisper, ...(prev || [])];
        AsyncStorage.setItem(cacheKey, JSON.stringify(next)).catch(() => {});
        return next;
      });

      // 2. Try Supabase Insert (DB 테이블 동기화)
      try {
        const { data, error } = await supabase
          .from('petmong_whispers')
          .insert({
            family_id: familyId,
            from_user_id: currentUserProfile?.id,
            to_user_id: whisperTargetUser.id,
            message: whisperMessage.trim(),
            is_read: false,
          })
          .select()
          .single();

        if (error) {
          console.error('Supabase petmong_whispers insert error:', error);
          if (error.code === '42501') {
            Alert.alert(
              'Supabase 권한 알림',
              'petmong_whispers 테이블의 RLS 보안 정책으로 인해 저장이 차단되었습니다.\nSupabase SQL Editor에서 RLS 비활성화 쿼리를 실행해 주세요.'
            );
          }
        } else if (data) {
          setWhispers(prev => {
            const next = prev.map(w => w.id === tempId ? data : w);
            AsyncStorage.setItem(cacheKey, JSON.stringify(next)).catch(() => {});
            return next;
          });
        }
      } catch (dbErr: any) {
        console.warn('Supabase petmong_whispers sync note (using local cache):', dbErr?.message || dbErr);
      }

      // 3. Log activity in petmong_activities & Award EXP (Daily Limit: MAX_DAILY_WHISPER_SEND_EXP times)
      const canEarnSendExp = dailyWhisperSendExpCount < MAX_DAILY_WHISPER_SEND_EXP;
      const sendExpToAward = canEarnSendExp ? 5 : 0;

      if (canEarnSendExp) {
        const nextSendCount = dailyWhisperSendExpCount + 1;
        setDailyWhisperSendExpCount(nextSendCount);
        const sendKey = `@famlink_whisper_send_exp_${currentUserProfile?.id}_${todayDateStr}`;
        AsyncStorage.setItem(sendKey, String(nextSendCount)).catch(() => {});
      }

      try {
        await supabase.from('petmong_activities').insert({
          character_id: familyPetmong?.id,
          user_id: currentUserProfile?.id,
          activity_type: 'WHISPER',
          notes: `${currentUserProfile?.name || '가족'}님이 ${whisperTargetUser.name}님에게 비밀 귓속말 편지를 맡겼습니다 💌`,
          exp_earned: sendExpToAward,
        });
      } catch (actErr) {
        console.warn('Activity log error:', actErr);
      }

      if (canEarnSendExp && onAwardExp && currentUserProfile?.id) {
        onAwardExp(currentUserProfile.id, 5, '반려친구에게 귓속말 맡기기 (+5 EXP)');
      }
      refreshWhisperExpCounts();

      setIsSendingWhisper(false);
      setWhisperWriteModalVisible(false);
      const targetName = whisperTargetUser.name;
      const petName = familyPetmong?.name || '반려친구';
      setWhisperMessage('');
      setWhisperTargetUser(null);

      const sendExpMsg = canEarnSendExp
        ? `\n\n🌱 ${petName}가 편지를 품고 +5 EXP 성장했어요! (오늘 남은 보상: ${MAX_DAILY_WHISPER_SEND_EXP - (dailyWhisperSendExpCount + 1)}회)`
        : `\n\n(오늘의 귓속말 발송 성장 보상 ${MAX_DAILY_WHISPER_SEND_EXP}회를 모두 달성하여 편지만 안전하게 전해집니다 ✨)`;

      Alert.alert(
        `${petName}에게 전달 완료! 💌`,
        `쉿! ${targetName}님이 거실에 들어오시면 ${petName}가 비밀 편지를 살짝 전해드릴게요! 🤫${sendExpMsg}`
      );
    } catch (err) {
      setIsSendingWhisper(false);
      console.error('Send whisper error:', err);
      Alert.alert('전송 안내', '귓속말을 저장하는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const handleConfirmReadWhisper = async (whisper: any) => {
    if (!whisper?.id) return;
    try {
      const cacheKey = `@famlink_petmong_whispers_${familyId}`;
      setWhispers(prev => {
        const next = prev.map(w => w.id === whisper.id ? { ...w, is_read: true } : w);
        AsyncStorage.setItem(cacheKey, JSON.stringify(next)).catch(() => {});
        return next;
      });

      // Try update in Supabase
      try {
        await supabase
          .from('petmong_whispers')
          .update({ is_read: true })
          .eq('id', whisper.id);
      } catch (dbErr) {
        console.warn('petmong_whispers update sync note:', dbErr);
      }

      const canEarnReadExp = dailyWhisperReadExpCount < MAX_DAILY_WHISPER_READ_EXP;
      const readExpToAward = canEarnReadExp ? 10 : 0;

      if (canEarnReadExp) {
        const nextReadCount = dailyWhisperReadExpCount + 1;
        setDailyWhisperReadExpCount(nextReadCount);
        const readKey = `@famlink_whisper_read_exp_${currentUserProfile?.id}_${todayDateStr}`;
        AsyncStorage.setItem(readKey, String(nextReadCount)).catch(() => {});
      }

      if (canEarnReadExp && onAwardExp && currentUserProfile?.id) {
        onAwardExp(currentUserProfile.id, 10, '비밀 귓속말 확인 & 하트 보내기 (+10 EXP)');
      }

      const sender = familyMembers.find(m => m.id === whisper.from_user_id);

      try {
        await supabase.from('petmong_activities').insert({
          character_id: familyPetmong?.id,
          user_id: currentUserProfile?.id,
          activity_type: 'WHISPER_READ',
          notes: `${currentUserProfile?.name || '가족'}님이 ${sender?.name || '가족'}님의 비밀 귓속말을 읽고 하트를 보냈습니다! 💖`,
          exp_earned: readExpToAward,
        });
      } catch (actErr) {
        console.warn('Activity log error:', actErr);
      }
      refreshWhisperExpCounts();

      setWhisperReadModalVisible(false);
      setActiveWhisperToRead(null);

      const petName = familyPetmong?.name || '반려친구';
      const readExpMsg = canEarnReadExp
        ? `\n우리 ${petName}도 사랑을 먹고 +10 EXP 성장했어요! 🌱 (오늘 남은 보상: ${MAX_DAILY_WHISPER_READ_EXP - (dailyWhisperReadExpCount + 1)}회)`
        : `\n(오늘의 귓속말 확인 성장 보상 ${MAX_DAILY_WHISPER_READ_EXP}회를 모두 달성하여 따뜻한 마음만 전해졌습니다 ✨)`;

      Alert.alert(
        '하트 전송 완료! 💖',
        `${sender?.name || '가족'}님에게 감사의 마음이 전해졌습니다!${readExpMsg}`
      );
    } catch (e) {
      console.warn('handleConfirmReadWhisper error:', e);
      setWhisperReadModalVisible(false);
      setActiveWhisperToRead(null);
    }
  };

  const handleReplyWhisper = (whisper: any) => {
    const sender = familyMembers.find(m => m.id === whisper.from_user_id);
    setWhisperReadModalVisible(false);
    setActiveWhisperToRead(null);
    if (sender) {
      setWhisperTargetUser(sender);
    }
    setWhisperWriteModalVisible(true);
  };

  const effectiveImageUrl = activeStageImageUrl || displayedCharacter?.image_url;

  // Method B: Image-to-Image AI Stage Evolution (Pre-generation Check & Instant Apply)
  const triggerAiEvolution = async (char: any, stage: any) => {
    try {
      let evolvedImageUrl = null;

      // 1. Check if the stage image was already pre-generated in the background!
      try {
        const cachedStages = await getPetmongStageImages(char.id);
        if (cachedStages && cachedStages[stage.stage]) {
          evolvedImageUrl = cachedStages[stage.stage];
          console.log(`[Instant Evolution] Using pre-generated Stage ${stage.stage} image!`);
        }
      } catch (cacheErr) {
        console.warn('Cache check error:', cacheErr);
      }

      // 2. If not pre-generated, generate on-demand using generateStageAiImage
      if (!evolvedImageUrl) {
        try {
          evolvedImageUrl = await generateStageAiImage(char, stage.stage);
        } catch (genErr) {
          console.error('On-demand stage generation failed:', genErr);
        }
      }

      if (evolvedImageUrl) {
        await supabase
          .from('petmong_characters')
          .update({ image_url: evolvedImageUrl, family_id: familyId })
          .eq('id', char.id);

        setMyCharacter(prev => prev ? ({ ...prev, image_url: evolvedImageUrl } as PetmongCharacter) : null);
        if (setPetmongCharacters) {
          setPetmongCharacters((prev: any[]) => prev.map(c => c.id === char.id ? { ...c, image_url: evolvedImageUrl } : c));
        }
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
            (supabase
              .from('petmong_characters')
              .update({ emoji: newEmoji, family_id: familyId })
              .eq('id', myCharacter.id) as any)
              .then(() => {
                setMyCharacter(prev => prev ? ({ ...prev, emoji: newEmoji } as PetmongCharacter) : null);
                if (setPetmongCharacters) {
                  setPetmongCharacters((prev: any[]) => prev.map(c => c.id === myCharacter.id ? { ...c, emoji: newEmoji } : c));
                }
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

  // Load room theme and sync across family devices via Supabase
  useEffect(() => {
    if (!currentUserProfile?.id) return;

    // Fetch ground-truth room theme from Supabase petmong_activities for cross-device sync
    if (familyId) {
      // Query recent room theme updates for all members
      (supabase
        .from('petmong_activities')
        .select('action_type, created_at')
        .eq('family_id', familyId)
        .ilike('action_type', 'ROOM_THEME_UPDATE:%')
        .order('created_at', { ascending: true }) as any)
        .then(({ data, error }: any) => {
          if (data && !error && data.length > 0) {
            const lastRow = data[data.length - 1];
            const parts = lastRow.action_type.split(':');
            if (parts.length >= 3) {
              const tId = parts[2];
              if (ROOM_THEMES.some(t => t.id === tId)) {
                setFamilyRoomTheme(tId);
              }
            }
          }
        })
        .catch((err: any) => console.log('Error fetching DB room themes:', err));
    }
  }, [currentUserProfile?.id, myCharacter?.id, familyId, familyMembers.length]);

  // Real-time Supabase listener for Family Room Theme Updates across all family devices
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
        (payload: any) => {
          const actionType = payload.new?.action_type || '';
          if (actionType.startsWith('ROOM_THEME_UPDATE:')) {
            const parts = actionType.split(':');
            if (parts.length >= 3) {
              const tId = parts[2];
              if (ROOM_THEMES.some(t => t.id === tId)) {
                setFamilyRoomTheme(tId);
                AsyncStorage.setItem(`PETMONG_FAMILY_ROOM_THEME_${familyId}`, tId).catch(() => {});
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


  const handleSelectTheme = (themeId: string) => {
    setFamilyRoomTheme(themeId);
    setThemeModalVisible(false);

    // 1. Local storage caching for family
    if (familyId) {
      AsyncStorage.setItem(`PETMONG_FAMILY_ROOM_THEME_${familyId}`, themeId).catch(() => {});
    }

    // 2. Realtime sync across all family devices via Supabase
    if (familyId) {
      const petId = familyPetmong?.id || '00000000-0000-0000-0000-000000000000';
      (supabase.from('petmong_activities').insert({
        family_id: familyId,
        actor_id: petId,
        target_id: petId,
        action_type: `ROOM_THEME_UPDATE:${familyId}:${themeId}`,
      }) as any).then(() => {
        console.log('Successfully synced family room theme to Supabase');
      }).catch((err: any) => {
        console.log('Error syncing room theme to DB:', err);
      });
    }
  };


  // Handle AI Character Creation
  // Handle AI Character Creation & Reincarnation (Image-to-Image with 500P option)
  const handlePickImageAndCreate = async () => {
    if (!newName.trim()) {
      Alert.alert('알림', '반려몽의 이름을 지어주세요!');
      return;
    }

    const isModifying = !!familyPetmong?.id;
    if (isModifying && (points || 0) < 500) {
      Alert.alert('포인트 부족', `반려몽 외형 변경에는 500 P가 필요합니다.\n현재 가족 보유 포인트: ${points || 0} P`);
      return;
    }

    const executePickImage = async () => {
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
      const targetStageNum = familyPetmong?.level
        ? (familyPetmong.level >= 20 ? 4 : familyPetmong.level >= 10 ? 3 : familyPetmong.level >= 5 ? 2 : 1)
        : 1;

      // 1. Unified Gemini Service Pipeline (Vision + Image-to-Image)
      const aiResult = await generatePetmongMascotFromPhoto({
        base64Photo: result.assets[0].base64,
        personality: newPersonality,
        targetStageNum,
        stylePreset: selectedStylePreset,
      });

      let generatedImageUrl = aiResult.generatedImageUrl;
      const detailedError = aiResult.detailedError;
      const detectedColor = aiResult.detectedColor;
      const detectedSpecies = aiResult.detectedSpecies;

      // 2. Fallback: Seamless Vector Petmong Generation
      if (!generatedImageUrl) {
        generatedImageUrl = createPetmongSvg(
          targetStageNum,
          detectedColor,
          newPersonality,
          detectedSpecies
        );
      }

      // 3. If generation succeeded, save/update in database
      if (generatedImageUrl) {
        try {
          generatedImageUrl = await makeBackgroundTransparentOnDevice(generatedImageUrl);
        } catch (transErr) {
          console.warn('[InteriorScreen] Transparency processing failed:', transErr);
        }
        try {
          const SPECIES_EMOJI_MAP: Record<string, string> = {
            canine: '🐶',
            feline: '🐱',
            rabbit: '🐰',
            bear: '🐻',
            bird: '🐥',
            fox: '🦊',
            deer: '🦌',
            rodent: '🐹',
            dragon: '🐲',
            aquatic: '🦭',
          };
          const matchedEmoji = (detectedSpecies && SPECIES_EMOJI_MAP[detectedSpecies]) || newEmoji || '🐶';

          if (isModifying && familyPetmong?.id) {
            // Re-incarnation / Appearance Modification: Deduct 500P, UPDATE existing character, preserve level & exp
            if (onDeductPoints) {
              await onDeductPoints(500, '반려몽 외형 변경/환생');
            }

            const updateData: any = {
              name: newName.trim(),
              emoji: matchedEmoji,
              image_url: generatedImageUrl,
              personality: newPersonality,
              style_preset: selectedStylePreset,
              level: 1,
              exp: 0,
              family_id: familyId,
            };

            let { data: updatedChar, error: updateError } = await supabase
              .from('petmong_characters')
              .update(updateData)
              .eq('id', familyPetmong.id)
              .select()
              .single();

            // DB에 style_preset 컬럼이 아직 없는 경우(PGRST204) 키를 제거하고 즉시 재시도
            if (updateError && (updateError.message?.includes('style_preset') || (updateError as any).code === 'PGRST204')) {
              delete updateData.style_preset;
              const retry = await supabase
                .from('petmong_characters')
                .update(updateData)
                .eq('id', familyPetmong.id)
                .select()
                .single();
              updatedChar = retry.data;
              updateError = retry.error;
            }

            if (updateError) throw updateError;
            if (updatedChar) updatedChar.style_preset = selectedStylePreset;

            if (currentUserProfile?.id) {
              try {
                await supabase.from('petmong_activities').insert({
                  character_id: familyPetmong.id,
                  user_id: currentUserProfile.id,
                  activity_type: 'REINCARNATION',
                  notes: `${currentUserProfile.name || '가족'}님이 500P로 우리 반려몽의 외형을 새로 꾸며주었습니다! 🪄`,
                  exp_earned: 0,
                });
              } catch (actErr) {
                console.warn('Activity log error:', actErr);
              }
            }

            setIsGenerating(false);
            setMyCharacter(updatedChar);
            setActiveStageImageUrl(updatedChar.image_url);
            setCreateModalVisible(false);
            if (setPetmongCharacters) {
              setPetmongCharacters((prev: any[]) => prev.map(c => c.id === updatedChar.id ? updatedChar : c));
            }
            Alert.alert('외형 환생 완료! ✨', `500 P를 사용하여 ${newName.trim()}(이)가 새로운 외형으로 환생했습니다! 1단계 아기몽부터 새로운 성장이 시작됩니다 🌱`);

            if (updatedChar.id && updatedChar.image_url) {
              await resetPetmongStageImages(updatedChar.id);
              await savePetmongStageImage(updatedChar.id, 1, updatedChar.image_url);
              startBackgroundStagePreGeneration(updatedChar, (stage, url) => {
                console.log(`[Stage Pre-Gen] Stage ${stage} completed for ${updatedChar.name}`);
              }, true);
            }
            return;
          } else {
            // Initial Creation: Free
            if (!currentUserProfile?.id) return;
            const newCharData: any = {
              user_id: currentUserProfile.id,
              family_id: familyId,
              name: newName.trim(),
              emoji: matchedEmoji,
              image_url: generatedImageUrl,
              personality: newPersonality,
              style_preset: selectedStylePreset,
              level: 1,
              exp: 0,
            };

            let { data: insertedChar, error: insertError } = await supabase
              .from('petmong_characters')
              .insert(newCharData)
              .select()
              .single();

            // DB에 style_preset 컬럼이 아직 없는 경우(PGRST204) 키를 제거하고 즉시 재시도
            if (insertError && (insertError.message?.includes('style_preset') || (insertError as any).code === 'PGRST204')) {
              delete newCharData.style_preset;
              const retry = await supabase
                .from('petmong_characters')
                .insert(newCharData)
                .select()
                .single();
              insertedChar = retry.data;
              insertError = retry.error;
            }

            if (insertError) throw insertError;
            if (insertedChar) insertedChar.style_preset = selectedStylePreset;

            setIsGenerating(false);
            setMyCharacter(insertedChar);
            setCreateModalVisible(false);
            if (setPetmongCharacters) {
              setPetmongCharacters((prev: any[]) => [...prev, insertedChar]);
            }
            Alert.alert('탄생 완료! 🎉', '나를 똑닮은 귀여운 우리 가족 수호 반려몽이 부화했어요!');

            if (insertedChar.id && insertedChar.image_url) {
              await resetPetmongStageImages(insertedChar.id);
              await savePetmongStageImage(insertedChar.id, 1, insertedChar.image_url);
              startBackgroundStagePreGeneration(insertedChar, (stage, url) => {
                console.log(`[Stage Pre-Gen] Stage ${stage} completed for ${insertedChar.name}`);
              }, true);
            }
            return;
          }
        } catch (insertErr) {
          setIsGenerating(false);
          console.error('Database save error:', insertErr);
          Alert.alert('오류', '반려몽 저장에 실패했습니다.');
          return;
        }
      }

      // 4. If AI Generation failed, prompt fallback option
      setIsGenerating(false);
      const isLeakedOrAuth = detailedError && (
        detailedError.includes('leaked') ||
        detailedError.includes('PERMISSION_DENIED') ||
        detailedError.includes('API key') ||
        detailedError.includes('403') ||
        detailedError.includes('401')
      );

      const alertTitle = isLeakedOrAuth ? 'AI API 키 확인 필요' : '반려몽 외형 생성 실패';
      const alertMsg = isLeakedOrAuth
        ? 'Google Gemini API 키가 차단되었거나 등록되지 않았습니다.\n(.env 파일에 EXPO_PUBLIC_GEMINI_API_KEY 설정 필요)\n\n기본 귀여운 꼬물이 몽이 외형으로 적용하시겠습니까?'
        : 'AI 이미지 생성 서버 응답이 원활하지 않습니다.\n기본 귀여운 꼬물이 몽이 외형으로 적용하시겠습니까?';

      Alert.alert(
        alertTitle,
        alertMsg,
        [
          { text: '취소', style: 'cancel' },
          {
            text: isModifying ? '기본 외형으로 변경' : '기본 몽이로 부화 🐣',
            onPress: async () => {
              try {
                setIsGenerating(true);
                if (isModifying && familyPetmong?.id) {
                  if (onDeductPoints) await onDeductPoints(500, '반려몽 외형 변경/환생');
                  const updateData = {
                    name: newName.trim(),
                    emoji: '🐣',
                    image_url: null,
                    personality: newPersonality,
                    level: 1,
                    exp: 0,
                    family_id: familyId,
                  };
                  const { data: updatedChar, error: updateError } = await supabase
                    .from('petmong_characters')
                    .update(updateData)
                    .eq('id', familyPetmong.id)
                    .select()
                    .single();
                  if (updateError) throw updateError;
                  setIsGenerating(false);
                  setMyCharacter(updatedChar);
                  setActiveStageImageUrl(null);
                  setCreateModalVisible(false);
                  if (setPetmongCharacters) {
                    setPetmongCharacters((prev: any[]) => prev.map(c => c.id === updatedChar.id ? updatedChar : c));
                  }
                  Alert.alert('외형 환생 완료! ✨', '기본 꼬물이 몽이 외형으로 환생했습니다! 1단계 아기몽부터 새롭게 성장합니다 🌱');
                  return;
                }

                // Initial creation fallback
                if (!currentUserProfile?.id) return;
                const newCharData = {
                  user_id: currentUserProfile.id,
                  family_id: familyId,
                  name: newName.trim(),
                  emoji: '🐣',
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
                if (setPetmongCharacters) {
                  setPetmongCharacters((prev: any[]) => [...prev, insertedChar]);
                }
                Alert.alert('탄생 완료! 🎉', '귀여운 아기 꼬물이 몽이가 부화했어요!');
              } catch (e) {
                setIsGenerating(false);
                Alert.alert('오류', '반려몽 생성에 실패했습니다.');
              }
            }
          }
        ]
      );
    }
  };

    if (isModifying) {
      Alert.alert(
        '반려몽 외형 환생 (500 P)',
        `500 P를 사용하여 새로운 사진으로 외형을 환생시키겠습니까?\n\n※ 환생 시 레벨과 경험치는 1단계 아기몽(Lv.1, EXP 0)으로 초기화되어 처음부터 새롭게 성장합니다.`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '사진 선택하고 환생하기',
            onPress: () => {
              executePickImage();
            },
          },
        ]
      );
      return;
    }

    executePickImage();
  };

  // Handle Quick Character Creation & Appearance Change with Emoji (500P for modification)
  const handleCreateWithEmoji = async () => {
    if (!newName.trim()) {
      Alert.alert('알림', '반려몽의 이름을 지어주세요!');
      return;
    }

    const isModifying = !!familyPetmong?.id;
    if (isModifying && (points || 0) < 500) {
      Alert.alert('포인트 부족', `반려몽 외형 변경에는 500 P가 필요합니다.\n현재 가족 보유 포인트: ${points || 0} P`);
      return;
    }

    const executeEmojiChange = async () => {
      try {
        setIsGenerating(true);

        if (isModifying && familyPetmong?.id) {
          if (onDeductPoints) {
            await onDeductPoints(500, '반려몽 외형 변경/환생');
          }

          const updateData = {
            name: newName.trim(),
            emoji: newEmoji || '🐶',
            image_url: null,
            personality: newPersonality,
            level: 1,
            exp: 0,
            family_id: familyId,
          };

          const { data: updatedChar, error: updateError } = await supabase
            .from('petmong_characters')
            .update(updateData)
            .eq('id', familyPetmong.id)
            .select()
            .single();

          if (updateError) throw updateError;

          if (currentUserProfile?.id) {
            try {
              await supabase.from('petmong_activities').insert({
                character_id: familyPetmong.id,
                user_id: currentUserProfile.id,
                activity_type: 'REINCARNATION',
                notes: `${currentUserProfile.name || '가족'}님이 500P로 우리 반려몽의 모습을 ${newEmoji}로 변경했습니다!`,
                exp_earned: 0,
              });
            } catch (actErr) {
              console.warn('Activity log error:', actErr);
            }
          }

          setIsGenerating(false);
          setMyCharacter(updatedChar);
          setActiveStageImageUrl(null);
          setCreateModalVisible(false);
          if (setPetmongCharacters) {
            setPetmongCharacters((prev: any[]) => prev.map(c => c.id === updatedChar.id ? updatedChar : c));
          }
          Alert.alert('외형 환생 완료! ✨', `500 P를 사용하여 ${newName.trim()}(이)의 외형이 새롭게 환생했습니다! 1단계 아기몽부터 새롭게 성장합니다 🌱`);
          return;
        }

      // Initial Free Creation
      if (!currentUserProfile?.id) return;
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
      if (setPetmongCharacters) {
        setPetmongCharacters((prev: any[]) => [...prev, insertedChar]);
      }
      Alert.alert('탄생 완료! 🎉', `${newName.trim()}(이)가 우리 집에 입주했습니다!`);
    } catch (err) {
      setIsGenerating(false);
      console.error('Emoji character creation error:', err);
      Alert.alert('오류 발생', '반려몽 생성에 실패했습니다. 다시 시도해주세요.');
    }
  };

  if (isModifying) {
    Alert.alert(
      '반려몽 외형 환생 (500 P)',
      `500 P를 사용하여 ${newEmoji || '새로운'} 모습으로 외형을 환생시키겠습니까?\n\n※ 환생 시 레벨과 경험치는 1단계 아기몽(Lv.1, EXP 0)으로 초기화되어 처음부터 새롭게 성장합니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '환생하기',
          onPress: () => {
            executeEmojiChange();
          },
        },
      ]
    );
    return;
  }

  executeEmojiChange();
};


  return (
    <View style={styles.fullscreenContainer}>
      {/* Fullscreen High-Resolution Room Background Image (Hardware Accelerated by expo-image) */}
      <ExpoImage
        source={(ROOM_BACKGROUNDS as Record<string, any>)[activeRoomTheme] || (ROOM_BACKGROUNDS as any).cottage}
        style={styles.fullscreenBg}
        contentFit="cover"
        transition={0}
        priority="high"
        cachePolicy="memory-disk"
      />

      {/* Top Floating Glass Header (우리 가족 거실) */}
      <View style={styles.topFloatingHeader}>
        <View style={styles.familyRoomBadgeContainer}>
          {familyPetmong ? (
            <TouchableOpacity
              style={styles.familyPetmongPill}
              onPress={() => {
                setGrowthBookTargetChar(displayedCharacter || myCharacter);
                setGrowthBookInitialTab('growth');
                setFamilyBookModalVisible(true);
              }}
              activeOpacity={0.75}
            >
              <Text style={{ fontSize: 13, marginRight: 4 }}>
                {familyPetmong.emoji || '🐾'}
              </Text>
              <Text style={styles.familyPetmongPillText}>
                {familyPetmong.name}
              </Text>
              <View style={styles.petLevelTag}>
                <Text style={styles.petLevelTagText}>Lv.{familyPetmong.level || 1}</Text>
              </View>
              <BookOpen size={12} color="#E11D48" style={{ marginLeft: 5 }} />
            </TouchableOpacity>
          ) : (
            <View style={styles.familyPetmongPill}>
              <Text style={{ fontSize: 13, marginRight: 4 }}>🏡</Text>
              <Text style={styles.familyPetmongPillText}>우리 가족 거실</Text>
            </View>
          )}
        </View>

        {/* Top Right Action Icons (거실 테마, 외형 변경) */}
        <View style={styles.topActionsRow}>

          {/* 2. Room Theme Picker */}
          <TouchableOpacity
            style={[styles.topActionIconBtn, styles.topActionIconBtnPurple]}
            onPress={() => {
              setDecorModalTab('theme');
              setDecorModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Palette size={14} color="#7C3AED" />
            <Text style={[styles.topActionBtnText, { color: '#7C3AED' }]}>
              거실 테마
            </Text>
          </TouchableOpacity>

          {/* 3. Reincarnate / Create New Petmong (500P) */}
          <TouchableOpacity
            style={[styles.topActionIconBtn, styles.topActionIconBtnCoral]}
            onPress={() => {
              setDecorModalTab('appearance');
              setDecorModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Sparkles size={14} color="#FF6B47" />
            <Text style={[styles.topActionBtnText, { color: '#FF6B47' }]}>
              {displayedCharacter ? '외형 변경 (500P)' : '새로 만들기'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Fullscreen Interactive Room Game Engine */}
      {displayedCharacter ? (
        <PetmongGameEngine
          character={displayedCharacter}
          owner={displayedOwner}
          isVisiting={false}
          visitorCharacter={myCharacter}
          theme={activeRoomTheme}
          insets={insets}
          vitals={activeVitals}
          onUpdateVitals={handleUpdateVitals}
          onGainExp={handleGameGainExp}
          onAwardPoints={onAwardPoints}
          onCareAction={handleGameCareAction}
          onOpenGrowthBook={() => {
            setGrowthBookTargetChar(displayedCharacter || myCharacter);
            setGrowthBookInitialTab('growth');
            setFamilyBookModalVisible(true);
          }}
          unreadWhispers={unreadWhispers}
          onOpenWhisper={(w) => {
            setActiveWhisperToRead(w);
            setWhisperReadModalVisible(true);
          }}
          onOpenWriteWhisper={() => {
            setWhisperWriteModalVisible(true);
          }}
          messages={messages}
          smallTalkState={smallTalkState}
          onNavigateScreen={onNavigateScreen}
        />
      ) : (
        /* Empty Room Banner */
        <View style={styles.fullscreenOverlayCanvas} pointerEvents="box-none">
          <View style={styles.createPromptBanner}>
            <Text style={styles.createPromptTitle}>
              아늑한 우리 가족의 거실 🏡
            </Text>
            <Text style={styles.createPromptSub}>
              온 가족이 함께 돌보고 키워나갈 우리 집 대표 AI 수호 반려몽을 입주시켜보세요!
            </Text>
            <TouchableOpacity
              style={styles.createPromptBtn}
              onPress={() => setCreateModalVisible(true)}
              activeOpacity={0.8}
            >
              <Sparkles size={16} color="#FFFFFF" />
              <Text style={styles.createPromptBtnText}>우리 가족 반려몽 태어나기 🐣</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Unified Decorate & Customize Modal (거실 테마 & 반려몽 외형 변경) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={decorModalVisible}
        onRequestClose={() => setDecorModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalView}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleRow}>
                <Sparkles size={20} color="#7C3AED" style={{ marginRight: 6 }} />
                <Text style={styles.modalHeader}>거실 테마 & 반려친구 ✨</Text>
              </View>
              <TouchableOpacity onPress={() => setDecorModalVisible(false)}>
                <X size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {/* Segmented Tab Controls (Only if pet exists) */}
            {displayedCharacter && (
              <View style={styles.decorSegmentRow}>
                <TouchableOpacity
                  style={[
                    styles.decorSegmentBtn,
                    decorModalTab === 'theme' && styles.decorSegmentBtnActive,
                  ]}
                  onPress={() => setDecorModalTab('theme')}
                  activeOpacity={0.8}
                >
                  <Palette size={15} color={decorModalTab === 'theme' ? '#7C3AED' : '#6B7280'} />
                  <Text
                    style={[
                      styles.decorSegmentText,
                      decorModalTab === 'theme' && styles.decorSegmentTextActive,
                    ]}
                  >
                    거실 테마 (5종)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.decorSegmentBtn,
                    decorModalTab === 'appearance' && styles.decorSegmentBtnActive,
                  ]}
                  onPress={() => setDecorModalTab('appearance')}
                  activeOpacity={0.8}
                >
                  <Sparkles size={15} color={decorModalTab === 'appearance' ? '#7C3AED' : '#6B7280'} />
                  <Text
                    style={[
                      styles.decorSegmentText,
                      decorModalTab === 'appearance' && styles.decorSegmentTextActive,
                    ]}
                  >
                    반려몽 외형 변경
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Scrollable Content */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {decorModalTab === 'theme' ? (
                /* TAB 1: 거실 배경 테마 선택 (5종) */
                <View>
                  <Text style={styles.modalSubDesc}>
                    원하는 분위기의 거실을 선택하면 온 가족의 화면에 실시간으로 반영됩니다! 🏡
                  </Text>

                  <View style={{ gap: 10, marginTop: 4 }}>
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
              ) : (
                /* TAB 2: 반려몽 외형 변경 / 생성 */
                <View>
                  <Text style={styles.modalSubDesc}>
                    {displayedCharacter
                      ? '가족 사진을 올려 반려몽의 외형을 새롭게 환생시킬 수 있어요! 1단계 아기몽(Lv.1, EXP 0)부터 새로운 성장 여정이 시작됩니다.'
                      : '가족 사진이나 이미지를 올리면 AI가 우리 가족을 지켜줄 든든하고 귀여운 맞춤 수호 반려몽을 만들어 드려요!'}
                  </Text>

                  {/* Point info badge for modification */}
                  {displayedCharacter && (
                    <View style={{
                      backgroundColor: '#FFFBEB',
                      borderColor: '#FDE68A',
                      borderWidth: 1,
                      borderRadius: 14,
                      padding: 12,
                      marginBottom: 14,
                    }}>
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 6,
                      }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: (points || 0) >= 500 ? '#7C3AED' : '#BE123C' }}>
                          🪄 외형 환생 비용: 500 P
                        </Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: (points || 0) >= 500 ? '#059669' : '#E11D48' }}>
                          가족 보유: {points || 0} P {(points || 0) >= 500 ? '✅' : '❌ (부족)'}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11.5, color: '#92400E', fontWeight: '600', lineHeight: 16 }}>
                        💡 <Text style={{ fontWeight: '800' }}>환생 안내:</Text> 새로운 외형으로 변경 시 레벨과 경험치가 1단계 아기몽(Lv.1, EXP 0)으로 초기화되며, 성장 단계(2~4단계)도 새로운 외형에 맞춰 처음부터 다시 진화합니다.
                      </Text>
                    </View>
                  )}

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

                  <Text style={styles.modalLabel}>AI 그림 스타일 선택 (사진 생성 시 적용)</Text>
                  <View style={styles.stylePickerGrid}>
                    {STYLE_PRESET_OPTIONS.map((st) => {
                      const isSelected = selectedStylePreset === st.id;
                      return (
                        <TouchableOpacity
                          key={st.id}
                          style={[
                            styles.styleCard,
                            isSelected && styles.styleCardActive,
                          ]}
                          onPress={() => setSelectedStylePreset(st.id)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.styleCardTop}>
                            <Text style={styles.styleCardEmoji}>{st.emoji}</Text>
                            <Text
                              style={[
                                styles.styleCardTitle,
                                isSelected && styles.styleCardTitleActive,
                              ]}
                              numberOfLines={1}
                            >
                              {st.title}
                            </Text>
                          </View>
                          <Text style={styles.styleCardDesc} numberOfLines={2}>
                            {st.desc}
                          </Text>
                          <View
                            style={[
                              styles.styleCardBadge,
                              isSelected && styles.styleCardBadgeActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.styleCardBadgeText,
                                isSelected && styles.styleCardBadgeTextActive,
                              ]}
                            >
                              {st.tag}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.modalLabel}>기본 캐릭터 선택 (즉시 입주)</Text>
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
                        {displayedCharacter ? `${newEmoji} 모습으로 변경하기 (500P)` : `${newEmoji} 캐릭터로 바로 입주하기`}
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.orDividerRow}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>또는 AI 사진으로 그리기</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity
                      style={styles.modalConfirmBtn}
                      onPress={handlePickImageAndCreate}
                      activeOpacity={0.8}
                    >
                      <Camera size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.modalConfirmBtnText}>
                        {displayedCharacter
                          ? `[${STYLE_PRESET_OPTIONS.find((s) => s.id === selectedStylePreset)?.title || 'AI'}] 사진으로 외형 변경 (500P)`
                          : `[${STYLE_PRESET_OPTIONS.find((s) => s.id === selectedStylePreset)?.title || 'AI'}] 사진으로 반려몽 그리기`}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* AI Generation Loading Overlay */}
            {isGenerating && (
              <View style={styles.generatingOverlay}>
                <ActivityIndicator size="large" color="#FF6B47" />
                <Text style={styles.generatingText}>
                  {displayedCharacter
                    ? `AI가 사진을 분석하여 [${STYLE_PRESET_OPTIONS.find((s) => s.id === selectedStylePreset)?.title || '새로운 스타일'}]으로\n멋지게 새 단장하고 있습니다... 🪄`
                    : `AI가 사진을 분석하여 [${STYLE_PRESET_OPTIONS.find((s) => s.id === selectedStylePreset)?.title || '특별한 스타일'}]의\n사랑스러운 반려몽을 그리는 중입니다... 🎨`}
                </Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
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
            
            {evolutionData && evolutionData.character && (
              <>
                <View style={[styles.evolutionStagePill, { backgroundColor: evolutionData.stage?.badgeColor || '#FF6B47' }]}>
                  <Text style={styles.evolutionStagePillText}>
                    Stage {evolutionData.stage?.stage} • {evolutionData.stage?.stageTitle}
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
                          source={{ uri: (evolutionData.previousImageUrl || evolutionData.character.image_url) as string }}
                          style={{ width: 55, height: 55, borderRadius: 28 }}
                          resizeMode="contain"
                        />
                      ) : (
                        <Text style={styles.evolutionPreviewEmoji}>
                          {getEvolvedEmoji(evolutionData.character.emoji, evolutionData.previousLevel)}
                        </Text>
                      )}
                    </View>

                    <ChevronRight size={22} color="#FF6B47" />

                    <View style={[styles.evolutionPreviewBox, styles.evolutionPreviewBoxActive]}>
                      <Text style={[styles.evolutionPreviewLabel, { color: '#D48806', fontWeight: '800' }]}>
                        Lv.{evolutionData.newLevel} 진화 ✨
                      </Text>
                      {evolutionData.character.image_url ? (
                        <Image
                          source={{ uri: (evolutionData.newImageUrl || evolutionData.character.image_url) as string }}
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
                  {evolutionData.character.name}이(가) 가족의 깊은 애정과 사랑으로 {getStageNameWithPet(evolutionData.stage?.stage, evolutionData.character.name)}(으)로 멋지게 성장했습니다!
                  {'\n'}{evolutionData.stage?.desc}
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

      {/* Petmong Growth & Family Illustrated Book Modal (반려몽 성장 도감 & 가족 도감) */}
      <PetmongGrowthBookModal
        visible={familyBookModalVisible}
        onClose={() => setFamilyBookModalVisible(false)}
        character={growthBookTargetChar || displayedCharacter || myCharacter}
        allCharacters={petmongCharacters}
        familyMembers={familyMembers}
        currentUserProfile={currentUserProfile}
        initialTab={growthBookInitialTab}
        onSelectCharacter={(char) => {
          setGrowthBookTargetChar(char);
        }}
      />

      {/* 1. Write Secret Whisper Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={whisperWriteModalVisible}
        onRequestClose={() => setWhisperWriteModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.whisperOverlay}
        >
          <View style={styles.whisperCard}>
            <View style={styles.whisperHeaderRow}>
              <View style={styles.whisperTitleRow}>
                <Mail size={20} color="#FF4D6D" />
                <Text style={styles.whisperTitle}>반려몽 비밀 귓속말 맡기기 💌</Text>
              </View>
              <TouchableOpacity onPress={() => setWhisperWriteModalVisible(false)}>
                <X size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <Text style={styles.whisperDesc}>
              직접 말하기 쑥스러웠던 응원이나 고마움을 적어보세요. 그 가족이 방에 들어오면 몽이가 살짝 비밀 귓속말로 전해드려요! 🤫
            </Text>

            {/* Target Family Member Selector */}
            <Text style={styles.whisperTargetLabel}>받을 가족 선택</Text>
            <View style={styles.whisperMemberList}>
              {familyMembers
                .filter(m => m.id !== currentUserProfile?.id)
                .map((member) => {
                  const isSelected = whisperTargetUser?.id === member.id;
                  return (
                    <TouchableOpacity
                      key={member.id}
                      style={[
                        styles.whisperMemberChip,
                        isSelected && styles.whisperMemberChipActive,
                      ]}
                      onPress={() => setWhisperTargetUser(member)}
                      activeOpacity={0.8}
                    >
                      <UserAvatar avatar={member.avatar} size={18} />
                      <Text
                        style={[
                          styles.whisperMemberChipText,
                          isSelected && styles.whisperMemberChipTextActive,
                        ]}
                      >
                        {member.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
            </View>

            {/* Message Input */}
            <TextInput
              style={styles.whisperInputBox}
              placeholder="예: 엄마 오늘 일하느라 피곤했지? 냉장고에 과일 깎아뒀어 사랑해 ❤️"
              placeholderTextColor="#94A3B8"
              value={whisperMessage}
              onChangeText={setWhisperMessage}
              multiline
              maxLength={100}
            />
            <Text style={styles.whisperCharCount}>{whisperMessage.length}/100자</Text>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.whisperSendBtn,
                (!whisperTargetUser || !whisperMessage.trim() || isSendingWhisper) && styles.whisperSendBtnDisabled,
              ]}
              onPress={handleSendWhisper}
              disabled={!whisperTargetUser || !whisperMessage.trim() || isSendingWhisper}
              activeOpacity={0.85}
            >
              {isSendingWhisper ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Send size={16} color="#FFFFFF" />
                  <Text style={styles.whisperSendBtnText}>
                    {dailyWhisperSendExpCount < MAX_DAILY_WHISPER_SEND_EXP
                      ? `몽이 입에 편지 물려주기 (+5 EXP, ${MAX_DAILY_WHISPER_SEND_EXP - dailyWhisperSendExpCount}회 남음) 💌`
                      : '몽이 입에 편지 물려주기 💌'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 2. Read Secret Whisper Postcard Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={whisperReadModalVisible}
        onRequestClose={() => setWhisperReadModalVisible(false)}
      >
        <View style={styles.whisperOverlay}>
          <View style={styles.whisperCard}>
            <View style={styles.whisperHeaderRow}>
              <View style={styles.whisperTitleRow}>
                <Sparkles size={20} color="#FF4D6D" />
                <Text style={styles.whisperTitle}>비밀 귓속말 도착! 💌</Text>
              </View>
              <TouchableOpacity onPress={() => setWhisperReadModalVisible(false)}>
                <X size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <Text style={styles.whisperDesc}>
              쉿! 몽이가 방 안에서 소중히 품고 있던 비밀 편지예요!
            </Text>

            {/* Cozy Postcard */}
            {activeWhisperToRead && (
              <View style={styles.whisperPostcard}>
                <View style={styles.whisperPostcardSenderRow}>
                  {(() => {
                    const sender = familyMembers.find(m => m.id === activeWhisperToRead.from_user_id);
                    return (
                      <>
                        <UserAvatar avatar={sender?.avatar} size={28} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.whisperPostcardSenderName}>
                            {sender?.name || '가족'}님이 보낸 편지
                          </Text>
                          <Text style={styles.whisperPostcardDate}>
                            {new Date(activeWhisperToRead.created_at).toLocaleDateString('ko-KR', {
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>
                      </>
                    );
                  })()}
                </View>

                <Text style={styles.whisperPostcardBody}>
                  "{activeWhisperToRead.message}"
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.whisperThankYouBtn}
              onPress={() => handleConfirmReadWhisper(activeWhisperToRead)}
              activeOpacity={0.85}
            >
              <Heart size={16} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.whisperThankYouBtnText}>
                {dailyWhisperReadExpCount < MAX_DAILY_WHISPER_READ_EXP
                  ? `고마워 하트 보내기 (+10 EXP, ${MAX_DAILY_WHISPER_READ_EXP - dailyWhisperReadExpCount}회 남음) 💖`
                  : '고마워 하트 보내기 💖'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.whisperReplyBtn}
              onPress={() => handleReplyWhisper(activeWhisperToRead)}
              activeOpacity={0.8}
            >
              <Mail size={15} color="#475569" />
              <Text style={styles.whisperReplyBtnText}>
                나도 답장 귓속말 남기기 💌
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

