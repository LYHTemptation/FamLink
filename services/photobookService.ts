/**
 * FamLink Photobook Supabase Persistence & Order Service (TypeScript)
 *
 * `PhotobookStudioScreen`의 Supabase DB 조회, 실시간 동기화 행 변환,
 * 권차(Volume) 목록 조회, 실물 도서 발주(`photobook_orders`) 로직을 전담합니다.
 */

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
 * 특정 권차(volume_id) 포토북 원격 데이터 단건 조회
 */
export async function fetchFamilyPhotobookVolume(
  familyId: string,
  volumeId: string
): Promise<PhotobookSyncPayload | null> {
  if (!familyId || familyId === 'default-family') return null;

  try {
    const { data, error } = await supabase
      .from('family_photobooks')
      .select('*')
      .eq('family_id', familyId)
      .eq('volume_id', volumeId || 'vol-1')
      .maybeSingle();

    if (!error && data) {
      return mapPhotobookRowToState(data);
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

    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

/**
 * 실물 양장본 도서 주문(`photobook_orders`) 생성
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
    return insertedOrder;
  } catch (err) {
    console.warn('Exception during photobook order insert:', err);
    return null;
  }
}
