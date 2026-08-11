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
const BASE_CANVAS_SIZE = SCREEN_WIDTH - 32;

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
}) {
  const insets = useSafeAreaInsets();
  
  // UI States
  const [shopModalVisible, setShopModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('living');
  const [selectedFurnitureId, setSelectedFurnitureId] = useState(null);
  
  // Petmong States (Linked with Supabase)
  const [myCharacter, setMyCharacter] = useState(null);
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
        x: 15 + (idx * 22) % 60,
        y: 25 + (idx * 18) % 40
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
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 1500, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, [floatAnim]);

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
          body: { imageBase64: result.assets[0].base64 }
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* FamLink Unified Header & Points Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerTitle}>우리 집 반려몽 🐾</Text>
              <Text style={styles.headerSub}>AI 반려몽과 함께 소통하고 방을 꾸며보세요!</Text>
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

          {/* Points Status Bar */}
          <View style={styles.pointsBar}>
            <View style={styles.pointsBarLeft}>
              <Trophy size={18} color="#F1C40F" style={{ marginRight: 6 }} />
              <Text style={styles.pointsBarLabel}>사용 가능한 포인트</Text>
            </View>
            <Text style={styles.pointsBarValue}>{points} P</Text>
          </View>
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

            <TouchableOpacity
              style={styles.logBtn}
              onPress={() => setActivityLogVisible(true)}
            >
              <List size={14} color="#4A90E2" style={{ marginRight: 4 }} />
              <Text style={styles.logBtnText}>활동 로그</Text>
            </TouchableOpacity>
          </View>

          {/* Interactive Room Canvas */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setSelectedFurnitureId(null)}
            style={styles.canvasContainer}
          >
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

            {/* Other Family Petmong Characters */}
            {familyCharacters.map((char) => (
              <TouchableOpacity
                key={char.id}
                style={[styles.subCharContainer, { left: `${char.x}%`, top: `${char.y}%` }]}
                onPress={() => {
                  setSelectedTargetChar(char);
                  setInteractionModalVisible(true);
                }}
              >
                {char.image_url ? (
                  <Image source={{ uri: char.image_url }} style={styles.subCharImage} />
                ) : (
                  <Text style={styles.subCharEmoji}>{char.emoji || '🐱'}</Text>
                )}
                <View style={styles.subCharLabelBox}>
                  <Text style={styles.subCharLabelText}>{char.name}</Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* My Main Petmong Character (Floating Animated) */}
            {myCharacter && (
              <Animated.View
                style={[
                  styles.mainCharContainer,
                  { transform: [{ translateY: floatAnim }] },
                ]}
              >
                <View style={styles.charShadow} />
                {myCharacter.image_url ? (
                  <View style={styles.mainCharImageContainer}>
                    <Image source={{ uri: myCharacter.image_url }} style={styles.mainCharImage} />
                  </View>
                ) : (
                  <Text style={styles.mainCharEmoji}>{myCharacter.emoji || '🐶'}</Text>
                )}

                <View style={styles.mainCharBadge}>
                  <Text style={styles.mainCharName}>{myCharacter.name}</Text>
                  <View style={styles.expBarBg}>
                    <View style={[styles.expBarFill, { width: `${myCharacter.exp || 0}%` }]} />
                  </View>
                  <Text style={styles.levelText}>Lv.{myCharacter.level || 1}</Text>
                </View>
              </Animated.View>
            )}
          </TouchableOpacity>

          <Text style={styles.canvasGuideText}>
            💡 다른 가족의 반려몽을 터치하면 인사나 선물을 건넬 수 있습니다!
          </Text>
        </View>
      </ScrollView>

      {/* AI Character Creation Modal (FamLink Unified Style) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={createModalVisible}
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleRow}>
                <Sparkles size={20} color="#FF7E82" style={{ marginRight: 6 }} />
                <Text style={styles.modalHeader}>나만의 AI 반려몽 태어나기 🐣</Text>
              </View>
            </View>

            <Text style={styles.modalSubDesc}>
              얼굴 사진을 올리면 AI가 나를 닮은 귀여운 맞춤 캐릭터 반려몽을 만들어 드려요!
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.modalLabel}>반려몽 이름</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="예: 몽몽이"
                value={newName}
                onChangeText={setNewName}
                placeholderTextColor="#AEAEB2"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.modalLabel}>성격 선택</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
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
            </View>

            <TouchableOpacity
              style={styles.createSubmitBtn}
              onPress={handlePickImageAndCreate}
              activeOpacity={0.8}
            >
              <Camera size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.createSubmitBtnText}>내 사진 찍고/선택해서 생성하기</Text>
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
        </View>
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
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1C1C1E',
  },
  headerSub: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  openShopBtn: {
    backgroundColor: '#FF7E82',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#FF7E82',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  openShopBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  pointsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FFEAA7',
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
    width: BASE_CANVAS_SIZE,
    height: BASE_CANVAS_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  mainCharContainer: {
    position: 'absolute',
    left: '35%',
    top: '32%',
    alignItems: 'center',
  },
  mainCharEmoji: {
    fontSize: 70,
  },
  mainCharImageContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#FF7E82',
    backgroundColor: '#FFFFFF',
  },
  mainCharImage: {
    width: '100%',
    height: '100%',
  },
  charShadow: {
    width: 70,
    height: 10,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 35,
    position: 'absolute',
    bottom: 30,
  },
  mainCharBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
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
  subCharImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#4A90E2',
    backgroundColor: '#FFFFFF',
  },
  subCharEmoji: {
    fontSize: 42,
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
  createSubmitBtn: {
    backgroundColor: '#FF7E82',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  createSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
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
});
