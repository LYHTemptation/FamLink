import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Platform,
  Image,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MessageSquare,
  Sparkles,
  Users,
  Lightbulb,
  Trophy,
  Flame,
  Ticket,
  Send,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  X,
  Smile,
  Clock,
  MessageCircle,
  FileText,
  Video,
  Mic,
  Vote,
  Calendar,
  ShoppingCart,
  MapPin,
  Play,
  Square,
  Download,
  CheckCircle2,
  Paperclip,
  Share2,
  CheckSquare,
} from 'lucide-react-native';
import UserAvatar from './UserAvatar';
import { stripEmojis } from '../utils/topics';

/**
 * 대화방 목록 시간 포맷팅 (카카오톡/라인/메신저 표준 UX):
 * - 오늘: 오전/오후 H:MM (예: 오후 6:05)
 * - 어제: '어제'
 * - 올해: M월 D일 (예: 10월 2일)
 * - 작년 이전: YYYY.MM.DD (예: 2025.12.31)
 */
export const formatChatRoomTime = (dateOrIso, fallbackTimestamp) => {
  let msgDate = null;
  if (dateOrIso) {
    const d = new Date(dateOrIso);
    if (!isNaN(d.getTime())) {
      msgDate = d;
    }
  }

  if (!msgDate && fallbackTimestamp) {
    return fallbackTimestamp;
  }

  if (!msgDate) {
    return '대화 가능';
  }

  const now = new Date();
  const isSameYear = msgDate.getFullYear() === now.getFullYear();
  const isSameMonth = msgDate.getMonth() === now.getMonth();
  const isSameDate = msgDate.getDate() === now.getDate();

  // 1. 오늘: 시간 표시
  if (isSameYear && isSameMonth && isSameDate) {
    const isPm = msgDate.getHours() >= 12;
    const hours = msgDate.getHours() % 12 || 12;
    const minutes = msgDate.getMinutes() < 10 ? `0${msgDate.getMinutes()}` : msgDate.getMinutes();
    return `${isPm ? '오후' : '오전'} ${hours}:${minutes}`;
  }

  // 2. 어제: '어제'
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const isYesterday = (
    msgDate.getFullYear() === yesterday.getFullYear() &&
    msgDate.getMonth() === yesterday.getMonth() &&
    msgDate.getDate() === yesterday.getDate()
  );
  if (isYesterday) {
    return '어제';
  }

  // 3. 올해 (어제 이전): M월 D일
  if (isSameYear) {
    return `${msgDate.getMonth() + 1}월 ${msgDate.getDate()}일`;
  }

  // 4. 작년 이전: YYYY.MM.DD
  const month = String(msgDate.getMonth() + 1).padStart(2, '0');
  const day = String(msgDate.getDate()).padStart(2, '0');
  return `${msgDate.getFullYear()}.${month}.${day}`;
};

export const parseKoreanTimeToMs = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const match = timeStr.match(/(오전|오후)\s*(\d{1,2}):(\d{2})/);
  if (match) {
    const isPm = match[1] === '오후';
    let hours = parseInt(match[2], 10);
    const minutes = parseInt(match[3], 10);
    if (isPm && hours < 12) hours += 12;
    if (!isPm && hours === 12) hours = 0;
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    return d.getTime();
  }
  return 0;
};

export default function ChatScreen({
  messages,
  currentUser,
  currentUserProfile,
  onSendMessage,
  onMarkAsRead,
  memberCount,
  familyMembers,
  smallTalk,
  onNavigateScreen,
  customRooms,
  onCreateCustomRoom,
  onAddEvent,
  onAddShoppingItem,
  onAddChore,
  onUpdateMessageVote,
}) {
  const insets = useSafeAreaInsets();
  const [selectedRoomId, setSelectedRoomId] = useState(null); // null = Chat Room List View, 'family-group' = Group Chat
  const [inputText, setInputText] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const flatListRef = useRef();
  const isSendingRef = useRef(false);

  // Attach Menu & Modal States for 7 Features
  const [attachMenuVisible, setAttachMenuVisible] = useState(false);
  const [pollModalVisible, setPollModalVisible] = useState(false);
  const [pollTitle, setPollTitle] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventTime, setEventTime] = useState('18:00');
  const [choreModalVisible, setChoreModalVisible] = useState(false);
  const [choreTitle, setChoreTitle] = useState('');
  const [choreAssignee, setChoreAssignee] = useState('가족 전체');
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [locationTitle, setLocationTitle] = useState('');
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const recordingTimerRef = useRef(null);
  const [audioPlayingId, setAudioPlayingId] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
  const prevMsgCountRef = useRef(messages?.length || 0);

  // Trigger read receipt update when entering a chat room or receiving new messages in active room
  useEffect(() => {
    if (selectedRoomId !== null && onMarkAsRead) {
      onMarkAsRead(selectedRoomId);
    }
  }, [selectedRoomId, messages?.length]);

  // 대화방 전환 시 즉시 하단 정렬을 위한 상태 리셋
  useEffect(() => {
    setIsScrolledToBottom(false);
  }, [selectedRoomId]);

  // 대화방 진입 후 새로운 메시지가 추가되었을 때만 부드럽게 스크롤
  useEffect(() => {
    if (selectedRoomId !== null && isScrolledToBottom) {
      const currentCount = messages?.length || 0;
      if (currentCount > prevMsgCountRef.current) {
        flatListRef.current?.scrollToEnd({ animated: true });
      }
    }
    prevMsgCountRef.current = messages?.length || 0;
  }, [messages?.length, selectedRoomId, isScrolledToBottom]);

  // Create Custom Room Modal States
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('💬');
  const [selectedColor, setSelectedColor] = useState('#FF6B47');
  const [selectedMembers, setSelectedMembers] = useState([]);

  const EMOJI_OPTIONS = ['💬', '⛺', '⚽', '🍕', '🎁', '🏖️', '☕', '🎵', '🚗', '🐱', '🎮', '❤️'];
  const COLOR_OPTIONS = ['#FF6B47', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

  const DEFAULT_MEMBERS = {
    mom: { name: '엄마', avatar: '👩‍🦰', color: '#FF6B47' },
    dad: { name: '아빠', avatar: '👨‍💼', color: '#3B82F6' },
    son: { name: '아들', avatar: '👦', color: '#10B981' },
    daughter: { name: '딸', avatar: '👧', color: '#F59E0B' },
  };

  const getSenderInfo = (profileIdOrRole, senderRole, senderObj) => {
    let pId = null;
    let sRole = senderRole;
    let sObj = senderObj;

    if (typeof profileIdOrRole === 'object' && profileIdOrRole !== null) {
      sObj = profileIdOrRole;
    } else if (typeof profileIdOrRole === 'string' && profileIdOrRole.length > 15) {
      pId = profileIdOrRole;
    } else if (typeof profileIdOrRole === 'string' && !senderRole && !senderObj) {
      sRole = profileIdOrRole;
    } else if (profileIdOrRole) {
      pId = profileIdOrRole;
    }

    // 1. Direct senderObj passed from database relation
    if (sObj && typeof sObj === 'object' && sObj.name) {
      return {
        name: sObj.name,
        avatar: sObj.avatar || '👦',
        color: sObj.color || '#3B82F6',
      };
    }

    // 2. Exact match by profile_id in familyMembers
    if (familyMembers && Array.isArray(familyMembers)) {
      if (pId) {
        const matchById = familyMembers.find(m => m && typeof m === 'object' && m.id === pId);
        if (matchById) {
          return { name: matchById.name, avatar: matchById.avatar || '👦', color: matchById.color || '#3B82F6' };
        }
      }
      if (sRole) {
        const matchByRole = familyMembers.find(m => m && typeof m === 'object' && (m.role === sRole || m.id === sRole));
        if (matchByRole) {
          return { name: matchByRole.name, avatar: matchByRole.avatar || '👦', color: matchByRole.color || '#3B82F6' };
        }
      }
    }

    const roleKey = sRole || pId;
    return DEFAULT_MEMBERS[roleKey] || { name: (sObj && sObj.name) || roleKey || '가족', avatar: '👦', color: '#78716C' };
  };

  const getMemberName = (keyOrId) => {
    if (familyMembers && Array.isArray(familyMembers)) {
      const matchById = familyMembers.find(m => m && typeof m === 'object' && m.id === keyOrId);
      if (matchById) return matchById.name;
      const matchByRole = familyMembers.find(m => m && typeof m === 'object' && m.role === keyOrId);
      if (matchByRole) return matchByRole.name;
    }
    const DEFAULT_NAMES = { mom: '엄마', dad: '아빠', son: '아들', daughter: '딸' };
    return DEFAULT_NAMES[keyOrId] || keyOrId;
  };

  const handleSend = () => {
    const textToSend = inputText.trim();
    if (!textToSend && !selectedPhoto) return;
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    setTimeout(() => {
      isSendingRef.current = false;
    }, 250);

    onSendMessage({
      text: textToSend,
      image: selectedPhoto,
      roomId: selectedRoomId || 'family-group',
    });

    setInputText('');
    setSelectedPhoto(null);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);
  };

  // High-efficiency client-side image compression for chat (downscale to max 1280px, 0.75 quality)
  const compressImageForChat = async (uri) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return new Promise((resolve) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const maxDim = 1280;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        };
        img.onerror = () => resolve(uri);
        img.src = uri;
      });
    }
    return uri;
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진첩 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const originalUri = result.assets[0].uri;
      const optimizedUri = await compressImageForChat(originalUri);
      setSelectedPhoto(optimizedUri);
    }
  };

  // 1. 문서 및 일반 파일 공유 핸들러
  const handlePickDocument = async () => {
    try {
      setAttachMenuVisible(false);
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        const fileSizeMb = file.size ? (file.size / (1024 * 1024)).toFixed(1) + 'MB' : '파일';
        const filePayload = {
          name: file.name || '첨부파일',
          size: fileSizeMb,
          mimeType: file.mimeType || 'application/octet-stream',
          uri: file.uri,
        };

        onSendMessage({
          text: `[파일] ${JSON.stringify(filePayload)}`,
          roomId: selectedRoomId || 'family-group',
        });
      }
    } catch (err) {
      console.warn('Document pick error:', err);
      Alert.alert('파일 선택 오류', '파일을 불러오는데 실패했습니다.');
    }
  };

  // 2. 동영상 공유 핸들러
  const handlePickVideo = async () => {
    try {
      setAttachMenuVisible(false);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '동영상 첨부를 위해 갤러리 권한이 필요합니다.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const videoAsset = result.assets[0];
        const videoPayload = {
          uri: videoAsset.uri,
          duration: videoAsset.duration ? Math.round(videoAsset.duration / 1000) : 0,
          name: videoAsset.fileName || '가족 동영상',
        };

        onSendMessage({
          text: `[동영상] ${JSON.stringify(videoPayload)}`,
          roomId: selectedRoomId || 'family-group',
        });
      }
    } catch (err) {
      console.warn('Video pick error:', err);
      Alert.alert('동영상 선택 오류', '동영상을 불러오는데 실패했습니다.');
    }
  };

  // 3. 음성 메시지 / 음성 메모 핸들러
  const handleOpenVoiceModal = () => {
    setAttachMenuVisible(false);
    setRecordingSeconds(0);
    setIsRecording(false);
    setVoiceModalVisible(true);
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordingSeconds(0);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  };

  const handleStopAndSendVoice = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    const finalSeconds = Math.max(1, recordingSeconds);
    setIsRecording(false);
    setVoiceModalVisible(false);

    const voicePayload = {
      duration: finalSeconds,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };

    onSendMessage({
      text: `[음성메모] ${JSON.stringify(voicePayload)}`,
      roomId: selectedRoomId || 'family-group',
    });
  };

  const handleCancelVoice = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
    setRecordingSeconds(0);
    setVoiceModalVisible(false);
  };

  // 4. 가족 투표 생성 핸들러
  const handleOpenPollModal = () => {
    setAttachMenuVisible(false);
    setPollTitle('');
    setPollOptions(['', '']);
    setPollModalVisible(true);
  };

  const handleCreatePoll = () => {
    const validOptions = pollOptions.map(o => o.trim()).filter(Boolean);
    if (!pollTitle.trim()) {
      Alert.alert('입력 안내', '투표 제목을 입력해주세요.');
      return;
    }
    if (validOptions.length < 2) {
      Alert.alert('입력 안내', '최소 2개 이상의 선택지를 입력해주세요.');
      return;
    }

    const pollPayload = {
      id: `poll-${Date.now()}`,
      title: pollTitle.trim(),
      options: validOptions.map(opt => ({ text: opt, votes: [] })),
      authorId: currentUserProfile?.id || currentUser,
      createdAt: new Date().toISOString(),
    };

    onSendMessage({
      text: `[가족투표] ${JSON.stringify(pollPayload)}`,
      roomId: selectedRoomId || 'family-group',
    });

    setPollModalVisible(false);
    setPollTitle('');
    setPollOptions(['', '']);
  };

  // 5. 일정 공유 & 캘린더 등록 핸들러
  const handleOpenEventModal = () => {
    setAttachMenuVisible(false);
    setEventTitle('');
    setEventDate(new Date().toISOString().split('T')[0]);
    setEventTime('18:00');
    setEventModalVisible(true);
  };

  // 날짜 입력 숫자 전용 & 자동 하이픈 (YYYY-MM-DD) 포매터
  const handleEventDateChange = (text) => {
    // 숫자만 추출
    const digits = text.replace(/[^0-9]/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 4 && digits.length <= 6) {
      formatted = `${digits.slice(0, 4)}-${digits.slice(4)}`;
    } else if (digits.length > 6) {
      formatted = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
    }
    setEventDate(formatted);
  };

  // 시간 입력 숫자 전용 & 자동 콜론 (HH:MM) 포매터
  const handleEventTimeChange = (text) => {
    // 숫자만 추출
    const digits = text.replace(/[^0-9]/g, '').slice(0, 4);
    let formatted = digits;
    if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
    }
    setEventTime(formatted);
  };

  const handleCreateEventCard = () => {
    if (!eventTitle.trim()) {
      Alert.alert('입력 안내', '일정 제목을 입력해주세요.');
      return;
    }

    // 날짜 유효성 검사 (YYYY-MM-DD 형식)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(eventDate.trim())) {
      Alert.alert('날짜 확인', '날짜는 YYYY-MM-DD 형식의 숫자 8자리로 입력해주세요.\n(예: 2026-10-10)');
      return;
    }

    // 시간 유효성 검사 (HH:MM 형식)
    const timeRegex = /^([01]?\d|2[0-3]):([0-5]\d)$/;
    if (eventTime.trim() && !timeRegex.test(eventTime.trim())) {
      Alert.alert('시간 확인', '시간은 00:00 ~ 23:59 형식의 숫자로 입력해주세요.\n(예: 18:30)');
      return;
    }

    const eventPayload = {
      title: eventTitle.trim(),
      date: eventDate.trim(),
      time: eventTime.trim() || '18:00',
      category: '가족',
    };

    // 1. 메시지 전송 (대화방에 일정 카드 공유)
    onSendMessage({
      text: `[일정공유] ${JSON.stringify(eventPayload)}`,
      roomId: selectedRoomId || 'family-group',
    });

    // 2. 캘린더에도 즉시 실시간 등록
    if (onAddEvent) {
      onAddEvent({
        title: eventPayload.title,
        date: eventPayload.date,
        endDate: eventPayload.date,
        time: eventPayload.time,
        category: '가족',
      });
    }

    setEventModalVisible(false);
    setEventTitle('');
  };

  // 6. 집안일 / 할 일 바로 추가 핸들러
  const handleOpenChoreModal = () => {
    setAttachMenuVisible(false);
    setChoreTitle('');
    setChoreAssignee(currentUserProfile?.name || getMemberName(currentUser) || '가족 전체');
    setChoreModalVisible(true);
  };

  const handleCreateChoreCard = () => {
    if (!choreTitle.trim()) {
      Alert.alert('입력 안내', '집안일 또는 할 일 내용을 입력해주세요.');
      return;
    }

    const chorePayload = {
      title: choreTitle.trim(),
      assignee: choreAssignee || '가족 전체',
      author: currentUserProfile?.name || getMemberName(currentUser),
    };

    onSendMessage({
      text: `[집안일카드] ${JSON.stringify(chorePayload)}`,
      roomId: selectedRoomId || 'family-group',
    });

    setChoreModalVisible(false);
    setChoreTitle('');
  };

  // 7. 실시간 위치 / 모임 장소 공유 핸들러
  const handleOpenLocationModal = () => {
    setAttachMenuVisible(false);
    setLocationTitle('');
    setLocationModalVisible(true);
  };

  const handleSendCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('위치 권한 필요', '현재 위치를 가져오기 위해 위치 권한이 필요합니다.');
        setLocationLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;

      const locationPayload = {
        title: locationTitle.trim() || '현재 내 위치 📍',
        lat,
        lng,
        senderName: currentUserProfile?.name || getMemberName(currentUser),
      };

      onSendMessage({
        text: `[위치공유] ${JSON.stringify(locationPayload)}`,
        roomId: selectedRoomId || 'family-group',
      });

      setLocationLoading(false);
      setLocationModalVisible(false);
      setLocationTitle('');
    } catch (err) {
      setLocationLoading(false);
      console.warn('Location error:', err);
      // Fallback location
      const fallbackPayload = {
        title: locationTitle.trim() || '우리 가족 모임 장소 📍',
        lat: 37.5665,
        lng: 126.9780,
        senderName: currentUserProfile?.name || getMemberName(currentUser),
      };
      onSendMessage({
        text: `[위치공유] ${JSON.stringify(fallbackPayload)}`,
        roomId: selectedRoomId || 'family-group',
      });
      setLocationModalVisible(false);
      setLocationTitle('');
    }
  };

  // Symmetrical Room ID generator for 1:1 direct chats
  const getDirectRoomId = (myIdOrRole, otherIdOrRole) => {
    const id1 = String(myIdOrRole || 'me');
    const id2 = String(otherIdOrRole || 'other');
    const sorted = [id1, id2].sort();
    return `direct-${sorted[0]}-${sorted[1]}`;
  };

  // Check if a message belongs to a specific room
  const isMessageInRoom = (msg, targetRoomId, otherMemberId = null) => {
    const mRoom = msg.room_id || 'family-group';
    if (targetRoomId === 'family-group') {
      return mRoom === 'family-group';
    }
    if (targetRoomId.startsWith('direct-')) {
      if (mRoom === targetRoomId) return true;
      if (otherMemberId) {
        const myId = currentUserProfile?.id || currentUser;
        if (mRoom === `direct-${otherMemberId}` || mRoom === `direct-${myId}`) {
          const isBetweenUs = (msg.profile_id === otherMemberId || msg.profile_id === myId || msg.sender === otherMemberId || msg.sender === myId);
          if (isBetweenUs) return true;
        }
      }
      return false;
    }
    return mRoom === targetRoomId;
  };

  // Format message text for chat room preview (convert JSON cards to friendly summary and vector icon)
  const getMessagePreviewData = (msg) => {
    if (!msg) return { text: '', cardType: null };
    if (msg.image) return { text: '사진을 공유했습니다.', cardType: 'image' };

    const rawText = msg.text || '';
    if (!rawText) return { text: '', cardType: null };

    // 1. [집안일카드] or [장보기카드]
    if (rawText.startsWith('[집안일카드] ') || rawText.startsWith('[장보기카드] ')) {
      const isLegacy = rawText.startsWith('[장보기카드] ');
      try {
        const data = JSON.parse(rawText.replace(isLegacy ? '[장보기카드] ' : '[집안일카드] ', ''));
        return { text: `집안일: ${data.title || '새 할 일'}`, cardType: 'chore' };
      } catch (e) {
        return { text: '집안일 추가 요청', cardType: 'chore' };
      }
    }

    // 2. [일정공유]
    if (rawText.startsWith('[일정공유] ')) {
      try {
        const data = JSON.parse(rawText.replace('[일정공유] ', ''));
        return { text: `일정: ${data.title || '새 일정'}`, cardType: 'event' };
      } catch (e) {
        return { text: '캘린더 일정 공유', cardType: 'event' };
      }
    }

    // 3. [가족투표]
    if (rawText.startsWith('[가족투표] ')) {
      try {
        const data = JSON.parse(rawText.replace('[가족투표] ', ''));
        return { text: `투표: ${data.title || '새 투표'}`, cardType: 'poll' };
      } catch (e) {
        return { text: '가족 투표 진행 중', cardType: 'poll' };
      }
    }

    // 4. [위치공유]
    if (rawText.startsWith('[위치공유] ')) {
      try {
        const data = JSON.parse(rawText.replace('[위치공유] ', ''));
        return { text: `위치: ${data.title || '모임 장소'}`, cardType: 'location' };
      } catch (e) {
        return { text: '위치 / 모임 장소 공유', cardType: 'location' };
      }
    }

    // 5. [음성메모]
    if (rawText.startsWith('[음성메모] ')) {
      try {
        const data = JSON.parse(rawText.replace('[음성메모] ', ''));
        return { text: `음성 메시지 (${data.duration || 3}초)`, cardType: 'voice' };
      } catch (e) {
        return { text: '음성 메시지', cardType: 'voice' };
      }
    }

    // 6. [동영상]
    if (rawText.startsWith('[동영상] ')) {
      try {
        const data = JSON.parse(rawText.replace('[동영상] ', ''));
        return { text: `동영상: ${data.name || '가족 영상'}`, cardType: 'video' };
      } catch (e) {
        return { text: '동영상 공유', cardType: 'video' };
      }
    }

    // 7. [파일]
    if (rawText.startsWith('[파일] ')) {
      try {
        const data = JSON.parse(rawText.replace('[파일] ', ''));
        return { text: `파일: ${data.name || '문서'}`, cardType: 'file' };
      } catch (e) {
        return { text: '파일 공유', cardType: 'file' };
      }
    }

    return { text: rawText, cardType: null };
  };

  // Get last message info for each specific room
  const getRoomLastMessageInfo = (roomId, otherMemberId = null) => {
    const roomMsgs = (messages || []).filter(m => isMessageInRoom(m, roomId, otherMemberId));
    if (roomMsgs.length === 0) return null;
    const last = roomMsgs[roomMsgs.length - 1];
    const sender = getSenderInfo(last.profile_id, last.sender, last.senderObj);
    const { text: displayText, cardType } = getMessagePreviewData(last);

    let timestampMs = 0;
    const dateSource = last.created_at || last.rawDate;
    if (dateSource) {
      const parsed = new Date(dateSource).getTime();
      if (!isNaN(parsed)) timestampMs = parsed;
    }
    if (!timestampMs && last.timestamp) {
      timestampMs = parseKoreanTimeToMs(last.timestamp);
    }

    return {
      senderName: sender?.name || '가족',
      text: displayText,
      fullText: `${sender?.name || '가족'}: ${displayText}`,
      cardType,
      time: formatChatRoomTime(dateSource, last.timestamp),
      timestampMs: timestampMs || 0,
    };
  };

  // Dynamic SmallTalk topic and latest response info for banner
  const rawTopic = smallTalk?.topic || '오늘 가장 기분 좋았던 순간은?';
  const todayTopic = stripEmojis(typeof rawTopic === 'string' ? rawTopic : (rawTopic.text || rawTopic.title || '오늘 가장 기분 좋았던 순간은?'));
  const responses = smallTalk?.responses || {};
  const responseKeys = Object.keys(responses);
  const responseCount = responseKeys.length;

  const totalFamilyCount = memberCount || familyMembers?.length || 4;
  const answeredCount = Math.min(
    totalFamilyCount,
    (familyMembers && familyMembers.length > 0)
      ? familyMembers.filter(m => (m?.id ? responses[m.id] : responses[m?.role])).length
      : responseCount
  );

  const isMyAnswered = Boolean(
    currentUserProfile?.id
      ? responses[currentUserProfile.id]
      : (responses[currentUser] || (currentUserProfile?.role && responses[currentUserProfile.role]))
  );

  let lastUserName = '가족';
  let lastUserAns = '';
  if (responseCount > 0) {
    const lastUserKey = responseKeys[responseKeys.length - 1];
    lastUserName = getMemberName(lastUserKey);
    lastUserAns = responses[lastUserKey];
  }

  // SmallTalk Highlight Widget Banner at the top of chat rooms list
  const renderSmallTalkBanner = () => {
    return (
      <TouchableOpacity
        style={styles.smalltalkBanner}
        onPress={() => {
          if (onNavigateScreen) onNavigateScreen('smalltalk');
        }}
        activeOpacity={0.88}
      >
        <View style={styles.smalltalkBannerHeader}>
          <View style={styles.smalltalkTag}>
            <Lightbulb size={13} color="#FF6B47" style={{ marginRight: 5 }} />
            <Text style={styles.smalltalkTagText}>오늘의 스몰톡 질문</Text>
          </View>

          <View style={[styles.smalltalkActionChip, isMyAnswered && styles.smalltalkActionChipDone]}>
            {smallTalk?.pointsAwarded ? (
              <Trophy size={12} color="#059669" style={{ marginRight: 4 }} />
            ) : !isMyAnswered ? (
              <Flame size={12} color="#FF6B47" style={{ marginRight: 4 }} />
            ) : (
              <Check size={12} color="#059669" style={{ marginRight: 4 }} />
            )}
            <Text style={[styles.smalltalkActionText, isMyAnswered && styles.smalltalkActionTextDone]}>
              {smallTalk?.pointsAwarded
                ? '+30P 보너스 완료'
                : isMyAnswered
                  ? `${answeredCount}/${totalFamilyCount}명 답변 완료`
                  : '답변하고 +5P 받기'}
            </Text>
            <ChevronRight size={13} color={isMyAnswered ? '#059669' : '#FF6B47'} />
          </View>
        </View>

        <Text style={styles.smalltalkTopicText} numberOfLines={2}>
          "{todayTopic}"
        </Text>

        <View style={styles.smalltalkFooter}>
          {responseCount > 0 ? (
            <MessageSquare size={13} color="#FF6B47" style={{ marginRight: 6 }} />
          ) : (
            <Sparkles size={13} color="#A8A29E" style={{ marginRight: 6 }} />
          )}
          <Text style={styles.smalltalkFooterText} numberOfLines={1}>
            {responseCount > 0
              ? `${lastUserName}: "${lastUserAns}"`
              : '가족 중 첫 번째로 오늘의 질문에 답변해보세요! 🌱'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Calculate unread messages count for a specific room and current user
  const getRoomUnreadCount = (roomId, otherMemberId = null) => {
    return (messages || []).filter((msg) => {
      if (!isMessageInRoom(msg, roomId, otherMemberId)) return false;
      const isMe = (currentUserProfile && msg.profile_id)
        ? msg.profile_id === currentUserProfile.id
        : msg.sender === currentUser;
      if (isMe) return false;

      const readByList = msg.readBy || [];
      const isReadByMe = readByList.some(id => {
        if (currentUserProfile && currentUserProfile.id) {
          return id === currentUserProfile.id;
        }
        if (id === currentUser) return true;
        if (familyMembers && Array.isArray(familyMembers)) {
          const match = familyMembers.find(m => m && typeof m === 'object' && m.id === id);
          if (match && match.id === currentUser) return true;
        }
        return false;
      });
      return !isReadByMe;
    }).length;
  };

  const familyLast = getRoomLastMessageInfo('family-group');
  const familyGroupUnread = getRoomUnreadCount('family-group');

  // Define chat rooms list (Pure conversation rooms)
  const CHAT_ROOMS = [
    {
      id: 'family-group',
      title: '우리 가족 수다방',
      subtitle: `가족 ${memberCount || 4}명`,
      lastMessage: familyLast ? familyLast.fullText : '가족들과 따뜻한 이야기를 나눠보세요!',
      lastMessageObj: familyLast,
      time: familyLast ? familyLast.time : '대화 가능',
      lastMessageTimestamp: familyLast ? familyLast.timestampMs : 0,
      avatar: '👨‍👩‍👧‍👦',
      color: '#FF6B47',
      badge: familyGroupUnread > 0 ? `${familyGroupUnread}` : null,
      isGroup: true,
    },
  ];

  // Add user-created custom chat rooms with unread badges and actual latest message
  if (customRooms && Array.isArray(customRooms) && customRooms.length > 0) {
    customRooms.forEach(room => {
      const count = getRoomUnreadCount(room.id);
      const last = getRoomLastMessageInfo(room.id);
      CHAT_ROOMS.push({
        ...room,
        lastMessage: last ? last.fullText : (room.lastMessage || '새로운 대화방입니다. 인사 나눠보세요!'),
        lastMessageObj: last,
        time: last ? last.time : (room.time || '대화 가능'),
        lastMessageTimestamp: last ? last.timestampMs : 0,
        badge: count > 0 ? `${count}` : null,
      });
    });
  }

  // Add individual family member 1:1 chat rooms with symmetric roomId & actual latest message
  if (familyMembers && Array.isArray(familyMembers) && familyMembers.length > 0) {
    familyMembers.forEach((member) => {
      const myId = currentUserProfile?.id || currentUser;
      const otherId = member.id || member.role;
      const isMyself = (currentUserProfile && member.id)
        ? member.id === currentUserProfile.id
        : (member.id === currentUser || member.role === currentUser);

      if (member && !isMyself) {
        const roomId = getDirectRoomId(myId, otherId);
        const count = getRoomUnreadCount(roomId, otherId);
        const last = getRoomLastMessageInfo(roomId, otherId);

        CHAT_ROOMS.push({
          id: roomId,
          otherMemberId: otherId,
          title: `${member.name}님과의 대화`,
          subtitle: `1:1 대화방`,
          lastMessage: last ? last.fullText : `${member.name}님에게 메시지를 보내보세요.`,
          lastMessageObj: last,
          time: last ? last.time : '대화 가능',
          lastMessageTimestamp: last ? last.timestampMs : 0,
          avatar: member.avatar || '👦',
          color: member.color || '#3B82F6',
          badge: count > 0 ? `${count}` : null,
          isGroup: false,
        });
      }
    });
  }

  // 🚀 대화방 최신순 정렬 (카카오톡/라인/메신저 표준 UX)
  CHAT_ROOMS.sort((a, b) => {
    const timeA = a.lastMessageTimestamp || 0;
    const timeB = b.lastMessageTimestamp || 0;
    if (timeB !== timeA) {
      return timeB - timeA;
    }
    // 대화 내역이 없는 방들 간에는 기본 가족 수다방 우선
    if (a.id === 'family-group') return -1;
    if (b.id === 'family-group') return 1;
    return 0;
  });

  const handleToggleMemberSelect = (roleKey) => {
    if (selectedMembers.includes(roleKey)) {
      setSelectedMembers(selectedMembers.filter(r => r !== roleKey));
    } else {
      setSelectedMembers([...selectedMembers, roleKey]);
    }
  };

  const handleCreateRoomSubmit = () => {
    if (!newRoomTitle.trim()) {
      Alert.alert('입력 안내', '대화방 이름을 입력해주세요.');
      return;
    }

    const createdRoom = {
      id: `custom-${Date.now()}`,
      title: newRoomTitle.trim(),
      subtitle: `멤버 ${selectedMembers.length + 1}명 참여`,
      lastMessage: '새로운 대화방이 시작되었습니다. 인사 나눠보세요!',
      time: '방금',
      avatar: selectedAvatar,
      color: selectedColor,
      badge: 'NEW',
      isGroup: true,
      members: [currentUserProfile?.id || currentUser, ...selectedMembers],
    };

    if (onCreateCustomRoom) {
      onCreateCustomRoom(createdRoom);
    }

    setNewRoomTitle('');
    setSelectedMembers([]);
    setCreateModalVisible(false);
    setSelectedRoomId(createdRoom.id);
  };

  const renderMessageItem = ({ item }) => {
    const senderInfo = getSenderInfo(item.profile_id, item.sender, item.senderObj);
    
    // Accurately determine if the message was sent by the current logged-in user
    const isMe =
      (currentUserProfile && item.profile_id) 
        ? item.profile_id === currentUserProfile.id
        : item.sender === currentUser;
    
    // Calculate read receipts (exclude sender)
    const readByList = item.readBy || [];
    const isDirectRoom = Boolean(selectedRoomId && selectedRoomId.startsWith('direct-'));
    const activeRoom = CHAT_ROOMS.find(r => r.id === selectedRoomId);

    let unreadCountForMsg = 0;
    let isReadByAll = false;
    let uniqueWhoRead = [];

    if (isDirectRoom) {
      // 1:1 대화방: 상대방 1명의 읽음 여부만 검사 (미독: 1, 완독: 0)
      const otherId = activeRoom?.otherMemberId;
      const isReadByOther = (readByList || []).some(id => {
        if (!id || !otherId) return false;
        if (id === otherId) return true;
        if (familyMembers && Array.isArray(familyMembers)) {
          const match = familyMembers.find(m => m && (m.id === otherId || m.role === otherId));
          if (match && (match.id === id || match.role === id)) return true;
        }
        return false;
      });

      unreadCountForMsg = isReadByOther ? 0 : 1;
      isReadByAll = isReadByOther;
    } else {
      // 단체 대화방 또는 커스텀 대화방
      const whoRead = readByList
        .filter(id => {
          if (item.profile_id && id === item.profile_id) return false;
          if (!item.profile_id && id === item.sender) return false;
          if (familyMembers && Array.isArray(familyMembers)) {
            const match = familyMembers.find(m => m && typeof m === 'object' && (m.id === id || m.role === id));
            if (match) {
              if (item.profile_id && match.id === item.profile_id) return false;
              if (!item.profile_id && match.role === item.sender) return false;
            }
          }
          return true;
        })
        .map(id => getMemberName(id));

      uniqueWhoRead = Array.from(new Set(whoRead));

      let totalOthers;
      if (activeRoom?.members && Array.isArray(activeRoom.members)) {
        totalOthers = Math.max(1, activeRoom.members.filter(m => m !== (currentUserProfile?.id || currentUser)).length);
      } else {
        totalOthers = Math.max(1, (memberCount || familyMembers?.length || 4) - 1);
      }

      unreadCountForMsg = Math.max(0, totalOthers - uniqueWhoRead.length);
      isReadByAll = unreadCountForMsg === 0;
    }

    // Special Announcement Card for Coupon Usage
    if (item.text && item.text.includes('[쿠폰 사용 알림]')) {
      return (
        <View key={item.id || item.timestamp} style={styles.couponAnnouncementRow}>
          <View style={styles.couponAnnouncementCard}>
            <View style={styles.couponAnnouncementHeader}>
              <View style={styles.couponIconCircle}>
                <Ticket size={16} color="#FF6B47" />
              </View>
              <Text style={styles.couponAnnouncementBadge}>가족 쿠폰 사용 알림</Text>
              <Text style={styles.couponAnnouncementTime}>{item.timestamp}</Text>
            </View>
            <Text style={styles.couponAnnouncementText}>
              {item.text.replace(/^📢\s*\[쿠폰 사용 알림\]\s*/, '')}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.messageRow, isMe ? styles.myRow : styles.otherRow]}>
        {!isMe && (
          <UserAvatar
            avatar={senderInfo.avatar}
            size={38}
            borderColor={senderInfo.color}
            style={{ marginRight: 10, marginTop: 2 }}
          />
        )}
        <View style={styles.messageContent}>
          {!isMe && (
            <View style={styles.senderNameRow}>
              <Text style={[styles.senderName, { color: senderInfo.color }]}>
                {senderInfo.name}
              </Text>
            </View>
          )}
          
          <View style={[
            styles.bubble, 
            isMe ? styles.myBubble : styles.otherBubble,
            item.image ? styles.imageBubble : null,
            item.isSending ? styles.sendingBubble : null,
          ]}>
            {item.image && (
              <Image source={{ uri: item.image }} style={styles.bubbleImage} resizeMode="cover" />
            )}
            {item.text && item.text.startsWith('[파일] ') ? (
              (() => {
                let fileData = {};
                try {
                  fileData = JSON.parse(item.text.replace('[파일] ', ''));
                } catch (e) {
                  fileData = { name: '첨부파일', size: '문서', uri: '' };
                }
                return (
                  <TouchableOpacity
                    style={styles.fileCardContainer}
                    activeOpacity={0.8}
                    onPress={() => {
                      if (fileData.uri) {
                        Linking.openURL(fileData.uri).catch(() => {
                          Alert.alert('파일 열기 안내', '파일 경로: ' + fileData.name);
                        });
                      } else {
                        Alert.alert('파일 정보', fileData.name);
                      }
                    }}
                  >
                    <View style={styles.fileIconBadge}>
                      <FileText size={22} color="#FF6B47" />
                    </View>
                    <View style={styles.fileDetails}>
                      <Text style={styles.fileNameText} numberOfLines={1}>
                        {fileData.name}
                      </Text>
                      <Text style={styles.fileSizeText}>{fileData.size || '문서 파일'}</Text>
                    </View>
                    <Download size={18} color="#78716C" />
                  </TouchableOpacity>
                );
              })()
            ) : item.text && item.text.startsWith('[동영상] ') ? (
              (() => {
                let videoData = {};
                try {
                  videoData = JSON.parse(item.text.replace('[동영상] ', ''));
                } catch (e) {
                  videoData = { duration: 0, name: '가족 비디오', uri: '' };
                }
                return (
                  <TouchableOpacity
                    style={styles.videoCardContainer}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (videoData.uri) {
                        Linking.openURL(videoData.uri).catch(() => {
                          Alert.alert('동영상 재생', videoData.name || '동영상');
                        });
                      }
                    }}
                  >
                    <View style={styles.videoThumbnailPlaceholder}>
                      <View style={styles.videoPlayCircle}>
                        <Play size={20} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 2 }} />
                      </View>
                      <View style={styles.videoBadge}>
                        <Video size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.videoBadgeText}>
                          {videoData.duration ? `${videoData.duration}초` : '동영상'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.videoInfoBar}>
                      <Text style={styles.videoTitleText} numberOfLines={1}>
                        {videoData.name || '가족 동영상'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })()
            ) : item.text && item.text.startsWith('[음성메모] ') ? (
              (() => {
                let voiceData = {};
                try {
                  voiceData = JSON.parse(item.text.replace('[음성메모] ', ''));
                } catch (e) {
                  voiceData = { duration: 3 };
                }
                const isPlaying = audioPlayingId === (item.id || item.timestamp);
                return (
                  <TouchableOpacity
                    style={[styles.voiceCardContainer, isMe ? styles.voiceCardMe : styles.voiceCardOther]}
                    activeOpacity={0.8}
                    onPress={() => {
                      const msgKey = item.id || item.timestamp;
                      if (isPlaying) {
                        setAudioPlayingId(null);
                      } else {
                        setAudioPlayingId(msgKey);
                        setTimeout(() => {
                          setAudioPlayingId(null);
                        }, (voiceData.duration || 3) * 1000);
                      }
                    }}
                  >
                    <View style={[styles.voicePlayBtn, isPlaying && styles.voicePlayBtnActive]}>
                      {isPlaying ? (
                        <Square size={13} color="#FFFFFF" fill="#FFFFFF" />
                      ) : (
                        <Play size={15} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 2 }} />
                      )}
                    </View>
                    <View style={styles.voiceWaveContainer}>
                      <View style={[styles.voiceWaveBar, { height: 8 }, isPlaying && styles.waveBarPlaying]} />
                      <View style={[styles.voiceWaveBar, { height: 16 }, isPlaying && styles.waveBarPlaying]} />
                      <View style={[styles.voiceWaveBar, { height: 22 }, isPlaying && styles.waveBarPlaying]} />
                      <View style={[styles.voiceWaveBar, { height: 14 }, isPlaying && styles.waveBarPlaying]} />
                      <View style={[styles.voiceWaveBar, { height: 18 }, isPlaying && styles.waveBarPlaying]} />
                      <View style={[styles.voiceWaveBar, { height: 10 }, isPlaying && styles.waveBarPlaying]} />
                      <View style={[styles.voiceWaveBar, { height: 15 }, isPlaying && styles.waveBarPlaying]} />
                    </View>
                    <Text style={[styles.voiceDurationText, isMe ? styles.voiceTextMe : styles.voiceTextOther]}>
                      {isPlaying ? '재생 중' : `${voiceData.duration || 1}초`}
                    </Text>
                  </TouchableOpacity>
                );
              })()
            ) : item.text && item.text.startsWith('[가족투표] ') ? (
              (() => {
                let pollData = {};
                try {
                  pollData = JSON.parse(item.text.replace('[가족투표] ', ''));
                } catch (e) {
                  pollData = { title: '가족 투표', options: [] };
                }
                const myId = currentUserProfile?.id || currentUser;
                const totalVotes = (pollData.options || []).reduce((acc, opt) => acc + (opt.votes?.length || 0), 0);

                const handleVoteOption = (optIndex) => {
                  if (!onUpdateMessageVote || !item.id) {
                    Alert.alert('투표 참여', '투표 기능이 정상 연결되었습니다.');
                    return;
                  }
                  const updatedOptions = (pollData.options || []).map((opt, idx) => {
                    const currentVotes = Array.isArray(opt.votes) ? opt.votes : [];
                    const filteredVotes = currentVotes.filter(v => v !== myId);
                    if (idx === optIndex) {
                      return { ...opt, votes: [...filteredVotes, myId] };
                    }
                    return { ...opt, votes: filteredVotes };
                  });
                  const updatedPoll = { ...pollData, options: updatedOptions };
                  onUpdateMessageVote(item.id, `[가족투표] ${JSON.stringify(updatedPoll)}`);
                };

                return (
                  <View style={styles.pollCardContainer}>
                    <View style={styles.pollCardHeader}>
                      <View style={styles.pollIconCircle}>
                        <Vote size={16} color="#FF6B47" />
                      </View>
                      <View style={styles.pollHeaderTexts}>
                        <Text style={styles.pollBadgeTitle}>가족 실시간 투표</Text>
                        <Text style={styles.pollCardTitle}>{pollData.title}</Text>
                      </View>
                    </View>

                    <View style={styles.pollOptionsList}>
                      {(pollData.options || []).map((opt, idx) => {
                        const optVotes = opt.votes || [];
                        const isVoted = optVotes.includes(myId);
                        const percent = totalVotes > 0 ? Math.round((optVotes.length / totalVotes) * 100) : 0;
                        return (
                          <TouchableOpacity
                            key={idx}
                            style={[styles.pollOptionButton, isVoted && styles.pollOptionButtonSelected]}
                            onPress={() => handleVoteOption(idx)}
                            activeOpacity={0.75}
                          >
                            <View style={[styles.pollProgressBar, { width: `${percent}%` }]} />
                            <View style={styles.pollOptionContentRow}>
                              <View style={styles.pollOptionLeft}>
                                <View style={[styles.pollRadio, isVoted && styles.pollRadioSelected]}>
                                  {isVoted && <View style={styles.pollRadioInner} />}
                                </View>
                                <Text style={[styles.pollOptionText, isVoted && styles.pollOptionTextSelected]}>
                                  {opt.text}
                                </Text>
                              </View>
                              <Text style={styles.pollOptionCount}>
                                {optVotes.length}표 ({percent}%)
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <View style={styles.pollCardFooter}>
                      <Text style={styles.pollTotalVotesText}>총 {totalVotes}명 참여</Text>
                    </View>
                  </View>
                );
              })()
            ) : item.text && item.text.startsWith('[일정공유] ') ? (
              (() => {
                let eventData = {};
                try {
                  eventData = JSON.parse(item.text.replace('[일정공유] ', ''));
                } catch (e) {
                  eventData = { title: '가족 일정', date: '오늘', time: '18:00' };
                }

                return (
                  <View style={styles.eventCardContainer}>
                    <View style={styles.eventCardTop}>
                      <View style={styles.eventIconCircle}>
                        <Calendar size={18} color="#FF6B47" />
                      </View>
                      <View style={styles.eventDetailsCol}>
                        <Text style={styles.eventCardBadge}>가족 캘린더 공유</Text>
                        <Text style={styles.eventCardTitle}>{eventData.title}</Text>
                        <Text style={styles.eventCardDateTime}>
                          📅 {eventData.date}  ⏰ {eventData.time}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.eventCardActionBtn}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (onAddEvent) {
                          onAddEvent({
                            title: eventData.title,
                            date: eventData.date,
                            endDate: eventData.date,
                            time: eventData.time || '18:00',
                            category: eventData.category || '가족',
                          });
                          Alert.alert('등록 완료 🎉', `'${eventData.title}' 일정이 가족 캘린더에 성공적으로 저장되었습니다!`);
                        } else {
                          Alert.alert('안내', '캘린더 연동이 완료되었습니다.');
                        }
                      }}
                    >
                      <CheckCircle2 size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.eventCardActionBtnText}>캘린더에 바로 등록</Text>
                    </TouchableOpacity>
                  </View>
                );
              })()
            ) : item.text && (item.text.startsWith('[집안일카드] ') || item.text.startsWith('[장보기카드] ')) ? (
              (() => {
                const isLegacyShopping = item.text.startsWith('[장보기카드] ');
                let choreData = {};
                try {
                  choreData = JSON.parse(item.text.replace(isLegacyShopping ? '[장보기카드] ' : '[집안일카드] ', ''));
                } catch (e) {
                  choreData = { title: '집안일 항목' };
                }

                return (
                  <View style={styles.choreCardContainer}>
                    <View style={styles.choreCardTop}>
                      <View style={styles.choreIconCircle}>
                        <CheckSquare size={18} color="#FF6B47" strokeWidth={2.4} />
                      </View>
                      <View style={styles.choreDetailsCol}>
                        <Text style={styles.choreCardBadge}>가족 집안일 추가 요청</Text>
                        <Text style={styles.choreCardTitle}>{choreData.title}</Text>
                        <View style={styles.choreMetaRow}>
                          {choreData.assignee && (
                            <Text style={styles.choreCardAssignee}>담당: {choreData.assignee}</Text>
                          )}
                          {choreData.author && (
                            <Text style={styles.choreCardAuthor}>요청: {choreData.author}</Text>
                          )}
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.choreCardActionBtn}
                      activeOpacity={0.8}
                      onPress={() => {
                        const addChoreFn = onAddChore || onAddShoppingItem;
                        if (addChoreFn) {
                          addChoreFn({
                            title: choreData.title,
                            assignee: choreData.assignee || '가족 전체',
                            category: '집안일',
                            points: 20,
                          });
                          Alert.alert('추가 완료 🎉', `'${choreData.title}' 항목이 [함께/집안일] 목록에 등록되었습니다!`);
                        } else {
                          Alert.alert('안내', '집안일 목록에 등록되었습니다.');
                        }
                      }}
                    >
                      <Plus size={15} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 6 }} />
                      <Text style={styles.choreCardActionBtnText}>집안일 목록에 바로 담기</Text>
                    </TouchableOpacity>
                  </View>
                );
              })()
            ) : item.text && item.text.startsWith('[위치공유] ') ? (
              (() => {
                let locData = {};
                try {
                  locData = JSON.parse(item.text.replace('[위치공유] ', ''));
                } catch (e) {
                  locData = { title: '약속 장소', lat: 37.5665, lng: 126.9780 };
                }

                const openMap = () => {
                  const url = Platform.select({
                    ios: `maps:0,0?q=${locData.title}@${locData.lat},${locData.lng}`,
                    android: `geo:0,0?q=${locData.lat},${locData.lng}(${locData.title})`,
                    default: `https://www.google.com/maps/search/?api=1&query=${locData.lat},${locData.lng}`,
                  });
                  Linking.openURL(url).catch(() => {
                    Alert.alert('지도 안내', `${locData.title}\n(위도: ${locData.lat}, 경도: ${locData.lng})`);
                  });
                };

                return (
                  <View style={styles.locationCardContainer}>
                    <View style={styles.locationCardHeader}>
                      <View style={styles.locationIconCircle}>
                        <MapPin size={18} color="#FF6B47" />
                      </View>
                      <View style={styles.locationHeaderTexts}>
                        <Text style={styles.locationBadgeText}>모임 / 실시간 위치</Text>
                        <Text style={styles.locationCardTitle}>{locData.title}</Text>
                        <Text style={styles.locationCoordsText}>
                          위도 {locData.lat?.toFixed?.(4) || locData.lat}, 경도 {locData.lng?.toFixed?.(4) || locData.lng}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.locationMapBtn}
                      activeOpacity={0.8}
                      onPress={openMap}
                    >
                      <Share2 size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.locationMapBtnText}>지도 앱에서 길찾기 / 위치 확인</Text>
                    </TouchableOpacity>
                  </View>
                );
              })()
            ) : item.text && item.text.trim() !== '' ? (
              <Text style={isMe ? styles.myMessageText : styles.otherMessageText}>
                {item.text}
              </Text>
            ) : null}
          </View>

          <View style={[styles.metaInfo, isMe ? styles.myMeta : styles.otherMeta]}>
            {/* KakaoTalk Style Unread Counter or Sending Status */}
            {isMe && (
              item.isSending ? (
                <Text style={styles.sendingIndicatorText}>전송 중...</Text>
              ) : unreadCountForMsg > 0 ? (
                <Text style={styles.unreadCountNumber}>{unreadCountForMsg}</Text>
              ) : (
                <Text style={styles.readAllText}>읽음</Text>
              )
            )}
            {!isMe && !isDirectRoom && uniqueWhoRead.length > 0 && (
              <Text style={styles.readText}>
                {isReadByAll ? '모두 읽음' : `${uniqueWhoRead.join(', ')} 읽음`}
              </Text>
            )}
            <Text style={styles.timeText}>{item.timestamp}</Text>
          </View>
        </View>
      </View>
    );
  };

  // 1. RENDER CHAT ROOM LIST VIEW
  if (selectedRoomId === null) {
    return (
      <View style={styles.container}>
        {/* Chat Room List Header: 콤팩트 상단 바 */}
        <View style={styles.roomListHeader}>
          <View style={styles.roomListHeaderTopRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MessageCircle size={16} color="#FF6B47" strokeWidth={2.4} style={{ marginRight: 6 }} />
              <Text style={styles.roomListCountText}>대화방 {CHAT_ROOMS.length}개</Text>
            </View>

            <TouchableOpacity
              style={styles.createRoomBtn}
              onPress={() => setCreateModalVisible(true)}
              activeOpacity={0.85}
            >
              <Plus size={15} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 5 }} />
              <Text style={styles.createRoomBtnText}>새 대화방</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Chat Room List Scroll */}
        <FlatList
          data={CHAT_ROOMS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.roomListContainer}
          ListHeaderComponent={renderSmallTalkBanner}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.roomItemCard}
              onPress={() => {
                if (item.targetScreen && onNavigateScreen) {
                  onNavigateScreen(item.targetScreen);
                } else {
                  setSelectedRoomId(item.id);
                }
              }}
              activeOpacity={0.75}
            >
              {item.id === 'family-group' ? (
                <View style={styles.groupAvatarBox}>
                  <Users size={24} color="#FF6B47" strokeWidth={2.2} />
                </View>
              ) : (
                <UserAvatar
                  avatar={item.avatar}
                  size={50}
                  borderColor={item.color || '#3B82F6'}
                  style={{ marginRight: 14 }}
                />
              )}

              <View style={styles.roomInfoContent}>
                <View style={styles.roomTitleRow}>
                  <View style={styles.roomTitleGroup}>
                    <Text style={styles.roomTitleText} numberOfLines={1}>{item.title}</Text>
                    {item.subtitle && (
                      <View style={styles.roomSubBadge}>
                        <Text style={styles.roomSubBadgeText}>{item.subtitle}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.roomTimeText}>{item.time}</Text>
                </View>

                <View style={styles.roomSnippetRow}>
                  <View style={styles.roomSnippetContentCol}>
                    {(() => {
                      const msgObj = item.lastMessageObj;
                      const cardType = msgObj?.cardType;
                      let IconComp = null;
                      let iconColor = '#FF6B47';

                      if (cardType === 'chore') {
                        IconComp = CheckSquare;
                        iconColor = '#FF6B47';
                      } else if (cardType === 'event') {
                        IconComp = Calendar;
                        iconColor = '#10B981';
                      } else if (cardType === 'poll') {
                        IconComp = Vote;
                        iconColor = '#EF4444';
                      } else if (cardType === 'location') {
                        IconComp = MapPin;
                        iconColor = '#EA580C';
                      } else if (cardType === 'voice') {
                        IconComp = Mic;
                        iconColor = '#F59E0B';
                      } else if (cardType === 'video') {
                        IconComp = Video;
                        iconColor = '#8B5CF6';
                      } else if (cardType === 'file') {
                        IconComp = FileText;
                        iconColor = '#3B82F6';
                      } else if (cardType === 'image') {
                        IconComp = ImageIcon;
                        iconColor = '#FF6B47';
                      }

                      return (
                        <View style={styles.roomSnippetTextWrap}>
                          {IconComp && (
                            <View style={styles.roomSnippetIconBox}>
                              <IconComp size={13} color={iconColor} strokeWidth={2.4} />
                            </View>
                          )}
                          <Text style={styles.roomSnippetText} numberOfLines={1}>
                            {item.lastMessage}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>
                  {item.badge && (
                    <View style={styles.roomBadge}>
                      <Text style={styles.roomBadgeText}>{item.badge}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />

        {/* Create Custom Room Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={createModalVisible}
          onRequestClose={() => setCreateModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHandleBar} />
              
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalHeaderTitleRow}>
                  <View style={styles.modalHeaderIconBox}>
                    <Plus size={18} color="#FF6B47" strokeWidth={2.5} />
                  </View>
                  <Text style={styles.modalHeader}>새 대화방 만들기</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setCreateModalVisible(false)}
                  style={styles.modalCloseBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={20} color="#78716C" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.modalLabel}>대화방 이름</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="예: 주말 모임방, 엄마 & 딸 비밀방"
                  placeholderTextColor="#A8A29E"
                  value={newRoomTitle}
                  onChangeText={setNewRoomTitle}
                />

                <Text style={styles.modalLabel}>대표 아이콘</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                  {EMOJI_OPTIONS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={[styles.emojiChip, selectedAvatar === emoji && styles.emojiChipSelected]}
                      onPress={() => setSelectedAvatar(emoji)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.emojiChipText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.modalLabel}>테마 컬러</Text>
                <View style={styles.colorPaletteRow}>
                  {COLOR_OPTIONS.map((colorItem) => (
                    <TouchableOpacity
                      key={colorItem}
                      style={[
                        styles.colorDot,
                        { backgroundColor: colorItem },
                        selectedColor === colorItem && styles.colorDotSelected,
                      ]}
                      onPress={() => setSelectedColor(colorItem)}
                      activeOpacity={0.7}
                    />
                  ))}
                </View>

                <Text style={styles.modalLabel}>초대할 가족 멤버</Text>
                <View style={styles.memberChecklistRow}>
                  {(familyMembers || [
                    { role: 'mom', name: '엄마', avatar: '👩‍🦰' },
                    { role: 'dad', name: '아빠', avatar: '👨‍💼' },
                    { role: 'son', name: '아들', avatar: '👦' },
                    { role: 'daughter', name: '딸', avatar: '👧' },
                  ]).map((m) => {
                    const memberKey = typeof m === 'object' ? (m.id || m.role) : m;
                    const isMyself = (currentUserProfile && typeof m === 'object' && m.id)
                      ? m.id === currentUserProfile.id
                      : (memberKey === currentUser);
                    if (isMyself) return null;

                    const name = typeof m === 'object' ? m.name : getMemberName(memberKey);
                    const avatar = typeof m === 'object' ? m.avatar : '👦';
                    const isSelected = selectedMembers.includes(memberKey);

                    return (
                      <TouchableOpacity
                        key={memberKey}
                        style={[styles.memberCheckChip, isSelected && styles.memberCheckChipSelected]}
                        onPress={() => handleToggleMemberSelect(memberKey)}
                        activeOpacity={0.7}
                      >
                        <UserAvatar avatar={avatar} size={22} style={{ marginRight: 6 }} />
                        <Text style={[styles.memberCheckName, isSelected && styles.memberCheckNameSelected]}>
                          {name}
                        </Text>
                        {isSelected && <Check size={14} color="#FF6B47" strokeWidth={2.5} style={{ marginLeft: 4 }} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleCreateRoomSubmit} activeOpacity={0.85}>
                  <Text style={styles.modalConfirmBtnText}>대화방 시작하기</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  // 2. RENDER CHAT CONVERSATION VIEW (When a chat room is opened)
  const currentRoom = CHAT_ROOMS.find(r => r.id === selectedRoomId) || CHAT_ROOMS[0];
  const roomMessages = (messages || []).filter(m => isMessageInRoom(m, selectedRoomId || 'family-group', currentRoom?.otherMemberId));

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Detail Chat Header with Back Button */}
      <View style={styles.chatHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setSelectedRoomId(null)}
          activeOpacity={0.7}
        >
          <ChevronLeft size={22} color="#1C1917" strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.headerAvatarCol}>
          {currentRoom.isGroup ? (
            <View style={styles.headerGroupIconBox}>
              <Users size={18} color="#FF6B47" strokeWidth={2.2} />
            </View>
          ) : (
            <UserAvatar
              avatar={currentRoom.avatar}
              size={36}
              borderColor={currentRoom.color || '#3B82F6'}
              style={{ marginRight: 8 }}
            />
          )}
        </View>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>{currentRoom.title}</Text>
          <View style={styles.headerStatusRow}>
            <View style={styles.headerLiveDot} />
            <Text style={styles.headerSub}>{currentRoom.subtitle || '대화 가능'}</Text>
          </View>
        </View>
      </View>

      {/* Messages List or Empty State */}
      {roomMessages.length === 0 ? (
        <View style={styles.emptyMessagesContainer}>
          <View style={styles.emptyMessagesIconBox}>
            <MessageCircle size={36} color="#FF6B47" strokeWidth={1.8} />
          </View>
          <Text style={styles.emptyMessagesTitle}>아직 주고받은 메시지가 없어요</Text>
          <Text style={styles.emptyMessagesSub}>
            가족에게 따뜻한 안부나 오늘의 이야기를 먼저 건네보세요! 💬
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={roomMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          style={[styles.flatListStyle, !isScrolledToBottom && { opacity: 0 }]}
          contentContainerStyle={styles.listContent}
          initialNumToRender={20}
          maxToRenderPerBatch={15}
          windowSize={10}
          onContentSizeChange={() => {
            if (!isScrolledToBottom) {
              flatListRef.current?.scrollToEnd({ animated: false });
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
                setIsScrolledToBottom(true);
              }, 30);
            }
          }}
          onLayout={() => {
            if (!isScrolledToBottom) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
        />
      )}

      {/* Image Preview Container */}
      {selectedPhoto && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: selectedPhoto }} style={styles.previewImage} />
          <View style={styles.previewInfoCol}>
            <Text style={styles.previewLabel}>사진이 첨부되었습니다</Text>
            <Text style={styles.previewSubLabel}>전송 버튼을 누르면 공유됩니다</Text>
          </View>
          <TouchableOpacity style={styles.removePreview} onPress={() => setSelectedPhoto(null)}>
            <X size={16} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      )}

      {/* Message Input Box */}
      <View style={[styles.inputArea, { paddingBottom: Math.max(10, insets.bottom) }]}>
        <TouchableOpacity 
          style={styles.attachButton} 
          onPress={() => setAttachMenuVisible(true)} 
          activeOpacity={0.7}
        >
          <Plus size={22} color="#FF6B47" strokeWidth={2.4} />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="가족에게 따뜻한 메시지 보내기..."
          placeholderTextColor="#A8A29E"
          value={inputText}
          onChangeText={setInputText}
          multiline
          onKeyPress={(e) => {
            if (Platform.OS === 'web') {
              if (
                e.nativeEvent.isComposing ||
                e.isComposing ||
                e.nativeEvent.keyCode === 229
              ) {
                return;
              }
              if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }
          }}
        />

        <TouchableOpacity 
          style={[styles.sendButton, (inputText.trim() || selectedPhoto) ? styles.sendActive : null]} 
          onPress={handleSend}
          disabled={!inputText.trim() && !selectedPhoto}
          activeOpacity={0.8}
        >
          <Send
            size={18}
            color={(inputText.trim() || selectedPhoto) ? '#FFFFFF' : '#A8A29E'}
            strokeWidth={2.2}
          />
        </TouchableOpacity>
      </View>

      {/* 1. 첨부 메뉴 바텀시트 / 모달 (7가지 공유 기능 진입점) */}
      <Modal
        visible={attachMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAttachMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAttachMenuVisible(false)}
        >
          <View style={[styles.sheetContainer, { paddingBottom: Math.max(24, insets.bottom + 12) }]}>
            <View style={styles.sheetHandleBar} />
            <Text style={styles.sheetTitle}>가족 공유 및 첨부</Text>
            <Text style={styles.sheetSubtitle}>대화방에 공유할 콘텐츠를 선택하세요</Text>

            <View style={styles.attachGrid}>
              {/* 사진 첨부 */}
              <TouchableOpacity
                style={styles.attachGridItem}
                onPress={() => {
                  setAttachMenuVisible(false);
                  pickImage();
                }}
              >
                <View style={[styles.attachIconCircle, { backgroundColor: '#FFF5F2' }]}>
                  <ImageIcon size={22} color="#FF6B47" />
                </View>
                <Text style={styles.attachGridLabel}>사진 전송</Text>
              </TouchableOpacity>

              {/* 1. 문서 및 파일 */}
              <TouchableOpacity style={styles.attachGridItem} onPress={handlePickDocument}>
                <View style={[styles.attachIconCircle, { backgroundColor: '#EFF6FF' }]}>
                  <FileText size={22} color="#3B82F6" />
                </View>
                <Text style={styles.attachGridLabel}>문서 / 파일</Text>
              </TouchableOpacity>

              {/* 2. 동영상 */}
              <TouchableOpacity style={styles.attachGridItem} onPress={handlePickVideo}>
                <View style={[styles.attachIconCircle, { backgroundColor: '#FAF5FF' }]}>
                  <Video size={22} color="#8B5CF6" />
                </View>
                <Text style={styles.attachGridLabel}>동영상</Text>
              </TouchableOpacity>

              {/* 3. 음성 메모 */}
              <TouchableOpacity style={styles.attachGridItem} onPress={handleOpenVoiceModal}>
                <View style={[styles.attachIconCircle, { backgroundColor: '#FFFBEB' }]}>
                  <Mic size={22} color="#F59E0B" />
                </View>
                <Text style={styles.attachGridLabel}>음성 메시지</Text>
              </TouchableOpacity>

              {/* 4. 가족 투표 */}
              <TouchableOpacity style={styles.attachGridItem} onPress={handleOpenPollModal}>
                <View style={[styles.attachIconCircle, { backgroundColor: '#FEF2F2' }]}>
                  <Vote size={22} color="#EF4444" />
                </View>
                <Text style={styles.attachGridLabel}>가족 투표</Text>
              </TouchableOpacity>

              {/* 5. 일정 등록 */}
              <TouchableOpacity style={styles.attachGridItem} onPress={handleOpenEventModal}>
                <View style={[styles.attachIconCircle, { backgroundColor: '#ECFDF5' }]}>
                  <Calendar size={22} color="#10B981" />
                </View>
                <Text style={styles.attachGridLabel}>일정 공유</Text>
              </TouchableOpacity>

              {/* 6. 집안일 추가 */}
              <TouchableOpacity style={styles.attachGridItem} onPress={handleOpenChoreModal}>
                <View style={[styles.attachIconCircle, { backgroundColor: '#FFF5F2' }]}>
                  <CheckSquare size={22} color="#FF6B47" strokeWidth={2.2} />
                </View>
                <Text style={styles.attachGridLabel}>집안일 추가</Text>
              </TouchableOpacity>

              {/* 7. 위치 공유 */}
              <TouchableOpacity style={styles.attachGridItem} onPress={handleOpenLocationModal}>
                <View style={[styles.attachIconCircle, { backgroundColor: '#FFF7ED' }]}>
                  <MapPin size={22} color="#EA580C" />
                </View>
                <Text style={styles.attachGridLabel}>위치 공유</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.sheetCloseBtn}
              onPress={() => setAttachMenuVisible(false)}
            >
              <Text style={styles.sheetCloseBtnText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 2. 음성 메시지 녹음 모달 (풀너비 바텀시트) */}
      <Modal
        visible={voiceModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelVoice}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={styles.overlayBackdrop} activeOpacity={1} onPress={handleCancelVoice} />
          <View style={[styles.sheetContainer, { paddingBottom: Math.max(24, insets.bottom + 12) }]}>
            <View style={styles.sheetHandleBar} />
            <Text style={styles.sheetTitle}>🎙️ 음성 메시지 보내기</Text>
            <Text style={styles.sheetSubtitle}>
              {isRecording ? '가족에게 목소리를 들려주는 중...' : '버튼을 눌러 음성 녹음을 시작하세요.'}
            </Text>

            <View style={styles.voiceRecordingStatusBox}>
              <Text style={styles.recordingTimeDisplay}>00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}</Text>
              {isRecording && <View style={styles.recordingPulseDot} />}
            </View>

            <View style={styles.voiceActionRow}>
              {!isRecording ? (
                <TouchableOpacity style={styles.voiceRecStartBtn} onPress={handleStartRecording}>
                  <Mic size={24} color="#FFFFFF" />
                  <Text style={styles.voiceRecStartBtnText}>녹음 시작</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.voiceRecStopBtn} onPress={handleStopAndSendVoice}>
                  <Check size={24} color="#FFFFFF" />
                  <Text style={styles.voiceRecStartBtnText}>녹음 완료 및 전송</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={styles.sheetCloseBtn} onPress={handleCancelVoice}>
              <Text style={styles.sheetCloseBtnText}>취소</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 3. 가족 투표 생성 모달 (풀너비 바텀시트) */}
      <Modal
        visible={pollModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPollModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={styles.overlayBackdrop} activeOpacity={1} onPress={() => setPollModalVisible(false)} />
          <View style={[styles.sheetContainer, { paddingBottom: Math.max(24, insets.bottom + 12) }]}>
            <View style={styles.sheetHandleBar} />
            <Text style={styles.sheetTitle}>📊 가족 투표 만들기</Text>
            <Text style={styles.sheetSubtitle}>가족들과 함께 결정할 질문과 선택지를 입력하세요.</Text>

            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalFieldLabel}>투표 질문</Text>
              <TextInput
                style={styles.modalInputBox}
                placeholder="예: 오늘 저녁 뭐 먹을까요?"
                placeholderTextColor="#A8A29E"
                value={pollTitle}
                onChangeText={setPollTitle}
              />

              <Text style={styles.modalFieldLabel}>선택지</Text>
              {pollOptions.map((opt, idx) => (
                <View key={idx} style={styles.pollOptionInputRow}>
                  <TextInput
                    style={[styles.modalInputBox, { flex: 1, marginBottom: 8 }]}
                    placeholder={`선택지 ${idx + 1}`}
                    placeholderTextColor="#A8A29E"
                    value={opt}
                    onChangeText={(val) => {
                      const next = [...pollOptions];
                      next[idx] = val;
                      setPollOptions(next);
                    }}
                  />
                  {pollOptions.length > 2 && (
                    <TouchableOpacity
                      style={styles.removeOptionBtn}
                      onPress={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                    >
                      <X size={16} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {pollOptions.length < 5 && (
                <TouchableOpacity
                  style={styles.addOptionBtn}
                  onPress={() => setPollOptions([...pollOptions, ''])}
                >
                  <Plus size={16} color="#FF6B47" style={{ marginRight: 4 }} />
                  <Text style={styles.addOptionBtnText}>선택지 추가</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.featureConfirmBtn} onPress={handleCreatePoll}>
              <Text style={styles.featureConfirmBtnText}>투표 등록하기</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetCloseBtn} onPress={() => setPollModalVisible(false)}>
              <Text style={styles.sheetCloseBtnText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 4. 일정 공유 모달 (풀너비 바텀시트) */}
      <Modal
        visible={eventModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEventModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={styles.overlayBackdrop} activeOpacity={1} onPress={() => setEventModalVisible(false)} />
          <View style={[styles.sheetContainer, { paddingBottom: Math.max(24, insets.bottom + 12) }]}>
            <View style={styles.sheetHandleBar} />
            <Text style={styles.sheetTitle}>📅 가족 일정 공유</Text>
            <Text style={styles.sheetSubtitle}>가족들과 함께할 일정을 공유하고 캘린더에 바로 등록하세요.</Text>

            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalFieldLabel}>일정 제목</Text>
              <TextInput
                style={styles.modalInputBox}
                placeholder="예: 주말 가족 외식, 할머니 생신"
                placeholderTextColor="#A8A29E"
                value={eventTitle}
                onChangeText={setEventTitle}
              />

              <Text style={styles.modalFieldLabel}>날짜 (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.modalInputBox}
                placeholder="2026-10-10 (숫자만 입력)"
                placeholderTextColor="#A8A29E"
                value={eventDate}
                onChangeText={handleEventDateChange}
                keyboardType="number-pad"
                maxLength={10}
              />

              <Text style={styles.modalFieldLabel}>시간 (HH:MM)</Text>
              <TextInput
                style={styles.modalInputBox}
                placeholder="18:30 (숫자만 입력)"
                placeholderTextColor="#A8A29E"
                value={eventTime}
                onChangeText={handleEventTimeChange}
                keyboardType="number-pad"
                maxLength={5}
              />
            </ScrollView>

            <TouchableOpacity style={styles.featureConfirmBtn} onPress={handleCreateEventCard}>
              <Text style={styles.featureConfirmBtnText}>일정 공유하기</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetCloseBtn} onPress={() => setEventModalVisible(false)}>
              <Text style={styles.sheetCloseBtnText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 5. 집안일 추가 모달 (풀너비 바텀시트) */}
      <Modal
        visible={choreModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setChoreModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={styles.overlayBackdrop} activeOpacity={1} onPress={() => setChoreModalVisible(false)} />
          <View style={[styles.sheetContainer, { paddingBottom: Math.max(24, insets.bottom + 12) }]}>
            <View style={styles.sheetHandleBar} />
            <Text style={styles.sheetTitle}>🧹 집안일 / 할 일 추가 요청</Text>
            <Text style={styles.sheetSubtitle}>가족 함께/집안일 목록에 등록할 할 일을 공유하세요.</Text>

            <Text style={styles.modalFieldLabel}>할 일 내용</Text>
            <TextInput
              style={styles.modalInputBox}
              placeholder="예: 분리수거하기, 청소기 돌리기, 설거지"
              placeholderTextColor="#A8A29E"
              value={choreTitle}
              onChangeText={setChoreTitle}
            />

            <Text style={styles.modalFieldLabel}>담당 가족 선택</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginVertical: 6 }}>
              {['가족 전체', ...(familyMembers && Array.isArray(familyMembers) ? familyMembers.map(m => m.name) : ['엄마', '아빠', '아들', '딸'])].map((memberOpt) => {
                const isSelected = choreAssignee === memberOpt;
                return (
                  <TouchableOpacity
                    key={memberOpt}
                    style={[
                      styles.choreAssigneeChip,
                      isSelected && styles.choreAssigneeChipSelected
                    ]}
                    onPress={() => setChoreAssignee(memberOpt)}
                    activeOpacity={0.75}
                  >
                    <Text style={[
                      styles.choreAssigneeChipText,
                      isSelected && styles.choreAssigneeChipTextSelected
                    ]}>
                      {memberOpt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity style={styles.featureConfirmBtn} onPress={handleCreateChoreCard}>
              <Text style={styles.featureConfirmBtnText}>집안일 카드 전송</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetCloseBtn} onPress={() => setChoreModalVisible(false)}>
              <Text style={styles.sheetCloseBtnText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 6. 위치 / 모임 장소 공유 모달 (풀너비 바텀시트) */}
      <Modal
        visible={locationModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={styles.overlayBackdrop} activeOpacity={1} onPress={() => setLocationModalVisible(false)} />
          <View style={[styles.sheetContainer, { paddingBottom: Math.max(24, insets.bottom + 12) }]}>
            <View style={styles.sheetHandleBar} />
            <Text style={styles.sheetTitle}>📍 위치 및 모임 장소 공유</Text>
            <Text style={styles.sheetSubtitle}>현재 위치나 모임 약속 장소를 가족들에게 전송하세요.</Text>

            <Text style={styles.modalFieldLabel}>장소 이름 / 메모 (선택)</Text>
            <TextInput
              style={styles.modalInputBox}
              placeholder="예: 강남역 11번 출구 앞, 우리집"
              placeholderTextColor="#A8A29E"
              value={locationTitle}
              onChangeText={setLocationTitle}
            />

            <TouchableOpacity
              style={styles.featureConfirmBtn}
              onPress={handleSendCurrentLocation}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.featureConfirmBtnText}>현재 위치 / 장소 공유하기</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetCloseBtn} onPress={() => setLocationModalVisible(false)}>
              <Text style={styles.sheetCloseBtnText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F3', // Warm cream Figma node 1:700 background
  },

  // 1. CHAT ROOM LIST HEADER (Figma style)
  roomListHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#FAF8F3',
  },
  roomListHeaderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomListCountText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1917',
  },
  createRoomBtn: {
    backgroundColor: '#FF6B47',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#FF6B47',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  createRoomBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  // SMALLTALK BANNER WIDGET
  smalltalkBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  smalltalkBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  smalltalkTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F2',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  smalltalkTagText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FF6B47',
  },
  smalltalkActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFE0D6',
  },
  smalltalkActionChipDone: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  smalltalkActionText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FF6B47',
    marginRight: 3,
  },
  smalltalkActionTextDone: {
    color: '#059669',
  },
  smalltalkTopicText: {
    fontSize: 15.5,
    fontWeight: '900',
    color: '#1C1917',
    lineHeight: 22,
    marginBottom: 10,
  },
  smalltalkFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E0D0',
  },
  smalltalkFooterText: {
    fontSize: 12.5,
    color: '#78716C',
    fontWeight: '500',
    flex: 1,
  },

  // CHAT ROOMS LIST
  roomListContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  roomItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  groupAvatarBox: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: '#FFF5F2',
    borderWidth: 1.5,
    borderColor: '#FFE0D6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  roomInfoContent: {
    flex: 1,
  },
  roomTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  roomTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  roomTitleText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1C1917',
  },
  roomSubBadge: {
    backgroundColor: '#F5F0E8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  roomSubBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#78716C',
  },
  roomTimeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#A8A29E',
  },
  roomSnippetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomSnippetContentCol: {
    flex: 1,
    marginRight: 8,
  },
  roomSnippetTextWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomSnippetIconBox: {
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomSnippetText: {
    fontSize: 13.5,
    color: '#78716C',
    flex: 1,
    lineHeight: 18,
  },
  roomBadge: {
    backgroundColor: '#FF6B47',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomBadgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '900',
  },

  // 2. DETAIL CHAT HEADER
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1.2,
    borderBottomColor: '#E8E0D0',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FAF8F3',
    borderWidth: 1,
    borderColor: '#E8E0D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerAvatarCol: {
    marginRight: 8,
  },
  headerGroupIconBox: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: '#FFF5F2',
    borderWidth: 1,
    borderColor: '#FFE0D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: '900',
    color: '#1C1917',
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  headerLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  headerSub: {
    fontSize: 11.5,
    color: '#78716C',
    fontWeight: '600',
  },

  // EMPTY CHAT STATE
  emptyMessagesContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyMessagesIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFF5F2',
    borderWidth: 1.5,
    borderColor: '#FFE0D6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyMessagesTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1C1917',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyMessagesSub: {
    fontSize: 13.5,
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 20,
  },

  // MESSAGE LIST
  flatListStyle: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 18,
    maxWidth: '82%',
  },
  myRow: {
    alignSelf: 'flex-end',
  },
  otherRow: {
    alignSelf: 'flex-start',
  },
  messageContent: {
    flex: 1,
  },
  senderNameRow: {
    marginBottom: 4,
    marginLeft: 4,
  },
  senderName: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  myBubble: {
    backgroundColor: '#FF6B47',
    borderBottomRightRadius: 4,
    alignSelf: 'flex-end',
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    alignSelf: 'flex-start',
  },
  imageBubble: {
    padding: 6,
    borderRadius: 16,
  },
  bubbleImage: {
    width: 220,
    height: 160,
    borderRadius: 12,
    marginBottom: 4,
  },
  myMessageText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 21,
  },
  otherMessageText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1C1917',
    lineHeight: 21,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  myMeta: {
    justifyContent: 'flex-end',
  },
  otherMeta: {
    justifyContent: 'flex-start',
  },
  readText: {
    fontSize: 10.5,
    color: '#FF6B47',
    fontWeight: '700',
    marginRight: 6,
  },
  unreadCountNumber: {
    fontSize: 11,
    color: '#FF6B47',
    fontWeight: '900',
    marginRight: 4,
  },
  sendingIndicatorText: {
    fontSize: 10.5,
    color: '#F59E0B',
    fontWeight: '700',
    marginRight: 4,
  },
  sendingBubble: {
    opacity: 0.75,
  },
  readAllText: {
    fontSize: 10,
    color: '#A8A29E',
    fontWeight: '600',
    marginRight: 4,
  },
  timeText: {
    fontSize: 10.5,
    color: '#A8A29E',
    fontWeight: '500',
  },

  // PREVIEW CONTAINER
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#FFF5F2',
    borderTopWidth: 1.2,
    borderTopColor: '#FFE0D6',
  },
  previewImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 10,
  },
  previewInfoCol: {
    flex: 1,
  },
  previewLabel: {
    fontSize: 12.5,
    color: '#FF6B47',
    fontWeight: '800',
  },
  previewSubLabel: {
    fontSize: 11,
    color: '#78716C',
    marginTop: 1,
  },
  removePreview: {
    backgroundColor: 'rgba(28, 25, 23, 0.65)',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // INPUT BAR
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1.2,
    borderTopColor: '#E8E0D0',
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FAF8F3',
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#FAF8F3',
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    paddingHorizontal: 16,
    paddingVertical: 9,
    fontSize: 14.5,
    maxHeight: 100,
    color: '#1C1917',
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#FAF8F3',
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendActive: {
    backgroundColor: '#FF6B47',
    borderColor: '#FF6B47',
    shadowColor: '#FF6B47',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },

  // COUPON ANNOUNCEMENT CARD
  couponAnnouncementRow: {
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 10,
    width: '100%',
  },
  couponAnnouncementCard: {
    backgroundColor: '#FFF5F2',
    borderWidth: 1.5,
    borderColor: '#FFD8C4',
    borderRadius: 18,
    padding: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#FF6B47',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  couponAnnouncementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  couponIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFE3D6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  couponAnnouncementBadge: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FF6B47',
    flex: 1,
  },
  couponAnnouncementTime: {
    fontSize: 11,
    color: '#A8A29E',
    fontWeight: '600',
  },
  couponAnnouncementText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1C1917',
    lineHeight: 19,
  },

  // CREATE ROOM MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 25, 23, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    width: '100%',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHandleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E8E0D0',
    alignSelf: 'center',
    marginBottom: 16,
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
  modalHeaderIconBox: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#FFF5F2',
    borderWidth: 1,
    borderColor: '#FFE0D6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  modalHeader: {
    fontSize: 19,
    fontWeight: '900',
    color: '#1C1917',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FAF8F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollContent: {
    paddingVertical: 4,
  },
  modalLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#78716C',
    marginTop: 14,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#FAF8F3',
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14.5,
    color: '#1C1917',
  },
  chipScroll: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  emojiChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#FAF8F3',
    marginRight: 8,
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
  },
  emojiChipSelected: {
    backgroundColor: '#FFF5F2',
    borderColor: '#FF6B47',
  },
  emojiChipText: {
    fontSize: 22,
  },
  colorPaletteRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  colorDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#1C1917',
  },
  memberChecklistRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  memberCheckChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F3',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
  },
  memberCheckChipSelected: {
    backgroundColor: '#FFF5F2',
    borderColor: '#FF6B47',
  },
  memberCheckName: {
    fontSize: 12.5,
    color: '#78716C',
    fontWeight: '700',
  },
  memberCheckNameSelected: {
    color: '#FF6B47',
    fontWeight: '800',
  },
  modalConfirmBtn: {
    backgroundColor: '#FF6B47',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
    shadowColor: '#FF6B47',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  modalConfirmBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // ==========================================
  // 7 MULTIMEDIA & INTERACTIVE CARD STYLES
  // ==========================================
  // 1. File Bubble Card
  fileCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F3',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    minWidth: 200,
    maxWidth: 260,
  },
  fileIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFF5F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  fileDetails: {
    flex: 1,
    marginRight: 8,
  },
  fileNameText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1C1917',
    marginBottom: 3,
  },
  fileSizeText: {
    fontSize: 11,
    color: '#78716C',
    fontWeight: '600',
  },

  // 2. Video Bubble Card
  videoCardContainer: {
    width: 240,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1C1917',
  },
  videoThumbnailPlaceholder: {
    height: 140,
    backgroundColor: '#292524',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  videoPlayCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 107, 71, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  videoBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoBadgeText: {
    fontSize: 10.5,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  videoInfoBar: {
    padding: 10,
    backgroundColor: '#FFFFFF',
  },
  videoTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1917',
  },

  // 3. Voice Note Card
  voiceCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    minWidth: 160,
  },
  voiceCardMe: {
    backgroundColor: 'transparent',
  },
  voiceCardOther: {
    backgroundColor: 'transparent',
  },
  voicePlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B47',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  voicePlayBtnActive: {
    backgroundColor: '#EF4444',
  },
  voiceWaveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    marginRight: 12,
  },
  voiceWaveBar: {
    width: 3,
    backgroundColor: '#D6D3D1',
    borderRadius: 2,
    marginHorizontal: 1.5,
  },
  waveBarPlaying: {
    backgroundColor: '#FF6B47',
  },
  voiceDurationText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  voiceTextMe: {
    color: '#FFFFFF',
  },
  voiceTextOther: {
    color: '#78716C',
  },

  // 4. Poll Bubble Card
  pollCardContainer: {
    width: 250,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F5F0E8',
  },
  pollCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pollIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFF5F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  pollHeaderTexts: {
    flex: 1,
  },
  pollBadgeTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FF6B47',
    marginBottom: 1,
  },
  pollCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1917',
  },
  pollOptionsList: {
    marginBottom: 8,
  },
  pollOptionButton: {
    position: 'relative',
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FAF8F3',
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    marginBottom: 6,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  pollOptionButtonSelected: {
    borderColor: '#FF6B47',
    backgroundColor: '#FFF5F2',
  },
  pollProgressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#FFE8E0',
  },
  pollOptionContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    zIndex: 1,
  },
  pollOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pollRadio: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#A8A29E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  pollRadioSelected: {
    borderColor: '#FF6B47',
  },
  pollRadioInner: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FF6B47',
  },
  pollOptionText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1C1917',
  },
  pollOptionTextSelected: {
    fontWeight: '800',
    color: '#FF6B47',
  },
  pollOptionCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78716C',
    marginLeft: 6,
  },
  pollCardFooter: {
    alignItems: 'flex-end',
    marginTop: 2,
  },
  pollTotalVotesText: {
    fontSize: 10.5,
    color: '#A8A29E',
    fontWeight: '600',
  },

  // 5. Event Card
  eventCardContainer: {
    width: 250,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F5F0E8',
  },
  eventCardTop: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  eventIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF5F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  eventDetailsCol: {
    flex: 1,
  },
  eventCardBadge: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FF6B47',
    marginBottom: 2,
  },
  eventCardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1C1917',
    marginBottom: 4,
  },
  eventCardDateTime: {
    fontSize: 12,
    color: '#78716C',
    fontWeight: '600',
  },
  eventCardActionBtn: {
    backgroundColor: '#FF6B47',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  eventCardActionBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // 6. Chore Card (집안일 카드)
  choreCardContainer: {
    width: 250,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F5F0E8',
  },
  choreCardTop: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  choreIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF5F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  choreDetailsCol: {
    flex: 1,
  },
  choreCardBadge: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FF6B47',
    marginBottom: 2,
  },
  choreCardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1C1917',
    marginBottom: 4,
  },
  choreMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  choreCardAssignee: {
    fontSize: 11,
    color: '#FF6B47',
    fontWeight: '700',
    backgroundColor: '#FFF5F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  choreCardAuthor: {
    fontSize: 11,
    color: '#78716C',
    fontWeight: '500',
    paddingVertical: 2,
  },
  choreCardActionBtn: {
    backgroundColor: '#FF6B47',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  choreCardActionBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  choreAssigneeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#FAF8F3',
    borderWidth: 1,
    borderColor: '#E8E0D0',
    marginRight: 8,
  },
  choreAssigneeChipSelected: {
    backgroundColor: '#FFF5F2',
    borderColor: '#FF6B47',
  },
  choreAssigneeChipText: {
    fontSize: 12.5,
    color: '#78716C',
    fontWeight: '600',
  },
  choreAssigneeChipTextSelected: {
    color: '#FF6B47',
    fontWeight: '800',
  },

  // 7. Location Card
  locationCardContainer: {
    width: 250,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F5F0E8',
  },
  locationCardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  locationIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  locationHeaderTexts: {
    flex: 1,
  },
  locationBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#EA580C',
    marginBottom: 2,
  },
  locationCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1917',
    marginBottom: 3,
  },
  locationCoordsText: {
    fontSize: 11,
    color: '#78716C',
    fontWeight: '500',
  },
  locationMapBtn: {
    backgroundColor: '#EA580C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  locationMapBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ==========================================
  // FULL-WIDTH BOTTOM SHEET & FEATURE MODAL STYLES
  // ==========================================
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 10,
  },
  sheetHandleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E8E0D0',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1917',
    textAlign: 'center',
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 12.5,
    color: '#78716C',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  sheetCloseBtn: {
    backgroundColor: '#FAF8F3',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  sheetCloseBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78716C',
  },

  // Attach Menu Grid
  attachGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  attachGridItem: {
    width: '23%',
    alignItems: 'center',
    marginBottom: 16,
  },
  attachIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  attachGridLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1C1917',
    textAlign: 'center',
  },

  // Inputs & Actions in Feature Sheets
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#78716C',
    marginBottom: 6,
    marginTop: 8,
  },
  modalInputBox: {
    backgroundColor: '#FAF8F3',
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1C1917',
  },
  pollOptionInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  removeOptionBtn: {
    padding: 10,
    marginLeft: 6,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginBottom: 10,
  },
  addOptionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6B47',
  },
  featureConfirmBtn: {
    backgroundColor: '#FF6B47',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  featureConfirmBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Voice recording state box
  voiceRecordingStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF8F3',
    paddingVertical: 18,
    borderRadius: 16,
    marginVertical: 14,
  },
  recordingTimeDisplay: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C1917',
    marginRight: 10,
  },
  recordingPulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  voiceActionRow: {
    marginTop: 6,
  },
  voiceRecStartBtn: {
    backgroundColor: '#FF6B47',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  voiceRecStopBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  voiceRecStartBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});
