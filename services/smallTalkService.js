import { supabase, isSupabaseReady } from '../lib/supabase';
import { PREDEFINED_TOPICS, stripEmojis } from '../utils/topics';

// 메모리 캐시 (불필요한 반복 쿼리 방지)
let cachedTopics = null;
let lastFetchedFamilyId = null;

/**
 * Supabase DB에서 스몰톡 질문 목록을 조회하고, 없을 경우 자동 시딩합니다.
 * @param {string} familyId - 가족 ID
 * @returns {Promise<Array<{id: string, question: string, category: string, assigned_date?: string}>>}
 */
export async function fetchSmallTalkTopicsFromDB(familyId) {
  try {
    if (!isSupabaseReady) {
      return PREDEFINED_TOPICS.map((q, idx) => ({
        id: `mock-topic-${idx}`,
        question: stripEmojis(q),
        category: '일상',
        order_index: idx,
      }));
    }

    // 1. DB에서 공용 질문(family_id is null) 또는 해당 가족 전용 질문 조회
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

    // 2. 테이블이 존재하고 데이터가 있는 경우
    if (!error && Array.isArray(data) && data.length > 0) {
      const sanitized = data.map(item => ({
        ...item,
        question: stripEmojis(item.question),
      }));
      cachedTopics = sanitized;
      lastFetchedFamilyId = familyId;
      return sanitized;
    }

    // 3. 만약 테이블이 비어있다면 (초기 데이터 시딩)
    if (!error && Array.isArray(data) && data.length === 0) {
      const seedRows = PREDEFINED_TOPICS.map((q, idx) => ({
        question: stripEmojis(q),
        category: '일상',
        order_index: idx,
        family_id: null, // 전체 가족 공용
      }));

      const { data: insertedData, error: insertErr } = await supabase
        .from('small_talk_topics')
        .insert(seedRows)
        .select('*');

      if (!insertErr && Array.isArray(insertedData) && insertedData.length > 0) {
        const sanitized = insertedData.map(item => ({
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

  // 4. Fallback: 코드에 정의된 이모티콘 없는 기본 질문 반환
  return PREDEFINED_TOPICS.map((q, idx) => ({
    id: `local-topic-${idx}`,
    question: stripEmojis(q),
    category: '일상',
    order_index: idx,
  }));
}

/**
 * 새 스몰톡 질문을 DB에 추가합니다. 이모티콘은 사전에 100% 필터링됩니다.
 * @param {string} familyId - 가족 ID (null이면 공용)
 * @param {string} rawQuestion - 생성할 질문 텍스트
 * @param {string} category - 카테고리 (기본 '일상')
 * @param {string} [assignedDate] - 특정 날짜 지정 (YYYY-MM-DD)
 */
export async function addSmallTalkTopicToDB(familyId, rawQuestion, category = '일상', assignedDate = null) {
  // 이모티콘 완전 제거
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
      family_id: familyId,
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

  // 캐시 무효화
  cachedTopics = null;

  return {
    ...data,
    question: stripEmojis(data.question),
  };
}

/**
 * 특정 날짜에 배정된 질문을 가져옵니다.
 * @param {Array} topicsList - DB 또는 기본 질문 목록
 * @param {Date|string} date - 대상 날짜
 * @returns {string} 이모티콘이 제거된 질문 텍스트
 */
export function getTopicForDateFromList(topicsList, date = new Date()) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${day}`;

  const list = Array.isArray(topicsList) && topicsList.length > 0 ? topicsList : PREDEFINED_TOPICS;

  // 1. 해당 날짜로 직접 배정(assigned_date)된 질문이 있는지 확인
  if (Array.isArray(topicsList) && topicsList.length > 0) {
    const directMatch = topicsList.find(t => t.assigned_date === dateStr);
    if (directMatch && directMatch.question) {
      return stripEmojis(directMatch.question);
    }
  }

  // 2. 결정론적 인덱스 계산 (day of year)
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const index = Math.abs(dayOfYear) % list.length;

  const item = list[index];
  const qText = typeof item === 'object' && item.question ? item.question : item;
  return stripEmojis(qText);
}
