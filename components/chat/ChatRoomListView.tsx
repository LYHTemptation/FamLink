import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import {
  MessageCircle,
  Plus,
  Users,
  CheckSquare,
  Calendar,
  Vote,
  MapPin,
  Mic,
  Video,
  FileText,
  Image as ImageIcon,
  BookOpen,
  CornerUpLeft,
  Pin,
  Trash2,
  X,
  Check,
  Lightbulb,
  Trophy,
  Flame,
  ChevronRight,
  MessageSquare,
  Sparkles,
} from 'lucide-react-native';
import UserAvatar from '../UserAvatar';
import styles from './ChatStyles';

export interface ChatRoomListViewProps {
  chatRooms: any[];
  onSelectRoom: (roomId: string) => void;
  onNavigateScreen?: (screen: string) => void;
  createModalVisible: boolean;
  setCreateModalVisible: (visible: boolean) => void;
  newRoomTitle: string;
  setNewRoomTitle: (val: string) => void;
  familyMembers?: any[];
  currentUserProfile?: any;
  currentUser?: string;
  selectedMembers: string[];
  handleToggleMemberSelect: (roleKey: string) => void;
  handleCreateRoomSubmit: () => void;
  getMemberName: (idOrRole: any) => string;
  todayTopic: string;
  isMyAnswered: boolean;
  pointsAwarded?: boolean;
  answeredCount: number;
  totalFamilyCount: number;
  responseCount: number;
  lastUserName: string;
  lastUserAns: string;
}

export default function ChatRoomListView({
  chatRooms,
  onSelectRoom,
  onNavigateScreen,
  createModalVisible,
  setCreateModalVisible,
  newRoomTitle,
  setNewRoomTitle,
  familyMembers,
  currentUserProfile,
  currentUser,
  selectedMembers,
  handleToggleMemberSelect,
  handleCreateRoomSubmit,
  getMemberName,
  todayTopic,
  isMyAnswered,
  pointsAwarded,
  answeredCount,
  totalFamilyCount,
  responseCount,
  lastUserName,
  lastUserAns,
}: ChatRoomListViewProps): React.ReactElement {
  const renderSmallTalkBanner = () => (
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

        <View
          style={[
            styles.smalltalkActionChip,
            isMyAnswered && styles.smalltalkActionChipDone,
          ]}
        >
          {pointsAwarded ? (
            <Trophy size={12} color="#059669" style={{ marginRight: 4 }} />
          ) : !isMyAnswered ? (
            <Flame size={12} color="#FF6B47" style={{ marginRight: 4 }} />
          ) : (
            <Check size={12} color="#059669" style={{ marginRight: 4 }} />
          )}
          <Text
            style={[
              styles.smalltalkActionText,
              isMyAnswered && styles.smalltalkActionTextDone,
            ]}
          >
            {pointsAwarded
              ? '+30P 보너스 완료'
              : isMyAnswered
              ? `${answeredCount}/${totalFamilyCount}명 답변 완료`
              : '답변하고 +5P 받기'}
          </Text>
          <ChevronRight size={13} color={isMyAnswered ? '#059669' : '#FF6B47'} />
        </View>
      </View>

      <Text style={styles.smalltalkTopicText} numberOfLines={2}>
        &quot;{todayTopic}&quot;
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

  return (
    <View style={styles.container}>
      {/* Chat Room List Header */}
      <View style={styles.roomListHeader}>
        <View style={styles.roomListHeaderTopRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MessageCircle
              size={16}
              color="#FF6B47"
              strokeWidth={2.4}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.roomListCountText}>
              대화방 {chatRooms.length}개
            </Text>
          </View>

          <TouchableOpacity
            style={styles.createRoomBtn}
            onPress={() => setCreateModalVisible(true)}
            activeOpacity={0.85}
          >
            <Plus
              size={15}
              color="#FFFFFF"
              strokeWidth={2.5}
              style={{ marginRight: 5 }}
            />
            <Text style={styles.createRoomBtnText}>새 대화방</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat Room List Scroll */}
      <FlatList
        data={chatRooms}
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
                onSelectRoom(item.id);
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
                  <Text style={styles.roomTitleText} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.subtitle && (
                    <View style={styles.roomSubBadge}>
                      <Text style={styles.roomSubBadgeText}>
                        {item.subtitle}
                      </Text>
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
                    let IconComp: any = null;
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
                            <IconComp
                              size={13}
                              color={iconColor}
                              strokeWidth={2.4}
                            />
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
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

            <ScrollView
              style={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
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
                {(
                  familyMembers || [
                    { role: 'mom', name: '엄마', avatar: '👩‍🦰' },
                    { role: 'dad', name: '아빠', avatar: '👨‍💼' },
                    { role: 'son', name: '아들', avatar: '👦' },
                    { role: 'daughter', name: '딸', avatar: '👧' },
                  ]
                ).map((m: any) => {
                  const memberKey = String(
                    typeof m === 'object' ? m.id || m.role || '' : m
                  );
                  if (!memberKey) return null;
                  const isMyself =
                    currentUserProfile && typeof m === 'object' && m.id
                      ? m.id === currentUserProfile.id
                      : memberKey === currentUser;
                  if (isMyself) return null;

                  const name =
                    typeof m === 'object' ? m.name : getMemberName(memberKey);
                  const avatar = typeof m === 'object' ? m.avatar : '👦';
                  const isSelected = selectedMembers.includes(memberKey);

                  return (
                    <TouchableOpacity
                      key={memberKey}
                      style={[
                        styles.memberCheckChip,
                        isSelected && styles.memberCheckChipSelected,
                      ]}
                      onPress={() => handleToggleMemberSelect(memberKey)}
                      activeOpacity={0.7}
                    >
                      <UserAvatar
                        avatar={avatar}
                        size={22}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.memberCheckName,
                          isSelected && styles.memberCheckNameSelected,
                        ]}
                      >
                        {name}
                      </Text>
                      {isSelected && (
                        <Check
                          size={14}
                          color="#FF6B47"
                          strokeWidth={2.5}
                          style={{ marginLeft: 4 }}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleCreateRoomSubmit}
                activeOpacity={0.85}
              >
                <Text style={styles.modalConfirmBtnText}>대화방 시작하기</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
