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
