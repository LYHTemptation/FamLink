import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { ChevronLeft, Users, Search, FolderOpen, X, Pin } from 'lucide-react-native';
import UserAvatar from '../UserAvatar';
import styles from './ChatStyles';

export interface ChatConversationHeaderProps {
  currentRoom: any;
  onBack: () => void;
  searchVisible: boolean;
  searchQuery: string;
  onToggleSearch: () => void;
  onChangeSearchQuery: (q: string) => void;
  onCloseSearch: () => void;
  searchResultCount: number;
  onOpenMediaDrawer: () => void;
  pinnedNotice: any;
  onPressPinnedNotice: (noticeId: any) => void;
  onUnpinNotice: () => void;
}

function ChatConversationHeaderComponent({
  currentRoom,
  onBack,
  searchVisible,
  searchQuery,
  onToggleSearch,
  onChangeSearchQuery,
  onCloseSearch,
  searchResultCount,
  onOpenMediaDrawer,
  pinnedNotice,
  onPressPinnedNotice,
  onUnpinNotice,
}: ChatConversationHeaderProps): React.ReactElement {
  return (
    <>
      {/* Detail Chat Header with Back Button + Search & Media Drawer Icons */}
      <View style={styles.chatHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <ChevronLeft size={22} color="#1C1917" strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.headerAvatarCol}>
          {currentRoom?.isGroup ? (
            <View style={styles.headerGroupIconBox}>
              <Users size={18} color="#FF6B47" strokeWidth={2.2} />
            </View>
          ) : (
            <UserAvatar
              avatar={currentRoom?.avatar}
              size={36}
              borderColor={currentRoom?.color || '#3B82F6'}
              style={{ marginRight: 8 }}
            />
          )}
        </View>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {currentRoom?.title}
          </Text>
          <View style={styles.headerStatusRow}>
            <View style={styles.headerLiveDot} />
            <Text style={styles.headerSub}>
              {currentRoom?.subtitle || '대화 가능'}
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
            onPress={onToggleSearch}
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
            onPress={onOpenMediaDrawer}
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
              onChangeText={onChangeSearchQuery}
              autoFocus
            />
            {Boolean(searchQuery.trim()) && (
              <Text style={styles.searchCountText}>{searchResultCount}건</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.searchCloseBtn}
            onPress={onCloseSearch}
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
            onPress={() => onPressPinnedNotice(pinnedNotice.id)}
          >
            <View style={styles.pinnedNoticeIconBadge}>
              <Pin size={13} color="#FF6B47" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pinnedNoticeTitle}>
                공지 ·{' '}
                {pinnedNotice.author
                  ? `${pinnedNotice.author}님의 글`
                  : '가족 공지'}
                {pinnedNotice.pinner &&
                pinnedNotice.pinner !== pinnedNotice.author
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
            onPress={onUnpinNotice}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={15} color="#78716C" />
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

const ChatConversationHeader = React.memo(ChatConversationHeaderComponent);
export default ChatConversationHeader;
