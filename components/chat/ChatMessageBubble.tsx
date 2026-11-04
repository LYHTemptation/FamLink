import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Megaphone, Ban, Pin, MessageCircle } from 'lucide-react-native';
import UserAvatar from '../UserAvatar';
import styles from './ChatStyles';
import ChatRichCardRenderer from './ChatRichCards';
import {
  parseReplyHeader,
  parsePhotobookOrderData,
  extractReactionsAndCleanText,
  splitTextWithLinks,
  MessageGroupingMeta,
} from './chatHelpers';

export interface ChatMessageBubbleProps {
  item: any;
  groupingMeta: MessageGroupingMeta;
  isMe: boolean;
  senderInfo: {
    name: string;
    avatar: string;
    color: string;
  };
  unreadCount: number;
  readNamesList?: string[];
  currentUser?: string;
  currentUserProfile?: any;
  myActorName: string;
  audioPlayingId: string | number | null;
  setAudioPlayingId: (id: string | number | null) => void;
  onLongPressBubble: (payload: {
    item: any;
    isMe: boolean;
    bubbleText: string;
    senderInfo: any;
    readNamesList?: string[];
  }) => void;
  onPressImage: (imageUri: string, senderName: string, timestamp?: string) => void;
  onPressReplyQuote?: (replyId: string | number) => void;
  onToggleReaction: (messageId: string | number, rawText: string, emoji: string) => void;
  onUpdateMessageVote?: (messageId: string | number, newText: string) => void;
  onAddEvent?: (eventData: any) => void;
  onAddChore?: (choreData: any) => void;
  onAddShoppingItem?: (itemData: any) => void;
  searchKeyword?: string;
  isHighlighted?: boolean;
}

function ChatMessageBubbleComponent({
  item,
  groupingMeta,
  isMe,
  senderInfo,
  unreadCount,
  readNamesList,
  currentUser,
  currentUserProfile,
  myActorName,
  audioPlayingId,
  setAudioPlayingId,
  onLongPressBubble,
  onPressImage,
  onPressReplyQuote,
  onToggleReaction,
  onUpdateMessageVote,
  onAddEvent,
  onAddChore,
  onAddShoppingItem,
  searchKeyword = '',
  isHighlighted = false,
}: ChatMessageBubbleProps): React.ReactElement {
  const rawMessageText =
    typeof item.text === 'string'
      ? item.text
      : typeof item.text === 'object' && item.text !== null
      ? JSON.stringify(item.text)
      : '';

  const {
    cleanText: textWithoutReactions,
    reactions,
    isEdited,
  } = extractReactionsAndCleanText(rawMessageText);

  // 0. 공지 등록/해제 및 방생성 시스템 메시지
  const replyMetaForCheck = parseReplyHeader(textWithoutReactions);
  const checkBodyText = replyMetaForCheck
    ? replyMetaForCheck.cleanText
    : textWithoutReactions;

  if (
    checkBodyText.startsWith('[공지등록] ') ||
    checkBodyText.startsWith('[공지설정]') ||
    checkBodyText.startsWith('[공지해제]') ||
    checkBodyText.startsWith('[방생성]')
  ) {
    let systemLabel = '';
    const isRoomCreate = checkBodyText.startsWith('[방생성]');
    if (isRoomCreate) {
      try {
        const roomMeta = JSON.parse(checkBodyText.replace(/^\[방생성\]\s*/, ''));
        systemLabel = `'${roomMeta.title || '새 대화방'}' 대화방이 개설되었습니다.`;
      } catch (_) {
        systemLabel = '새 대화방이 개설되었습니다.';
      }
    } else if (checkBodyText.startsWith('[공지등록] ')) {
      const noticePreview = checkBodyText.replace('[공지등록] ', '');
      systemLabel = `${senderInfo.name}님이 공지를 등록했습니다: "${noticePreview}"`;
    } else {
      const isSet = checkBodyText.startsWith('[공지설정]');
      let noticeData: any = {};
      try {
        noticeData = JSON.parse(
          checkBodyText.replace(
            isSet ? /^\[공지설정\]\s*/ : /^\[공지해제\]\s*/,
            ''
          )
        );
      } catch (_) {}
      systemLabel = isSet
        ? `${noticeData.pinner || noticeData.author || senderInfo.name || '가족'}님이 공지를 등록했습니다.`
        : '공지가 등록 해제되었습니다.';
    }

    return (
      <View>
        {groupingMeta.showDateDivider && (
          <View style={styles.dateDividerContainer}>
            <View style={styles.dateDividerBadge}>
              <Text style={styles.dateDividerText}>{groupingMeta.dateDividerLabel}</Text>
            </View>
          </View>
        )}
        <View style={styles.systemNoticeMsgContainer}>
          <View style={styles.systemNoticeMsgBadge}>
            {isRoomCreate ? (
              <MessageCircle
                size={12}
                color="#FF6B47"
                strokeWidth={2.5}
                style={{ marginRight: 6 }}
              />
            ) : checkBodyText.startsWith('[공지등록] ') ? (
              <Megaphone
                size={12}
                color="#FF6B47"
                strokeWidth={2.5}
                style={{ marginRight: 6 }}
              />
            ) : (
              <Pin size={12} color="#78716C" style={{ marginRight: 5 }} />
            )}
            <Text style={styles.systemNoticeMsgText} numberOfLines={1}>
              {systemLabel}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // 1. 답장(Quote Reply) 헤더 분리
  const replyMeta = parseReplyHeader(textWithoutReactions);
  const bubbleText = replyMeta ? replyMeta.cleanText : textWithoutReactions;

  // 2. 삭제된 메시지 여부
  const isDeletedMsg = bubbleText === '[삭제된 메시지입니다]';

  // 3. 리치 카드 여부 판별
  const photobookOrderData = !isDeletedMsg ? parsePhotobookOrderData(bubbleText) : null;
  const isSpecialCard =
    !isDeletedMsg &&
    Boolean(
      photobookOrderData ||
        (bubbleText &&
          (bubbleText.startsWith('[파일] ') ||
            bubbleText.startsWith('[동영상] ') ||
            bubbleText.startsWith('[음성메모] ') ||
            bubbleText.startsWith('[가족투표] ') ||
            bubbleText.startsWith('[일정공유] ') ||
            bubbleText.startsWith('[집안일카드] ') ||
            bubbleText.startsWith('[장보기카드] ') ||
            bubbleText.startsWith('[위치공유] ')))
    );

  const displayBubbleText =
    typeof bubbleText === 'string' && bubbleText.startsWith('[답장:')
      ? bubbleText.replace(/^\[답장:[^\]]*\]\r?\n?/, '')
      : bubbleText;

  const reactionEntries = Object.entries(reactions).filter(
    ([, users]) => Array.isArray(users) && users.length > 0
  );

  // 검색어 형광펜 하이라이트 분할 헬퍼
  const renderTextWithKeywordHighlight = (rawChunk: string, keyPrefix: string) => {
    const kw = searchKeyword.trim();
    if (!kw) return rawChunk;
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = rawChunk.split(new RegExp(`(${escaped})`, 'gi'));
    if (parts.length <= 1) return rawChunk;
    return parts.map((part, idx) =>
      part.toLowerCase() === kw.toLowerCase() ? (
        <Text key={`${keyPrefix}-hl-${idx}`} style={styles.searchHighlightText}>
          {part}
        </Text>
      ) : (
        <React.Fragment key={`${keyPrefix}-tx-${idx}`}>{part}</React.Fragment>
      )
    );
  };

  const renderLinkedText = (textVal: string) => {
    const segments = splitTextWithLinks(textVal);
    return (
      <Text style={isMe ? styles.myMessageText : styles.otherMessageText}>
        {segments.map((seg, idx) => {
          if (seg.type === 'url' || seg.type === 'phone') {
            return (
              <Text
                key={idx}
                style={isMe ? styles.myLinkText : styles.otherLinkText}
                onPress={() => {
                  if (seg.href) {
                    Linking.openURL(seg.href).catch(() => {
                      Alert.alert('링크 열기 실패', seg.value);
                    });
                  }
                }}
              >
                {seg.value}
              </Text>
            );
          }
          return (
            <React.Fragment key={idx}>
              {renderTextWithKeywordHighlight(seg.value, `seg-${idx}`)}
            </React.Fragment>
          );
        })}
        {isEdited && (
          <Text style={isMe ? styles.myEditedTagText : styles.otherEditedTagText}>
            {' (수정됨)'}
          </Text>
        )}
      </Text>
    );
  };

  return (
    <View>
      {/* 날짜 변경 구분선 */}
      {groupingMeta.showDateDivider && (
        <View style={styles.dateDividerContainer}>
          <View style={styles.dateDividerBadge}>
            <Text style={styles.dateDividerText}>{groupingMeta.dateDividerLabel}</Text>
          </View>
        </View>
      )}

      <View
        style={[
          styles.messageRow,
          isMe ? styles.myRow : styles.otherRow,
          groupingMeta.isGroupedWithNext && styles.messageRowGrouped,
        ]}
      >
        {!isMe &&
          (groupingMeta.showSenderHeader ? (
            <UserAvatar
              source={senderInfo.avatar}
              size={30}
              backgroundColor={senderInfo.color + '25'}
              borderColor={senderInfo.color}
              borderWidth={1.5}
              style={{ marginRight: 10 }}
            />
          ) : (
            <View style={styles.groupedAvatarSpacer} />
          ))}

        <View style={[styles.messageContent, isMe && { alignItems: 'flex-end' }]}>
          {!isMe && groupingMeta.showSenderHeader && (
            <View style={styles.senderNameRow}>
              <Text style={[styles.senderName, { color: senderInfo.color }]}>
                {senderInfo.name}
              </Text>
            </View>
          )}

          {/* 카카오톡 스타일: 말풍선 + 측면 메타(안 읽은 수 & 시간) */}
          <View
            style={[
              styles.bubbleWithSideMetaRow,
              isMe ? styles.myBubbleWithSideMetaRow : styles.otherBubbleWithSideMetaRow,
            ]}
          >
            {/* 내 메시지: 왼쪽에 메타 표시 */}
            {isMe && (
              <View style={styles.mySideMetaCol}>
                {item.isSending ? (
                  <Text style={styles.sendingIndicatorText}>전송중...</Text>
                ) : (
                  unreadCount > 0 && (
                    <Text style={styles.unreadCountBadge}>{unreadCount}</Text>
                  )
                )}
                {groupingMeta.showTimestampMeta && (
                  <Text style={styles.sideTimeText}>{item.timestamp}</Text>
                )}
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.92}
              delayLongPress={260}
              onLongPress={() => {
                if (!isDeletedMsg) {
                  onLongPressBubble({
                    item,
                    isMe,
                    bubbleText,
                    senderInfo,
                    readNamesList,
                  });
                }
              }}
              style={[
                styles.bubble,
                isMe ? styles.myBubble : styles.otherBubble,
                isMe && !groupingMeta.showSenderHeader && styles.myGroupedBubbleRadius,
                !isMe && !groupingMeta.showSenderHeader && styles.otherGroupedBubbleRadius,
                replyMeta && !isSpecialCard && !isDeletedMsg && styles.bubbleWithReply,
                isDeletedMsg && (isMe ? styles.myDeletedBubble : styles.otherDeletedBubble),
                isSpecialCard && (isMe ? styles.myCardBubble : styles.otherCardBubble),
                item.image && !isDeletedMsg && styles.imageBubble,
                item.isSending && styles.sendingBubble,
                isHighlighted && styles.highlightedBubble,
              ]}
            >
              {/* 인용 답장(Quote Reply) 칩 — 터치 시 원본 메시지로 스크롤 이동 */}
              {replyMeta && !isDeletedMsg && (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    if (replyMeta.replyId && onPressReplyQuote) {
                      onPressReplyQuote(replyMeta.replyId);
                    }
                  }}
                  style={[
                    styles.replyQuoteChip,
                    isMe ? styles.myReplyQuoteChip : styles.otherReplyQuoteChip,
                  ]}
                >
                  <View
                    style={[
                      styles.replyQuoteBar,
                      isMe ? styles.myReplyQuoteBar : styles.otherReplyQuoteBar,
                    ]}
                  />
                  <View style={styles.replyQuoteContentCol}>
                    <Text
                      style={[
                        styles.replyQuoteAuthor,
                        isMe ? styles.myReplyQuoteAuthor : styles.otherReplyQuoteAuthor,
                      ]}
                      numberOfLines={1}
                    >
                      {replyMeta.senderName}에게 답장
                    </Text>
                    <Text
                      style={[
                        styles.replyQuoteSnippet,
                        isMe ? styles.myReplyQuoteSnippet : styles.otherReplyQuoteSnippet,
                      ]}
                      numberOfLines={1}
                    >
                      {replyMeta.snippet}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* 사진 첨부 (탭하면 전체화면 뷰어 오픈) */}
              {item.image && !isDeletedMsg && (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() =>
                    onPressImage(item.image, senderInfo.name, item.timestamp)
                  }
                  onLongPress={() =>
                    onLongPressBubble({
                      item,
                      isMe,
                      bubbleText,
                      senderInfo,
                      readNamesList,
                    })
                  }
                >
                  <Image
                    source={{ uri: item.image }}
                    style={styles.bubbleImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}

              {/* 본문: 삭제 메시지 / 리치 카드 / 일반 텍스트(URL 자동 링크 + 검색 하이라이트) */}
              {isDeletedMsg ? (
                <View style={styles.deletedBubbleContent}>
                  <Ban
                    size={13}
                    color={isMe ? 'rgba(255,255,255,0.75)' : '#A8A29E'}
                    style={{ marginRight: 5 }}
                  />
                  <Text
                    style={[
                      styles.deletedBubbleText,
                      isMe ? styles.myDeletedBubbleText : styles.otherDeletedBubbleText,
                    ]}
                  >
                    삭제된 메시지입니다
                  </Text>
                </View>
              ) : isSpecialCard ? (
                <ChatRichCardRenderer
                  item={item}
                  isMe={isMe}
                  bubbleText={bubbleText}
                  photobookOrderData={photobookOrderData}
                  currentUser={currentUser}
                  currentUserProfile={currentUserProfile}
                  audioPlayingId={audioPlayingId}
                  setAudioPlayingId={setAudioPlayingId}
                  onUpdateMessageVote={onUpdateMessageVote}
                  onAddEvent={onAddEvent}
                  onAddChore={onAddChore}
                  onAddShoppingItem={onAddShoppingItem}
                />
              ) : displayBubbleText ? (
                renderLinkedText(displayBubbleText)
              ) : null}
            </TouchableOpacity>

            {/* 상대방 메시지: 오른쪽에 메타 표시 */}
            {!isMe && (
              <View style={styles.otherSideMetaCol}>
                {unreadCount > 0 && (
                  <Text style={styles.unreadCountBadge}>{unreadCount}</Text>
                )}
                {groupingMeta.showTimestampMeta && (
                  <Text style={styles.sideTimeText}>{item.timestamp}</Text>
                )}
              </View>
            )}
          </View>

          {/* 하단 이모지 공감(Reaction) 배지 리스트 */}
          {!isDeletedMsg && reactionEntries.length > 0 && (
            <View
              style={[
                styles.reactionRowContainer,
                isMe ? styles.myReactionRow : styles.otherReactionRow,
              ]}
            >
              {reactionEntries.map(([emoji, users]) => {
                const isMine = users.includes(myActorName);
                return (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.reactionPill,
                      isMine && styles.reactionPillActive,
                    ]}
                    activeOpacity={0.75}
                    onPress={() => {
                      if (item.id) {
                        onToggleReaction(item.id, rawMessageText, emoji);
                      }
                    }}
                  >
                    <Text style={styles.reactionPillEmoji}>{emoji}</Text>
                    <Text
                      style={[
                        styles.reactionPillCount,
                        isMine && styles.reactionPillCountActive,
                      ]}
                    >
                      {users.length}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ⚡ 정밀 비교 함수(areBubblePropsEqual): senderInfo/groupingMeta 객체 참조가 바뀌어도 실제 값이 같으면 리렌더링 100% 차단
function areBubblePropsEqual(
  prev: ChatMessageBubbleProps,
  next: ChatMessageBubbleProps
): boolean {
  const prevMsgKey = prev.item?.id || prev.item?.timestamp;
  const nextMsgKey = next.item?.id || next.item?.timestamp;
  const prevPlaying = prev.audioPlayingId === prevMsgKey;
  const nextPlaying = next.audioPlayingId === nextMsgKey;

  return (
    prev.item?.id === next.item?.id &&
    prev.item?.text === next.item?.text &&
    prev.item?.image === next.item?.image &&
    prev.item?.isSending === next.item?.isSending &&
    prev.item?.timestamp === next.item?.timestamp &&
    prev.isMe === next.isMe &&
    prev.unreadCount === next.unreadCount &&
    prev.senderInfo?.name === next.senderInfo?.name &&
    prev.senderInfo?.avatar === next.senderInfo?.avatar &&
    prev.senderInfo?.color === next.senderInfo?.color &&
    prev.groupingMeta.showDateDivider === next.groupingMeta.showDateDivider &&
    prev.groupingMeta.dateDividerLabel === next.groupingMeta.dateDividerLabel &&
    prev.groupingMeta.showSenderHeader === next.groupingMeta.showSenderHeader &&
    prev.groupingMeta.showTimestampMeta === next.groupingMeta.showTimestampMeta &&
    prev.groupingMeta.isGroupedWithNext === next.groupingMeta.isGroupedWithNext &&
    prevPlaying === nextPlaying &&
    prev.searchKeyword === next.searchKeyword &&
    prev.isHighlighted === next.isHighlighted &&
    prev.myActorName === next.myActorName
  );
}

const ChatMessageBubble = React.memo(ChatMessageBubbleComponent, areBubblePropsEqual);
export default ChatMessageBubble;
