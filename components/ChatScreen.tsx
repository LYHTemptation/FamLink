import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Platform,
  Image,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Users,
  Send,
  ChevronLeft,
  Plus,
  X,
  MessageCircle,
  CornerUpLeft,
  Pin,
  Search,
  FolderOpen,
  ArrowDown,
  Edit3,
  Check,
} from 'lucide-react-native';
import UserAvatar from './UserAvatar';
import { stripEmojis } from '../utils/topics';

import {
  parseReplyHeader,
  parsePhotobookOrderData,
  formatChatRoomTime,
  parseKoreanTimeToMs,
  extractReactionsAndCleanText,
  toggleMessageReactionText,
  applyEditedMessageText,
  computeMessageGroupingMeta,
} from './chat/chatHelpers';
import { useChatAttachments } from './chat/useChatAttachments';
import ChatAttachmentModals from './chat/ChatAttachmentModals';
import ChatMessageBubble from './chat/ChatMessageBubble';
import ChatRoomListView from './chat/ChatRoomListView';
import ChatImageViewerModal, { ViewerImageState } from './chat/ChatImageViewerModal';
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

const DEFAULT_MEMBERS: Record<string, { name: string; avatar: string; color: string }> = {
  mom: { name: '엄마', avatar: '👩‍🦰', color: '#FF6B47' },
  dad: { name: '아빠', avatar: '👨‍💼', color: '#3B82F6' },
  son: { name: '아들', avatar: '👦', color: '#10B981' },
  daughter: { name: '딸', avatar: '👧', color: '#F59E0B' },
};

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
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const flatListRef = useRef<FlatList<any>>(null);
  const inputRef = useRef<TextInput>(null);
  const isSendingRef = useRef(false);

  // 💬 특정 메시지 인용 답장(Quote Reply) & ✏️ 메시지 수정(Edit) State
  const [replyingTo, setReplyingTo] = useState<{
    id: any;
    senderName?: string;
    text?: string;
    image?: string | null;
  } | null>(null);
  const [editingMessage, setEditingMessage] = useState<{
    id: string | number;
    rawText: string;
    originalBody: string;
  } | null>(null);

  // 🎯 답장/공지 터치로 스크롤 이동 시 대상 말풍선 하이라이트 State
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | number | null>(
    null
  );
  const highlightTimerRef = useRef<any>(null);

  // 📋 말풍선 롱프레스 퀵 액션 컨텍스트 메뉴 State
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [selectedMsgForMenu, setSelectedMsgForMenu] = useState<{
    item: any;
    senderInfo: any;
    isMe: boolean;
    bubbleText: string;
    readNamesList?: string[];
  } | null>(null);

  // 📌 상단 고정 공지사항 State
  const [pinnedNotice, setPinnedNotice] = useState<any>(null);

  // 🔍 대화방 내 검색 & 🖼️ 사진/파일 서랍 & 전체화면 사진 뷰어 State
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaDrawerVisible, setMediaDrawerVisible] = useState(false);
  const [viewerImage, setViewerImage] = useState<ViewerImageState | null>(null);

  // ↓ 하단 이동 플로팅 버튼 & 새 메시지 토스트 State
  const [showScrollToBottomBtn, setShowScrollToBottomBtn] = useState(false);
  const [latestUnreadToast, setLatestUnreadToast] = useState<string | null>(null);
  const isNearBottomRef = useRef(true);
  const prevMsgCountRef = useRef(messages?.length || 0);

  // Create Custom Room Modal States
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const getSenderInfo = useCallback(
    (profileIdOrRole?: any, senderRole?: any, senderObj?: any) => {
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

      if (sObj && typeof sObj === 'object' && sObj.name) {
        return {
          name: sObj.name,
          avatar: sObj.avatar || '👦',
          color: sObj.color || '#3B82F6',
        };
      }

      if (familyMembers && Array.isArray(familyMembers)) {
        if (pId) {
          const matchById = familyMembers.find(
            (m) => m && typeof m === 'object' && m.id === pId
          );
          if (matchById) {
            return {
              name: matchById.name,
              avatar: matchById.avatar || '👦',
              color: matchById.color || '#3B82F6',
            };
          }
        }
        if (sRole) {
          const matchByRole = familyMembers.find(
            (m) => m && typeof m === 'object' && (m.role === sRole || m.id === sRole)
          );
          if (matchByRole) {
            return {
              name: matchByRole.name,
              avatar: matchByRole.avatar || '👦',
              color: matchByRole.color || '#3B82F6',
            };
          }
        }
      }

      const roleKey = sRole || pId;
      return (
        DEFAULT_MEMBERS[roleKey] || {
          name: (sObj && sObj.name) || roleKey || '가족',
          avatar: '👦',
          color: '#78716C',
        }
      );
    },
    [familyMembers]
  );

  const getMemberName = useCallback(
    (keyOrId: any) => {
      if (familyMembers && Array.isArray(familyMembers)) {
        const matchById = familyMembers.find(
          (m) => m && typeof m === 'object' && m.id === keyOrId
        );
        if (matchById) return matchById.name;
        const matchByRole = familyMembers.find(
          (m) => m && typeof m === 'object' && m.role === keyOrId
        );
        if (matchByRole) return matchByRole.name;
      }
      const DEFAULT_NAMES: Record<string, string> = {
        mom: '엄마',
        dad: '아빠',
        son: '아들',
        daughter: '딸',
      };
      return DEFAULT_NAMES[keyOrId] || keyOrId;
    },
    [familyMembers]
  );

  const myActorName = useMemo(
    () => currentUserProfile?.name || getMemberName(currentUser) || '가족',
    [currentUserProfile?.name, currentUser, getMemberName]
  );

  // 📎 첨부/모달 핸들러 커스텀 훅 연결
  const {
    attachMenuVisible,
    setAttachMenuVisible,
    pickImage,
    takePhotoWithCamera,
    handlePickDocument,
    handlePickVideo,
    handleOpenVoiceModal,
    voiceModalVisible,
    handleCancelVoice,
    isRecording,
    recordingSeconds,
    handleStartRecording,
    handleStopAndSendVoice,
    pollModalVisible,
    setPollModalVisible,
    pollTitle,
    setPollTitle,
    pollOptions,
    setPollOptions,
    handleOpenPollModal,
    handleCreatePoll,
    eventModalVisible,
    setEventModalVisible,
    eventTitle,
    setEventTitle,
    eventDate,
    handleEventDateChange,
    eventTime,
    handleEventTimeChange,
    handleOpenEventModal,
    handleCreateEventCard,
    choreModalVisible,
    setChoreModalVisible,
    choreTitle,
    setChoreTitle,
    choreAssignee,
    setChoreAssignee,
    handleOpenChoreModal,
    handleCreateChoreCard,
    locationModalVisible,
    setLocationModalVisible,
    locationTitle,
    setLocationTitle,
    locationLoading,
    handleOpenLocationModal,
    handleSendCurrentLocation,
    audioPlayingId,
    setAudioPlayingId,
  } = useChatAttachments({
    selectedRoomId,
    currentUser,
    currentUserProfile,
    myActorName,
    onSendMessage,
    onAddEvent,
    setSelectedPhoto,
  });

  const getDirectRoomId = useCallback((myIdOrRole: any, otherIdOrRole: any) => {
    const id1 = String(myIdOrRole || 'me');
    const id2 = String(otherIdOrRole || 'other');
    const sorted = [id1, id2].sort();
    return `direct-${sorted[0]}-${sorted[1]}`;
  }, []);

  const isMessageInRoom = useCallback(
    (msg: any, targetRoomId: string, otherMemberId: any = null) => {
      const mRoom = msg.room_id || 'family-group';
      if (targetRoomId === 'family-group') {
        return mRoom === 'family-group';
      }
      if (targetRoomId.startsWith('direct-')) {
        if (mRoom === targetRoomId) return true;
        if (otherMemberId) {
          const myId = currentUserProfile?.id || currentUser;
          if (mRoom === `direct-${otherMemberId}` || mRoom === `direct-${myId}`) {
            const isBetweenUs =
              msg.profile_id === otherMemberId ||
              msg.profile_id === myId ||
              msg.sender === otherMemberId ||
              msg.sender === myId;
            if (isBetweenUs) return true;
          }
        }
        return false;
      }
      return mRoom === targetRoomId;
    },
    [currentUserProfile?.id, currentUser]
  );

  const scrollToBottomSafely = useCallback((animated = false) => {
    if (!flatListRef.current) return;
    flatListRef.current.scrollToEnd({ animated });
    if (Platform.OS === 'web') {
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated });
      });
    }
    isNearBottomRef.current = true;
    setShowScrollToBottomBtn(false);
    setLatestUnreadToast(null);
  }, []);

  // Load pinned notice for active room
  useEffect(() => {
    if (!selectedRoomId) {
      setPinnedNotice(null);
      setSearchVisible(false);
      setSearchQuery('');
      setEditingMessage(null);
      setReplyingTo(null);
      return;
    }

    const currentRoomMsgs = (messages || []).filter((m) =>
      isMessageInRoom(m, selectedRoomId)
    );
    let latestNoticeEvent: string | null = null;
    for (let i = currentRoomMsgs.length - 1; i >= 0; i--) {
      const msgObj = currentRoomMsgs[i];
      const rawTxt = typeof msgObj?.text === 'string' ? msgObj.text : '';
      const { cleanText: txt } = extractReactionsAndCleanText(rawTxt);
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
          AsyncStorage.setItem(
            `@famlink_pinned_notice_${selectedRoomId}`,
            JSON.stringify(parsed)
          ).catch(() => {});
          return;
        } catch (_) {}
      } else {
        setPinnedNotice(null);
        AsyncStorage.removeItem(`@famlink_pinned_notice_${selectedRoomId}`).catch(
          () => {}
        );
        return;
      }
    }

    AsyncStorage.getItem(`@famlink_pinned_notice_${selectedRoomId}`)
      .then((res) => {
        if (res) {
          try {
            setPinnedNotice(JSON.parse(res));
          } catch (_) {
            setPinnedNotice(null);
          }
        } else {
          setPinnedNotice(null);
        }
      })
      .catch(() => {});
  }, [selectedRoomId, messages, isMessageInRoom]);

  // Trigger read receipt update when entering a chat room or receiving new messages
  useEffect(() => {
    if (selectedRoomId !== null && onMarkAsRead) {
      onMarkAsRead(selectedRoomId);
    }
  }, [selectedRoomId, messages?.length]);

  // 대화방 진입 시 즉시 하단 이동
  useEffect(() => {
    if (!selectedRoomId) return undefined;
    isNearBottomRef.current = true;
    setShowScrollToBottomBtn(false);
    setLatestUnreadToast(null);

    const t1 = setTimeout(() => {
      if (isNearBottomRef.current) {
        scrollToBottomSafely(false);
      }
    }, 50);

    return () => clearTimeout(t1);
  }, [selectedRoomId, scrollToBottomSafely]);

  // 새 메시지 도착 시: 하단 근처면 자동 스크롤, 위로 올려서 읽는 중이면 새 메시지 토스트 표시
  useEffect(() => {
    const currentCount = messages?.length || 0;
    if (selectedRoomId !== null && currentCount > prevMsgCountRef.current) {
      const newestMsg = messages[currentCount - 1];
      if (newestMsg && isMessageInRoom(newestMsg, selectedRoomId)) {
        const isFromMe =
          currentUserProfile && newestMsg.profile_id
            ? newestMsg.profile_id === currentUserProfile.id
            : newestMsg.sender === currentUser;

        if (isNearBottomRef.current || isFromMe) {
          setTimeout(() => scrollToBottomSafely(true), 40);
        } else {
          const sender = getSenderInfo(
            newestMsg.profile_id,
            newestMsg.sender,
            newestMsg.senderObj
          );
          const { cleanText } = extractReactionsAndCleanText(
            typeof newestMsg.text === 'string' ? newestMsg.text : ''
          );
          const snippet =
            cleanText || (newestMsg.image ? '사진을 보냈습니다' : '새 메시지');
          setLatestUnreadToast(`${sender.name}: ${snippet}`);
          setShowScrollToBottomBtn(true);
        }
      }
    }
    prevMsgCountRef.current = currentCount;
  }, [
    messages,
    selectedRoomId,
    currentUserProfile,
    currentUser,
    isMessageInRoom,
    getSenderInfo,
    scrollToBottomSafely,
  ]);

  // 키보드가 올라올 때 최신 메시지가 가려지지 않도록 스크롤
  useEffect(() => {
    if (!selectedRoomId || Platform.OS === 'web') return undefined;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(showEvent, () => {
      if (isNearBottomRef.current) {
        setTimeout(() => {
          scrollToBottomSafely(true);
        }, 60);
      }
    });
    return () => sub.remove();
  }, [selectedRoomId, scrollToBottomSafely]);

  // 언마운트 시 하이라이트 타이머 정리
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  const handleSend = () => {
    const textToSend = inputText.trim();
    if (!textToSend && !selectedPhoto) return;
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    setTimeout(() => {
      isSendingRef.current = false;
    }, 250);

    // ✏️ 메시지 수정 모드인 경우 기존 메시지 텍스트 업데이트
    if (editingMessage && textToSend) {
      if (onUpdateMessageVote) {
        const updatedRawText = applyEditedMessageText(
          editingMessage.rawText,
          textToSend
        );
        onUpdateMessageVote(editingMessage.id, updatedRawText);
      }
      setEditingMessage(null);
      setInputText('');
      return;
    }

    let finalPayloadText = textToSend;
    if (replyingTo) {
      const snippet = (replyingTo.text || (replyingTo.image ? '[사진]' : '메시지'))
        .replace(/[\r\n]+/g, ' ')
        .trim()
        .slice(0, 60);
      const replyData = {
        id: String(replyingTo.id || ''),
        name: String(replyingTo.senderName || '가족'),
        snippet,
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
      scrollToBottomSafely(true);
    }, 50);
  };

  // 메시지 공감(이모지 리액션) 토글 핸들러
  const handleToggleReaction = useCallback(
    (messageId: string | number, rawText: string, emoji: string) => {
      if (!onUpdateMessageVote || !messageId) return;
      const updatedText = toggleMessageReactionText(rawText, emoji, myActorName);
      onUpdateMessageVote(messageId, updatedText);
    },
    [onUpdateMessageVote, myActorName]
  );

  const handleToggleReactionFromMenu = useCallback(
    (emoji: string) => {
      if (!selectedMsgForMenu?.item?.id) return;
      const rawTxt =
        typeof selectedMsgForMenu.item.text === 'string'
          ? selectedMsgForMenu.item.text
          : '';
      handleToggleReaction(selectedMsgForMenu.item.id, rawTxt, emoji);
      setContextMenuVisible(false);
    },
    [selectedMsgForMenu, handleToggleReaction]
  );

  // Open Context Menu on Message Long Press
  const handleLongPressBubble = useCallback(
    (payload: {
      item: any;
      isMe: boolean;
      bubbleText: string;
      senderInfo: any;
      readNamesList?: string[];
    }) => {
      const { item, isMe, bubbleText, senderInfo, readNamesList } = payload;
      if (!item) return;
      const isDeleted = bubbleText === '[삭제된 메시지입니다]' || item.is_deleted;
      if (isDeleted) return;

      setSelectedMsgForMenu({
        item,
        senderInfo,
        isMe,
        bubbleText,
        readNamesList,
      });
      setContextMenuVisible(true);
    },
    []
  );

  const handleCopyMessageText = async () => {
    if (!selectedMsgForMenu) return;
    const textToCopy = selectedMsgForMenu.bubbleText || '';
    if (textToCopy) {
      await Clipboard.setStringAsync(textToCopy);
      Alert.alert('복사 완료 📋', '메시지가 클립보드에 복사되었습니다.');
    }
    setContextMenuVisible(false);
  };

  const handleTriggerReply = () => {
    if (!selectedMsgForMenu) return;
    const replyMeta = parseReplyHeader(selectedMsgForMenu.bubbleText);
    const cleanSnippet = replyMeta
      ? replyMeta.cleanText
      : selectedMsgForMenu.bubbleText;

    setEditingMessage(null);
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

  // 내가 보낸 메시지 수정 모드 진입
  const handleTriggerEdit = () => {
    if (!selectedMsgForMenu?.item?.id) return;
    const rawTxt =
      typeof selectedMsgForMenu.item.text === 'string'
        ? selectedMsgForMenu.item.text
        : '';
    const replyMeta = parseReplyHeader(selectedMsgForMenu.bubbleText);
    const bodyToEdit = replyMeta
      ? replyMeta.cleanText
      : selectedMsgForMenu.bubbleText;

    setReplyingTo(null);
    setEditingMessage({
      id: selectedMsgForMenu.item.id,
      rawText: rawTxt,
      originalBody: bodyToEdit,
    });
    setInputText(bodyToEdit);
    setContextMenuVisible(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
  };

  const handlePinNotice = async () => {
    if (!selectedMsgForMenu || !selectedRoomId) return;
    const replyMeta = parseReplyHeader(selectedMsgForMenu.bubbleText);
    const noticeText = replyMeta
      ? replyMeta.cleanText
      : selectedMsgForMenu.bubbleText || '공지사항';
    const messageAuthor = selectedMsgForMenu.senderInfo?.name || '가족';
    const noticeObj = {
      id: selectedMsgForMenu.item.id,
      text: noticeText,
      author: messageAuthor,
      pinner: myActorName,
      pinnedAt: new Date().toISOString(),
    };
    setPinnedNotice(noticeObj);
    try {
      await AsyncStorage.setItem(
        `@famlink_pinned_notice_${selectedRoomId}`,
        JSON.stringify(noticeObj)
      );
    } catch (_) {}

    if (onSendMessage) {
      onSendMessage({
        text: `[공지설정] ${JSON.stringify(noticeObj)}`,
        roomId: selectedRoomId,
      });
    }

    setContextMenuVisible(false);
    Alert.alert('공지 등록 📌', '가족 대화방 상단에 공지로 고정되었습니다.');
  };

  const handleUnpinNotice = async () => {
    setPinnedNotice(null);
    if (selectedRoomId) {
      try {
        await AsyncStorage.removeItem(`@famlink_pinned_notice_${selectedRoomId}`);
      } catch (_) {}

      if (onSendMessage) {
        onSendMessage({
          text: `[공지해제] ${JSON.stringify({
            roomId: selectedRoomId,
            unpinnedAt: new Date().toISOString(),
          })}`,
          roomId: selectedRoomId,
        });
      }
    }
  };

  const handleTriggerDelete = () => {
    if (!selectedMsgForMenu) return;
    const targetMsg = selectedMsgForMenu.item;
    const isMe = selectedMsgForMenu.isMe;
    setContextMenuVisible(false);

    if (isMe) {
      Alert.alert('메시지 삭제', '삭제 방식을 선택해주세요.', [
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
      ]);
    } else {
      Alert.alert('메시지 삭제', '이 메시지를 내 채팅방에서 삭제하시겠습니까?', [
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
      ]);
    }
  };

  // Format message text for chat room preview
  const getMessagePreviewData = useCallback((msg: any) => {
    if (!msg) return { text: '', cardType: null };
    if (msg.is_deleted || msg.text === '[삭제된 메시지입니다]') {
      return { text: '삭제된 메시지입니다.', cardType: 'deleted' };
    }
    if (msg.image) return { text: '사진을 공유했습니다.', cardType: 'image' };

    let rawInput = '';
    if (typeof msg.text === 'string') {
      rawInput = msg.text;
    } else if (typeof msg.text === 'object' && msg.text !== null) {
      if (msg.text.bookTitle) {
        rawInput = `[포토북] "${msg.text.bookTitle}" 주문 접수`;
      } else if (msg.text.title) {
        rawInput = msg.text.title;
      } else if (msg.text.name) {
        rawInput = msg.text.name;
      } else if (msg.text.text) {
        rawInput = msg.text.text;
      } else {
        try {
          rawInput = JSON.stringify(msg.text);
        } catch {
          rawInput = String(msg.text);
        }
      }
    } else if (msg.text != null) {
      rawInput = String(msg.text);
    }

    const { cleanText: rawText } = extractReactionsAndCleanText(rawInput);
    if (!rawText) return { text: '', cardType: null };

    if (rawText === '[삭제된 메시지입니다]') {
      return { text: '삭제된 메시지입니다.', cardType: 'deleted' };
    }

    if (rawText.startsWith('[방생성]')) {
      return { text: '새로운 대화방이 시작되었습니다.', cardType: 'notice' };
    }

    const replyMeta = parseReplyHeader(rawText);
    if (replyMeta) {
      const cleanBody = replyMeta.cleanText
        ? replyMeta.cleanText.replace(/[\r\n]+/g, ' ').trim()
        : '';
      return {
        text: cleanBody
          ? `(답장) ${cleanBody}`
          : `${replyMeta.senderName || '가족'}님에게 답장`,
        cardType: 'reply',
      };
    }

    if (rawText.startsWith('[공지설정]')) {
      try {
        const clean = rawText.replace(/^\[공지설정\]\s*/, '');
        const data = JSON.parse(clean);
        const pinnerName = data.pinner || data.author || '가족';
        return { text: `📌 ${pinnerName}님이 공지를 등록했습니다.`, cardType: 'notice' };
      } catch (_) {
        return { text: '📌 공지가 등록되었습니다.', cardType: 'notice' };
      }
    }
    if (rawText.startsWith('[공지해제]')) {
      return { text: '📌 공지가 해제되었습니다.', cardType: 'notice' };
    }

    if (rawText.startsWith('[집안일카드]') || rawText.startsWith('[장보기카드]')) {
      const isLegacy = rawText.includes('[장보기카드]');
      try {
        const data = JSON.parse(
          rawText.replace(isLegacy ? /^\[장보기카드\]\s*/ : /^\[집안일카드\]\s*/, '')
        );
        return { text: `집안일: ${data.title || '새 할 일'}`, cardType: 'chore' };
      } catch (_) {
        return { text: '집안일 추가 요청', cardType: 'chore' };
      }
    }

    if (rawText.startsWith('[일정공유]')) {
      try {
        const data = JSON.parse(rawText.replace(/^\[일정공유\]\s*/, ''));
        return { text: `일정: ${data.title || '새 일정'}`, cardType: 'event' };
      } catch (_) {
        return { text: '캘린더 일정 공유', cardType: 'event' };
      }
    }

    if (rawText.startsWith('[가족투표]')) {
      try {
        const data = JSON.parse(rawText.replace(/^\[가족투표\]\s*/, ''));
        return { text: `투표: ${data.title || '새 투표'}`, cardType: 'poll' };
      } catch (_) {
        return { text: '가족 투표 진행 중', cardType: 'poll' };
      }
    }

    if (rawText.startsWith('[위치공유]')) {
      try {
        const data = JSON.parse(rawText.replace(/^\[위치공유\]\s*/, ''));
        return { text: `위치: ${data.title || '모임 장소'}`, cardType: 'location' };
      } catch (_) {
        return { text: '위치 / 모임 장소 공유', cardType: 'location' };
      }
    }

    if (rawText.startsWith('[음성메모]')) {
      try {
        const data = JSON.parse(rawText.replace(/^\[음성메모\]\s*/, ''));
        return { text: `음성 메시지 (${data.duration || 3}초)`, cardType: 'voice' };
      } catch (_) {
        return { text: '음성 메시지', cardType: 'voice' };
      }
    }

    if (rawText.startsWith('[동영상]')) {
      try {
        const data = JSON.parse(rawText.replace(/^\[동영상\]\s*/, ''));
        return { text: `동영상: ${data.name || '가족 영상'}`, cardType: 'video' };
      } catch (_) {
        return { text: '동영상 공유', cardType: 'video' };
      }
    }

    if (rawText.startsWith('[파일]')) {
      try {
        const data = JSON.parse(rawText.replace(/^\[파일\]\s*/, ''));
        return { text: `파일: ${data.name || '문서'}`, cardType: 'file' };
      } catch (_) {
        return { text: '파일 공유', cardType: 'file' };
      }
    }

    const photobookData = parsePhotobookOrderData(rawText);
    if (photobookData) {
      return { text: `포토북 주문: ${photobookData.bookTitle}`, cardType: 'photobook' };
    }

    const trimmed = rawText.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.bookTitle) {
          return { text: `포토북 주문: ${parsed.bookTitle}`, cardType: 'photobook' };
        }
        if (parsed.title) return { text: parsed.title, cardType: null };
        if (parsed.text) return { text: parsed.text, cardType: null };
        if (parsed.name) return { text: parsed.name, cardType: null };
      } catch (_) {}
    }

    return { text: rawText.replace(/[\r\n]+/g, ' ').trim(), cardType: null };
  }, []);

  // ⚡ useMemo: 대화방 리스트 및 미독 카운트 메모이제이션 + 메시지 스트림 기반 커스텀 대화방 실시간 자동 복원
  const CHAT_ROOMS: ChatRoomItem[] = useMemo(() => {
    const getRoomLastMessageInfo = (roomId: string, otherMemberId: any = null) => {
      const roomMsgs = (messages || []).filter((m) =>
        isMessageInRoom(m, roomId, otherMemberId)
      );
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
      const fullText = isSystemOrAction
        ? displayText
        : `${sender?.name || '가족'}: ${displayText}`;

      return {
        senderName: sender?.name || '가족',
        text: displayText,
        fullText,
        cardType,
        time: formatChatRoomTime(dateSource, last.timestamp),
        timestampMs: timestampMs || 0,
      };
    };

    const getRoomUnreadCount = (roomId: string, otherMemberId: any = null): number => {
      return (messages || []).filter((msg) => {
        if (!isMessageInRoom(msg, roomId, otherMemberId)) return false;
        const isMe =
          currentUserProfile && msg.profile_id
            ? msg.profile_id === currentUserProfile.id
            : msg.sender === currentUser;
        if (isMe) return false;

        const readByList = msg.readBy || [];
        const isReadByMe = readByList.some((id) => {
          if (currentUserProfile && currentUserProfile.id) {
            return id === currentUserProfile.id;
          }
          if (id === currentUser) return true;
          if (familyMembers && Array.isArray(familyMembers)) {
            const match = familyMembers.find(
              (m) => m && typeof m === 'object' && m.id === id
            );
            if (match && match.id === currentUser) return true;
          }
          return false;
        });
        return !isReadByMe;
      }).length;
    };

    const familyLast = getRoomLastMessageInfo('family-group');
    const familyGroupUnread = getRoomUnreadCount('family-group');

    const rooms: ChatRoomItem[] = [
      {
        id: 'family-group',
        title: '우리 가족 수다방',
        subtitle: `가족 ${memberCount || 4}명`,
        lastMessage: familyLast
          ? familyLast.fullText
          : '가족들과 따뜻한 이야기를 나눠보세요!',
        lastMessageObj: familyLast,
        time: familyLast ? familyLast.time : '대화 가능',
        lastMessageTimestamp: familyLast ? familyLast.timestampMs : 0,
        avatar: '👨‍👩‍👧‍👦',
        color: '#FF6B47',
        badge: familyGroupUnread > 0 ? `${familyGroupUnread}` : null,
        isGroup: true,
      },
    ];

    // 로컬 customRooms + 다른 가족이 생성해 메시지 스트림([방생성])으로 수신된 커스텀 방 병합
    const mergedCustomRoomsMap = new Map<string, any>();
    if (customRooms && Array.isArray(customRooms)) {
      customRooms.forEach((r) => {
        if (r?.id) mergedCustomRoomsMap.set(r.id, r);
      });
    }
    (messages || []).forEach((msg) => {
      const rId = msg?.room_id;
      if (!rId || !rId.startsWith('custom-')) return;
      const rawTxt = typeof msg.text === 'string' ? msg.text : '';
      const { cleanText } = extractReactionsAndCleanText(rawTxt);
      if (cleanText.startsWith('[방생성]')) {
        try {
          const parsedRoom = JSON.parse(cleanText.replace(/^\[방생성\]\s*/, ''));
          if (parsedRoom?.id) {
            mergedCustomRoomsMap.set(parsedRoom.id, parsedRoom);
            return;
          }
        } catch (_) {}
      }
      if (!mergedCustomRoomsMap.has(rId)) {
        mergedCustomRoomsMap.set(rId, {
          id: rId,
          title: '가족 커스텀 대화방',
          subtitle: '가족 그룹방',
          avatar: '💬',
          color: '#FF6B47',
          isGroup: true,
        });
      }
    });

    mergedCustomRoomsMap.forEach((room) => {
      const count = getRoomUnreadCount(room.id);
      const last = getRoomLastMessageInfo(room.id);
      rooms.push({
        ...room,
        lastMessage: last
          ? last.fullText
          : room.lastMessage || '새로운 대화방입니다. 인사 나눠보세요!',
        lastMessageObj: last,
        time: last ? last.time : room.time || '대화 가능',
        lastMessageTimestamp: last ? last.timestampMs : 0,
        badge: count > 0 ? `${count}` : null,
      });
    });

    if (familyMembers && Array.isArray(familyMembers) && familyMembers.length > 0) {
      familyMembers.forEach((member) => {
        const myId = currentUserProfile?.id || currentUser;
        const otherId = member.id || member.role;
        const isMyself =
          currentUserProfile && member.id
            ? member.id === currentUserProfile.id
            : member.id === currentUser || member.role === currentUser;

        if (member && !isMyself) {
          const roomId = getDirectRoomId(myId, otherId);
          const count = getRoomUnreadCount(roomId, otherId);
          const last = getRoomLastMessageInfo(roomId, otherId);

          rooms.push({
            id: roomId,
            otherMemberId: otherId,
            title: `${member.name}님과의 대화`,
            subtitle: '1:1 대화방',
            lastMessage: last
              ? last.fullText
              : `${member.name}님에게 메시지를 보내보세요.`,
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

    rooms.sort((a, b) => {
      const timeA = a.lastMessageTimestamp || 0;
      const timeB = b.lastMessageTimestamp || 0;
      if (timeB !== timeA) return timeB - timeA;
      if (a.id === 'family-group') return -1;
      if (b.id === 'family-group') return 1;
      return 0;
    });

    return rooms;
  }, [
    messages,
    customRooms,
    familyMembers,
    currentUserProfile,
    currentUser,
    memberCount,
    isMessageInRoom,
    getSenderInfo,
    getMessagePreviewData,
    getDirectRoomId,
  ]);

  // Dynamic SmallTalk topic and latest response info for banner
  const rawTopic = smallTalk?.topic || '오늘 가장 기분 좋았던 순간은?';
  const todayTopic = stripEmojis(
    typeof rawTopic === 'string'
      ? rawTopic
      : rawTopic.text || rawTopic.title || '오늘 가장 기분 좋았던 순간은?'
  );
  const responses = smallTalk?.responses || {};
  const responseKeys = Object.keys(responses);
  const responseCount = responseKeys.length;

  const totalFamilyCount = memberCount || familyMembers?.length || 4;
  const answeredCount = Math.min(
    totalFamilyCount,
    familyMembers && familyMembers.length > 0
      ? familyMembers.filter(
          (m) => (m?.id && responses[m.id]) || (m?.role && responses[m.role])
        ).length
      : responseCount
  );

  const isMyAnswered = Boolean(
    currentUserProfile?.id
      ? responses[currentUserProfile.id]
      : responses[currentUser] ||
          (currentUserProfile?.role && responses[currentUserProfile.role])
  );

  let lastUserName = '가족';
  let lastUserAns = '';
  if (responseCount > 0) {
    const lastUserKey = responseKeys[responseKeys.length - 1];
    lastUserName = getMemberName(lastUserKey);
    lastUserAns = responses[lastUserKey];
  }

  const handleToggleMemberSelect = (roleKey: string) => {
    if (selectedMembers.includes(roleKey)) {
      setSelectedMembers(selectedMembers.filter((r) => r !== roleKey));
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

  // 현재 선택된 방 및 메시지 리스트 메모이제이션
  const currentRoom = useMemo(
    () => CHAT_ROOMS.find((r) => r.id === selectedRoomId) || CHAT_ROOMS[0],
    [CHAT_ROOMS, selectedRoomId]
  );

  const roomMessages = useMemo(() => {
    if (!selectedRoomId) return [];
    return (messages || []).filter((m) =>
      isMessageInRoom(m, selectedRoomId, currentRoom?.otherMemberId)
    );
  }, [messages, selectedRoomId, currentRoom?.otherMemberId, isMessageInRoom]);

  // 대화방 내 키워드 검색 필터링
  const displayedMessages = useMemo(() => {
    const kw = searchQuery.trim().toLowerCase();
    if (!kw) return roomMessages;
    return roomMessages.filter((m) => {
      const raw = typeof m.text === 'string' ? m.text : '';
      const { cleanText } = extractReactionsAndCleanText(raw);
      const sender = getSenderInfo(m.profile_id, m.sender, m.senderObj);
      return (
        cleanText.toLowerCase().includes(kw) ||
        (sender?.name || '').toLowerCase().includes(kw)
      );
    });
  }, [roomMessages, searchQuery, getSenderInfo]);

  // 연속 메시지 그룹핑 및 날짜 구분선 메타데이터 사전 계산
  const groupingMetaList = useMemo(
    () =>
      displayedMessages.map((_, idx) =>
        computeMessageGroupingMeta(displayedMessages, idx)
      ),
    [displayedMessages]
  );

  // 인용 답장 또는 상단 공지 터치 시 원본 메시지로 스크롤 이동 & 1.8초 하이라이트
  const scrollToMessage = useCallback(
    (targetId: any) => {
      if (!targetId || !displayedMessages) return;
      const idx = displayedMessages.findIndex(
        (m) => String(m.id) === String(targetId)
      );
      if (idx >= 0 && flatListRef.current) {
        flatListRef.current.scrollToIndex({
          index: idx,
          animated: true,
          viewPosition: 0.5,
        });
        setHighlightedMsgId(displayedMessages[idx].id);
        if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = setTimeout(() => {
          setHighlightedMsgId(null);
        }, 1800);
      }
    },
    [displayedMessages]
  );

  const handlePressImage = useCallback(
    (uri: string, senderName: string, timestamp?: string) => {
      setViewerImage({ uri, senderName, timestamp });
    },
    []
  );

  const renderMessageItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const senderInfo = getSenderInfo(item.profile_id, item.sender, item.senderObj);
      const isMe =
        currentUserProfile && item.profile_id
          ? item.profile_id === currentUserProfile.id
          : item.sender === currentUser;

      const readByList = item.readBy || [];
      const isDirectRoom = Boolean(
        selectedRoomId && selectedRoomId.startsWith('direct-')
      );

      let unreadCountForMsg = 0;
      let uniqueWhoRead: string[] = [];

      if (isDirectRoom) {
        const otherId = currentRoom?.otherMemberId;
        const isReadByOther = (readByList || []).some((id: any) => {
          if (!id || !otherId) return false;
          if (id === otherId) return true;
          if (familyMembers && Array.isArray(familyMembers)) {
            const match = familyMembers.find(
              (m) => m && (m.id === otherId || m.role === otherId)
            );
            if (match && (match.id === id || match.role === id)) return true;
          }
          return false;
        });
        unreadCountForMsg = isReadByOther ? 0 : 1;
        if (isReadByOther && otherId) {
          uniqueWhoRead = [getMemberName(otherId)];
        }
      } else {
        const whoRead = readByList
          .filter((id: any) => {
            if (item.profile_id && id === item.profile_id) return false;
            if (!item.profile_id && id === item.sender) return false;
            if (familyMembers && Array.isArray(familyMembers)) {
              const match = familyMembers.find(
                (m) => m && typeof m === 'object' && (m.id === id || m.role === id)
              );
              if (match) {
                if (item.profile_id && match.id === item.profile_id) return false;
                if (!item.profile_id && match.role === item.sender) return false;
              }
            }
            return true;
          })
          .map((id: string) => getMemberName(id));

        uniqueWhoRead = Array.from(new Set(whoRead));
        let totalOthers: number;
        if (currentRoom?.members && Array.isArray(currentRoom.members)) {
          totalOthers = Math.max(
            1,
            currentRoom.members.filter(
              (m: any) => m !== (currentUserProfile?.id || currentUser)
            ).length
          );
        } else {
          totalOthers = Math.max(
            1,
            (memberCount || familyMembers?.length || 4) - 1
          );
        }
        unreadCountForMsg = Math.max(0, totalOthers - uniqueWhoRead.length);
      }

      const groupingMeta = groupingMetaList[index] || {
        showDateDivider: false,
        dateDividerLabel: '',
        showSenderHeader: true,
        showTimestampMeta: true,
        isGroupedWithPrev: false,
        isGroupedWithNext: false,
      };

      return (
        <ChatMessageBubble
          item={item}
          groupingMeta={groupingMeta}
          isMe={isMe}
          senderInfo={senderInfo}
          unreadCount={unreadCountForMsg}
          readNamesList={uniqueWhoRead}
          currentUser={currentUser}
          currentUserProfile={currentUserProfile}
          myActorName={myActorName}
          audioPlayingId={audioPlayingId}
          setAudioPlayingId={setAudioPlayingId}
          onLongPressBubble={handleLongPressBubble}
          onPressImage={handlePressImage}
          onPressReplyQuote={scrollToMessage}
          onToggleReaction={handleToggleReaction}
          onUpdateMessageVote={onUpdateMessageVote}
          onAddEvent={onAddEvent}
          onAddChore={onAddChore}
          onAddShoppingItem={onAddShoppingItem}
          searchKeyword={searchQuery}
          isHighlighted={
            highlightedMsgId !== null &&
            String(highlightedMsgId) === String(item.id)
          }
        />
      );
    },
    [
      getSenderInfo,
      currentUserProfile,
      currentUser,
      selectedRoomId,
      currentRoom,
      familyMembers,
      getMemberName,
      memberCount,
      groupingMetaList,
      myActorName,
      audioPlayingId,
      setAudioPlayingId,
      handleLongPressBubble,
      handlePressImage,
      scrollToMessage,
      handleToggleReaction,
      onUpdateMessageVote,
      onAddEvent,
      onAddChore,
      onAddShoppingItem,
      searchQuery,
      highlightedMsgId,
    ]
  );

  // 1. RENDER CHAT ROOM LIST VIEW
  if (selectedRoomId === null) {
    return (
      <ChatRoomListView
        chatRooms={CHAT_ROOMS}
        onSelectRoom={setSelectedRoomId}
        onNavigateScreen={onNavigateScreen || undefined}
        createModalVisible={createModalVisible}
        setCreateModalVisible={setCreateModalVisible}
        newRoomTitle={newRoomTitle}
        setNewRoomTitle={setNewRoomTitle}
        familyMembers={familyMembers}
        currentUserProfile={currentUserProfile}
        currentUser={currentUser}
        selectedMembers={selectedMembers}
        handleToggleMemberSelect={handleToggleMemberSelect}
        handleCreateRoomSubmit={handleCreateRoomSubmit}
        getMemberName={getMemberName}
        todayTopic={todayTopic}
        isMyAnswered={isMyAnswered}
        pointsAwarded={smallTalk?.pointsAwarded}
        answeredCount={answeredCount}
        totalFamilyCount={totalFamilyCount}
        responseCount={responseCount}
        lastUserName={lastUserName}
        lastUserAns={lastUserAns}
      />
    );
  }

  // 2. RENDER CHAT CONVERSATION VIEW
  return (
    <View style={styles.container}>
      {/* Detail Chat Header with Back Button + Search & Media Drawer Icons */}
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
          <Text style={styles.headerTitle} numberOfLines={1}>
            {currentRoom.title}
          </Text>
          <View style={styles.headerStatusRow}>
            <View style={styles.headerLiveDot} />
            <Text style={styles.headerSub}>
              {currentRoom.subtitle || '대화 가능'}
            </Text>
          </View>
        </View>

        {/* 대화방 내 검색(🔍) & 사진·파일 모아보기 서랍(🖼️) 버튼 */}
        <View style={styles.headerActionBtnRow}>
          <TouchableOpacity
            style={[
              styles.headerIconBtn,
              searchVisible && styles.headerIconBtnActive,
            ]}
            onPress={() => {
              setSearchVisible((prev) => {
                if (prev) setSearchQuery('');
                return !prev;
              });
            }}
            activeOpacity={0.75}
          >
            <Search
              size={17}
              color={searchVisible ? '#FF6B47' : '#1C1917'}
              strokeWidth={2.3}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setMediaDrawerVisible(true)}
            activeOpacity={0.75}
          >
            <FolderOpen size={17} color="#1C1917" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 대화방 내 실시간 키워드 검색 바 */}
      {searchVisible && (
        <View style={styles.searchBarRow}>
          <View style={styles.searchInputWrap}>
            <Search size={15} color="#A8A29E" />
            <TextInput
              style={styles.searchInput}
              placeholder="대화 내용 또는 보낸 사람 검색..."
              placeholderTextColor="#A8A29E"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {Boolean(searchQuery.trim()) && (
              <Text style={styles.searchCountText}>
                {displayedMessages.length}건
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.searchCloseBtn}
            onPress={() => {
              setSearchQuery('');
              setSearchVisible(false);
            }}
          >
            <X size={18} color="#78716C" />
          </TouchableOpacity>
        </View>
      )}

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
                {pinnedNotice.pinner && pinnedNotice.pinner !== pinnedNotice.author
                  ? ` (등록: ${pinnedNotice.pinner})`
                  : ''}
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
      {displayedMessages.length === 0 ? (
        <View style={styles.emptyMessagesContainer}>
          <View style={styles.emptyMessagesIconBox}>
            <MessageCircle size={36} color="#FF6B47" strokeWidth={1.8} />
          </View>
          <Text style={styles.emptyMessagesTitle}>
            {searchQuery.trim()
              ? '검색 결과가 없습니다'
              : '아직 주고받은 메시지가 없어요'}
          </Text>
          <Text style={styles.emptyMessagesSub}>
            {searchQuery.trim()
              ? '다른 검색어로 다시 찾아보세요.'
              : '가족에게 따뜻한 안부나 오늘의 이야기를 먼저 건네보세요! 💬'}
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={displayedMessages}
          keyExtractor={(item, idx) => String(item.id || `msg-${idx}`)}
          keyboardShouldPersistTaps="handled"
          renderItem={renderMessageItem}
          style={styles.flatListStyle}
          contentContainerStyle={styles.listContent}
          initialNumToRender={35}
          maxToRenderPerBatch={25}
          windowSize={15}
          onScroll={(e) => {
            const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
            const distanceFromBottom =
              contentSize.height - (contentOffset.y + layoutMeasurement.height);
            const nearBottom = distanceFromBottom <= 140;
            isNearBottomRef.current = nearBottom;
            if (nearBottom) {
              if (showScrollToBottomBtn) setShowScrollToBottomBtn(false);
              if (latestUnreadToast) setLatestUnreadToast(null);
            } else if (!showScrollToBottomBtn && distanceFromBottom > 220) {
              setShowScrollToBottomBtn(true);
            }
          }}
          scrollEventThrottle={32}
          onScrollToIndexFailed={(info) => {
            flatListRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: false,
            });
          }}
          onContentSizeChange={() => {
            if (isNearBottomRef.current && !searchQuery.trim()) {
              scrollToBottomSafely(false);
            }
          }}
        />
      )}

      {/* ↓ 스크롤 시 하단 이동 플로팅 버튼 & 새 메시지 미리보기 토스트 */}
      {showScrollToBottomBtn && (
        <View style={styles.scrollToBottomFabContainer}>
          {Boolean(latestUnreadToast) && (
            <TouchableOpacity
              style={styles.scrollToBottomToastPill}
              activeOpacity={0.85}
              onPress={() => scrollToBottomSafely(true)}
            >
              <Text style={styles.scrollToBottomToastText} numberOfLines={1}>
                💬 {latestUnreadToast}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.scrollToBottomCircleBtn}
            activeOpacity={0.85}
            onPress={() => scrollToBottomSafely(true)}
          >
            <ArrowDown size={18} color="#FF6B47" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      )}

      {/* Image Preview Container */}
      {selectedPhoto && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: selectedPhoto }} style={styles.previewImage} />
          <View style={styles.previewInfoCol}>
            <Text style={styles.previewLabel}>사진이 첨부되었습니다</Text>
            <Text style={styles.previewSubLabel}>전송 버튼을 누르면 공유됩니다</Text>
          </View>
          <TouchableOpacity
            style={styles.removePreview}
            onPress={() => setSelectedPhoto(null)}
          >
            <X size={16} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      )}

      {/* Editing Message Preview Bar */}
      {editingMessage && (
        <View style={styles.editingBarContainer}>
          <View style={styles.replyBarLeft}>
            <View style={styles.editingBarIconBox}>
              <Edit3 size={14} color="#059669" strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
              <Text style={styles.editingBarTitle} numberOfLines={1}>
                메시지 수정 중
              </Text>
              <Text style={styles.replyBarPreviewText} numberOfLines={1}>
                {editingMessage.originalBody}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.replyBarCloseBtn}
            onPress={() => {
              setEditingMessage(null);
              setInputText('');
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={16} color="#78716C" />
          </TouchableOpacity>
        </View>
      )}

      {/* Replying-To Quote Preview Bar */}
      {replyingTo && !editingMessage && (
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
          placeholder={
            editingMessage
              ? '수정할 메시지 내용을 입력하세요...'
              : '가족에게 따뜻한 메시지 보내기...'
          }
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
          style={[
            styles.sendButton,
            inputText.trim() || selectedPhoto ? styles.sendActive : null,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() && !selectedPhoto}
          activeOpacity={0.8}
        >
          {editingMessage ? (
            <Check
              size={18}
              color={inputText.trim() ? '#FFFFFF' : '#A8A29E'}
              strokeWidth={2.5}
            />
          ) : (
            <Send
              size={18}
              color={inputText.trim() || selectedPhoto ? '#FFFFFF' : '#A8A29E'}
              strokeWidth={2.2}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* 사진 전체화면 뷰어 & 대화방 사진·파일 모아보기 서랍 모달 */}
      <ChatImageViewerModal
        viewerImage={viewerImage}
        onCloseViewer={() => setViewerImage(null)}
        mediaDrawerVisible={mediaDrawerVisible}
        onCloseMediaDrawer={() => setMediaDrawerVisible(false)}
        roomMessages={roomMessages}
        onSelectPhotoFromDrawer={(photo) => setViewerImage(photo)}
        insetsTop={insets.top}
        insetsBottom={insets.bottom}
      />

      {/* 1~7. 첨부파일 바텀시트 & 메시지 컨텍스트 메뉴 모달 통합 컴포넌트 */}
      <ChatAttachmentModals
        insetsBottom={insets.bottom}
        attachMenuVisible={attachMenuVisible}
        setAttachMenuVisible={setAttachMenuVisible}
        pickImage={pickImage}
        takePhotoWithCamera={takePhotoWithCamera}
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
        handleTriggerEdit={handleTriggerEdit}
        handlePinNotice={handlePinNotice}
        handleTriggerDelete={handleTriggerDelete}
        handleToggleReactionFromMenu={handleToggleReactionFromMenu}
        myActorName={myActorName}
      />
    </View>
  );
}
