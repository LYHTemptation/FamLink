import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
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
  RotateCcw,
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
  Wand2,
  MessageSquare,
  Search,
  Plus,
  Users,
  Wifi,
  QrCode,
  Smartphone,
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { colors, typography, commonStyles } from '../theme';
import UserAvatar from './UserAvatar';
import { stripEmojis } from '../utils/topics';
import { AI_SYSTEM_PROMPTS, buildGeminiPayload } from '../lib/aiSystemPrompts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 4대 프리미엄 양장 하드커버 텍스처 테마
export const STUDIO_THEMES = [
  { id: 'linen', name: '내추럴 린넨', bg: '#FAF6F0', text: '#2D2926', accent: '#8C7355', border: '#E6DCB8' },
  { id: 'coral', name: '포근한 코랄', bg: '#FFF5F2', text: '#1C1917', accent: '#FF6B47', border: '#FFE8E0' },
  { id: 'navy', name: '클래식 네이비', bg: '#0F172A', text: '#F8FAFC', accent: '#60A5FA', border: '#1E293B' },
  { id: 'olive', name: '빈티지 올리브', bg: '#F4F6F0', text: '#1C1917', accent: '#5B7052', border: '#DCE4D6' },
];

// 볼륨 선택 옵션 (가족 연대기)
export const VOLUME_OPTIONS = [
  { id: 'vol-1', title: 'Vol. 1', label: '제1권', period: '180일의 기록', desc: '우리 가족 첫 번째 이야기' },
  { id: 'vol-2', title: 'Vol. 2', label: '제2권', period: '360일의 기록', desc: '우리 가족 두 번째 이야기' },
  { id: 'vol-3', title: 'Vol. 3', label: '제3권', period: '540일의 기록', desc: '우리 가족 세 번째 이야기' },
];

export const TOTAL_PHOTOBOOK_PAGES = 16;
export const TOTAL_PHOTOBOOK_SPREADS = 8;

/**
 * 16페이지 (8 양면 스프레드) 구성 명세
 * 150×210mm A5 세로형 (6×8인치) 클래식 양장 단행본
 */
const SPREAD_DEFINITIONS = [
  { spreadIndex: 0, leftPage: 1, rightPage: 2, category: 'prologue', title: '프롤로그 & 가족 대표 화보' },
  { spreadIndex: 1, leftPage: 3, rightPage: 4, category: 'interview', title: '설레는 첫 속마음 인터뷰', monthIndex: 0 },
  { spreadIndex: 2, leftPage: 5, rightPage: 6, category: 'interview', title: '우리 가족 식탁 인터뷰', monthIndex: 1 },
  { spreadIndex: 3, leftPage: 7, rightPage: 8, category: 'interview', title: '따스한 일상 인터뷰', monthIndex: 2 },
  { spreadIndex: 4, leftPage: 9, rightPage: 10, category: 'interview', title: '소소한 위로와 응원 인터뷰', monthIndex: 3 },
  { spreadIndex: 5, leftPage: 11, rightPage: 12, category: 'interview', title: '감사와 사랑의 고백 인터뷰', monthIndex: 4 },
  { spreadIndex: 6, leftPage: 13, rightPage: 14, category: 'interview', title: '180일 추억 정리 인터뷰', monthIndex: 5 },
  { spreadIndex: 7, leftPage: 15, rightPage: 16, category: 'epilogue', title: '180일 온기 리포트 & 에필로그 판권지' },
];

export default function PhotobookStudioScreen({
  currentUser,
  familyMembers = [],
  messages = [],
  smallTalkState,
  currentUserProfile,
  points = 0,
  smallTalkArchiveList = [],
  onDeductPoints,
  onSendOrderNotice,
  petCharacter,
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
    if (sDef.category === 'prologue') {
      return side === 'left' ? 'smalltalk' : 'photo';
    }
    if (sDef.category === 'epilogue') {
      return 'smalltalk'; // P.15는 온기 통계 리포트, P.16은 에필로그
    }
    return 'photo';
  };

  // 2. 도서 기본 정보 & 겉표지 커스텀 상태
  const [bookTitle, setBookTitle] = useState('우리 가족의 첫 번째 이야기 (Vol. 1)');
  const [bookSubtitle, setBookSubtitle] = useState('사소한 일상이 모여 만든 가장 눈부신 기적');
  const [coverPhoto, setCoverPhoto] = useState(null); // 커스텀 겉표지 대표 사진
  const [coverStyle, setCoverStyle] = useState('classic'); // 'classic' (액자형) | 'full' (화보형) | 'minimal' (감성 타이포)
  const [editTitleModalVisible, setEditTitleModalVisible] = useState(false);
  const [tempTitle, setTempTitle] = useState(bookTitle);
  const [tempSubtitle, setTempSubtitle] = useState(bookSubtitle);

  // 3. 15×21cm A5 세로형 단행본 1:1 낱장 포커스 페이징 체계 (0: 겉표지, 1..16: P.1~P.16)
  const [currentPageNum, setCurrentPageNum] = useState(0); // 0 = 겉표지, 1~16 = P.1 ~ P.16
  const isEditingCover = currentPageNum === 0;
  const currentSpreadIndex = currentPageNum > 0 ? Math.floor((currentPageNum - 1) / 2) : 0;
  const activeSingleSide = currentPageNum > 0 ? (currentPageNum % 2 === 1 ? 'left' : 'right') : 'left';

  // 레이아웃 모드 가로 페이징 스크롤 레퍼런스 및 낱장 이동 핸들러
  const pageScrollRef = useRef(null);
  const isProgrammaticScrollRef = useRef(false);
  const programmaticScrollTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (programmaticScrollTimerRef.current) {
        clearTimeout(programmaticScrollTimerRef.current);
      }
    };
  }, []);

  // 겉표지(0) + P.1 ~ P.16 총 17페이지 명세 리스트
  const PAGES_LIST = useMemo(() => {
    const list = [{ pageNum: 0, isCover: true, label: '겉표지' }];
    for (let i = 1; i <= TOTAL_PHOTOBOOK_PAGES; i++) {
      const sIdx = Math.floor((i - 1) / 2);
      const side = i % 2 === 1 ? 'left' : 'right';
      const sDef = SPREAD_DEFINITIONS[sIdx] || SPREAD_DEFINITIONS[0];
      list.push({
        pageNum: i,
        isCover: false,
        sIdx,
        side,
        sDef,
        label: `P.${i}`,
      });
    }
    return list;
  }, []);

  const handlePageScroll = useCallback((e) => {
    // 버튼 탭 이동 애니메이션 중에는 onScroll의 중간 좌표 계산을 무시하여 글자 및 UI 깜빡임 방지
    if (isProgrammaticScrollRef.current) return;

    const { contentOffset, layoutMeasurement } = e.nativeEvent;
    const pageW = layoutMeasurement?.width || windowWidth || Dimensions.get('window').width;
    if (pageW > 0) {
      const newPage = Math.round(contentOffset.x / pageW);
      if (newPage >= 0 && newPage <= TOTAL_PHOTOBOOK_PAGES) {
        setCurrentPageNum(prev => (prev !== newPage ? newPage : prev));
      }
    }
  }, [windowWidth]);

  const handleMomentumScrollEnd = useCallback((e) => {
    isProgrammaticScrollRef.current = false;
    if (programmaticScrollTimerRef.current) {
      clearTimeout(programmaticScrollTimerRef.current);
    }
    const { contentOffset, layoutMeasurement } = e.nativeEvent;
    const pageW = layoutMeasurement?.width || windowWidth || Dimensions.get('window').width;
    if (pageW > 0) {
      const newPage = Math.round(contentOffset.x / pageW);
      if (newPage >= 0 && newPage <= TOTAL_PHOTOBOOK_PAGES) {
        setCurrentPageNum(prev => (prev !== newPage ? newPage : prev));
      }
    }
  }, [windowWidth]);

  const handleGoToPage = (pNum) => {
    const target = Math.max(0, Math.min(TOTAL_PHOTOBOOK_PAGES, pNum));
    setCurrentPageNum(target);

    // 버튼 클릭 시 프로그래밍 스크롤 가드 활성화 (애니메이션 도중 이전 페이지로 튕기거나 깜빡이는 현상 방지)
    isProgrammaticScrollRef.current = true;
    if (programmaticScrollTimerRef.current) {
      clearTimeout(programmaticScrollTimerRef.current);
    }
    programmaticScrollTimerRef.current = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 450);

    const winW = windowWidth || Dimensions.get('window').width;
    pageScrollRef.current?.scrollTo({ x: target * winW, animated: true });
  };

  const handleGoToSpread = (sIdx) => {
    const targetPage = sIdx * 2 + 1;
    handleGoToPage(targetPage);
  };

  const handleGoToCover = () => {
    handleGoToPage(0);
  };

  // 5. 스튜디오 뷰 형식: 'layout' (15×21cm A5 세로형 1:1 조판 편집) | 'scroll' (16P 연속 피드 감상)
  const [studioViewMode, setStudioViewMode] = useState('layout'); // 'layout' | 'scroll'

  // 6. 실물 책 1:1 전체화면 감상 뷰어 (Full-screen Book Reader) 상태
  const [fullViewerVisible, setFullViewerVisible] = useState(false);
  const [viewerPageNum, setViewerPageNum] = useState(0); // 0 = 겉표지, 1..16 = 내지
  const viewerScrollRef = useRef(null);

  const handleOpenFullViewer = (pNum = currentPageNum) => {
    const target = Math.max(0, Math.min(TOTAL_PHOTOBOOK_PAGES, pNum));
    setViewerPageNum(target);
    setFullViewerVisible(true);
    setTimeout(() => {
      const winW = windowWidth || Dimensions.get('window').width;
      viewerScrollRef.current?.scrollTo({ x: target * winW, animated: false });
    }, 60);
  };

  const handleGoToViewerPage = (pNum) => {
    const target = Math.max(0, Math.min(TOTAL_PHOTOBOOK_PAGES, pNum));
    setViewerPageNum(target);
    const winW = windowWidth || Dimensions.get('window').width;
    viewerScrollRef.current?.scrollTo({ x: target * winW, animated: true });
  };

  // 150×210mm A5 세로형 (1:1.4 비율) 캔버스 규격
  const currentScreenWidth = windowWidth || Dimensions.get('window').width || SCREEN_WIDTH;
  const currentScreenHeight = windowHeight || Dimensions.get('window').height || 750;
  // A5 세로형: 가로폭 270~310, 세로 높이는 가로폭의 1.4배
  const maxCanvasH = Math.max(340, Math.min(430, currentScreenHeight - 370));
  const maxCanvasW = Math.min(currentScreenWidth - 40, 310);
  const a5CanvasWidth = Math.round(Math.min(maxCanvasW, maxCanvasH / 1.4));
  const a5CanvasHeight = Math.round(a5CanvasWidth * 1.4);

  // 실물 책 1:1 감상 뷰어 전용 반응형 캔버스 (화면 최대 활용 1:1.4 A5 규격)
  // 아이폰 SE 등 작은 화면에서도 세로 스크롤 없이 한 화면에 100% 쏙 들어오도록 상/하단 바 높이 및 여백 차감
  const isCompactViewerHeight = currentScreenHeight < 720;
  const viewerReservedH = Platform.OS === 'ios' ? (isCompactViewerHeight ? 120 : 155) : (isCompactViewerHeight ? 105 : 135);
  const viewerMaxH = Math.max(360, currentScreenHeight - viewerReservedH);
  const viewerMaxW = Math.min(currentScreenWidth - (isCompactViewerHeight ? 16 : 24), 460);
  const viewerCanvasWidth = Math.round(Math.min(viewerMaxW, viewerMaxH / 1.4));
  const viewerCanvasHeight = Math.round(viewerCanvasWidth * 1.4);

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

  // 4-1. 본인 기기 사진첩(갤러리)에서 직접 불러온 사진 목록
  const [customGalleryPhotos, setCustomGalleryPhotos] = useState([]);

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
  const [topicModalTab, setTopicModalTab] = useState('recommended'); // 'recommended' | 'archive'
  const [topicSearchQuery, setTopicSearchQuery] = useState('');
  const [appendixModalVisible, setAppendixModalVisible] = useState(false);
  const [customSpreadTopics, setCustomSpreadTopics] = useState({});

  // AI 프롤로그(P.1) & 에필로그(P.32) 문학 에세이 상태
  const [prologueEssay, setPrologueEssay] = useState(
    '가장 눈부신 순간은 언제나 멀리 있지 않았습니다. 함께 밥을 먹고, 사소한 농담을 주고받고, 문득 전해진 다정한 안부 속에 우리 가족의 가장 따뜻한 계절이 깃들어 있었습니다.\n\n지난 6개월간 매일 주고받은 스몰톡 문답과 카메라에 담긴 온기를 엮어, 우리들의 찬란했던 시간들을 이 한 권의 책에 고이 남깁니다.'
  );
  const [epilogueEssay, setEpilogueEssay] = useState(
    '계절은 바뀌어도 우리가 함께 나눈 사랑의 온도는 변하지 않습니다. 함께여서 눈부셨던 180일간의 발자취는 이제 우리 마음속 가장 깊은 보물이 되었습니다.\n\n다음 6개월 뒤에도 더 풍성하고 다정한 추억으로 이 자리를 채워나가길 소망하며, 서로의 든든한 버팀목이 되어준 온 가족에게 이 책을 바칩니다.'
  );
  const [aiEssayModalVisible, setAiEssayModalVisible] = useState(false);
  const [targetEssayType, setTargetEssayType] = useState('prologue'); // 'prologue' | 'epilogue'
  const [customEssayInput, setCustomEssayInput] = useState('');
  const [isGeneratingAiEssay, setIsGeneratingAiEssay] = useState(false);

  // 주문 관련 폼 상태
  const [orderName, setOrderName] = useState(currentUserProfile?.name || '');
  const [orderPhone, setOrderPhone] = useState(currentUserProfile?.phone || '');
  const [orderAddress, setOrderAddress] = useState(currentUserProfile?.address || '');
  const [orderAddCopy, setOrderAddCopy] = useState(false); // 조부모님 선물용 추가 1권 (+14,000원 특가)
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // 하이브리드 결제 토크노믹스 상태 (15×15cm 스퀘어북 정가 24,000원 중 최대 12,000P까지 1P=1원 할인 지원)
  const [usePointsDiscount, setUsePointsDiscount] = useState(true);
  const maxPointDiscount = 12000;
  const availablePointsToUse = Math.min(points || 0, maxPointDiscount);
  const appliedPoints = usePointsDiscount ? availablePointsToUse : 0;

  const basePrice = 24000;
  const addPrice = orderAddCopy ? 14000 : 0;
  const finalCashPrice = Math.max(0, basePrice - appliedPoints + addPrice);

  // =========================================================
  // 🌐 가족 간 실시간 공동 편집 및 동기화 (Supabase Realtime Sync)
  // =========================================================
  const effectiveFamilyId = currentUserProfile?.family_id || currentUserProfile?.familyCode || 'default-family';
  const currentUserName = currentUserProfile?.name || currentUser || '가족';
  const photobookChannelRef = useRef(null);
  const isApplyingRemoteRef = useRef(false);
  const [lastSyncNotice, setLastSyncNotice] = useState(null); // 다른 가족 변경 시 토스트 알림
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // 원격(다른 가족)의 변경 사항을 내 화면 상태에 실시간 주입
  const applyRemotePhotobookUpdate = useCallback((payload) => {
    if (!payload) return;
    isApplyingRemoteRef.current = true;
    try {
      if (payload.selectedVolume !== undefined) setSelectedVolume(payload.selectedVolume);
      if (payload.selectedThemeId !== undefined) setSelectedThemeId(payload.selectedThemeId);
      if (payload.bookFontFamily !== undefined) setBookFontFamily(payload.bookFontFamily);
      if (payload.bookFontSize !== undefined) setBookFontSize(payload.bookFontSize);
      if (payload.bookTitle !== undefined) setBookTitle(payload.bookTitle);
      if (payload.bookSubtitle !== undefined) setBookSubtitle(payload.bookSubtitle);
      if (payload.coverPhoto !== undefined) setCoverPhoto(payload.coverPhoto);
      if (payload.coverStyle !== undefined) setCoverStyle(payload.coverStyle);
      if (payload.pageFormats !== undefined) setPageFormats(payload.pageFormats);
      if (payload.spreadPhotos !== undefined) setSpreadPhotos(payload.spreadPhotos);
      if (payload.spreadLayouts !== undefined) setSpreadLayouts(payload.spreadLayouts);
      if (payload.spreadCaptions !== undefined) setSpreadCaptions(payload.spreadCaptions);
      if (payload.customSpreadTopics !== undefined) setCustomSpreadTopics(payload.customSpreadTopics);
      if (payload.prologueEssay !== undefined) setPrologueEssay(payload.prologueEssay);
      if (payload.epilogueEssay !== undefined) setEpilogueEssay(payload.epilogueEssay);
      if (payload.customGalleryPhotos && Array.isArray(payload.customGalleryPhotos)) {
        setCustomGalleryPhotos(prev => {
          const combined = [...payload.customGalleryPhotos, ...prev];
          return Array.from(new Set(combined));
        });
      }

      if (payload.updatedBy && payload.updatedBy !== currentUserName) {
        setLastSyncNotice(`${payload.updatedBy}님이 수정한 내용이 실시간 반영되었습니다 ✨`);
        setTimeout(() => setLastSyncNotice(null), 3500);
      }
    } finally {
      setTimeout(() => {
        isApplyingRemoteRef.current = false;
      }, 50);
    }
  }, [currentUserName]);

  // 내 화면 변경 사항을 가족 채널로 실시간 브로드캐스트 + AsyncStorage 백업
  const broadcastPhotobookChange = useCallback((updatedPartial) => {
    if (isApplyingRemoteRef.current) return;
    const fullPayload = {
      selectedVolume,
      selectedThemeId,
      bookFontFamily,
      bookFontSize,
      bookTitle,
      bookSubtitle,
      coverPhoto,
      coverStyle,
      pageFormats,
      spreadPhotos,
      spreadLayouts,
      spreadCaptions,
      customSpreadTopics,
      prologueEssay,
      epilogueEssay,
      customGalleryPhotos,
      updatedBy: currentUserName,
      updatedAt: Date.now(),
      ...updatedPartial,
    };

    // 로컬 캐시 즉시 저장
    AsyncStorage.setItem(`FAMLINK_PHOTOBOOK_SYNC_${effectiveFamilyId}`, JSON.stringify(fullPayload)).catch(() => {});

    // Supabase Realtime Broadcast 전송 (가족 기기들에 0.1초 내 실시간 전송)
    if (photobookChannelRef.current) {
      photobookChannelRef.current.send({
        type: 'broadcast',
        event: 'PHOTOBOOK_SYNC',
        payload: fullPayload,
      }).catch(() => {});
    }

    // Supabase 활동 백업 (비동기)
    if (effectiveFamilyId && effectiveFamilyId !== 'default-family') {
      supabase.from('petmong_activities').insert({
        family_id: effectiveFamilyId,
        action_type: 'PHOTOBOOK_SYNC_UPDATE',
        exp_gained: 0,
        points_awarded: 0,
      }).then(() => {}).catch(() => {});
    }
  }, [
    effectiveFamilyId,
    currentUserName,
    selectedVolume,
    selectedThemeId,
    bookFontFamily,
    bookFontSize,
    bookTitle,
    bookSubtitle,
    coverPhoto,
    coverStyle,
    pageFormats,
    spreadPhotos,
    spreadLayouts,
    spreadCaptions,
    customSpreadTopics,
    prologueEssay,
    epilogueEssay,
    customGalleryPhotos,
  ]);

  // 실시간 Supabase 채널 구독 및 초기 캐시 로드
  useEffect(() => {
    if (!effectiveFamilyId) return;

    // 1. AsyncStorage 캐시 불러오기
    AsyncStorage.getItem(`FAMLINK_PHOTOBOOK_SYNC_${effectiveFamilyId}`)
      .then(saved => {
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            applyRemotePhotobookUpdate(parsed);
          } catch (e) {}
        }
      })
      .catch(() => {});

    // 2. Supabase Realtime Broadcast 채널 연결
    const channel = supabase.channel(`family-photobook-${effectiveFamilyId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'PHOTOBOOK_SYNC' }, ({ payload }) => {
        if (payload) {
          applyRemotePhotobookUpdate(payload);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeConnected(true);
        } else {
          setIsRealtimeConnected(false);
        }
      });

    photobookChannelRef.current = channel;

    return () => {
      if (photobookChannelRef.current) {
        supabase.removeChannel(photobookChannelRef.current);
        photobookChannelRef.current = null;
      }
    };
  }, [effectiveFamilyId, applyRemotePhotobookUpdate]);

  // 단일 1:1 페이지 포맷 지정 핸들러 (실시간 브로드캐스트 연동)
  const handleSetPageFormat = (newFormat, targetPage = currentPageNum) => {
    if (targetPage <= 0) return;
    const sIdx = Math.floor((targetPage - 1) / 2);
    const side = targetPage % 2 === 1 ? 'left' : 'right';
    const key = `${sIdx}_${side}`;
    const nextFormats = { ...pageFormats, [key]: newFormat };
    setPageFormats(nextFormats);
    broadcastPhotobookChange({ pageFormats: nextFormats });
  };

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

  // 최종 겉표지 대표 사진 (사용자 지정 coverPhoto 우선, 없을 시 첫 번째 가족 사진)
  const effectiveCoverPhoto = useMemo(() => {
    if (coverPhoto) return coverPhoto;
    if (chatPhotos && chatPhotos.length > 0) return chatPhotos[0]?.uri;
    return null;
  }, [coverPhoto, chatPhotos]);

  // 활성 가족 멤버 목록 (실제 연동 데이터, 없으면 현재 로그인 사용자 단일 구성)
  const activeFamilyList = useMemo(() => {
    if (familyMembers && familyMembers.length > 0) return familyMembers;
    if (currentUserProfile) {
      return [{
        id: currentUserProfile.id || 'me',
        name: currentUserProfile.name || (typeof currentUser === 'string' ? currentUser : '나'),
        role: currentUserProfile.role || '본인',
        avatar: currentUserProfile.avatar || '😊',
      }];
    }
    return [];
  }, [familyMembers, currentUserProfile, currentUser]);

  // 16P 테마별 3대 대표 인터뷰 질문 세트 (1페이지에 3개씩 수록)
  const MONTHLY_INTERVIEW_TOPICS = useMemo(() => [
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
  ], []);

  // 임의의 스프레드 번호에 할당된 3개 인터뷰 질문 및 실제 가족 답변 매칭 헬퍼
  const getSpreadInterviewTopics = (sIdx) => {
    const custom = customSpreadTopics[sIdx];
    if (custom && custom.length > 0) return custom;
    const sDef = SPREAD_DEFINITIONS[sIdx] || SPREAD_DEFINITIONS[0];
    const mIdx = sDef.monthIndex !== undefined ? sDef.monthIndex : 0;
    const monthSet = MONTHLY_INTERVIEW_TOPICS[mIdx % MONTHLY_INTERVIEW_TOPICS.length];

    // smallTalkArchiveList에서 일치하는 실제 가족 답변 바인딩
    const enrichedMonthSet = monthSet.map(item => {
      const cleanTopic = stripEmojis(item.topic);
      const matchedArchive = (smallTalkArchiveList || []).find(a => stripEmojis(a.topic) === cleanTopic);
      if (matchedArchive && matchedArchive.answers && matchedArchive.answers.length > 0) {
        const ansMap = {};
        matchedArchive.answers.forEach(a => {
          if (a.profileId) ansMap[a.profileId] = a.text;
          if (a.name) ansMap[a.name] = a.text;
          if (a.id) ansMap[a.id] = a.text;
        });
        return { ...item, answers: ansMap };
      }
      return item;
    });

    if (smallTalkState?.topic && mIdx === 0) {
      const topicStr = stripEmojis(typeof smallTalkState.topic === 'string' ? smallTalkState.topic : (smallTalkState.topic.text || smallTalkState.topic.title || ''));
      if (topicStr) {
        return [
          { id: 'today', date: '오늘의 질문 🌟', topic: topicStr, answers: smallTalkState.responses || {} },
          enrichedMonthSet[1],
          enrichedMonthSet[2],
        ];
      }
    }
    return enrichedMonthSet;
  };

  // 현재 스프레드에 수록될 3개 스몰톡 문답 목록
  const currentInterviewTopics = useMemo(() => getSpreadInterviewTopics(currentSpreadIndex), [customSpreadTopics, currentSpreadIndex, currentSpread, smallTalkState, MONTHLY_INTERVIEW_TOPICS, smallTalkArchiveList]);

  // 180일 온기 발자취 실제 통계 데이터 계산
  const answeredSmallTalkCount = useMemo(() => {
    if (!smallTalkArchiveList || smallTalkArchiveList.length === 0) return 0;
    return smallTalkArchiveList.filter(item => item.isAnswered).length;
  }, [smallTalkArchiveList]);

  const realMessageCount = useMemo(() => {
    return Array.isArray(messages) ? messages.length : 0;
  }, [messages]);

  const realPhotoCount = useMemo(() => {
    return Array.isArray(chatPhotos) ? chatPhotos.length : 0;
  }, [chatPhotos]);

  const petLevelText = useMemo(() => {
    if (petCharacter && petCharacter.level) {
      return `Lv. ${petCharacter.level}`;
    }
    return 'Lv. 1';
  }, [petCharacter]);

  // 권말 부록(P.15)에 수록될 베스트 문답 하이라이트 (답변이 있는 질문 우선 2~3개)
  const bestSmallTalkList = useMemo(() => {
    if (!smallTalkArchiveList || smallTalkArchiveList.length === 0) return [];
    const answered = smallTalkArchiveList.filter(item => item.isAnswered && Array.isArray(item.answers) && item.answers.length > 0);
    if (answered.length > 0) {
      return answered.slice(0, 2);
    }
    return smallTalkArchiveList.slice(0, 2);
  }, [smallTalkArchiveList]);

  // 7. 레이아웃 셔플 핸들러 (15×15 스퀘어 4대 조판 템플릿)
  const handleShuffleLayout = () => {
    const layouts = ['single', 'wide', 'grid', 'polaroid'];
    const currentIdx = layouts.indexOf(currentLayout);
    const nextLayout = layouts[(currentIdx + 1) % layouts.length];
    setSpreadLayouts(prev => ({ ...prev, [currentSpreadIndex]: nextLayout }));
  };

  // AI 감성 글귀 프리셋 풀 (4대 감성 톤)
  const CAPTION_PRESETS = useMemo(() => ({
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
  }), []);

  // AI 프롤로그(P.1) & 에필로그(P.32) 문학 에세이 실시간 집필 (스몰톡 문답 분석)
  const handleGenerateAiEssay = async (type = targetEssayType) => {
    setIsGeneratingAiEssay(true);
    const clientApiKey = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_GEMINI_API_KEY) || '';

    // 책에 수록된 대표 스몰톡 문답 및 가족 답변 텍스트 수집 (최대 5개 추출)
    const topicSnippets = [];
    if (Array.isArray(smallTalkArchiveList) && smallTalkArchiveList.length > 0) {
      smallTalkArchiveList.slice(0, 6).forEach(item => {
        let ansStr = '';
        if (Array.isArray(item.answers)) {
          ansStr = item.answers.slice(0, 3).map(a => `${a.user_name || a.name || '가족'}: "${a.response_text || a.text || ''}"`).join(', ');
        }
        topicSnippets.push(`- 질문: "${item.topic}" ${ansStr ? `(답변: ${ansStr})` : ''}`);
      });
    } else {
      MONTHLY_INTERVIEW_TOPICS.slice(0, 3).forEach(monthSet => {
        monthSet.forEach(t => {
          topicSnippets.push(`- 질문: "${t.topic}"`);
        });
      });
    }

    const memberNames = activeFamilyList.map(m => m.name || m.role).join(', ');

    if (clientApiKey) {
      try {
        const isPrologue = type === 'prologue';
        const userPrompt = isPrologue
          ? `[가족 도서 첫 페이지 '프롤로그(여는 글)' 집필 요청]
가족 구성원: ${memberNames}
가족들이 지난 6개월간 책에 실어둔 스몰톡 문답 기록:
${topicSnippets.join('\n')}

위 가족들의 실제 대화와 답변에 담긴 따스한 추억(음식, 일상, 감사, 소망 등)을 자연스럽게 녹여내어, 포토북 첫 장(P.1)에 수록될 감동적인 서문(프롤로그)을 작성해주세요.
- 분량: 2개 단락 (약 150~220자 내외)
- 어조: 다정하고 서정적인 문학 에세이 톤
- 제목이나 군더더기 인사말 없이, 책 본문에 바로 인쇄될 수 있는 에세이 본문 문장만 출력하세요.`
          : `[가족 도서 마지막 페이지 '에필로그(맺음말 & 가족 헌사)' 집필 요청]
가족 구성원: ${memberNames}
가족들이 지난 6개월간 책에 실어둔 스몰톡 문답 기록:
${topicSnippets.join('\n')}

위 가족들의 180일간의 여정을 마무리하며, 서로를 향한 고마움과 앞으로 다가올 계절(Vol. 2)에 대한 기대를 담은 감동적인 맺음말(에필로그)을 작성해주세요.
- 분량: 2개 단락 (약 150~220자 내외)
- 어조: 뭉클하고 깊은 울림을 주는 가족 헌정 에세이 톤
- 제목이나 군더더기 인사말 없이, 책 본문에 바로 인쇄될 수 있는 에세이 본문 문장만 출력하세요.`;

        const payload = buildGeminiPayload(
          AI_SYSTEM_PROMPTS.FAMILY_STORY_AUTHOR,
          userPrompt,
          { generationConfig: { temperature: 0.85, maxOutputTokens: 300 } }
        );

        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${clientApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );

        if (resp.ok) {
          const data = await resp.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()?.replace(/^["'“”]/g, '')?.replace(/["'“”]$/g, '');
          if (text) {
            setCustomEssayInput(text);
            setIsGeneratingAiEssay(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Gemini essay generation error:', err);
      }
    }

    // Fallback: 정성스러운 프리셋 문장
    if (type === 'prologue') {
      setCustomEssayInput(
        `가장 눈부신 순간은 언제나 멀리 있지 않았습니다. 함께 밥을 먹고, 사소한 농담을 주고받고, 문득 전해진 다정한 안부 속에 ${memberNames} 우리 가족의 가장 따뜻한 계절이 깃들어 있었습니다.\n\n지난 6개월간 매일 주고받은 스몰톡 문답과 카메라에 담긴 온기를 엮어, 우리들의 찬란했던 시간들을 이 한 권의 책에 고이 남깁니다.`
      );
    } else {
      setCustomEssayInput(
        `계절은 바뀌어도 우리가 함께 나눈 사랑의 온도는 변하지 않습니다. ${memberNames} 함께여서 눈부셨던 180일간의 발자취는 이제 우리 마음속 가장 깊은 보물이 되었습니다.\n\n다음 6개월 뒤에도 더 풍성하고 다정한 추억으로 이 자리를 채워나가길 소망하며, 서로의 든든한 버팀목이 되어준 온 가족에게 이 책을 바칩니다.`
      );
    }
    setIsGeneratingAiEssay(false);
  };

  const handleOpenAiEssayModal = (type) => {
    setTargetEssayType(type);
    if (type === 'prologue') {
      setCustomEssayInput(prologueEssay);
    } else {
      setCustomEssayInput(epilogueEssay);
    }
    setAiEssayModalVisible(true);
  };

  const handleApplyAiEssay = (textToApply) => {
    const finalTxt = textToApply !== undefined ? textToApply : customEssayInput;
    if (targetEssayType === 'prologue') {
      setPrologueEssay(finalTxt);
      broadcastPhotobookChange({ prologueEssay: finalTxt });
    } else {
      setEpilogueEssay(finalTxt);
      broadcastPhotobookChange({ epilogueEssay: finalTxt });
    }
    setAiEssayModalVisible(false);
    Alert.alert(
      targetEssayType === 'prologue' ? '프롤로그 반영 완료 📖' : '에필로그 반영 완료 📖',
      '가족 스몰톡을 담은 AI 글귀가 실시간으로 가족 도서에 수록되었습니다!'
    );
  };

  // 9. 사진 선택 슬롯 열기
  const handleOpenPhotoPicker = (slotIdx) => {
    setActivePhotoSlotIndex(slotIdx);
    setPhotoPickerVisible(true);
  };

  const handleSelectPhoto = (photoUri) => {
    if (activePhotoSlotIndex === 'cover') {
      setCoverPhoto(photoUri);
      setPhotoPickerVisible(false);
      broadcastPhotobookChange({ coverPhoto: photoUri });
      return;
    }
    const currentPhotos = getSpreadPhotos(currentSpreadIndex);
    const updated = [...(spreadPhotos[currentSpreadIndex] || currentPhotos)];
    updated[activePhotoSlotIndex] = photoUri;
    const nextSpreadPhotos = { ...spreadPhotos, [currentSpreadIndex]: updated };
    setSpreadPhotos(nextSpreadPhotos);
    setPhotoPickerVisible(false);
    broadcastPhotobookChange({ spreadPhotos: nextSpreadPhotos });
  };

  // 9-1. 본인 기기 사진첩(갤러리)에서 직접 사진 불러오기
  const handlePickFromDeviceGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '포토북에 사진을 수록하려면 사진첩(갤러리) 접근 권한이 필요합니다.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedUri = result.assets[0].uri;
        const nextList = [pickedUri, ...customGalleryPhotos.filter(u => u !== pickedUri)];
        setCustomGalleryPhotos(nextList);
        handleSelectPhoto(pickedUri);
        broadcastPhotobookChange({ customGalleryPhotos: nextList });
      }
    } catch (err) {
      console.warn('사진첩 선택 오류:', err);
      Alert.alert('오류', '사진첩에서 사진을 가져오는 중 오류가 발생했습니다.');
    }
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
        `[${bookTitle}] 총 ${orderAddCopy ? '2권 (선물용 1권 포함)' : '1권'}이 인쇄 제작에 들어갑니다.\n\n• 가족 포인트: -${appliedPoints.toLocaleString()} P 할인 적용\n• 최종 결제액: ${finalCashPrice.toLocaleString()}원\n• 정밀 POD 인쇄 (150×210mm A5 클래식 16P 랑데뷰 160g 양장본)\n• 예상 배송일: 영업일 기준 3~4일 이내`,
        [{ text: '확인' }]
      );
    }, 1200);
  };

  // =========================================================
  // 📘 겉표지 렌더러 (3대 표지 스타일: classic, full, minimal)
  // =========================================================
  const renderCoverPage = (isFull = false, isViewer = false) => {
    return (
      <View style={[styles.coverPageContent, { backgroundColor: currentTheme.bg }]}>
        {/* 책등 스파인 효과 라인 */}
        <View style={[styles.coverSpineBand, { backgroundColor: currentTheme.accent }]} />

        <View style={styles.coverInnerSurface}>
          {coverStyle === 'classic' && (
            <View style={styles.coverClassicContainer}>
              <View style={styles.coverEmbossFrame}>
                <Text style={[styles.coverKickerBadge, { color: currentTheme.accent, ...fontStyle }]}>
                  FAMLINK FAMILY STORYBOOK · 150×210MM A5
                </Text>
                <Text
                  style={[styles.coverMainTitle, { color: currentTheme.text, ...fontStyle, fontSize: Math.round((isViewer ? 20 : isFull ? 17 : 14) * fontScale) }]}
                  numberOfLines={2}
                >
                  {bookTitle}
                </Text>
                <Text
                  style={[styles.coverSubTitle, { color: currentTheme.accent, ...fontStyle, fontSize: Math.round((isViewer ? 12 : isFull ? 11 : 9.5) * fontScale) }]}
                  numberOfLines={1}
                >
                  {bookSubtitle}
                </Text>

                {/* 중앙 정방형 대표 사진 액자 */}
                <TouchableOpacity
                  style={[styles.coverPhotoFrameBox, (isViewer || isFull) && { width: isViewer ? 170 : 140, height: isViewer ? 190 : 160 }]}
                  onPress={() => !isViewer && handleOpenPhotoPicker('cover')}
                  activeOpacity={isViewer ? 1 : 0.85}
                  disabled={isViewer}
                >
                  {effectiveCoverPhoto ? (
                    <Image source={{ uri: effectiveCoverPhoto }} style={styles.coverPhotoImg} resizeMode="cover" />
                  ) : (
                    <View style={styles.coverPhotoEmptyPlaceholder}>
                      <Camera size={26} color={currentTheme.accent} />
                      <Text style={[styles.coverPhotoEmptyText, { color: currentTheme.accent }]}>표지 사진</Text>
                    </View>
                  )}
                  {!isViewer && (
                    <View style={styles.coverPhotoBadge}>
                      <Text style={styles.coverPhotoBadgeText}>대표 사진 📸</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={[styles.coverFamilySignature, { color: currentTheme.text, ...fontStyle }]}>
                  {currentUserProfile?.name || '가족'}네 따뜻한 보금자리
                </Text>
                <Text style={styles.coverHardcoverFootnote}>16P Hardcover 양장제본 · 랑데뷰 160g</Text>
              </View>
            </View>
          )}

          {coverStyle === 'full' && (
            <TouchableOpacity
              style={styles.coverFullPhotoContainer}
              onPress={() => !isViewer && handleOpenPhotoPicker('cover')}
              activeOpacity={isViewer ? 1 : 0.9}
              disabled={isViewer}
            >
              {effectiveCoverPhoto ? (
                <Image source={{ uri: effectiveCoverPhoto }} style={styles.coverPhotoImg} resizeMode="cover" />
              ) : (
                <View style={styles.coverPhotoEmptyPlaceholder}>
                  <Camera size={32} color="#A8A29E" />
                  <Text style={styles.coverPhotoEmptyText}>표지 사진</Text>
                </View>
              )}
              {/* 풀사진 위 반투명 감성 타이틀 바 */}
              <View style={styles.coverFullPhotoOverlay}>
                <Text style={[styles.coverFullTitle, { ...fontStyle, fontSize: Math.round((isViewer ? 20 : isFull ? 17 : 14) * fontScale) }]} numberOfLines={2}>
                  {bookTitle}
                </Text>
                <Text style={[styles.coverFullSub, { ...fontStyle, fontSize: Math.round((isViewer ? 12 : 10.5) * fontScale) }]} numberOfLines={1}>
                  {bookSubtitle}
                </Text>
              </View>
              {!isViewer && (
                <View style={styles.coverPhotoBadge}>
                  <Text style={styles.coverPhotoBadgeText}>풀블리드 화보형 📸</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {coverStyle === 'minimal' && (
            <View style={styles.coverMinimalContainer}>
              <View style={styles.coverMinimalCenter}>
                <Heart size={28} color={currentTheme.accent} style={{ marginBottom: 12 }} />
                <Text
                  style={[styles.coverMinimalTitle, { color: currentTheme.text, ...fontStyle, fontSize: Math.round((isViewer ? 22 : isFull ? 19 : 15) * fontScale) }]}
                  numberOfLines={2}
                >
                  {bookTitle}
                </Text>
                <View style={[styles.coverMinimalHairline, { backgroundColor: currentTheme.accent }]} />
                <Text
                  style={[styles.coverMinimalSub, { color: currentTheme.accent, ...fontStyle, fontSize: Math.round((isViewer ? 13 : isFull ? 11.5 : 10) * fontScale) }]}
                  numberOfLines={2}
                >
                  {bookSubtitle}
                </Text>
              </View>
              <Text style={[styles.coverFamilySignature, { color: currentTheme.text, ...fontStyle }]}>
                {currentUserProfile?.name || '가족'}의 이야기 · FamLink Press
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.pageNumberFootnote}>- 겉표지 (Cover) -</Text>
      </View>
    );
  };

  // =========================================================
  // 📖 통합 페이지 렌더러 (3대 포맷 & 폰트/크기 완벽 반영)
  // =========================================================
  const renderPage = (sIdx, side, isFull = false, isViewer = false) => {
    // 0. 겉표지 단면 렌더링
    if (sIdx === -1) {
      return renderCoverPage(isFull, isViewer);
    }

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
            style={[styles.bookMainHeading, { color: currentTheme.text, ...fontStyle, fontSize: Math.round((isViewer ? 20 : isFull ? 18 : 14) * fontScale), lineHeight: Math.round((isViewer ? 28 : isFull ? 24 : 18) * fontScale) }]}
            numberOfLines={2}
          >
            {bookTitle}
          </Text>
          <Text
            style={[styles.bookSubHeading, { color: currentTheme.accent, ...fontStyle, fontSize: Math.round((isViewer ? 13 : isFull ? 12 : 10) * fontScale), marginBottom: isViewer ? 14 : 8 }]}
            numberOfLines={1}
          >
            {bookSubtitle}
          </Text>

          <View style={[styles.prologueParagraphBox, isViewer && { flex: 1, justifyContent: 'center' }]}>
            <Text style={[styles.prologueBodyText, { color: currentTheme.text, ...fontStyle, fontSize: Math.round((isViewer ? 13 : isFull ? 11.5 : 9.5) * fontScale), lineHeight: Math.round((isViewer ? 22 : isFull ? 17 : 14) * fontScale) }]}>
              {prologueEssay}
            </Text>
          </View>

          {!isViewer && (
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
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

              <TouchableOpacity
                style={[styles.editTitleMiniBtn, { backgroundColor: '#FFF5F2', borderColor: '#FFD5CC' }]}
                onPress={() => handleOpenAiEssayModal('prologue')}
                activeOpacity={0.7}
              >
                <Sparkles size={11} color="#FF6B47" style={{ marginRight: 4 }} />
                <Text style={[styles.editTitleMiniBtnText, { color: '#FF6B47', fontWeight: '800' }]}>AI 프롤로그 집필</Text>
              </TouchableOpacity>
            </View>
          )}
          <Text style={styles.pageNumberFootnote}>- {pageNum} -</Text>
        </View>
      );
    }

    // 2. 특수 통계 & 180문답 리포트 페이지 (P.15)
    if (sDef.category === 'epilogue' && side === 'left' && format === 'smalltalk') {
      return (
        <View style={styles.statsPageContent}>
          <Text style={[styles.statsPageHeading, { color: currentTheme.accent, ...fontStyle }]}>180-DAY MEMORY METRICS</Text>
          <Text style={[styles.statsPageSub, { color: '#1C1917', ...fontStyle, fontSize: Math.round((isViewer ? 15 : isFull ? 13 : 11.5) * fontScale), marginBottom: isViewer ? 10 : 6 }]}>
            우리 가족의 180일 온기 발자취
          </Text>

          {/* 4대 메트릭 그리드 */}
          <View style={styles.metricGrid}>
            <View style={[styles.metricBox, isSmallScreen && { padding: 4 }, isViewer && { paddingVertical: 10 }]}>
              <Text style={[styles.metricBigNum, { color: '#FF6B47', fontSize: isViewer ? 20 : 15 }]}>{answeredSmallTalkCount}</Text>
              <Text style={[styles.metricLabel, isViewer && { fontSize: 11 }]}>스몰톡 문답</Text>
            </View>
            <View style={[styles.metricBox, isSmallScreen && { padding: 4 }, isViewer && { paddingVertical: 10 }]}>
              <Text style={[styles.metricBigNum, { color: '#3B82F6', fontSize: isViewer ? 20 : 15 }]}>{realPhotoCount}</Text>
              <Text style={[styles.metricLabel, isViewer && { fontSize: 11 }]}>함께한 사진</Text>
            </View>
            <View style={[styles.metricBox, isSmallScreen && { padding: 4 }, isViewer && { paddingVertical: 10 }]}>
              <Text style={[styles.metricBigNum, { color: '#10B981', fontSize: isViewer ? 20 : 15 }]}>{realMessageCount.toLocaleString()}</Text>
              <Text style={[styles.metricLabel, isViewer && { fontSize: 11 }]}>나눈 메시지</Text>
            </View>
            <View style={[styles.metricBox, isSmallScreen && { padding: 4 }, isViewer && { paddingVertical: 10 }]}>
              <Text style={[styles.metricBigNum, { color: '#8B5CF6', fontSize: isViewer ? 20 : 15 }]}>{petLevelText}</Text>
              <Text style={[styles.metricLabel, isViewer && { fontSize: 11 }]}>반려몽 성장</Text>
            </View>
          </View>

          {/* 올해의 베스트 문답 하이라이트 */}
          <View style={[styles.statsBestSection, isSmallScreen && { marginTop: 4, marginBottom: 4 }]}>
            <View style={styles.statsBestHeader}>
              <Award size={12} color="#FF6B47" style={{ marginRight: 4 }} />
              <Text style={styles.statsBestTitle}>가족 베스트 문답 하이라이트</Text>
            </View>
            {bestSmallTalkList.length > 0 ? (
              bestSmallTalkList.map((bItem, bIdx) => (
                <View key={bItem.id || bIdx} style={[styles.statsBestCard, isSmallScreen && { padding: 5, marginBottom: 3 }]}>
                  <Text style={styles.statsBestCardTopic} numberOfLines={1}>
                    Q. {bItem.topic}
                  </Text>
                  {Array.isArray(bItem.answers) && bItem.answers.length > 0 ? (
                    <Text style={styles.statsBestCardAnswer} numberOfLines={1}>
                      💬 {bItem.answers[0]?.text ? `"${bItem.answers[0].text}"` : `${bItem.answers.length}명의 답변`}
                    </Text>
                  ) : (
                    <Text style={[styles.statsBestCardAnswer, { color: '#A8A29E' }]} numberOfLines={1}>
                      가족의 진솔한 마음이 담긴 질문
                    </Text>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.statsBestCard}>
                <Text style={styles.statsBestCardTopic} numberOfLines={1}>
                  Q. 우리 가족에게 가장 힘이 되는 순간은?
                </Text>
                <Text style={styles.statsBestCardAnswer} numberOfLines={1}>
                  가족과 함께 따뜻한 일상을 채워보세요.
                </Text>
              </View>
            )}
          </View>

          {/* 디지털 아카이브 QR코드 연동 배너 */}
          <TouchableOpacity
            style={[styles.statsQrBanner, isSmallScreen && { padding: 6, marginVertical: 4 }]}
            onPress={() => setAppendixModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.statsQrIconBox}>
              <QrCode size={isViewer ? 20 : 16} color="#FF6B47" />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.statsQrTitle}>180문답 디지털 아카이브</Text>
              <Text style={styles.statsQrSub} numberOfLines={1}>
                스마트폰으로 스캔하여 180개 전수 문답을 언제든 열람하세요
              </Text>
            </View>
            <BookOpen size={13} color="#FF6B47" />
          </TouchableOpacity>

          <Text style={styles.pageNumberFootnote}>- {pageNum} -</Text>
        </View>
      );
    }

    // 3. 특수 에필로그 (P.16)
    if (sDef.category === 'epilogue' && side === 'right' && format === 'smalltalk') {
      return (
        <View style={styles.epiloguePageContent}>
          <Text style={[styles.chapterKicker, { color: currentTheme.accent, ...fontStyle }]}>EPILOGUE</Text>
          <Text style={[styles.epilogueTitle, { color: currentTheme.text, ...fontStyle, fontSize: Math.round((isViewer ? 18 : isFull ? 15 : 12) * fontScale) }]}>
            끝나지 않을 우리들의 이야기
          </Text>
          <Text style={[styles.epilogueBody, { color: '#44403C', ...fontStyle, fontSize: Math.round((isViewer ? 12.5 : isFull ? 11 : 9.5) * fontScale), lineHeight: Math.round((isViewer ? 20 : isFull ? 16 : 13) * fontScale) }]}>
            {epilogueEssay}
          </Text>

          {!isViewer && (
            <TouchableOpacity
              style={[styles.editTitleMiniBtn, { backgroundColor: '#FFF5F2', borderColor: '#FFD5CC', alignSelf: 'flex-start', marginVertical: 6 }]}
              onPress={() => handleOpenAiEssayModal('epilogue')}
              activeOpacity={0.7}
            >
              <Sparkles size={11} color="#FF6B47" style={{ marginRight: 4 }} />
              <Text style={[styles.editTitleMiniBtnText, { color: '#FF6B47', fontWeight: '800' }]}>AI 에필로그 집필</Text>
            </TouchableOpacity>
          )}

          <View style={styles.colophonBox}>
            <Text style={styles.colophonText}>기록 기간: 180일간의 발자취</Text>
            <Text style={styles.colophonText}>판형: 150×210mm A5 세로형 16P 하드커버 양장제본</Text>
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
                onPress={() => !isViewer && handleOpenPhotoPicker(photoSlotIndex)}
                activeOpacity={isViewer ? 1 : 0.85}
                disabled={isViewer}
              >
                {sPhotos[photoSlotIndex] ? (
                  <Image source={{ uri: sPhotos[photoSlotIndex] }} style={styles.slotImageFull} resizeMode="cover" />
                ) : (
                  <View style={styles.emptySlotPlaceholder}><Camera size={18} color="#A8A29E" /></View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.halfSlotBottom}
                onPress={() => !isViewer && handleOpenPhotoPicker(photoSlotIndex + 1)}
                activeOpacity={isViewer ? 1 : 0.85}
                disabled={isViewer}
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
              onPress={() => !isViewer && handleOpenPhotoPicker(photoSlotIndex)}
              activeOpacity={isViewer ? 1 : 0.85}
              disabled={isViewer}
            >
              {sPhotos[photoSlotIndex] ? (
                <Image source={{ uri: sPhotos[photoSlotIndex] }} style={styles.slotImageFull} resizeMode="cover" />
              ) : (
                <View style={styles.emptySlotPlaceholder}>
                  <Camera size={26} color="#A8A29E" />
                  <Text style={[styles.emptySlotText, isSmallScreen && { fontSize: 10 }]}>{isViewer ? '사진' : '터치하여 사진 교체'}</Text>
                </View>
              )}
              {!isViewer && (
                <View style={styles.slotEditBadge}>
                  <Text style={styles.slotEditBadgeText}>P.{pageNum} 📸</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          <Text style={styles.pageNumberFootnote}>- {pageNum} -</Text>
        </View>
      );
    }

    // 5. [포맷 2: 스몰톡 전용 (SmallTalk Narrative) - 150×210mm A5 세로형 27~29줄 출판 조판]
    if (format === 'smalltalk') {
      const familyCount = activeFamilyList.length;
      // 150×210mm A5 판형은 27~29줄 높이를 수용하므로 Q1, Q2, Q3 3개 질문과 온 가족(최대 5인)의 답변을 지면에 꽉 차게 조판
      const displayTopics = sTopics.slice(0, 3);
      const maxMembersPerQuestion = Math.max(3, Math.min(5, familyCount));

      // 아이폰 SE 등 컴팩트 화면 뷰어에서는 스크롤 없이 한 화면에 다 들어오도록 적응형 스케일링
      const isCompactViewer = isViewer && isCompactViewerHeight;
      const qFontSize = isCompactViewer ? 10.2 : (isViewer ? 12 : isFull ? 10 : 9.2);
      const qLineHeight = isCompactViewer ? 14 : (isViewer ? 17 : isFull ? 14.5 : 13);
      const aFontSize = isCompactViewer ? 9.2 : (isViewer ? 11 : isFull ? 9 : 8.3);
      const aLineHeight = isCompactViewer ? 13 : (isViewer ? 16 : isFull ? 13 : 11.8);
      const articlePadV = isCompactViewer ? 3.5 : (isViewer ? 7 : 5);
      const articleMarginB = isCompactViewer ? 3 : (isViewer ? 8 : 6);

      return (
        <View style={styles.bookInterviewPageContainer}>
          {/* 출판 도서풍 문답 리스트 - 지면을 알차고 시원하게 채우는 문답 조판 */}
          <ScrollView
            style={styles.bookInterviewScroll}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}
            showsVerticalScrollIndicator={false}
          >
            {displayTopics.map((item, qIdx) => (
              <TouchableOpacity
                key={item.id || qIdx}
                style={[
                  styles.bookQnAArticle,
                  {
                    marginBottom: qIdx === displayTopics.length - 1 ? 1 : articleMarginB,
                    paddingVertical: articlePadV,
                    paddingHorizontal: isCompactViewer ? 5 : (isViewer ? 8 : 6),
                  },
                ]}
                onPress={() => {
                  if (!isViewer) {
                    setSelectedTopicSlot(qIdx);
                    setTopicPickerModalVisible(true);
                  }
                }}
                activeOpacity={isViewer ? 1 : 0.78}
                disabled={isViewer}
              >
                {/* 질문 타이포그래피 (도서 인터뷰 표기 + 인-플레이스 교체 뱃지) */}
                <View style={styles.bookQuestionRow}>
                  <View style={styles.bookQuestionHeaderLeft}>
                    <Text style={[styles.bookQuestionPrefix, { color: currentTheme.accent, ...fontStyle, fontSize: isCompactViewer ? 10.5 : (isViewer ? 12.5 : 10) }]}>
                      Q{qIdx + 1}.
                    </Text>
                    <Text
                      style={[
                        styles.bookQuestionSentence,
                        {
                          color: currentTheme.text,
                          ...fontStyle,
                          fontSize: Math.round(qFontSize * fontScale),
                          lineHeight: Math.round(qLineHeight * fontScale),
                        },
                      ]}
                      numberOfLines={3}
                    >
                      "{item.topic}"
                    </Text>
                  </View>
                  {!isViewer && (
                    <View style={styles.bookQnaEditBadge}>
                      <RotateCcw size={8} color="#FF6B47" style={{ marginRight: 2 }} />
                      <Text style={styles.bookQnaEditBadgeText}>교체</Text>
                    </View>
                  )}
                </View>

                {/* 가족 답변 단락 (단행본 인쇄 스타일 화자 라벨 + 본문) */}
                <View style={[styles.bookAnswersEditorialBox, isCompactViewer && { gap: 1.5, paddingTop: 2 }]}>
                  {activeFamilyList.length === 0 ? (
                    <Text style={[styles.bookAnswerQuotes, { color: '#A8A29E', ...fontStyle, fontSize: Math.round(aFontSize * fontScale), fontStyle: 'italic', paddingVertical: 4 }]}>
                      가족 구성원을 등록하여 함께 답변을 남겨보세요.
                    </Text>
                  ) : (
                    activeFamilyList.slice(0, maxMembersPerQuestion).map(m => {
                      const ansText = item.answers?.[m.id] || item.answers?.[m.profileId] || item.answers?.[m.name] || m.answer || '';
                      return (
                        <View key={m.id || m.profileId || m.name} style={[styles.bookAnswerParagraph, isViewer && { marginVertical: isCompactViewer ? 1 : 2.5 }]}>
                          <Text style={[styles.bookSpeakerLabel, { color: currentTheme.accent, ...fontStyle, fontSize: isCompactViewer ? 9.5 : (isViewer ? 11 : 9.5) }]}>
                            {m.name || m.role}
                          </Text>
                          <Text
                            style={[
                              styles.bookAnswerQuotes,
                              {
                                color: ansText ? '#292524' : '#A8A29E',
                                ...fontStyle,
                                fontSize: Math.round(aFontSize * fontScale),
                                lineHeight: Math.round(aLineHeight * fontScale),
                                fontStyle: ansText ? 'normal' : 'italic',
                              },
                            ]}
                            numberOfLines={2}
                          >
                            {ansText ? `"${ansText}"` : '아직 작성된 답변이 없습니다.'}
                          </Text>
                        </View>
                      );
                    })
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.pageNumberFootnote, isCompactViewer && { marginTop: 1, fontSize: 8.5 }]}>- {pageNum} -</Text>
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
          onPress={() => !isViewer && handleOpenPhotoPicker(photoSlotIndex)}
          activeOpacity={isViewer ? 1 : 0.85}
          disabled={isViewer}
        >
          {sPhotos[photoSlotIndex] ? (
            <Image source={{ uri: sPhotos[photoSlotIndex] }} style={styles.slotImageFull} resizeMode="cover" />
          ) : (
            <View style={styles.emptySlotPlaceholder}>
              <Camera size={22} color="#A8A29E" />
              <Text style={[styles.emptySlotText, { fontSize: 9.5 }]}>{isViewer ? '사진' : '사진 터치'}</Text>
            </View>
          )}
          {!isViewer && (
            <View style={styles.slotEditBadge}>
              <Text style={styles.slotEditBadgeText}>P.{pageNum} 📸</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* 하단 스몰톡 영역 (도서 본문 스타일 - 터치 시 질문 교체) */}
        <TouchableOpacity
          style={styles.hybridTalkBox}
          onPress={() => {
            if (!isViewer) {
              setSelectedTopicSlot(0);
              setTopicPickerModalVisible(true);
            }
          }}
          activeOpacity={isViewer ? 1 : 0.8}
          disabled={isViewer}
        >
          <View style={styles.hybridTalkHeader}>
            <Text style={[styles.hybridTopicText, { ...fontStyle, fontSize: Math.round((isViewer ? 12 : 10.5) * fontScale), color: currentTheme.text, flex: 1, marginRight: 4 }]} numberOfLines={1}>
              ❝ {coreTopic.topic} ❞
            </Text>
            {!isViewer && (
              <View style={styles.bookQnaEditBadge}>
                <RotateCcw size={7.5} color="#FF6B47" style={{ marginRight: 2 }} />
                <Text style={styles.bookQnaEditBadgeText}>교체</Text>
              </View>
            )}
          </View>
          <View style={styles.hybridAnswersList}>
            {activeFamilyList.length === 0 ? (
              <Text style={{ fontSize: 9, color: '#A8A29E', fontStyle: 'italic', paddingVertical: 2 }}>가족 구성원 답변 대기 중</Text>
            ) : (
              activeFamilyList.slice(0, 2).map(m => {
                const ans = coreTopic.answers?.[m.id] || coreTopic.answers?.[m.profileId] || coreTopic.answers?.[m.name] || m.answer || '';
                return (
                  <View key={m.id || m.profileId || m.name} style={styles.hybridAnsRow}>
                    <Text style={[styles.hybridAnsAuthor, { ...fontStyle, fontSize: Math.round((isViewer ? 10.5 : 9) * fontScale), color: currentTheme.accent }]}>
                      {m.name || m.role}
                    </Text>
                    <Text
                      style={[
                        styles.hybridAnsText,
                        {
                          ...fontStyle,
                          fontSize: Math.round((isViewer ? 10.5 : 9) * fontScale),
                          color: ans ? '#44403C' : '#A8A29E',
                          fontStyle: ans ? 'normal' : 'italic',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {ans ? `"${ans}"` : '아직 답변이 등록되지 않았습니다.'}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </TouchableOpacity>
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
            <BookOpen size={11} color={studioViewMode === 'layout' ? colors.primary : colors.text.secondary} style={{ marginRight: 3 }} />
            <Text style={[styles.headerModeTabText, studioViewMode === 'layout' && styles.headerModeTabTextActive]}>
              페이지
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerModeTab, studioViewMode === 'scroll' && styles.headerModeTabActive]}
            onPress={() => setStudioViewMode('scroll')}
            activeOpacity={0.8}
          >
            <Scroll size={11} color={studioViewMode === 'scroll' ? colors.primary : colors.text.secondary} style={{ marginRight: 3 }} />
            <Text style={[styles.headerModeTabText, studioViewMode === 'scroll' && styles.headerModeTabTextActive]}>
              스크롤
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 🌐 다른 가족이 수정했을 때만 상단에 잠시 나타나는 실시간 변경 알림 플로팅 토스트 (옵션 A) */}
      {lastSyncNotice && (
        <View style={styles.floatingSyncNoticeOverlay} pointerEvents="none">
          <View style={styles.floatingSyncNoticeCard}>
            <Sparkles size={13} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.floatingSyncNoticeText} numberOfLines={1}>{lastSyncNotice}</Text>
          </View>
        </View>
      )}

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

              {/* C. 낱장 페이지 선택 드롭다운 & 1페이지씩 넘김 화살표 */}
              <View style={styles.hudPageGroup}>
                <TouchableOpacity
                  style={[styles.hudArrowMini, currentPageNum === 0 && { opacity: 0.3 }]}
                  disabled={currentPageNum === 0}
                  onPress={() => handleGoToPage(currentPageNum - 1)}
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
                    {currentPageNum === 0 ? '📘 겉표지' : `P.${currentPageNum} / ${TOTAL_PHOTOBOOK_PAGES}P`}
                  </Text>
                  <ChevronDown size={10} color="#78716C" style={{ marginLeft: 3 }} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.hudArrowMini, currentPageNum === TOTAL_PHOTOBOOK_PAGES && { opacity: 0.3 }]}
                  disabled={currentPageNum === TOTAL_PHOTOBOOK_PAGES}
                  onPress={() => handleGoToPage(currentPageNum + 1)}
                  activeOpacity={0.7}
                >
                  <ChevronRight size={13} color="#1C1917" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>

          {/* 15×21 A5 클래식 1:1 낱장 내비게이션 바 */}
          <View style={styles.squarePageNavRow}>
            <View style={styles.singlePageNavBar}>
              <TouchableOpacity
                style={[styles.singlePageNavTab, currentPageNum === 0 && styles.singlePageNavTabActive]}
                onPress={() => handleGoToPage(0)}
                activeOpacity={0.8}
              >
                <Text style={[styles.singlePageNavTabLabel, currentPageNum === 0 && styles.singlePageNavTabLabelActive]}>
                  📘 겉표지
                </Text>
              </TouchableOpacity>

              <View style={styles.singlePageInfoCenter}>
                <Text style={styles.singlePageInfoCenterText} numberOfLines={1}>
                  {currentPageNum === 0
                    ? '하드커버 표지 편집'
                    : `P.${currentPageNum} / ${TOTAL_PHOTOBOOK_PAGES}P`}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TouchableOpacity
                  style={styles.singlePageJumpListBtn}
                  onPress={() => setPagePickerModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <BookOpen size={12} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.singlePageJumpListBtnText}>
                    목차
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.singlePageViewerJumpBtn}
                  onPress={() => handleOpenFullViewer(currentPageNum)}
                  activeOpacity={0.8}
                >
                  <Eye size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.singlePageViewerJumpBtnText}>
                    크게 보기
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ========================================================= */}
          {/* 2. 가로 스크롤 페이징 캔버스 (Swipeable Pages Canvas)     */}
          {/*    손가락 좌우 스와이프로 겉표지 + 32P 낱장 1:1 완벽 이동   */}
          {/* ========================================================= */}
          <ScrollView
            style={styles.canvasScrollView}
            contentContainerStyle={styles.canvasScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 좌우 스와이프 페이징 스크롤뷰 (겉표지 + P.1 ~ P.32 총 33페이지) - 1:1 정방형 집중 뷰 */}
            <ScrollView
              ref={pageScrollRef}
              horizontal
              pagingEnabled
              scrollEventThrottle={16}
              showsHorizontalScrollIndicator={false}
              onScroll={handlePageScroll}
              onMomentumScrollEnd={handleMomentumScrollEnd}
              onScrollEndDrag={handleMomentumScrollEnd}
              style={{ width: windowWidth || Dimensions.get('window').width }}
              contentContainerStyle={{ alignItems: 'center' }}
            >
              {PAGES_LIST.map((p) => {
                const winW = windowWidth || Dimensions.get('window').width;
                if (p.isCover) {
                  return (
                    <View key="page-cover" style={{ width: winW, alignItems: 'center', justifyContent: 'center' }}>
                      <View style={[styles.singlePageFullFrame, { backgroundColor: currentTheme.bg, borderColor: currentTheme.border, width: a5CanvasWidth, height: a5CanvasHeight, alignSelf: 'center' }]}>
                        <TouchableOpacity
                          style={styles.singlePageBadgeFloating}
                          onPress={() => handleOpenFullViewer(0)}
                          activeOpacity={0.8}
                        >
                          <BookOpen size={10} color="#FFFFFF" style={{ marginRight: 3 }} />
                          <Text style={styles.singlePageBadgeFloatingText}>📘 겉표지</Text>
                        </TouchableOpacity>
                        <View style={[styles.singlePageFullContent, isSmallScreen && { padding: 10 }]}>
                          {renderCoverPage(true)}
                        </View>
                      </View>
                    </View>
                  );
                }

                const { sIdx, side, pageNum, sDef } = p;
                return (
                  <View key={`page-${pageNum}`} style={{ width: winW, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={[styles.singlePageFullFrame, { backgroundColor: currentTheme.bg, borderColor: currentTheme.border, width: a5CanvasWidth, height: a5CanvasHeight, alignSelf: 'center' }]}>
                      {/* 1:1 상단 현재 편집 페이지 배지 - 터치 시 크게 보기 연동 */}
                      <TouchableOpacity
                        style={styles.singlePageBadgeFloating}
                        onPress={() => handleOpenFullViewer(pageNum)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.singlePageBadgeFloatingText}>
                          P.{pageNum}
                        </Text>
                      </TouchableOpacity>
                      <View style={[styles.singlePageFullContent, isSmallScreen && { padding: 10 }]}>
                        {renderPage(sIdx, side, true)}
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* ========================================================= */}
            {/* 3. 하단 콘텐츠 에디팅 덱 (겉표지 모드 vs 내지 3대 포맷)    */}
            {/* ========================================================= */}
            <View style={styles.bottomActionDock}>
              {isEditingCover ? (
                /* 📘 겉표지 전용 커스텀 덱 */
                <View style={styles.formatSegmentSection}>
                  <Text style={[styles.formatSectionLabel, { marginBottom: 8 }]}>표지 디자인 스타일:</Text>
                  <View style={styles.formatSegmentContainer}>
                    {[
                      { id: 'classic', label: '액자형', icon: Camera },
                      { id: 'full', label: '화보형', icon: Image },
                      { id: 'minimal', label: '타이포', icon: Type },
                    ].map(styleItem => {
                      const isSelected = coverStyle === styleItem.id;
                      const IconComp = styleItem.icon === Image ? Sparkles : styleItem.icon;
                      return (
                        <TouchableOpacity
                          key={styleItem.id}
                          style={[styles.formatSegmentTab, isSelected && styles.formatSegmentTabActive]}
                          onPress={() => {
                            setCoverStyle(styleItem.id);
                            broadcastPhotobookChange({ coverStyle: styleItem.id });
                          }}
                          activeOpacity={0.8}
                        >
                          <IconComp size={12} color={isSelected ? '#FF6B47' : '#78716C'} style={{ marginRight: 4 }} />
                          <Text style={[styles.formatSegmentTabText, isSelected && styles.formatSegmentTabTextActive]}>
                            {styleItem.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* 겉표지 서브 액션 버튼들 */}
                  <View style={[styles.dockSubActionRow, { marginTop: 10, marginBottom: 0 }]}>
                    <TouchableOpacity
                      style={[styles.dockSubBtn, { backgroundColor: '#FFF5F2', borderColor: '#FFD5CC' }]}
                      onPress={() => handleOpenPhotoPicker('cover')}
                      activeOpacity={0.8}
                    >
                      <Camera size={13} color="#FF6B47" style={{ marginRight: 4 }} />
                      <Text style={[styles.dockSubBtnText, { color: '#FF6B47', fontWeight: '800' }]}>
                        대표 사진 교체
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.dockSubBtn}
                      onPress={() => {
                        setTempTitle(bookTitle);
                        setTempSubtitle(bookSubtitle);
                        setEditTitleModalVisible(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Edit3 size={13} color="#1C1917" style={{ marginRight: 4 }} />
                      <Text style={styles.dockSubBtnText}>제목/부제 편집</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.dockSubBtn, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
                      onPress={() => handleGoToPage(1)}
                      activeOpacity={0.8}
                    >
                      <BookOpen size={13} color="#16A34A" style={{ marginRight: 4 }} />
                      <Text style={[styles.dockSubBtnText, { color: '#16A34A', fontWeight: '800' }]}>
                        내지 보기 (P.1)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* 내지 3대 포맷 선택 세그먼트 섹션 */
                <>
                  <View style={styles.formatSegmentSection}>
                    {/* 현재 편집 중인 1:1 낱장 페이지 표시 & 3대 포맷 선택 탭 바 */}
                    <View style={styles.formatSegmentHeaderRow}>
                      <View style={styles.formatCurrentPageBadge}>
                        <Text style={styles.formatCurrentPageBadgeText}>
                          P.{currentPageNum} 편집 중
                        </Text>
                      </View>
                      <Text style={styles.formatSectionLabel}>레이아웃 포맷 변경</Text>
                    </View>

                    <View style={styles.formatSegmentRow}>
                      <View style={styles.formatSegmentContainer}>
                        <TouchableOpacity
                          style={[styles.formatSegmentTab, getPageFormat(currentSpreadIndex, activeSingleSide) === 'photo' && styles.formatSegmentTabActive]}
                          onPress={() => handleSetPageFormat('photo', currentPageNum)}
                          activeOpacity={0.8}
                        >
                          <Camera size={12} color={getPageFormat(currentSpreadIndex, activeSingleSide) === 'photo' ? '#FF6B47' : '#78716C'} style={{ marginRight: 3 }} />
                          <Text style={[styles.formatSegmentTabText, getPageFormat(currentSpreadIndex, activeSingleSide) === 'photo' && styles.formatSegmentTabTextActive]}>
                            포맷1 (사진)
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.formatSegmentTab, getPageFormat(currentSpreadIndex, activeSingleSide) === 'smalltalk' && styles.formatSegmentTabActive]}
                          onPress={() => handleSetPageFormat('smalltalk', currentPageNum)}
                          activeOpacity={0.8}
                        >
                          <FileText size={12} color={getPageFormat(currentSpreadIndex, activeSingleSide) === 'smalltalk' ? '#FF6B47' : '#78716C'} style={{ marginRight: 3 }} />
                          <Text style={[styles.formatSegmentTabText, getPageFormat(currentSpreadIndex, activeSingleSide) === 'smalltalk' && styles.formatSegmentTabTextActive]}>
                            포맷2 (스몰톡)
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.formatSegmentTab, getPageFormat(currentSpreadIndex, activeSingleSide) === 'hybrid' && styles.formatSegmentTabActive]}
                          onPress={() => handleSetPageFormat('hybrid', currentPageNum)}
                          activeOpacity={0.8}
                        >
                          <Sparkles size={12} color={getPageFormat(currentSpreadIndex, activeSingleSide) === 'hybrid' ? '#FF6B47' : '#78716C'} style={{ marginRight: 3 }} />
                          <Text style={[styles.formatSegmentTabText, getPageFormat(currentSpreadIndex, activeSingleSide) === 'hybrid' && styles.formatSegmentTabTextActive]}>
                            포맷3 (사진+톡)
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* 보조 에디팅 버튼들: 현재 페이지 포맷에 맞춰 맥락형 도크 제공 */}
                  <View style={styles.dockSubActionRow}>
                    {getPageFormat(currentSpreadIndex, activeSingleSide) === 'smalltalk' ? (
                      <>
                        <TouchableOpacity
                          style={[styles.dockSubBtn, { backgroundColor: '#FFF5F2', borderColor: '#FFD5CC' }]}
                          onPress={() => {
                            setSelectedTopicSlot(0);
                            setTopicPickerModalVisible(true);
                          }}
                          activeOpacity={0.8}
                        >
                          <Shuffle size={12} color="#FF6B47" style={{ marginRight: 4 }} />
                          <Text style={[styles.dockSubBtnText, { color: '#FF6B47', fontWeight: '800' }]}>
                            스몰톡 질문 교체
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.dockSubBtn}
                          onPress={() => setAppendixModalVisible(true)}
                          activeOpacity={0.8}
                        >
                          <BookOpen size={12} color="#3B82F6" style={{ marginRight: 3 }} />
                          <Text style={[styles.dockSubBtnText, { color: '#3B82F6' }]}>권말 부록 색인</Text>
                        </TouchableOpacity>
                      </>
                    ) : getPageFormat(currentSpreadIndex, activeSingleSide) === 'hybrid' ? (
                      <>
                        <TouchableOpacity
                          style={[styles.dockSubBtn, { backgroundColor: '#FFF5F2', borderColor: '#FFD5CC' }]}
                          onPress={() => {
                            setSelectedTopicSlot(0);
                            setTopicPickerModalVisible(true);
                          }}
                          activeOpacity={0.8}
                        >
                          <Shuffle size={12} color="#FF6B47" style={{ marginRight: 4 }} />
                          <Text style={[styles.dockSubBtnText, { color: '#FF6B47', fontWeight: '800' }]}>
                            질문 교체
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.dockSubBtn}
                          onPress={() => handleOpenPhotoPicker(activeSingleSide === 'left' ? 0 : 1)}
                          activeOpacity={0.8}
                        >
                          <Camera size={12} color="#FF6B47" style={{ marginRight: 3 }} />
                          <Text style={styles.dockSubBtnText}>사진 변경</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.dockSubBtn}
                          onPress={() => {
                            const next = spreadLayouts[currentSpreadIndex] === 'wide' ? 'single' : 'wide';
                            const nextLayouts = { ...spreadLayouts, [currentSpreadIndex]: next };
                            setSpreadLayouts(nextLayouts);
                            broadcastPhotobookChange({ spreadLayouts: nextLayouts });
                          }}
                          activeOpacity={0.8}
                        >
                          <Layout size={12} color="#FF6B47" style={{ marginRight: 3 }} />
                          <Text style={styles.dockSubBtnText}>
                            {spreadLayouts[currentSpreadIndex] === 'wide' ? '1장 전면' : '2장 분할'}
                          </Text>
                        </TouchableOpacity>

                        {/* AI 글귀: 오직 첫 페이지(P.1) 또는 마지막 페이지(P.32)에서만 활성화 */}
                        {(currentPageNum === 1 || currentPageNum === 32) && (
                          <TouchableOpacity
                            style={[styles.dockSubBtn, { backgroundColor: '#F3E8FF', borderColor: '#E9D5FF' }]}
                            onPress={() => handleOpenAiEssayModal(currentPageNum === 1 ? 'prologue' : 'epilogue')}
                            activeOpacity={0.8}
                          >
                            <Sparkles size={12} color="#7C3AED" style={{ marginRight: 3 }} />
                            <Text style={[styles.dockSubBtnText, { color: '#7C3AED', fontWeight: '800' }]}>
                              {currentPageNum === 1 ? 'AI 프롤로그' : 'AI 에필로그'}
                            </Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={styles.dockSubBtn}
                          onPress={() => {
                            setSelectedTopicSlot(0);
                            setTopicPickerModalVisible(true);
                          }}
                          activeOpacity={0.8}
                        >
                          <BookOpen size={12} color="#3B82F6" style={{ marginRight: 3 }} />
                          <Text style={[styles.dockSubBtnText, { color: '#3B82F6' }]}>스몰톡 문답</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </>
              )}

              {/* 실물 주문 메인 CTA 버튼 */}
              <TouchableOpacity
                style={styles.dockMainOrderBtn}
                onPress={() => setOrderModalVisible(true)}
                activeOpacity={0.85}
              >
                <ShoppingBag size={14} color="#FFFFFF" strokeWidth={2.4} style={{ marginRight: 5 }} />
                <Text style={styles.dockMainOrderBtnText}>
                  {finalCashPrice.toLocaleString()}원 · 15×21cm A5 양장본 실물 주문
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </>
      ) : (
        /* 스크롤 형식: 표지부터 16P까지 세로 연속 피드로 완독 감상 */
        <ScrollView
          style={styles.previewScrollFeed}
          contentContainerStyle={styles.previewScrollFeedContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. 150×210mm A5 하드커버 겉표지 */}
          <View style={[styles.previewCoverCard, { backgroundColor: currentTheme.bg, borderColor: currentTheme.border, width: a5CanvasWidth, height: a5CanvasHeight }]}>
            {renderCoverPage(true)}
          </View>

          {/* 2. 8개 스프레드 전수 페이지별 1:1 순차 렌더링 (P.1 ~ P.16) */}
          {SPREAD_DEFINITIONS.map((sDef, sIdx) => {
            return (
              <View key={sDef.spreadIndex} style={styles.previewSpreadFeedBlock}>
                <View style={styles.previewSpreadSectionHeader}>
                  <View style={styles.previewSpreadTag}>
                    <Text style={styles.previewSpreadTagText}>P.{sDef.leftPage} - P.{sDef.rightPage}</Text>
                  </View>
                </View>

                {/* 왼쪽 페이지 (150×210mm A5 세로형) */}
                <View style={[styles.previewPageSingleCard, { backgroundColor: currentTheme.bg, borderColor: currentTheme.border, width: a5CanvasWidth, height: a5CanvasHeight }]}>
                  <View style={styles.previewPageNumBadge}>
                    <Text style={styles.previewPageNumBadgeText}>P.{sDef.leftPage}</Text>
                  </View>
                  <View style={styles.previewPageSingleInner}>
                    {renderPage(sIdx, 'left', true)}
                  </View>
                </View>

                {/* 오른쪽 페이지 (150×210mm A5 세로형) */}
                <View style={[styles.previewPageSingleCard, { backgroundColor: currentTheme.bg, borderColor: currentTheme.border, width: a5CanvasWidth, height: a5CanvasHeight }]}>
                  <View style={styles.previewPageNumBadge}>
                    <Text style={styles.previewPageNumBadgeText}>P.{sDef.rightPage}</Text>
                  </View>
                  <View style={styles.previewPageSingleInner}>
                    {renderPage(sIdx, 'right', true)}
                  </View>
                </View>
              </View>
            );
          })}

          {/* 하단 주문 발주 유도 카드 */}
          <View style={styles.previewBottomCtaCard}>
            <Text style={styles.previewBottomCtaTitle}>우리 가족만의 15×21cm A5 이야기책 📖</Text>
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
                      broadcastPhotobookChange({ selectedThemeId: t.id });
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
                    onPress={() => {
                      setBookFontFamily(f.id);
                      broadcastPhotobookChange({ bookFontFamily: f.id });
                    }}
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
                    onPress={() => {
                      setBookFontSize(s.id);
                      broadcastPhotobookChange({ bookFontSize: s.id });
                    }}
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
              총 16페이지 낱장 중 이동할 페이지를 터치하세요:
            </Text>

            {/* 📘 겉표지 바로가기 버튼 */}
            <TouchableOpacity
              style={[styles.pageGridCoverBanner, currentPageNum === 0 && styles.pageGridCoverBannerActive]}
              onPress={() => {
                handleGoToPage(0);
                setPagePickerModalVisible(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 13, marginRight: 6 }}>📘</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pageGridCoverTitle, currentPageNum === 0 && { color: '#FF6B47' }]}>
                  하드커버 겉표지 (Hardcover Front)
                </Text>
                <Text style={styles.pageGridCoverSub}>3대 디자인 스타일(액자형/화보형/타이포) 편집</Text>
              </View>
              <ChevronRight size={14} color={currentPageNum === 0 ? '#FF6B47' : '#A8A29E'} />
            </TouchableOpacity>

            {/* 16페이지 낱장 콤팩트 그리드 */}
            <ScrollView style={{ maxHeight: 270 }} showsVerticalScrollIndicator={false}>
              <View style={styles.pageGridMatrix}>
                {Array.from({ length: TOTAL_PHOTOBOOK_PAGES }, (_, i) => i + 1).map((pageNum) => {
                  const isCurrent = currentPageNum === pageNum;
                  const sIdx = Math.floor((pageNum - 1) / 2);
                  const sDef = SPREAD_DEFINITIONS[sIdx] || SPREAD_DEFINITIONS[0];
                  const icon = pageNum === 1 ? '📖' : pageNum === TOTAL_PHOTOBOOK_PAGES ? '✍️' : (sDef.category === 'interview' ? (pageNum % 2 === 1 ? '💬' : '📷') : (pageNum === 15 ? '📊' : '📷'));
                  return (
                    <TouchableOpacity
                      key={`page-pick-${pageNum}`}
                      style={[styles.pageGridCell, isCurrent && styles.pageGridCellActive]}
                      onPress={() => {
                        handleGoToPage(pageNum);
                        setPagePickerModalVisible(false);
                      }}
                      activeOpacity={0.75}
                    >
                      <View style={styles.pageGridCellTopRow}>
                        <Text style={{ fontSize: 9.5 }}>{icon}</Text>
                        <Text style={[styles.pageGridCellSpNum, isCurrent && styles.pageGridCellSpNumActive]}>
                          P.{pageNum}
                        </Text>
                      </View>
                      <Text style={[styles.pageGridCellPages, isCurrent && styles.pageGridCellPagesActive]} numberOfLines={1}>
                        {pageNum === 1 ? '프롤로그' : pageNum === TOTAL_PHOTOBOOK_PAGES ? '에필로그' : (pageNum === 15 ? '리포트' : (pageNum % 2 === 1 ? '인터뷰' : '사진'))}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* 4. 사진 트레이 선택 모달 (Photo Picker Tray)                */}
      {/*    본인 폰 사진첩 직접 불러오기 + 채팅방 공유 사진 통합      */}
      {/* ========================================================= */}
      <Modal visible={photoPickerVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerSheetCard}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>포토북 수록 사진 선택</Text>
                <Text style={styles.sheetSub}>내 폰 사진첩이나 채팅방 공유 사진 중 선택하세요.</Text>
              </View>
              <TouchableOpacity onPress={() => setPhotoPickerVisible(false)} style={styles.closeBtn}>
                <X size={20} color="#1C1917" />
              </TouchableOpacity>
            </View>

            {/* 📱 1. 내 사진첩에서 직접 불러오기 버튼 (Primary CTA) */}
            <TouchableOpacity
              style={styles.pickFromGalleryCtaBtn}
              onPress={handlePickFromDeviceGallery}
              activeOpacity={0.85}
            >
              <Camera size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.pickFromGalleryCtaBtnText}>
                내 사진첩(갤러리)에서 사진 가져오기 📱
              </Text>
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.photoGridScroll} showsVerticalScrollIndicator={false}>
              {/* A. 내 사진첩에서 최근 불러온 사진 목록 */}
              {customGalleryPhotos.length > 0 && (
                <View style={{ width: '100%', marginBottom: 16 }}>
                  <Text style={styles.photoTraySectionTitle}>
                    📱 사진첩에서 가져온 사진 ({customGalleryPhotos.length}장)
                  </Text>
                  <View style={styles.photoTrayGridRow}>
                    {customGalleryPhotos.map((uri, idx) => (
                      <TouchableOpacity
                        key={`custom-${idx}`}
                        style={styles.gridThumbBox}
                        onPress={() => handleSelectPhoto(uri)}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri }} style={styles.gridThumbImage} resizeMode="cover" />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* B. 채팅방에서 공유된 사진 목록 */}
              <View style={{ width: '100%' }}>
                <Text style={styles.photoTraySectionTitle}>
                  💬 가족 채팅방 공유 사진 ({chatPhotos.length}장)
                </Text>
                {chatPhotos.length === 0 ? (
                  <View style={styles.emptyNotice}>
                    <Camera size={32} color="#A8A29E" style={{ marginBottom: 6 }} />
                    <Text style={styles.emptyNoticeText}>채팅방에 공유된 사진이 없습니다.</Text>
                    <Text style={styles.emptyNoticeSubText}>
                      위의 [내 사진첩에서 사진 가져오기] 버튼을 눌러 기기 내 사진을 넣어보세요!
                    </Text>
                  </View>
                ) : (
                  <View style={styles.photoTrayGridRow}>
                    {chatPhotos.map(item => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.gridThumbBox}
                        onPress={() => handleSelectPhoto(item.uri)}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: item.uri }} style={styles.gridThumbImage} resizeMode="cover" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
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
                  150×210mm A5 세로형 · 16페이지 · 무광 하드커버 양장제본 · 세네카 책등 4mm 인쇄
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
                  const newT = tempTitle.trim();
                  const newSub = tempSubtitle.trim();
                  setBookTitle(newT);
                  setBookSubtitle(newSub);
                  broadcastPhotobookChange({ bookTitle: newT, bookSubtitle: newSub });
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
      {/* 6-B. AI 스몰톡 에세이(프롤로그 / 에필로그) 집필 & 편집 모달 */}
      {/* ========================================================= */}
      <Modal visible={aiEssayModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.pickerSheetCard, { maxHeight: '88%' }]}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.sheetTitle} numberOfLines={1}>
                  {targetEssayType === 'prologue' ? 'AI 프롤로그 (여는 글) 집필' : 'AI 에필로그 (맺는 글) 집필'}
                </Text>
                <Text style={styles.sheetSub}>
                  {targetEssayType === 'prologue'
                    ? '가족들이 나눈 스몰톡 문답을 분석하여 P.1 프롤로그에 수록될 따스한 여는 글을 짓습니다.'
                    : '180일간의 여정을 마무리하며 P.16 에필로그에 수록될 가족 헌사 맺음말을 짓습니다.'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAiEssayModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color="#1C1917" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 26 }} showsVerticalScrollIndicator={false}>
              {/* 스몰톡 분석 안내 배너 */}
              <View style={[styles.aiArchiveNoticeCard, { marginBottom: 14 }]}>
                <BookOpen size={16} color="#7C3AED" style={{ marginRight: 8, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiArchiveNoticeTitle}>스몰톡 문답 아카이브 연동</Text>
                  <Text style={styles.aiArchiveNoticeDesc}>
                    {smallTalkArchiveList && smallTalkArchiveList.length > 0
                      ? `포토북에 담긴 ${smallTalkArchiveList.length}개의 가족 문답 기록을 바탕으로 Gemini 2.5가 문학 에세이를 집필합니다.`
                      : '포토북에 수록된 180문답과 가족 구성원의 이름을 바탕으로 Gemini 2.5가 감동적인 에세이를 집필합니다.'}
                  </Text>
                </View>
              </View>

              {/* 실시간 AI 생성 CTA 버튼 */}
              <TouchableOpacity
                style={[styles.aiGenerateActionBtn, { backgroundColor: '#7C3AED' }]}
                onPress={() => handleGenerateAiEssay(targetEssayType)}
                disabled={isGeneratingAiEssay}
                activeOpacity={0.85}
              >
                {isGeneratingAiEssay ? (
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                ) : (
                  <Sparkles size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                )}
                <Text style={styles.aiGenerateActionBtnText}>
                  {isGeneratingAiEssay ? 'Gemini 2.5 AI가 스몰톡을 읽고 글을 짓는 중...' : '스몰톡 읽고 AI로 새로 집필하기'}
                </Text>
              </TouchableOpacity>

              {/* 글귀 편집 입력창 */}
              <Text style={[styles.modalSectionSubTitle, { marginTop: 18 }]}>본문 내용 (직접 수정 및 퇴고 가능)</Text>
              <View style={[styles.captionInputContainer, { minHeight: 140 }]}>
                <TextInput
                  style={[styles.captionTextInput, { height: 130, textAlignVertical: 'top' }]}
                  value={customEssayInput}
                  onChangeText={setCustomEssayInput}
                  placeholder="가족에게 전하고 싶은 따뜻한 에세이 문장을 적어보세요."
                  placeholderTextColor="#A8A29E"
                  multiline
                  numberOfLines={6}
                />
              </View>

              {/* 프리셋 문장 선택 옵션 */}
              <Text style={[styles.modalSectionSubTitle, { marginTop: 16, marginBottom: 8 }]}>💡 추천 에세이 문장 둘러보기 (탭하여 적용)</Text>
              {[
                targetEssayType === 'prologue'
                  ? '가장 눈부신 순간은 언제나 멀리 있지 않았습니다. 함께 밥을 먹고, 사소한 농담을 주고받고, 문득 전해진 다정한 안부 속에 우리 가족의 가장 따뜻한 계절이 깃들어 있었습니다.\n\n지난 6개월간 매일 주고받은 스몰톡 문답과 카메라에 담긴 온기를 엮어, 우리들의 찬란했던 시간들을 이 한 권의 책에 고이 남깁니다.'
                  : '계절은 바뀌어도 우리가 함께 나눈 사랑의 온도는 변하지 않습니다. 함께여서 눈부셨던 180일간의 발자취는 이제 우리 마음속 가장 깊은 보물이 되었습니다.\n\n다음 6개월 뒤에도 더 풍성하고 다정한 추억으로 이 자리를 채워나가길 소망하며, 서로의 든든한 버팀목이 되어준 온 가족에게 이 책을 바칩니다.',
                targetEssayType === 'prologue'
                  ? '어느 날 문득 돌아본 우리들의 시간은 그 어떤 문학 작품보다 아름다웠습니다. 서로의 작은 목소리에 귀 기울이며 쌓아 올린 180일간의 온기를 모아, 우리 가족의 첫 번째 이야기를 열어봅니다.'
                  : '하루하루의 사소한 문답들이 모여 우리 가족만의 단단한 역사가 되었습니다. 비바람 부는 날에도 서로의 기댈 언덕이 되어준 가족들에게 고마운 마음을 전하며, 끝나지 않을 우리들의 다음 계절을 기대합니다.'
              ].map((presetText, pIdx) => (
                <TouchableOpacity
                  key={pIdx}
                  style={[styles.captionPresetItem, { paddingVertical: 10 }]}
                  onPress={() => setCustomEssayInput(presetText)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.captionPresetText, { lineHeight: 19 }]}>"{presetText}"</Text>
                </TouchableOpacity>
              ))}

              {/* 하단 적용 버튼 */}
              <View style={[styles.captionModalBtnRow, { marginTop: 16 }]}>
                <TouchableOpacity
                  style={[styles.captionApplyBtn, { flex: 1, backgroundColor: '#7C3AED' }]}
                  onPress={() => handleApplyAiEssay(customEssayInput)}
                  activeOpacity={0.85}
                >
                  <Check size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.captionApplyBtnText}>
                    {targetEssayType === 'prologue' ? 'P.1 프롤로그에 수록하기' : 'P.16 에필로그에 수록하기'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* 7. 스몰톡 질문 교체 및 아카이브 담기 모달                   */}
      {/* ========================================================= */}
      <Modal visible={topicPickerModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.pickerSheetCard, { maxHeight: '90%' }]}>
            {/* 상단 헤더: 현재 편집 중인 페이지 번호 명시 */}
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <View style={styles.modalPageTag}>
                    <Text style={styles.modalPageTagText}>P.{currentPageNum} 편집</Text>
                  </View>
                </View>
                <Text style={styles.sheetTitle} numberOfLines={1}>스몰톡 인터뷰 문답 교체</Text>
                <Text style={styles.sheetSub}>
                  {getPageFormat(currentSpreadIndex, activeSingleSide) === 'photo'
                    ? '현재 페이지는 사진 전용 레이아웃입니다.'
                    : getPageFormat(currentSpreadIndex, activeSingleSide) === 'hybrid'
                    ? '사진+스몰톡(포맷3) 페이지의 대표 질문을 원하는 문답으로 교체하세요.'
                    : '현재 페이지에 수록할 질문 슬롯(Q1~Q3)을 고르고 원하는 문답으로 교체하세요.'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setTopicPickerModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color="#1C1917" />
              </TouchableOpacity>
            </View>

            {/* 사진 전용 페이지인 경우: 레이아웃 변경 유도 안내 박스 */}
            {getPageFormat(currentSpreadIndex, activeSingleSide) === 'photo' ? (
              <View style={styles.photoPageFormatGuideBox}>
                <View style={styles.guideIconRow}>
                  <Camera size={20} color="#FF6B47" />
                  <Text style={styles.guideTitleText}>현재 P.{currentPageNum}은 사진 전용 페이지입니다</Text>
                </View>
                <Text style={styles.guideDescText}>
                  스몰톡 문답을 이 페이지에 수록하려면 레이아웃 포맷을 [포맷2: 스몰톡] 또는 [포맷3: 사진+톡]으로 변경해 주세요.
                </Text>
                <View style={styles.guideActionRow}>
                  <TouchableOpacity
                    style={[styles.guideActionBtn, { backgroundColor: '#FF6B47' }]}
                    onPress={() => {
                      handleSetPageFormat('smalltalk', currentPageNum);
                      Alert.alert('포맷 변경 완료 ✨', `P.${currentPageNum}이 [포맷2: 스몰톡] 레이아웃으로 변경되었습니다.`);
                    }}
                    activeOpacity={0.8}
                  >
                    <FileText size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={[styles.guideActionBtnText, { color: '#FFFFFF' }]}>포맷2 (스몰톡)으로 변경</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.guideActionBtn, { backgroundColor: '#FFF5F2', borderColor: '#FFD5CC', borderWidth: 1 }]}
                    onPress={() => {
                      handleSetPageFormat('hybrid', currentPageNum);
                      Alert.alert('포맷 변경 완료 ✨', `P.${currentPageNum}이 [포맷3: 사진+스몰톡] 레이아웃으로 변경되었습니다.`);
                    }}
                    activeOpacity={0.8}
                  >
                    <Sparkles size={13} color="#FF6B47" style={{ marginRight: 4 }} />
                    <Text style={[styles.guideActionBtnText, { color: '#FF6B47' }]}>포맷3 (사진+톡)으로 변경</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                {/* A. 교체 대상 슬롯 선택 카드 리스트 */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={styles.slotTargetLabel}>
                    {getPageFormat(currentSpreadIndex, activeSingleSide) === 'hybrid'
                      ? '교체 대상 질문 (대표 슬롯):'
                      : `P.${currentPageNum} 수록 질문 중 교체할 대상 선택:`}
                  </Text>
                  <View style={{ gap: 6, marginTop: 6 }}>
                    {(getPageFormat(currentSpreadIndex, activeSingleSide) === 'hybrid' ? [0] : [0, 1, 2]).map(slotIdx => {
                      const isSelectedSlot = selectedTopicSlot === slotIdx;
                      const slotTopicText = currentInterviewTopics[slotIdx]?.topic || `질문 ${slotIdx + 1}`;
                      return (
                        <TouchableOpacity
                          key={slotIdx}
                          style={[styles.slotItemCard, isSelectedSlot && styles.slotItemCardActive]}
                          onPress={() => setSelectedTopicSlot(slotIdx)}
                          activeOpacity={0.8}
                        >
                          <View style={[styles.slotBadge, isSelectedSlot && styles.slotBadgeActive]}>
                            <Text style={[styles.slotBadgeText, isSelectedSlot && styles.slotBadgeTextActive]}>
                              Q{slotIdx + 1}
                            </Text>
                          </View>
                          <Text
                            style={[styles.slotItemTopicText, isSelectedSlot && styles.slotItemTopicTextActive]}
                            numberOfLines={1}
                          >
                            "{slotTopicText}"
                          </Text>
                          {isSelectedSlot && (
                            <CheckCircle2 size={15} color="#FF6B47" style={{ marginLeft: 6 }} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* B. 2대 탭 세그먼트: [✨ 추천 질문] / [💬 가족 스몰톡 기록 (N개)] */}
                <View style={styles.topicModalTabBar}>
                  <TouchableOpacity
                    style={[styles.topicModalTabBtn, topicModalTab === 'recommended' && styles.topicModalTabBtnActive]}
                    onPress={() => setTopicModalTab('recommended')}
                    activeOpacity={0.8}
                  >
                    <Sparkles size={13} color={topicModalTab === 'recommended' ? '#FF6B47' : '#78716C'} style={{ marginRight: 4 }} />
                    <Text style={[styles.topicModalTabBtnText, topicModalTab === 'recommended' && styles.topicModalTabBtnTextActive]}>
                      추천 질문 풀
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.topicModalTabBtn, topicModalTab === 'archive' && styles.topicModalTabBtnActive]}
                    onPress={() => setTopicModalTab('archive')}
                    activeOpacity={0.8}
                  >
                    <MessageSquare size={13} color={topicModalTab === 'archive' ? '#FF6B47' : '#78716C'} style={{ marginRight: 4 }} />
                    <Text style={[styles.topicModalTabBtnText, topicModalTab === 'archive' && styles.topicModalTabBtnTextActive]}>
                      가족 실제 문답 기록 ({smallTalkArchiveList.length}개)
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* C. 탭별 콘텐츠 */}
                <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
                  {topicModalTab === 'recommended' ? (
                    <>
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#1C1917', marginBottom: 8 }}>
                        💡 테마별 감성 인터뷰 질문 (탭하여 즉시 Q{selectedTopicSlot + 1}에 교체)
                      </Text>
                      {[
                        '가족에게 가장 감동받았던 사소한 배려는 무엇인가요?',
                        '우리 집에서 가장 편안하고 아늑한 나만의 아지트는?',
                        '가족들과 함께 해보고 싶은 소소한 취미가 있나요?',
                        '다시 돌아가고 싶은 우리 가족의 하루가 있다면 언제인가요?',
                        '가족들에게 꼭 해주고 싶은 따뜻한 요리가 있나요?',
                        '최근 나를 가장 크게 웃게 했던 가족의 모습은 무엇인가요?',
                        '우리 가족만의 특별한 약속이나 가훈을 정한다면?',
                        '힘들고 지칠 때 나를 위로해주는 우리 집만의 안식처는?',
                        '가족들에게 꼭 추천해주고 싶은 나만의 힐링 음악은?',
                        '우리 가족과 함께 떠났던 여행 중 가장 기억에 남는 곳은?',
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
                            Alert.alert('질문 교체 완료 🪄', `P.${currentPageNum} Q${selectedTopicSlot + 1} 질문이 새로운 문답으로 교체되었습니다!`);
                          }}
                          activeOpacity={0.8}
                        >
                          <Sparkles size={14} color="#7C3AED" style={{ marginRight: 8 }} />
                          <Text style={styles.candidateText}>"{qText}"</Text>
                        </TouchableOpacity>
                      ))}
                    </>
                  ) : (
                    <>
                      {/* 검색창 */}
                      <View style={styles.topicSearchBox}>
                        <Search size={14} color="#78716C" style={{ marginRight: 6 }} />
                        <TextInput
                          style={styles.topicSearchInput}
                          value={topicSearchQuery}
                          onChangeText={setTopicSearchQuery}
                          placeholder="가족과 나눈 질문 검색..."
                          placeholderTextColor="#A8A29E"
                        />
                        {topicSearchQuery ? (
                          <TouchableOpacity onPress={() => setTopicSearchQuery('')}>
                            <X size={14} color="#78716C" />
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      {/* 아카이브 리스트 */}
                      {smallTalkArchiveList
                        .filter(item => !topicSearchQuery || (item.topic && item.topic.includes(topicSearchQuery)))
                        .map((item, aIdx) => {
                          // 실제 가족 답변들 매핑
                          const answersMap = {};
                          if (Array.isArray(item.answers)) {
                            item.answers.forEach(ans => {
                              const authorId = ans.user_id || ans.userId || ans.id;
                              if (authorId) answersMap[authorId] = ans.response_text || ans.responseText || ans.text;
                            });
                          }

                          return (
                            <TouchableOpacity
                              key={item.id || aIdx}
                              style={styles.archiveTopicItemCard}
                              onPress={() => {
                                const updated = [...currentInterviewTopics];
                                updated[selectedTopicSlot] = {
                                  id: item.id || `archive-${aIdx}`,
                                  date: item.dateLabel || item.yearMonthLabel || '가족 아카이브',
                                  topic: item.topic,
                                  answers: Object.keys(answersMap).length > 0 ? answersMap : (item.answers || updated[selectedTopicSlot]?.answers || {}),
                                };
                                setCustomSpreadTopics(prev => ({ ...prev, [currentSpreadIndex]: updated }));
                                setTopicPickerModalVisible(false);
                                Alert.alert('아카이브 질문 반영 완료 ✨', `가족들이 답변한 실제 기록이 P.${currentPageNum} Q${selectedTopicSlot + 1}에 수록되었습니다!`);
                              }}
                              activeOpacity={0.8}
                            >
                              <View style={styles.archiveTopicItemHeader}>
                                <Text style={styles.archiveTopicItemDate}>
                                  {item.dateLabel || item.yearMonthLabel || `${aIdx + 1}번째 질문`}
                                </Text>
                                {item.isAnswered && (
                                  <View style={styles.archiveAnsweredBadge}>
                                    <Text style={styles.archiveAnsweredBadgeText}>답변 완료 ✨</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.archiveTopicItemTitle}>"{item.topic}"</Text>
                              {Array.isArray(item.answers) && item.answers.length > 0 && (
                                <Text style={styles.archiveTopicAnswerCount}>
                                  총 {item.answers.length}명의 가족 답변 수록됨
                                </Text>
                              )}
                            </TouchableOpacity>
                          );
                        })}

                      {smallTalkArchiveList.length === 0 && (
                        <View style={styles.emptyArchiveBox}>
                          <Text style={styles.emptyArchiveText}>아직 등록된 가족 스몰톡 기록이 없습니다.</Text>
                        </View>
                      )}
                    </>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* 8. 180문답 전수 인덱스 부록 모달 (Appendix Modal)           */}
      {/* ========================================================= */}
      <Modal visible={appendixModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.pickerSheetCard, { maxHeight: '88%' }]}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <View style={styles.modalPageTag}>
                    <Text style={styles.modalPageTagText}>P.15 부록</Text>
                  </View>
                </View>
                <Text style={styles.sheetTitle} numberOfLines={1}>스몰톡 아카이브 색인 및 디지털 연동</Text>
                <Text style={styles.sheetSub}>
                  권말 P.15에는 통계 리포트와 대표 문답이 인쇄되며, 전수 문답은 QR코드로 연결됩니다.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAppendixModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color="#1C1917" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
              {/* 현실적 부록 안내 배너 */}
              <View style={styles.appendixNoticeBox}>
                <Award size={16} color="#FF6B47" style={{ marginRight: 6 }} />
                <Text style={styles.appendixNoticeText}>
                  총 {smallTalkArchiveList.length}개 질문 중 {answeredSmallTalkCount}개 완료 · 실물 책 QR코드 스캔 시 전수 열람 가능
                </Text>
              </View>

              {/* QR코드 연동 안내 카드 */}
              <View style={styles.appendixQrGuideCard}>
                <View style={styles.appendixQrIconCircle}>
                  <QrCode size={24} color="#FF6B47" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.appendixQrGuideTitle}>A5 실물 책 맞춤형 하이브리드 부록</Text>
                  <Text style={styles.appendixQrGuideDesc}>
                    180개에 달하는 방대한 질문과 가족들의 장문 답변은 실물 책 P.15의 전용 QR코드를 통해 스마트폰에서 언제든 편리하게 검색하고 열람할 수 있습니다.
                  </Text>
                </View>
              </View>

              {/* 아카이브 목록 미리보기 */}
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#1C1917', marginTop: 14, marginBottom: 8 }}>
                📋 연동된 가족 문답 목록 ({smallTalkArchiveList.length}개)
              </Text>

              {smallTalkArchiveList.length === 0 ? (
                <View style={{ padding: 30, alignItems: 'center' }}>
                  <Text style={{ color: '#78716C', fontSize: 13 }}>아직 등록된 스몰톡 문답이 없습니다.</Text>
                </View>
              ) : (
                <View style={styles.appendixGrid}>
                  {smallTalkArchiveList.map((item, i) => {
                    const isDone = Boolean(item.isAnswered || (item.answers && item.answers.length > 0));
                    return (
                      <View key={item.id || i} style={styles.appendixRow}>
                        <Text style={styles.appendixDate}>{item.dateLabel || `Day ${i + 1}`}</Text>
                        <Text style={styles.appendixQuestion} numberOfLines={1}>
                          {item.topic}
                        </Text>
                        {isDone ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <Check size={12} color="#10B981" />
                            <Text style={{ fontSize: 10, color: '#10B981', fontWeight: '800' }}>완료</Text>
                          </View>
                        ) : (
                          <Text style={{ fontSize: 10, color: '#A8A29E' }}>대기</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* 4. 실물 책 1:1 전체화면 감상 뷰어 (Full-screen Book Reader) */}
      {/*    외부 라이브러리 없이 순수 리액트 네이티브로 구현한 몰입형 리더 */}
      {/* ========================================================= */}
      <Modal
        visible={fullViewerVisible}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setFullViewerVisible(false)}
      >
        <View style={styles.fullViewerContainer}>
          {/* 상단 내비게이션 바: [편집으로 돌아가기], [P.X / 16P], [주문하기] */}
          <View style={styles.fullViewerHeader}>
            <TouchableOpacity
              style={styles.fullViewerCloseBtn}
              onPress={() => setFullViewerVisible(false)}
              activeOpacity={0.8}
            >
              <X size={16} color={colors.text.secondary} style={{ marginRight: 4 }} />
              <Text style={styles.fullViewerCloseText}>편집으로 돌아가기</Text>
            </TouchableOpacity>

            <View style={styles.fullViewerPageBadge}>
              <Text style={styles.fullViewerPageBadgeText}>
                {viewerPageNum === 0 ? '📘 하드커버 겉표지' : `P.${viewerPageNum} / ${TOTAL_PHOTOBOOK_PAGES}P`}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.fullViewerOrderBtn}
              onPress={() => {
                setFullViewerVisible(false);
                setOrderModalVisible(true);
              }}
              activeOpacity={0.85}
            >
              <ShoppingBag size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.fullViewerOrderBtnText}>주문하기</Text>
            </TouchableOpacity>
          </View>

          {/* 중앙 가로 페이징 실물 책 리더 스크롤뷰 (150×210mm A5 세로형 1:1.4 비율) */}
          <ScrollView
            ref={viewerScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e) => {
              const { contentOffset, layoutMeasurement } = e.nativeEvent;
              const pageW = layoutMeasurement?.width || windowWidth || Dimensions.get('window').width;
              if (pageW > 0) {
                const newP = Math.round(contentOffset.x / pageW);
                if (newP >= 0 && newP <= TOTAL_PHOTOBOOK_PAGES) {
                  setViewerPageNum(newP);
                }
              }
            }}
            style={{ flex: 1, width: windowWidth || Dimensions.get('window').width }}
            contentContainerStyle={{ alignItems: 'center' }}
          >
            {PAGES_LIST.map((p) => {
              const winW = windowWidth || Dimensions.get('window').width;
              const pagePadV = isCompactViewerHeight ? 4 : 12;
              if (p.isCover) {
                return (
                  <View key="viewer-cover" style={{ width: winW, alignItems: 'center', justifyContent: 'center', paddingVertical: pagePadV }}>
                    <View
                      style={[
                        styles.viewerPageFrame,
                        {
                          backgroundColor: currentTheme.bg,
                          borderColor: currentTheme.border,
                          width: viewerCanvasWidth,
                          height: viewerCanvasHeight,
                        },
                      ]}
                    >
                      <View style={[styles.viewerPageInner, isCompactViewerHeight && { padding: 10 }]}>
                        {renderCoverPage(true, true)}
                      </View>
                    </View>
                  </View>
                );
              }

              const { sIdx, side, pageNum } = p;
              return (
                <View key={`viewer-p-${pageNum}`} style={{ width: winW, alignItems: 'center', justifyContent: 'center', paddingVertical: pagePadV }}>
                  <View
                    style={[
                      styles.viewerPageFrame,
                      {
                        backgroundColor: currentTheme.bg,
                        borderColor: currentTheme.border,
                        width: viewerCanvasWidth,
                        height: viewerCanvasHeight,
                      },
                    ]}
                  >
                    <View style={[styles.viewerPageInner, isCompactViewerHeight && { padding: 10 }]}>
                      {renderPage(sIdx, side, true, true)}
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* 하단 페이지 점프 컨트롤 바: [이전 장], 스와이프 안내, [다음 장] */}
          <View style={styles.fullViewerBottomBar}>
            <TouchableOpacity
              style={[styles.viewerNavArrowBtn, viewerPageNum === 0 && { opacity: 0.3 }]}
              disabled={viewerPageNum === 0}
              onPress={() => handleGoToViewerPage(viewerPageNum - 1)}
              activeOpacity={0.7}
            >
              <ChevronLeft size={15} color={colors.text.primary} style={{ marginRight: 2 }} />
              <Text style={styles.viewerNavArrowText}>이전 장</Text>
            </TouchableOpacity>

            <View style={styles.viewerGuideInfo}>
              <Text style={styles.viewerGuideInfoText}>
                좌우로 넘겨 실물 인쇄 규격(15×21cm A5)으로 감상하세요
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.viewerNavArrowBtn, viewerPageNum === TOTAL_PHOTOBOOK_PAGES && { opacity: 0.3 }]}
              disabled={viewerPageNum === TOTAL_PHOTOBOOK_PAGES}
              onPress={() => handleGoToViewerPage(viewerPageNum + 1)}
              activeOpacity={0.7}
            >
              <Text style={styles.viewerNavArrowText}>다음 장</Text>
              <ChevronRight size={15} color={colors.text.primary} style={{ marginLeft: 2 }} />
            </TouchableOpacity>
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
  // 🌐 실시간 동기화 플로팅 알림 (옵션 A: 상시 바 제거, 타인이 수정 시에만 플로팅 토스트 노출)
  floatingSyncNoticeOverlay: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  floatingSyncNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  floatingSyncNoticeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
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

  // 2. 15×15 코지 스퀘어 1:1 낱장 내비게이션 바
  squarePageNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: '#FAF8F3',
    gap: 8,
  },
  singlePageNavBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F5F0E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  singlePageNavTab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FAF8F3',
    borderWidth: 1,
    borderColor: '#F5F0E8',
  },
  singlePageNavTabActive: {
    backgroundColor: '#FFF5F2',
    borderColor: '#FFD5CC',
  },
  singlePageNavTabLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78716C',
  },
  singlePageNavTabLabelActive: {
    color: '#FF6B47',
    fontWeight: '800',
  },
  singlePageInfoCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  singlePageInfoCenterText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1C1917',
  },
  singlePageJumpListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  singlePageJumpListBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  singlePageViewerJumpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  singlePageViewerJumpBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text.inverse,
  },
  singlePageBadgeFloating: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(28, 25, 23, 0.72)',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 7,
    zIndex: 20,
  },
  singlePageBadgeFloatingText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#FFFFFF',
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
  formatSegmentSection: {
    marginBottom: 8,
  },
  formatSegmentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  formatCurrentPageBadge: {
    backgroundColor: '#FAF8F3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#F5F0E8',
  },
  formatCurrentPageBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF6B47',
  },
  formatTargetSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  formatSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#78716C',
  },
  formatTargetBtnGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  formatTargetBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F5F0E8',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  formatTargetBtnActive: {
    backgroundColor: '#FFF5F2',
    borderColor: '#FF6B47',
  },
  formatTargetBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#78716C',
  },
  formatTargetBtnTextActive: {
    color: '#FF6B47',
    fontWeight: '900',
  },
  formatSegmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  singlePageHalfFocused: {
    borderColor: '#FF6B47',
    backgroundColor: 'rgba(255, 107, 71, 0.03)',
  },
  activePageIndicatorBadge: {
    position: 'absolute',
    top: 6,
    left: 8,
    backgroundColor: '#FF6B47',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  activePageIndicatorText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
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
  statsBestSection: {
    marginTop: 8,
    marginBottom: 6,
  },
  statsBestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statsBestTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#1C1917',
  },
  statsBestCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F5F0E8',
    borderRadius: 8,
    padding: 6,
    marginBottom: 4,
  },
  statsBestCardTopic: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1C1917',
    marginBottom: 1,
  },
  statsBestCardAnswer: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#78716C',
  },
  statsQrBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F2',
    borderWidth: 1,
    borderColor: '#FFE8E0',
    borderRadius: 10,
    padding: 8,
    marginTop: 4,
  },
  statsQrIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFD5CC',
  },
  statsQrTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#1C1917',
  },
  statsQrSub: {
    fontSize: 8.5,
    fontWeight: '600',
    color: '#78716C',
    marginTop: 1,
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
  pickFromGalleryCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B47',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 14,
    shadowColor: '#FF6B47',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  pickFromGalleryCtaBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  photoTraySectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78716C',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  photoTrayGridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoGridScroll: {
    paddingBottom: 24,
  },
  emptyNotice: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyNoticeText: {
    fontSize: 13,
    color: '#78716C',
    fontWeight: '700',
  },
  emptyNoticeSubText: {
    fontSize: 11,
    color: '#A8A29E',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 16,
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
    width: Math.min(SCREEN_WIDTH - 40, 310),
    height: Math.round(Math.min(SCREEN_WIDTH - 40, 310) * 1.4),
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
  previewSpreadFeedBlock: {
    width: Math.min(SCREEN_WIDTH - 32, 420),
    marginBottom: 28,
    alignItems: 'center',
  },
  previewSpreadSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
    paddingHorizontal: 4,
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
  previewPageSingleCard: {
    width: Math.min(SCREEN_WIDTH - 40, 310),
    height: Math.round(Math.min(SCREEN_WIDTH - 40, 310) * 1.4),
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  previewPageNumBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(28, 25, 23, 0.72)',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 7,
    zIndex: 20,
  },
  previewPageNumBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  previewPageSingleInner: {
    flex: 1,
    padding: 14,
    position: 'relative',
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

  // 6-B. AI 감성 글귀 모달 스타일
  modalSectionSubTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1C1917',
    marginBottom: 6,
  },
  captionToneRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  captionToneChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#FAF8F3',
    borderWidth: 1.2,
    borderColor: '#F5F0E8',
  },
  captionToneChipActive: {
    backgroundColor: '#FFF5F2',
    borderColor: '#FF6B47',
  },
  captionToneChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#78716C',
  },
  captionToneChipTextActive: {
    color: '#FF6B47',
    fontWeight: '900',
  },
  aiGenerateActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  aiGenerateActionBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  captionInputContainer: {
    backgroundColor: '#FAF8F3',
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    padding: 10,
    marginBottom: 12,
  },
  captionTextInput: {
    fontSize: 13,
    color: '#1C1917',
    minHeight: 54,
    textAlignVertical: 'top',
    lineHeight: 18,
  },
  captionPresetItem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F5F0E8',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  captionPresetText: {
    fontSize: 12,
    color: '#44403C',
    lineHeight: 17,
    fontStyle: 'italic',
  },
  captionModalBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  captionClearBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FAF8F3',
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionClearBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#78716C',
  },
  captionApplyBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B47',
    paddingVertical: 12,
    borderRadius: 12,
  },
  captionApplyBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // 7. 180문답 모달 스타일
  slotTargetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  slotTargetLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1C1917',
  },
  slotTargetButtonGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  slotTargetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FAF8F3',
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
  },
  slotTargetBtnActive: {
    backgroundColor: '#FF6B47',
    borderColor: '#FF6B47',
  },
  slotTargetBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#78716C',
  },
  slotTargetBtnTextActive: {
    color: '#FFFFFF',
  },
  selectedSlotPreviewCard: {
    backgroundColor: '#FFF5F2',
    borderWidth: 1,
    borderColor: '#FFE8E0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  selectedSlotPreviewBadge: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FF6B47',
    marginBottom: 2,
  },
  selectedSlotPreviewText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1917',
    lineHeight: 16,
  },
  topicModalTabBar: {
    flexDirection: 'row',
    backgroundColor: '#F5F0E8',
    borderRadius: 12,
    padding: 3,
    gap: 4,
    marginBottom: 12,
  },
  topicModalTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  topicModalTabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  topicModalTabBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#78716C',
  },
  topicModalTabBtnTextActive: {
    color: '#FF6B47',
    fontWeight: '900',
  },
  topicSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 10,
  },
  topicSearchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#1C1917',
    paddingVertical: 0,
  },
  archiveTopicItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.2,
    borderColor: '#F5F0E8',
    marginBottom: 8,
  },
  archiveTopicItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  archiveTopicItemDate: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#78716C',
  },
  archiveAnsweredBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  archiveAnsweredBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#10B981',
  },
  archiveTopicItemTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1C1917',
    lineHeight: 17,
    marginBottom: 4,
  },
  archiveTopicAnswerCount: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#FF6B47',
  },
  emptyArchiveBox: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyArchiveText: {
    fontSize: 12,
    color: '#A8A29E',
  },
  modalPageTag: {
    backgroundColor: '#FF6B47',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modalPageTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  photoPageFormatGuideBox: {
    backgroundColor: '#FFF5F2',
    borderWidth: 1,
    borderColor: '#FFE8E0',
    borderRadius: 14,
    padding: 16,
    marginVertical: 10,
    alignItems: 'center',
  },
  guideIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  guideTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1917',
  },
  guideDescText: {
    fontSize: 12,
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  guideActionRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  guideActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
  },
  guideActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  slotItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F3',
    borderWidth: 1.2,
    borderColor: '#F5F0E8',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  slotItemCardActive: {
    backgroundColor: '#FFF5F2',
    borderColor: '#FF6B47',
  },
  slotBadge: {
    backgroundColor: '#E7E5E4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  slotBadgeActive: {
    backgroundColor: '#FF6B47',
  },
  slotBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#78716C',
  },
  slotBadgeTextActive: {
    color: '#FFFFFF',
  },
  slotItemTopicText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#44403C',
  },
  slotItemTopicTextActive: {
    color: '#1C1917',
    fontWeight: '800',
  },
  appendixQrGuideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F2',
    borderWidth: 1,
    borderColor: '#FFE8E0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  appendixQrIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFD5CC',
  },
  appendixQrGuideTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1917',
    marginBottom: 3,
  },
  appendixQrGuideDesc: {
    fontSize: 11,
    color: '#78716C',
    lineHeight: 16,
  },

  // =========================================================
  // 📘 하드커버 겉표지 (Hardcover Front) 스타일
  // =========================================================
  pageGridCoverBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F3',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1.2,
    borderColor: '#F5F0E8',
    marginBottom: 10,
  },
  pageGridCoverBannerActive: {
    backgroundColor: '#FFF5F2',
    borderColor: '#FF6B47',
  },
  pageGridCoverTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1C1917',
  },
  pageGridCoverSub: {
    fontSize: 9.5,
    color: '#78716C',
    marginTop: 1,
  },

  coverPageContent: {
    flex: 1,
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  coverSpineBand: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    opacity: 0.85,
    zIndex: 10,
  },
  coverInnerSurface: {
    flex: 1,
    paddingLeft: 8,
    paddingRight: 4,
    paddingTop: 4,
    paddingBottom: 4,
  },
  coverClassicContainer: {
    flex: 1,
    padding: 8,
  },
  coverEmbossFrame: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E8E0D0',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coverKickerBadge: {
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  coverMainTitle: {
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 2,
  },
  coverSubTitle: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  coverPhotoFrameBox: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FAF8F3',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  coverPhotoImg: {
    width: '100%',
    height: '100%',
  },
  coverPhotoEmptyPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  coverPhotoEmptyText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  coverPhotoBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(28, 25, 23, 0.75)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  coverPhotoBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  coverFamilySignature: {
    fontSize: 9.5,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  coverHardcoverFootnote: {
    fontSize: 7.5,
    fontWeight: '600',
    color: '#A8A29E',
    letterSpacing: 0.5,
  },

  // 화보형 (Full)
  coverFullPhotoContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E7E5E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverFullPhotoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(28, 25, 23, 0.65)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  coverFullTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
  },
  coverFullSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 9.5,
    fontWeight: '600',
    marginTop: 2,
  },

  // 타이포형 (Minimal)
  coverMinimalContainer: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coverMinimalCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  coverMinimalTitle: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.5,
  },
  coverMinimalHairline: {
    width: 32,
    height: 1.5,
    marginVertical: 10,
    borderRadius: 1,
  },
  coverMinimalSub: {
    fontSize: 10.5,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 15,
  },

  // =========================================================
  // 💬 150×150 출판 단행본풍 스몰톡 조판 (Book Editorial)
  // =========================================================
  bookInterviewPageContainer: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  bookChapterTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  bookChapterNumKicker: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 1,
  },
  bookChapterSubtitle: {
    fontSize: 8.5,
    fontWeight: '600',
  },
  bookHeaderDivider: {
    height: 1.2,
    opacity: 0.35,
    marginBottom: 6,
  },
  bookInterviewScroll: {
    flex: 1,
  },
  bookQnAArticle: {
    marginBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 8,
    padding: 6,
    borderWidth: 0.8,
    borderColor: '#F5F0E8',
  },
  bookQuestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  bookQuestionPrefix: {
    fontSize: 10,
    fontWeight: '900',
    marginRight: 4,
    marginTop: 0.5,
  },
  bookQuestionSentence: {
    flex: 1,
    fontWeight: '800',
  },
  bookAnswersEditorialBox: {
    borderTopWidth: 0.8,
    borderTopColor: '#F5F0E8',
    paddingTop: 3,
    gap: 3,
  },
  bookAnswerParagraph: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bookSpeakerLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    minWidth: 26,
    marginRight: 4,
    marginTop: 0.5,
  },
  bookAnswerQuotes: {
    flex: 1,
    fontWeight: '500',
  },
  bookQuestionHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: 6,
  },
  bookQnaEditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F2',
    borderColor: '#FFE8E0',
    borderWidth: 0.8,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1.5,
  },
  bookQnaEditBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FF6B47',
  },
  bookChangeTopicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    alignSelf: 'center',
    marginTop: 2,
    marginBottom: 6,
  },
  bookChangeTopicBtnText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#78716C',
  },

  // =========================================================
  // 📖 실물 책 1:1 감상 뷰어 (Full-screen Book Reader) 스타일
  //    (Figma Warm Cozy Living 디자인 시스템 토큰 준수)
  // =========================================================
  fullViewerContainer: {
    flex: 1,
    backgroundColor: colors.background, // 웜 아이보리 캔버스 (#FAF8F3)
    justifyContent: 'space-between',
  },
  fullViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 12,
    paddingBottom: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  fullViewerCloseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fullViewerCloseText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  fullViewerPageBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  fullViewerPageBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  fullViewerOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6.5,
    borderRadius: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 3,
    elevation: 3,
  },
  fullViewerOrderBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text.inverse,
  },
  viewerPageFrame: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 6,
  },
  viewerPageInner: {
    flex: 1,
    padding: 16,
  },
  fullViewerBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 26 : 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  viewerNavArrowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  viewerNavArrowText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.primary,
  },
  viewerGuideInfo: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  viewerGuideInfoText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.text.secondary,
    textAlign: 'center',
  },
});


