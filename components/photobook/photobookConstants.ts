/**
 * FamLink Photobook Studio Constants, Presets & Helpers (TypeScript)
 */

export interface StudioTheme {
  id: string;
  name: string;
  bg: string;
  text: string;
  accent: string;
  border: string;
}

export interface VolumeOption {
  id: string;
  title: string;
  label: string;
  period: string;
  desc: string;
}

export interface SpreadDefinition {
  spreadIndex: number;
  leftPage: number;
  rightPage: number;
  category: 'prologue' | 'interview' | 'epilogue' | 'photos' | string;
  title: string;
  monthIndex?: number;
}

export interface InterviewTopicPreset {
  id: string;
  date: string;
  topic: string;
  answers: Record<string, string>;
}

// 4대 프리미엄 양장 하드커버 텍스처 테마
export const STUDIO_THEMES: StudioTheme[] = [
  { id: 'linen', name: '내추럴 린넨', bg: '#FAF6F0', text: '#2D2926', accent: '#8C7355', border: '#E6DCB8' },
  { id: 'coral', name: '포근한 코랄', bg: '#FFF5F2', text: '#1C1917', accent: '#FF6B47', border: '#FFE8E0' },
  { id: 'navy', name: '클래식 네이비', bg: '#0F172A', text: '#F8FAFC', accent: '#60A5FA', border: '#1E293B' },
  { id: 'olive', name: '빈티지 올리브', bg: '#F4F6F0', text: '#1C1917', accent: '#5B7052', border: '#DCE4D6' },
];

// 볼륨 선택 옵션 (가족 연대기)
export const VOLUME_OPTIONS: VolumeOption[] = [
  { id: 'vol-1', title: 'Vol. 1', label: '제1권', period: '180일의 기록', desc: '우리 가족 첫 번째 이야기' },
  { id: 'vol-2', title: 'Vol. 2', label: '제2권', period: '360일의 기록', desc: '우리 가족 두 번째 이야기' },
  { id: 'vol-3', title: 'Vol. 3', label: '제3권', period: '540일의 기록', desc: '우리 가족 세 번째 이야기' },
];

export const TOTAL_PHOTOBOOK_PAGES = 16;
export const TOTAL_PHOTOBOOK_SPREADS = 8;

/**
 * 100% 가족 활동 포인트 실물 도서 교환 토크노믹스 상수
 */
export const PHOTOBOOK_POINT_PRICE = 12000; // 실물 양장본 1권 기본 교환 포인트 (12,000 P)
export const PHOTOBOOK_EXTRA_COPY_POINT = 12000; // 부모님/선물용 추가 1권 교환 포인트 (+12,000 P)

/**
 * 16페이지 (8 양면 스프레드) 구성 명세
 * 150×210mm A5 세로형 (6×8인치) 클래식 양장 단행본
 */
export const SPREAD_DEFINITIONS: SpreadDefinition[] = [
  { spreadIndex: 0, leftPage: 1, rightPage: 2, category: 'prologue', title: '프롤로그 & 가족 대표 화보' },
  { spreadIndex: 1, leftPage: 3, rightPage: 4, category: 'interview', title: '설레는 첫 속마음 인터뷰', monthIndex: 0 },
  { spreadIndex: 2, leftPage: 5, rightPage: 6, category: 'interview', title: '우리 가족 식탁 인터뷰', monthIndex: 1 },
  { spreadIndex: 3, leftPage: 7, rightPage: 8, category: 'interview', title: '따스한 일상 인터뷰', monthIndex: 2 },
  { spreadIndex: 4, leftPage: 9, rightPage: 10, category: 'interview', title: '소소한 위로와 응원 인터뷰', monthIndex: 3 },
  { spreadIndex: 5, leftPage: 11, rightPage: 12, category: 'interview', title: '감사와 사랑의 고백 인터뷰', monthIndex: 4 },
  { spreadIndex: 6, leftPage: 13, rightPage: 14, category: 'interview', title: '180일 추억 정리 인터뷰', monthIndex: 5 },
  { spreadIndex: 7, leftPage: 15, rightPage: 16, category: 'epilogue', title: '180일 온기 리포트 & 에필로그 판권지' },
];

// 16P 테마별 3대 대표 인터뷰 질문 세트 (1페이지에 3개씩 수록)
export const MONTHLY_INTERVIEW_TOPICS_PRESET: InterviewTopicPreset[][] = [
  [
    { id: '1-1', date: '첫 번째 이야기', topic: '새로운 시작에 우리 가족이 꼭 함께 이루고 싶은 소망은?', answers: {} },
    { id: '1-2', date: '두 번째 이야기', topic: '지친 날 문득 생각나는 우리 집 최애 힐링 음식은?', answers: {} },
    { id: '1-3', date: '세 번째 이야기', topic: '우리 가족에게 가장 힘이 되는 따뜻한 한마디는?', answers: {} },
  ],
  [
    { id: '2-1', date: '첫 번째 이야기', topic: '어린 시절 부모님의 꿈은 무엇이었나요?', answers: {} },
    { id: '2-2', date: '두 번째 이야기', topic: '가장 좋아하는 엄마/아빠의 집밥 요리는?', answers: {} },
    { id: '2-3', date: '세 번째 이야기', topic: '최근 나를 가장 크게 웃게 했던 가족의 모습은?', answers: {} },
  ],
  [
    { id: '3-1', date: '첫 번째 이야기', topic: '날씨 좋은 날 가장 먼저 떠오르는 가족 추억은?', answers: {} },
    { id: '3-2', date: '두 번째 이야기', topic: '우리 가족 각자의 가장 닮고 싶은 장점은?', answers: {} },
    { id: '3-3', date: '세 번째 이야기', topic: '주말에 온 가족이 함께 보고 싶은 인생 영화는?', answers: {} },
  ],
  [
    { id: '4-1', date: '첫 번째 이야기', topic: '힘들고 지칠 때 나를 위로해주는 우리 집만의 안식처는?', answers: {} },
    { id: '4-2', date: '두 번째 이야기', topic: '가족들에게 꼭 추천해주고 싶은 나만의 힐링 곡은?', answers: {} },
    { id: '4-3', date: '세 번째 이야기', topic: '비 오는 날 함께 먹고 싶은 가족 간식은?', answers: {} },
  ],
  [
    { id: '5-1', date: '첫 번째 이야기', topic: '우리 가족과 함께 떠났던 여행 중 가장 기억에 남는 곳은?', answers: {} },
    { id: '5-2', date: '두 번째 이야기', topic: '가족들에게 꼭 전하고 싶은 사랑의 고백은?', answers: {} },
    { id: '5-3', date: '세 번째 이야기', topic: '우리 가족만의 특별한 약속이나 가훈을 정한다면?', answers: {} },
  ],
  [
    { id: '6-1', date: '첫 번째 이야기', topic: '지난 활동 기간 동안 스스로 가장 칭찬해주고 싶은 순간은?', answers: {} },
    { id: '6-2', date: '두 번째 이야기', topic: '다음 책(Vol. 2)을 만드는 동안 가족과 꼭 도전해보고 싶은 버킷리스트는?', answers: {} },
    { id: '6-3', date: '세 번째 이야기', topic: '지난 180일을 한 단어로 표현한다면?', answers: {} },
  ],
];

// AI 감성 글귀 프리셋 풀 (4대 감성 톤)
export const CAPTION_PRESETS_POOL: Record<string, string[]> = {
  warm: [
    '함께 걷던 길목마다 서로의 온기가 머물러 잔잔한 꽃으로 피어났습니다.',
    '식탁에 둘러앉아 나눈 사소한 웃음소리가 우리 집을 가장 환하게 비춥니다.',
    '평범했던 하루도 가족과 눈을 맞추면 가슴 벅찬 한 편의 영화가 됩니다.',
    '서로의 이름을 다정히 부르는 것만으로도 세상의 어떤 위로보다 깊습니다.',
    '시간이 흘러도 바래지 않을 우리들의 눈부신 계절을 여기에 고이 접어둡니다.',
  ],
  gratitude: [
    '언제나 그 자리에서 묵묵히 기댈 언덕이 되어준 가족에게 감사와 사랑을 전합니다.',
    '내 곁에 네가 있고, 우리 곁에 서로가 있어 비바람 부는 날도 따스했습니다.',
    '고맙다는 말 한마디에 담긴 무게, 가족이기에 더 깊고 애틋하게 와닿습니다.',
    '늘 아낌없이 퍼주는 부모님의 사랑이 오늘 우리를 이렇게 자라게 했습니다.',
  ],
  playful: [
    '조금 삐걱대고 티격태격해도, 우리는 결국 서로를 마주 보고 웃고 마는 가족!',
    '소소한 장난과 엉뚱한 농담이 끊이지 않는 우리 집만의 행복 레시피.',
    '맛있는 밥 한 끼에 숟가락 부딪히며 피어나는 유쾌한 우리들의 시간.',
    '세상에서 제일 시끌벅적하지만 문 열면 가장 반가운 우리 집 영웅들!',
  ],
  essay: [
    '사소한 일상이 겹겹이 쌓여 마침내 우리 가족만의 가장 눈부신 기적이 되었습니다.',
    '지나간 날들의 흔적이 아름다운 것은, 그 모든 순간을 우리가 함께 건너왔기 때문입니다.',
    '언젠가 꺼내볼 이 책의 갈피마다 오늘 우리가 나눈 숨결과 온기가 깃들어 있기를.',
    '계절이 바뀌어도 변치 않을 단 하나의 풍경, 그것은 바로 우리 가족의 미소입니다.',
  ],
};
