/**
 * FamLink Photobook Supabase Persistence & Order Service (TypeScript)
 *
 * `PhotobookStudioScreen`의 Supabase DB 조회, 실시간 동기화 행 변환,
 * 권차(Volume) 목록 조회, 실물 도서 발주(`photobook_orders`) 로직을 전담합니다.
 */

import { Image, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import type {
  PhotobookSyncPayload,
  PhotobookOrderRecord,
} from '../types/domain';

export interface PhotobookVolumeMeta {
  id: string;
  title: string;
  label: string;
  period: string;
  desc: string;
}

// =========================================================
// ⚡ 인메모리 즉시 렌더링 캐시 & 안전한 AsyncStorage 동기화
// =========================================================
const photobookVolumeMemoryCache = new Map<string, PhotobookSyncPayload>();
const photobookVolumesListMemoryCache = new Map<
  string,
  Array<{ volume_id: string; title?: string }>
>();
const orderedVolumesMemoryCache = new Map<string, string[]>();

const MAX_SAFE_ASYNC_STORAGE_BYTES = 1800000; // Android CursorWindow 2MB 한계 방어용 (약 1.8MB)

export function getPhotobookStorageKey(familyId: string, volumeId: string = 'vol-1'): string {
  return `FAMLINK_PHOTOBOOK_SYNC_${familyId}_${volumeId || 'vol-1'}`;
}

export function getCachedPhotobookVolume(
  familyId?: string | null,
  volumeId: string = 'vol-1'
): PhotobookSyncPayload | null {
  if (!familyId || familyId === 'default-family') return null;
  return photobookVolumeMemoryCache.get(getPhotobookStorageKey(familyId, volumeId)) || null;
}

export function getCachedPhotobookVolumesList(
  familyId?: string | null
): Array<{ volume_id: string; title?: string }> | null {
  if (!familyId || familyId === 'default-family') return null;
  return photobookVolumesListMemoryCache.get(familyId) || null;
}

export function getCachedOrderedVolumeIds(familyId?: string | null): string[] | null {
  if (!familyId || familyId === 'default-family') return null;
  return orderedVolumesMemoryCache.get(familyId) || null;
}

/**
 * 포토북 내 원격(http/https) 이미지 URL들을 모바일 네이티브 이미지 캐시에 백그라운드 프리페치
 */
function warmNativePhotobookImages(payload?: PhotobookSyncPayload | null): void {
  if (!payload) return;
  try {
    const urls = new Set<string>();
    if (
      typeof payload.coverPhoto === 'string' &&
      (payload.coverPhoto.startsWith('http://') || payload.coverPhoto.startsWith('https://'))
    ) {
      urls.add(payload.coverPhoto);
    }
    if (payload.spreadPhotos && typeof payload.spreadPhotos === 'object') {
      Object.values(payload.spreadPhotos).forEach((arr) => {
        if (Array.isArray(arr)) {
          arr.forEach((uri) => {
            if (typeof uri === 'string' && (uri.startsWith('http://') || uri.startsWith('https://'))) {
              urls.add(uri);
            }
          });
        }
      });
    }
    urls.forEach((url) => {
      Image.prefetch(url).catch(() => {});
    });
  } catch (_) {}
}

/**
 * 인메모리 캐시 갱신 및 모바일 AsyncStorage 안전 저장 (2MB 초과 시 경량화 폴백)
 */
export function setCachedPhotobookVolume(
  familyId: string,
  volumeId: string,
  payload: PhotobookSyncPayload
): void {
  if (!familyId || familyId === 'default-family' || !payload) return;
  const key = getPhotobookStorageKey(familyId, volumeId || 'vol-1');
  const existing = photobookVolumeMemoryCache.get(key);
  if (existing?.updatedAt && payload.updatedAt && payload.updatedAt < existing.updatedAt) {
    return;
  }
  photobookVolumeMemoryCache.set(key, payload);
  warmNativePhotobookImages(payload);

  try {
    const serialized = JSON.stringify(payload);
    if (Platform.OS === 'android' && serialized.length > MAX_SAFE_ASYNC_STORAGE_BYTES) {
      // Android SQLite CursorWindow(2MB) 초과 방어: 대용량 data:image Base64를 제외한 레이아웃/표지/텍스트 우선 캐싱
      const slimSpreadPhotos: Record<string | number, string[]> = {};
      if (payload.spreadPhotos) {
        Object.entries(payload.spreadPhotos).forEach(([k, list]) => {
          if (Array.isArray(list)) {
            slimSpreadPhotos[k] = list.filter((u) => typeof u === 'string' && !u.startsWith('data:image'));
          }
        });
      }
      const slimPayload: PhotobookSyncPayload = {
        ...payload,
        coverPhoto:
          typeof payload.coverPhoto === 'string' && payload.coverPhoto.length > 250000
            ? null
            : payload.coverPhoto,
        spreadPhotos: slimSpreadPhotos,
        customGalleryPhotos: (payload.customGalleryPhotos || []).filter(
          (u) => typeof u === 'string' && !u.startsWith('data:image')
        ),
      };
      AsyncStorage.setItem(key, JSON.stringify(slimPayload)).catch(() => {});
      return;
    }
    AsyncStorage.setItem(key, serialized).catch(() => {});
  } catch (_) {}
}

/**
 * 앱 시작 시 백그라운드에서 가족 대표 포토북(vol-1)과 권차 메타데이터를 미리 메모리에 적재합니다.
 */
export async function preloadFamilyPhotobookData(familyId: string): Promise<void> {
  if (!familyId || familyId === 'default-family') return;
  const vol1Key = getPhotobookStorageKey(familyId, 'vol-1');

  // 1. 로컬 AsyncStorage에 저장된 vol-1 캐시를 인메모리에 즉시 복원
  if (!photobookVolumeMemoryCache.has(vol1Key)) {
    try {
      const saved = await AsyncStorage.getItem(vol1Key);
      if (saved) {
        const parsed = JSON.parse(saved) as PhotobookSyncPayload;
        if (parsed && !photobookVolumeMemoryCache.has(vol1Key)) {
          photobookVolumeMemoryCache.set(vol1Key, parsed);
          warmNativePhotobookImages(parsed);
        }
      }
    } catch (_) {}
  }

  // 2. 원격 Supabase DB에서 최신 포토북(vol-1), 권차 목록, 주문 잠금 목록을 병렬 프리페치
  await Promise.all([
    fetchFamilyPhotobookVolume(familyId, 'vol-1'),
    fetchFamilyPhotobookVolumes(familyId),
    fetchOrderedVolumeIds(familyId),
  ]).catch(() => {});
}

/**
 * DB `family_photobooks` 테이블 행(Row)을 화면 상태 페이로드로 정규화합니다.
 */
export function mapPhotobookRowToState(row: Record<string, any>): PhotobookSyncPayload {
  return {
    selectedVolume: row.volume_id,
    selectedThemeId: row.theme_id,
    bookFontFamily: row.font_family,
    bookFontSize: row.font_size,
    bookTitle: row.title,
    bookSubtitle: row.subtitle,
    coverSignature: row.cover_signature,
    coverPhoto: row.cover_photo_url,
    coverStyle: row.cover_style,
    pageFormats: row.page_formats || {},
    spreadPhotos: row.spread_photos || {},
    spreadLayouts: row.spread_layouts || {},
    spreadCaptions: row.spread_captions || {},
    customSpreadTopics: row.custom_spread_topics || {},
    customGalleryPhotos: row.custom_gallery_photos || [],
    prologueEssay: row.prologue_essay || '',
    epilogueEssay: row.epilogue_essay || '',
    updatedBy: row.updated_by || '가족',
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
    isLocked: Boolean(row.is_locked),
    orderStatus: row.order_status || undefined,
  };
}

/**
 * 가족 포토북 상태 영구 저장 (UPSERT) 및 활동 기록
 */
export async function saveFamilyPhotobookToDB(params: {
  familyId: string;
  volumeId: string;
  payload: PhotobookSyncPayload;
  updatedBy: string;
}): Promise<void> {
  const { familyId, volumeId, payload, updatedBy } = params;
  if (!familyId || familyId === 'default-family') return;
  if (payload.isLocked) return;

  setCachedPhotobookVolume(familyId, volumeId || 'vol-1', payload);

  Promise.resolve(
    supabase
      .from('petmong_activities')
      .insert({
        family_id: familyId,
        action_type: 'PHOTOBOOK_SYNC_UPDATE',
        exp_gained: 0,
        points_awarded: 0,
      })
  )
    .then(() => {})
    .catch(() => {});

  const cleanCoverPhoto =
    payload.coverPhoto &&
    typeof payload.coverPhoto === 'string' &&
    payload.coverPhoto.startsWith('file://')
      ? null
      : payload.coverPhoto || null;

  try {
    const { error: upsertErr } = await supabase
      .from('family_photobooks')
      .upsert(
        {
          family_id: familyId,
          volume_id: volumeId,
          title: payload.bookTitle,
          subtitle: payload.bookSubtitle,
          cover_signature: payload.coverSignature,
          cover_photo_url: cleanCoverPhoto,
          cover_style: payload.coverStyle,
          theme_id: payload.selectedThemeId,
          font_family: payload.bookFontFamily,
          font_size: payload.bookFontSize,
          spread_photos: payload.spreadPhotos,
          spread_layouts: payload.spreadLayouts,
          page_formats: payload.pageFormats,
          spread_captions: payload.spreadCaptions,
          custom_spread_topics: payload.customSpreadTopics,
          custom_gallery_photos: payload.customGalleryPhotos,
          prologue_essay: payload.prologueEssay,
          epilogue_essay: payload.epilogueEssay,
          updated_by: updatedBy,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'family_id,volume_id' }
      );

    if (upsertErr) {
      console.warn(
        '⚠️ family_photobooks upsert 실패 (RLS 권한 또는 테이블 설정을 확인하세요):',
        upsertErr.message
      );
    }
  } catch (dbErr) {
    console.warn('family_photobooks upsert sync note:', dbErr);
  }
}

/**
 * 특정 권차(volume_id) 포토북 원격 데이터 단건 조회 (조회 즉시 인메모리 & 로컬 캐시 갱신)
 */
export async function fetchFamilyPhotobookVolume(
  familyId: string,
  volumeId: string
): Promise<PhotobookSyncPayload | null> {
  if (!familyId || familyId === 'default-family') return null;
  const targetVol = volumeId || 'vol-1';

  try {
    const { data, error } = await supabase
      .from('family_photobooks')
      .select('*')
      .eq('family_id', familyId)
      .eq('volume_id', targetVol)
      .maybeSingle();

    if (!error && data) {
      const mapped = mapPhotobookRowToState(data);
      setCachedPhotobookVolume(familyId, targetVol, mapped);
      return mapped;
    }
  } catch (_) {}
  return null;
}

/**
 * 가족이 생성한 전체 권차(volume_id, title) 목록 조회
 */
export async function fetchFamilyPhotobookVolumes(
  familyId: string
): Promise<Array<{ volume_id: string; title?: string }>> {
  if (!familyId || familyId === 'default-family') return [];

  try {
    const { data } = await supabase
      .from('family_photobooks')
      .select('volume_id, title')
      .eq('family_id', familyId);

    const list = Array.isArray(data) ? data : [];
    if (list.length > 0) {
      photobookVolumesListMemoryCache.set(familyId, list);
    }
    return list;
  } catch (_) {
    return photobookVolumesListMemoryCache.get(familyId) || [];
  }
}

/**
 * 특정 가족의 주문 완료(발간/인쇄 중)되어 잠금 처리된 volume_id 목록 조회
 */
export async function fetchOrderedVolumeIds(
  familyId: string
): Promise<string[]> {
  if (!familyId || familyId === 'default-family') return [];
  try {
    const { data, error } = await supabase
      .from('photobook_orders')
      .select('volume_id, status')
      .eq('family_id', familyId)
      .not('status', 'eq', 'cancelled');

    if (!error && Array.isArray(data)) {
      const ids = Array.from(new Set(data.map((r: any) => r.volume_id).filter(Boolean)));
      orderedVolumesMemoryCache.set(familyId, ids);
      return ids;
    }
  } catch (err) {
    console.warn('[photobookService] fetchOrderedVolumeIds error:', err);
  }
  return orderedVolumesMemoryCache.get(familyId) || [];
}

/**
 * 실물 양장본 도서 주문(`photobook_orders`) 생성 및 해당 권차 잠금(is_locked) 동기화
 */
export async function createPhotobookOrderInDB(
  orderRecord: PhotobookOrderRecord
): Promise<{ order_number?: string } | null> {
  try {
    const { data: insertedOrder, error: orderError } = await supabase
      .from('photobook_orders')
      .insert(orderRecord)
      .select()
      .single();

    if (orderError) {
      console.warn('photobook_orders insert error:', orderError);
      return null;
    }
    console.log(
      'Successfully inserted photobook order:',
      insertedOrder?.order_number
    );

    // 주문 성공 시 해당 권차를 발간 완료(is_locked: true)로 갱신 (가능한 경우)
    if (orderRecord.family_id && orderRecord.volume_id) {
      Promise.resolve(
        supabase
          .from('family_photobooks')
          .update({
            is_locked: true,
            updated_at: new Date().toISOString(),
          })
          .eq('family_id', orderRecord.family_id)
          .eq('volume_id', orderRecord.volume_id)
      )
        .then(() => {})
        .catch(() => {});
    }

    return insertedOrder;
  } catch (err) {
    console.warn('Exception during photobook order insert:', err);
    return null;
  }
}
