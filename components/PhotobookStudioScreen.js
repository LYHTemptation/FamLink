import React, { useState, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import {
  BookOpen,
  Sparkles,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  X,
  Heart,
  Award,
  Check,
  Share2,
  Calendar,
  Layers,
  Shuffle,
  Camera,
  Edit3,
  Clock,
  Send,
  Gift,
  CheckCircle2,
  Info,
  Eye,
  Bookmark,
  ChevronDown,
  Layout,
  Scroll,
  Palette,
  Type,
  FileText,
} from 'lucide-react-native';
import { colors, typography, commonStyles } from '../theme';
import UserAvatar from './UserAvatar';
import { stripEmojis } from '../utils/topics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 4대 프리미엄 양장 하드커버 텍스처 테마
export const STUDIO_THEMES = [
  { id: 'linen', name: '내추럴 린넨', bg: '#FAF6F0', text: '#2D2926', accent: '#8C7355', border: '#E6DCB8' },
  { id: 'coral', name: '포근한 코랄', bg: '#FFF5F2', text: '#1C1917', accent: '#FF6B47', border: '#FFE8E0' },
  { id: 'navy', name: '클래식 네이비', bg: '#0F172A', text: '#F8FAFC', accent: '#60A5FA', border: '#1E293B' },
  { id: 'olive', name: '빈티지 올리브', bg: '#F4F6F0', text: '#1C1917', accent: '#5B7052', border: '#DCE4D6' },
];

// 6개월 단위 누적 볼륨 (가입 시점부터 6개월씩 출판되는 가족 연대기)
export const VOLUME_OPTIONS = [
  { id: 'vol-1', title: 'Vol. 1', label: '제1권', period: '1~6개월 차', desc: '우리 가족 첫 번째 이야기' },
  { id: 'vol-2', title: 'Vol. 2', label: '제2권', period: '7~12개월 차', desc: '우리 가족 두 번째 이야기' },
  { id: 'vol-3', title: 'Vol. 3', label: '제3권', period: '13~18개월 차', desc: '우리 가족 세 번째 이야기' },
];

/**
 * 6개월(180일) 기준 32페이지 (16 양면 스프레드) 구성 명세
 */
const SPREAD_DEFINITIONS = [
  { spreadIndex: 0, leftPage: 1, rightPage: 2, category: 'prologue', title: '프롤로그 & 시작하는 글' },
  { spreadIndex: 1, leftPage: 3, rightPage: 4, category: 'interview', title: '1개월 차: 설레는 첫 속마음 인터뷰', monthIndex: 0 },
  { spreadIndex: 2, leftPage: 5, rightPage: 6, category: 'interview', title: '2개월 차: 우리 가족 식탁 인터뷰', monthIndex: 1 },
  { spreadIndex: 3, leftPage: 7, rightPage: 8, category: 'photos', title: '초반의 소소한 일상 갤러리' },
  { spreadIndex: 4, leftPage: 9, rightPage: 10, category: 'interview', title: '3개월 차: 따스한 일상 인터뷰', monthIndex: 2 },
  { spreadIndex: 5, leftPage: 11, rightPage: 12, category: 'photos', title: '함께한 나들이 & 웃음 갤러리' },
  { spreadIndex: 6, leftPage: 13, rightPage: 14, category: 'interview', title: '4개월 차: 소소한 위로와 응원 인터뷰', monthIndex: 3 },
  { spreadIndex: 7, leftPage: 15, rightPage: 16, category: 'photos', title: '가족 봄 소풍 & 미소 갤러리' },
  { spreadIndex: 8, leftPage: 17, rightPage: 18, category: 'interview', title: '5개월 차: 감사와 사랑의 고백 인터뷰', monthIndex: 4 },
  { spreadIndex: 9, leftPage: 19, rightPage: 20, category: 'photos', title: '가족 특별 화보 갤러리' },
  { spreadIndex: 10, leftPage: 21, rightPage: 22, category: 'interview', title: '6개월 차: 180일 추억 정리 인터뷰', monthIndex: 5 },
  { spreadIndex: 11, leftPage: 23, rightPage: 24, category: 'photos', title: '찬란하게 빛나던 순간들의 기록' },
  { spreadIndex: 12, leftPage: 25, rightPage: 26, category: 'photos', title: '우리 가족 명장면 베스트 콜라주' },
  { spreadIndex: 13, leftPage: 27, rightPage: 28, category: 'photos', title: '사소해서 더 소중했던 날들' },
  { spreadIndex: 14, leftPage: 29, rightPage: 30, category: 'stats', title: '180일간의 가족 온기 리포트' },
  { spreadIndex: 15, leftPage: 31, rightPage: 32, category: 'epilogue', title: '에필로그 & 서명 판권지' },
];

export default function PhotobookStudioScreen({
  currentUser,
  familyMembers = [],
  messages = [],
  smallTalkState,
  currentUserProfile,
  points = 0,
  onDeductPoints,
  onSendOrderNotice,
}) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const screenWidth = windowWidth || Dimensions.get('window').width;
  const isSmallScreen = screenWidth < 380;

  // 1. 볼륨 선택 (6개월 단위 누적 볼륨제: Vol. 1, Vol. 2, Vol. 3)
  const [selectedVolume, setSelectedVolume] = useState('vol-1');
  const [volumePickerModalVisible, setVolumePickerModalVisible] = useState(false);
  const currentVolObj = VOLUME_OPTIONS.find(v => v.id === selectedVolume) || VOLUME_OPTIONS[0];

  const [selectedThemeId, setSelectedThemeId] = useState('linen');
  const currentTheme = STUDIO_THEMES.find(t => t.id === selectedThemeId) || STUDIO_THEMES[0];
  const [themePickerModalVisible, setThemePickerModalVisible] = useState(false);

  // 폰트 & 크기 커스텀 상태
  const [bookFontFamily, setBookFontFamily] = useState('serif'); // 'serif' | 'sans' | 'handwriting'
  const [bookFontSize, setBookFontSize] = useState('medium'); // 'small' | 'medium' | 'large'
  const [fontPickerModalVisible, setFontPickerModalVisible] = useState(false);
  const [pagePickerModalVisible, setPagePickerModalVisible] = useState(false);
  const [layoutPickerModalVisible, setLayoutPickerModalVisible] = useState(false);

  // 폰트 스타일 & 스케일 계산
  const fontStyle = useMemo(() => {
    if (bookFontFamily === 'serif') {
      return { fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }) };
    }
    if (bookFontFamily === 'handwriting') {
      return { fontFamily: Platform.select({ ios: 'Snell Roundhand', android: 'casual', default: 'cursive' }) };
    }
    return { fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }) };
  }, [bookFontFamily]);

  const fontScale = useMemo(() => {
    if (bookFontSize === 'small') return 0.88;
    if (bookFontSize === 'large') return 1.15;
    return 1.0;
  }, [bookFontSize]);

  // 3대 포맷 체계 상태: { [`${sIdx}_${side}`]: 'photo' | 'smalltalk' | 'hybrid' }
  const [pageFormats, setPageFormats] = useState({});

  const getPageFormat = (sIdx, side) => {
    const key = `${sIdx}_${side}`;
    if (pageFormats[key]) return pageFormats[key];
    const sDef = SPREAD_DEFINITIONS[sIdx] || SPREAD_DEFINITIONS[0];
    if (sDef.category === 'interview') {
      return side === 'left' ? 'smalltalk' : 'photo';
    }
    if (sDef.category === 'photos') {
      return 'photo';
    }
    if (sDef.category === 'prologue' || sDef.category === 'epilogue' || sDef.category === 'stats') {
      return side === 'left' ? 'smalltalk' : 'photo';
    }
    return 'photo';
  };

  const handleSetPageFormat = (newFormat) => {
    const key = `${currentSpreadIndex}_${activeSingleSide}`;
    setPageFormats(prev => ({ ...prev, [key]: newFormat }));
  };

  // 2. 도서 기본 정보
  const [bookTitle, setBookTitle] = useState('우리 가족의 첫 번째 이야기 (Vol. 1)');
  const [bookSubtitle, setBookSubtitle] = useState('사소한 일상이 모여 만든 가장 눈부신 기적');
  const [editTitleModalVisible, setEditTitleModalVisible] = useState(false);
  const [tempTitle, setTempTitle] = useState(bookTitle);
  const [tempSubtitle, setTempSubtitle] = useState(bookSubtitle);

  // 3. 뷰 모드: 15×15cm 정방형 스퀘어북에 맞춰 'single' (1:1 스퀘어 단면 집중) 기본 적용
  const [viewMode, setViewMode] = useState('single');
  const [activeSingleSide, setActiveSingleSide] = useState('left'); // 'left' | 'right'

  // 4. 현재 작업 중인 펼침면 (스프레드 0~15, 총 16개 펼침면 = 32페이지)
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0);

  // 레이아웃 모드 가로 페이징 스크롤 레퍼런스 및 이동 핸들러
  const spreadScrollRef = useRef(null);

  const handleGoToSpread = (idx) => {
    const target = Math.max(0, Math.min(SPREAD_DEFINITIONS.length - 1, idx));
    setCurrentSpreadIndex(target);
    const winW = windowWidth || Dimensions.get('window').width;
    spreadScrollRef.current?.scrollTo({ x: target * winW, animated: true });
  };

  // 5. 스튜디오 뷰 형식: 'layout' (15×15 1:1 정방형 조판 편집) | 'scroll' (32P 연속 피드 감상)
  const [studioViewMode, setStudioViewMode] = useState('layout'); // 'layout' | 'scroll'

  // 150×150mm 정방형 스퀘어북 비율에 맞춘 캔버스 규격 (1페이지 완벽 1:1 정방형, 양면 2:1 와이드)
  const currentScreenWidth = windowWidth || Dimensions.get('window').width || SCREEN_WIDTH;
  const currentScreenHeight = windowHeight || Dimensions.get('window').height || 750;
  // 1:1 스퀘어 규격: 스마트폰 가로 폭을 최대로 활용하여 좌우 16px 대칭으로 꽉 찬 정방형 비율 확보
  const squareCanvasSize = Math.min(currentScreenWidth - 32, Math.max(280, Math.min(380, currentScreenHeight - 370)));
  const dualCanvasHeight = Math.max(180, Math.min(240, (currentScreenWidth - 32) * 0.52));

  // 4. 단톡방 사진 목록 추출
  const chatPhotos = useMemo(() => {
    if (!messages || !Array.isArray(messages)) return [];
    return messages
      .filter(m => m && (m.image || (m.text && m.text.startsWith('data:image'))))
      .map((m, idx) => ({
        id: m.id || `photo-${idx}`,
        uri: m.image || m.text,
        sender: m.sender || m.userName || '가족',
        createdAt: m.createdAt || m.created_at || '최근',
      }));
  }, [messages]);

  // 스프레드별 커스텀 사진 매핑 { [spreadIndex]: [photoUri1, photoUri2, ...] }
  const [spreadPhotos, setSpreadPhotos] = useState({});
  // 스프레드별 사진 레이아웃 셔플 모드: 'single' | 'wide' | 'split' | 'grid'
  const [spreadLayouts, setSpreadLayouts] = useState({});
  // 스프레드별 AI 감성 한 줄 글귀
  const [spreadCaptions, setSpreadCaptions] = useState({});

  // 5. 모달 제어 상태
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);
  const [activePhotoSlotIndex, setActivePhotoSlotIndex] = useState(0);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [topicPickerModalVisible, setTopicPickerModalVisible] = useState(false);
  const [selectedTopicSlot, setSelectedTopicSlot] = useState(0);
  const [appendixModalVisible, setAppendixModalVisible] = useState(false);
  const [customSpreadTopics, setCustomSpreadTopics] = useState({});

  // 주문 관련 폼 상태
  const [orderName, setOrderName] = useState(currentUserProfile?.name || '가족 대표');
  const [orderPhone, setOrderPhone] = useState('010-1234-5678');
  const [orderAddress, setOrderAddress] = useState('서울시 강남구 테헤란로 123');
  const [orderAddCopy, setOrderAddCopy] = useState(true); // 조부모님 선물용 추가 1권 (+14,000원 특가)
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // 하이브리드 결제 토크노믹스 상태 (15×15cm 스퀘어북 정가 24,000원 중 최대 12,000P까지 1P=1원 할인 지원)
  const [usePointsDiscount, setUsePointsDiscount] = useState(true);
  const maxPointDiscount = 12000;
  const availablePointsToUse = Math.min(points || 0, maxPointDiscount);
  const appliedPoints = usePointsDiscount ? availablePointsToUse : 0;

  const basePrice = 24000;
  const addPrice = orderAddCopy ? 14000 : 0;
  const finalCashPrice = Math.max(0, basePrice - appliedPoints + addPrice);

  // 임의의 스프레드 번호에 할당된 사진 목록 반환 헬퍼
  const getSpreadPhotos = (sIdx) => {
    const custom = spreadPhotos[sIdx];
    if (custom && custom.length > 0) return custom;
    if (chatPhotos.length > 0) {
      const startIdx = (sIdx * 2) % chatPhotos.length;
      return [
        chatPhotos[startIdx]?.uri,
        chatPhotos[(startIdx + 1) % chatPhotos.length]?.uri,
        chatPhotos[(startIdx + 2) % chatPhotos.length]?.uri,
        chatPhotos[(startIdx + 3) % chatPhotos.length]?.uri,
      ].filter(Boolean);
    }
    return [];
  };

  // 6. 현재 스프레드 정보 계산
  const currentSpread = SPREAD_DEFINITIONS[currentSpreadIndex] || SPREAD_DEFINITIONS[0];
  const currentLayout = spreadLayouts[currentSpreadIndex] || 'single';

  // 현재 스프레드에 할당된 사진들
  const currentPhotos = useMemo(() => getSpreadPhotos(currentSpreadIndex), [spreadPhotos, currentSpreadIndex, chatPhotos]);

  // 활성 가족 멤버 목록
  const activeFamilyList = useMemo(() => {
    if (familyMembers && familyMembers.length > 0) return familyMembers;
    return [
      { id: 'm1', name: '엄마', role: '엄마', avatar: '👩‍🦰', answer: '지수랑 민준이가 다정하게 웃어줄 때가 가장 큰 힘이 돼요.' },
      { id: 'm2', name: '아빠', role: '아빠', avatar: '👨‍💼', answer: '퇴근하고 현관문 열었을 때 온 가족이 반겨주던 순간입니다.' },
      { id: 'm3', name: '지수', role: '지수', avatar: '👧', answer: '다 같이 주말에 맛있는 떡볶이 만들어 먹었던 날!' },
      { id: 'm4', name: '민준', role: '민준', avatar: '👦', answer: '아빠가 운전하고 다 같이 바다 보러 갔을 때요!' },
    ];
  }, [familyMembers]);

  // 6개월 단위 활동 개월 차별 3대 대표 인터뷰 질문 세트 (1페이지에 3개씩 수록)
  const MONTHLY_INTERVIEW_TOPICS = useMemo(() => [
    [
      { id: '1-1', date: '1개월 차 1주', topic: '새로운 시작에 우리 가족이 꼭 함께 이루고 싶은 소망은?', answers: { m1: '온 가족 건강하기!', m2: '주말마다 함께 산책하기', m3: '가족 여행 가기', m4: '맛있는 거 많이 먹기' } },
      { id: '1-2', date: '1개월 차 2주', topic: '지친 날 문득 생각나는 우리 집 최애 힐링 음식은?', answers: { m1: '보글보글 김치찌개', m2: '따끈한 어묵탕 국물', m3: '호호 불어먹는 호빵', m4: '엄마표 떡볶이!' } },
      { id: '1-3', date: '1개월 차 4주', topic: '우리 가족에게 가장 힘이 되는 따뜻한 한마디는?', answers: { m1: '지수야 민준아 사랑해', m2: '오늘도 수고 많았어', m3: '엄마 아빠 고마워요', m4: '우리 가족 최고!' } },
    ],
    [
      { id: '2-1', date: '2개월 차 1주', topic: '어린 시절 부모님의 꿈은 무엇이었나요?', answers: { m1: '동화책 작가였단다', m2: '비행기 조종사였지', m3: '엄마 꿈 신기해!', m4: '아빠 멋있다' } },
      { id: '2-2', date: '2개월 차 2주', topic: '가장 좋아하는 엄마/아빠의 집밥 요리는?', answers: { m1: '다들 잘 먹는 갈비찜', m2: '엄마표 된장찌개', m3: '아빠표 주말 볶음밥', m4: '엄마표 잡채!' } },
      { id: '2-3', date: '2개월 차 3주', topic: '최근 나를 가장 크게 웃게 했던 가족의 모습은?', answers: { m1: '아빠의 아재개그', m2: '민준이 춤추는 모습', m3: '오빠 넘어진 거 보고 빵 터짐', m4: '내가 언제!' } },
    ],
    [
      { id: '3-1', date: '3개월 차 1주', topic: '날씨 좋은 날 가장 먼저 떠오르는 가족 추억은?', answers: { m1: '나들이 구경 갔던 날', m2: '공원에서 자전거 타던 날', m3: '잔디밭 돗자리 피크닉', m4: '솜사탕 먹은 거!' } },
      { id: '3-2', date: '3개월 차 2주', topic: '우리 가족 각자의 가장 닮고 싶은 장점은?', answers: { m1: '아빠의 성실함', m2: '엄마의 따뜻한 배려', m3: '엄마의 다정함', m4: '아빠의 든든함' } },
      { id: '3-3', date: '3개월 차 4주', topic: '주말에 온 가족이 함께 보고 싶은 인생 영화는?', answers: { m1: '사운드 오브 뮤직', m2: '토이 스토리 시리즈', m3: '코코 (가족 영화!)', m4: '어벤져스!' } },
    ],
    [
      { id: '4-1', date: '4개월 차 1주', topic: '힘들고 지칠 때 나를 위로해주는 우리 집만의 안식처는?', answers: { m1: '거실 폭신한 소파', m2: '가족들과 저녁 식탁', m3: '내 방 침대 음악 감상', m4: '다 같이 TV 볼 때' } },
      { id: '4-2', date: '4개월 차 2주', topic: '가족들에게 꼭 추천해주고 싶은 나만의 힐링 곡은?', answers: { m1: '이문세 - 옛사랑', m2: '김광석 - 바람이 불어오는 곳', m3: '아이유 - 밤편지', m4: '데이식스 노래!' } },
      { id: '4-3', date: '4개월 차 4주', topic: '비 오는 날 함께 먹고 싶은 가족 간식은?', answers: { m1: '노릇노릇 해물파전', m2: '바삭한 김치부침개', m3: '따뜻한 핫초코', m4: '파전에 사이다!' } },
    ],
    [
      { id: '5-1', date: '5개월 차 1주', topic: '우리 가족과 함께 떠났던 여행 중 가장 기억에 남는 곳은?', answers: { m1: '작년 제주도 푸른 바다', m2: '강원도 숲속 펜션 바비큐', m3: '부산 해운대 모래사장', m4: '바다에서 조개 잡은 날!' } },
      { id: '5-2', date: '5개월 차 2주', topic: '가족들에게 꼭 전하고 싶은 사랑의 고백은?', answers: { m1: '우리 집에 와줘서 고마워', m2: '언제나 든든한 버팀목이 될게', m3: '엄마 아빠 딸이라 행복해요', m4: '건강하게 오래오래 함께해요' } },
      { id: '5-3', date: '5개월 차 3주', topic: '우리 가족만의 특별한 약속이나 가훈을 정한다면?', answers: { m1: '하루 한 번 서로 안아주기', m2: '바빠도 저녁은 함께', m3: '고마울 땐 바로 말하기', m4: '웃는 얼굴로 인사하기' } },
    ],
    [
      { id: '6-1', date: '6개월 차 1주', topic: '지난 활동 기간 동안 스스로 가장 칭찬해주고 싶은 순간은?', answers: { m1: '가족들 식사 매일 챙긴 것', m2: '운동 꾸준히 시작한 것', m3: '시험 준비 열심히 한 것', m4: '숙제 안 밀리고 한 것!' } },
      { id: '6-2', date: '6개월 차 2주', topic: '다음 책(Vol. 2)을 만드는 동안 가족과 꼭 도전해보고 싶은 버킷리스트는?', answers: { m1: '가족 글램핑 가기', m2: '단풍놀이 산행', m3: '가족 단체 스냅사진 찍기', m4: '놀이공원 롤러코스터 타기' } },
      { id: '6-3', date: '6개월 차 4주', topic: '지난 180일을 한 단어로 표현한다면?', answers: { m1: '눈부신 온기', m2: '소중한 동행', m3: '가장 예쁜 계절', m4: '행복 가득!' } },
    ],
  ], []);

  // 임의의 스프레드 번호에 할당된 3개 인터뷰 질문 및 답변 세트 반환 헬퍼
  const getSpreadInterviewTopics = (sIdx) => {
    const custom = customSpreadTopics[sIdx];
    if (custom && custom.length > 0) return custom;
    const sDef = SPREAD_DEFINITIONS[sIdx] || SPREAD_DEFINITIONS[0];
    const mIdx = sDef.monthIndex !== undefined ? sDef.monthIndex : 0;
    const monthSet = MONTHLY_INTERVIEW_TOPICS[mIdx % MONTHLY_INTERVIEW_TOPICS.length];
    if (smallTalkState?.topic && mIdx === 0) {
      const topicStr = stripEmojis(typeof smallTalkState.topic === 'string' ? smallTalkState.topic : (smallTalkState.topic.text || smallTalkState.topic.title || ''));
      if (topicStr) {
        return [
          { id: 'today', date: '오늘의 질문 🌟', topic: topicStr, answers: smallTalkState.responses || monthSet[0].answers },
          monthSet[1],
          monthSet[2],
        ];
      }
    }
    return monthSet;
  };

  // 현재 스프레드에 수록될 3개 스몰톡 문답 목록
  const currentInterviewTopics = useMemo(() => getSpreadInterviewTopics(currentSpreadIndex), [customSpreadTopics, currentSpreadIndex, currentSpread, smallTalkState, MONTHLY_INTERVIEW_TOPICS]);

  // 7. 레이아웃 셔플 핸들러 (15×15 스퀘어 4대 조판 템플릿)
  const handleShuffleLayout = () => {
    const layouts = ['single', 'wide', 'grid', 'polaroid'];
    const currentIdx = layouts.indexOf(currentLayout);
    const nextLayout = layouts[(currentIdx + 1) % layouts.length];
    setSpreadLayouts(prev => ({ ...prev, [currentSpreadIndex]: nextLayout }));
  };

  // 8. AI 감성 글귀 자동 추천 (Gemini 2.5 Flash 스타일)
  const handleGenerateAiCaption = () => {
    const samples = [
      '함께 걷던 길목마다 서로의 온기가 머물러 잔잔한 꽃으로 피어났습니다.',
      '식탁에 둘러앉아 나눈 사소한 웃음소리가 우리 집을 가장 환하게 비춥니다.',
      '평범했던 하루도 가족과 눈을 맞추면 가슴 벅찬 한 편의 영화가 됩니다.',
      '서로의 이름을 다정히 부르는 것만으로도 세상의 어떤 위로보다 깊습니다.',
      '시간이 흘러도 바래지 않을 우리들의 눈부신 계절을 여기에 고이 접어둡니다.',
    ];
    const picked = samples[Math.floor(Math.random() * samples.length)];
    setSpreadCaptions(prev => ({ ...prev, [currentSpreadIndex]: picked }));
  };

  // 9. 사진 선택 슬롯 열기
  const handleOpenPhotoPicker = (slotIdx) => {
    setActivePhotoSlotIndex(slotIdx);
    setPhotoPickerVisible(true);
  };

  const handleSelectPhoto = (photoUri) => {
    const updated = [...(spreadPhotos[currentSpreadIndex] || currentPhotos)];
    updated[activePhotoSlotIndex] = photoUri;
    setSpreadPhotos(prev => ({ ...prev, [currentSpreadIndex]: updated }));
    setPhotoPickerVisible(false);
  };

  // 10. 주문 완료 처리 (비즈니스 POD & 하이브리드 결제 연동)
  const handleExecuteOrder = async () => {
    if (!orderName.trim() || !orderPhone.trim() || !orderAddress.trim()) {
      Alert.alert('알림', '받는 분 성함, 연락처, 배송지 주소를 모두 입력해주세요.');
      return;
    }

    setIsSubmittingOrder(true);
    setTimeout(() => {
      setIsSubmittingOrder(false);
      setOrderModalVisible(false);

      if (onDeductPoints && appliedPoints > 0) {
        onDeductPoints(appliedPoints);
      }

      if (onSendOrderNotice) {
        onSendOrderNotice({
          bookTitle,
          volume: selectedVolume,
          copies: orderAddCopy ? 2 : 1,
          totalPrice: finalCashPrice,
          pointsUsed: appliedPoints,
          recipient: orderName,
        });
      }

      Alert.alert(
        '양장본 인쇄 주문 접수 완료! 📦',
        `[${bookTitle}] 총 ${orderAddCopy ? '2권 (선물용 1권 포함)' : '1권'}이 인쇄 제작에 들어갑니다.\n\n• 가족 포인트: -${appliedPoints.toLocaleString()} P 할인 적용\n• 최종 결제액: ${finalCashPrice.toLocaleString()}원\n• 정밀 POD 인쇄 (150×150mm 코지 스퀘어 32P 랑데뷰 160g 양장본)\n• 예상 배송일: 영업일 기준 3~4일 이내`,
        [{ text: '확인' }]
      );
    }, 1200);
  };

  // =========================================================
  // 📖 통합 페이지 렌더러 (3대 포맷 & 폰트/크기 완벽 반영)
  // =========================================================
  const renderPage = (sIdx, side, isFull = false) => {
    const sDef = SPREAD_DEFINITIONS[sIdx] || SPREAD_DEFINITIONS[0];
    const pageNum = side === 'left' ? sDef.leftPage : sDef.rightPage;
    const format = getPageFormat(sIdx, side);
    const sPhotos = getSpreadPhotos(sIdx);
    const sTopics = getSpreadInterviewTopics(sIdx);
    const sCaption = spreadCaptions[sIdx];
    const isSplit = spreadLayouts[sIdx] === 'wide';

    // 1. 특수 프롤로그 (P.1)
    if (sDef.category === 'prologue' && side === 'left' && format === 'smalltalk') {
      return (
        <View style={styles.prologuePageContent}>
          <Text style={[styles.chapterKicker, { color: currentTheme.accent, ...fontStyle }]}>PROLOGUE</Text>
          <Text
            style={[styles.bookMainHeading, { color: currentTheme.text, ...fontStyle, fontSize: Math.round((isFull ? 18 : 14) * fontScale), lineHeight: Math.round((isFull ? 24 : 18) * fontScale) }]}
            numberOfLines={2}
          >
            {bookTitle}
          </Text>
          <Text
            style={[styles.bookSubHeading, { color: currentTheme.accent, ...fontStyle, fontSize: Math.round((isFull ? 12 : 10) * fontScale), marginBottom: 8 }]}
            numberOfLines={1}
          >
            {bookSubtitle}
          </Text>

          <View style={styles.prologueParagraphBox}>
            <Text style={[styles.prologueBodyText, { color: currentTheme.text, ...fontStyle, fontSize: Math.round((isFull ? 11.5 : 9.5) * fontScale), lineHeight: Math.round((isFull ? 17 : 14) * fontScale) }]}>
              가장 눈부신 순간은 언제나 멀리 있지 않았습니다. 함께 밥을 먹고, 사소한 농담을 주고받고, 문득 전해진 다정한 안부 속에 우리 가족의 가장 따뜻한 계절이 깃들어 있었습니다.
            </Text>
            <Text style={[styles.prologueBodyText, { color: currentTheme.text, marginTop: 6, ...fontStyle, fontSize: Math.round((isFull ? 11.5 : 9.5) * fontScale), lineHeight: Math.round((isFull ? 17 : 14) * fontScale) }]}>
              지난 6개월간 매일 주고받은 스몰톡 문답과 카메라에 담긴 온기를 엮어, 우리들의 찬란했던 시간들을 이 한 권의 책에 고이 남깁니다.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.editTitleMiniBtn}
            onPress={() => {
              setTempTitle(bookTitle);
              setTempSubtitle(bookSubtitle);
              setEditTitleModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Edit3 size={11} color="#78716C" style={{ marginRight: 4 }} />
            <Text style={styles.editTitleMiniBtnText}>제목 편집</Text>
          </TouchableOpacity>
          <Text style={styles.pageNumberFootnote}>- {pageNum} -</Text>
        </View>
      );
    }

    // 2. 특수 통계 페이지 (P.29)
    if (sDef.category === 'stats' && side === 'left' && format === 'smalltalk') {
      return (
        <View style={styles.statsPageContent}>
          <Text style={[styles.statsPageHeading, { color: currentTheme.accent, ...fontStyle }]}>180-DAY MEMORY METRICS</Text>
          <Text style={[styles.statsPageSub, { color: '#1C1917', ...fontStyle, fontSize: Math.round((isFull ? 14 : 12) * fontScale), marginBottom: 8 }]}>
            우리 가족의 180일 온기 발자취
          </Text>
          <View style={styles.metricGrid}>
            <View style={[styles.metricBox, isSmallScreen && { padding: 4 }]}>
              <Text style={[styles.metricBigNum, { color: '#FF6B47' }]}>180</Text>
              <Text style={styles.metricLabel}>스몰톡 문답</Text>
            </View>
            <View style={[styles.metricBox, isSmallScreen && { padding: 4 }]}>
              <Text style={[styles.metricBigNum, { color: '#3B82F6' }]}>{chatPhotos.length || 42}</Text>
              <Text style={styles.metricLabel}>함께한 사진</Text>
            </View>
            <View style={[styles.metricBox, isSmallScreen && { padding: 4 }]}>
              <Text style={[styles.metricBigNum, { color: '#10B981' }]}>1,420</Text>
              <Text style={styles.metricLabel}>나눈 메시지</Text>
            </View>
            <View style={[styles.metricBox, isSmallScreen && { padding: 4 }]}>
              <Text style={[styles.metricBigNum, { color: '#8B5CF6' }]}>Lv. 14</Text>
              <Text style={styles.metricLabel}>반려몽 성장</Text>
            </View>
          </View>
          <Text style={styles.pageNumberFootnote}>- {pageNum} -</Text>
        </View>
      );
    }

    // 3. 특수 에필로그 (P.32)
    if (sDef.category === 'epilogue' && side === 'right' && format === 'smalltalk') {
      return (
        <View style={styles.epiloguePageContent}>
          <Text style={[styles.chapterKicker, { color: currentTheme.accent, ...fontStyle }]}>EPILOGUE</Text>
          <Text style={[styles.epilogueTitle, { color: currentTheme.text, ...fontStyle, fontSize: Math.round((isFull ? 15 : 12) * fontScale) }]}>
            끝나지 않을 우리들의 이야기
          </Text>
          <Text style={[styles.epilogueBody, { color: '#44403C', ...fontStyle, fontSize: Math.round((isFull ? 11 : 9.5) * fontScale), lineHeight: Math.round((isFull ? 16 : 13) * fontScale) }]}>
            계절은 바뀌어도 우리가 함께 나눈 사랑의 온도는 변하지 않습니다. 다음 6개월 뒤에도 더 풍성하고 눈부신 추억으로 이 자리를 채워나가길 소망합니다.
          </Text>
          <View style={styles.colophonBox}>
            <Text style={styles.colophonText}>기록 기간: 1~6개월 차 (180일간의 발자취)</Text>
            <Text style={styles.colophonText}>판형: 150×150mm 코지 스퀘어 32P 양장제본</Text>
          </View>
          <Text style={styles.pageNumberFootnote}>- {pageNum} -</Text>
        </View>
      );
    }

    // 4. [포맷 1: 사진 전용 (Photo Focus)]
    if (format === 'photo') {
      const photoSlotIndex = side === 'left' ? 0 : 1;
      return (
        <View style={{ flex: 1 }}>
          {isSplit ? (
            <View style={styles.multiSlotContainer}>
              <TouchableOpacity
                style={styles.halfSlotTop}
                onPress={() => handleOpenPhotoPicker(photoSlotIndex)}
                activeOpacity={0.85}
              >
                {sPhotos[photoSlotIndex] ? (
                  <Image source={{ uri: sPhotos[photoSlotIndex] }} style={styles.slotImageFull} resizeMode="cover" />
                ) : (
                  <View style={styles.emptySlotPlaceholder}><Camera size={18} color="#A8A29E" /></View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.halfSlotBottom}
                onPress={() => handleOpenPhotoPicker(photoSlotIndex + 1)}
                activeOpacity={0.85}
              >
                {sPhotos[photoSlotIndex + 1] ? (
                  <Image source={{ uri: sPhotos[photoSlotIndex + 1] }} style={styles.slotImageFull} resizeMode="cover" />
                ) : (
                  <View style={styles.emptySlotPlaceholder}><Camera size={18} color="#A8A29E" /></View>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.photoCanvasSlot}
              onPress={() => handleOpenPhotoPicker(photoSlotIndex)}
              activeOpacity={0.85}
            >
              {sPhotos[photoSlotIndex] ? (
                <Image source={{ uri: sPhotos[photoSlotIndex] }} style={styles.slotImageFull} resizeMode="cover" />
              ) : (
                <View style={styles.emptySlotPlaceholder}>
                  <Camera size={26} color="#A8A29E" />
                  <Text style={[styles.emptySlotText, isSmallScreen && { fontSize: 10 }]}>터치하여 사진 교체</Text>
                </View>
              )}
              <View style={styles.slotEditBadge}>
                <Text style={styles.slotEditBadgeText}>P.{pageNum} 📸</Text>
              </View>
            </TouchableOpacity>
          )}

          {sCaption ? (
            <View style={styles.captionRibbon}>
              <Text style={[styles.captionRibbonText, { ...fontStyle, fontSize: Math.round(10 * fontScale) }]} numberOfLines={1}>
                "{sCaption}"
              </Text>
            </View>
          ) : null}
          <Text style={styles.pageNumberFootnote}>- {pageNum} -</Text>
        </View>
      );
    }

    // 5. [포맷 2: 스몰톡 전용 (SmallTalk Narrative)]
    if (format === 'smalltalk') {
      return (
        <View style={styles.interviewPageContent}>
          <View style={styles.interviewKickerRow}>
            <Award size={12} color="#FF6B47" style={{ marginRight: 4 }} />
            <Text style={[styles.interviewKickerText, { ...fontStyle, fontSize: Math.round((isFull ? 11 : 9) * fontScale) }]}>
              CHAPTER · {sDef.monthIndex !== undefined ? `${sDef.monthIndex + 1}개월 차` : '가족'} 스몰톡 인터뷰
            </Text>
          </View>

          <ScrollView style={styles.answersScroll} showsVerticalScrollIndicator={false}>
            {sTopics.slice(0, 3).map((item, qIdx) => (
              <View key={item.id || qIdx} style={[styles.multiQnACard, isSmallScreen && { padding: 4, marginBottom: 4 }, isFull && { padding: 7, marginBottom: 5 }]}>
                <View style={styles.multiQnAHeader}>
                  <View style={styles.qNumBadge}>
                    <Text style={styles.qNumBadgeText}>Q{qIdx + 1}</Text>
                  </View>
                  <Text style={[styles.multiQnATitle, { ...fontStyle, fontSize: Math.round((isFull ? 11.5 : 10) * fontScale) }]} numberOfLines={2}>
                    "{item.topic}"
                  </Text>
                </View>
                <View style={styles.compactAnswersList}>
                  {activeFamilyList.slice(0, 3).map(m => {
                    const ansText = item.answers?.[m.id] || m.answer || '함께여서 늘 고마운 우리 가족!';
                    return (
                      <View key={m.id} style={styles.compactAnswerRow}>
                        <UserAvatar avatar={m.avatar || '👦'} size={14} style={{ marginRight: 3 }} />
                        <Text style={[styles.compactMemberName, { ...fontStyle, fontSize: Math.round(9 * fontScale) }]}>{m.name || m.role}:</Text>
                        <Text style={[styles.compactAnswerText, { ...fontStyle, fontSize: Math.round(9.5 * fontScale) }]} numberOfLines={1}>"{ansText}"</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
            <TouchableOpacity
              style={styles.changeTopicBtn}
              onPress={() => {
                setSelectedTopicSlot(0);
                setTopicPickerModalVisible(true);
              }}
              activeOpacity={0.75}
            >
              <Shuffle size={10} color="#78716C" style={{ marginRight: 3 }} />
              <Text style={styles.changeTopicBtnText}>문답 교체 (180개 질문 아카이브)</Text>
            </TouchableOpacity>
          </ScrollView>
          <Text style={styles.pageNumberFootnote}>- {pageNum} -</Text>
        </View>
      );
    }

    // 6. [포맷 3: 사진 + 스몰톡 (Hybrid Memory)]
    const photoSlotIndex = side === 'left' ? 0 : 1;
    const coreTopic = sTopics[0] || { topic: '우리 가족에게 가장 힘이 되는 순간은?', answers: {} };
    return (
      <View style={styles.hybridPageContent}>
        {/* 상단 사진 영역 */}
        <TouchableOpacity
          style={styles.hybridPhotoSlot}
          onPress={() => handleOpenPhotoPicker(photoSlotIndex)}
          activeOpacity={0.85}
        >
          {sPhotos[photoSlotIndex] ? (
            <Image source={{ uri: sPhotos[photoSlotIndex] }} style={styles.slotImageFull} resizeMode="cover" />
          ) : (
            <View style={styles.emptySlotPlaceholder}>
              <Camera size={22} color="#A8A29E" />
              <Text style={[styles.emptySlotText, { fontSize: 9.5 }]}>사진 터치</Text>
            </View>
          )}
          <View style={styles.slotEditBadge}>
            <Text style={styles.slotEditBadgeText}>P.{pageNum} 📸</Text>
          </View>
        </TouchableOpacity>

        {/* 하단 스몰톡 영역 */}
        <View style={styles.hybridTalkBox}>
          <View style={styles.hybridTalkHeader}>
            <View style={styles.hybridQBadge}><Text style={styles.hybridQBadgeText}>Q</Text></View>
            <Text style={[styles.hybridTopicText, { ...fontStyle, fontSize: Math.round(10.5 * fontScale) }]} numberOfLines={1}>
              "{coreTopic.topic}"
            </Text>
          </View>
          <View style={styles.hybridAnswersList}>
            {activeFamilyList.slice(0, 2).map(m => {
              const ans = coreTopic.answers?.[m.id] || m.answer || '늘 곁에서 든든한 버팀목이 되어줘서 고마워요.';
              return (
                <View key={m.id} style={styles.hybridAnsRow}>
                  <Text style={[styles.hybridAnsAuthor, { ...fontStyle, fontSize: Math.round(8.5 * fontScale) }]}>{m.name || m.role}:</Text>
                  <Text style={[styles.hybridAnsText, { ...fontStyle, fontSize: Math.round(9 * fontScale) }]} numberOfLines={1}>"{ans}"</Text>
                </View>
              );
            })}
          </View>
        </View>
        <Text style={styles.pageNumberFootnote}>- {pageNum} -</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* ========================================================= */}
      {/* 1. 슬림 스튜디오 헤더 (권차 선택 & 미리보기로 심플화)         */}
      {/* ========================================================= */}
      <View style={styles.slimTopHeader}>
        <TouchableOpacity
          style={styles.headerTitleBtn}
          onPress={() => setVolumePickerModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.headerTitleIconCircle}>
            <Bookmark size={12} color="#FF6B47" strokeWidth={2.6} />
          </View>
          <Text style={styles.headerBookTitle}>{currentVolObj.label}</Text>
          <Text style={styles.headerBookPeriod}>({currentVolObj.period})</Text>
          <ChevronDown size={13} color="#78716C" style={{ marginLeft: 3 }} />
        </TouchableOpacity>

        {/* 페이지 형식 vs 스크롤 형식 모드 전환 탭 */}
        <View style={styles.headerModeSwitcher}>
          <TouchableOpacity
            style={[styles.headerModeTab, studioViewMode === 'layout' && styles.headerModeTabActive]}
            onPress={() => setStudioViewMode('layout')}
            activeOpacity={0.8}
          >
            <BookOpen size={11} color={studioViewMode === 'layout' ? '#FF6B47' : '#78716C'} style={{ marginRight: 3 }} />
            <Text style={[styles.headerModeTabText, studioViewMode === 'layout' && styles.headerModeTabTextActive]}>
              페이지
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerModeTab, studioViewMode === 'scroll' && styles.headerModeTabActive]}
            onPress={() => setStudioViewMode('scroll')}
            activeOpacity={0.8}
          >
            <Scroll size={11} color={studioViewMode === 'scroll' ? '#FF6B47' : '#78716C'} style={{ marginRight: 3 }} />
            <Text style={[styles.headerModeTabText, studioViewMode === 'scroll' && styles.headerModeTabTextActive]}>
              스크롤
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ========================================================= */}
      {/* 2. 스튜디오 메인 뷰: 페이지 편집 모드 vs 스크롤 피드 모드    */}
      {/* ========================================================= */}
      {studioViewMode === 'layout' ? (
        <>
          {/* ========================================================= */}
          {/* 1. 캔버스 직상단 스마트 컨트롤 HUD 툴바                   */}
          {/*    [ 🎨 테마 ]  [ 🔤 서체 ]  [ 📐 레이아웃 ]  [ 📖 P.X-Y ] */}
          {/* ========================================================= */}
          <View style={styles.canvasHudBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.canvasHudScrollContent}
            >
              {/* A. 테마 선택 칩 */}
              <TouchableOpacity
                style={styles.hudChip}
                onPress={() => setThemePickerModalVisible(true)}
                activeOpacity={0.8}
              >
                <Palette size={12} color={currentTheme.accent} style={{ marginRight: 4 }} />
                <Text style={styles.hudChipText}>{currentTheme.name}</Text>
                <ChevronDown size={11} color="#78716C" style={{ marginLeft: 3 }} />
              </TouchableOpacity>

              {/* B. 폰트 & 크기 선택 칩 */}
              <TouchableOpacity
                style={styles.hudChip}
                onPress={() => setFontPickerModalVisible(true)}
                activeOpacity={0.8}
              >
                <Type size={12} color="#FF6B47" style={{ marginRight: 4 }} />
                <Text style={styles.hudChipText}>
                  {bookFontFamily === 'serif' ? '명조' : bookFontFamily === 'sans' ? '고딕' : '손글씨'} · {bookFontSize === 'small' ? '소' : bookFontSize === 'large' ? '대' : '중'}
                </Text>
                <ChevronDown size={11} color="#78716C" style={{ marginLeft: 3 }} />
              </TouchableOpacity>

              {/* C. 레이아웃 선택 칩 (포맷1 사진 / 포맷2 스몰톡 / 포맷3 사진+톡) */}
              <TouchableOpacity
                style={styles.hudChip}
                onPress={() => setLayoutPickerModalVisible(true)}
                activeOpacity={0.8}
              >
                <Layout size={12} color="#FF6B47" style={{ marginRight: 4 }} />
                <Text style={styles.hudChipText}>
                  {getPageFormat(currentSpreadIndex, activeSingleSide) === 'photo'
                    ? '포맷1 (사진)'
                    : getPageFormat(currentSpreadIndex, activeSingleSide) === 'smalltalk'
                    ? '포맷2 (스몰톡)'
                    : '포맷3 (사진+톡)'}
                </Text>
                <ChevronDown size={11} color="#78716C" style={{ marginLeft: 3 }} />
              </TouchableOpacity>

              {/* D. 페이지 선택 드롭다운 & 넘김 화살표 */}
              <View style={styles.hudPageGroup}>
                <TouchableOpacity
                  style={[styles.hudArrowMini, currentSpreadIndex === 0 && { opacity: 0.3 }]}
                  disabled={currentSpreadIndex === 0}
                  onPress={() => handleGoToSpread(currentSpreadIndex - 1)}
                  activeOpacity={0.7}
                >
                  <ChevronLeft size={13} color="#1C1917" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.hudPageDropdown}
                  onPress={() => setPagePickerModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.hudPageDropdownText}>
                    P.{currentSpread.leftPage}-{currentSpread.rightPage}
                  </Text>
                  <ChevronDown size={10} color="#78716C" style={{ marginLeft: 3 }} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.hudArrowMini, currentSpreadIndex === SPREAD_DEFINITIONS.length - 1 && { opacity: 0.3 }]}
                  disabled={currentSpreadIndex === SPREAD_DEFINITIONS.length - 1}
                  onPress={() => handleGoToSpread(currentSpreadIndex + 1)}
                  activeOpacity={0.7}
                >
                  <ChevronRight size={13} color="#1C1917" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>

          {/* 15×15 코지 스퀘어 좌/우 페이지 세그먼트 & 양면 2:1 토글 */}
          <View style={styles.squarePageNavRow}>
            <View style={styles.squarePageSegment}>
              <TouchableOpacity
                style={[styles.squarePageTab, (viewMode === 'single' && activeSingleSide === 'left') && styles.squarePageTabActive]}
                onPress={() => {
                  setViewMode('single');
                  setActiveSingleSide('left');
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.squarePageTabLabel, (viewMode === 'single' && activeSingleSide === 'left') && styles.squarePageTabLabelActive]}>
                  P.{currentSpread.leftPage} ({getPageFormat(currentSpreadIndex, 'left') === 'photo' ? '사진' : getPageFormat(currentSpreadIndex, 'left') === 'smalltalk' ? '스몰톡' : '사진+톡'})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.squarePageTab, (viewMode === 'single' && activeSingleSide === 'right') && styles.squarePageTabActive]}
                onPress={() => {
                  setViewMode('single');
                  setActiveSingleSide('right');
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.squarePageTabLabel, (viewMode === 'single' && activeSingleSide === 'right') && styles.squarePageTabLabelActive]}>
                  P.{currentSpread.rightPage} ({getPageFormat(currentSpreadIndex, 'right') === 'photo' ? '사진' : getPageFormat(currentSpreadIndex, 'right') === 'smalltalk' ? '스몰톡' : '사진+톡'})
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.squareDualToggleBtn, viewMode === 'dual' && styles.squareDualToggleBtnActive]}
              onPress={() => setViewMode(prev => prev === 'dual' ? 'single' : 'dual')}
              activeOpacity={0.8}
            >
              <Layers size={11} color={viewMode === 'dual' ? '#FFFFFF' : '#78716C'} style={{ marginRight: 3 }} />
              <Text style={[styles.squareDualToggleText, viewMode === 'dual' && styles.squareDualToggleTextActive]}>
                {viewMode === 'dual' ? '1:1' : '양면'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ========================================================= */}
          {/* 2. 가로 스크롤 페이징 캔버스 (Swipeable Spreads Canvas)   */}
          {/*    손가락 좌우 스와이프로 책장을 넘기듯 16개 스프레드 이동  */}
          {/* ========================================================= */}
          <ScrollView
            style={styles.canvasScrollView}
            contentContainerStyle={styles.canvasScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 좌우 스와이프 페이징 스크롤뷰 */}
            <ScrollView
              ref={spreadScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const contentOffsetX = e.nativeEvent.contentOffset.x;
                const winW = windowWidth || Dimensions.get('window').width;
                const newIdx = Math.round(contentOffsetX / winW);
                if (newIdx !== currentSpreadIndex && newIdx >= 0 && newIdx < SPREAD_DEFINITIONS.length) {
                  setCurrentSpreadIndex(newIdx);
                }
              }}
              style={{ width: windowWidth || Dimensions.get('window').width }}
              contentContainerStyle={{ alignItems: 'center' }}
            >
              {SPREAD_DEFINITIONS.map((sDef, sIdx) => {
                const winW = windowWidth || Dimensions.get('window').width;
                return (
                  <View key={sDef.spreadIndex} style={{ width: winW, alignItems: 'center', justifyContent: 'center' }}>
                    {viewMode === 'dual' ? (
                      <View style={[styles.dualPageSpreadFrame, { backgroundColor: currentTheme.bg, borderColor: currentTheme.border, height: dualCanvasHeight }]}>
                        <View style={styles.bookCenterSeam} />
                        <View style={[styles.singlePageHalf, isSmallScreen && { padding: 8 }]}>
                          {renderPage(sIdx, 'left', false)}
                        </View>
                        <View style={[styles.singlePageHalf, isSmallScreen && { padding: 8 }]}>
                          {renderPage(sIdx, 'right', false)}
                        </View>
                      </View>
                    ) : (
                      <View style={[styles.singlePageFullFrame, { backgroundColor: currentTheme.bg, borderColor: currentTheme.border, width: squareCanvasSize, height: squareCanvasSize, alignSelf: 'center' }]}>
                        <View style={[styles.singlePageFullContent, isSmallScreen && { padding: 10 }]}>
                          {renderPage(sIdx, activeSingleSide, true)}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            {/* ========================================================= */}
            {/* 3. 하단 콘텐츠 에디팅 덱 (3대 포맷 선택 & 도서 발주 CTA)   */}
            {/* ========================================================= */}
            <View style={styles.bottomActionDock}>
              {/* 3대 포맷 선택 세그먼트 */}
              <View style={styles.formatSegmentRow}>
                <Text style={styles.formatSegmentTitle}>
                  P.{activeSingleSide === 'left' ? currentSpread.leftPage : currentSpread.rightPage} 포맷:
                </Text>
                <View style={styles.formatSegmentContainer}>
                  <TouchableOpacity
                    style={[styles.formatSegmentTab, getPageFormat(currentSpreadIndex, activeSingleSide) === 'photo' && styles.formatSegmentTabActive]}
                    onPress={() => handleSetPageFormat('photo')}
                    activeOpacity={0.8}
                  >
                    <Camera size={11} color={getPageFormat(currentSpreadIndex, activeSingleSide) === 'photo' ? '#FF6B47' : '#78716C'} style={{ marginRight: 3 }} />
                    <Text style={[styles.formatSegmentTabText, getPageFormat(currentSpreadIndex, activeSingleSide) === 'photo' && styles.formatSegmentTabTextActive]}>
                      포맷1 (사진)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.formatSegmentTab, getPageFormat(currentSpreadIndex, activeSingleSide) === 'smalltalk' && styles.formatSegmentTabActive]}
                    onPress={() => handleSetPageFormat('smalltalk')}
                    activeOpacity={0.8}
                  >
                    <FileText size={11} color={getPageFormat(currentSpreadIndex, activeSingleSide) === 'smalltalk' ? '#FF6B47' : '#78716C'} style={{ marginRight: 3 }} />
                    <Text style={[styles.formatSegmentTabText, getPageFormat(currentSpreadIndex, activeSingleSide) === 'smalltalk' && styles.formatSegmentTabTextActive]}>
                      포맷2 (스몰톡)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.formatSegmentTab, getPageFormat(currentSpreadIndex, activeSingleSide) === 'hybrid' && styles.formatSegmentTabActive]}
                    onPress={() => handleSetPageFormat('hybrid')}
                    activeOpacity={0.8}
                  >
                    <Sparkles size={11} color={getPageFormat(currentSpreadIndex, activeSingleSide) === 'hybrid' ? '#FF6B47' : '#78716C'} style={{ marginRight: 3 }} />
                    <Text style={[styles.formatSegmentTabText, getPageFormat(currentSpreadIndex, activeSingleSide) === 'hybrid' && styles.formatSegmentTabTextActive]}>
                      포맷3 (사진+톡)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 보조 에디팅 버튼들 */}
              <View style={styles.dockSubActionRow}>
                <TouchableOpacity
                  style={styles.dockSubBtn}
                  onPress={() => {
                    const next = spreadLayouts[currentSpreadIndex] === 'wide' ? 'single' : 'wide';
                    setSpreadLayouts(prev => ({ ...prev, [currentSpreadIndex]: next }));
                  }}
                  activeOpacity={0.8}
                >
                  <Layout size={12} color="#FF6B47" style={{ marginRight: 3 }} />
                  <Text style={styles.dockSubBtnText}>
                    {spreadLayouts[currentSpreadIndex] === 'wide' ? '1장 전면' : '2장 분할'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.dockSubBtn} onPress={handleGenerateAiCaption} activeOpacity={0.8}>
                  <Sparkles size={12} color="#7C3AED" style={{ marginRight: 3 }} />
                  <Text style={[styles.dockSubBtnText, { color: '#7C3AED' }]}>AI 글귀</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.dockSubBtn} onPress={() => setTopicPickerModalVisible(true)} activeOpacity={0.8}>
                  <BookOpen size={12} color="#3B82F6" style={{ marginRight: 3 }} />
                  <Text style={[styles.dockSubBtnText, { color: '#3B82F6' }]}>180문답</Text>
                </TouchableOpacity>
              </View>

              {/* 실물 주문 메인 CTA 버튼 */}
              <TouchableOpacity
                style={styles.dockMainOrderBtn}
                onPress={() => setOrderModalVisible(true)}
                activeOpacity={0.85}
              >
                <ShoppingBag size={14} color="#FFFFFF" strokeWidth={2.4} style={{ marginRight: 5 }} />
                <Text style={styles.dockMainOrderBtnText}>
                  {finalCashPrice.toLocaleString()}원 · 15×15cm 하드커버 양장본 실물 주문
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </>
      ) : (
        /* 스크롤 형식: 표지부터 32P까지 세로 연속 피드로 완독 감상 */
        <ScrollView
          style={styles.previewScrollFeed}
          contentContainerStyle={styles.previewScrollFeedContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. 150×150mm 코지 스퀘어 하드커버 겉표지 */}
          <View style={[styles.previewCoverCard, { backgroundColor: currentTheme.bg, borderColor: currentTheme.border }]}>
            <View style={[styles.previewCoverSpineLine, { backgroundColor: currentTheme.accent }]} />
            <View style={styles.previewCoverInner}>
              <View style={styles.previewCoverEmbossBox}>
                <Text style={[styles.previewCoverBadgeText, { color: currentTheme.accent }]}>
                  FAMLINK FAMILY STORYBOOK · 150×150MM SQUARE
                </Text>
                <Text style={[styles.previewCoverTitle, { color: currentTheme.text }]} numberOfLines={2}>
                  {bookTitle}
                </Text>
                <Text style={[styles.previewCoverSub, { color: currentTheme.accent }]} numberOfLines={1}>
                  {bookSubtitle}
                </Text>

                <View style={styles.previewCoverHeroFrame}>
                  {currentPhotos[0] ? (
                    <Image source={{ uri: currentPhotos[0] }} style={styles.previewCoverHeroImg} resizeMode="cover" />
                  ) : (
                    <View style={styles.previewCoverHeroPlaceholder}>
                      <Heart size={32} color={currentTheme.accent} />
                      <Text style={[styles.previewCoverHeroText, { color: currentTheme.text }]}>우리 가족 첫 이야기</Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.previewCoverFamilySign, { color: currentTheme.text }]}>
                  {currentUserProfile?.name || '가족'}네 따뜻한 보금자리 · FamLink Family Press
                </Text>
                <Text style={styles.previewCoverSpecLabel}>32 Pages Hardcover 양장제본 · 랑데뷰 160g</Text>
              </View>
            </View>
          </View>

          {/* 2. 16개 스프레드 전수 연속 렌더링 (P.1 ~ P.32) */}
          {SPREAD_DEFINITIONS.map((sDef, sIdx) => {
            return (
              <View key={sDef.spreadIndex} style={styles.previewSpreadCard}>
                <View style={styles.previewSpreadHeader}>
                  <View style={styles.previewSpreadTag}>
                    <Text style={styles.previewSpreadTagText}>SPREAD {sIdx + 1} / 16</Text>
                  </View>
                  <Text style={styles.previewSpreadTitleText} numberOfLines={1}>
                    P.{sDef.leftPage} - P.{sDef.rightPage} · {sDef.title}
                  </Text>
                </View>

                <View style={[styles.previewSpreadFrame, { backgroundColor: currentTheme.bg, borderColor: currentTheme.border }]}>
                  <View style={styles.previewSpreadCenterSeam} />
                  <View style={styles.previewSpreadPageCol}>
                    {renderPage(sIdx, 'left', false)}
                  </View>
                  <View style={styles.previewSpreadPageCol}>
                    {renderPage(sIdx, 'right', false)}
                  </View>
                </View>
              </View>
            );
          })}

          {/* 하단 주문 발주 유도 카드 */}
          <View style={styles.previewBottomCtaCard}>
            <Text style={styles.previewBottomCtaTitle}>우리 가족만의 15×15cm 스퀘어 이야기책 📖</Text>
            <Text style={styles.previewBottomCtaSub}>
              매일 나눈 스몰톡과 소중한 사진이 영구 보존용 양장 하드커버 도서로 완성됩니다.
            </Text>
            <TouchableOpacity
              style={styles.previewBottomOrderBtn}
              onPress={() => setOrderModalVisible(true)}
              activeOpacity={0.85}
            >
              <ShoppingBag size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.previewBottomOrderBtnText}>
                {finalCashPrice.toLocaleString()}원 결제하고 실물 주문하기 (포인트 최대 12,000P 할인)
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ========================================================= */}
      {/* ========================================================= */}
      {/* 3-0. 페이지 레이아웃 선택 모달 (Layout Picker Modal)         */}
      {/* ========================================================= */}
      <Modal visible={layoutPickerModalVisible} transparent animationType="fade">
        <View style={styles.modalCenterBackdrop}>
          <TouchableOpacity
            style={styles.modalCenterBackdropTouch}
            activeOpacity={1}
            onPress={() => setLayoutPickerModalVisible(false)}
          />
          <View style={styles.miniPickerCard}>
            <View style={styles.miniPickerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Layout size={16} color="#FF6B47" style={{ marginRight: 6 }} />
                <Text style={styles.miniPickerTitle}>페이지 레이아웃 설정</Text>
              </View>
              <TouchableOpacity onPress={() => setLayoutPickerModalVisible(false)} style={styles.closeBtn}>
                <X size={18} color="#1C1917" />
              </TouchableOpacity>
            </View>

            {/* 대상 페이지 선택 탭 */}
            <View style={styles.layoutTargetPageRow}>
              <Text style={styles.layoutPickerTargetNote}>대상 페이지:</Text>
              <View style={styles.layoutTargetTabGroup}>
                <TouchableOpacity
                  style={[styles.layoutTargetTab, activeSingleSide === 'left' && styles.layoutTargetTabActive]}
                  onPress={() => setActiveSingleSide('left')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.layoutTargetTabText, activeSingleSide === 'left' && styles.layoutTargetTabTextActive]}>
                    P.{currentSpread.leftPage} (좌)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.layoutTargetTab, activeSingleSide === 'right' && styles.layoutTargetTabActive]}
                  onPress={() => setActiveSingleSide('right')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.layoutTargetTabText, activeSingleSide === 'right' && styles.layoutTargetTabTextActive]}>
                    P.{currentSpread.rightPage} (우)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 3대 포맷 선택 목록 */}
            <Text style={styles.miniPickerSectionTitle}>3대 출판 레이아웃 포맷</Text>
            <View style={styles.layoutOptionCol}>
              {[
                { id: 'photo', name: '포맷 1: 사진 전용', desc: '15×15cm 정방형 풀프레임 앨범', icon: Camera },
                { id: 'smalltalk', name: '포맷 2: 스몰톡 전용', desc: '가족 180문답과 다정한 대화 수필', icon: FileText },
                { id: 'hybrid', name: '포맷 3: 사진 + 스몰톡', desc: '상단 사진 1장 + 하단 스몰톡 결합', icon: Sparkles },
              ].map(fmt => {
                const currentFmt = getPageFormat(currentSpreadIndex, activeSingleSide);
                const isSelected = currentFmt === fmt.id;
                const IconComp = fmt.icon;
                return (
                  <TouchableOpacity
                    key={fmt.id}
                    style={[styles.layoutFormatItem, isSelected && styles.layoutFormatItemActive]}
                    onPress={() => {
                      handleSetPageFormat(fmt.id);
                      setLayoutPickerModalVisible(false);
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.layoutFormatIconBox, isSelected && styles.layoutFormatIconBoxActive]}>
                      <IconComp size={15} color={isSelected ? '#FF6B47' : '#78716C'} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.layoutFormatName, isSelected && styles.layoutFormatNameActive]}>
                        {fmt.name}
                      </Text>
                      <Text style={styles.layoutFormatDesc}>{fmt.desc}</Text>
                    </View>
                    {isSelected && <Check size={16} color="#FF6B47" strokeWidth={2.5} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 사진 프레임 분할 토글 */}
            <View style={styles.layoutDivider} />
            <View style={styles.layoutPhotoSplitRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.layoutPhotoSplitTitle}>사진 프레임 구성</Text>
                <Text style={styles.layoutPhotoSplitSub}>
                  {spreadLayouts[currentSpreadIndex] === 'wide' ? '1장 전면 풀 프레임' : '2장 상하 분할 프레임'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.layoutPhotoSplitBtn}
                onPress={() => {
                  const next = spreadLayouts[currentSpreadIndex] === 'wide' ? 'single' : 'wide';
                  setSpreadLayouts(prev => ({ ...prev, [currentSpreadIndex]: next }));
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.layoutPhotoSplitBtnText}>
                  {spreadLayouts[currentSpreadIndex] === 'wide' ? '2장 분할로 변경' : '1장 전면으로 변경'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* 3-1. 테마 선택 모달 (Theme Picker Modal)                    */}
      {/* ========================================================= */}
      <Modal visible={themePickerModalVisible} transparent animationType="fade">
        <View style={styles.modalCenterBackdrop}>
          <TouchableOpacity
            style={styles.modalCenterBackdropTouch}
            activeOpacity={1}
            onPress={() => setThemePickerModalVisible(false)}
          />
          <View style={styles.miniPickerCard}>
            <View style={styles.miniPickerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Palette size={16} color="#FF6B47" style={{ marginRight: 6 }} />
                <Text style={styles.miniPickerTitle}>포토북 테마 팔레트</Text>
              </View>
              <TouchableOpacity onPress={() => setThemePickerModalVisible(false)} style={styles.closeBtn}>
                <X size={18} color="#1C1917" />
              </TouchableOpacity>
            </View>
            <View style={styles.themeOptionsGrid2x2}>
              {STUDIO_THEMES.map(t => {
                const isSelected = selectedThemeId === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.themeOptionItem2x2, isSelected && styles.themeOptionItemActive, { backgroundColor: t.bg, borderColor: isSelected ? '#FF6B47' : t.border }]}
                    onPress={() => {
                      setSelectedThemeId(t.id);
                      setThemePickerModalVisible(false);
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.themeDotBig, { backgroundColor: t.accent }]} />
                    <Text style={[styles.themeOptionItemName, { color: t.text }]} numberOfLines={1}>{t.name}</Text>
                    {isSelected && <Check size={14} color="#FF6B47" strokeWidth={2.5} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* 3-2. 폰트 & 글자 크기 선택 모달 (Font Picker Modal)          */}
      {/* ========================================================= */}
      <Modal visible={fontPickerModalVisible} transparent animationType="fade">
        <View style={styles.modalCenterBackdrop}>
          <TouchableOpacity
            style={styles.modalCenterBackdropTouch}
            activeOpacity={1}
            onPress={() => setFontPickerModalVisible(false)}
          />
          <View style={styles.miniPickerCard}>
            <View style={styles.miniPickerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Type size={16} color="#FF6B47" style={{ marginRight: 6 }} />
                <Text style={styles.miniPickerTitle}>서체 및 글자 크기 설정</Text>
              </View>
              <TouchableOpacity onPress={() => setFontPickerModalVisible(false)} style={styles.closeBtn}>
                <X size={18} color="#1C1917" />
              </TouchableOpacity>
            </View>

            {/* 서체 패밀리 선택 */}
            <Text style={styles.miniPickerSectionTitle}>서체 선택</Text>
            <View style={styles.fontOptionRow}>
              {[
                { id: 'serif', label: '감성 명조', desc: '에세이 감성' },
                { id: 'sans', label: '모던 고딕', desc: '깔끔한 사진집' },
                { id: 'handwriting', label: '다정 손글씨', desc: '가족 일기체' },
              ].map(f => {
                const isSelected = bookFontFamily === f.id;
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.fontOptionBtn, isSelected && styles.fontOptionBtnActive]}
                    onPress={() => setBookFontFamily(f.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.fontOptionLabel, isSelected && styles.fontOptionLabelActive]}>{f.label}</Text>
                    <Text style={styles.fontOptionDesc}>{f.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 글자 크기 선택 */}
            <Text style={[styles.miniPickerSectionTitle, { marginTop: 14 }]}>글자 크기</Text>
            <View style={styles.fontSizeRow}>
              {[
                { id: 'small', label: '작게 (12pt)' },
                { id: 'medium', label: '보통 (14pt · 권장)' },
                { id: 'large', label: '크게 (16pt · 부모님용)' },
              ].map(s => {
                const isSelected = bookFontSize === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.fontSizeBtn, isSelected && styles.fontSizeBtnActive]}
                    onPress={() => setBookFontSize(s.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.fontSizeBtnText, isSelected && styles.fontSizeBtnTextActive]}>{s.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* 3-3. 16개 스프레드 빠른 점프 4×4 콤팩트 그리드 모달            */}
      {/* ========================================================= */}
      <Modal visible={pagePickerModalVisible} transparent animationType="fade">
        <View style={styles.modalCenterBackdrop}>
          <TouchableOpacity
            style={styles.modalCenterBackdropTouch}
            activeOpacity={1}
            onPress={() => setPagePickerModalVisible(false)}
          />
          <View style={[styles.miniPickerCard, { maxWidth: 370 }]}>
            <View style={styles.miniPickerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <BookOpen size={16} color="#FF6B47" style={{ marginRight: 6 }} />
                <Text style={styles.miniPickerTitle}>페이지 빠른 이동</Text>
              </View>
              <TouchableOpacity onPress={() => setPagePickerModalVisible(false)} style={styles.closeBtn}>
                <X size={18} color="#1C1917" />
              </TouchableOpacity>
            </View>

            <Text style={styles.pageGridIntroSub}>
              총 16개 펼침면(32P) 중 이동할 페이지를 터치하세요:
            </Text>

            {/* 4×4 정방형 콤팩트 그리드 */}
            <View style={styles.pageGridMatrix}>
              {SPREAD_DEFINITIONS.map((s, idx) => {
                const isCurrent = idx === currentSpreadIndex;
                const icon = s.category === 'prologue' ? '📖' : s.category === 'interview' ? '💬' : s.category === 'stats' ? '📊' : s.category === 'epilogue' ? '✍️' : '📷';
                return (
                  <TouchableOpacity
                    key={s.spreadIndex}
                    style={[styles.pageGridCell, isCurrent && styles.pageGridCellActive]}
                    onPress={() => {
                      handleGoToSpread(idx);
                      setPagePickerModalVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.pageGridCellTopRow}>
                      <Text style={{ fontSize: 9.5 }}>{icon}</Text>
                      <Text style={[styles.pageGridCellSpNum, isCurrent && styles.pageGridCellSpNumActive]}>
                        #{idx + 1}
                      </Text>
                    </View>
                    <Text style={[styles.pageGridCellPages, isCurrent && styles.pageGridCellPagesActive]}>
                      P.{s.leftPage}-{s.rightPage}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* 4. 사진 트레이 선택 모달 (Photo Picker Tray)                */}
      {/* ========================================================= */}
      <Modal visible={photoPickerVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerSheetCard}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>포토북 수록 사진 선택</Text>
                <Text style={styles.sheetSub}>채팅방에서 공유된 사진 중 넣을 사진을 터치하세요.</Text>
              </View>
              <TouchableOpacity onPress={() => setPhotoPickerVisible(false)} style={styles.closeBtn}>
                <X size={20} color="#1C1917" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.photoGridScroll} showsVerticalScrollIndicator={false}>
              {chatPhotos.length === 0 ? (
                <View style={styles.emptyNotice}>
                  <Camera size={36} color="#A8A29E" style={{ marginBottom: 8 }} />
                  <Text style={styles.emptyNoticeText}>채팅방에 공유된 사진이 없습니다.</Text>
                </View>
              ) : (
                chatPhotos.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.gridThumbBox}
                    onPress={() => handleSelectPhoto(item.uri)}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: item.uri }} style={styles.gridThumbImage} resizeMode="cover" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* 5. 가족 기록(권차) 선택 모달 (Volume Picker Modal)            */}
      {/* ========================================================= */}
      <Modal visible={volumePickerModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.volumeSheetCard}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                  <Bookmark size={15} color="#FF6B47" strokeWidth={2.5} style={{ marginRight: 6 }} />
                  <Text style={styles.sheetTitle}>가족 기록 도서(권차) 선택</Text>
                </View>
                <Text style={styles.sheetSub}>6개월 활동 단위로 완간되는 우리 가족 이야기책을 선택하세요.</Text>
              </View>
              <TouchableOpacity onPress={() => setVolumePickerModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color="#1C1917" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.volumeListScroll} showsVerticalScrollIndicator={false}>
              {VOLUME_OPTIONS.map((v, idx) => {
                const isSelected = selectedVolume === v.id;
                return (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.volumeOptionCard, isSelected && styles.volumeOptionCardActive]}
                    onPress={() => {
                      setSelectedVolume(v.id);
                      setBookTitle(`우리 가족의 ${v.label === '제1권' ? '첫 번째' : v.label === '제2권' ? '두 번째' : '세 번째'} 이야기 (${v.title})`);
                      setVolumePickerModalVisible(false);
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.volumeBadgeCircle, isSelected && styles.volumeBadgeCircleActive]}>
                      <Text style={[styles.volumeBadgeCircleText, isSelected && styles.volumeBadgeCircleTextActive]}>
                        {v.title}
                      </Text>
                    </View>

                    <View style={{ flex: 1, marginHorizontal: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <Text style={[styles.volumeOptionTitle, isSelected && styles.volumeOptionTitleActive]}>
                          {v.label} · {v.period}
                        </Text>
                        {idx === 0 && (
                          <View style={styles.activeVolTag}>
                            <Text style={styles.activeVolTagText}>완간 수록</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.volumeOptionDesc}>{v.desc}</Text>
                    </View>

                    <View style={[styles.volumeRadioCircle, isSelected && styles.volumeRadioCircleActive]}>
                      {isSelected && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>



      {/* ========================================================= */}
      {/* 6. 실물 양장본 인쇄 주문 모달 (POD Commerce Modal)         */}
      {/* ========================================================= */}
      <Modal visible={orderModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.orderSheetCard}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>양장 하드커버 실물 인쇄 발주</Text>
                <Text style={styles.sheetSub}>6개월간의 소중한 기록을 영구 소장 도서로 제작합니다.</Text>
              </View>
              <TouchableOpacity onPress={() => setOrderModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color="#1C1917" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.orderFormScroll} showsVerticalScrollIndicator={false}>
              {/* 도서 명세 요약 */}
              <View style={styles.orderSummaryCard}>
                <Text style={styles.orderBookTitle}>{bookTitle}</Text>
                <Text style={styles.orderBookSub}>
                  150×150mm 코지 스퀘어 · 32페이지 · 무광 하드커버 양장제본 · 세네카 책등 5mm 인쇄
                </Text>
                <View style={styles.priceDivider} />
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>기본 1권 인쇄비:</Text>
                  <Text style={styles.priceVal}>24,000원</Text>
                </View>
              </View>

              {/* 🌟 하이브리드 토크노믹스: 가족 활동 포인트 차감 할인 카드 */}
              <View style={styles.pointsDiscountCard}>
                <View style={styles.pointsHeaderRow}>
                  <View style={styles.pointsTitleGroup}>
                    <Award size={16} color="#059669" style={{ marginRight: 6 }} />
                    <Text style={styles.pointsTitleText}>가족 활동 포인트 할인</Text>
                  </View>
                  <View style={styles.holdingPointsBadge}>
                    <Text style={styles.holdingPointsBadgeText}>
                      보유 {(points || 0).toLocaleString()} P
                    </Text>
                  </View>
                </View>

                {availablePointsToUse > 0 ? (
                  <TouchableOpacity
                    style={[styles.pointsApplyBtn, usePointsDiscount && styles.pointsApplyBtnActive]}
                    onPress={() => setUsePointsDiscount(!usePointsDiscount)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.pointsCheckSquare, usePointsDiscount && styles.pointsCheckSquareActive]}>
                      {usePointsDiscount && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pointsApplyTitle}>
                        포인트로 -{availablePointsToUse.toLocaleString()}원 즉시 할인
                      </Text>
                      <Text style={styles.pointsApplySub}>
                        지난 6개월간 매일 대화하며 모은 온기 포인트로 인쇄비를 지원해 드려요! (최대 12,000P)
                      </Text>
                    </View>
                    <Text style={[styles.pointsDiscountAmt, usePointsDiscount && styles.pointsDiscountAmtActive]}>
                      -{availablePointsToUse.toLocaleString()}원
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.noPointsNotice}>
                    <Text style={styles.noPointsNoticeText}>
                      💡 매일 스몰톡과 집안일 미션으로 포인트를 모으면 다음 권 인쇄비를 최대 12,000원 할인받을 수 있어요!
                    </Text>
                  </View>
                )}
              </View>

              {/* 추가 옵션: 조부모님 선물용 1권 추가 할인 (비즈니스 핵심 업셀링) */}
              <TouchableOpacity
                style={[styles.addCopyBox, orderAddCopy && styles.addCopyBoxActive]}
                onPress={() => setOrderAddCopy(!orderAddCopy)}
                activeOpacity={0.85}
              >
                <View style={styles.addCopyCheckbox}>
                  {orderAddCopy && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.addCopyTitle}>부모님/조부모님 선물용 +1권 추가</Text>
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>42% 파격 특가</Text>
                    </View>
                  </View>
                  <Text style={styles.addCopySub}>할인가 +14,000원에 한 권 더 제작해 선물하세요!</Text>
                </View>
                <Text style={styles.addCopyPriceText}>+14,000원</Text>
              </TouchableOpacity>

              {/* 총 결제 예정 금액 (하이브리드 명세) */}
              <View style={styles.totalPriceBanner}>
                <View>
                  <Text style={styles.totalPriceLabel}>최종 실결제 금액 (배송비 무료):</Text>
                  {appliedPoints > 0 && (
                    <Text style={styles.totalPriceSubNotice}>
                      (가족 포인트 {appliedPoints.toLocaleString()}P 할인 적용됨 ✨)
                    </Text>
                  )}
                </View>
                <Text style={styles.totalPriceNumber}>
                  {finalCashPrice.toLocaleString()}원
                </Text>
              </View>

              {/* 배송지 입력 필드 */}
              <Text style={styles.formInputLabel}>받는 분 성함</Text>
              <TextInput
                style={styles.formInput}
                value={orderName}
                onChangeText={setOrderName}
                placeholder="성함을 입력하세요"
              />

              <Text style={styles.formInputLabel}>연락처</Text>
              <TextInput
                style={styles.formInput}
                value={orderPhone}
                onChangeText={setOrderPhone}
                placeholder="연락처를 입력하세요"
                keyboardType="phone-pad"
              />

              <Text style={styles.formInputLabel}>배송지 주소</Text>
              <TextInput
                style={styles.formInput}
                value={orderAddress}
                onChangeText={setOrderAddress}
                placeholder="상세 주소를 입력하세요"
              />

              <TouchableOpacity
                style={styles.submitOrderBtn}
                onPress={handleExecuteOrder}
                disabled={isSubmittingOrder}
                activeOpacity={0.85}
              >
                <ShoppingBag size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.submitOrderBtnText}>
                  {isSubmittingOrder
                    ? '주문 생성 중...'
                    : `${finalCashPrice.toLocaleString()}원 결제하고 총 ${orderAddCopy ? '2권' : '1권'} 제작 주문하기`}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 도서 제목 편집 모달 */}
      <Modal visible={editTitleModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.editTitleModalCard}>
            <Text style={styles.editTitleHeading}>도서 제목 & 부제 편집</Text>
            <Text style={styles.formInputLabel}>메인 제목</Text>
            <TextInput
              style={styles.formInput}
              value={tempTitle}
              onChangeText={setTempTitle}
            />
            <Text style={styles.formInputLabel}>부제 (한 줄 설명)</Text>
            <TextInput
              style={styles.formInput}
              value={tempSubtitle}
              onChangeText={setTempSubtitle}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditTitleModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={() => {
                  if (!tempTitle.trim()) {
                    Alert.alert('알림', '제목을 입력해주세요.');
                    return;
                  }
                  setBookTitle(tempTitle.trim());
                  setBookSubtitle(tempSubtitle.trim());
                  setEditTitleModalVisible(false);
                }}
              >
                <Text style={styles.modalSaveBtnText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* 7. 스몰톡 질문 교체 및 아카이브 담기 모달                   */}
      {/* ========================================================= */}
      <Modal visible={topicPickerModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerSheetCard}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.sheetTitle} numberOfLines={1}>스몰톡 인터뷰 문답 교체</Text>
                <Text style={styles.sheetSub}>
                  {currentSpread.monthIndex !== undefined ? `${currentSpread.monthIndex + 1}월의` : '해당 기간의'} 대표 질문을 선택하거나 아카이브에서 교체할 수 있습니다.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setTopicPickerModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color="#1C1917" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#1C1917', marginBottom: 8 }}>
                현재 페이지 수록 중인 3대 질문
              </Text>
              {currentInterviewTopics.map((item, idx) => (
                <View key={item.id || idx} style={styles.topicPickerItemCard}>
                  <View style={styles.qNumBadge}>
                    <Text style={styles.qNumBadgeText}>Q{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topicPickerDateText}>{item.date || '선택된 질문'}</Text>
                    <Text style={styles.topicPickerTitleText}>"{item.topic}"</Text>
                  </View>
                  <Check size={16} color="#FF6B47" strokeWidth={2.5} />
                </View>
              ))}

              <Text style={{ fontSize: 13, fontWeight: '800', color: '#1C1917', marginTop: 14, marginBottom: 8 }}>
                💡 추천 대체 질문 목록 (탭하여 교체)
              </Text>
              {[
                '가족에게 가장 감동받았던 사소한 배려는 무엇인가요?',
                '우리 집에서 가장 편안하고 아늑한 나만의 아지트는?',
                '가족들과 함께 해보고 싶은 소소한 취미가 있나요?',
                '다시 돌아가고 싶은 우리 가족의 하루가 있다면 언제인가요?',
                '가족들에게 꼭 해주고 싶은 따뜻한 요리가 있나요?',
              ].map((qText, sIdx) => (
                <TouchableOpacity
                  key={sIdx}
                  style={styles.topicPickerCandidateCard}
                  onPress={() => {
                    const updated = [...currentInterviewTopics];
                    updated[selectedTopicSlot] = {
                      ...updated[selectedTopicSlot],
                      topic: qText,
                    };
                    setCustomSpreadTopics(prev => ({ ...prev, [currentSpreadIndex]: updated }));
                    setTopicPickerModalVisible(false);
                    Alert.alert('질문 교체 완료 🪄', `Q${selectedTopicSlot + 1} 질문이 새로운 문답으로 교체되었습니다!`);
                  }}
                  activeOpacity={0.8}
                >
                  <Sparkles size={14} color="#7C3AED" style={{ marginRight: 8 }} />
                  <Text style={styles.candidateText}>"{qText}"</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* 8. 180문답 전수 인덱스 부록 모달 (Appendix Modal)           */}
      {/* ========================================================= */}
      <Modal visible={appendixModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.pickerSheetCard, { maxHeight: '85%' }]}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.sheetTitle} numberOfLines={1}>180문답 전수 인덱스 부록 (P.29~30)</Text>
                <Text style={styles.sheetSub}>
                  6개월간 나눈 180개의 모든 스몰톡 질문이 책의 권말 색인에 1개도 빠짐없이 전수 기록됩니다.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAppendixModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color="#1C1917" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
              <View style={styles.appendixNoticeBox}>
                <Award size={16} color="#FF6B47" style={{ marginRight: 6 }} />
                <Text style={styles.appendixNoticeText}>
                  총 180일간의 발자취 · 완독률 98% · 양장본 권말 부록 실물 인쇄 탑재
                </Text>
              </View>

              <View style={styles.appendixGrid}>
                {Array.from({ length: 30 }).map((_, i) => (
                  <View key={i} style={styles.appendixRow}>
                    <Text style={styles.appendixDate}>Day {i + 1}</Text>
                    <Text style={styles.appendixQuestion} numberOfLines={1}>
                      {i % 4 === 0 ? '우리 가족에게 가장 힘이 되는 따뜻한 말은?'
                        : i % 4 === 1 ? '가장 좋아하는 엄마 아빠의 집밥 메뉴는?'
                        : i % 4 === 2 ? '올해 꼭 함께 떠나고 싶은 여행지는?'
                        : '오늘 하루 중 가장 많이 웃었던 순간은?'}
                    </Text>
                    <Check size={12} color="#10B981" />
                  </View>
                ))}
              </View>
              <Text style={{ textAlign: 'center', fontSize: 11, color: '#A8A29E', marginTop: 10 }}>
                ... 외 150개의 질문이 3단 초소형 타이니 인덱스로 30페이지에 완벽 인쇄됩니다.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F3',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  topHeaderLeft: {
    flex: 1,
  },
  studioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#FFE8E0',
  },
  studioBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF6B47',
    letterSpacing: 0.5,
  },
  topHeaderTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1C1917',
  },
  // 1. 슬림 헤더 바
  slimTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: '#FAF8F3',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0E8',
    overflow: 'hidden',
  },
  headerTitleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 2,
  },
  headerTitleIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF5F2',
    borderWidth: 1,
    borderColor: '#FFE8E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  headerBookTitle: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#1C1917',
    marginRight: 4,
  },
  headerBookPeriod: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#78716C',
  },
  headerModeSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F0E8',
    borderRadius: 10,
    padding: 2.5,
  },
  headerModeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 8,
  },
  headerModeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  headerModeTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78716C',
  },
  headerModeTabTextActive: {
    color: '#FF6B47',
    fontWeight: '800',
  },
  // 1-1. 캔버스 직상단 스마트 컨트롤 HUD 툴바
  canvasHudBar: {
    backgroundColor: '#FAF8F3',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0E8',
    paddingVertical: 7,
  },
  canvasHudScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 6,
  },
  hudChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  hudChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1C1917',
  },
  hudPageGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 9,
    paddingHorizontal: 4,
    paddingVertical: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  hudArrowMini: {
    padding: 3,
  },
  hudPageDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  hudPageDropdownText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF6B47',
  },

  // 2. 15×15 코지 스퀘어 페이징 바
  squarePageNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: '#FAF8F3',
    gap: 6,
  },
  squareNavArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F5F0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareNavArrowBtnDisabled: {
    opacity: 0.35,
  },
  squarePageSegment: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F5F0E8',
    borderRadius: 10,
    padding: 2.5,
    gap: 2,
  },
  squarePageTab: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squarePageTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  squarePageTabLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#78716C',
  },
  squarePageTabLabelActive: {
    color: '#FF6B47',
    fontWeight: '800',
  },
  squareDualToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F5F0E8',
  },
  squareDualToggleBtnActive: {
    backgroundColor: '#1C1917',
    borderColor: '#1C1917',
  },
  squareDualToggleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78716C',
  },
  squareDualToggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // 4. 캔버스 영역
  canvasScrollView: {
    flex: 1,
  },
  canvasScrollContent: {
    paddingHorizontal: 0,
    paddingBottom: 40,
  },
  spreadTitleRow: {
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 16,
  },
  spreadTitleText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1917',
  },
  singlePageFullFrame: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 8,
  },
  singlePageFullContent: {
    flex: 1,
    padding: 16,
    position: 'relative',
    justifyContent: 'space-between',
  },

  // 5. 하단 필름스트립
  filmstripContainer: {
    paddingVertical: 4,
    marginBottom: 6,
  },
  filmstripScroll: {
    gap: 6,
    alignItems: 'center',
  },
  filmstripItem: {
    width: 44,
    height: 40,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F5F0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filmstripItemActive: {
    backgroundColor: '#FFF5F2',
    borderColor: '#FF6B47',
    borderWidth: 1.5,
  },
  filmstripItemIcon: {
    fontSize: 12,
  },
  filmstripItemPage: {
    fontSize: 9,
    fontWeight: '700',
    color: '#78716C',
    marginTop: 1,
  },
  filmstripItemPageActive: {
    color: '#FF6B47',
    fontWeight: '800',
  },

  // 6. 하단 조판 액션 독
  bottomActionDock: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F5F0E8',
    borderRadius: 16,
    padding: 12,
    marginTop: 6,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  formatSegmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  formatSegmentTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#78716C',
  },
  formatSegmentContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F5F0E8',
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  formatSegmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6.5,
    borderRadius: 8,
  },
  formatSegmentTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  formatSegmentTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78716C',
  },
  formatSegmentTabTextActive: {
    color: '#FF6B47',
    fontWeight: '800',
  },
  dockSubActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  dockSubBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF8F3',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    paddingVertical: 6.5,
    borderRadius: 9,
  },
  dockSubBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1C1917',
  },
  dockMainOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B47',
    paddingVertical: 11,
    borderRadius: 12,
    shadowColor: '#FF6B47',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  dockMainOrderBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  dualPageSpreadFrame: {
    flexDirection: 'row',
    height: 380,
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 16,
  },
  bookCenterSeam: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    zIndex: 10,
  },
  singlePageHalf: {
    flex: 1,
    padding: 16,
    position: 'relative',
    justifyContent: 'space-between',
  },
  prologuePageContent: {
    flex: 1,
  },
  chapterKicker: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  bookMainHeading: {
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
    marginBottom: 4,
  },
  bookSubHeading: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 14,
  },
  prologueParagraphBox: {
    flex: 1,
  },
  prologueBodyText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
  },
  editTitleMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E0D0',
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  editTitleMiniBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78716C',
  },
  interviewPageContent: {
    flex: 1,
  },
  interviewKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  interviewKickerText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FF6B47',
    letterSpacing: 0.5,
  },
  interviewQuestionCard: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFE8E0',
    marginBottom: 8,
  },
  interviewQuestionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1C1917',
    lineHeight: 16,
  },
  answersScroll: {
    flex: 1,
  },
  multiQnACard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 10,
    padding: 7,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#FFE8E0',
  },
  multiQnAHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  qNumBadge: {
    backgroundColor: '#FF6B47',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginRight: 6,
  },
  qNumBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  multiQnATitle: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: '800',
    color: '#1C1917',
    lineHeight: 14,
  },
  compactAnswersList: {
    gap: 2,
    borderTopWidth: 1,
    borderTopColor: '#FFF0EA',
    paddingTop: 3,
  },
  compactAnswerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 1,
  },
  compactMemberName: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#78716C',
    marginRight: 4,
  },
  compactAnswerText: {
    flex: 1,
    fontSize: 8.5,
    fontWeight: '500',
    color: '#292524',
  },
  changeTopicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E8E0D0',
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 6,
  },
  changeTopicBtnText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#78716C',
  },
  appendixToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1917',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginTop: 10,
  },
  appendixToggleBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  topicPickerItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F2',
    borderWidth: 1,
    borderColor: '#FFE8E0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 6,
  },
  topicPickerDateText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF6B47',
    marginBottom: 2,
  },
  topicPickerTitleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1C1917',
  },
  topicPickerCandidateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F5F0E8',
    borderRadius: 12,
    padding: 10,
    marginBottom: 6,
  },
  candidateText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1917',
  },
  appendixNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F2',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE8E0',
    marginBottom: 12,
  },
  appendixNoticeText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#1C1917',
  },
  appendixGrid: {
    gap: 6,
  },
  appendixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F3',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F5F0E8',
  },
  appendixDate: {
    fontSize: 10,
    fontWeight: '800',
    color: '#78716C',
    width: 50,
  },
  appendixQuestion: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#1C1917',
    marginRight: 6,
  },
  interviewSpeechBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  speakerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  speakerName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1C1917',
  },
  speechText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#44403C',
    lineHeight: 15,
  },
  statsPageContent: {
    flex: 1,
    justifyContent: 'center',
  },
  statsPageHeading: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FF6B47',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statsPageSub: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1C1917',
    marginBottom: 14,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricBox: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F5F0E8',
    alignItems: 'center',
  },
  metricBigNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FF6B47',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78716C',
    textAlign: 'center',
  },
  photoCanvasSlot: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E0D0',
    position: 'relative',
    marginBottom: 8,
  },
  slotImageFull: {
    width: '100%',
    height: '100%',
  },
  emptySlotPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F0E8',
  },
  emptySlotText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A8A29E',
    marginTop: 6,
  },
  slotEditBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(28, 25, 23, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  slotEditBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  multiSlotContainer: {
    flex: 1,
    gap: 6,
    marginBottom: 8,
  },
  halfSlotTop: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E0D0',
  },
  halfSlotBottom: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E0D0',
  },
  gridSlotContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  gridQuarterSlot: {
    width: '48%',
    height: '47%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E0D0',
  },
  polaroidSlotBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E0D0',
    padding: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    justifyContent: 'space-between',
  },
  polaroidPhotoFrame: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F5F0E8',
    position: 'relative',
    marginBottom: 6,
  },
  polaroidCaptionFrame: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: '#FAF8F3',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F5F0E8',
  },
  polaroidCaptionText: {
    fontSize: 9.5,
    fontStyle: 'italic',
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 14,
  },
  captionRibbon: {
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E0D0',
    marginBottom: 4,
  },
  captionRibbonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#78716C',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  epiloguePageContent: {
    flex: 1,
    justifyContent: 'center',
  },
  epilogueTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1C1917',
    marginBottom: 8,
  },
  epilogueText: {
    fontSize: 11,
    color: '#44403C',
    lineHeight: 16,
    marginBottom: 12,
  },
  signDivider: {
    height: 1,
    backgroundColor: '#E8E0D0',
    marginBottom: 10,
  },
  signatureRow: {
    marginBottom: 12,
  },
  signatureLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78716C',
    marginBottom: 2,
  },
  signatureFamilyText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1C1917',
  },
  colophonBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 8,
    borderRadius: 8,
  },
  colophonText: {
    fontSize: 9,
    color: '#78716C',
    lineHeight: 13,
  },
  pageNumberFootnote: {
    textAlign: 'center',
    fontSize: 10,
    color: '#A8A29E',
    fontWeight: '700',
  },

  // 포맷 3: 사진 + 스몰톡 (Hybrid) 전용 스타일
  hybridPageContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  hybridPhotoSlot: {
    height: '52%',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F5F5F4',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    position: 'relative',
  },
  hybridTalkBox: {
    height: '44%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F5F0E8',
    padding: 8,
    justifyContent: 'space-between',
  },
  hybridTalkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  hybridQBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF6B47',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  hybridQBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  hybridTopicText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1C1917',
    flex: 1,
  },
  hybridAnswersList: {
    gap: 3,
  },
  hybridAnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hybridAnsAuthor: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#FF6B47',
    marginRight: 3,
  },
  hybridAnsText: {
    fontSize: 8.5,
    color: '#44403C',
    flex: 1,
  },

  // 레이아웃 선택 모달 전용 스타일
  layoutTargetPageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF8F3',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F5F0E8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  layoutPickerTargetNote: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78716C',
  },
  layoutTargetTabGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  layoutTargetTab: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  layoutTargetTabActive: {
    backgroundColor: '#FFF5F2',
    borderColor: '#FF6B47',
  },
  layoutTargetTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78716C',
  },
  layoutTargetTabTextActive: {
    color: '#FF6B47',
    fontWeight: '800',
  },
  layoutOptionCol: {
    gap: 8,
  },
  layoutFormatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FAF8F3',
    borderWidth: 1.5,
    borderColor: '#F5F0E8',
  },
  layoutFormatItemActive: {
    backgroundColor: '#FFF5F2',
    borderColor: '#FF6B47',
  },
  layoutFormatIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F5F0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  layoutFormatIconBoxActive: {
    backgroundColor: '#FFE8E0',
    borderColor: '#FF6B47',
  },
  layoutFormatName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1C1917',
    marginBottom: 2,
  },
  layoutFormatNameActive: {
    color: '#FF6B47',
    fontWeight: '800',
  },
  layoutFormatDesc: {
    fontSize: 10,
    color: '#78716C',
  },
  layoutDivider: {
    height: 1,
    backgroundColor: '#F5F0E8',
    marginVertical: 12,
  },
  layoutPhotoSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF8F3',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F5F0E8',
  },
  layoutPhotoSplitTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1C1917',
    marginBottom: 2,
  },
  layoutPhotoSplitSub: {
    fontSize: 10,
    color: '#78716C',
  },
  layoutPhotoSplitBtn: {
    backgroundColor: '#FF6B47',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  layoutPhotoSplitBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // 미니 모달 (테마, 폰트, 페이지 선택) 스타일
  miniPickerCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 10,
  },
  miniPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0E8',
  },
  miniPickerTitle: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#1C1917',
  },
  miniPickerSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#78716C',
    marginBottom: 8,
  },
  themeOptionsGrid: {
    gap: 8,
  },
  themeOptionsGrid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  themeOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'space-between',
  },
  themeOptionItem2x2: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'space-between',
  },
  themeOptionItemActive: {
    borderColor: '#FF6B47',
  },
  themeDotBig: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 10,
  },
  themeOptionItemName: {
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  fontOptionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  fontOptionBtn: {
    flex: 1,
    backgroundColor: '#FAF8F3',
    borderWidth: 1,
    borderColor: '#F5F0E8',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  fontOptionBtnActive: {
    backgroundColor: '#FFF5F2',
    borderColor: '#FF6B47',
  },
  fontOptionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1C1917',
    marginBottom: 2,
  },
  fontOptionLabelActive: {
    color: '#FF6B47',
  },
  fontOptionDesc: {
    fontSize: 9,
    color: '#78716C',
  },
  fontSizeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  fontSizeBtn: {
    flex: 1,
    backgroundColor: '#FAF8F3',
    borderWidth: 1,
    borderColor: '#F5F0E8',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  fontSizeBtnActive: {
    backgroundColor: '#FFF5F2',
    borderColor: '#FF6B47',
  },
  fontSizeBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#78716C',
  },
  fontSizeBtnTextActive: {
    color: '#FF6B47',
    fontWeight: '800',
  },
  // 4×4 콤팩트 페이지 점프 그리드 스타일
  pageGridIntroSub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78716C',
    marginBottom: 10,
  },
  pageGridMatrix: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  pageGridCell: {
    width: '23%',
    backgroundColor: '#FAF8F3',
    borderWidth: 1,
    borderColor: '#F5F0E8',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageGridCellActive: {
    backgroundColor: '#FF6B47',
    borderColor: '#FF6B47',
    shadowColor: '#FF6B47',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  pageGridCellTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  pageGridCellSpNum: {
    fontSize: 9,
    fontWeight: '700',
    color: '#78716C',
  },
  pageGridCellSpNumActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  pageGridCellPages: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1C1917',
  },
  pageGridCellPagesActive: {
    color: '#FFFFFF',
  },

  controlDeckCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F5F0E8',
    padding: 16,
  },
  controlDeckHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1917',
    marginBottom: 10,
  },
  controlBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  deckActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF8F3',
    borderWidth: 1,
    borderColor: '#F5F0E8',
    paddingVertical: 10,
    borderRadius: 12,
  },
  deckActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1C1917',
  },
  themeSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  themeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78716C',
    marginRight: 4,
  },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  themeChipActive: {
    borderWidth: 2,
    borderColor: '#FF6B47',
  },
  themeChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  themeChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalCenterBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalCenterBackdropTouch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  pickerSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '75%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C1917',
  },
  sheetSub: {
    fontSize: 12,
    color: '#78716C',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  photoGridScroll: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 24,
  },
  emptyNotice: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyNoticeText: {
    fontSize: 13,
    color: '#A8A29E',
    fontWeight: '600',
  },
  gridThumbBox: {
    width: (SCREEN_WIDTH - 56) / 3,
    height: (SCREEN_WIDTH - 56) / 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gridThumbImage: {
    width: '100%',
    height: '100%',
  },
  // 8. 가족 기록(권차) 선택 모달
  volumeSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '75%',
  },
  volumeListScroll: {
    paddingVertical: 10,
    gap: 10,
  },
  volumeOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F3',
    borderWidth: 1,
    borderColor: '#F5F0E8',
    borderRadius: 16,
    padding: 14,
  },
  volumeOptionCardActive: {
    backgroundColor: '#FFF5F2',
    borderColor: '#FF6B47',
  },
  volumeBadgeCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F5F0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeBadgeCircleActive: {
    backgroundColor: '#FF6B47',
  },
  volumeBadgeCircleText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#78716C',
  },
  volumeBadgeCircleTextActive: {
    color: '#FFFFFF',
  },
  volumeOptionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1C1917',
  },
  volumeOptionTitleActive: {
    color: '#FF6B47',
  },
  activeVolTag: {
    backgroundColor: '#FF6B47',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeVolTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  volumeOptionDesc: {
    fontSize: 11.5,
    color: '#78716C',
    lineHeight: 16,
  },
  volumeRadioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#D6D3D1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeRadioCircleActive: {
    backgroundColor: '#FF6B47',
    borderColor: '#FF6B47',
  },


  // A. 스크롤 형식 스타일
  previewScrollFeed: {
    flex: 1,
    backgroundColor: '#FAF8F3',
  },
  previewScrollFeedContent: {
    padding: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  previewCoverCard: {
    width: Math.min(SCREEN_WIDTH - 32, 360),
    height: Math.min(SCREEN_WIDTH - 32, 360),
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  previewCoverSpineLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 14,
    opacity: 0.8,
  },
  previewCoverInner: {
    flex: 1,
    marginLeft: 14,
    padding: 14,
  },
  previewCoverEmbossBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewCoverBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  previewCoverTitle: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: 3,
  },
  previewCoverSub: {
    fontSize: 10.5,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  previewCoverHeroFrame: {
    width: 120,
    height: 120,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  previewCoverHeroImg: {
    width: '100%',
    height: '100%',
  },
  previewCoverHeroPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCoverHeroText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  previewCoverFamilySign: {
    fontSize: 9.5,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  previewCoverSpecLabel: {
    fontSize: 8,
    color: '#78716C',
    fontWeight: '600',
  },
  previewSpreadCard: {
    width: Math.min(SCREEN_WIDTH - 32, 480),
    marginBottom: 18,
  },
  previewSpreadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
    paddingHorizontal: 4,
  },
  previewSpreadTag: {
    backgroundColor: '#FFF5F2',
    borderWidth: 1,
    borderColor: '#FFE8E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  previewSpreadTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FF6B47',
  },
  previewSpreadTitleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1C1917',
    flex: 1,
    marginLeft: 8,
  },
  previewSpreadFrame: {
    width: '100%',
    height: Math.min((SCREEN_WIDTH - 32) * 0.52, 230),
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  previewSpreadCenterSeam: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 2,
    marginLeft: -1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    zIndex: 10,
  },
  previewSpreadPageCol: {
    flex: 1,
    padding: 8,
    position: 'relative',
  },
  previewInnerCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
  previewBottomCtaCard: {
    width: Math.min(SCREEN_WIDTH - 32, 480),
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#F5F0E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  previewBottomCtaTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#1C1917',
    marginBottom: 4,
  },
  previewBottomCtaSub: {
    fontSize: 10.5,
    color: '#78716C',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 15,
  },
  previewBottomOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B47',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    width: '100%',
    shadowColor: '#FF6B47',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  previewBottomOrderBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  orderSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  orderFormScroll: {
    paddingBottom: 30,
  },
  orderSummaryCard: {
    backgroundColor: '#FAF8F3',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F5F0E8',
    marginBottom: 12,
  },
  orderBookTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1C1917',
    marginBottom: 4,
  },
  orderBookSub: {
    fontSize: 12,
    color: '#78716C',
    lineHeight: 16,
  },
  priceDivider: {
    height: 1,
    backgroundColor: '#E8E0D0',
    marginVertical: 10,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78716C',
  },
  priceVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1C1917',
  },
  addCopyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8E0D0',
    padding: 12,
    marginBottom: 14,
  },
  addCopyBoxActive: {
    backgroundColor: '#FFF5F2',
    borderColor: '#FF6B47',
  },
  addCopyCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#FF6B47',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  addCopyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1917',
  },
  discountBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  addCopySub: {
    fontSize: 11,
    color: '#78716C',
    marginTop: 2,
  },
  totalPriceBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF5F2',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFE8E0',
    marginBottom: 16,
  },
  totalPriceLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FF6B47',
  },
  pointsDiscountCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 12,
    marginBottom: 12,
  },
  pointsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pointsTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsTitleText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  holdingPointsBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  holdingPointsBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  pointsApplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1.2,
    borderColor: '#86EFAC',
  },
  pointsApplyBtnActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  pointsCheckSquare: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#FFFFFF',
  },
  pointsCheckSquareActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  pointsApplyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46',
  },
  pointsApplySub: {
    fontSize: 10,
    color: '#047857',
    marginTop: 2,
    lineHeight: 14,
  },
  pointsDiscountAmt: {
    fontSize: 13,
    fontWeight: '900',
    color: '#9CA3AF',
    marginLeft: 6,
  },
  pointsDiscountAmtActive: {
    color: '#059669',
  },
  noPointsNotice: {
    paddingVertical: 4,
  },
  noPointsNoticeText: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '600',
    lineHeight: 15,
  },
  addCopyPriceText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1C1917',
    marginLeft: 8,
  },
  totalPriceSubNotice: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    marginTop: 2,
  },
  formInputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1C1917',
    marginBottom: 6,
  },
  formInput: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FAF8F3',
    borderWidth: 1,
    borderColor: '#F5F0E8',
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#1C1917',
    marginBottom: 12,
  },
  submitOrderBtn: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FF6B47',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  submitOrderBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  editTitleModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 24,
  },
  editTitleHeading: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1C1917',
    marginBottom: 14,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F5F0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78716C',
  },
  modalSaveBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FF6B47',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
