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
  profileId?: string;
  answer?: string;
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
  status_text?: string;
  email?: string;
  phone?: string;
  address?: string;
  familyCode?: string;
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
  rawDate?: string;
  readBy?: string[];
  is_deleted?: boolean;
  isSending?: boolean;
  senderName?: string | null;
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
  user_id?: string;
  userId?: string;
  user_name?: string;
  response_text?: string;
  responseText?: string;
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
  user_id?: string;
  name: string;
  level: number;
  exp: number;
  max_exp?: number;
  emoji?: string;
  image_url?: string | null;
  stage_images?: Record<string, string>;
  animal_type?: string;
  personality?: string;
  style_preset?: PetmongStylePreset;
}

export type PetmongStylePreset =
  | 'cozy_creature'
  | 'chibi_family'
  | 'warm_watercolor'
  | 'comic_caricature';

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
  isLocked?: boolean;
  orderStatus?: string;
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

export interface ShoppingItem {
  id: string;
  family_id?: string;
  title: string;
  category?: 'shopping' | 'chore' | string;
  assignee?: string | null;
  assigned_to?: string | null;
  avatar?: string;
  is_completed?: boolean;
  completed?: boolean;
  completed_by?: string | null;
  points?: number;
  points_earned?: boolean;
  completed_date?: string | null;
  completed_at?: string | null;
  completed_time?: string | null;
  recurring_type?: 'none' | 'daily' | 'weekly' | string;
  repeat_type?: 'none' | 'daily' | 'weekly' | string;
  created_at?: string;
  created_time?: string | null;
}

export interface CalendarEvent {
  id: string;
  family_id?: string;
  title: string;
  date: string;
  endDate?: string;
  end_date?: string;
  time?: string;
  category?: string;
  color?: string;
  emoji?: string;
  created_by?: string;
  creator?: string;
  creatorObj?: any;
  profile_id?: string;
  created_at?: string;
  description?: string;
  is_all_day?: boolean;
  diffDays?: number;
  isOngoing?: boolean;
  isHolidayChip?: boolean;
}

export interface PetmongVitals {
  warmth: number;
  hunger?: number;
  cleanliness?: number;
  happiness?: number;
  energy?: number;
  lastWarmthHarvest?: string | null;
}

export interface PetmongWhisper {
  id: string;
  family_id: string;
  sender_id: string;
  receiver_id?: string | null;
  content: string;
  is_read?: boolean;
  created_at?: string;
  sender?: {
    id: string;
    name: string;
    avatar?: string;
    role?: string;
  };
}

export interface PetmongRoomState {
  theme_id?: string;
  furniture?: Record<string, any>;
  wallpaper?: string;
  flooring?: string;
}

export interface PointHistoryItem {
  id?: string | number;
  user?: string;
  points?: number;
  reason?: string;
  date?: string;
  created_at?: string;
}

