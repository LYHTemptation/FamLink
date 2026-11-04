import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Keyboard,
  Platform,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageCircle, ArrowDown } from 'lucide-react-native';
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
  getMessagePreviewData,
} from './chat/chatHelpers';
import { useChatAttachments } from './chat/useChatAttachments';
import ChatAttachmentModals from './chat/ChatAttachmentModals';
import ChatMessageBubble from './chat/ChatMessageBubble';
import ChatRoomListView from './chat/ChatRoomListView';
import ChatImageViewerModal, { ViewerImageState } from './chat/ChatImageViewerModal';
import ChatConversationHeader from './chat/ChatConversationHeader';
import ChatInputBar, {
  ReplyingToState,
  EditingMessageState,
} from './chat/ChatInputBar';
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
  isActive?: boolean;
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

const DEFAULT_NAMES: Record<string, string> = {
  mom: '엄마',
  dad: '아빠',
  son: '아들',
  daughter: '딸',
};

export default function ChatScreen({
  isActive = true,
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
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const flatListRef = useRef<FlatList<any>>(null);

  // 💬 특정 메시지 인용 답장(Quote Reply) & ✏️ 메시지 수정(Edit) State
  const [replyingTo, setReplyingTo] = useState<ReplyingToState | null>(null);
  const [editingMessage, setEditingMessage] = useState<EditingMessageState | null>(
    null
  );

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

  // ⚡ O(1) 가족 구성원 해시 맵 인덱싱 (id 및 role 키 동시 매핑)
  const memberLookupMap = useMemo(() => {
    const map = new Map<string, FamilyMember>();
    if (familyMembers && Array.isArray(familyMembers)) {
      for (let i = 0; i < familyMembers.length; i++) {
        const m = familyMembers[i];
        if (!m || typeof m !== 'object') continue;
        if (m.id) map.set(String(m.id), m);
        if (m.role && !map.has(String(m.role))) {
          map.set(String(m.role), m);
        }
      }
    }
    return map;
  }, [familyMembers]);

  const getSenderInfo = useCallback(
    (profileIdOrRole?: any, senderRole?: any, senderObj?: any) => {
      let pId: string | null = null;
      let sRole = senderRole;
      let sObj = senderObj;

      if (typeof profileIdOrRole === 'object' && profileIdOrRole !== null) {
        sObj = profileIdOrRole;
      } else if (typeof profileIdOrRole === 'string' && profileIdOrRole.length > 15) {
        pId = profileIdOrRole;
      } else if (typeof profileIdOrRole === 'string' && !senderRole && !senderObj) {
        sRole = profileIdOrRole;
      } else if (profileIdOrRole) {
        pId = String(profileIdOrRole);
      }

      if (sObj && typeof sObj === 'object' && sObj.name) {
        return {
          name: sObj.name,
          avatar: sObj.avatar || '👦',
          color: sObj.color || '#3B82F6',
        };
      }

      if (pId) {
        const matchById = memberLookupMap.get(String(pId));
        if (matchById) {
          return {
            name: matchById.name,
            avatar: matchById.avatar || '👦',
            color: matchById.color || '#3B82F6',
          };
        }
      }

      if (sRole) {
        const matchByRole = memberLookupMap.get(String(sRole));
        if (matchByRole) {
          return {
            name: matchByRole.name,
            avatar: matchByRole.avatar || '👦',
            color: matchByRole.color || '#3B82F6',
          };
        }
      }

      const roleKey = String(sRole || pId || '');
      return (
        DEFAULT_MEMBERS[roleKey] || {
          name: (sObj && sObj.name) || roleKey || '가족',
          avatar: '👦',
          color: '#78716C',
        }
      );
    },
    [memberLookupMap]
  );

  const getMemberName = useCallback(
    (keyOrId: any) => {
      if (!keyOrId) return '가족';
      const match = memberLookupMap.get(String(keyOrId));
      if (match?.name) return match.name;
      return DEFAULT_NAMES[String(keyOrId)] || String(keyOrId);
    },
    [memberLookupMap]
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

    let latestNoticeEvent: string | null = null;
    const msgList = messages || [];
    for (let i = msgList.length - 1; i >= 0; i--) {
      const msgObj = msgList[i];
      if (!isMessageInRoom(msgObj, selectedRoomId)) continue;
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

  // ⚡ 채팅 탭이 실제로 활성화(isActive)되어 있고 방에 들어가 있을 때만 읽음 처리 트리거
  useEffect(() => {
    if (isActive && selectedRoomId !== null && onMarkAsRead) {
      onMarkAsRead(selectedRoomId);
    }
  }, [isActive, selectedRoomId, messages?.length, onMarkAsRead]);

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

  // ChatInputBar에서 전송(또는 수정 완료) 시 호출되는 핸들러
  const handleSubmitInputText = useCallback(
    (textToSend: string) => {
      if (!textToSend && !selectedPhoto) return;

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

      setSelectedPhoto(null);

      setTimeout(() => {
        scrollToBottomSafely(true);
      }, 50);
    },
    [
      selectedPhoto,
      editingMessage,
      onUpdateMessageVote,
      replyingTo,
      onSendMessage,
      selectedRoomId,
      scrollToBottomSafely,
    ]
  );

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

  const handleCopyMessageText = useCallback(async () => {
    if (!selectedMsgForMenu) return;
    const textToCopy = selectedMsgForMenu.bubbleText || '';
    if (textToCopy) {
      await Clipboard.setStringAsync(textToCopy);
      Alert.alert('복사 완료 📋', '메시지가 클립보드에 복사되었습니다.');
    }
    setContextMenuVisible(false);
  }, [selectedMsgForMenu]);

  const handleTriggerReply = useCallback(() => {
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
  }, [selectedMsgForMenu]);

  // 내가 보낸 메시지 수정 모드 진입
  const handleTriggerEdit = useCallback(() => {
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
    setContextMenuVisible(false);
  }, [selectedMsgForMenu]);

  const handlePinNotice = useCallback(async () => {
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
  }, [selectedMsgForMenu, selectedRoomId, myActorName, onSendMessage]);

  const handleUnpinNotice = useCallback(async () => {
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
  }, [selectedRoomId, onSendMessage]);

  const handleTriggerDelete = useCallback(() => {
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
  }, [selectedMsgForMenu, onDeleteMessage]);

  // ⚡ O(M) 단일 패스(Single-Pass) 인덱싱: messages 배열을 단 1번만 순회하여 모든 대화방의 마지막 메시지, 미독 카운트, 커스텀 방 메타데이터를 동시 집계
  const CHAT_ROOMS: ChatRoomItem[] = useMemo(() => {
    const myId = currentUserProfile?.id || currentUser;

    // 1. 1:1 대화방 대상 멤버 및 레거시 방 ID 매핑 준비
    const directMemberToRoomMap = new Map<string, string>();
    const directMembersList: { member: FamilyMember; otherId: string; roomId: string }[] = [];

    if (familyMembers && Array.isArray(familyMembers)) {
      for (let i = 0; i < familyMembers.length; i++) {
        const member = familyMembers[i];
        if (!member) continue;
        const otherId = String(member.id || member.role || '');
        const isMyself =
          currentUserProfile && member.id
            ? member.id === currentUserProfile.id
            : member.id === currentUser || member.role === currentUser;

        if (!isMyself && otherId) {
          const rId = getDirectRoomId(myId, otherId);
          directMembersList.push({ member, otherId, roomId: rId });
          if (member.id) directMemberToRoomMap.set(String(member.id), rId);
          if (member.role) directMemberToRoomMap.set(String(member.role), rId);
        }
      }
    }

    // 2. 로컬 customRooms 초기 등록
    const mergedCustomRoomsMap = new Map<string, any>();
    if (customRooms && Array.isArray(customRooms)) {
      for (let i = 0; i < customRooms.length; i++) {
        const r = customRooms[i];
        if (r?.id) mergedCustomRoomsMap.set(r.id, r);
      }
    }

    // 3. 단일 패스로 messages 순회하여 방별 { lastMsg, unreadCount } 집계
    const roomStatsMap = new Map<string, { lastMsg: any; unreadCount: number }>();

    const checkIsReadByMe = (readByList: any[]): boolean => {
      if (!Array.isArray(readByList) || readByList.length === 0) return false;
      for (let i = 0; i < readByList.length; i++) {
        const id = readByList[i];
        if (currentUserProfile?.id && id === currentUserProfile.id) return true;
        if (id === currentUser) return true;
        const matched = memberLookupMap.get(String(id));
        if (matched && (matched.id === currentUser || matched.role === currentUser)) {
          return true;
        }
      }
      return false;
    };

    const msgList = messages || [];
    for (let i = 0; i < msgList.length; i++) {
      const msg = msgList[i];
      if (!msg) continue;
      const mRoom = String(msg.room_id || 'family-group');

      // 커스텀 방 자동 발견 및 [방생성] 메타 파싱
      if (mRoom.startsWith('custom-')) {
        const rawTxt = typeof msg.text === 'string' ? msg.text : '';
        if (rawTxt.includes('[방생성]')) {
          const { cleanText } = extractReactionsAndCleanText(rawTxt);
          if (cleanText.startsWith('[방생성]')) {
            try {
              const parsedRoom = JSON.parse(cleanText.replace(/^\[방생성\]\s*/, ''));
              if (parsedRoom?.id) {
                mergedCustomRoomsMap.set(parsedRoom.id, parsedRoom);
              }
            } catch (_) {}
          }
        }
        if (!mergedCustomRoomsMap.has(mRoom)) {
          mergedCustomRoomsMap.set(mRoom, {
            id: mRoom,
            title: '가족 커스텀 대화방',
            subtitle: '가족 그룹방',
            avatar: '💬',
            color: '#FF6B47',
            isGroup: true,
          });
        }
      }

      // 정규화된 타겟 roomId 판별
      let canonicalRoomId = mRoom;
      if (mRoom.startsWith('direct-')) {
        // 레거시 단일 ID 형식(direct-otherId 또는 direct-myId) 호환
        const parts = mRoom.replace(/^direct-/, '').split('-');
        if (parts.length === 1) {
          const otherCandidate =
            msg.profile_id && msg.profile_id !== myId
              ? String(msg.profile_id)
              : msg.sender && msg.sender !== currentUser
              ? String(msg.sender)
              : parts[0];
          const mapped = directMemberToRoomMap.get(otherCandidate);
          if (mapped) canonicalRoomId = mapped;
        }
      }

      const prevStat = roomStatsMap.get(canonicalRoomId) || {
        lastMsg: null,
        unreadCount: 0,
      };
      prevStat.lastMsg = msg;

      const isMe =
        currentUserProfile && msg.profile_id
          ? msg.profile_id === currentUserProfile.id
          : msg.sender === currentUser;

      if (!isMe && !checkIsReadByMe(msg.readBy || [])) {
        prevStat.unreadCount += 1;
      }

      roomStatsMap.set(canonicalRoomId, prevStat);
    }

    // 4. 방별 마지막 메시지 포맷터 (방당 최대 1회만 호출)
    const buildLastMessageInfo = (last: any) => {
      if (!last) return null;
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

    const familyStat = roomStatsMap.get('family-group');
    const familyLast = buildLastMessageInfo(familyStat?.lastMsg);
    const familyGroupUnread = familyStat?.unreadCount || 0;

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

    mergedCustomRoomsMap.forEach((room) => {
      const stat = roomStatsMap.get(room.id);
      const count = stat?.unreadCount || 0;
      const last = buildLastMessageInfo(stat?.lastMsg);
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

    for (let i = 0; i < directMembersList.length; i++) {
      const { member, otherId, roomId } = directMembersList[i];
      const stat = roomStatsMap.get(roomId);
      const count = stat?.unreadCount || 0;
      const last = buildLastMessageInfo(stat?.lastMsg);

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
    memberLookupMap,
    getSenderInfo,
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

  const handleToggleMemberSelect = useCallback((roleKey: string) => {
    setSelectedMembers((prev) =>
      prev.includes(roleKey)
        ? prev.filter((r) => r !== roleKey)
        : [...prev, roleKey]
    );
  }, []);

  const handleCreateRoomSubmit = useCallback(() => {
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
  }, [
    newRoomTitle,
    selectedMembers,
    currentUserProfile?.id,
    currentUser,
    onCreateCustomRoom,
  ]);

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
        const otherMemberObj = otherId ? memberLookupMap.get(String(otherId)) : null;
        const isReadByOther = (readByList || []).some((id: any) => {
          if (!id || !otherId) return false;
          if (id === otherId) return true;
          if (
            otherMemberObj &&
            (otherMemberObj.id === id || otherMemberObj.role === id)
          ) {
            return true;
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
            const match = memberLookupMap.get(String(id));
            if (match) {
              if (item.profile_id && match.id === item.profile_id) return false;
              if (!item.profile_id && match.role === item.sender) return false;
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
      memberLookupMap,
      familyMembers?.length,
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
      {/* 상단 대화방 헤더 + 검색 바 + 고정 공지 배너 */}
      <ChatConversationHeader
        currentRoom={currentRoom}
        onBack={() => setSelectedRoomId(null)}
        searchVisible={searchVisible}
        searchQuery={searchQuery}
        onToggleSearch={() => {
          setSearchVisible((prev) => {
            if (prev) setSearchQuery('');
            return !prev;
          });
        }}
        onChangeSearchQuery={setSearchQuery}
        onCloseSearch={() => {
          setSearchQuery('');
          setSearchVisible(false);
        }}
        searchResultCount={displayedMessages.length}
        onOpenMediaDrawer={() => setMediaDrawerVisible(true)}
        pinnedNotice={pinnedNotice}
        onPressPinnedNotice={scrollToMessage}
        onUnpinNotice={handleUnpinNotice}
      />

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

      {/* 하단 입력창 & 사진/답장/수정 프리뷰 바 (타이핑 상태 내부 격리) */}
      <ChatInputBar
        selectedRoomId={selectedRoomId}
        selectedPhoto={selectedPhoto}
        onClearPhoto={() => setSelectedPhoto(null)}
        editingMessage={editingMessage}
        onCancelEdit={() => setEditingMessage(null)}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        onOpenAttachMenu={() => setAttachMenuVisible(true)}
        onSubmitText={handleSubmitInputText}
      />

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
