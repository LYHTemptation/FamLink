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
import { MessageSquare, Sparkles, Users, Lightbulb, Trophy, Flame, Ticket } from 'lucide-react-native';
import {
  IconSend,
  IconImage,
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconCheck,
  IconClose,
} from './icons';
import { colors, typography, commonStyles } from '../theme';

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

  // Trigger read receipt update when entering a chat room or receiving new messages in active room
  useEffect(() => {
    if (selectedRoomId !== null && onMarkAsRead) {
      onMarkAsRead(selectedRoomId);
    }
  }, [selectedRoomId, messages?.length]);

  // Create Custom Room Modal States
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('💬');
  const [selectedColor, setSelectedColor] = useState('#FF7E82');
  const [selectedMembers, setSelectedMembers] = useState([]);

  const EMOJI_OPTIONS = ['💬', '⛺', '⚽', '🍕', '🎁', '🏖️', '☕', '🎵', '🚗', '🐱', '🎮', '❤️'];
  const COLOR_OPTIONS = ['#FF7E82', '#4A90E2', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C'];

  const DEFAULT_MEMBERS = {
    mom: { name: '엄마', avatar: '👩‍🦰', color: '#FF7E82' },
    dad: { name: '아빠', avatar: '👨‍💼', color: '#4A90E2' },
    son: { name: '아들', avatar: '👦', color: '#2ECC71' },
    daughter: { name: '딸', avatar: '👧', color: '#F39C12' },
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
        color: sObj.color || '#4A90E2',
      };
    }

    // 2. Exact match by profile_id in familyMembers (Crucial when multiple members share the same role, e.g. multiple sons)
    if (familyMembers && Array.isArray(familyMembers)) {
      if (pId) {
        const matchById = familyMembers.find(m => m && typeof m === 'object' && m.id === pId);
        if (matchById) {
          return { name: matchById.name, avatar: matchById.avatar || '👦', color: matchById.color || '#4A90E2' };
        }
      }
      if (sRole) {
        const matchByRole = familyMembers.find(m => m && typeof m === 'object' && (m.role === sRole || m.id === sRole));
        if (matchByRole) {
          return { name: matchByRole.name, avatar: matchByRole.avatar || '👦', color: matchByRole.color || '#4A90E2' };
        }
      }
    }

    const roleKey = sRole || pId;
    return DEFAULT_MEMBERS[roleKey] || { name: (sObj && sObj.name) || roleKey || '가족', avatar: '👦', color: '#8E8E93' };
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
    
    // Scroll to end
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

  // Check if a message belongs to a specific room (with backward compatibility)
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
        activeOpacity={0.85}
      >
        <View style={styles.smalltalkBannerHeader}>
          <View style={styles.smalltalkTag}>
            <Lightbulb size={12} color="#FF7E82" style={{ marginRight: 4 }} />
            <Text style={styles.smalltalkTagText}>오늘의 스몰톡 질문</Text>
          </View>

          <View style={[styles.smalltalkActionChip, isMyAnswered && styles.smalltalkActionChipDone]}>
            {smallTalk?.pointsAwarded ? (
              <Trophy size={11} color="#27AE60" style={{ marginRight: 4 }} />
            ) : !isMyAnswered ? (
              <Flame size={12} color="#FF7E82" style={{ marginRight: 4 }} />
            ) : null}
            <Text style={[styles.smalltalkActionText, isMyAnswered && styles.smalltalkActionTextDone]}>
              {smallTalk?.pointsAwarded
                ? '100P 적립 완료'
                : isMyAnswered
                  ? `✓ ${answeredCount}/${totalFamilyCount}명 완료`
                  : '답변하고 100P 받기'}
            </Text>
            <IconChevronRight size={13} color={isMyAnswered ? '#27AE60' : '#FF7E82'} />
          </View>
        </View>

        <Text style={styles.smalltalkTopicText} numberOfLines={2}>
          "{todayTopic}"
        </Text>

        <View style={styles.smalltalkFooter}>
          {responseCount > 0 && (
            <MessageSquare size={12} color="#8E8E93" style={{ marginRight: 5 }} />
          )}
          <Text style={styles.smalltalkFooterText} numberOfLines={1}>
            {responseCount > 0
              ? `${lastUserName}: "${lastUserAns}"`
              : '가족 중 첫 번째로 오늘의 질문에 답변해 보세요!'}
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
      subtitle: `멤버 ${memberCount || 4}명 참여 중`,
      lastMessage: familyLast ? familyLast.fullText : '가족들과 대화를 시작해보세요!',
      time: familyLast ? familyLast.time : '방금',
      avatar: '👨‍👩‍👧‍👦',
      color: '#FF7E82',
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
          lastMessage: last ? last.fullText : `${member.name}님에게 메시지를 작성해보세요.`,
          time: last ? last.time : '대화 가능',
          avatar: member.avatar || '👦',
          color: member.color || '#4A90E2',
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
      Alert.alert('입력 안내', '대화방 이름을 입력해 주세요.');
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

    const uniqueWhoRead = Array.from(new Set(whoRead));
    const totalOthers = Math.max(1, (memberCount || familyMembers?.length || 4) - 1);
    const unreadCountForMsg = Math.max(0, totalOthers - uniqueWhoRead.length);
    const isReadByAll = unreadCountForMsg === 0;

    // Special Announcement Card for Coupon Usage
    if (item.text && item.text.includes('[쿠폰 사용 알림]')) {
      return (
        <View key={item.id || item.timestamp} style={styles.couponAnnouncementRow}>
          <View style={styles.couponAnnouncementCard}>
            <View style={styles.couponAnnouncementHeader}>
              <View style={styles.couponIconCircle}>
                <Ticket size={15} color="#FF6B6B" />
              </View>
              <Text style={styles.couponAnnouncementBadge}>쿠폰 사용 알림</Text>
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
          <View style={[styles.avatarContainer, { backgroundColor: senderInfo.color + '20', borderColor: senderInfo.color }]}>
            <Text style={styles.avatarText}>{senderInfo.avatar}</Text>
          </View>
        )}
        <View style={styles.messageContent}>
          {!isMe && (
            <View style={styles.senderNameRow}>
              <Text style={[styles.senderName, { color: senderInfo.color }]}>{senderInfo.name}</Text>
            </View>
          )}
          
          <View style={[
            styles.bubble, 
            isMe ? styles.myBubble : [styles.otherBubble, { borderLeftWidth: 3, borderLeftColor: senderInfo.color }],
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
                <Text style={styles.readAllText}>모두 읽음</Text>
              )
            )}
            {!isMe && uniqueWhoRead.length > 0 && (
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
        {/* Chat Room List Header with Create Button */}
        <View style={styles.roomListHeader}>
          <View style={styles.roomListHeaderTitleRow}>
            <View>
              <Text style={styles.roomListHeaderTitle}>채팅</Text>
              <Text style={styles.roomListHeaderSub}>가족 대화방 {CHAT_ROOMS.length}개</Text>
            </View>

            <TouchableOpacity
              style={styles.createRoomBtn}
              onPress={() => setCreateModalVisible(true)}
              activeOpacity={0.8}
            >
              <IconPlus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
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
              activeOpacity={0.7}
            >
              <View style={[styles.roomAvatarBox, { backgroundColor: item.color + '20' }]}>
                {item.id === 'family-group' ? (
                  <Users size={20} color={item.color} />
                ) : (
                  <Text style={styles.roomAvatarText}>{item.avatar}</Text>
                )}
              </View>

              <View style={styles.roomInfoContent}>
                <View style={styles.roomTitleRow}>
                  <Text style={styles.roomTitleText} numberOfLines={1}>{item.title}</Text>
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
          animationType="slide"
          transparent={true}
          visible={createModalVisible}
          onRequestClose={() => setCreateModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}
          >
            <View style={styles.modalView}>
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalHeaderTitleRow}>
                  <IconPlus size={20} color="#FF7E82" style={{ marginRight: 6 }} />
                  <Text style={styles.modalHeader}>새 대화방 만들기</Text>
                </View>
                <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                  <IconClose size={20} color="#8E8E93" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.modalLabel}>대화방 이름</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="예: 주말 모임방, 엄마 & 딸 비밀방"
                  placeholderTextColor="#AEAEB2"
                  value={newRoomTitle}
                  onChangeText={setNewRoomTitle}
                />

                <Text style={styles.modalLabel}>대표 이모티콘</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                  {EMOJI_OPTIONS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={[styles.emojiChip, selectedAvatar === emoji && styles.emojiChipSelected]}
                      onPress={() => setSelectedAvatar(emoji)}
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
                      >
                        <Text style={styles.memberCheckAvatar}>{avatar}</Text>
                        <Text style={[styles.memberCheckName, isSelected && styles.memberCheckNameSelected]}>
                          {name}
                        </Text>
                        {isSelected && <IconCheck size={14} color="#FF7E82" style={{ marginLeft: 4 }} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleCreateRoomSubmit}>
                  <Text style={styles.modalConfirmBtnText}>대화방 만들기</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  // 2. RENDER CHAT CONVERSATION VIEW (When a chat room is clicked)
  const currentRoom = CHAT_ROOMS.find(r => r.id === selectedRoomId) || CHAT_ROOMS[0];

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
          <IconChevronLeft size={24} color="#1C1C1E" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{currentRoom.title}</Text>
          <Text style={styles.headerSub}>{currentRoom.subtitle}</Text>
        </View>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={(messages || []).filter(m => isMessageInRoom(m, selectedRoomId || 'family-group', currentRoom?.otherMemberId))}
        keyExtractor={(item) => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.listContent}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Image Preview Container */}
      {selectedPhoto && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: selectedPhoto }} style={styles.previewImage} />
          <TouchableOpacity style={styles.removePreview} onPress={() => setSelectedPhoto(null)}>
            <Text style={styles.removePreviewText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.previewLabel}>사진이 첨부되었습니다</Text>
        </View>
      )}

      {/* Message Input Box */}
      <View style={[styles.inputArea, { paddingBottom: Math.max(8, insets.bottom) }]}>
        <TouchableOpacity style={styles.iconButton} onPress={pickImage}>
          <IconImage size={22} color="#8E8E93" />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="가족에게 메시지 보내기..."
          placeholderTextColor="#8E8E93"
          value={inputText}
          onChangeText={setInputText}
          multiline
          onKeyPress={(e) => {
            if (Platform.OS === 'web') {
              // Ignore IME composition events (한글 조합 중 엔터 키 중복 전송 완벽 방지)
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
        >
          <IconSend size={18} color={(inputText.trim() || selectedPhoto) ? '#FFFFFF' : '#8E8E93'} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: commonStyles.screenContainer,
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 64,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backBtn: {
    paddingRight: 8,
    paddingVertical: 4,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2ECC71',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  headerSub: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 1,
  },
  roomListHeader: {
    paddingHorizontal: 20,
    height: 64,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    justifyContent: 'center',
  },
  roomListHeaderTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomListHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  roomListHeaderSub: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  createRoomBtn: {
    backgroundColor: '#FF7E82',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  createRoomBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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
    padding: 22,
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
  modalScrollContent: {
    paddingVertical: 4,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
    marginTop: 14,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F1F2F4',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#1C1C1E',
  },
  chipScroll: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  emojiChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F2F4',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#F1F2F4',
  },
  emojiChipSelected: {
    backgroundColor: '#FFEBEB',
    borderColor: '#FF7E82',
  },
  emojiChipText: {
    fontSize: 20,
  },
  colorPaletteRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#1C1C1E',
  },
  memberChecklistRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  memberCheckChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F2F4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F2F4',
  },
  memberCheckChipSelected: {
    backgroundColor: '#FFEBEB',
    borderColor: '#FF7E82',
  },
  memberCheckAvatar: {
    fontSize: 14,
    marginRight: 4,
  },
  memberCheckName: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },
  memberCheckNameSelected: {
    color: '#FF7E82',
    fontWeight: '700',
  },
  modalConfirmBtn: {
    backgroundColor: '#FF7E82',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 12,
  },
  modalConfirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  smalltalkBanner: {
    backgroundColor: '#FFF9F5',
    borderRadius: 18,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1.2,
    borderColor: '#FFE3D1',
    shadowColor: '#FF7E82',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  smalltalkBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  smalltalkTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBDC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  smalltalkTagEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  smalltalkTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D35400',
  },
  smalltalkActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD1D3',
  },
  smalltalkActionChipDone: {
    backgroundColor: '#EDFAF1',
    borderColor: '#C6F0D4',
  },
  smalltalkActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF7E82',
    marginRight: 2,
  },
  smalltalkActionTextDone: {
    color: '#27AE60',
  },
  smalltalkTopicText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2C3E50',
    lineHeight: 21,
    marginBottom: 8,
  },
  smalltalkFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  smalltalkFooterText: {
    fontSize: 12,
    color: '#7F8C8D',
    flex: 1,
  },
  roomListContainer: {
    padding: 14,
  },
  roomItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  roomAvatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomAvatarText: {
    fontSize: 24,
  },
  roomInfoContent: {
    flex: 1,
    marginLeft: 12,
  },
  roomTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
    flex: 1,
    marginRight: 6,
  },
  roomTimeText: {
    fontSize: 11,
    color: '#8E8E93',
  },
  roomSnippetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  roomSnippetText: {
    fontSize: 13,
    color: '#8E8E93',
    flex: 1,
    marginRight: 6,
  },
  roomBadge: {
    backgroundColor: '#FF7E82',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  roomBadgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 20,
    maxWidth: '85%',
  },
  myRow: {
    alignSelf: 'flex-end',
  },
  otherRow: {
    alignSelf: 'flex-start',
  },
  avatarContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  avatarText: {
    fontSize: 18,
  },
  messageContent: {
    flex: 1,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginLeft: 4,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  myBubble: {
    backgroundColor: '#FF7E82',
    borderTopRightRadius: 2,
    alignSelf: 'flex-end',
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    alignSelf: 'flex-start',
  },
  imageBubble: {
    padding: 4,
    borderRadius: 12,
  },
  bubbleImage: {
    width: 200,
    height: 150,
    borderRadius: 10,
    marginBottom: 4,
  },
  myMessageText: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  otherMessageText: {
    fontSize: 15,
    color: '#1C1C1E',
    lineHeight: 20,
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
    fontSize: 10,
    color: '#FF7E82',
    fontWeight: '600',
    marginRight: 6,
  },
  unreadCountNumber: {
    fontSize: 10,
    color: '#FF9500',
    fontWeight: '800',
    marginRight: 4,
  },
  sendingIndicatorText: {
    fontSize: 10,
    color: '#FF9500',
    fontWeight: '700',
    marginRight: 4,
  },
  sendingBubble: {
    opacity: 0.75,
  },
  readAllText: {
    fontSize: 9,
    color: '#8E8E93',
    fontWeight: '600',
    marginRight: 4,
  },
  timeText: {
    fontSize: 10,
    color: '#8E8E93',
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#FFF2F3',
    borderTopWidth: 1,
    borderTopColor: '#FFE5E7',
  },
  previewImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 10,
  },
  previewLabel: {
    fontSize: 12,
    color: '#FF7E82',
    fontWeight: '600',
  },
  removePreview: {
    position: 'absolute',
    left: 40,
    top: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePreviewText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EBEBEB',
  },
  iconButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F1F2F4',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
    maxHeight: 100,
    color: '#1C1C1E',
    marginHorizontal: 4,
  },
  sendButton: {
    backgroundColor: '#F1F2F4',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  sendActive: {
    backgroundColor: '#FF7E82',
  },
  couponAnnouncementRow: {
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
  },
  couponAnnouncementCard: {
    backgroundColor: '#FFF9F5',
    borderWidth: 1.5,
    borderColor: '#FFD8C4',
    borderRadius: 16,
    padding: 14,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#FF7E82',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  couponAnnouncementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  couponIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFEBE6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  couponAnnouncementBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF6B6B',
    flex: 1,
  },
  couponAnnouncementTime: {
    fontSize: 11,
    color: '#AEAEB2',
  },
  couponAnnouncementText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C3E50',
    lineHeight: 18,
  },
});
