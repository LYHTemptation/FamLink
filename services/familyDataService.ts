/**
 * FamLink Family Data Normalization & Sync Service (TypeScript)
 *
 * `App.js`의 반복 집안일 자정 리셋/정리, 메시지/일정 Row 정규화,
 * 반려몽 생체 게이지(Vitals) 자연 소모 계산 로직을 전담합니다.
 */

import { supabase, isSupabaseReady } from '../lib/supabase';
import { getTodayString } from '../components/app/appConstants';

export interface PetVitalsState {
  hunger: number;
  happiness: number;
  cleanliness: number;
  energy: number;
}

/**
 * 반복 집안일(daily/weekly) 자정 리셋 및 만료된 1회성 완료 항목 DB 자동 정리
 */
export function normalizeRecurringShoppingItems(items: any[]): any[] {
  if (!items || !Array.isArray(items)) return items;
  const todayStr = getTodayString();
  const expiredOneTimeIds: string[] = [];
  const resetRecurringIds: string[] = [];
  const activeList: any[] = [];

  items.forEach((item) => {
    const isDaily = item.repeat_type === 'daily';
    const isWeekly = item.repeat_type === 'weekly';
    const isOneTime = !isDaily && !isWeekly;
    const compDate =
      item.completed_date ||
      (item.completed_at ? item.completed_at.slice(0, 10) : null);

    if (item.is_completed) {
      if (isOneTime) {
        if (compDate && compDate !== todayStr) {
          expiredOneTimeIds.push(item.id);
          return;
        }
      } else if (isDaily) {
        if (compDate && compDate !== todayStr) {
          resetRecurringIds.push(item.id);
          activeList.push({
            ...item,
            is_completed: false,
            completed_by: null,
            points_earned: false,
            completed_date: null,
            completed_at: null,
          });
          return;
        }
      } else if (isWeekly) {
        if (compDate) {
          const compTime = new Date(compDate).getTime();
          const nowTime = new Date().getTime();
          const diffDays = (nowTime - compTime) / (1000 * 3600 * 24);
          if (diffDays >= 7) {
            resetRecurringIds.push(item.id);
            activeList.push({
              ...item,
              is_completed: false,
              completed_by: null,
              points_earned: false,
              completed_date: null,
              completed_at: null,
            });
            return;
          }
        }
      }
    }

    activeList.push(item);
  });

  if (isSupabaseReady) {
    const isUuid = (id: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id
      );

    const targetDeleteUuids = expiredOneTimeIds.filter(isUuid);
    if (targetDeleteUuids.length > 0) {
      supabase
        .from('shopping_items')
        .delete()
        .in('id', targetDeleteUuids)
        .then(({ error }) => {
          if (error) {
            console.log('Auto-cleanup expired one-time chores error:', error);
          }
        })
        .catch(() => {});
    }

    const targetResetUuids = resetRecurringIds.filter(isUuid);
    if (targetResetUuids.length > 0) {
      supabase
        .from('shopping_items')
        .update({
          is_completed: false,
          completed_by: null,
          points_earned: false,
          completed_date: null,
          completed_at: null,
        })
        .in('id', targetResetUuids)
        .then(({ error }) => {
          if (error) {
            console.log('Auto-reset recurring chores in DB error:', error);
          }
        })
        .catch(() => {});
    }
  }

  return activeList;
}

/**
 * 메시지 텍스트/객체 페이로드 안전 문자열 정규화
 */
export function normalizeMessageTextPayload(rawText: any): string {
  if (typeof rawText === 'string') return rawText;
  if (typeof rawText === 'object' && rawText !== null) {
    if (rawText.bookTitle) {
      return `📦 [실물 포토북 주문] "${rawText.bookTitle}" (수령인: ${rawText.recipient || '가족'}님)`;
    }
    return JSON.stringify(rawText);
  }
  return String(rawText || '');
}

/**
 * Supabase `messages` 테이블 Row를 UI 상태 객체로 변환
 */
export function formatSupabaseMessageRow(m: any): any {
  const timestamp = new Date(m.created_at).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return {
    id: m.id,
    sender: m.profiles?.role || 'son',
    profile_id: m.profile_id,
    senderObj: m.profiles || null,
    senderName: m.profiles?.name || null,
    text: normalizeMessageTextPayload(m.text),
    image: m.image_url || null,
    image_url: m.image_url || null,
    room_id: m.room_id || 'family-group',
    timestamp,
    created_at: m.created_at,
    readBy: m.read_by || [],
  };
}

/**
 * 반려몽 시간 경과에 따른 생체 게이지(Vitals) 자연 소모 계산
 */
export function calculateDecayedPetVitals(
  serverVitals: PetVitalsState,
  lastUpdatedIso: string
): PetVitalsState {
  const lastUpdated = new Date(lastUpdatedIso).getTime();
  const now = Date.now();
  const elapsedHours = Math.max(0, (now - lastUpdated) / (1000 * 60 * 60));

  const calculatedVitals: PetVitalsState = { ...serverVitals };
  if (elapsedHours > 0.25) {
    calculatedVitals.hunger = Math.max(
      15,
      Math.min(100, Math.round(serverVitals.hunger - elapsedHours * 5))
    );
    calculatedVitals.happiness = Math.max(
      15,
      Math.min(100, Math.round(serverVitals.happiness - elapsedHours * 4))
    );
    calculatedVitals.cleanliness = Math.max(
      15,
      Math.min(100, Math.round(serverVitals.cleanliness - elapsedHours * 2.5))
    );
    calculatedVitals.energy = Math.max(
      15,
      Math.min(100, Math.round(serverVitals.energy - elapsedHours * 3))
    );
  }
  return calculatedVitals;
}
