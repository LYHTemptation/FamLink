import { supabase, isSupabaseReady } from '../lib/supabase';
import { PREDEFINED_TOPICS, stripEmojis } from '../utils/topics';
import type { SmallTalkTopicRow } from '../types/domain';

// 메모리 캐시 (불필요한 반복 쿼리 방지)
let cachedTopics: SmallTalkTopicRow[] | null = null;
let lastFetchedFamilyId: string | null | undefined = null;

/**
 * Supabase DB에서 스몰톡 질문 목록을 조회하고, 없을 경우 자동 시딩합니다.
 */
export async function fetchSmallTalkTopicsFromDB(
  familyId?: string | null
): Promise<SmallTalkTopicRow[]> {
  try {
    if (!isSupabaseReady) {
      return PREDEFINED_TOPICS.map((q, idx) => ({
        id: `mock-topic-${idx}`,
        question: stripEmojis(q),
        category: '일상',
        order_index: idx,
      }));
    }

    if (cachedTopics && lastFetchedFamilyId === familyId) {
      return cachedTopics;
    }

    let query = supabase
      .from('small_talk_topics')
      .select('*')
      .order('order_index', { ascending: true });

    if (familyId) {
      query = query.or(`family_id.is.null,family_id.eq.${familyId}`);
    } else {
      query = query.is('family_id', null);
    }

    const { data, error } = await query;

    if (!error && Array.isArray(data) && data.length > 0) {
      const sanitized: SmallTalkTopicRow[] = data.map((item: any) => ({
        ...item,
        question: stripEmojis(item.question),
      }));
      cachedTopics = sanitized;
      lastFetchedFamilyId = familyId;
      return sanitized;
    }

    if (!error && Array.isArray(data) && data.length === 0) {
      const seedRows = PREDEFINED_TOPICS.map((q, idx) => ({
        question: stripEmojis(q),
        category: '일상',
        order_index: idx,
        family_id: null,
      }));

      const { data: insertedData, error: insertErr } = await supabase
        .from('small_talk_topics')
        .insert(seedRows)
        .select('*');

      if (!insertErr && Array.isArray(insertedData) && insertedData.length > 0) {
        const sanitized: SmallTalkTopicRow[] = insertedData.map((item: any) => ({
          ...item,
          question: stripEmojis(item.question),
        }));
        cachedTopics = sanitized;
        lastFetchedFamilyId = familyId;
        return sanitized;
      }
    }
  } catch (e) {
    console.warn('[smallTalkService] DB 조회 중 예외 발생 (Fallback 사용):', e);
  }

  return PREDEFINED_TOPICS.map((q, idx) => ({
    id: `local-topic-${idx}`,
    question: stripEmojis(q),
    category: '일상',
    order_index: idx,
  }));
}

/**
 * 새 스몰톡 질문을 DB에 추가합니다. 이모티콘은 사전에 100% 필터링됩니다.
 */
export async function addSmallTalkTopicToDB(
  familyId: string | null | undefined,
  rawQuestion: string,
  category: string = '일상',
  assignedDate: string | null = null
): Promise<SmallTalkTopicRow> {
  const cleanQuestion = stripEmojis(rawQuestion);
  if (!cleanQuestion || cleanQuestion.length < 3) {
    throw new Error('질문 내용이 너무 짧거나 비어있습니다.');
  }

  if (!isSupabaseReady) {
    return {
      id: `local-${Date.now()}`,
      question: cleanQuestion,
      category,
      assigned_date: assignedDate,
      family_id: familyId || null,
    };
  }

  const row = {
    family_id: familyId || null,
    question: cleanQuestion,
    category: category || '일상',
    assigned_date: assignedDate || null,
  };

  const { data, error } = await supabase
    .from('small_talk_topics')
    .insert([row])
    .select('*')
    .single();

  if (error) {
    console.warn('[smallTalkService] 질문 추가 실패:', error.message);
    throw error;
  }

  cachedTopics = null;

  return {
    ...data,
    question: stripEmojis(data.question),
  };
}

/**
 * 특정 날짜에 배정된 질문을 가져옵니다.
 */
export function getTopicForDateFromList(
  topicsList?: Array<SmallTalkTopicRow | string> | null,
  date: Date | string | number = new Date()
): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${day}`;

  const list =
    Array.isArray(topicsList) && topicsList.length > 0
      ? topicsList
      : PREDEFINED_TOPICS;

  if (Array.isArray(topicsList) && topicsList.length > 0) {
    const directMatch = topicsList.find(
      (t): t is SmallTalkTopicRow =>
        typeof t === 'object' && t !== null && t.assigned_date === dateStr
    );
    if (directMatch && directMatch.question) {
      return stripEmojis(directMatch.question);
    }
  }

  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const index = Math.abs(dayOfYear) % list.length;

  const item = list[index];
  const qText =
    typeof item === 'object' && item !== null && 'question' in item
      ? item.question
      : String(item);
  return stripEmojis(qText);
}
