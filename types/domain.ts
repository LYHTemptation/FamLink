/**
 * FamLink Core Domain TypeScript Interfaces
 * 프로젝트 전역에서 공유하는 가족, 프로필, 메시지, 스몰톡, 반려몽, 공휴일 도메인 타입 정의
 */

export type FamilyRole = 'mom' | 'dad' | 'son' | 'daughter' | string;

export interface FamilyMember {
  id: string;
  role?: FamilyRole;
  name: string;
  avatar?: string;
  color?: string;
  mood?: string;
  statusMessage?: string;
  status_message?: string;
  push_token?: string | null;
}

export interface UserProfile {
  id: string;
  family_id?: string | null;
  family_code?: string | null;
  family_created_at?: string | null;
  created_at?: string | null;
  name: string;
  role?: FamilyRole;
  avatar?: string;
  color?: string;
  mood?: string;
  status_message?: string;
  push_token?: string | null;
}

export interface ChatMessage {
  id: string | number;
  family_id?: string;
  room_id?: string;
  profile_id?: string;
  sender?: string;
  senderObj?: {
    id?: string;
    name?: string;
    avatar?: string;
    color?: string;
  };
  text?: string;
  image?: string | null;
  image_url?: string | null;
  timestamp?: string;
  created_at?: string;
  is_deleted?: boolean;
}

export interface SmallTalkState {
  topic: string | { text?: string; title?: string; topic?: string };
  responses: Record<string, string>;
  completed?: boolean;
}

export interface SmallTalkResponseRow {
  id: string | number;
  family_id?: string;
  profile_id: string;
  topic: string;
  text: string;
  created_at?: string;
}

export interface SmallTalkArchiveAnswer {
  id: string | number;
  profileId: string;
  name: string;
  role?: string;
  avatar: string;
  text: string;
  created_at?: string;
}

export interface SmallTalkArchiveItem {
  id: string;
  topic: string;
  index: number;
  isToday: boolean;
  answers: SmallTalkArchiveAnswer[];
  answeredCount: number;
  totalFamily: number;
  isAnswered: boolean;
  isComplete: boolean;
  isInBook: boolean;
  dateLabel: string;
  yearMonth: string;
  yearMonthLabel: string;
  itemDate: Date;
}

export interface PetmongCharacter {
  id?: string;
  family_id?: string;
  owner_id?: string;
  name: string;
  level: number;
  exp: number;
  emoji?: string;
  image_url?: string | null;
  stage_images?: Record<string, string>;
  animal_type?: string;
  personality?: string;
}

export interface KoreanHolidayInfo {
  name: string;
  isHoliday: boolean;
  isSubstitute: boolean;
}

export interface MonthKoreanHolidayItem {
  date: string;
  name: string;
  isSubstitute: boolean;
}

export interface UpcomingKoreanHolidayInfo {
  date: string;
  name: string;
  diffDays: number;
  isToday: boolean;
}

export interface SmallTalkTopicRow {
  id: string;
  family_id?: string | null;
  question: string;
  category: string;
  order_index?: number;
  assigned_date?: string | null;
}

export interface PhotobookSyncPayload {
  selectedVolume?: string;
  selectedThemeId?: string;
  bookFontFamily?: string;
  bookFontSize?: number;
  bookTitle?: string;
  bookSubtitle?: string;
  coverSignature?: string;
  coverPhoto?: string | null;
  coverStyle?: string;
  pageFormats?: Record<string, any>;
  spreadPhotos?: Record<string, any>;
  spreadLayouts?: Record<string, any>;
  spreadCaptions?: Record<string, any>;
  customSpreadTopics?: Record<string, any>;
  customGalleryPhotos?: any[];
  prologueEssay?: string;
  epilogueEssay?: string;
  updatedBy?: string;
  updatedAt?: number | string;
}

export interface PhotobookOrderRecord {
  family_id: string | null;
  profile_id: string | null;
  volume_id: string;
  order_number: string;
  book_title: string;
  cover_type: string;
  page_count: number;
  recipient_name: string;
  recipient_phone: string;
  postal_code: string;
  shipping_address: string;
  shipping_memo: string;
  book_snapshot: Record<string, any>;
  status: 'pending' | 'paid' | 'printing' | 'shipped' | string;
}
