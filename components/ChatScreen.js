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
import { Send, Image as ImageIcon, ChevronLeft, MessageSquare, Sparkles, Users, Search } from 'lucide-react-native';

export default function ChatScreen({ messages, currentUser, onSendMessage, memberCount, familyMembers, smallTalk, onNavigateScreen }) {
  const insets = useSafeAreaInsets();
  const [selectedRoomId, setSelectedRoomId] = useState(null); // null = Chat Room List View, 'family-group' = Group Chat
  const [inputText, setInputText] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const flatListRef = useRef();

  const DEFAULT_MEMBERS = {
    mom: { name: '엄마', avatar: '👩‍🦰', color: '#FF7E82' },
    dad: { name: '아빠', avatar: '👨‍💼', color: '#4A90E2' },
    son: { name: '아들', avatar: '👦', color: '#2ECC71' },
    daughter: { name: '딸', avatar: '👧', color: '#F39C12' },
  };

  const getSenderInfo = (senderRole) => {
    if (familyMembers && Array.isArray(familyMembers)) {
      const match = familyMembers.find(m => m && typeof m === 'object' && m.role === senderRole);
      if (match) {
        return { name: match.name, avatar: match.avatar, color: match.color };
      }
    }
    return DEFAULT_MEMBERS[senderRole] || { name: senderRole, avatar: '👦', color: '#8E8E93' };
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

  const renderMessageItem = ({ item }) => {
    const isMe = item.sender === currentUser;
    const senderInfo = getSenderInfo(item.sender);
    
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
          <View style={[styles.avatarContainer, { backgroundColor: senderInfo.color + '20' }]}>
            <Text style={styles.avatarText}>{senderInfo.avatar}</Text>
          </View>
        )}
        <View style={styles.messageContent}>
          {!isMe && <Text style={[styles.senderName, { color: senderInfo.color }]}>{senderInfo.name}</Text>}
          
          <View style={[
            styles.bubble, 
            isMe ? styles.myBubble : styles.otherBubble,
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
        {/* Chat Room List Header */}
        <View style={styles.roomListHeader}>
          <View>
            <Text style={styles.roomListHeaderTitle}>채팅 💬</Text>
            <Text style={styles.roomListHeaderSub}>가족 대화방 {CHAT_ROOMS.length}개</Text>
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
