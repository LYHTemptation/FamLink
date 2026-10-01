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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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
} from 'lucide-react-native';
import UserAvatar from './UserAvatar';

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
}) {
  const insets = useSafeAreaInsets();
  const [selectedRoomId, setSelectedRoomId] = useState(null); // null = Chat Room List View, 'family-group' = Group Chat
  const [inputText, setInputText] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const flatListRef = useRef();
  const isSendingRef = useRef(false);

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

  // Get last message info for each specific room
  const getRoomLastMessageInfo = (roomId, otherMemberId = null) => {
    const roomMsgs = (messages || []).filter(m => isMessageInRoom(m, roomId, otherMemberId));
    if (roomMsgs.length === 0) return null;
    const last = roomMsgs[roomMsgs.length - 1];
    const sender = getSenderInfo(last.profile_id, last.sender, last.senderObj);
    const text = last.image ? '📷 사진을 공유했습니다.' : (last.text || '');
    return {
      senderName: sender?.name || '가족',
      text: text,
      fullText: `${sender?.name || '가족'}: ${text}`,
      time: last.timestamp || '방금',
    };
  };

  // Dynamic SmallTalk topic and latest response info for banner
  const todayTopic = smallTalk?.topic || '오늘 가장 기분 좋았던 순간은?';
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
                ? '100P 적립 완료'
                : isMyAnswered
                  ? `${answeredCount}/${totalFamilyCount}명 답변 완료`
                  : '답변하고 100P 받기'}
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
      lastMessage: familyLast ? familyLast.fullText : '가족들과 따뜻한 이야기를 나눠보세요! 💬',
      time: familyLast ? familyLast.time : '방금',
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
        time: last ? last.time : (room.time || '방금'),
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
          time: last ? last.time : '대화 가능',
          avatar: member.avatar || '👦',
          color: member.color || '#3B82F6',
          badge: count > 0 ? `${count}` : null,
          isGroup: false,
        });
      }
    });
  }

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
            {item.text.trim() !== '' && (
              <Text style={isMe ? styles.myMessageText : styles.otherMessageText}>
                {item.text}
              </Text>
            )}
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
        {/* Chat Room List Header matching Figma Home/Together style */}
        <View style={styles.roomListHeader}>
          <View style={styles.roomListHeaderTopRow}>
            <View style={styles.roomListHeaderLeft}>
              <Text style={styles.roomListHeaderCategory}>가족 대화 · REALTIME</Text>
              <Text style={styles.roomListHeaderTitle}>채팅</Text>
            </View>

            <TouchableOpacity
              style={styles.createRoomBtn}
              onPress={() => setCreateModalVisible(true)}
              activeOpacity={0.85}
            >
              <Plus size={16} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 5 }} />
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
                  <Text style={styles.roomSnippetText} numberOfLines={1}>
                    {item.lastMessage}
                  </Text>
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
        <TouchableOpacity style={styles.attachButton} onPress={pickImage} activeOpacity={0.7}>
          <ImageIcon size={21} color="#78716C" strokeWidth={2} />
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
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#FAF8F3',
  },
  roomListHeaderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomListHeaderLeft: {
    justifyContent: 'center',
  },
  roomListHeaderCategory: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A8A29E',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  roomListHeaderTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#1C1917',
    letterSpacing: -0.5,
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
  roomSnippetText: {
    fontSize: 13.5,
    color: '#78716C',
    flex: 1,
    marginRight: 8,
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
});
