import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, ShoppingBag, Plus, Trash2, RotateCw, Camera, X, Trophy, Sparkles, Check } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_SIZE = SCREEN_WIDTH - 32; // Square canvas size

// Furniture Catalog items
const FURNITURE_CATALOG = [
  { id: 'f1', category: 'living', name: '가죽 패브릭 소파', emoji: '🛋️', cost: 200, desc: '거실의 중심이 되는 안락한 3인용 소파' },
  { id: 'f2', category: 'living', name: '85인치 대형 스마트 TV', emoji: '📺', cost: 300, desc: '온 가족이 함께 영화를 감상하는 스마트 TV' },
  { id: 'f3', category: 'living', name: '거실 공기청정기', emoji: '🌀', cost: 150, desc: '깨끗한 공기를 책임지는 살균 청정기' },
  { id: 'f4', category: 'kitchen', name: '6인용 대리석 식탁', emoji: '🍽️', cost: 220, desc: '다 함께 식사를 즐길 수 있는 식탁' },
  { id: 'f5', category: 'kitchen', name: '비스포크 대형 냉장고', emoji: '🧊', cost: 350, desc: '맛있는 음식으로 가득 채울 대형 냉장고' },
  { id: 'f6', category: 'bedroom', name: '호텔식 퀸사이즈 침대', emoji: '🛏️', cost: 250, desc: '꿀잠을 보장하는 안락한 침대' },
  { id: 'f7', category: 'bedroom', name: '원목 스탠드 무드등', emoji: '💡', cost: 80, desc: '은은한 분위기를 만들어주는 무드 조명' },
  { id: 'f8', category: 'deco', name: '대형 아레카야자 화분', emoji: '🪴', cost: 90, desc: '집안 분위기를 화사하게 만들어주는 식물' },
  { id: 'f9', category: 'deco', name: '가족 귀요미 반려견 집', emoji: '🏠', cost: 120, desc: '귀여운 반려동물을 위한 아늑한 보금자리' },
  { id: 'f10', category: 'deco', name: '플레이스테이션 5 콘솔', emoji: '🎮', cost: 280, desc: '가족게임 대전을 위한 최신 게임기' },
];

// Default 2D floor plan blueprint asset
const LOCAL_FLOOR_PLAN_ASSET = require('../assets/floor_plan.jpg');

export default function InteriorScreen({
  points,
  onDeductPoints,
  placedFurniture,
  onUpdatePlacedFurniture,
  floorPlanUrl,
  onUpdateFloorPlan,
}) {
  const insets = useSafeAreaInsets();
  const [shopModalVisible, setShopModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('living'); // living, kitchen, bedroom, deco
  const [selectedFurnitureId, setSelectedFurnitureId] = useState(null);

  // Pick Custom Floor Plan Image from Album
  const pickFloorPlanImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진첩 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newUri = result.assets[0].uri;
      if (onUpdateFloorPlan) {
        onUpdateFloorPlan(newUri);
      }
    }
  };

  // Buy Furniture Item
  const handleBuyFurniture = (item) => {
    if (points < item.cost) {
      Alert.alert('포인트 부족 ⚠️', `[${item.name}] 구매에는 ${item.cost}P가 필요합니다. 스몰톡 및 장보기로 포인트를 모아보세요!`);
      return;
    }

    Alert.alert(
      '가구 구매',
      `[${item.name}]을(를) ${item.cost} 포인트로 구매하여 평면도에 배치하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '구매 & 배치',
          onPress: () => {
            if (onDeductPoints) onDeductPoints(item.cost);

            // Add new furniture at center of canvas
            const newItem = {
              id: `placed-${Date.now()}`,
              catalogId: item.id,
              name: item.name,
              emoji: item.emoji,
              x: 42, // percent
              y: 42, // percent
              rotation: 0,
            };

            const updated = [...(placedFurniture || []), newItem];
            if (onUpdatePlacedFurniture) onUpdatePlacedFurniture(updated);

            setShopModalVisible(false);
            Alert.alert('가구 추가 완료 🎉', '평면도 중심에 가구가 배치되었습니다. 손가락으로 드래그하여 원하는 위치로 옮겨보세요!');
          },
        },
      ]
    );
  };

  // Rotate Placed Furniture
  const handleRotateFurniture = (item) => {
    const updated = (placedFurniture || []).map((f) =>
      f.id === item.id ? { ...f, rotation: (f.rotation + 45) % 360 } : f
    );
    if (onUpdatePlacedFurniture) onUpdatePlacedFurniture(updated);
  };

  // Delete Placed Furniture
  const handleDeleteFurniture = (item) => {
    Alert.alert('가구 철거', `[${item.name}]을(를) 평면도에서 철거하시겠습니까?`, [
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

  // PanResponder Draggable Item Component
  const DraggableFurniture = ({ item }) => {
    const isSelected = selectedFurnitureId === item.id;
    const [pos, setPos] = useState({ x: item.x, y: item.y });

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          setSelectedFurnitureId(item.id);
        },
        onPanResponderMove: (evt, gestureState) => {
          // Convert dx, dy to percentage of CANVAS_SIZE
          const deltaX = (gestureState.dx / CANVAS_SIZE) * 100;
          const deltaY = (gestureState.dy / CANVAS_SIZE) * 100;

          const newX = Math.max(0, Math.min(84, item.x + deltaX));
          const newY = Math.max(0, Math.min(84, item.y + deltaY));

          setPos({ x: newX, y: newY });
        },
        onPanResponderRelease: (evt, gestureState) => {
          const deltaX = (gestureState.dx / CANVAS_SIZE) * 100;
          const deltaY = (gestureState.dy / CANVAS_SIZE) * 100;

          const finalX = Math.max(0, Math.min(84, item.x + deltaX));
          const finalY = Math.max(0, Math.min(84, item.y + deltaY));

          const updated = (placedFurniture || []).map((f) =>
            f.id === item.id ? { ...f, x: finalX, y: finalY } : f
          );
          if (onUpdatePlacedFurniture) onUpdatePlacedFurniture(updated);
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

        {/* Selected Controls Overlay */}
        {isSelected && (
          <View style={styles.furnitureControlOverlay}>
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={() => handleRotateFurniture(item)}
            >
              <RotateCw size={12} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlBtn, styles.controlBtnDelete]}
              onPress={() => handleDeleteFurniture(item)}
            >
              <Trash2 size={12} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const filteredCatalog = FURNITURE_CATALOG.filter((f) => f.category === selectedCategory);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header & Points Banner */}
        <View style={styles.headerCard}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerTitle}>가족 드림하우스 🏠</Text>
              <Text style={styles.headerSub}>포인트로 가구를 사고 평면도를 꾸며보세요!</Text>
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

          {/* Points Status */}
          <View style={styles.pointsBar}>
            <View style={styles.pointsBarLeft}>
              <Trophy size={18} color="#F1C40F" style={{ marginRight: 6 }} />
              <Text style={styles.pointsBarLabel}>사용 가능한 포인트</Text>
            </View>
            <Text style={styles.pointsBarValue}>{points} P</Text>
          </View>
        </View>

        {/* Floor Plan & Furniture Canvas Box */}
        <View style={styles.canvasCard}>
          <View style={styles.canvasHeader}>
            <Text style={styles.canvasTitle}>우리 집 평면도 인테리어</Text>
            <TouchableOpacity style={styles.changePlanBtn} onPress={pickFloorPlanImage}>
              <Camera size={14} color="#FF7E82" style={{ marginRight: 4 }} />
              <Text style={styles.changePlanBtnText}>도면 변경</Text>
            </TouchableOpacity>
          </View>

          {/* Interactive Canvas */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setSelectedFurnitureId(null)}
            style={styles.canvasContainer}
          >
            <Image
              source={floorPlanUrl ? { uri: floorPlanUrl } : LOCAL_FLOOR_PLAN_ASSET}
              style={styles.floorPlanImage}
              resizeMode="contain"
            />

            {/* Placed Furniture Items Overlay */}
            {(placedFurniture || []).map((item) => (
              <DraggableFurniture key={item.id} item={item} />
            ))}
          </TouchableOpacity>

          <Text style={styles.canvasGuideText}>
            💡 가구를 손가락으로 드래그하여 배치하고, 가구를 터치하면 회전/철거 컨트롤이 나타납니다.
          </Text>
        </View>

        {/* Inventory Summary */}
        <View style={styles.inventoryCard}>
          <Text style={styles.inventoryTitle}>배치된 가구 목록 ({(placedFurniture || []).length}개)</Text>
          {(placedFurniture || []).length === 0 ? (
            <Text style={styles.emptyInventoryText}>
              아직 배치된 가구가 없습니다. 상단 [가구 상점]에서 이쁜 가구를 구매해 보세요!
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.inventoryList}>
              {(placedFurniture || []).map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[
                    styles.inventoryItemChip,
                    selectedFurnitureId === f.id && styles.inventoryItemChipActive,
                  ]}
                  onPress={() => setSelectedFurnitureId(f.id)}
                >
                  <Text style={styles.inventoryItemEmoji}>{f.emoji}</Text>
                  <Text style={styles.inventoryItemName}>{f.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>

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
                { id: 'kitchen', name: '주방 🍽️' },
                { id: 'bedroom', name: '침실 🛏️' },
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
  canvasTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  changePlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  changePlanBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF7E82',
  },
  canvasContainer: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#EAEAEA',
  },
  floorPlanImage: {
    width: '100%',
    height: '100%',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalView: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
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
  categoryTabRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F2F4',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  categoryTab: {
    flex: 1,
    paddingVertical: 8,
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
    fontSize: 12,
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
