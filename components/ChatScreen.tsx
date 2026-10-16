import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MessageSquare,
  Sparkles,
  Users,
  Lightbulb,
  Trophy,
  Flame,
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
  BookOpen,
  Truck,
  Copy,
  CornerUpLeft,
  Pin,
  Trash2,
  Reply,
  AlertCircle,
} from 'lucide-react-native';
import UserAvatar from './UserAvatar';
import { colors, typography, commonStyles } from '../theme';
import { stripEmojis } from '../utils/topics';

import {
  parseReplyHeader,
  parsePhotobookOrderData,
  formatChatRoomTime,
  parseKoreanTimeToMs,
} from './chat/chatHelpers';
import ChatAttachmentModals from './chat/ChatAttachmentModals';
import styles from './chat/ChatStyles';

export {
  parseReplyHeader,
  parsePhotobookOrderData,
  formatChatRoomTime,
  parseKoreanTimeToMs,
};

import {
  ChatMessage,
  UserProfile,
  FamilyMember,
  SmallTalkState,
} from '../types/domain';

export interface ChatScreenProps {
  messages?: ChatMessage[];
  currentUser?: any;
  currentUserProfile?: UserProfile | null;
  onSendMessage?: (msg: any) => Promise<void> | void;
  onMarkAsRead?: (roomId?: string) => void;
  memberCount?: number;
  familyMembers?: FamilyMember[];
  smallTalk?: SmallTalkState | any;
  onNavigateScreen?: ((screenName: string, params?: any) => void) | null;
  customRooms?: any[];
  onCreateCustomRoom?: (room: any) => void;
  onAddEvent?: (event: any) => void;
  onAddShoppingItem?: (item: any) => void;
  onAddChore?: (chore: any) => void;
  onUpdateMessageVote?: (msgId: any, voteData: any) => void;
  onDeleteMessage?: (msgId: any, deleteType?: any) => void;
}

export interface ChatRoomItem {
  id: string;
  title: string;
  subtitle: string;
  lastMessage: string;
  lastMessageObj?: any;
  time?: string;
  lastMessageTimestamp?: number;
  avatar?: string;
  color?: string;
  badge?: string | null;
  isGroup: boolean;
  otherMemberId?: string;
  members?: any[];
  [key: string]: any;
}

export default function ChatScreen({
  messages = [],
  currentUser,
  currentUserProfile,
  onSendMessage,
  onMarkAsRead,
  memberCount = 0,
  familyMembers = [],
  smallTalk,
  onNavigateScreen,
  customRooms = [],
  onCreateCustomRoom,
  onAddEvent,
  onAddShoppingItem,
  onAddChore,
  onUpdateMessageVote,
  onDeleteMessage,
}: ChatScreenProps) {
  const insets = useSafeAreaInsets();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null); // null = Chat Room List View, 'family-group' = Group Chat
  const [inputText, setInputText] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const flatListRef = useRef<FlatList<any>>(null);
  const inputRef = useRef<TextInput>(null);
  const isSendingRef = useRef(false);

  // 💬 특정 메시지 인용 답장(Quote Reply) State
  const [replyingTo, setReplyingTo] = useState<{ id: any; senderName?: string; text?: string; image?: string | null } | null>(null);

  // 📋 말풍선 롱프레스 퀵 액션 컨텍스트 메뉴 State
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [selectedMsgForMenu, setSelectedMsgForMenu] = useState<{ item: any; senderInfo: any; isMe: boolean; bubbleText: string } | null>(null);

  // 📌 상단 고정 공지사항 State
  const [pinnedNotice, setPinnedNotice] = useState<any>(null); // { id, text, author, pinnedAt }

  // Load pinned notice for active room (Cloud Truth from messages + AsyncStorage fallback)
  useEffect(() => {
    if (!selectedRoomId) {
      setPinnedNotice(null);
      return;
    }

    // 1. Scan message stream for the latest pinned notice event in this room
    const currentRoomMsgs = (messages || []).filter(m => isMessageInRoom(m, selectedRoomId));
    let latestNoticeEvent: string | null = null;
    for (let i = currentRoomMsgs.length - 1; i >= 0; i--) {
      const msgObj = currentRoomMsgs[i];
      const txt = typeof msgObj?.text === 'string' ? msgObj.text : '';
      if (txt && (txt.startsWith('[공지설정]') || txt.startsWith('[공지해제]'))) {
        latestNoticeEvent = txt;
        break;
      }
    }

    if (latestNoticeEvent) {
      if (latestNoticeEvent.startsWith('[공지설정]')) {
        try {
          const parsed = JSON.parse(latestNoticeEvent.replace(/^\[공지설정\]\s*/, ''));
          setPinnedNotice(parsed);
          AsyncStorage.setItem(`@famlink_pinned_notice_${selectedRoomId}`, JSON.stringify(parsed)).catch(() => {});
          return;
        } catch (_) {}
      } else {
        // [공지해제]
        setPinnedNotice(null);
        AsyncStorage.removeItem(`@famlink_pinned_notice_${selectedRoomId}`).catch(() => {});
        return;
      }
    }

    // 2. Fallback to AsyncStorage if no notice message found in current local stream
    AsyncStorage.getItem(`@famlink_pinned_notice_${selectedRoomId}`).then(res => {
      if (res) {
        try {
          setPinnedNotice(JSON.parse(res));
        } catch (_) {
          setPinnedNotice(null);
        }
      } else {
        setPinnedNotice(null);
      }
    }).catch(() => {});
  }, [selectedRoomId, messages]);

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
  const recordingTimerRef = useRef<any>(null);
  const [audioPlayingId, setAudioPlayingId] = useState<string | number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
  const prevMsgCountRef = useRef(messages?.length || 0);
  const hasUserScrolledRef = useRef(false);
  const initialScrollTimerRef = useRef<any>(null);

  const scrollToBottomSafely = useCallback((animated = false) => {
    if (!flatListRef.current) return;
    flatListRef.current.scrollToEnd({ animated });
    if (Platform.OS === 'web') {
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated });
      });
    }
  }, []);

  // Trigger read receipt update when entering a chat room or receiving new messages in active room
  useEffect(() => {
    if (selectedRoomId !== null && onMarkAsRead) {
      onMarkAsRead(selectedRoomId);
    }
  }, [selectedRoomId, messages?.length]);

  // 대화방 전환 시 즉시 하단 정렬을 위한 상태 리셋 및 단계별 안전 타이머
  useEffect(() => {
    setIsScrolledToBottom(false);
    hasUserScrolledRef.current = false;
    if (initialScrollTimerRef.current) clearTimeout(initialScrollTimerRef.current);

    const t1 = setTimeout(() => {
      if (!hasUserScrolledRef.current) {
        scrollToBottomSafely(false);
      }
    }, 80);

    const t2 = setTimeout(() => {
      if (!hasUserScrolledRef.current) {
        scrollToBottomSafely(false);
      }
      setIsScrolledToBottom(true);
    }, 280);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (initialScrollTimerRef.current) clearTimeout(initialScrollTimerRef.current);
    };
  }, [selectedRoomId, scrollToBottomSafely]);

  // 대화방 진입 후 새로운 메시지가 추가되었을 때만 부드럽게 스크롤
  useEffect(() => {
    if (selectedRoomId !== null && isScrolledToBottom) {
      const currentCount = messages?.length || 0;
      if (currentCount > prevMsgCountRef.current) {
        scrollToBottomSafely(true);
      }
    }
    prevMsgCountRef.current = messages?.length || 0;
  }, [messages?.length, selectedRoomId, isScrolledToBottom, scrollToBottomSafely]);

  // 키보드가 올라올 때 최신 메시지가 가려지지 않도록 하단으로 부드럽게 스크롤
  useEffect(() => {
    if (!selectedRoomId || Platform.OS === 'web') return undefined;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(showEvent, () => {
      setTimeout(() => {
        scrollToBottomSafely(true);
      }, 60);
    });
    return () => sub.remove();
  }, [selectedRoomId, scrollToBottomSafely]);

  // Create Custom Room Modal States
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const DEFAULT_MEMBERS = {
    mom: { name: '엄마', avatar: '👩‍🦰', color: '#FF6B47' },
    dad: { name: '아빠', avatar: '👨‍💼', color: '#3B82F6' },
    son: { name: '아들', avatar: '👦', color: '#10B981' },
    daughter: { name: '딸', avatar: '👧', color: '#F59E0B' },
  };

  const getSenderInfo = (profileIdOrRole?: any, senderRole?: any, senderObj?: any) => {
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
    return (DEFAULT_MEMBERS as Record<string, any>)[roleKey] || { name: (sObj && sObj.name) || roleKey || '가족', avatar: '👦', color: '#78716C' };
  };

  const getMemberName = (keyOrId: any) => {
    if (familyMembers && Array.isArray(familyMembers)) {
      const matchById = familyMembers.find(m => m && typeof m === 'object' && m.id === keyOrId);
      if (matchById) return matchById.name;
      const matchByRole = familyMembers.find(m => m && typeof m === 'object' && m.role === keyOrId);
      if (matchByRole) return matchByRole.name;
    }
    const DEFAULT_NAMES: Record<string, string> = { mom: '엄마', dad: '아빠', son: '아들', daughter: '딸' };
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

    let finalPayloadText = textToSend;
    if (replyingTo) {
      const snippet = (replyingTo.text || (replyingTo.image ? '[사진]' : '메시지'))
        .replace(/[\r\n]+/g, ' ')
        .trim()
        .slice(0, 60);
      const replyData = {
        id: String(replyingTo.id || ''),
        name: String(replyingTo.senderName || '가족'),
        snippet: snippet,
      };
      finalPayloadText = `[답장:${JSON.stringify(replyData)}]\n${textToSend}`;
      setReplyingTo(null);
    }

    if (onSendMessage) {
      onSendMessage({
        text: finalPayloadText,
        image: selectedPhoto,
        roomId: selectedRoomId || 'family-group',
      });
    }

    setInputText('');
    setSelectedPhoto(null);

    setTimeout(() => {
      hasUserScrolledRef.current = false;
      scrollToBottomSafely(true);
    }, 50);
  };

  // Open Context Menu on Message Long Press
  const handleOpenContextMenu = (item: any, senderInfo: any, isMe: boolean, bubbleText: string) => {
    if (!item) return;
    const isDeleted = bubbleText === '[삭제된 메시지입니다]' || item.is_deleted;
    if (isDeleted) return;

    setSelectedMsgForMenu({
      item,
      senderInfo,
      isMe,
      bubbleText,
    });
    setContextMenuVisible(true);
  };

  // Action 1: Copy Text
  const handleCopyMessageText = async () => {
    if (!selectedMsgForMenu) return;
    const textToCopy = selectedMsgForMenu.bubbleText || '';
    if (textToCopy) {
      await Clipboard.setStringAsync(textToCopy);
      Alert.alert('복사 완료 📋', '메시지가 클립보드에 복사되었습니다.');
    }
    setContextMenuVisible(false);
  };

  // Action 2: Trigger Reply
  const handleTriggerReply = () => {
    if (!selectedMsgForMenu) return;
    const replyMeta = parseReplyHeader(selectedMsgForMenu.bubbleText);
    const cleanSnippet = replyMeta ? replyMeta.cleanText : selectedMsgForMenu.bubbleText;

    setReplyingTo({
      id: selectedMsgForMenu.item.id,
      senderName: selectedMsgForMenu.senderInfo.name,
      text: cleanSnippet,
      image: selectedMsgForMenu.item.image,
    });
    setContextMenuVisible(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
  };

  // Action 3: Pin Notice (Sync to Supabase & All Family Devices)
  const handlePinNotice = async () => {
    if (!selectedMsgForMenu || !selectedRoomId) return;
    const replyMeta = parseReplyHeader(selectedMsgForMenu.bubbleText);
    const noticeText = replyMeta ? replyMeta.cleanText : (selectedMsgForMenu.bubbleText || '공지사항');
    const myName = currentUserProfile?.name || getMemberName(currentUser) || '가족';
    const messageAuthor = selectedMsgForMenu.senderInfo?.name || '가족';
    const noticeObj = {
      id: selectedMsgForMenu.item.id,
      text: noticeText,
      author: messageAuthor, // 원본 메시지 작성자 (예: 윤성)
      pinner: myName,        // 공지를 등록한 사람 (예: 윤호)
      pinnedAt: new Date().toISOString(),
    };
    setPinnedNotice(noticeObj);
    try {
      await AsyncStorage.setItem(`@famlink_pinned_notice_${selectedRoomId}`, JSON.stringify(noticeObj));
    } catch (_) {}

    // 🚀 Cloud Realtime Sync: Broadcast & Persist to Supabase messages for all family devices
    if (onSendMessage) {
      onSendMessage({
        text: `[공지설정] ${JSON.stringify(noticeObj)}`,
        roomId: selectedRoomId,
      });
    }

    setContextMenuVisible(false);
    Alert.alert('공지 등록 📌', '가족 대화방 상단에 공지로 고정되었습니다.');
  };

  // Action 4: Unpin Notice (Sync to Supabase & All Family Devices)
  const handleUnpinNotice = async () => {
    setPinnedNotice(null);
    if (selectedRoomId) {
      try {
        await AsyncStorage.removeItem(`@famlink_pinned_notice_${selectedRoomId}`);
      } catch (_) {}

      // 🚀 Cloud Realtime Sync: Broadcast unpin event to all family devices
      if (onSendMessage) {
        onSendMessage({
          text: `[공지해제] ${JSON.stringify({ roomId: selectedRoomId, unpinnedAt: new Date().toISOString() })}`,
          roomId: selectedRoomId,
        });
      }
    }
  };

  // Action 5: Delete Message
  const handleTriggerDelete = () => {
    if (!selectedMsgForMenu) return;
    const targetMsg = selectedMsgForMenu.item;
    const isMe = selectedMsgForMenu.isMe;
    setContextMenuVisible(false);

    if (isMe) {
      Alert.alert(
        '메시지 삭제',
        '삭제 방식을 선택해주세요.',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '모두에게서 삭제 (전송 취소)',
            style: 'destructive',
            onPress: () => {
              if (onDeleteMessage) {
                onDeleteMessage(targetMsg.id, 'all');
              }
            },
          },
          {
            text: '나에게서만 삭제',
            onPress: () => {
              if (onDeleteMessage) {
                onDeleteMessage(targetMsg.id, 'me');
              }
            },
          },
        ]
      );
    } else {
      Alert.alert(
        '메시지 삭제',
        '이 메시지를 내 채팅방에서 삭제하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: () => {
              if (onDeleteMessage) {
                onDeleteMessage(targetMsg.id, 'me');
              }
            },
          },
        ]
      );
    }
  };

  // Scroll to Message ID
  const scrollToMessage = (targetId: any) => {
    if (!targetId || !roomMessages) return;
    const idx = roomMessages.findIndex(m => m.id === targetId);
    if (idx >= 0 && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
    }
  };

  // High-efficiency client-side image compression for chat (downscale to max 1280px, 0.75 quality)
  const compressImageForChat = async (uri: string): Promise<string> => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return new Promise((resolve) => {
        const img = new (window as any).Image();
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
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.75));
          } else {
            resolve(uri);
          }
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

        if (onSendMessage) {
          onSendMessage({
            text: `[파일] ${JSON.stringify(filePayload)}`,
            roomId: selectedRoomId || 'family-group',
          });
        }
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

        if (onSendMessage) {
          onSendMessage({
            text: `[동영상] ${JSON.stringify(videoPayload)}`,
            roomId: selectedRoomId || 'family-group',
          });
        }
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

    if (onSendMessage) {
      onSendMessage({
        text: `[음성메모] ${JSON.stringify(voicePayload)}`,
        roomId: selectedRoomId || 'family-group',
      });
    }
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

    if (onSendMessage) {
      onSendMessage({
        text: `[가족투표] ${JSON.stringify(pollPayload)}`,
        roomId: selectedRoomId || 'family-group',
      });
    }

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
  const handleEventDateChange = (text: string) => {
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
  const handleEventTimeChange = (text: string) => {
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
    if (onSendMessage) {
      onSendMessage({
        text: `[일정공유] ${JSON.stringify(eventPayload)}`,
        roomId: selectedRoomId || 'family-group',
      });
    }

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

    if (onSendMessage) {
      onSendMessage({
        text: `[집안일카드] ${JSON.stringify(chorePayload)}`,
        roomId: selectedRoomId || 'family-group',
      });
    }

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

      if (onSendMessage) {
        onSendMessage({
          text: `[위치공유] ${JSON.stringify(locationPayload)}`,
          roomId: selectedRoomId || 'family-group',
        });
      }

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
      if (onSendMessage) {
        onSendMessage({
          text: `[위치공유] ${JSON.stringify(fallbackPayload)}`,
          roomId: selectedRoomId || 'family-group',
        });
      }
      setLocationModalVisible(false);
      setLocationTitle('');
    }
  };

  // Symmetrical Room ID generator for 1:1 direct chats
  const getDirectRoomId = (myIdOrRole: any, otherIdOrRole: any) => {
    const id1 = String(myIdOrRole || 'me');
    const id2 = String(otherIdOrRole || 'other');
    const sorted = [id1, id2].sort();
    return `direct-${sorted[0]}-${sorted[1]}`;
  };

  // Check if a message belongs to a specific room
  const isMessageInRoom = (msg: any, targetRoomId: string, otherMemberId: any = null) => {
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
  const getMessagePreviewData = (msg: any) => {
    if (!msg) return { text: '', cardType: null };
    if (msg.is_deleted || msg.text === '[삭제된 메시지입니다]') {
      return { text: '삭제된 메시지입니다.', cardType: 'deleted' };
    }
    if (msg.image) return { text: '사진을 공유했습니다.', cardType: 'image' };

    let rawText = '';
    if (typeof msg.text === 'string') {
      rawText = msg.text;
    } else if (typeof msg.text === 'object' && msg.text !== null) {
      if (msg.text.bookTitle) {
        rawText = `[포토북] "${msg.text.bookTitle}" 주문 접수`;
      } else if (msg.text.title) {
        rawText = msg.text.title;
      } else if (msg.text.name) {
        rawText = msg.text.name;
      } else if (msg.text.text) {
        rawText = msg.text.text;
      } else {
        try {
          rawText = JSON.stringify(msg.text);
        } catch {
          rawText = String(msg.text);
        }
      }
    } else if (msg.text != null) {
      rawText = String(msg.text);
    }
    if (!rawText) return { text: '', cardType: null };

    // 0. 삭제된 메시지 체크
    if (rawText === '[삭제된 메시지입니다]') {
      return { text: '삭제된 메시지입니다.', cardType: 'deleted' };
    }

    // 0-1. 특정 메시지 인용 답장 (Quote Reply) 파싱
    const replyMeta = parseReplyHeader(rawText);
    if (replyMeta) {
      const cleanBody = replyMeta.cleanText ? replyMeta.cleanText.replace(/[\r\n]+/g, ' ').trim() : '';
      return {
        text: cleanBody ? `(답장) ${cleanBody}` : `${replyMeta.senderName || '가족'}님에게 답장`,
        cardType: 'reply',
      };
    }

    // 0-2. 상단 공지 설정 / 해제 이벤트
    if (rawText.startsWith('[공지설정]') || rawText.startsWith('[공지설정] ')) {
      try {
        const clean = rawText.replace(/^\[공지설정\]\s*/, '');
        const data = JSON.parse(clean);
        const pinnerName = data.pinner || data.author || '가족';
        return { text: `📌 ${pinnerName}님이 공지를 등록했습니다.`, cardType: 'notice' };
      } catch (_) {
        return { text: '📌 공지가 등록되었습니다.', cardType: 'notice' };
      }
    }
    if (rawText.startsWith('[공지해제]') || rawText.startsWith('[공지해제] ')) {
      return { text: '📌 공지가 해제되었습니다.', cardType: 'notice' };
    }

    // 1. [집안일카드] or [장보기카드]
    if (rawText.startsWith('[집안일카드] ') || rawText.startsWith('[장보기카드] ') || rawText.startsWith('[집안일카드]') || rawText.startsWith('[장보기카드]')) {
      const isLegacy = rawText.includes('[장보기카드]');
      try {
        const data = JSON.parse(rawText.replace(isLegacy ? /^\[장보기카드\]\s*/ : /^\[집안일카드\]\s*/, ''));
        return { text: `집안일: ${data.title || '새 할 일'}`, cardType: 'chore' };
      } catch (e) {
        return { text: '집안일 추가 요청', cardType: 'chore' };
      }
    }

    // 2. [일정공유]
    if (rawText.startsWith('[일정공유] ') || rawText.startsWith('[일정공유]')) {
      try {
        const data = JSON.parse(rawText.replace(/^\[일정공유\]\s*/, ''));
        return { text: `일정: ${data.title || '새 일정'}`, cardType: 'event' };
      } catch (e) {
        return { text: '캘린더 일정 공유', cardType: 'event' };
      }
    }

    // 3. [가족투표]
    if (rawText.startsWith('[가족투표] ') || rawText.startsWith('[가족투표]')) {
      try {
        const data = JSON.parse(rawText.replace(/^\[가족투표\]\s*/, ''));
        return { text: `투표: ${data.title || '새 투표'}`, cardType: 'poll' };
      } catch (e) {
        return { text: '가족 투표 진행 중', cardType: 'poll' };
      }
    }

    // 4. [위치공유]
    if (rawText.startsWith('[위치공유] ') || rawText.startsWith('[위치공유]')) {
      try {
        const data = JSON.parse(rawText.replace(/^\[위치공유\]\s*/, ''));
        return { text: `위치: ${data.title || '모임 장소'}`, cardType: 'location' };
      } catch (e) {
        return { text: '위치 / 모임 장소 공유', cardType: 'location' };
      }
    }

    // 5. [음성메모]
    if (rawText.startsWith('[음성메모] ') || rawText.startsWith('[음성메모]')) {
      try {
        const data = JSON.parse(rawText.replace(/^\[음성메모\]\s*/, ''));
        return { text: `음성 메시지 (${data.duration || 3}초)`, cardType: 'voice' };
      } catch (e) {
        return { text: '음성 메시지', cardType: 'voice' };
      }
    }

    // 6. [동영상]
    if (rawText.startsWith('[동영상] ') || rawText.startsWith('[동영상]')) {
      try {
        const data = JSON.parse(rawText.replace(/^\[동영상\]\s*/, ''));
        return { text: `동영상: ${data.name || '가족 영상'}`, cardType: 'video' };
      } catch (e) {
        return { text: '동영상 공유', cardType: 'video' };
      }
    }

    // 7. [파일]
    if (rawText.startsWith('[파일] ') || rawText.startsWith('[파일]')) {
      try {
        const data = JSON.parse(rawText.replace(/^\[파일\]\s*/, ''));
        return { text: `파일: ${data.name || '문서'}`, cardType: 'file' };
      } catch (e) {
        return { text: '파일 공유', cardType: 'file' };
      }
    }

    // 8. [포토북카드] / 포토북 실물 주문
    const photobookData = parsePhotobookOrderData(rawText);
    if (photobookData) {
      return { text: `포토북 주문: ${photobookData.bookTitle}`, cardType: 'photobook' };
    }

    // 9. 순수 JSON 문자열 안전 파싱 (JSON 객체 형태의 데이터가 문자열로 전달된 경우의 방어 로직)
    const trimmed = rawText.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.bookTitle) return { text: `포토북 주문: ${parsed.bookTitle}`, cardType: 'photobook' };
        if (parsed.title) return { text: parsed.title, cardType: null };
        if (parsed.text) return { text: parsed.text, cardType: null };
        if (parsed.name) return { text: parsed.name, cardType: null };
      } catch (_) {}
    }

    return { text: rawText.replace(/[\r\n]+/g, ' ').trim(), cardType: null };
  };

  // Get last message info for each specific room
  const getRoomLastMessageInfo = (roomId: string, otherMemberId: any = null) => {
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

    const isSystemOrAction = cardType === 'notice' || cardType === 'deleted';
    const fullText = isSystemOrAction ? displayText : `${sender?.name || '가족'}: ${displayText}`;

    return {
      senderName: sender?.name || '가족',
      text: displayText,
      fullText,
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
      ? familyMembers.filter(m => (m?.id && responses[m.id]) || (m?.role && responses[m.role])).length
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
  const getRoomUnreadCount = (roomId: string, otherMemberId: any = null): number => {
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
  const CHAT_ROOMS: ChatRoomItem[] = [
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

  const handleToggleMemberSelect = (roleKey: string) => {
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
      avatar: '💬',
      color: '#FF6B47',
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

  const renderMessageItem = ({ item }: { item: any }) => {
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
      const isReadByOther = (readByList || []).some((id: any) => {
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
        .filter((id: any) => {
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
        .map((id: string) => getMemberName(id));

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

    let bubbleText = '';
    if (typeof item.text === 'string') {
      bubbleText = item.text;
    } else if (typeof item.text === 'object' && item.text !== null) {
      if (item.text.bookTitle) {
        bubbleText =
          `📦 [실물 포토북 양장본 주문 접수]\n` +
          `• 제목: "${item.text.bookTitle}" (${item.text.volume || '1권'})\n` +
          `• 부수: ${item.text.copies ? `${item.text.copies}권` : '1권'}\n` +
          (item.text.pointsUsed ? `• 포인트 할인: -${Number(item.text.pointsUsed).toLocaleString()} P\n` : '') +
          (item.text.totalPrice !== undefined ? `• 최종 결제액: ${Number(item.text.totalPrice).toLocaleString()}원\n` : '') +
          (item.text.recipient ? `• 수령인: ${item.text.recipient}님\n` : '') +
          `정밀 POD 인쇄 제작이 접수되었습니다! 🎉`;
      } else {
        try {
          bubbleText = JSON.stringify(item.text);
        } catch {
          bubbleText = String(item.text);
        }
      }
    } else if (item.text != null) {
      bubbleText = String(item.text);
    }

    const replyMeta = parseReplyHeader(bubbleText);
    const displayBubbleText = replyMeta ? replyMeta.cleanText : bubbleText;
    const isDeleted = bubbleText === '[삭제된 메시지입니다]' || item.is_deleted;

    // 📌 System Pinned Notice Event Message (KakaoTalk centered style)
    if (displayBubbleText.startsWith('[공지설정]') || displayBubbleText.startsWith('[공지해제]')) {
      const isSet = displayBubbleText.startsWith('[공지설정]');
      let noticeData: any = {};
      try {
        noticeData = JSON.parse(displayBubbleText.replace(isSet ? /^\[공지설정\]\s*/ : /^\[공지해제\]\s*/, ''));
      } catch (_) {}

      return (
        <View style={styles.systemNoticeMsgContainer} key={item.id}>
          <View style={styles.systemNoticeMsgBadge}>
            <Pin size={12} color="#78716C" style={{ marginRight: 5 }} />
            <Text style={styles.systemNoticeMsgText}>
              {isSet
                ? `${noticeData.pinner || noticeData.author || '가족'}님이 공지를 등록했습니다.`
                : '공지가 등록 해제되었습니다.'}
            </Text>
          </View>
        </View>
      );
    }

    const photobookOrderData = !isDeleted && (parsePhotobookOrderData(item.text) || parsePhotobookOrderData(displayBubbleText));
    const isCard = Boolean(
      !isDeleted && (
        photobookOrderData ||
        (displayBubbleText && (
          displayBubbleText.startsWith('[파일] ') ||
          displayBubbleText.startsWith('[동영상] ') ||
          displayBubbleText.startsWith('[음성메모] ') ||
          displayBubbleText.startsWith('[가족투표] ') ||
          displayBubbleText.startsWith('[일정공유] ') ||
          displayBubbleText.startsWith('[집안일카드] ') ||
          displayBubbleText.startsWith('[장보기카드] ') ||
          displayBubbleText.startsWith('[위치공유] ')
        ))
      )
    );

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

          <View style={[styles.bubbleWithSideMetaRow, isMe ? styles.myBubbleWithSideMetaRow : styles.otherBubbleWithSideMetaRow]}>
            {/* If isMe: side meta (Unread Count + Timestamp) sits on the LEFT of the bubble */}
            {isMe && (
              <View style={styles.mySideMetaCol}>
                {item.isSending ? (
                  <Text style={styles.sendingIndicatorText}>전송 중...</Text>
                ) : unreadCountForMsg > 0 ? (
                  <Text style={styles.unreadCountBadge}>{unreadCountForMsg}</Text>
                ) : null}
                <Text style={styles.sideTimeText}>{item.timestamp}</Text>
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.9}
              onLongPress={() => {
                if (!isDeleted) {
                  handleOpenContextMenu(item, senderInfo, isMe, displayBubbleText);
                }
              }}
              delayLongPress={300}
              style={[
                styles.bubble, 
                isMe ? styles.myBubble : styles.otherBubble,
                replyMeta && !isDeleted ? styles.bubbleWithReply : null,
                item.image && !isDeleted ? styles.imageBubble : null,
                item.isSending ? styles.sendingBubble : null,
                isCard ? (isMe ? styles.myCardBubble : styles.otherCardBubble) : null,
                isDeleted ? (isMe ? styles.myDeletedBubble : styles.otherDeletedBubble) : null,
              ]}
            >
              {/* Reply Quote Chip inside Bubble */}
              {replyMeta && !isDeleted && (
                <TouchableOpacity
                  style={[styles.replyQuoteChip, isMe ? styles.myReplyQuoteChip : styles.otherReplyQuoteChip]}
                  activeOpacity={0.8}
                  onPress={() => scrollToMessage(replyMeta.replyId)}
                >
                  <View style={[styles.replyQuoteBar, isMe ? styles.myReplyQuoteBar : styles.otherReplyQuoteBar]} />
                  <View style={styles.replyQuoteContentCol}>
                    <Text 
                      style={[styles.replyQuoteAuthor, isMe ? styles.myReplyQuoteAuthor : styles.otherReplyQuoteAuthor]}
                      numberOfLines={1}
                    >
                      💬 {replyMeta.senderName}님에게 답장
                    </Text>
                    <Text 
                      style={[styles.replyQuoteSnippet, isMe ? styles.myReplyQuoteSnippet : styles.otherReplyQuoteSnippet]} 
                      numberOfLines={2}
                    >
                      {replyMeta.snippet || '메시지'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {isDeleted ? (
                <View style={styles.deletedBubbleContent}>
                  <Trash2 size={13} color={isMe ? 'rgba(255,255,255,0.7)' : '#A8A29E'} style={{ marginRight: 5 }} />
                  <Text style={[styles.deletedBubbleText, isMe ? styles.myDeletedBubbleText : styles.otherDeletedBubbleText]}>
                    삭제된 메시지입니다
                  </Text>
                </View>
              ) : (
                <>
                  {item.image && (
                    <Image source={{ uri: item.image }} style={styles.bubbleImage} resizeMode="cover" />
                  )}
            {photobookOrderData ? (
              <View style={styles.photobookCardContainer}>
                <View style={styles.photobookCardTop}>
                  <View style={styles.photobookIconCircle}>
                    <BookOpen size={18} color="#FF6B47" strokeWidth={2.4} />
                  </View>
                  <View style={styles.photobookDetailsCol}>
                    <View style={styles.photobookBadgeRow}>
                      <Text style={styles.photobookCardBadge}>실물 양장본 발주 접수</Text>
                      <Sparkles size={11} color="#FF6B47" />
                    </View>
                    <Text style={styles.photobookCardTitle} numberOfLines={2}>
                      {photobookOrderData.bookTitle}
                    </Text>
                    <Text style={styles.photobookCardSubtitle}>
                      150×210mm A5 · {photobookOrderData.volume || 'Vol. 1'} · {photobookOrderData.copies}
                    </Text>
                  </View>
                </View>

                <View style={styles.photobookSpecsBox}>
                  {photobookOrderData.orderNumber && (
                    <View style={styles.photobookSpecRow}>
                      <Text style={styles.photobookSpecLabel}>주문번호</Text>
                      <Text style={styles.photobookSpecValue}>{photobookOrderData.orderNumber}</Text>
                    </View>
                  )}
                  <View style={styles.photobookSpecRow}>
                    <Text style={styles.photobookSpecLabel}>수령인</Text>
                    <Text style={styles.photobookSpecValue}>{photobookOrderData.recipient}님</Text>
                  </View>
                  {photobookOrderData.pointsUsed > 0 && (
                    <View style={styles.photobookSpecRow}>
                      <Text style={styles.photobookSpecLabel}>교환 포인트</Text>
                      <Text style={[styles.photobookSpecValue, { color: '#FF6B47', fontWeight: '800' }]}>
                        {photobookOrderData.pointsUsed.toLocaleString()} P (전액 교환)
                      </Text>
                    </View>
                  )}
                  {photobookOrderData.totalPrice > 0 ? (
                    <View style={styles.photobookSpecRow}>
                      <Text style={styles.photobookSpecLabel}>결제 금액</Text>
                      <Text style={[styles.photobookSpecValue, { fontWeight: '800', color: '#1C1917' }]}>
                        {photobookOrderData.totalPrice.toLocaleString()}원
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.photobookSpecRow}>
                      <Text style={styles.photobookSpecLabel}>실결제 금액</Text>
                      <Text style={[styles.photobookSpecValue, { fontWeight: '800', color: '#16A34A' }]}>
                        0원 (무료 배송)
                      </Text>
                    </View>
                  )}
                  {photobookOrderData.address ? (
                    <View style={styles.photobookSpecRow}>
                      <Text style={styles.photobookSpecLabel}>배송지</Text>
                      <Text style={styles.photobookSpecValue} numberOfLines={1}>{photobookOrderData.address}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.photobookCardFooter}>
                  <Truck size={13} color="#16A34A" style={{ marginRight: 5 }} />
                  <Text style={styles.photobookCardFooterText}>
                    정밀 POD 인쇄 제작 중 (3~4일 이내 도착)
                  </Text>
                </View>
              </View>
            ) : bubbleText && bubbleText.startsWith('[파일] ') ? (
              (() => {
                let fileData: any = {};
                try {
                  fileData = JSON.parse(bubbleText.replace('[파일] ', ''));
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
            ) : bubbleText.startsWith('[동영상] ') ? (
              (() => {
                let videoData: any = {};
                try {
                  videoData = JSON.parse(bubbleText.replace('[동영상] ', ''));
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
            ) : bubbleText.startsWith('[음성메모] ') ? (
              (() => {
                let voiceData: any = {};
                try {
                  voiceData = JSON.parse(bubbleText.replace('[음성메모] ', ''));
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
            ) : bubbleText.startsWith('[가족투표] ') ? (
              (() => {
                let pollData: any = {};
                try {
                  pollData = JSON.parse(bubbleText.replace('[가족투표] ', ''));
                } catch (e) {
                  pollData = { title: '가족 투표', options: [] };
                }
                const myId = currentUserProfile?.id || currentUser;
                const totalVotes = (pollData.options || []).reduce((acc: number, opt: any) => acc + (opt.votes?.length || 0), 0);

                const handleVoteOption = (optIndex: number) => {
                  if (!onUpdateMessageVote || !item.id) {
                    Alert.alert('투표 참여', '투표 기능이 정상 연결되었습니다.');
                    return;
                  }
                  const updatedOptions = (pollData.options || []).map((opt: any, idx: number) => {
                    const currentVotes = Array.isArray(opt.votes) ? opt.votes : [];
                    const filteredVotes = currentVotes.filter((v: string) => v !== myId);
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
                      {(pollData.options || []).map((opt: any, idx: number) => {
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
            ) : bubbleText.startsWith('[일정공유] ') ? (
              (() => {
                let eventData: any = {};
                try {
                  eventData = JSON.parse(bubbleText.replace('[일정공유] ', ''));
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
            ) : (bubbleText.startsWith('[집안일카드] ') || bubbleText.startsWith('[장보기카드] ')) ? (
              (() => {
                const isLegacyShopping = bubbleText.startsWith('[장보기카드] ');
                let choreData: any = {};
                try {
                  choreData = JSON.parse(bubbleText.replace(isLegacyShopping ? '[장보기카드] ' : '[집안일카드] ', ''));
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
            ) : bubbleText.startsWith('[위치공유] ') ? (
              (() => {
                let locData: any = {};
                try {
                  locData = JSON.parse(bubbleText.replace('[위치공유] ', ''));
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
            ) : displayBubbleText.trim() !== '' ? (
              <Text style={isMe ? styles.myMessageText : styles.otherMessageText}>
                {displayBubbleText}
              </Text>
            ) : null}
                </>
              )}
            </TouchableOpacity>

            {/* If !isMe: side meta (Unread Count + Timestamp) sits on the RIGHT of the bubble */}
            {!isMe && (
              <View style={styles.otherSideMetaCol}>
                {unreadCountForMsg > 0 && (
                  <Text style={styles.unreadCountBadge}>{unreadCountForMsg}</Text>
                )}
                <Text style={styles.sideTimeText}>{item.timestamp}</Text>
              </View>
            )}
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
                      } else if (cardType === 'photobook') {
                        IconComp = BookOpen;
                        iconColor = '#FF6B47';
                      } else if (cardType === 'reply') {
                        IconComp = CornerUpLeft;
                        iconColor = '#FF6B47';
                      } else if (cardType === 'notice') {
                        IconComp = Pin;
                        iconColor = '#D97706';
                      } else if (cardType === 'deleted') {
                        IconComp = Trash2;
                        iconColor = '#A8A29E';
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

                <Text style={styles.modalLabel}>초대할 가족 멤버</Text>
                <View style={styles.memberChecklistRow}>
                  {(familyMembers || [
                    { role: 'mom', name: '엄마', avatar: '👩‍🦰' },
                    { role: 'dad', name: '아빠', avatar: '👨‍💼' },
                    { role: 'son', name: '아들', avatar: '👦' },
                    { role: 'daughter', name: '딸', avatar: '👧' },
                  ]).map((m: any) => {
                    const memberKey = String(typeof m === 'object' ? (m.id || m.role || '') : m);
                    if (!memberKey) return null;
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
    <View style={styles.container}>
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

      {/* Pinned Notice Banner */}
      {pinnedNotice && (
        <View style={styles.pinnedNoticeBanner}>
          <TouchableOpacity
            style={styles.pinnedNoticeLeft}
            activeOpacity={0.8}
            onPress={() => scrollToMessage(pinnedNotice.id)}
          >
            <View style={styles.pinnedNoticeIconBadge}>
              <Pin size={13} color="#FF6B47" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pinnedNoticeTitle}>
                공지 · {pinnedNotice.author ? `${pinnedNotice.author}님의 글` : '가족 공지'}
                {pinnedNotice.pinner && pinnedNotice.pinner !== pinnedNotice.author ? ` (등록: ${pinnedNotice.pinner})` : ''}
              </Text>
              <Text style={styles.pinnedNoticeText} numberOfLines={1}>
                {pinnedNotice.text}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.pinnedNoticeCloseBtn}
            onPress={handleUnpinNotice}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={15} color="#78716C" />
          </TouchableOpacity>
        </View>
      )}

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
          keyboardShouldPersistTaps="handled" 
          renderItem={renderMessageItem}
          style={[styles.flatListStyle, !isScrolledToBottom && { opacity: 0 }]}
          contentContainerStyle={styles.listContent}
          initialNumToRender={Math.max(40, Math.min(roomMessages.length, 120))}
          maxToRenderPerBatch={30}
          windowSize={21}
          onScrollBeginDrag={() => {
            hasUserScrolledRef.current = true;
          }}
          onScrollToIndexFailed={(info) => {
            flatListRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: false,
            });
          }}
          onContentSizeChange={() => {
            if (!hasUserScrolledRef.current) {
              scrollToBottomSafely(false);
              if (initialScrollTimerRef.current) clearTimeout(initialScrollTimerRef.current);
              initialScrollTimerRef.current = setTimeout(() => {
                scrollToBottomSafely(false);
                setIsScrolledToBottom(true);
              }, 80);
            }
          }}
          onLayout={() => {
            if (!hasUserScrolledRef.current) {
              scrollToBottomSafely(false);
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

      {/* Replying-To Quote Preview Bar */}
      {replyingTo && (
        <View style={styles.replyBarContainer}>
          <View style={styles.replyBarLeft}>
            <View style={styles.replyBarIconBox}>
              <CornerUpLeft size={14} color="#FF6B47" strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
              <Text style={styles.replyBarSenderName} numberOfLines={1}>
                {replyingTo.senderName}님에게 답장
              </Text>
              <Text style={styles.replyBarPreviewText} numberOfLines={1}>
                {replyingTo.text || (replyingTo.image ? '사진' : '메시지')}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.replyBarCloseBtn}
            onPress={() => setReplyingTo(null)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={16} color="#78716C" />
          </TouchableOpacity>
        </View>
      )}

      {/* Message Input Box */}
      <View style={styles.inputArea}>
        <TouchableOpacity 
          style={styles.attachButton} 
          onPress={() => setAttachMenuVisible(true)} 
          activeOpacity={0.7}
        >
          <Plus size={22} color="#FF6B47" strokeWidth={2.4} />
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="가족에게 따뜻한 메시지 보내기..."
          placeholderTextColor="#A8A29E"
          value={inputText}
          onChangeText={setInputText}
          multiline
          onKeyPress={(e: any) => {
            if (Platform.OS === 'web') {
              const nativeEvent = e?.nativeEvent || {};
              if (
                nativeEvent.isComposing ||
                e?.isComposing ||
                nativeEvent.keyCode === 229
              ) {
                return;
              }
              if (nativeEvent.key === 'Enter' && !nativeEvent.shiftKey) {
                e?.preventDefault?.();
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

      {/* 1~7. 첨부파일 바텀시트 & 메시지 컨텍스트 메뉴 모달 통합 컴포넌트 */}
      <ChatAttachmentModals
        insetsBottom={insets.bottom}
        attachMenuVisible={attachMenuVisible}
        setAttachMenuVisible={setAttachMenuVisible}
        pickImage={pickImage}
        handlePickDocument={handlePickDocument}
        handlePickVideo={handlePickVideo}
        handleOpenVoiceModal={handleOpenVoiceModal}
        handleOpenPollModal={handleOpenPollModal}
        handleOpenEventModal={handleOpenEventModal}
        handleOpenChoreModal={handleOpenChoreModal}
        handleOpenLocationModal={handleOpenLocationModal}
        voiceModalVisible={voiceModalVisible}
        handleCancelVoice={handleCancelVoice}
        isRecording={isRecording}
        recordingSeconds={recordingSeconds}
        handleStartRecording={handleStartRecording}
        handleStopAndSendVoice={handleStopAndSendVoice}
        pollModalVisible={pollModalVisible}
        setPollModalVisible={setPollModalVisible}
        pollTitle={pollTitle}
        setPollTitle={setPollTitle}
        pollOptions={pollOptions}
        setPollOptions={setPollOptions}
        handleCreatePoll={handleCreatePoll}
        eventModalVisible={eventModalVisible}
        setEventModalVisible={setEventModalVisible}
        eventTitle={eventTitle}
        setEventTitle={setEventTitle}
        eventDate={eventDate}
        handleEventDateChange={handleEventDateChange}
        eventTime={eventTime}
        handleEventTimeChange={handleEventTimeChange}
        handleCreateEventCard={handleCreateEventCard}
        choreModalVisible={choreModalVisible}
        setChoreModalVisible={setChoreModalVisible}
        choreTitle={choreTitle}
        setChoreTitle={setChoreTitle}
        choreAssignee={choreAssignee}
        setChoreAssignee={setChoreAssignee}
        familyMembers={familyMembers}
        handleCreateChoreCard={handleCreateChoreCard}
        locationModalVisible={locationModalVisible}
        setLocationModalVisible={setLocationModalVisible}
        locationTitle={locationTitle}
        setLocationTitle={setLocationTitle}
        locationLoading={locationLoading}
        handleSendCurrentLocation={handleSendCurrentLocation}
        contextMenuVisible={contextMenuVisible}
        setContextMenuVisible={setContextMenuVisible}
        selectedMsgForMenu={selectedMsgForMenu}
        handleCopyMessageText={handleCopyMessageText}
        handleTriggerReply={handleTriggerReply}
        handlePinNotice={handlePinNotice}
        handleTriggerDelete={handleTriggerDelete}
      />
    </View>
  );
}

