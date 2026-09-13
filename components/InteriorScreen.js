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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  List,
  ChevronRight,
  Camera,
  MessageCircle,
  Plus,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BASE_CANVAS_SIZE = SCREEN_WIDTH - 64; // Account for scrollContent padding 32 + canvasCard padding 32

// Cute Room Furniture Catalog (FamLink Palette Style)
const FURNITURE_CATALOG = [
  { id: 'f1', category: 'living', name: '폭신폭신 구름 러그', emoji: '☁️', cost: 100, desc: '발이 편안해지는 부드러운 구름 모양 러그' },
  { id: 'f2', category: 'living', name: '아늑한 미니 소파', emoji: '🛋️', cost: 200, desc: '반려몽이 낮잠 자기 좋은 작은 소파' },
  { id: 'f3', category: 'living', name: '레트로 TV', emoji: '📺', cost: 250, desc: '재미있는 영상이 나오는 귀여운 TV' },
  { id: 'f4', category: 'deco', name: '따뜻한 별빛 무드등', emoji: '🌟', cost: 120, desc: '방 안을 은은하게 비춰주는 조명' },
  { id: 'f5', category: 'deco', name: '초록초록 화분', emoji: '🪴', cost: 80, desc: '상쾌한 기분을 주는 작은 식물' },
  { id: 'f6', category: 'deco', name: '장난감 곰인형', emoji: '🧸', cost: 150, desc: '반려몽의 영원한 단짝 친구' },
  { id: 'f7', category: 'living', name: '맛있는 간식 바구니', emoji: '🧺', cost: 90, desc: '언제든 꺼내 먹을 수 있는 간식들' },
  { id: 'f8', category: 'deco', name: '미니 오디오', emoji: '📻', cost: 180, desc: '신나는 음악이 흘러나오는 오디오' },
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
    '쿠울... 푹신한 러그 위에서 5분만 더 잘래요... zZ 💤',
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

// Draggable Item Component (FamLink Unified Design)
const DraggableFurniture = React.memo(({ item, isSelected, canvasWidth, onSelect, onMove, onRotate, onDelete }) => {
  const [pos, setPos] = useState({ x: item.x, y: item.y });
  const startPos = useRef({ x: item.x, y: item.y });

  useEffect(() => {
    setPos({ x: item.x, y: item.y });
  }, [item.x, item.y]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        onSelect(item.id);
        startPos.current = { x: item.x, y: item.y };
      },
      onPanResponderMove: (evt, gestureState) => {
        const deltaX = (gestureState.dx / canvasWidth) * 100;
        const deltaY = (gestureState.dy / canvasWidth) * 100;

        const newX = Math.max(0, Math.min(84, startPos.current.x + deltaX));
        const newY = Math.max(0, Math.min(84, startPos.current.y + deltaY));

        setPos({ x: newX, y: newY });
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (Math.abs(gestureState.dx) < 3 && Math.abs(gestureState.dy) < 3) {
          onSelect(item.id);
          return;
        }

        const deltaX = (gestureState.dx / canvasWidth) * 100;
        const deltaY = (gestureState.dy / canvasWidth) * 100;

        const finalX = Math.max(0, Math.min(84, startPos.current.x + deltaX));
        const finalY = Math.max(0, Math.min(84, startPos.current.y + deltaY));

        onMove(item.id, finalX, finalY);
      },
    })
  ).current;

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        styles.furnitureWrapper,
        {
          left: `${pos.x}%`,
          top: `${pos.y}%`,
          transform: [{ rotate: `${item.rotation}deg` }],
        },
        isSelected && styles.furnitureWrapperSelected,
      ]}
    >
      <Text style={styles.furnitureEmoji}>{item.emoji}</Text>

      {isSelected && (
        <View style={styles.furnitureControlOverlay}>
          <TouchableOpacity style={styles.controlBtn} onPress={() => onRotate(item)}>
            <RotateCw size={12} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlBtn, styles.controlBtnDelete]} onPress={() => onDelete(item)}>
            <Trash2 size={12} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
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

export default function InteriorScreen({
  points,
  onDeductPoints,
  placedFurniture,
  onUpdatePlacedFurniture,
  currentUser,
  currentUserProfile,
  familyId,
  petmongCharacters = [],
  setPetmongCharacters,
  onAwardExp,
}) {
  const insets = useSafeAreaInsets();
  
  // UI States
  const [shopModalVisible, setShopModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('living');
  const [selectedFurnitureId, setSelectedFurnitureId] = useState(null);
  
  // Petmong States (Linked with Supabase)
  const [myCharacter, setMyCharacter] = useState(null);
  const [mainCharTransparentUrl, setMainCharTransparentUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [familyCharacters, setFamilyCharacters] = useState([]);
  const [activities, setActivities] = useState([
    { id: 'act1', text: '엄마 냥이님이 아빠 멍뭉이님에게 다정하게 인사했습니다! 👋', time: '10분 전' },
    { id: 'act2', text: '동생 삐약이님이 새 러그 위에서 낮잠을 잤습니다. 💤', time: '1시간 전' },
  ]);
  
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
  
  // Activity Log Modal State
  const [activityLogVisible, setActivityLogVisible] = useState(false);

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
    const quote = getRandomDialogue(myCharacter.personality);
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

    // 4. Award EXP on touch (up to 5 times per day)
    if (dailyTouchCount < 5) {
      setDailyTouchCount(prev => prev + 1);

      if (onAwardExp && currentUserProfile?.id) {
        onAwardExp(currentUserProfile.id, 3, '반려몽 쓰다듬기 (+3 EXP)');
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

      setActivities(prev => [{
        id: `act-${Date.now()}`,
        text: `${currentUserProfile?.name || '나'}님이 ${myCharacter.name}을(를) 다정하게 쓰다듬어 주었습니다 (+3 EXP) 💕`,
        time: '방금 전'
      }, ...prev]);
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
        setActivities(prev => [{ id: `act-${Date.now()}`, text: `${newName}님이 우리 집 방에 놀러왔어요! 🎉`, time: '방금 전' }, ...prev]);
        
        Alert.alert('탄생 완료! 🎉', '나를 똑닮은 귀여운 반려몽이 부화했어요!');
      } catch (err) {
        setIsGenerating(false);
        console.error('Edge function error:', err);
        Alert.alert('오류 발생', '반려몽 생성에 실패했습니다. 사진을 다시 올려주세요.');
      }
    }
  };

  // Handle Interaction
  const handleInteract = (actionType) => {
    if (!selectedTargetChar || !myCharacter) return;
    
    const actionText = actionType === 'greet' ? '반갑게 인사했습니다! 👋' : 
                       actionType === 'gift' ? '예쁜 선물을 주었습니다! 🎁' : 
                       '다정하게 쓰다듬어 주었습니다! ✨';
    
    const expGain = actionType === 'gift' ? 15 : 5;
    
    setActivities(prev => [{
      id: `act-${Date.now()}`,
      text: `${myCharacter.name}님이 ${selectedTargetChar.name}님에게 ${actionText}`,
      time: '방금 전'
    }, ...prev]);

    setMyCharacter(prev => {
      let newExp = prev.exp + expGain;
      let newLevel = prev.level;
      if (newExp >= 100) {
        newExp -= 100;
        newLevel += 1;
        Alert.alert('레벨업! 🎉', `${prev.name}의 레벨이 ${newLevel}이 되었습니다!`);
      }
      return { ...prev, exp: newExp, level: newLevel };
    });

    setInteractionModalVisible(false);
  };

  const handleBuyFurniture = (item) => {
    if (points < item.cost) {
      Alert.alert('포인트 부족 ⚠️', `[${item.name}] 구매에는 ${item.cost}P가 필요합니다. 스몰톡 및 장보기로 포인트를 모아보세요!`);
      return;
    }

    Alert.alert(
      '가구 구매',
      `[${item.name}]을(를) ${item.cost} 포인트로 구매하여 배치하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '구매 & 배치',
          onPress: () => {
            if (onDeductPoints) onDeductPoints(item.cost);

            const newItem = {
              id: `placed-${Date.now()}`,
              catalogId: item.id,
              name: item.name,
              emoji: item.emoji,
              x: 42,
              y: 42,
              rotation: 0,
            };

            const updated = [...(placedFurniture || []), newItem];
            if (onUpdatePlacedFurniture) onUpdatePlacedFurniture(updated);

            setShopModalVisible(false);
            Alert.alert('가구 추가 완료 🎉', '방 중심에 가구가 배치되었습니다. 손가락으로 드래그하여 원하는 위치로 옮겨보세요!');
          },
        },
      ]
    );
  };

  const handleRotateFurniture = (item) => {
    const updated = (placedFurniture || []).map((f) =>
      f.id === item.id ? { ...f, rotation: (f.rotation + 45) % 360 } : f
    );
    if (onUpdatePlacedFurniture) onUpdatePlacedFurniture(updated);
  };

  const handleDeleteFurniture = (item) => {
    Alert.alert('가구 철거', `[${item.name}]을(를) 철거하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '철거하기',
        style: 'destructive',
        onPress: () => {
          const updated = (placedFurniture || []).filter((f) => f.id !== item.id);
          if (onUpdatePlacedFurniture) onUpdatePlacedFurniture(updated);
          setSelectedFurnitureId(null);
        },
      },
    ]);
  };

  const filteredCatalog = FURNITURE_CATALOG.filter((f) => f.category === selectedCategory);

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
          <ShoppingBag size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.openShopBtnText}>가구 상점</Text>
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
          <View style={styles.canvasHeader}>
            <View style={styles.canvasTitleGroup}>
              <Text style={styles.canvasTitle}>가족 아늑한 방</Text>
              <Text style={styles.canvasAreaSubtitle}>
                {myCharacter ? `${myCharacter.name} (${myCharacter.personality})` : '반려몽 생성 필요'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {!myCharacter && (
                <TouchableOpacity
                  style={[styles.logBtn, { backgroundColor: '#FFEBEB', marginRight: 6 }]}
                  onPress={() => setCreateModalVisible(true)}
                >
                  <Sparkles size={13} color="#FF7E82" style={{ marginRight: 4 }} />
                  <Text style={[styles.logBtnText, { color: '#FF7E82' }]}>반려몽 만들기</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.logBtn}
                onPress={() => setActivityLogVisible(true)}
              >
                <List size={14} color="#4A90E2" style={{ marginRight: 4 }} />
                <Text style={styles.logBtnText}>활동 로그</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Interactive Room Canvas */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setSelectedFurnitureId(null)}
            style={styles.canvasContainer}
          >
            {/* 2-Tone Cozy Room Wall & Floor Background */}
            <View style={styles.roomWallArea}>
              {/* Cozy Window */}
              <View style={styles.cozyWindow}>
                <View style={styles.curtainTop} />
                <View style={styles.windowGlass}>
                  <Text style={styles.windowSunMoon}>
                    {new Date().getHours() >= 6 && new Date().getHours() < 19 ? '☀️' : '🌙'}
                  </Text>
                  <View style={styles.windowFrameCrossH} />
                  <View style={styles.windowFrameCrossV} />
                </View>
              </View>

              {/* Cute wall photo frame */}
              <View style={styles.wallPhotoFrame}>
                <Heart size={10} color="#FF7E82" fill="#FF7E82" />
                <Text style={styles.wallPhotoText}>FamLink</Text>
              </View>
            </View>

            {/* Baseboard Moulding */}
            <View style={styles.roomMoulding} />

            {/* Cozy Wooden Floor Area */}
            <View style={styles.roomFloorArea}>
              <View style={[styles.floorPlankLine, { top: '33%' }]} />
              <View style={[styles.floorPlankLine, { top: '66%' }]} />
              <View style={styles.floorPlankLineVertical1} />
              <View style={styles.floorPlankLineVertical2} />
              <View style={styles.floorPlankLineVertical3} />
            </View>

            {/* Grounded Living Room Oval Rug on the Floor */}
            <View style={styles.floorRug}>
              <View style={styles.floorRugPattern} />
            </View>

            {/* Placed Furniture Items */}
            {(placedFurniture || []).map((item) => (
              <DraggableFurniture
                key={item.id}
                item={item}
                isSelected={selectedFurnitureId === item.id}
                canvasWidth={BASE_CANVAS_SIZE}
                onSelect={setSelectedFurnitureId}
                onMove={(id, x, y) => {
                  const updated = (placedFurniture || []).map(f => f.id === id ? { ...f, x, y } : f);
                  if (onUpdatePlacedFurniture) onUpdatePlacedFurniture(updated);
                }}
                onRotate={handleRotateFurniture}
                onDelete={handleDeleteFurniture}
                styles={styles}
              />
            ))}

            {/* Other Family Petmong Characters Standing on Floor */}
            {familyCharacters.map((char) => (
              <TouchableOpacity
                key={char.id}
                activeOpacity={0.8}
                style={[styles.subCharContainer, { left: `${char.x}%`, top: `${char.y}%` }]}
                onPress={() => handleSubCharPress(char)}
              >
                {subBubbleCharId === char.id && (
                  <View style={styles.subSpeechBubble}>
                    <Text style={styles.subSpeechBubbleText}>{subBubbleText}</Text>
                    <View style={styles.subSpeechBubbleArrow} />
                  </View>
                )}
                {char.image_url ? (
                  <View style={styles.subCharImageWrapper}>
                    {Platform.OS === 'web' ? (
                      <img
                        src={char.image_url}
                        alt={char.name}
                        style={{
                          width: 48,
                          height: 48,
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
                {/* Natural Ground Shadow */}
                <View style={styles.subCharShadow} />
                <View style={styles.subCharLabelBox}>
                  <Text style={styles.subCharLabelText}>{char.name} (Lv.{char.level || 1})</Text>
                </View>
              </TouchableOpacity>
            ))}

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
                    <Text style={styles.touchExpText}>+3 EXP</Text>
                  </Animated.View>
                )}

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handlePetTap}
                  style={styles.charTouchArea}
                >
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

                  {/* Character Mood Indicator */}
                  <View style={styles.charMoodBadge}>
                    <Text style={styles.charMoodEmoji}>
                      {myCharacter.personality === '잠꾸러기' ? '💤' : 
                       myCharacter.personality === '장난꾸러기' ? '😜' : 
                       myCharacter.personality === '애교쟁이' ? '🥰' : 
                       myCharacter.personality === '호기심많은' ? '🧐' : '😊'}
                    </Text>
                  </View>

                  {/* Cute Touch Hint */}
                  <View style={styles.touchHintBadge}>
                    <Sparkles size={9} color="#FFFFFF" style={{ marginRight: 2 }} />
                    <Text style={styles.touchHintText}>톡톡!</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.mainCharBadge}>
                  <View style={styles.nameRow}>
                    <Text style={styles.mainCharName}>{myCharacter.name}</Text>
                    <View style={styles.personalityTag}>
                      <Text style={styles.personalityTagText}>{myCharacter.personality || '다정한'}</Text>
                    </View>
                  </View>
                  <View style={styles.expBarBg}>
                    <View style={[styles.expBarFill, { width: `${Math.min(100, myCharacter.exp || 0)}%` }]} />
                  </View>
                  <View style={styles.levelRow}>
                    <Text style={styles.levelText}>Lv.{myCharacter.level || 1}</Text>
                    <Text style={styles.expNumberText}>{myCharacter.exp || 0}/100</Text>
                  </View>
                </View>
              </Animated.View>
            )}
          </TouchableOpacity>

          <Text style={styles.canvasGuideText}>
            💡 반려몽을 톡톡 터치하면 애정 대사와 함께 +3 EXP를 획득합니다!
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

            <TouchableOpacity
              style={styles.modalConfirmBtn}
              onPress={handlePickImageAndCreate}
              activeOpacity={0.8}
            >
              <Camera size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.modalConfirmBtnText}>내 사진 찍고/선택해서 생성하기</Text>
            </TouchableOpacity>

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

      {/* Activity Log Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={activityLogVisible}
        onRequestClose={() => setActivityLogVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleRow}>
                <List size={20} color="#4A90E2" style={{ marginRight: 6 }} />
                <Text style={styles.modalHeader}>가족 소통 활동 로그</Text>
              </View>
              <TouchableOpacity onPress={() => setActivityLogVisible(false)}>
                <X size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {activities.map((act) => (
                <View key={act.id} style={styles.logItemCard}>
                  <View style={styles.logDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logText}>{act.text}</Text>
                    <Text style={styles.logTime}>{act.time}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Furniture Shop Modal */}
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
                <ShoppingBag size={20} color="#FF7E82" style={{ marginRight: 6 }} />
                <Text style={styles.modalHeader}>가족 가구 상점</Text>
              </View>
              <TouchableOpacity onPress={() => setShopModalVisible(false)}>
                <X size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {/* Category Tabs */}
            <View style={styles.categoryTabRow}>
              {[
                { id: 'living', name: '거실 🛋️' },
                { id: 'deco', name: '데코 🪴' },
              ].map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryTab,
                    selectedCategory === cat.id && styles.categoryTabActive,
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Text
                    style={[
                      styles.categoryTabText,
                      selectedCategory === cat.id && styles.categoryTabTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Catalog Grid */}
            <ScrollView style={styles.catalogList}>
              {filteredCatalog.map((item) => (
                <View key={item.id} style={styles.catalogCard}>
                  <View style={styles.catalogEmojiBox}>
                    <Text style={styles.catalogEmoji}>{item.emoji}</Text>
                  </View>

                  <View style={styles.catalogInfo}>
                    <Text style={styles.catalogName}>{item.name}</Text>
                    <Text style={styles.catalogDesc}>{item.desc}</Text>
                    <Text style={styles.catalogPrice}>{item.cost} P</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.buyBtn}
                    onPress={() => handleBuyFurniture(item)}
                  >
                    <Text style={styles.buyBtnText}>구매</Text>
                  </TouchableOpacity>
                </View>
              ))}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  subHeaderBar: {
    height: 64,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextGroup: {
    flex: 1,
  },
  subHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  subHeaderSub: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  openShopBtn: {
    backgroundColor: '#FF7E82',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  openShopBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  pointsBarCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FFEAA7',
    marginBottom: 16,
  },
  pointsBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsBarLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D4AC0D',
  },
  pointsBarValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#B7950B',
  },
  canvasCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  canvasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  canvasTitleGroup: {
    flex: 1,
  },
  canvasTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  canvasAreaSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF7E82',
    marginTop: 2,
  },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  logBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4A90E2',
  },
  canvasContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F8ECE0',
    borderWidth: 1.5,
    borderColor: '#EFE0D0',
    shadowColor: '#C4A882',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  // 2-Tone Cozy Room Wall & Floor
  roomWallArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '56%',
    backgroundColor: '#F8ECE0',
    borderBottomWidth: 1,
    borderBottomColor: '#EADBCB',
  },
  cozyWindow: {
    position: 'absolute',
    top: 14,
    left: 18,
    width: 60,
    height: 68,
    backgroundColor: '#EAF6FF',
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: '#E8D7C3',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  curtainTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 10,
    backgroundColor: '#FFAAA6',
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    zIndex: 2,
  },
  windowGlass: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EBF6FF',
    position: 'relative',
  },
  windowSunMoon: {
    fontSize: 18,
  },
  windowFrameCrossH: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 1.5,
    backgroundColor: '#E8D7C3',
  },
  windowFrameCrossV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 1.5,
    backgroundColor: '#E8D7C3',
  },
  wallPhotoFrame: {
    position: 'absolute',
    top: 16,
    right: 18,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E8D7C3',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  wallPhotoText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FF7E82',
    marginTop: 2,
  },
  roomMoulding: {
    position: 'absolute',
    top: '56%',
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: '#EAD7C1',
    borderTopWidth: 1,
    borderTopColor: '#DEC5AC',
    borderBottomWidth: 1,
    borderBottomColor: '#DEC5AC',
    zIndex: 1,
  },
  roomFloorArea: {
    position: 'absolute',
    top: '56%',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F8EEDB',
  },
  floorPlankLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(212, 185, 155, 0.45)',
  },
  floorPlankLineVertical1: {
    position: 'absolute',
    top: 0,
    height: '33%',
    left: '28%',
    width: 1,
    backgroundColor: 'rgba(212, 185, 155, 0.35)',
  },
  floorPlankLineVertical2: {
    position: 'absolute',
    top: '33%',
    height: '33%',
    left: '68%',
    width: 1,
    backgroundColor: 'rgba(212, 185, 155, 0.35)',
  },
  floorPlankLineVertical3: {
    position: 'absolute',
    top: '66%',
    height: '34%',
    left: '42%',
    width: 1,
    backgroundColor: 'rgba(212, 185, 155, 0.35)',
  },
  floorRug: {
    position: 'absolute',
    top: '60%',
    left: '50%',
    marginLeft: -90,
    width: 180,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFE4E9',
    borderWidth: 2,
    borderColor: '#FFCCD6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    shadowColor: '#BCA188',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  floorRugPattern: {
    width: 158,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 126, 130, 0.35)',
    borderStyle: 'dashed',
  },
  mainCharContainer: {
    position: 'absolute',
    left: '50%',
    marginLeft: -65,
    width: 130,
    top: '40%',
    alignItems: 'center',
    zIndex: 10,
  },
  charGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 230, 235, 0.75)',
    top: -8,
    alignSelf: 'center',
    zIndex: 0,
  },
  charRugPedestal: {
    position: 'absolute',
    bottom: 30,
    width: 120,
    height: 40,
    borderRadius: 60,
    backgroundColor: '#FFE4E8',
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: '#FFCCD4',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    shadowColor: '#FF7E82',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  charRugInner: {
    width: 104,
    height: 28,
    borderRadius: 52,
    borderWidth: 1,
    borderColor: 'rgba(255, 126, 130, 0.3)',
    borderStyle: 'dashed',
  },
  charMoodBadge: {
    position: 'absolute',
    top: 0,
    left: 2,
    backgroundColor: '#FFFFFF',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFEAA7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 15,
  },
  charMoodEmoji: {
    fontSize: 13,
  },
  mainCharEmojiBubble: {
    width: 105,
    height: 105,
    borderRadius: 52.5,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3.5,
    borderColor: '#FFFFFF',
    shadowColor: '#FF7E82',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  charTouchArea: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mainCharEmoji: {
    fontSize: 66,
  },
  mainCharImageWrapper: {
    width: 100,
    height: 100,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainCharImageContainer: {
    width: 100,
    height: 100,
    backgroundColor: 'transparent',
  },
  mainCharImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    ...(Platform.OS === 'web' ? { mixBlendMode: 'multiply' } : {}),
  },
  charGroundShadow: {
    width: 70,
    height: 10,
    borderRadius: 25,
    backgroundColor: 'rgba(120, 80, 50, 0.16)',
    alignSelf: 'center',
    marginTop: -2,
  },
  charShadow: {
    width: 76,
    height: 10,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 38,
    position: 'absolute',
    bottom: 30,
  },
  mainCharBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 225, 0.5)',
    shadowColor: '#C4A882',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  personalityTag: {
    backgroundColor: '#FFF2F3',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  personalityTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FF7E82',
  },
  mainCharName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  expBarBg: {
    width: 64,
    height: 5,
    backgroundColor: '#F1F2F4',
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 3,
  },
  expBarFill: {
    height: '100%',
    backgroundColor: '#FF7E82',
  },
  levelText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8E8E93',
  },
  subCharContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  subCharImageWrapper: {
    width: 48,
    height: 48,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subCharImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    ...(Platform.OS === 'web' ? { mixBlendMode: 'multiply' } : {}),
  },
  subCharEmoji: {
    fontSize: 42,
  },
  subCharShadow: {
    width: 38,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(90, 60, 40, 0.15)',
    alignSelf: 'center',
    marginTop: -2,
  },
  subCharLabelBox: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  subCharLabelText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  canvasGuideText: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 10,
    lineHeight: 15,
  },
  inventoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  inventoryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 10,
  },
  emptyInventoryText: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  inventoryList: {
    flexDirection: 'row',
  },
  inventoryItemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  inventoryItemChipActive: {
    backgroundColor: '#FFEBEB',
    borderColor: '#FF7E82',
  },
  inventoryItemEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  inventoryItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  furnitureWrapper: {
    position: 'absolute',
    padding: 6,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  furnitureWrapperSelected: {
    borderWidth: 2,
    borderColor: '#FF7E82',
    backgroundColor: 'rgba(255,126,130,0.2)',
  },
  furnitureEmoji: {
    fontSize: 32,
  },
  furnitureControlOverlay: {
    position: 'absolute',
    top: -24,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 12,
    padding: 3,
  },
  controlBtn: {
    padding: 4,
    marginHorizontal: 2,
  },
  controlBtnDelete: {
    backgroundColor: '#E74C3C',
    borderRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalView: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  modalSubDesc: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 16,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 14,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F1F2F4',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: '#1C1C1E',
  },
  traitSelectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#F1F2F4',
    marginRight: 6,
  },
  traitSelectBtnActive: {
    backgroundColor: '#FF7E82',
  },
  traitSelectText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  traitSelectTextActive: {
    color: '#FFFFFF',
  },
  modalConfirmBtn: {
    backgroundColor: '#FF7E82',
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  modalConfirmBtnText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  generatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    padding: 20,
    zIndex: 100,
  },
  generatingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 20,
  },
  interactModalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    width: '85%',
    alignItems: 'center',
  },
  interactAvatarBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#EBEBEB',
  },
  interactTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  interactDesc: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 16,
    textAlign: 'center',
  },
  interactBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 16,
  },
  interactBtnItem: {
    alignItems: 'center',
  },
  interactIconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  interactBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  closeInteractBtn: {
    backgroundColor: '#F1F2F4',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
  },
  closeInteractText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
  },
  logItemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A90E2',
    marginTop: 4,
    marginRight: 10,
  },
  logText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1C1E',
    lineHeight: 16,
  },
  logTime: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 2,
  },
  categoryTabRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F2F4',
    borderRadius: 10,
    padding: 3,
    marginBottom: 10,
  },
  categoryTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
  },
  categoryTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
  },
  categoryTabTextActive: {
    color: '#1C1C1E',
    fontWeight: '800',
  },
  catalogList: {
    maxHeight: 380,
  },
  catalogCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  catalogEmojiBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  catalogEmoji: {
    fontSize: 26,
  },
  catalogInfo: {
    flex: 1,
  },
  catalogName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  catalogDesc: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  catalogPrice: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FF7E82',
    marginTop: 4,
  },
  buyBtn: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  buyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  // Touch & Dialogue Interaction Styles (Sumone Style)
  charTouchArea: {
    alignItems: 'center',
    position: 'relative',
  },
  speechBubbleContainer: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FF7E82',
    maxWidth: 220,
    minWidth: 140,
    alignItems: 'center',
    shadowColor: '#FF7E82',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 30,
  },
  speechBubbleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
    lineHeight: 17,
  },
  speechBubbleArrow: {
    position: 'absolute',
    bottom: -6,
    width: 10,
    height: 10,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#FF7E82',
    transform: [{ rotate: '45deg' }],
  },
  floatingHeartContainer: {
    position: 'absolute',
    top: -24,
    alignItems: 'center',
    zIndex: 40,
  },
  touchExpText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FF4D6D',
    marginTop: 2,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFEBEB',
  },
  touchHintBadge: {
    position: 'absolute',
    top: 2,
    right: -6,
    backgroundColor: '#FF4D6D',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  touchHintText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: 64,
    marginTop: 2,
  },
  expNumberText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#AEAEB2',
  },
  subSpeechBubble: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4A90E2',
    maxWidth: 160,
    minWidth: 100,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 25,
  },
  subSpeechBubbleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
    lineHeight: 14,
  },
  subSpeechBubbleArrow: {
    position: 'absolute',
    bottom: -5,
    width: 8,
    height: 8,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#4A90E2',
    transform: [{ rotate: '45deg' }],
  },
  levelUpOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  levelUpCard: {
    width: '100%',
    maxWidth: 320,
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
  levelUpEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  levelUpTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FF7E82',
    marginBottom: 6,
  },
  levelUpNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  levelUpDesc: {
    fontSize: 13,
    color: '#636E72',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  levelUpBtn: {
    backgroundColor: '#FF7E82',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  levelUpBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
