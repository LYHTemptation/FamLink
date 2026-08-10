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
import { Home, ShoppingBag, Plus, Trash2, RotateCw, Camera, X, Trophy, Sparkles, Check, Edit3, Grid, Layers, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, CornerDownLeft, Undo2 } from 'lucide-react-native';

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
  const [makerModalVisible, setMakerModalVisible] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState('living');
  const [selectedFurnitureId, setSelectedFurnitureId] = useState(null);

  // HYBRID MAKER STATES (Method 1: Room Blocks + Method 2: Walls/Doors + Method 3: Node CAD)
  const [makerActiveTab, setMakerActiveTab] = useState('rooms'); // 'rooms', 'walls', 'cad'
  const [customRooms, setCustomRooms] = useState([
    { id: 'r1', name: '거실', emoji: '🛋️', x: 5, y: 5, w: 48, h: 42, color: '#FFF5EB' },
    { id: 'r2', name: '안방', emoji: '🛏️', x: 58, y: 5, w: 37, h: 42, color: '#EBF5FF' },
    { id: 'r3', name: '주방', emoji: '🍳', x: 5, y: 53, w: 42, h: 42, color: '#EFFFFA' },
    { id: 'r4', name: '작은방', emoji: '👦', x: 50, y: 53, w: 45, h: 42, color: '#FDF0FF' },
  ]);
  const [customWalls, setCustomWalls] = useState([
    { id: 'w1', x: 55, y: 5, w: 2, h: 42 },
    { id: 'w2', x: 5, y: 50, w: 90, h: 2 },
  ]);
  const [customOpenings, setCustomOpenings] = useState([
    { id: 'd1', type: 'door', emoji: '🚪', x: 48, y: 22 },
    { id: 'd2', type: 'window', emoji: '🪟', x: 25, y: 2 },
  ]);

  // Selected Element in Maker
  const [selectedMakerElement, setSelectedMakerElement] = useState(null);

  // Numerical Size Inputs (Width % and Height %)
  const [inputWidth, setInputWidth] = useState('');
  const [inputHeight, setInputHeight] = useState('');

  // CAD Node Drawing Mode States
  const [cadNodes, setCadNodes] = useState([]);
  const [cadLines, setCadLines] = useState([]);

  // Sync numerical size inputs when selected element changes
  useEffect(() => {
    if (selectedMakerElement && selectedMakerElement.type === 'room') {
      const targetRoom = customRooms.find((r) => r.id === selectedMakerElement.id);
      if (targetRoom) {
        setInputWidth(String(Math.round(targetRoom.w)));
        setInputHeight(String(Math.round(targetRoom.h)));
      }
    }
  }, [selectedMakerElement, customRooms]);

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

  // Move Selected Element in Maker Canvas
  const handleMoveSelectedMakerElement = (dxPercent, dyPercent) => {
    if (!selectedMakerElement) return;

    if (selectedMakerElement.type === 'room') {
      setCustomRooms((prev) =>
        prev.map((r) => {
          if (r.id === selectedMakerElement.id) {
            const newX = Math.max(0, Math.min(100 - r.w, r.x + dxPercent));
            const newY = Math.max(0, Math.min(100 - r.h, r.y + dyPercent));
            return { ...r, x: newX, y: newY };
          }
          return r;
        })
      );
    } else if (selectedMakerElement.type === 'wall') {
      setCustomWalls((prev) =>
        prev.map((w) => {
          if (w.id === selectedMakerElement.id) {
            const newX = Math.max(0, Math.min(95, w.x + dxPercent));
            const newY = Math.max(0, Math.min(95, w.y + dyPercent));
            return { ...w, x: newX, y: newY };
          }
          return w;
        })
      );
    } else if (selectedMakerElement.type === 'opening') {
      setCustomOpenings((prev) =>
        prev.map((op) => {
          if (op.id === selectedMakerElement.id) {
            const newX = Math.max(0, Math.min(95, op.x + dxPercent));
            const newY = Math.max(0, Math.min(95, op.y + dyPercent));
            return { ...op, x: newX, y: newY };
          }
          return op;
        })
      );
    }
  };

  // Apply Numerical Size Input Change
  const handleApplyNumericSize = () => {
    if (!selectedMakerElement || selectedMakerElement.type !== 'room') return;

    const wNum = parseInt(inputWidth, 10);
    const hNum = parseInt(inputHeight, 10);

    if (isNaN(wNum) || isNaN(hNum) || wNum <= 0 || hNum <= 0) {
      Alert.alert('입력 확인', '올바른 숫자(1 ~ 80)를 입력해주세요.');
      return;
    }

    const clampedW = Math.max(10, Math.min(85, wNum));
    const clampedH = Math.max(10, Math.min(85, hNum));

    setCustomRooms((prev) =>
      prev.map((r) =>
        r.id === selectedMakerElement.id ? { ...r, w: clampedW, h: clampedH } : r
      )
    );
    Alert.alert('크기 변경 완료 📐', `가로 ${clampedW}%, 세로 ${clampedH}%로 설정되었습니다.`);
  };

  // Add Node on Canvas Touch in CAD Mode
  const handleCADCanvasTouch = (event) => {
    if (makerActiveTab !== 'cad') return;

    const { locationX, locationY } = event.nativeEvent;
    const xPercent = Math.max(0, Math.min(95, (locationX / CANVAS_SIZE) * 100));
    const yPercent = Math.max(0, Math.min(95, (locationY / CANVAS_SIZE) * 100));

    const newNode = { x: Math.round(xPercent), y: Math.round(yPercent) };

    // Check if touching near first node to close polygon room
    if (cadNodes.length >= 3) {
      const firstNode = cadNodes[0];
      const dist = Math.hypot(newNode.x - firstNode.x, newNode.y - firstNode.y);

      if (dist < 10) {
        // Close polygon loop into custom room block!
        const minX = Math.min(...cadNodes.map((n) => n.x));
        const minY = Math.min(...cadNodes.map((n) => n.y));
        const maxX = Math.max(...cadNodes.map((n) => n.x));
        const maxY = Math.max(...cadNodes.map((n) => n.y));

        const newCustomRoom = {
          id: `cad-room-${Date.now()}`,
          name: 'CAD 맞춤방',
          emoji: '📐',
          x: minX,
          y: minY,
          w: Math.max(15, maxX - minX),
          h: Math.max(15, maxY - minY),
          color: '#EBF5FF',
        };

        setCustomRooms([...customRooms, newCustomRoom]);
        setCadNodes([]);
        setCadLines([]);
        Alert.alert('공간 다각형 방 자동 완성! 🎉', '노드가 성공적으로 연결되어 맞춤 방이 생성되었습니다.');
        return;
      }
    }

    // Add wall line if at least 1 previous node exists
    if (cadNodes.length > 0) {
      const lastNode = cadNodes[cadNodes.length - 1];
      const newLine = {
        id: `cad-line-${Date.now()}`,
        x1: lastNode.x,
        y1: lastNode.y,
        x2: newNode.x,
        y2: newNode.y,
      };
      setCadLines([...cadLines, newLine]);
    }

    setCadNodes([...cadNodes, newNode]);
  };

  // Undo Last CAD Node
  const handleUndoCADNode = () => {
    if (cadNodes.length === 0) return;
    setCadNodes(cadNodes.slice(0, -1));
    setCadLines(cadLines.slice(0, -1));
  };

  // Reset All CAD Nodes
  const handleResetCAD = () => {
    setCadNodes([]);
    setCadLines([]);
  };

  // Add Room Block in Maker
  const handleAddRoomBlock = (type) => {
    const PRESETS = {
      living: { name: '거실', emoji: '🛋️', w: 45, h: 40, color: '#FFF5EB' },
      bedroom: { name: '침실', emoji: '🛏️', w: 35, h: 35, color: '#EBF5FF' },
      kitchen: { name: '주방', emoji: '🍳', w: 38, h: 35, color: '#EFFFFA' },
      bathroom: { name: '욕실', emoji: '🛁', w: 25, h: 25, color: '#F5F5F5' },
      balcony: { name: '발코니', emoji: '🪴', w: 40, h: 20, color: '#F0F9FF' },
    };

    const preset = PRESETS[type] || PRESETS.bedroom;
    const newRoom = {
      id: `room-${Date.now()}`,
      name: preset.name,
      emoji: preset.emoji,
      x: 20,
      y: 20,
      w: preset.w,
      h: preset.h,
      color: preset.color,
    };

    setCustomRooms([...customRooms, newRoom]);
    setSelectedMakerElement({ type: 'room', id: newRoom.id });
  };

  // Add Wall Divider in Maker
  const handleAddWallLine = () => {
    const newWall = {
      id: `wall-${Date.now()}`,
      x: 40,
      y: 20,
      w: 2,
      h: 40,
    };
    setCustomWalls([...customWalls, newWall]);
    setSelectedMakerElement({ type: 'wall', id: newWall.id });
  };

  // Add Door or Window in Maker
  const handleAddOpening = (type) => {
    const newOpening = {
      id: `op-${Date.now()}`,
      type: type,
      emoji: type === 'door' ? '🚪' : '🪟',
      x: 40,
      y: 40,
    };
    setCustomOpenings([...customOpenings, newOpening]);
    setSelectedMakerElement({ type: 'opening', id: newOpening.id });
  };

  // Delete Maker Element
  const handleDeleteMakerElement = () => {
    if (!selectedMakerElement) return;
    if (selectedMakerElement.type === 'room') {
      setCustomRooms(customRooms.filter((r) => r.id !== selectedMakerElement.id));
    } else if (selectedMakerElement.type === 'wall') {
      setCustomWalls(customWalls.filter((w) => w.id !== selectedMakerElement.id));
    } else if (selectedMakerElement.type === 'opening') {
      setCustomOpenings(customOpenings.filter((o) => o.id !== selectedMakerElement.id));
    }
    setSelectedMakerElement(null);
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

  // PanResponder Draggable Item Component (For Placed Furniture)
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
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
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

  // Draggable Room Block in Hybrid Maker
  const DraggableMakerRoom = ({ room }) => {
    const isSelected = selectedMakerElement?.id === room.id;
    const [pos, setPos] = useState({ x: room.x, y: room.y });
    const startPos = useRef({ x: room.x, y: room.y });

    useEffect(() => {
      setPos({ x: room.x, y: room.y });
    }, [room.x, room.y]);

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: () => {
          setSelectedMakerElement({ type: 'room', id: room.id });
          startPos.current = { x: room.x, y: room.y };
        },
        onPanResponderMove: (evt, gestureState) => {
          const deltaX = (gestureState.dx / CANVAS_SIZE) * 100;
          const deltaY = (gestureState.dy / CANVAS_SIZE) * 100;

          const newX = Math.max(0, Math.min(100 - room.w, startPos.current.x + deltaX));
          const newY = Math.max(0, Math.min(100 - room.h, startPos.current.y + deltaY));

          setPos({ x: newX, y: newY });
        },
        onPanResponderRelease: (evt, gestureState) => {
          const deltaX = (gestureState.dx / CANVAS_SIZE) * 100;
          const deltaY = (gestureState.dy / CANVAS_SIZE) * 100;

          const finalX = Math.max(0, Math.min(100 - room.w, startPos.current.x + deltaX));
          const finalY = Math.max(0, Math.min(100 - room.h, startPos.current.y + deltaY));

          setCustomRooms((prev) =>
            prev.map((r) => (r.id === room.id ? { ...r, x: finalX, y: finalY } : r))
          );
        },
      })
    ).current;

    return (
      <View
        {...panResponder.panHandlers}
        style={[
          styles.makerRoomBlock,
          {
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            width: `${room.w}%`,
            height: `${room.h}%`,
            backgroundColor: room.color,
          },
          isSelected && styles.makerElementSelected,
        ]}
      >
        <Text style={styles.makerRoomText}>{room.emoji} {room.name}</Text>
      </View>
    );
  };

  // Draggable Wall Line in Hybrid Maker
  const DraggableMakerWall = ({ wall }) => {
    const isSelected = selectedMakerElement?.id === wall.id;
    const [pos, setPos] = useState({ x: wall.x, y: wall.y });
    const startPos = useRef({ x: wall.x, y: wall.y });

    useEffect(() => {
      setPos({ x: wall.x, y: wall.y });
    }, [wall.x, wall.y]);

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: () => {
          setSelectedMakerElement({ type: 'wall', id: wall.id });
          startPos.current = { x: wall.x, y: wall.y };
        },
        onPanResponderMove: (evt, gestureState) => {
          const deltaX = (gestureState.dx / CANVAS_SIZE) * 100;
          const deltaY = (gestureState.dy / CANVAS_SIZE) * 100;

          const newX = Math.max(0, Math.min(95, startPos.current.x + deltaX));
          const newY = Math.max(0, Math.min(95, startPos.current.y + deltaY));

          setPos({ x: newX, y: newY });
        },
        onPanResponderRelease: (evt, gestureState) => {
          const deltaX = (gestureState.dx / CANVAS_SIZE) * 100;
          const deltaY = (gestureState.dy / CANVAS_SIZE) * 100;

          const finalX = Math.max(0, Math.min(95, startPos.current.x + deltaX));
          const finalY = Math.max(0, Math.min(95, startPos.current.y + deltaY));

          setCustomWalls((prev) =>
            prev.map((w) => (w.id === wall.id ? { ...w, x: finalX, y: finalY } : w))
          );
        },
      })
    ).current;

    return (
      <View
        {...panResponder.panHandlers}
        style={[
          styles.makerWallLine,
          { left: `${pos.x}%`, top: `${pos.y}%`, width: `${wall.w}%`, height: `${wall.h}%` },
          isSelected && styles.makerElementSelected,
        ]}
      />
    );
  };

  // Draggable Door/Window in Hybrid Maker
  const DraggableMakerOpening = ({ op }) => {
    const isSelected = selectedMakerElement?.id === op.id;
    const [pos, setPos] = useState({ x: op.x, y: op.y });
    const startPos = useRef({ x: op.x, y: op.y });

    useEffect(() => {
      setPos({ x: op.x, y: op.y });
    }, [op.x, op.y]);

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: () => {
          setSelectedMakerElement({ type: 'opening', id: op.id });
          startPos.current = { x: op.x, y: op.y };
        },
        onPanResponderMove: (evt, gestureState) => {
          const deltaX = (gestureState.dx / CANVAS_SIZE) * 100;
          const deltaY = (gestureState.dy / CANVAS_SIZE) * 100;

          const newX = Math.max(0, Math.min(95, startPos.current.x + deltaX));
          const newY = Math.max(0, Math.min(95, startPos.current.y + deltaY));

          setPos({ x: newX, y: newY });
        },
        onPanResponderRelease: (evt, gestureState) => {
          const deltaX = (gestureState.dx / CANVAS_SIZE) * 100;
          const deltaY = (gestureState.dy / CANVAS_SIZE) * 100;

          const finalX = Math.max(0, Math.min(95, startPos.current.x + deltaX));
          const finalY = Math.max(0, Math.min(95, startPos.current.y + deltaY));

          setCustomOpenings((prev) =>
            prev.map((o) => (o.id === op.id ? { ...o, x: finalX, y: finalY } : o))
          );
        },
      })
    ).current;

    return (
      <View
        {...panResponder.panHandlers}
        style={[
          styles.makerOpeningText,
          { left: `${pos.x}%`, top: `${pos.y}%` },
          isSelected && styles.makerElementSelected,
        ]}
      >
        <Text style={{ fontSize: 18 }}>{op.emoji}</Text>
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
            <View style={styles.canvasBtnRow}>
              <TouchableOpacity
                style={[styles.changePlanBtn, { backgroundColor: '#FFEBEB', marginRight: 6 }]}
                onPress={() => setMakerModalVisible(true)}
              >
                <Edit3 size={13} color="#FF7E82" style={{ marginRight: 4 }} />
                <Text style={[styles.changePlanBtnText, { color: '#FF7E82' }]}>직접 그리기</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.changePlanBtn} onPress={pickFloorPlanImage}>
                <Camera size={13} color="#4A90E2" style={{ marginRight: 4 }} />
                <Text style={styles.changePlanBtnText}>사진 업로드</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Interactive Canvas */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setSelectedFurnitureId(null)}
            style={styles.canvasContainer}
          >
            {/* Render Floor Plan Image OR Render Custom Drawn Hybrid Rooms */}
            {floorPlanUrl ? (
              <Image
                source={{ uri: floorPlanUrl }}
                style={styles.floorPlanImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.drawnCanvasWrapper}>
                {/* Render Custom Hybrid Drawn Rooms */}
                {customRooms.map((r) => (
                  <View
                    key={r.id}
                    style={[
                      styles.renderedRoomBox,
                      {
                        left: `${r.x}%`,
                        top: `${r.y}%`,
                        width: `${r.w}%`,
                        height: `${r.h}%`,
                        backgroundColor: r.color,
                      },
                    ]}
                  >
                    <Text style={styles.renderedRoomText}>{r.emoji} {r.name}</Text>
                  </View>
                ))}

                {/* Render Custom Drawn Walls */}
                {customWalls.map((w) => (
                  <View
                    key={w.id}
                    style={[
                      styles.renderedWallLine,
                      {
                        left: `${w.x}%`,
                        top: `${w.y}%`,
                        width: `${w.w}%`,
                        height: `${w.h}%`,
                      },
                    ]}
                  />
                ))}

                {/* Render Custom Doors/Windows */}
                {customOpenings.map((op) => (
                  <Text
                    key={op.id}
                    style={[
                      styles.renderedOpeningText,
                      { left: `${op.x}%`, top: `${op.y}%` },
                    ]}
                  >
                    {op.emoji}
                  </Text>
                ))}
              </View>
            )}

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

      {/* Hybrid Floor Plan Maker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={makerModalVisible}
        onRequestClose={() => setMakerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalViewLarge}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleRow}>
                <Edit3 size={20} color="#FF7E82" style={{ marginRight: 6 }} />
                <Text style={styles.modalHeader}>하이브리드 평면도 메이커</Text>
              </View>
              <TouchableOpacity onPress={() => setMakerModalVisible(false)}>
                <X size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {/* Maker Tool Tabs */}
            <View style={styles.categoryTabRow}>
              <TouchableOpacity
                style={[styles.categoryTab, makerActiveTab === 'rooms' && styles.categoryTabActive]}
                onPress={() => setMakerActiveTab('rooms')}
              >
                <Text style={[styles.categoryTabText, makerActiveTab === 'rooms' && styles.categoryTabTextActive]}>
                  1. 룸 블록 🏠
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.categoryTab, makerActiveTab === 'walls' && styles.categoryTabActive]}
                onPress={() => setMakerActiveTab('walls')}
              >
                <Text style={[styles.categoryTabText, makerActiveTab === 'walls' && styles.categoryTabTextActive]}>
                  2. 벽/문 🧱
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.categoryTab, makerActiveTab === 'cad' && styles.categoryTabActive]}
                onPress={() => setMakerActiveTab('cad')}
              >
                <Text style={[styles.categoryTabText, makerActiveTab === 'cad' && styles.categoryTabTextActive]}>
                  3. 노드 CAD 📐
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tool Bar Controls */}
            {makerActiveTab === 'rooms' ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toolBarRow}>
                <TouchableOpacity style={styles.toolChip} onPress={() => handleAddRoomBlock('living')}>
                  <Text style={styles.toolChipText}>+ 거실 🛋️</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolChip} onPress={() => handleAddRoomBlock('bedroom')}>
                  <Text style={styles.toolChipText}>+ 침실 🛏️</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolChip} onPress={() => handleAddRoomBlock('kitchen')}>
                  <Text style={styles.toolChipText}>+ 주방 🍳</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolChip} onPress={() => handleAddRoomBlock('bathroom')}>
                  <Text style={styles.toolChipText}>+ 욕실 🛁</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolChip} onPress={() => handleAddRoomBlock('balcony')}>
                  <Text style={styles.toolChipText}>+ 발코니 🪴</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : makerActiveTab === 'walls' ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toolBarRow}>
                <TouchableOpacity style={styles.toolChip} onPress={handleAddWallLine}>
                  <Text style={styles.toolChipText}>+ 벽선 🧱</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolChip} onPress={() => handleAddOpening('door')}>
                  <Text style={styles.toolChipText}>+ 문 🚪</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolChip} onPress={() => handleAddOpening('window')}>
                  <Text style={styles.toolChipText}>+ 창문 🪟</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toolBarRow}>
                <TouchableOpacity style={styles.toolChip} onPress={handleUndoCADNode}>
                  <Text style={styles.toolChipText}>↩️ 점 취소</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.toolChip, styles.toolChipDelete]} onPress={handleResetCAD}>
                  <Text style={[styles.toolChipText, { color: '#FFFFFF' }]}>🧹 CAD 리셋</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* Numerical Size Input Row for Selected Room */}
            {selectedMakerElement?.type === 'room' && (
              <View style={styles.numericSizeRow}>
                <Text style={styles.numericLabel}>수치 직접 입력 크기:</Text>
                <Text style={styles.inputSubLabel}>가로%</Text>
                <TextInput
                  style={styles.numericInput}
                  keyboardType="numeric"
                  value={inputWidth}
                  onChangeText={setInputWidth}
                  placeholder="45"
                />
                <Text style={styles.inputSubLabel}>세로%</Text>
                <TextInput
                  style={styles.numericInput}
                  keyboardType="numeric"
                  value={inputHeight}
                  onChangeText={setInputHeight}
                  placeholder="40"
                />
                <TouchableOpacity style={styles.numericApplyBtn} onPress={handleApplyNumericSize}>
                  <Text style={styles.numericApplyBtnText}>적용</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Directional Arrow Movement Pad & Controls Toolbar */}
            {selectedMakerElement && (
              <View style={styles.directionalPadContainer}>
                <Text style={styles.directionalPadTitle}>선택 항목 미세 이동:</Text>
                <View style={styles.directionalPadBtnRow}>
                  <TouchableOpacity style={styles.arrowBtn} onPress={() => handleMoveSelectedMakerElement(0, -4)}>
                    <ArrowUp size={14} color="#1C1C1E" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.arrowBtn} onPress={() => handleMoveSelectedMakerElement(0, 4)}>
                    <ArrowDown size={14} color="#1C1C1E" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.arrowBtn} onPress={() => handleMoveSelectedMakerElement(-4, 0)}>
                    <ArrowLeft size={14} color="#1C1C1E" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.arrowBtn} onPress={() => handleMoveSelectedMakerElement(4, 0)}>
                    <ArrowRight size={14} color="#1C1C1E" />
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.arrowBtn, styles.deleteElemBtn]} onPress={handleDeleteMakerElement}>
                    <Trash2 size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Maker Editor Canvas with Interactive Draggable & CAD Touch Mode */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={handleCADCanvasTouch}
              style={styles.makerEditorCanvas}
            >
              {/* Draggable Room Blocks */}
              {customRooms.map((room) => (
                <DraggableMakerRoom key={room.id} room={room} />
              ))}

              {/* Draggable Wall Lines */}
              {customWalls.map((wall) => (
                <DraggableMakerWall key={wall.id} wall={wall} />
              ))}

              {/* Draggable Openings */}
              {customOpenings.map((op) => (
                <DraggableMakerOpening key={op.id} op={op} />
              ))}

              {/* CAD Mode Drawn Nodes & Lines Overlay */}
              {cadLines.map((line) => (
                <View
                  key={line.id}
                  style={[
                    styles.cadWallLine,
                    {
                      left: `${Math.min(line.x1, line.x2)}%`,
                      top: `${Math.min(line.y1, line.y2)}%`,
                      width: `${Math.max(2, Math.abs(line.x2 - line.x1))}%`,
                      height: `${Math.max(2, Math.abs(line.y2 - line.y1))}%`,
                    },
                  ]}
                />
              ))}

              {cadNodes.map((node, index) => (
                <View
                  key={`node-${index}`}
                  style={[
                    styles.cadNodeDot,
                    { left: `${node.x}%`, top: `${node.y}%` },
                    index === 0 && styles.cadFirstNodeDot,
                  ]}
                >
                  <Text style={styles.cadNodeText}>P{index + 1}</Text>
                </View>
              ))}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.makerConfirmBtn}
              onPress={() => {
                if (onUpdateFloorPlan) onUpdateFloorPlan(null);
                setMakerModalVisible(false);
                Alert.alert('하이브리드 CAD 평면도 완성! 🎉', '수치 입력과 CAD 노드로 완성된 평면도가 성공적으로 반영되었습니다.');
              }}
            >
              <Text style={styles.makerConfirmBtnText}>이 평면도로 저장 & 적용하기</Text>
            </TouchableOpacity>
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
  canvasBtnRow: {
    flexDirection: 'row',
  },
  canvasTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1C1E',
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
  renderedRoomBox: {
    position: 'absolute',
    borderRadius: 8,
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
  renderedWallLine: {
    position: 'absolute',
    backgroundColor: '#1C1C1E',
    borderRadius: 2,
  },
  renderedOpeningText: {
    position: 'absolute',
    fontSize: 16,
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
  modalViewLarge: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '94%',
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
  toolBarRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  toolChip: {
    backgroundColor: '#F1F2F4',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    marginRight: 8,
  },
  toolChipDelete: {
    backgroundColor: '#E74C3C',
  },
  toolChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  numericSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  numericLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1C1C1E',
    marginRight: 4,
  },
  inputSubLabel: {
    fontSize: 10,
    color: '#8E8E93',
    marginHorizontal: 2,
  },
  numericInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D1D6',
    width: 36,
    height: 28,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1C1E',
    padding: 0,
  },
  numericApplyBtn: {
    backgroundColor: '#FF7E82',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 6,
  },
  numericApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  directionalPadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFEAA7',
  },
  directionalPadTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D4AC0D',
  },
  directionalPadBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowBtn: {
    backgroundColor: '#FFFFFF',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  deleteElemBtn: {
    backgroundColor: '#E74C3C',
    borderColor: '#E74C3C',
  },
  makerEditorCanvas: {
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
  makerRoomBlock: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  makerWallLine: {
    position: 'absolute',
    backgroundColor: '#1C1C1E',
    borderRadius: 2,
  },
  makerOpeningText: {
    position: 'absolute',
  },
  makerElementSelected: {
    borderWidth: 3,
    borderColor: '#FF7E82',
  },
  makerRoomText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  cadWallLine: {
    position: 'absolute',
    backgroundColor: '#FF7E82',
    borderRadius: 2,
  },
  cadNodeDot: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -10,
    marginTop: -10,
  },
  cadFirstNodeDot: {
    backgroundColor: '#2ECC71',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cadNodeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
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
