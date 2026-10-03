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
  const [selectedThemeId, setSelectedThemeId] = useState('linen');
  const currentTheme = STUDIO_THEMES.find(t => t.id === selectedThemeId) || STUDIO_THEMES[0];

  // 2. 도서 기본 정보
  const [bookTitle, setBookTitle] = useState('우리 가족의 첫 번째 이야기 (Vol. 1)');
  const [bookSubtitle, setBookSubtitle] = useState('사소한 일상이 모여 만든 가장 눈부신 기적');
  const [editTitleModalVisible, setEditTitleModalVisible] = useState(false);
  const [tempTitle, setTempTitle] = useState(bookTitle);
  const [tempSubtitle, setTempSubtitle] = useState(bookSubtitle);

  // 3. 뷰 모드: 'dual' (양면 전체) | 'single' (1페이지 집중)
  const [viewMode, setViewMode] = useState('dual');
  const [activeSingleSide, setActiveSingleSide] = useState('left'); // 'left' | 'right'

  // 4. 현재 작업 중인 펼침면 (스프레드 0~15, 총 16개 펼침면 = 32페이지)
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0);

  // 150×150mm 정방형 스퀘어북 비율에 맞춘 캔버스 높이 동적 계산 (양면 2:1 가로 와이드, 1페이지 1:1 정방형)
  const availableHeight = windowHeight || Dimensions.get('window').height || 750;
  const canvasHeight = viewMode === 'dual'
    ? Math.max(220, Math.min(270, availableHeight - 460))
    : Math.max(260, Math.min(330, availableHeight - 420));

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
  const [flipbookModalVisible, setFlipbookModalVisible] = useState(false);
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

  // 6. 현재 스프레드 정보 계산
  const currentSpread = SPREAD_DEFINITIONS[currentSpreadIndex] || SPREAD_DEFINITIONS[0];
  const currentLayout = spreadLayouts[currentSpreadIndex] || 'single';

  // 현재 스프레드에 할당된 사진들
  const currentPhotos = useMemo(() => {
    const custom = spreadPhotos[currentSpreadIndex];
    if (custom && custom.length > 0) return custom;
    // 기본 자동 채우기: chatPhotos에서 슬라이스
    if (chatPhotos.length > 0) {
      const startIdx = (currentSpreadIndex * 2) % chatPhotos.length;
      return [
        chatPhotos[startIdx]?.uri,
        chatPhotos[(startIdx + 1) % chatPhotos.length]?.uri,
        chatPhotos[(startIdx + 2) % chatPhotos.length]?.uri,
        chatPhotos[(startIdx + 3) % chatPhotos.length]?.uri,
      ].filter(Boolean);
    }
    return [];
  }, [spreadPhotos, currentSpreadIndex, chatPhotos]);

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

  // 현재 스프레드에 수록될 3개 스몰톡 문답 목록
  const currentInterviewTopics = useMemo(() => {
    const custom = customSpreadTopics[currentSpreadIndex];
    if (custom && custom.length > 0) return custom;
    const mIdx = currentSpread.monthIndex !== undefined ? currentSpread.monthIndex : 0;
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
  }, [customSpreadTopics, currentSpreadIndex, currentSpread, smallTalkState, MONTHLY_INTERVIEW_TOPICS]);

  // 7. 레이아웃 셔플 핸들러
  const handleShuffleLayout = () => {
    const layouts = ['single', 'wide', 'split', 'grid'];
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
  // ◀ 좌측 페이지 렌더러 (Left Page Content)
  // =========================================================
  const renderLeftPageContent = (isFull = false) => {
    if (currentSpread.category === 'prologue') {
      return (
        <View style={styles.prologuePageContent}>
          <Text style={[styles.chapterKicker, { color: currentTheme.accent }]}>PROLOGUE</Text>
          <Text
            style={[styles.bookMainHeading, { color: currentTheme.text }, isSmallScreen && { fontSize: 14, lineHeight: 18 }, isFull && { fontSize: 18, lineHeight: 24 }]}
            numberOfLines={2}
            adjustsFontSizeToFit
          >
            {bookTitle}
          </Text>
          <Text
            style={[styles.bookSubHeading, { color: currentTheme.accent }, isSmallScreen && { fontSize: 10, marginBottom: 6 }, isFull && { fontSize: 12, marginBottom: 8 }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {bookSubtitle}
          </Text>

          <View style={styles.prologueParagraphBox}>
            <Text style={[styles.prologueBodyText, { color: currentTheme.text }, isSmallScreen && { fontSize: 9.5, lineHeight: 14 }, isFull && { fontSize: 12, lineHeight: 18 }]}>
              가장 눈부신 순간은 언제나 멀리 있지 않았습니다. 함께 밥을 먹고, 사소한 농담을 주고받고, 문득 전해진 다정한 안부 속에 우리 가족의 가장 따뜻한 계절이 깃들어 있었습니다.
            </Text>
            <Text style={[styles.prologueBodyText, { color: currentTheme.text, marginTop: isSmallScreen ? 4 : 8 }, isSmallScreen && { fontSize: 9.5, lineHeight: 14 }, isFull && { fontSize: 12, lineHeight: 18 }]}>
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
          <Text style={styles.pageNumberFootnote}>- {currentSpread.leftPage} -</Text>
        </View>
      );
    }

    if (currentSpread.category === 'interview') {
      return (
        <View style={styles.interviewPageContent}>
          <View style={styles.interviewKickerRow}>
            <Award size={12} color="#FF6B47" style={{ marginRight: 4 }} />
            <Text style={[styles.interviewKickerText, isSmallScreen && { fontSize: 8 }, isFull && { fontSize: 11 }]}>
              CHAPTER · {currentSpread.monthIndex !== undefined ? `${currentSpread.monthIndex + 1}개월 차` : '활동'} 스몰톡 다이제스트 (3선)
            </Text>
          </View>

          <ScrollView style={styles.answersScroll} showsVerticalScrollIndicator={false}>
            {currentInterviewTopics.map((item, qIdx) => (
              <View key={item.id || qIdx} style={[styles.multiQnACard, isSmallScreen && { padding: 5, marginBottom: 4 }, isFull && { padding: 8, marginBottom: 6 }]}>
                <View style={styles.multiQnAHeader}>
                  <View style={[styles.qNumBadge, isFull && { width: 26, height: 20 }]}>
                    <Text style={[styles.qNumBadgeText, isFull && { fontSize: 10.5 }]}>Q{qIdx + 1}</Text>
                  </View>
                  <Text style={[styles.multiQnATitle, isSmallScreen && { fontSize: 10 }, isFull && { fontSize: 12 }]} numberOfLines={2}>
                    "{item.topic}"
                  </Text>
                </View>

                <View style={styles.compactAnswersList}>
                  {activeFamilyList.map((m) => {
                    const ansText = item.answers?.[m.id] || m.answer || (smallTalkState?.responses && smallTalkState.responses[m.id]) || '함께여서 늘 고마운 우리 가족!';
                    return (
                      <View key={m.id} style={[styles.compactAnswerRow, isFull && { marginVertical: 2 }]}>
                        <UserAvatar avatar={m.avatar || '👦'} size={isFull ? 18 : 14} style={{ marginRight: 4 }} />
                        <Text style={[styles.compactMemberName, isSmallScreen && { fontSize: 8 }, isFull && { fontSize: 10 }]}>{m.name || m.role}:</Text>
                        <Text style={[styles.compactAnswerText, isSmallScreen && { fontSize: 8 }, isFull && { fontSize: 10.5 }]} numberOfLines={1}>
                          "{ansText}"
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.changeTopicBtn, isFull && { paddingVertical: 7 }]}
              onPress={() => {
                setSelectedTopicSlot(0);
                setTopicPickerModalVisible(true);
              }}
              activeOpacity={0.75}
            >
              <Shuffle size={11} color="#78716C" style={{ marginRight: 4 }} />
              <Text style={[styles.changeTopicBtnText, isFull && { fontSize: 11 }]}>질문 교체 및 아카이브에서 담기</Text>
            </TouchableOpacity>
          </ScrollView>
          <Text style={styles.pageNumberFootnote}>- {currentSpread.leftPage} -</Text>
        </View>
      );
    }

    if (currentSpread.category === 'stats') {
      return (
        <View style={styles.statsPageContent}>
          <Text style={[styles.statsPageHeading, isFull && { fontSize: 12 }]}>180-DAY MEMORY METRICS</Text>
          <Text style={[styles.statsPageSub, isSmallScreen && { fontSize: 12, marginBottom: 6 }, isFull && { fontSize: 15, marginBottom: 10 }]}>우리 가족의 180일 온기 발자취</Text>

          <View style={styles.metricGrid}>
            <View style={[styles.metricBox, isSmallScreen && { padding: 5 }, isFull && { padding: 10 }]}>
              <Text style={[styles.metricBigNum, isSmallScreen && { fontSize: 14 }, isFull && { fontSize: 19 }]}>180</Text>
              <Text style={[styles.metricLabel, isSmallScreen && { fontSize: 8.5 }, isFull && { fontSize: 10.5 }]}>나눈 스몰톡</Text>
            </View>
            <View style={[styles.metricBox, isSmallScreen && { padding: 5 }, isFull && { padding: 10 }]}>
              <Text style={[styles.metricBigNum, { color: '#3B82F6' }, isSmallScreen && { fontSize: 14 }, isFull && { fontSize: 19 }]}>{chatPhotos.length || 42}</Text>
              <Text style={[styles.metricLabel, isSmallScreen && { fontSize: 8.5 }, isFull && { fontSize: 10.5 }]}>공유된 사진</Text>
            </View>
            <View style={[styles.metricBox, isSmallScreen && { padding: 5 }, isFull && { padding: 10 }]}>
              <Text style={[styles.metricBigNum, { color: '#10B981' }, isSmallScreen && { fontSize: 14 }, isFull && { fontSize: 19 }]}>1,420</Text>
              <Text style={[styles.metricLabel, isSmallScreen && { fontSize: 8.5 }, isFull && { fontSize: 10.5 }]}>오고 간 메시지</Text>
            </View>
            <View style={[styles.metricBox, isSmallScreen && { padding: 5 }, isFull && { padding: 10 }]}>
              <Text style={[styles.metricBigNum, { color: '#8B5CF6' }, isSmallScreen && { fontSize: 14 }, isFull && { fontSize: 19 }]}>Lv. 14</Text>
              <Text style={[styles.metricLabel, isSmallScreen && { fontSize: 8.5 }, isFull && { fontSize: 10.5 }]}>반려몽 성장</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.appendixToggleBtn, isFull && { paddingVertical: 8 }]}
            onPress={() => setAppendixModalVisible(true)}
            activeOpacity={0.85}
          >
            <BookOpen size={12} color="#FFFFFF" style={{ marginRight: 5 }} />
            <Text style={[styles.appendixToggleBtnText, isFull && { fontSize: 11.5 }]}>180문답 전수 인덱스 부록 📜</Text>
          </TouchableOpacity>
          <Text style={styles.pageNumberFootnote}>- {currentSpread.leftPage} -</Text>
        </View>
      );
    }

    // Default: Photo slot
    return (
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={styles.photoCanvasSlot}
          onPress={() => handleOpenPhotoPicker(0)}
          activeOpacity={0.85}
        >
          {currentPhotos[0] ? (
            <Image source={{ uri: currentPhotos[0] }} style={styles.slotImageFull} resizeMode="cover" />
          ) : (
            <View style={styles.emptySlotPlaceholder}>
              <Camera size={26} color="#A8A29E" />
              <Text style={[styles.emptySlotText, isSmallScreen && { fontSize: 10 }]}>터치하여 사진 넣기</Text>
            </View>
          )}
          <View style={styles.slotEditBadge}>
            <Text style={styles.slotEditBadgeText}>P.{currentSpread.leftPage} 📸</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.pageNumberFootnote}>- {currentSpread.leftPage} -</Text>
      </View>
    );
  };

  // =========================================================
  // ▶ 우측 페이지 렌더러 (Right Page Content)
  // =========================================================
  const renderRightPageContent = (isFull = false) => {
    if (currentSpread.category === 'epilogue') {
      return (
        <View style={styles.epiloguePageContent}>
          <Text style={[styles.chapterKicker, { color: currentTheme.accent }]}>EPILOGUE</Text>
          <Text style={[styles.epilogueTitle, isSmallScreen && { fontSize: 12, marginBottom: 3 }, isFull && { fontSize: 15, marginBottom: 6 }]}>끝나지 않을 우리들의 이야기</Text>
          <Text style={[styles.epilogueText, isSmallScreen && { fontSize: 9.5, lineHeight: 13.5, marginBottom: 6 }, isFull && { fontSize: 12, lineHeight: 17, marginBottom: 10 }]}>
            계절은 바뀌어도 우리가 함께 나눈 사랑의 온도는 변하지 않습니다. 다음 6개월 뒤에도 더 풍성하고 눈부신 추억으로 이 자리를 채워나가길 소망합니다.
          </Text>

          <View style={styles.signDivider} />
          <View style={styles.signatureRow}>
            <Text style={styles.signatureLabel}>가족 서명:</Text>
            <Text
              style={[styles.signatureFamilyText, isSmallScreen && { fontSize: 10 }, isFull && { fontSize: 12 }]}
              numberOfLines={2}
              adjustsFontSizeToFit
            >
              {familyMembers.map(m => m.name || m.role).join(', ') || '엄마, 아빠, 지수, 민준'} 올림
            </Text>
          </View>

          <View style={[styles.colophonBox, isFull && { padding: 8 }]}>
            <Text style={[styles.colophonText, isFull && { fontSize: 10 }]}>기록 기간: 1~6개월 차 (180일간의 발자취)</Text>
            <Text style={[styles.colophonText, isFull && { fontSize: 10 }]}>발행처: FamLink Family Press (POD Standard)</Text>
            <Text style={[styles.colophonText, isFull && { fontSize: 10 }]}>판형: 150 × 150mm 코지 스퀘어 32P / 랑데뷰 160g 양장</Text>
          </View>
          <Text style={styles.pageNumberFootnote}>- {currentSpread.rightPage} -</Text>
        </View>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        {currentLayout === 'wide' ? (
          <View style={styles.multiSlotContainer}>
            <TouchableOpacity
              style={styles.halfSlotTop}
              onPress={() => handleOpenPhotoPicker(1)}
              activeOpacity={0.85}
            >
              {currentPhotos[1] ? (
                <Image source={{ uri: currentPhotos[1] }} style={styles.slotImageFull} resizeMode="cover" />
              ) : (
                <View style={styles.emptySlotPlaceholder}><Camera size={18} color="#A8A29E" /></View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.halfSlotBottom}
              onPress={() => handleOpenPhotoPicker(2)}
              activeOpacity={0.85}
            >
              {currentPhotos[2] ? (
                <Image source={{ uri: currentPhotos[2] }} style={styles.slotImageFull} resizeMode="cover" />
              ) : (
                <View style={styles.emptySlotPlaceholder}><Camera size={18} color="#A8A29E" /></View>
              )}
            </TouchableOpacity>
          </View>
        ) : currentLayout === 'grid' ? (
          <View style={styles.gridSlotContainer}>
            {[1, 2, 3, 4].map(idx => (
              <TouchableOpacity
                key={idx}
                style={styles.gridQuarterSlot}
                onPress={() => handleOpenPhotoPicker(idx)}
                activeOpacity={0.85}
              >
                {currentPhotos[idx] ? (
                  <Image source={{ uri: currentPhotos[idx] }} style={styles.slotImageFull} resizeMode="cover" />
                ) : (
                  <View style={styles.emptySlotPlaceholder}><Camera size={15} color="#A8A29E" /></View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.photoCanvasSlot}
            onPress={() => handleOpenPhotoPicker(1)}
            activeOpacity={0.85}
          >
            {currentPhotos[1] ? (
              <Image source={{ uri: currentPhotos[1] }} style={styles.slotImageFull} resizeMode="cover" />
            ) : (
              <View style={styles.emptySlotPlaceholder}>
                <Camera size={26} color="#A8A29E" />
                <Text style={[styles.emptySlotText, isSmallScreen && { fontSize: 10 }]}>터치하여 사진 교체</Text>
              </View>
            )}
            <View style={styles.slotEditBadge}>
              <Text style={styles.slotEditBadgeText}>P.{currentSpread.rightPage} 📸</Text>
            </View>
          </TouchableOpacity>
        )}

        {spreadCaptions[currentSpreadIndex] ? (
          <View style={styles.captionRibbon}>
            <Text style={[styles.captionRibbonText, isSmallScreen && { fontSize: 9 }, isFull && { fontSize: 11 }]}>
              "{spreadCaptions[currentSpreadIndex]}"
            </Text>
          </View>
        ) : null}

        <Text style={styles.pageNumberFootnote}>- {currentSpread.rightPage} -</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* ========================================================= */}
      {/* 1. 슬림 스튜디오 헤더 (Slim Header)                         */}
      {/* ========================================================= */}
      <View style={styles.slimTopHeader}>
        <View style={styles.slimHeaderLeft}>
          <Text style={styles.slimHeaderTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
            스토리북
          </Text>
          <View style={styles.slimHeaderSpecBadge}>
            <Text style={styles.slimHeaderSpecText}>15×15 스퀘어</Text>
          </View>
        </View>

        <View style={styles.slimHeaderRight}>
          <TouchableOpacity
            style={styles.slimFlipBtn}
            onPress={() => setFlipbookModalVisible(true)}
            activeOpacity={0.85}
          >
            <BookOpen size={12} color="#1C1917" strokeWidth={2.2} />
            <Text style={styles.slimFlipBtnText}>3D 보기</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.slimOrderBtn}
            onPress={() => setOrderModalVisible(true)}
            activeOpacity={0.85}
          >
            <ShoppingBag size={12} color="#FFFFFF" strokeWidth={2.3} />
            <Text style={styles.slimOrderBtnText}>실물 주문</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ========================================================= */}
      {/* 2. 6개월 단위 누적 볼륨 칩 (Vol. 1, Vol. 2, Vol. 3)       */}
      {/* ========================================================= */}
      <View style={styles.volumeChipsRow}>
        {VOLUME_OPTIONS.map(v => {
          const isSelected = selectedVolume === v.id;
          return (
            <TouchableOpacity
              key={v.id}
              style={[styles.volumeChipBtn, isSelected && styles.volumeChipBtnActive]}
              onPress={() => {
                setSelectedVolume(v.id);
                setBookTitle(`우리 가족의 ${v.label === '제1권' ? '첫 번째' : v.label === '제2권' ? '두 번째' : '세 번째'} 이야기 (${v.title})`);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.volumeChipText, isSelected && styles.volumeChipTextActive]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {v.label} ({v.period})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ========================================================= */}
      {/* 3. 뷰 모드 토글 (양면 전체 vs 1페이지 집중) & 스프레드 네비  */}
      {/* ========================================================= */}
      <View style={styles.modeAndNavRow}>
        <View style={styles.viewModeGroup}>
          <TouchableOpacity
            style={[styles.viewModeBtn, viewMode === 'dual' && styles.viewModeBtnActive]}
            onPress={() => setViewMode('dual')}
            activeOpacity={0.8}
          >
            <BookOpen size={11} color={viewMode === 'dual' ? '#FFFFFF' : '#78716C'} />
            <Text style={[styles.viewModeBtnText, viewMode === 'dual' && styles.viewModeBtnTextActive]}>양면 전체</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.viewModeBtn, viewMode === 'single' && styles.viewModeBtnActive]}
            onPress={() => setViewMode('single')}
            activeOpacity={0.8}
          >
            <Layers size={11} color={viewMode === 'single' ? '#FFFFFF' : '#78716C'} />
            <Text style={[styles.viewModeBtnText, viewMode === 'single' && styles.viewModeBtnTextActive]}>1페이지 집중</Text>
          </TouchableOpacity>
        </View>

        {/* 1페이지 집중 모드일 때 좌/우 페이지 선택 알약 버튼 */}
        {viewMode === 'single' && (
          <View style={styles.singleSidePillGroup}>
            <TouchableOpacity
              style={[styles.singleSidePill, activeSingleSide === 'left' && styles.singleSidePillActive]}
              onPress={() => setActiveSingleSide('left')}
              activeOpacity={0.8}
            >
              <Text style={[styles.singleSidePillText, activeSingleSide === 'left' && styles.singleSidePillTextActive]}>
                P.{currentSpread.leftPage} 좌
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.singleSidePill, activeSingleSide === 'right' && styles.singleSidePillActive]}
              onPress={() => setActiveSingleSide('right')}
              activeOpacity={0.8}
            >
              <Text style={[styles.singleSidePillText, activeSingleSide === 'right' && styles.singleSidePillTextActive]}>
                P.{currentSpread.rightPage} 우
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 스프레드 이전 / 다음 버튼 */}
        <View style={styles.miniNavGroup}>
          <TouchableOpacity
            style={[styles.miniArrowBtn, currentSpreadIndex === 0 && styles.miniArrowBtnDisabled]}
            disabled={currentSpreadIndex === 0}
            onPress={() => setCurrentSpreadIndex(prev => Math.max(0, prev - 1))}
            activeOpacity={0.7}
          >
            <ChevronLeft size={16} color={currentSpreadIndex === 0 ? '#A8A29E' : '#1C1917'} />
          </TouchableOpacity>
          <Text style={styles.miniSpreadBadge}>
            {currentSpreadIndex + 1}/16
          </Text>
          <TouchableOpacity
            style={[styles.miniArrowBtn, currentSpreadIndex === SPREAD_DEFINITIONS.length - 1 && styles.miniArrowBtnDisabled]}
            disabled={currentSpreadIndex === SPREAD_DEFINITIONS.length - 1}
            onPress={() => setCurrentSpreadIndex(prev => Math.min(SPREAD_DEFINITIONS.length - 1, prev + 1))}
            activeOpacity={0.7}
          >
            <ChevronRight size={16} color={currentSpreadIndex === SPREAD_DEFINITIONS.length - 1 ? '#A8A29E' : '#1C1917'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ========================================================= */}
      {/* 4. 화면 높이에 맞춘 캔버스 뷰포트 (One-Screen Fitted Canvas) */}
      {/* ========================================================= */}
      <ScrollView
        style={styles.canvasScrollView}
        contentContainerStyle={styles.canvasScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 제목 배너 */}
        <View style={styles.spreadTitleRow}>
          <Text style={styles.spreadTitleText} numberOfLines={1}>
            {currentSpread.title} (P.{currentSpread.leftPage}-{currentSpread.rightPage})
          </Text>
        </View>

        {/* 실제 캔버스 (양면 전체 or 1페이지 집중) */}
        {viewMode === 'dual' ? (
          <View style={[styles.dualPageSpreadFrame, { backgroundColor: currentTheme.bg, borderColor: currentTheme.border, height: canvasHeight }]}>
            <View style={styles.bookCenterSeam} />
            <View style={[styles.singlePageHalf, isSmallScreen && { padding: 8 }]}>
              {renderLeftPageContent(false)}
            </View>
            <View style={[styles.singlePageHalf, isSmallScreen && { padding: 8 }]}>
              {renderRightPageContent(false)}
            </View>
          </View>
        ) : (
          <View style={[styles.singlePageFullFrame, { backgroundColor: currentTheme.bg, borderColor: currentTheme.border, height: canvasHeight }]}>
            <View style={[styles.singlePageFullContent, isSmallScreen && { padding: 10 }]}>
              {activeSingleSide === 'left' ? renderLeftPageContent(true) : renderRightPageContent(true)}
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* 5. 하단 16개 스프레드 미니 썸네일 스트립 (Filmstrip)         */}
        {/* ========================================================= */}
        <View style={styles.filmstripContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filmstripScroll}>
            {SPREAD_DEFINITIONS.map((s, idx) => {
              const isSelected = idx === currentSpreadIndex;
              const icon = s.category === 'prologue' ? '📖' : s.category === 'interview' ? '💬' : s.category === 'stats' ? '📊' : s.category === 'epilogue' ? '✍️' : '📷';
              return (
                <TouchableOpacity
                  key={s.spreadIndex}
                  style={[styles.filmstripItem, isSelected && styles.filmstripItemActive]}
                  onPress={() => setCurrentSpreadIndex(idx)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.filmstripItemIcon}>{icon}</Text>
                  <Text style={[styles.filmstripItemPage, isSelected && styles.filmstripItemPageActive]}>
                    P.{s.leftPage}-{s.rightPage}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ========================================================= */}
        {/* 6. 원터치 스마트 조판 컨트롤 덱 (Action Dock)             */}
        {/* ========================================================= */}
        <View style={styles.bottomActionDock}>
          <TouchableOpacity style={styles.dockBtn} onPress={handleShuffleLayout} activeOpacity={0.8}>
            <Shuffle size={13} color="#FF6B47" style={{ marginRight: 3 }} />
            <Text style={styles.dockBtnText}>
              {currentLayout === 'single' ? '전면' : currentLayout === 'wide' ? '2분할' : '4분할'} 셔플
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dockBtn} onPress={handleGenerateAiCaption} activeOpacity={0.8}>
            <Sparkles size={13} color="#7C3AED" style={{ marginRight: 3 }} />
            <Text style={[styles.dockBtnText, { color: '#7C3AED' }]}>AI 글귀</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dockBtn} onPress={() => setAppendixModalVisible(true)} activeOpacity={0.8}>
            <BookOpen size={13} color="#3B82F6" style={{ marginRight: 3 }} />
            <Text style={[styles.dockBtnText, { color: '#3B82F6' }]}>180문답</Text>
          </TouchableOpacity>

          {/* 테마 컬러 팔레트 선택기 */}
          <View style={styles.dockThemeGroup}>
            {STUDIO_THEMES.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.dockThemeDot,
                  { backgroundColor: t.bg, borderColor: selectedThemeId === t.id ? '#FF6B47' : t.border },
                  selectedThemeId === t.id && styles.dockThemeDotActive,
                ]}
                onPress={() => setSelectedThemeId(t.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.dockThemeInnerDot, { backgroundColor: t.accent }]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

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
      {/* 5. 3D 전체 플립북 모달 (Flipbook Simulation)                */}
      {/* ========================================================= */}
      <Modal visible={flipbookModalVisible} animationType="slide">
        <View style={styles.flipbookContainer}>
          <View style={styles.flipbookHeader}>
            <TouchableOpacity onPress={() => setFlipbookModalVisible(false)} style={styles.flipCloseBtn}>
              <X size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.flipbookHeaderTitle}>32P 양장 플립북 전체 넘겨보기</Text>
            <TouchableOpacity
              style={styles.flipbookOrderBtn}
              onPress={() => {
                setFlipbookModalVisible(false);
                setOrderModalVisible(true);
              }}
            >
              <Text style={styles.flipbookOrderBtnText}>실물 주문</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.flipbookBody}>
            <Text style={styles.flipbookSpineText}>📖 {bookTitle} (32P 완권 프리뷰)</Text>
            <View style={[styles.flipbookCard, { backgroundColor: currentTheme.bg }]}>
              <Text style={[styles.flipbookMockTitle, { color: currentTheme.text }]}>
                SPREAD {currentSpreadIndex + 1}
              </Text>
              <Text style={[styles.flipbookMockSub, { color: currentTheme.accent }]}>
                {currentSpread.title} (P.{currentSpread.leftPage} - P.{currentSpread.rightPage})
              </Text>
              <View style={styles.flipbookPreviewPhotos}>
                {currentPhotos.slice(0, 2).map((uri, idx) => (
                  <Image key={idx} source={{ uri }} style={styles.flipbookThumb} resizeMode="cover" />
                ))}
              </View>
            </View>

            <View style={styles.flipbookPagination}>
              <TouchableOpacity
                style={styles.flipNavBtn}
                onPress={() => setCurrentSpreadIndex(prev => Math.max(0, prev - 1))}
              >
                <ChevronLeft size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.flipNavText}>{currentSpreadIndex + 1} / 16</Text>
              <TouchableOpacity
                style={styles.flipNavBtn}
                onPress={() => setCurrentSpreadIndex(prev => Math.min(15, prev + 1))}
              >
                <ChevronRight size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
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
  slimHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
    marginRight: 6,
  },
  slimHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1917',
    flexShrink: 1,
  },
  slimHeaderSpecBadge: {
    backgroundColor: '#FFF5F2',
    borderWidth: 1,
    borderColor: '#FFE8E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    flexShrink: 0,
  },
  slimHeaderSpecText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FF6B47',
  },
  slimHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
  },
  slimFlipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  slimFlipBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#1C1917',
    marginLeft: 3,
  },
  slimOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B47',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: '#FF6B47',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  slimOrderBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 3,
  },

  // 2. 볼륨 칩스
  volumeChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 4,
    gap: 5,
    backgroundColor: '#FAF8F3',
  },
  volumeChipBtn: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F5F0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeChipBtnActive: {
    backgroundColor: '#FFF5F2',
    borderColor: '#FF6B47',
  },
  volumeChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78716C',
  },
  volumeChipTextActive: {
    color: '#FF6B47',
    fontWeight: '800',
  },

  // 3. 뷰 모드 및 스프레드 네비
  modeAndNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 4,
    backgroundColor: '#FAF8F3',
  },
  viewModeGroup: {
    flexDirection: 'row',
    backgroundColor: '#F5F0E8',
    borderRadius: 9,
    padding: 2,
  },
  viewModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  viewModeBtnActive: {
    backgroundColor: '#FF6B47',
  },
  viewModeBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#78716C',
    marginLeft: 3,
  },
  viewModeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  singleSidePillGroup: {
    flexDirection: 'row',
    backgroundColor: '#F5F0E8',
    borderRadius: 9,
    padding: 2,
  },
  singleSidePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  singleSidePillActive: {
    backgroundColor: '#1C1917',
  },
  singleSidePillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#78716C',
  },
  singleSidePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  miniNavGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F5F0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniArrowBtnDisabled: {
    opacity: 0.35,
  },
  miniSpreadBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1C1917',
    paddingHorizontal: 4,
  },

  // 4. 캔버스 영역
  canvasScrollView: {
    flex: 1,
  },
  canvasScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  spreadTitleRow: {
    alignItems: 'center',
    marginBottom: 6,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F5F0E8',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 5,
    gap: 4,
  },
  dockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: '#FAF8F3',
  },
  dockBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1C1917',
  },
  dockThemeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dockThemeDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockThemeDotActive: {
    borderWidth: 2,
  },
  dockThemeInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
  flipbookContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  flipbookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
  },
  flipCloseBtn: {
    padding: 6,
  },
  flipbookHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  flipbookOrderBtn: {
    backgroundColor: '#FF6B47',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  flipbookOrderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  flipbookBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  flipbookSpineText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 16,
  },
  flipbookCard: {
    width: '100%',
    height: 360,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  flipbookMockTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
  },
  flipbookMockSub: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 20,
  },
  flipbookPreviewPhotos: {
    flexDirection: 'row',
    gap: 12,
  },
  flipbookThumb: {
    width: 110,
    height: 110,
    borderRadius: 12,
  },
  flipbookPagination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 24,
  },
  flipNavBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipNavText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
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
