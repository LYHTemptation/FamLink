import React, { useState, useRef } from 'react';
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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, Image as ImageIcon, ChevronLeft, MessageSquare, Sparkles, Users, Search, Plus, Check, X } from 'lucide-react-native';
import { Modal, ScrollView, KeyboardAvoidingView } from 'react-native';

export default function ChatScreen({ messages, currentUser, currentUserProfile, onSendMessage, memberCount, familyMembers, smallTalk, onNavigateScreen, customRooms, onCreateCustomRoom }) {
  const insets = useSafeAreaInsets();
  const [selectedRoomId, setSelectedRoomId] = useState(null); // null = Chat Room List View, 'family-group' = Group Chat
  const [inputText, setInputText] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const flatListRef = useRef();

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

  const getSenderInfo = (senderRole, senderObj) => {
    if (senderObj && typeof senderObj === 'object') {
      return {
        name: senderObj.name || senderRole,
        avatar: senderObj.avatar || '👦',
        color: senderObj.color || '#4A90E2',
      };
    }
    if (familyMembers && Array.isArray(familyMembers)) {
      const match = familyMembers.find(m => m && typeof m === 'object' && (m.role === senderRole || m.id === senderRole));
      if (match) {
        return { name: match.name, avatar: match.avatar, color: match.color };
      }
    }
    return DEFAULT_MEMBERS[senderRole] || { name: senderRole || '가족', avatar: '👦', color: '#8E8E93' };
  };

  const getMemberName = (keyOrId) => {
    if (familyMembers && Array.isArray(familyMembers)) {
      const match = familyMembers.find(m => m && typeof m === 'object' && (m.id === keyOrId || m.role === keyOrId));
      if (match) return match.name;
    }
    const DEFAULT_NAMES = { mom: '엄마', dad: '아빠', son: '아들', daughter: '딸' };
    return DEFAULT_NAMES[keyOrId] || keyOrId;
  };

  const handleSend = () => {
    if (inputText.trim() === '' && !selectedPhoto) return;
    
    onSendMessage({
      text: inputText,
      image: selectedPhoto,
    });
    
    setInputText('');
    setSelectedPhoto(null);
    
    // Scroll to end
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const pickImage = async () => {
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
      setSelectedPhoto(result.assets[0].uri);
    }
  };

  // Get last message info for list preview
  const lastMessage = messages && messages.length > 0 ? messages[messages.length - 1] : null;
  const lastMessageSender = lastMessage ? getSenderInfo(lastMessage.sender) : null;
  const lastMessageText = lastMessage
    ? (lastMessage.image ? '📷 사진을 공유했습니다.' : lastMessage.text)
    : '가족들과 대화를 시작해보세요!';

  // Dynamic SmallTalk topic and latest response info
  const todayTopic = smallTalk?.topic || '오늘 가장 기분 좋았던 순간은?';
  const responses = smallTalk?.responses || {};
  const responseCount = Object.keys(responses).length;
  const isMyAnswered = Boolean(responses[currentUser]);

  let smalltalkLastMsg = `오늘의 질문: "${todayTopic}"`;
  if (responseCount > 0) {
    const lastUserKey = Object.keys(responses).pop();
    const lastUserName = getMemberName(lastUserKey);
    const lastUserAns = responses[lastUserKey];
    smalltalkLastMsg = `${lastUserName}: "${lastUserAns}"`;
  }

  let smalltalkBadge = 'NEW';
  if (smallTalk?.pointsAwarded) {
    smalltalkBadge = '🎉 100P';
  } else if (isMyAnswered) {
    smalltalkBadge = `${responseCount}명 답변`;
  }

  // Calculate unread messages count for current user
  const unreadCount = (messages || []).filter((msg) => {
    if (msg.sender === currentUser) return false;
    const readByList = msg.readBy || [];
    const isReadByMe = readByList.some(id => {
      if (id === currentUser) return true;
      if (familyMembers && Array.isArray(familyMembers)) {
        const match = familyMembers.find(m => m && typeof m === 'object' && (m.id === id || m.role === id));
        if (match && match.role === currentUser) return true;
      }
      return false;
    });
    return !isReadByMe;
  }).length;

  // Define chat rooms list
  const CHAT_ROOMS = [
    {
      id: 'family-group',
      title: '우리 가족 수다방 👨‍👩‍👧‍👦',
      subtitle: `멤버 ${memberCount || 4}명 참여 중`,
      lastMessage: lastMessageSender ? `${lastMessageSender.name}: ${lastMessageText}` : lastMessageText,
      time: lastMessage ? lastMessage.timestamp : '방금',
      avatar: '👨‍👩‍👧‍👦',
      color: '#FF7E82',
      badge: unreadCount > 0 ? `${unreadCount}` : null,
      isGroup: true,
    },
    {
      id: 'smalltalk-room',
      title: '오늘의 스몰톡 소통 알림방 💡',
      subtitle: '매일 아침 새 대화 주제 도착',
      lastMessage: smalltalkLastMsg,
      time: '오늘',
      avatar: '💡',
      color: '#F39C12',
      badge: smalltalkBadge,
      isGroup: false,
      targetScreen: 'smalltalk',
    },
  ];

  // Add user-created custom chat rooms
  if (customRooms && Array.isArray(customRooms) && customRooms.length > 0) {
    CHAT_ROOMS.push(...customRooms);
  }

  // Add individual family member 1:1 chat rooms
  if (familyMembers && Array.isArray(familyMembers) && familyMembers.length > 0) {
    familyMembers.forEach((member) => {
      if (member && member.role !== currentUser) {
        CHAT_ROOMS.push({
          id: `direct-${member.id || member.role}`,
          title: `${member.name}님과의 대화`,
          subtitle: `1:1 대화방`,
          lastMessage: `${member.name}님에게 메시지를 작성해보세요.`,
          time: '대화 가능',
          avatar: member.avatar || '👦',
          color: member.color || '#4A90E2',
          badge: null,
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
      members: [currentUser, ...selectedMembers],
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
    const senderInfo = getSenderInfo(item.sender, item.senderObj);
    
    // Accurately determine if the message was sent by the current logged-in user
    const isMe =
      item.sender === currentUser ||
      item.profile_id === currentUser ||
      (currentUserProfile && (item.profile_id === currentUserProfile.id || item.sender === currentUserProfile.role)) ||
      (item.senderObj && currentUserProfile && item.senderObj.role === currentUserProfile.role);
    
    // Calculate read receipts (exclude sender)
    const readByList = item.readBy || [];
    const whoRead = readByList
      .filter(id => {
        if (familyMembers && Array.isArray(familyMembers)) {
          const match = familyMembers.find(m => m && typeof m === 'object' && (m.id === id || m.role === id));
          if (match && match.role === item.sender) {
            return false;
          }
        }
        return id !== item.sender;
      })
      .map(id => getMemberName(id));
    
    const isReadByAll = familyMembers && Array.isArray(familyMembers) 
      ? whoRead.length >= (familyMembers.length - 1)
      : whoRead.length >= 3;

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
            item.image ? styles.imageBubble : null
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
            {/* Read receipt text */}
            {whoRead.length > 0 && (
              <Text style={styles.readText}>
                {isReadByAll ? '모두 읽음' : `${whoRead.join(', ')} 읽음`}
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
              <Text style={styles.roomListHeaderTitle}>채팅 💬</Text>
              <Text style={styles.roomListHeaderSub}>가족 대화방 {CHAT_ROOMS.length}개</Text>
            </View>

            <TouchableOpacity
              style={styles.createRoomBtn}
              onPress={() => setCreateModalVisible(true)}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.createRoomBtnText}>새 대화방</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Chat Room List Scroll */}
        <FlatList
          data={CHAT_ROOMS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.roomListContainer}
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
                <Text style={styles.roomAvatarText}>{item.avatar}</Text>
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
                  <Plus size={20} color="#FF7E82" style={{ marginRight: 6 }} />
                  <Text style={styles.modalHeader}>새 대화방 만들기</Text>
                </View>
                <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                  <X size={20} color="#8E8E93" />
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
                    const roleKey = typeof m === 'object' ? (m.role || m.id) : m;
                    if (roleKey === currentUser) return null;
                    const name = typeof m === 'object' ? m.name : getMemberName(roleKey);
                    const avatar = typeof m === 'object' ? m.avatar : '👦';
                    const isSelected = selectedMembers.includes(roleKey);

                    return (
                      <TouchableOpacity
                        key={roleKey}
                        style={[styles.memberCheckChip, isSelected && styles.memberCheckChipSelected]}
                        onPress={() => handleToggleMemberSelect(roleKey)}
                      >
                        <Text style={styles.memberCheckAvatar}>{avatar}</Text>
                        <Text style={[styles.memberCheckName, isSelected && styles.memberCheckNameSelected]}>
                          {name}
                        </Text>
                        {isSelected && <Check size={14} color="#FF7E82" style={{ marginLeft: 4 }} />}
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
    <View style={styles.container}>
      {/* Detail Chat Header with Back Button */}
      <View style={styles.chatHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setSelectedRoomId(null)}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color="#1C1C1E" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{currentRoom.title}</Text>
          <Text style={styles.headerSub}>{currentRoom.subtitle}</Text>
        </View>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.listContent}
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
      <View style={styles.inputArea}>
        <TouchableOpacity style={styles.iconButton} onPress={pickImage}>
          <ImageIcon size={22} color="#8E8E93" />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="가족에게 메시지 보내기..."
          placeholderTextColor="#8E8E93"
          value={inputText}
          onChangeText={setInputText}
          multiline
        />

        <TouchableOpacity 
          style={[styles.sendButton, (inputText.trim() || selectedPhoto) ? styles.sendActive : null]} 
          onPress={handleSend}
          disabled={!inputText.trim() && !selectedPhoto}
        >
          <Send size={18} color={(inputText.trim() || selectedPhoto) ? '#FFFFFF' : '#8E8E93'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
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
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
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
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#FF7E82',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  createRoomBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
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
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 12,
  },
  modalConfirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
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
    fontSize: 10,
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
});
