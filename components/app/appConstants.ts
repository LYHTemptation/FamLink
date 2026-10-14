import { getTopicForToday } from '../../utils/topics';

export interface PointHistoryEntry {
  id: string;
  type: 'earn' | 'spend' | string;
  amount: number;
  balance: number;
  title: string;
  category: string;
  date: string;
  user: string;
}

export const FAMILY_MEMBERS: Record<
  string,
  { name: string; avatar: string; color: string }
> = {
  mom: { name: '엄마', avatar: '👩‍🦰', color: '#FF6B47' },
  dad: { name: '아빠', avatar: '👨‍💼', color: '#4A90E2' },
  son: { name: '아들', avatar: '👦', color: '#2ECC71' },
  daughter: { name: '딸', avatar: '👧', color: '#F39C12' },
};

export const INITIAL_MOCK_SHOPPING: any[] = [];

export const INITIAL_MOCK_POINT_HISTORY: PointHistoryEntry[] = [
  {
    id: 'ph-1',
    type: 'earn',
    amount: 100,
    balance: 100,
    title: '스몰톡 소통 미션 가족 전원 완료',
    category: 'smalltalk',
    date: '2026-09-12 21:00',
    user: '가족 전체',
  },
  {
    id: 'ph-2',
    type: 'earn',
    amount: 10,
    balance: 110,
    title: '장보기 완료 (우유 2팩 사오기)',
    category: 'shopping',
    date: '2026-09-13 11:30',
    user: '아들',
  },
  {
    id: 'ph-3',
    type: 'earn',
    amount: 10,
    balance: 120,
    title: '장보기 완료 (주말 음식물 쓰레기 버리기)',
    category: 'shopping',
    date: '2026-09-13 14:15',
    user: '엄마',
  },
];

export const INITIAL_MOCK_DATA = {
  points: 120,
  messages: [
    {
      id: '1',
      sender: 'son',
      text: '엄마 아빠 오늘 저녁 치킨 먹어요!! 🍗',
      timestamp: '오후 6:00',
      created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      readBy: ['son', 'mom', 'dad'],
    },
    {
      id: '2',
      sender: 'mom',
      text: '그래? 아빠 퇴근할 때 시켜달라고 하자~',
      timestamp: '오후 6:02',
      created_at: new Date(Date.now() - 33 * 60 * 1000).toISOString(),
      readBy: ['son', 'mom', 'dad'],
    },
    {
      id: '3',
      sender: 'dad',
      text: '좋지! 아빠가 치킨 쏠게 퇴근하고 보자! 😎',
      timestamp: '오후 6:05',
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      readBy: ['son', 'mom', 'dad'],
    },
  ],
  events: [] as any[],
  smallTalk: {
    topic: getTopicForToday(),
    responses: {} as Record<string, string>,
    pointsAwarded: false,
  },
};

export const BASE_MOCK_FAMILY_MEMBERS = [
  { id: 'm1', name: '엄마', avatar: '👩‍🦰', color: '#FF6B47', role: 'mom', mood: '😊', status_text: '오늘도 화이팅!' },
  { id: 'm2', name: '아빠', avatar: '👨‍💼', color: '#4A90E2', role: 'dad', mood: '💼', status_text: '열일 중!' },
  { id: 'm3', name: '아들', avatar: '👦', color: '#2ECC71', role: 'son', mood: '✏️', status_text: '열공 중!' },
  { id: 'm4', name: '딸', avatar: '👧', color: '#F39C12', role: 'daughter', mood: '🏠', status_text: '휴식 중~' },
];

export const getTodayString = (dateObj: Date = new Date()): string => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const addDaysToDateStr = (dateStr: string, days: number): string => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const ry = dt.getFullYear();
  const rm = String(dt.getMonth() + 1).padStart(2, '0');
  const rd = String(dt.getDate()).padStart(2, '0');
  return `${ry}-${rm}-${rd}`;
};
