import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Home,
  ShoppingBag,
  Plus,
  Trash2,
  RotateCw,
  Camera,
  X,
  Trophy,
  Sparkles,
  Check,
  Edit3,
  Grid,
  Layers,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Wand2,
  Maximize2,
  Minimize2,
  Sliders,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_SIZE = SCREEN_WIDTH - 32; // Square canvas size in dp

// Furniture Catalog items for 3D/2D Decoration
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
  const [magicplanModalVisible, setMagicplanModalVisible] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState('living');
  const [selectedFurnitureId, setSelectedFurnitureId] = useState(null);

  // MAGICPLAN ARCHITECTURAL FLOOR PLAN ENGINE STATES
  const [magicRooms, setMagicRooms] = useState([
    {
      id: 'm1',
      name: '거실',
      emoji: '🛋️',
      x: 5,
      y: 5,
      wMeters: 5.2,
      hMeters: 4.5,
      color: '#FFF8F0',
      openings: [{ id: 'op1', type: 'door', emoji: '🚪', wall: 'bottom', offset: 50 }],
    },
    {
      id: 'm2',
      name: '안방',
      emoji: '🛏️',
      x: 58,
      y: 5,
      wMeters: 3.8,
      hMeters: 4.5,
      color: '#F0F7FF',
      openings: [{ id: 'op2', type: 'window', emoji: '🪟', wall: 'top', offset: 40 }],
    },
    {
      id: 'm3',
      name: '주방',
      emoji: '🍳',
      x: 5,
      y: 52,
      wMeters: 4.2,
      hMeters: 4.2,
      color: '#F0FAF7',
      openings: [],
    },
    {
      id: 'm4',
      name: '작은방',
      emoji: '👦',
      x: 50,
      y: 52,
      wMeters: 4.5,
      hMeters: 4.2,
      color: '#FAF0FA',
      openings: [{ id: 'op3', type: 'window', emoji: '🪟', wall: 'right', offset: 50 }],
    },
  ]);

  const [selectedRoomId, setSelectedRoomId] = useState('m1');

  // Dimension Edit Modal States
  const [dimModalVisible, setDimModalVisible] = useState(false);
  const [editingWallSide, setEditingWallSide] = useState('width');
  const [dimInputValue, setDimInputValue] = useState('');

  // Total House Area Calculations
  const calculateTotalArea = () => {
    const totalSqMeters = magicRooms.reduce((acc, r) => acc + r.wMeters * r.hMeters, 0);
    const totalPyeong = totalSqMeters / 3.30578;
    return { sqMeters: totalSqMeters.toFixed(1), pyeong: totalPyeong.toFixed(1) };
  };

  // Pick Image Floor Plan Backup
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
      if (onUpdateFloorPlan) onUpdateFloorPlan(newUri);
    }
  };

  // Add Magicplan Room Preset
  const handleAddMagicRoom = (type) => {
    const PRESETS = {
      living: { name: '거실', emoji: '🛋️', wMeters: 5.4, hMeters: 4.6, color: '#FFF8F0' },
      bedroom: { name: '침실', emoji: '🛏️', wMeters: 3.8, hMeters: 3.6, color: '#F0F7FF' },
      kitchen: { name: '주방', emoji: '🍳', wMeters: 4.0, hMeters: 3.6, color: '#F0FAF7' },
      bathroom: { name: '욕실', emoji: '🛁', wMeters: 2.4, hMeters: 2.2, color: '#F5F5F7' },
      corridor: { name: '현관/복도', emoji: '🚪', wMeters: 2.0, hMeters: 3.5, color: '#FAF7F0' },
      balcony: { name: '발코니', emoji: '🪴', wMeters: 4.5, hMeters: 1.8, color: '#F0FAF9' },
    };

    const preset = PRESETS[type] || PRESETS.bedroom;
    const newRoom = {
      id: `magic-room-${Date.now()}`,
      name: preset.name,
      emoji: preset.emoji,
      x: 20,
      y: 20,
      wMeters: preset.wMeters,
      hMeters: preset.hMeters,
      color: preset.color,
      openings: [],
    };

    setMagicRooms([...magicRooms, newRoom]);
    setSelectedRoomId(newRoom.id);
  };

  // Delete Selected Magicplan Room
  const handleDeleteMagicRoom = (roomId) => {
    Alert.alert('방 삭제', '선택한 방을 Magicplan 도면에서 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          setMagicRooms(magicRooms.filter((r) => r.id !== roomId));
          setSelectedRoomId(null);
        },
      },
    ]);
  };

  // Add Door or Window to Selected Magicplan Room Wall
  const handleAddOpeningToRoom = (type) => {
    if (!selectedRoomId) {
      Alert.alert('선택 필요', '문이나 창문을 추가할 방을 먼저 선택해 주세요.');
      return;
    }

    const targetRoom = magicRooms.find((r) => r.id === selectedRoomId);
    if (!targetRoom) return;

    const newOpening = {
      id: `op-${Date.now()}`,
      type: type,
      emoji: type === 'door' ? '🚪' : '🪟',
      wall: 'bottom',
      offset: 50,
    };

    setMagicRooms((prev) =>
      prev.map((r) =>
        r.id === selectedRoomId ? { ...r, openings: [...r.openings, newOpening] } : r
      )
    );
    Alert.alert('배치 완료 🎉', `선택한 ${targetRoom.name} 방에 ${type === 'door' ? '문🚪' : '창문🪟'}이 성공적으로 연결되었습니다.`);
  };

  // Move Room by Directional Keys
  const handleMoveRoom = (dxPercent, dyPercent) => {
    if (!selectedRoomId) return;

    setMagicRooms((prev) =>
      prev.map((r) => {
        if (r.id === selectedRoomId) {
          let newX = Math.max(0, Math.min(100 - r.wMeters * 10, r.x + dxPercent));
          let newY = Math.max(0, Math.min(100 - r.hMeters * 10, r.y + dyPercent));

          // Magicplan Magnetic Wall Snap to other rooms
          prev.forEach((other) => {
            if (other.id !== r.id) {
              const otherW = other.wMeters * 10;
              const otherH = other.hMeters * 10;
              const rW = r.wMeters * 10;
              const rH = r.hMeters * 10;

              if (Math.abs(newX - (other.x + otherW)) < 4) newX = other.x + otherW;
              if (Math.abs((newX + rW) - other.x) < 4) newX = other.x - rW;
              if (Math.abs(newY - (other.y + otherH)) < 4) newY = other.y + otherH;
              if (Math.abs((newY + rH) - other.y) < 4) newY = other.y - rH;
            }
          });

          return { ...r, x: newX, y: newY };
        }
        return r;
      })
    );
  };

  // Open Dimension Input Modal for Selected Room
  const handleOpenDimModal = (side, targetRoomId = null) => {
    const roomId = targetRoomId || selectedRoomId;
    if (!roomId) return;
    const targetRoom = magicRooms.find((r) => r.id === roomId);
    if (!targetRoom) return;

    setSelectedRoomId(roomId);
    setEditingWallSide(side);
    setDimInputValue(side === 'width' ? String(targetRoom.wMeters) : String(targetRoom.hMeters));
    setDimModalVisible(true);
  };

  // Apply Dimension Change
  const handleApplyDimensionChange = () => {
    const num = parseFloat(dimInputValue);
    if (isNaN(num) || num <= 0.5 || num > 20) {
      Alert.alert('알림', '올바른 치수(0.5m ~ 20.0m)를 입력해주세요.');
      return;
    }

    setMagicRooms((prev) =>
      prev.map((r) =>
        r.id === selectedRoomId
          ? editingWallSide === 'width'
            ? { ...r, wMeters: num }
            : { ...r, hMeters: num }
          : r
      )
    );
    setDimModalVisible(false);
    Alert.alert('치수 변경 완료 📐', `벽면 길이가 ${num.toFixed(1)}m 로 정밀하게 조정되었습니다.`);
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

  // Magicplan Draggable Room Block Component inside Editor
  const MagicRoomComponent = ({ room }) => {
    const isSelected = selectedRoomId === room.id;
    const [pos, setPos] = useState({ x: room.x, y: room.y });
    const startPos = useRef({ x: room.x, y: room.y });

    useEffect(() => {
      setPos({ x: room.x, y: room.y });
    }, [room.x, room.y]);

    const widthPercent = room.wMeters * 10;
    const heightPercent = room.hMeters * 10;
    const roomSqMeters = (room.wMeters * room.hMeters).toFixed(1);

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          setSelectedRoomId(room.id);
          startPos.current = { x: room.x, y: room.y };
        },
        onPanResponderMove: (evt, gestureState) => {
          const deltaX = (gestureState.dx / CANVAS_SIZE) * 100;
          const deltaY = (gestureState.dy / CANVAS_SIZE) * 100;

          const newX = Math.max(0, Math.min(100 - widthPercent, startPos.current.x + deltaX));
          const newY = Math.max(0, Math.min(100 - heightPercent, startPos.current.y + deltaY));

          setPos({ x: newX, y: newY });
        },
        onPanResponderRelease: (evt, gestureState) => {
          const deltaX = (gestureState.dx / CANVAS_SIZE) * 100;
          const deltaY = (gestureState.dy / CANVAS_SIZE) * 100;

          // If tap without dragging, treat as selection
          if (Math.abs(gestureState.dx) < 3 && Math.abs(gestureState.dy) < 3) {
            setSelectedRoomId(room.id);
            return;
          }

          let finalX = Math.max(0, Math.min(100 - widthPercent, startPos.current.x + deltaX));
          let finalY = Math.max(0, Math.min(100 - heightPercent, startPos.current.y + deltaY));

          // Snap alignment to other rooms
          magicRooms.forEach((other) => {
            if (other.id !== room.id) {
              const otherW = other.wMeters * 10;
              const otherH = other.hMeters * 10;

              if (Math.abs(finalX - (other.x + otherW)) < 4) finalX = other.x + otherW;
              if (Math.abs((finalX + widthPercent) - other.x) < 4) finalX = other.x - widthPercent;
              if (Math.abs(finalY - (other.y + otherH)) < 4) finalY = other.y + otherH;
              if (Math.abs((finalY + heightPercent) - other.y) < 4) finalY = other.y - heightPercent;
            }
          });

          setMagicRooms((prev) =>
            prev.map((r) => (r.id === room.id ? { ...r, x: finalX, y: finalY } : r))
          );
        },
      })
    ).current;

    return (
      <View
        {...panResponder.panHandlers}
        style={[
          styles.magicRoomBox,
          {
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            width: `${widthPercent}%`,
            height: `${heightPercent}%`,
            backgroundColor: room.color,
          },
          isSelected && styles.magicRoomBoxSelected,
        ]}
      >
        {/* Magicplan Top Wall Meter Tag (Interactive Button) */}
        <TouchableOpacity
          style={styles.magicWallTagTop}
          activeOpacity={0.7}
          onPress={() => handleOpenDimModal('width', room.id)}
        >
          <Text style={styles.magicWallTagText}>📏 {room.wMeters.toFixed(1)}m</Text>
        </TouchableOpacity>

        {/* Magicplan Left Wall Meter Tag (Interactive Button) */}
        <TouchableOpacity
          style={styles.magicWallTagLeft}
          activeOpacity={0.7}
          onPress={() => handleOpenDimModal('height', room.id)}
        >
          <Text style={styles.magicWallTagText}>📏 {room.hMeters.toFixed(1)}m</Text>
        </TouchableOpacity>

        {/* Room Title & Square Meters Area */}
        <Text style={styles.magicRoomTitle}>{room.emoji} {room.name}</Text>
        <Text style={styles.magicRoomAreaText}>{roomSqMeters} m²</Text>

        {/* Openings (Doors / Windows) attached to room */}
        {room.openings.map((op) => (
          <Text
            key={op.id}
            style={[
              styles.magicOpeningSymbol,
              op.wall === 'bottom' && { bottom: -10, left: `${op.offset}%` },
              op.wall === 'top' && { top: -10, left: `${op.offset}%` },
              op.wall === 'right' && { right: -10, top: `${op.offset}%` },
              op.wall === 'left' && { left: -10, top: `${op.offset}%` },
            ]}
          >
            {op.emoji}
          </Text>
        ))}
      </View>
    );
  };

  // Draggable Item Component (For Placed Furniture on Main Canvas)
  const DraggableFurniture = ({ item }) => {
    const isSelected = selectedFurnitureId === item.id;
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
          setSelectedFurnitureId(item.id);
          startPos.current = { x: item.x, y: item.y };
        },
        onPanResponderMove: (evt, gestureState) => {
          const deltaX = (gestureState.dx / CANVAS_SIZE) * 100;
          const deltaY = (gestureState.dy / CANVAS_SIZE) * 100;

          const newX = Math.max(0, Math.min(84, startPos.current.x + deltaX));
          const newY = Math.max(0, Math.min(84, startPos.current.y + deltaY));

          setPos({ x: newX, y: newY });
        },
        onPanResponderRelease: (evt, gestureState) => {
          const deltaX = (gestureState.dx / CANVAS_SIZE) * 100;
          const deltaY = (gestureState.dy / CANVAS_SIZE) * 100;

          const finalX = Math.max(0, Math.min(84, startPos.current.x + deltaX));
          const finalY = Math.max(0, Math.min(84, startPos.current.y + deltaY));

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
  const houseArea = calculateTotalArea();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header & Points Banner */}
        <View style={styles.headerCard}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerTitle}>가족 드림하우스 🏠</Text>
              <Text style={styles.headerSub}>Magicplan 도면에 포인트를 모아 가구를 꾸며보세요!</Text>
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
            <View style={styles.canvasTitleGroup}>
              <Text style={styles.canvasTitle}>Magicplan 우리 집 평면도</Text>
              <Text style={styles.canvasAreaSubtitle}>
                전용면적: {houseArea.sqMeters} m² ({houseArea.pyeong} 평)
              </Text>
            </View>

            <View style={styles.canvasBtnRow}>
              <TouchableOpacity
                style={[styles.changePlanBtn, { backgroundColor: '#FFEBEB', marginRight: 6 }]}
                onPress={() => setMagicplanModalVisible(true)}
              >
                <Wand2 size={13} color="#FF7E82" style={{ marginRight: 4 }} />
                <Text style={[styles.changePlanBtnText, { color: '#FF7E82' }]}>Magicplan 스튜디오</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.changePlanBtn} onPress={pickFloorPlanImage}>
                <Camera size={13} color="#4A90E2" style={{ marginRight: 4 }} />
                <Text style={styles.changePlanBtnText}>사진 업로드</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Interactive Main Canvas */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setSelectedFurnitureId(null)}
            style={styles.canvasContainer}
          >
            {/* Render Floor Plan Image OR Render Custom Drawn Magicplan Rooms */}
            {floorPlanUrl ? (
              <Image
                source={{ uri: floorPlanUrl }}
                style={styles.floorPlanImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.drawnCanvasWrapper}>
                {/* Feature 2: Genuine Architectural Grid Mesh Lines Overlay */}
                <View style={styles.gridMeshContainer} pointerEvents="none">
                  {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((p) => (
                    <React.Fragment key={`grid-${p}`}>
                      <View style={[styles.gridMeshLineH, { top: `${p}%` }]} />
                      <View style={[styles.gridMeshLineV, { left: `${p}%` }]} />
                    </React.Fragment>
                  ))}
                </View>

                {/* Render Magicplan Rooms */}
                {magicRooms.map((r) => (
                  <View
                    key={r.id}
                    style={[
                      styles.renderedRoomBox,
                      {
                        left: `${r.x}%`,
                        top: `${r.y}%`,
                        width: `${r.wMeters * 10}%`,
                        height: `${r.hMeters * 10}%`,
                        backgroundColor: r.color,
                      },
                    ]}
                  >
                    <Text style={styles.renderedRoomText}>{r.emoji} {r.name}</Text>
                    <Text style={styles.renderedRoomArea}>{(r.wMeters * r.hMeters).toFixed(1)} m²</Text>

                    {/* Openings */}
                    {r.openings.map((op) => (
                      <Text
                        key={op.id}
                        style={[
                          styles.renderedOpeningText,
                          op.wall === 'bottom' && { bottom: -8, left: `${op.offset}%` },
                          op.wall === 'top' && { top: -8, left: `${op.offset}%` },
                          op.wall === 'right' && { right: -8, top: `${op.offset}%` },
                          op.wall === 'left' && { left: -8, top: `${op.offset}%` },
                        ]}
                      >
                        {op.emoji}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            )}

            {/* Placed Furniture Items Overlay */}
            {(placedFurniture || []).map((item) => (
              <DraggableFurniture key={item.id} item={item} />
            ))}
          </TouchableOpacity>

          <Text style={styles.canvasGuideText}>
            💡 상단 [Magicplan 스튜디오]에서 벽면 길이(m)와 문/창문을 자유롭게 디자인하세요!
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

      {/* MAGICPLAN STUDIO ENGINE MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={magicplanModalVisible}
        onRequestClose={() => setMagicplanModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalViewLarge}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleRow}>
                <Wand2 size={22} color="#FF7E82" style={{ marginRight: 6 }} />
                <Text style={styles.modalHeader}>Magicplan 스튜디오 🪄</Text>
              </View>
              <TouchableOpacity onPress={() => setMagicplanModalVisible(false)}>
                <X size={22} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {/* Total Area Summary Banner */}
            <View style={styles.magicAreaSummaryBanner}>
              <Text style={styles.magicAreaSummaryText}>
                총 평형: <Text style={{ fontWeight: '900', color: '#FF7E82' }}>{houseArea.pyeong}평</Text> ({houseArea.sqMeters} m²)
              </Text>
              <Text style={styles.magicAreaSummarySub}>* 방을 터치하여 벽면 미터 태그(📏)를 누르거나 수치 패널에서 변경하세요</Text>
            </View>

            {/* Room Add Tool Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toolBarRow}>
              <TouchableOpacity style={styles.toolChip} onPress={() => handleAddMagicRoom('living')}>
                <Text style={styles.toolChipText}>+ 거실 🛋️</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolChip} onPress={() => handleAddMagicRoom('bedroom')}>
                <Text style={styles.toolChipText}>+ 침실 🛏️</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolChip} onPress={() => handleAddMagicRoom('kitchen')}>
                <Text style={styles.toolChipText}>+ 주방 🍳</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolChip} onPress={() => handleAddMagicRoom('bathroom')}>
                <Text style={styles.toolChipText}>+ 욕실 🛁</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolChip} onPress={() => handleAddMagicRoom('corridor')}>
                <Text style={styles.toolChipText}>+ 현관/복도 🚪</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolChip} onPress={() => handleAddMagicRoom('balcony')}>
                <Text style={styles.toolChipText}>+ 발코니 🪴</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Selected Room Control Panel */}
            {selectedRoomId && (
              <View style={styles.selectedRoomControlPanel}>
                <View style={styles.roomControlHeader}>
                  <Text style={styles.selectedRoomTitleText}>
                    선택된 방: {magicRooms.find((r) => r.id === selectedRoomId)?.emoji} {magicRooms.find((r) => r.id === selectedRoomId)?.name}
                  </Text>
                  <TouchableOpacity onPress={() => handleDeleteMagicRoom(selectedRoomId)}>
                    <Text style={{ fontSize: 11, color: '#E74C3C', fontWeight: '800' }}>[방 삭제 🗑️]</Text>
                  </TouchableOpacity>
                </View>

                {/* Wall Length Quick Action Buttons & Openings */}
                <View style={styles.roomActionBtnGroup}>
                  <TouchableOpacity style={styles.dimActionBtn} onPress={() => handleOpenDimModal('width')}>
                    <Sliders size={12} color="#1C1C1E" style={{ marginRight: 4 }} />
                    <Text style={styles.dimActionBtnText}>📐 가로 치수 입력</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.dimActionBtn} onPress={() => handleOpenDimModal('height')}>
                    <Sliders size={12} color="#1C1C1E" style={{ marginRight: 4 }} />
                    <Text style={styles.dimActionBtnText}>📐 세로 치수 입력</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.openingAddBtn} onPress={() => handleAddOpeningToRoom('door')}>
                    <Text style={styles.openingAddBtnText}>+ 문 🚪 추가</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.openingAddBtn} onPress={() => handleAddOpeningToRoom('window')}>
                    <Text style={styles.openingAddBtnText}>+ 창문 🪟 추가</Text>
                  </TouchableOpacity>
                </View>

                {/* Arrow Directional Pad */}
                <View style={styles.roomMovePadRow}>
                  <Text style={styles.movePadLabel}>방 미세 이동 (자석 스냅):</Text>
                  <TouchableOpacity style={styles.padBtn} onPress={() => handleMoveRoom(0, -4)}>
                    <ArrowUp size={12} color="#1C1C1E" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.padBtn} onPress={() => handleMoveRoom(0, 4)}>
                    <ArrowDown size={12} color="#1C1C1E" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.padBtn} onPress={() => handleMoveRoom(-4, 0)}>
                    <ArrowLeft size={12} color="#1C1C1E" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.padBtn} onPress={() => handleMoveRoom(4, 0)}>
                    <ArrowRight size={12} color="#1C1C1E" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* MAGICPLAN ARCHITECTURAL GRID CANVAS WITH MESH LINES */}
            <View style={styles.magicEditorCanvas}>
              {/* Feature 2: Genuine Architectural Grid Mesh Lines */}
              <View style={styles.gridMeshContainer} pointerEvents="none">
                {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((p) => (
                  <React.Fragment key={`editor-grid-${p}`}>
                    <View style={[styles.gridMeshLineH, { top: `${p}%` }]} />
                    <View style={[styles.gridMeshLineV, { left: `${p}%` }]} />
                  </React.Fragment>
                ))}
              </View>

              {magicRooms.map((room) => (
                <MagicRoomComponent key={room.id} room={room} />
              ))}
            </View>

            <TouchableOpacity
              style={styles.makerConfirmBtn}
              onPress={() => {
                if (onUpdateFloorPlan) onUpdateFloorPlan(null);
                setMagicplanModalVisible(false);
                Alert.alert('Magicplan 도면 저장 완료! 🪄', `전용면적 ${houseArea.sqMeters}m² (${houseArea.pyeong}평) 도면이 성공적으로 반영되었습니다.`);
              }}
            >
              <Text style={styles.makerConfirmBtnText}>이 Magicplan 도면으로 완성 및 저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Feature 3: DIMENSION KEYPAD EDIT MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={dimModalVisible}
        onRequestClose={() => setDimModalVisible(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.dimModalBox}>
            <Text style={styles.dimModalTitle}>
              Magicplan 정밀 치수 입력 📐
            </Text>
            <Text style={styles.dimModalSub}>
              {editingWallSide === 'width' ? '가로 벽면' : '세로 벽면'}의 실제 미터(m) 길이를 입력하세요.
            </Text>

            <View style={styles.dimInputRow}>
              <TextInput
                style={styles.dimTextInput}
                keyboardType="numeric"
                value={dimInputValue}
                onChangeText={setDimInputValue}
                placeholder="4.5"
                autoFocus={true}
              />
              <Text style={styles.dimUnitText}>m (미터)</Text>
            </View>

            <View style={styles.dimModalBtnRow}>
              <TouchableOpacity
                style={[styles.dimModalBtn, { backgroundColor: '#F1F2F4' }]}
                onPress={() => setDimModalVisible(false)}
              >
                <Text style={[styles.dimModalBtnText, { color: '#8E8E93' }]}>취소</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dimModalBtn, { backgroundColor: '#FF7E82' }]}
                onPress={handleApplyDimensionChange}
              >
                <Text style={[styles.dimModalBtnText, { color: '#FFFFFF' }]}>치수 적용</Text>
              </TouchableOpacity>
            </View>
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
  canvasBtnRow: {
    flexDirection: 'row',
  },
  changePlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
  },
  changePlanBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4A90E2',
  },
  canvasContainer: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#FAF9F6',
  },
  floorPlanImage: {
    width: '100%',
    height: '100%',
  },
  drawnCanvasWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#FAF9F6',
  },
  gridMeshContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  gridMeshLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  gridMeshLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#E5E5EA',
  },
  renderedRoomBox: {
    position: 'absolute',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  renderedRoomText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  renderedRoomArea: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8E8E93',
  },
  renderedOpeningText: {
    position: 'absolute',
    fontSize: 14,
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
    maxHeight: '80%',
  },
  modalViewLarge: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: '95%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C1C1E',
  },
  magicAreaSummaryBanner: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FFD6D6',
  },
  magicAreaSummaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  magicAreaSummarySub: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 2,
  },
  toolBarRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  toolChip: {
    backgroundColor: '#F1F2F4',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    marginRight: 8,
  },
  toolChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  selectedRoomControlPanel: {
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  roomControlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedRoomTitleText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  roomActionBtnGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  dimActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  dimActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4A90E2',
  },
  openingAddBtn: {
    backgroundColor: '#F1F2F4',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  openingAddBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  roomMovePadRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  movePadLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    marginRight: 6,
  },
  padBtn: {
    backgroundColor: '#FFFFFF',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#D1D1D6',
  },
  magicEditorCanvas: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    backgroundColor: '#FAF9F6',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    position: 'relative',
    alignSelf: 'center',
    marginBottom: 10,
  },
  magicRoomBox: {
    position: 'absolute',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  magicRoomBoxSelected: {
    borderColor: '#FF7E82',
    borderWidth: 3,
  },
  magicWallTagTop: {
    position: 'absolute',
    top: -11,
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 10,
  },
  magicWallTagLeft: {
    position: 'absolute',
    left: -22,
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 10,
  },
  magicWallTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  magicRoomTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  magicRoomAreaText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8E8E93',
    marginTop: 1,
  },
  magicOpeningSymbol: {
    position: 'absolute',
    fontSize: 15,
  },
  makerConfirmBtn: {
    backgroundColor: '#FF7E82',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  makerConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  dimModalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  dimModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  dimModalSub: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 14,
  },
  dimInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#D1D1D6',
    marginBottom: 16,
  },
  dimTextInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
    color: '#1C1C1E',
    padding: 0,
  },
  dimUnitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8E8E93',
  },
  dimModalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dimModalBtn: {
    flex: 0.48,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  dimModalBtnText: {
    fontSize: 13,
    fontWeight: '800',
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
