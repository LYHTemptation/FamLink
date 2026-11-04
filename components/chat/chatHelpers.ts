/**
 * FamLink Chat Message Parsers & Time Formatting Utilities (TypeScript)
 */

export interface ParsedReplyHeader {
  replyId: string;
  senderName: string;
  snippet: string;
  cleanText: string;
}

export interface ParsedPhotobookOrderData {
  bookTitle: string;
  volume: string;
  copies: string;
  totalPrice: number;
  pointsUsed: number;
  recipient: string;
  address: string;
  orderNumber?: string;
}

/**
 * 특정 메시지 인용 답장(Quote Reply) 헤더 파서:
 * - 포맷: [답장:{"id":"...","name":"...","snippet":"..."}]\n실제내용
 */
export const parseReplyHeader = (text?: string | null): ParsedReplyHeader | null => {
  if (!text || typeof text !== 'string') return null;
  const prefix = '[답장:';
  if (!text.startsWith(prefix)) return null;

  const closeBracketIdx = text.indexOf(']');
  if (closeBracketIdx === -1) return null;

  const jsonStr = text.substring(prefix.length, closeBracketIdx);
  let cleanText = text.substring(closeBracketIdx + 1);
  if (cleanText.startsWith('\r\n')) {
    cleanText = cleanText.substring(2);
  } else if (cleanText.startsWith('\n')) {
    cleanText = cleanText.substring(1);
  }

  try {
    const meta = JSON.parse(jsonStr);
    if (meta && typeof meta === 'object') {
      return {
        replyId: meta.id || '',
        senderName: meta.name || '가족',
        snippet: meta.snippet || '',
        cleanText,
      };
    }
  } catch (_) {
    try {
      const sanitized = jsonStr.replace(/'/g, '"');
      const meta = JSON.parse(sanitized);
      if (meta && typeof meta === 'object') {
        return {
          replyId: meta.id || '',
          senderName: meta.name || '가족',
          snippet: meta.snippet || '',
          cleanText,
        };
      }
    } catch (_) {}
  }
  return null;
};

/**
 * 포토북 주문 메시지 파서:
 * - JSON 카드: [포토북카드] {...}
 * - 원시 JSON 문자열: {"bookTitle": ...}
 * - 텍스트 포맷: 📦 [실물 포토북 양장본 주문 접수]...
 */
export const parsePhotobookOrderData = (
  text?: string | Record<string, any> | null
): ParsedPhotobookOrderData | null => {
  if (!text) return null;
  const trimmed =
    typeof text === 'string'
      ? text.trim()
      : typeof text === 'object' && text !== null
      ? JSON.stringify(text)
      : '';
  if (!trimmed) return null;

  if (
    trimmed.startsWith('{') ||
    trimmed.startsWith('[포토북카드] ') ||
    trimmed.startsWith('[포토북주문] ')
  ) {
    try {
      const cleanJson = trimmed.replace(/^\[포토북카드\]\s*|^\[포토북주문\]\s*/, '');
      const parsed = JSON.parse(cleanJson);
      if (parsed && (parsed.bookTitle || parsed.volume || parsed.totalPrice !== undefined)) {
        return {
          bookTitle: parsed.bookTitle || '우리 가족 이야기',
          volume: parsed.volume || 'Vol. 1',
          copies: parsed.copies
            ? typeof parsed.copies === 'number'
              ? `${parsed.copies}권`
              : String(parsed.copies)
            : '1권',
          totalPrice: Number(parsed.totalPrice) || 0,
          pointsUsed: Number(parsed.pointsUsed) || 0,
          recipient: parsed.recipient || '가족',
          address: parsed.address || '',
        };
      }
    } catch (_) {}
  }

  if (
    trimmed.includes('[실물 포토북 양장본 주문 접수]') ||
    trimmed.includes('[실물 포토북 양장본 발주 완료]')
  ) {
    const titleMatch = trimmed.match(/• 제목:\s*"([^"]+)"(?:\s*\(([^)]+)\))?/);
    const copiesMatch = trimmed.match(/• 부수:\s*(.+)/);
    const pointsMatch = trimmed.match(/• 포인트 할인:\s*-?([0-9,]+)\s*P/);
    const priceMatch = trimmed.match(/• (?:최종 결제액|결제 금액):\s*([0-9,]+)원/);
    const recipientMatch = trimmed.match(/• 수령인:\s*([^님\n]+)/);
    const addressMatch = trimmed.match(/• 배송지:\s*(.+)/);

    return {
      bookTitle: titleMatch ? titleMatch[1] : '가족 포토북',
      volume: titleMatch && titleMatch[2] ? titleMatch[2] : 'Vol. 1',
      copies: copiesMatch ? copiesMatch[1].trim() : '1권',
      pointsUsed: pointsMatch ? parseInt(pointsMatch[1].replace(/,/g, ''), 10) : 0,
      totalPrice: priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : 0,
      recipient: recipientMatch ? recipientMatch[1].trim() : '가족',
      address: addressMatch ? addressMatch[1].trim() : '',
    };
  }

  return null;
};

/**
 * 대화방 목록 시간 포맷팅 (카카오톡/라인/메신저 표준 UX)
 */
export const formatChatRoomTime = (
  dateOrIso?: string | Date | null,
  fallbackTimestamp?: string | null
): string => {
  let msgDate: Date | null = null;
  if (dateOrIso) {
    const d = new Date(dateOrIso);
    if (!isNaN(d.getTime())) {
      msgDate = d;
    }
  }

  if (!msgDate && fallbackTimestamp) {
    return fallbackTimestamp;
  }

  if (!msgDate) {
    return '대화 가능';
  }

  const now = new Date();
  const isSameYear = msgDate.getFullYear() === now.getFullYear();
  const isSameMonth = msgDate.getMonth() === now.getMonth();
  const isSameDate = msgDate.getDate() === now.getDate();

  if (isSameYear && isSameMonth && isSameDate) {
    const isPm = msgDate.getHours() >= 12;
    const hours = msgDate.getHours() % 12 || 12;
    const minutes =
      msgDate.getMinutes() < 10
        ? `0${msgDate.getMinutes()}`
        : msgDate.getMinutes();
    return `${isPm ? '오후' : '오전'} ${hours}:${minutes}`;
  }

  const yesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1
  );
  const isYesterday =
    msgDate.getFullYear() === yesterday.getFullYear() &&
    msgDate.getMonth() === yesterday.getMonth() &&
    msgDate.getDate() === yesterday.getDate();
  if (isYesterday) {
    return '어제';
  }

  if (isSameYear) {
    return `${msgDate.getMonth() + 1}월 ${msgDate.getDate()}일`;
  }

  const month = String(msgDate.getMonth() + 1).padStart(2, '0');
  const day = String(msgDate.getDate()).padStart(2, '0');
  return `${msgDate.getFullYear()}.${month}.${day}`;
};

export const parseKoreanTimeToMs = (timeStr?: string | null): number => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const match = timeStr.match(/(오전|오후)\s*(\d{1,2}):(\d{2})/);
  if (match) {
    const isPm = match[1] === '오후';
    let hours = parseInt(match[2], 10);
    const minutes = parseInt(match[3], 10);
    if (isPm && hours < 12) hours += 12;
    if (!isPm && hours === 12) hours = 0;
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    return d.getTime();
  }
  return 0;
};

/**
 * 메시지 공감(이모지 리액션) 지원 상수 및 파서
 * DB 스키마 변경 없이 모든 가족에게 실시간 동기화되도록 메시지 텍스트 말미의 [[REACT:{...}]] 메타 태그로 직렬화합니다.
 */
export const REACTION_EMOJIS = ['❤️', '👍', '😂', '👏', '😢'] as const;

const REACTION_SUFFIX_REGEX = /\n?\[\[REACT:(\{[\s\S]*?\})\]\]$/;
const EDITED_SUFFIX_REGEX = /\n?\[\[EDITED\]\]$/;

export interface ExtractedMessageReactions {
  cleanText: string;
  reactions: Record<string, string[]>;
  isEdited: boolean;
}

export const extractReactionsAndCleanText = (
  rawText?: string | null
): ExtractedMessageReactions => {
  if (!rawText || typeof rawText !== 'string') {
    return { cleanText: '', reactions: {}, isEdited: false };
  }
  let workingText = rawText;
  let reactions: Record<string, string[]> = {};

  const match = workingText.match(REACTION_SUFFIX_REGEX);
  if (match) {
    workingText = workingText.slice(0, match.index ?? workingText.length);
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed && typeof parsed === 'object') {
        Object.keys(parsed).forEach((emoji) => {
          if (Array.isArray(parsed[emoji]) && parsed[emoji].length > 0) {
            reactions[emoji] = parsed[emoji].map(String);
          }
        });
      }
    } catch (_) {}
  }

  let isEdited = false;
  const editedMatch = workingText.match(EDITED_SUFFIX_REGEX);
  if (editedMatch) {
    isEdited = true;
    workingText = workingText.slice(0, editedMatch.index ?? workingText.length);
  }

  return { cleanText: workingText, reactions, isEdited };
};

export const toggleMessageReactionText = (
  rawText: string | undefined | null,
  emoji: string,
  actorName: string
): string => {
  const { cleanText, reactions, isEdited } = extractReactionsAndCleanText(rawText);
  const currentList = reactions[emoji] ? [...reactions[emoji]] : [];
  const existingIdx = currentList.indexOf(actorName);

  if (existingIdx >= 0) {
    currentList.splice(existingIdx, 1);
  } else {
    currentList.push(actorName);
  }

  const nextReactions: Record<string, string[]> = { ...reactions };
  if (currentList.length > 0) {
    nextReactions[emoji] = currentList;
  } else {
    delete nextReactions[emoji];
  }

  const baseWithEdited = isEdited
    ? cleanText
      ? `${cleanText}\n[[EDITED]]`
      : '[[EDITED]]'
    : cleanText;

  const activeEmojis = Object.keys(nextReactions).filter(
    (k) => Array.isArray(nextReactions[k]) && nextReactions[k].length > 0
  );
  if (activeEmojis.length === 0) {
    return baseWithEdited;
  }

  const serialized = JSON.stringify(nextReactions);
  return baseWithEdited
    ? `${baseWithEdited}\n[[REACT:${serialized}]]`
    : `[[REACT:${serialized}]]`;
};

export const applyEditedMessageText = (
  originalRawText: string | undefined | null,
  newBodyText: string
): string => {
  const { cleanText, reactions } = extractReactionsAndCleanText(originalRawText);
  const replyMeta = parseReplyHeader(cleanText);
  let rebuiltClean = newBodyText.trim();

  if (replyMeta) {
    const replyData = {
      id: replyMeta.replyId,
      name: replyMeta.senderName,
      snippet: replyMeta.snippet,
    };
    rebuiltClean = `[답장:${JSON.stringify(replyData)}]\n${rebuiltClean}`;
  }

  const withEdited = `${rebuiltClean}\n[[EDITED]]`;
  const activeEmojis = Object.keys(reactions).filter(
    (k) => Array.isArray(reactions[k]) && reactions[k].length > 0
  );
  if (activeEmojis.length === 0) {
    return withEdited;
  }
  return `${withEdited}\n[[REACT:${JSON.stringify(reactions)}]]`;
};

/**
 * 날짜 구분선(Date Divider) 및 연속 메시지 그룹핑 메타데이터 계산기
 */
const WEEKDAY_KO = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

export const getMessageDateKey = (msg: any): string => {
  const raw = msg?.created_at || msg?.rawDate;
  if (raw) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  return 'today-default';
};

export const formatDateDividerLabel = (msg: any): string => {
  const raw = msg?.created_at || msg?.rawDate;
  const d = raw ? new Date(raw) : new Date();
  const validDate = !isNaN(d.getTime()) ? d : new Date();
  const yyyy = validDate.getFullYear();
  const mm = validDate.getMonth() + 1;
  const dd = validDate.getDate();
  const dayName = WEEKDAY_KO[validDate.getDay()];
  return `${yyyy}년 ${mm}월 ${dd}일 ${dayName}`;
};

export const isSystemNoticeMessage = (msg: any): boolean => {
  if (!msg) return false;
  const { cleanText } = extractReactionsAndCleanText(
    typeof msg.text === 'string' ? msg.text : ''
  );
  const replyMeta = parseReplyHeader(cleanText);
  const body = replyMeta ? replyMeta.cleanText : cleanText;
  return (
    body.startsWith('[공지등록]') ||
    body.startsWith('[공지설정]') ||
    body.startsWith('[공지해제]') ||
    body.startsWith('[방생성]')
  );
};

export const getMessageSenderUniqueKey = (msg: any): string => {
  if (!msg) return '';
  return String(
    msg.profile_id ||
      msg.senderObj?.id ||
      msg.senderName ||
      msg.sender ||
      ''
  );
};

export interface MessageGroupingMeta {
  showDateDivider: boolean;
  dateDividerLabel: string;
  showSenderHeader: boolean;
  showTimestampMeta: boolean;
  isGroupedWithPrev: boolean;
  isGroupedWithNext: boolean;
}

export const computeMessageGroupingMeta = (
  messages: any[],
  index: number
): MessageGroupingMeta => {
  const current = messages[index];
  if (!current) {
    return {
      showDateDivider: false,
      dateDividerLabel: '',
      showSenderHeader: true,
      showTimestampMeta: true,
      isGroupedWithPrev: false,
      isGroupedWithNext: false,
    };
  }

  const prev = index > 0 ? messages[index - 1] : null;
  const next = index < messages.length - 1 ? messages[index + 1] : null;

  const currentDateKey = getMessageDateKey(current);
  const prevDateKey = prev ? getMessageDateKey(prev) : null;
  const nextDateKey = next ? getMessageDateKey(next) : null;

  const showDateDivider = !prev || currentDateKey !== prevDateKey;
  const dateDividerLabel = showDateDivider ? formatDateDividerLabel(current) : '';

  const currentSender = getMessageSenderUniqueKey(current);
  const prevSender = prev ? getMessageSenderUniqueKey(prev) : '';
  const nextSender = next ? getMessageSenderUniqueKey(next) : '';

  const currentTime = current.timestamp || '';
  const prevTime = prev?.timestamp || '';
  const nextTime = next?.timestamp || '';

  const isGroupedWithPrev = Boolean(
    prev &&
      !showDateDivider &&
      !isSystemNoticeMessage(current) &&
      !isSystemNoticeMessage(prev) &&
      currentSender &&
      currentSender === prevSender &&
      currentTime &&
      currentTime === prevTime
  );

  const isGroupedWithNext = Boolean(
    next &&
      currentDateKey === nextDateKey &&
      !isSystemNoticeMessage(current) &&
      !isSystemNoticeMessage(next) &&
      currentSender &&
      currentSender === nextSender &&
      currentTime &&
      currentTime === nextTime
  );

  return {
    showDateDivider,
    dateDividerLabel,
    showSenderHeader: !isGroupedWithPrev,
    showTimestampMeta: !isGroupedWithNext,
    isGroupedWithPrev,
    isGroupedWithNext,
  };
};

/**
 * 일반 텍스트 내 URL 및 전화번호 자동 감지/분리 유틸리티
 */
export interface LinkSegment {
  type: 'text' | 'url' | 'phone';
  value: string;
  href?: string;
}

const URL_OR_PHONE_REGEX =
  /((?:https?:\/\/|www\.)[^\s]+)|(\b(?:01[016789]|02|0[3-6][1-5]|15\d{2}|16\d{2}|18\d{2})-\d{3,4}-\d{4}\b)/gi;

export const splitTextWithLinks = (text: string): LinkSegment[] => {
  if (!text || typeof text !== 'string') return [{ type: 'text', value: '' }];
  const segments: LinkSegment[] = [];
  let lastIdx = 0;

  let match: RegExpExecArray | null;
  const regex = new RegExp(URL_OR_PHONE_REGEX.source, 'gi');

  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;
    if (matchIndex > lastIdx) {
      segments.push({
        type: 'text',
        value: text.slice(lastIdx, matchIndex),
      });
    }

    const fullMatch = match[0];
    if (match[1]) {
      const href = fullMatch.toLowerCase().startsWith('http')
        ? fullMatch
        : `https://${fullMatch}`;
      segments.push({
        type: 'url',
        value: fullMatch,
        href,
      });
    } else if (match[2]) {
      segments.push({
        type: 'phone',
        value: fullMatch,
        href: `tel:${fullMatch.replace(/-/g, '')}`,
      });
    }

    lastIdx = matchIndex + fullMatch.length;
  }

  if (lastIdx < text.length) {
    segments.push({
      type: 'text',
      value: text.slice(lastIdx),
    });
  }

  return segments.length > 0 ? segments : [{ type: 'text', value: text }];
};

