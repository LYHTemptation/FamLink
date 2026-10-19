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
  KeyboardAvoidingView,
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
import { generatePhotobookEssay } from '../services/geminiService';
import {
  mapPhotobookRowToState,
  saveFamilyPhotobookToDB,
  fetchFamilyPhotobookVolume,
  fetchFamilyPhotobookVolumes,
  createPhotobookOrderInDB,
} from '../services/photobookService';
import {
  openAddressSearch,
  searchKoreanAddressByKeyword,
  AddressSearchResult,
} from '../utils/daumPostcode';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

import {
  STUDIO_THEMES,
  VOLUME_OPTIONS,
  TOTAL_PHOTOBOOK_PAGES,
  TOTAL_PHOTOBOOK_SPREADS,
  SPREAD_DEFINITIONS,
  MONTHLY_INTERVIEW_TOPICS_PRESET,
  CAPTION_PRESETS_POOL,
  PHOTOBOOK_POINT_PRICE,
  PHOTOBOOK_EXTRA_COPY_POINT,
} from './photobook/photobookConstants';
import PhotobookHudModals from './photobook/PhotobookHudModals';
import styles from './photobook/PhotobookStyles';

export {
  STUDIO_THEMES,
  VOLUME_OPTIONS,
  TOTAL_PHOTOBOOK_PAGES,
  TOTAL_PHOTOBOOK_SPREADS,
};

import {
  FamilyMember,
  ChatMessage,
  UserProfile,
  SmallTalkArchiveItem,
  PetmongCharacter,
} from '../types/domain';

export interface PhotobookStudioScreenProps {
  currentUser?: any;
  familyMembers?: FamilyMember[];
  messages?: ChatMessage[];
  smallTalkState?: any;
  currentUserProfile?: UserProfile | null;
  points?: number;
  smallTalkArchiveList?: SmallTalkArchiveItem[];
  onDeductPoints?: (pts: number, reason: string) => Promise<boolean> | boolean | void;
  onSendOrderNotice?: (orderInfo: any) => Promise<void> | void;
  petCharacter?: PetmongCharacter | any | null;
}

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
}: PhotobookStudioScreenProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const screenWidth = windowWidth || Dimensions.get('window').width;
  const isSmallScreen = screenWidth < 380;

  // 1. 볼륨 선택 (6개월 단위 누적 볼륨제: Vol. 1, Vol. 2, Vol. 3...)
  const [selectedVolume, setSelectedVolume] = useState('vol-1');
  const [volumeList, setVolumeList] = useState(VOLUME_OPTIONS);
  const [volumePickerModalVisible, setVolumePickerModalVisible] = useState(false);
  const currentVolObj = volumeList.find(v => v.id === selectedVolume) || volumeList[0] || VOLUME_OPTIONS[0];

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
  const [pageFormats, setPageFormats] = useState<Record<string, string>>({});

  const getPageFormat = (sIdx: number, side: string) => {
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
  const [coverSignature, setCoverSignature] = useState('우리 가족의 따뜻한 이야기');
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null); // 커스텀 겉표지 대표 사진
  const [coverStyle, setCoverStyle] = useState('classic'); // 'classic' (액자형) | 'full' (화보형) | 'minimal' (감성 타이포)
  const [editTitleModalVisible, setEditTitleModalVisible] = useState(false);
  const [tempTitle, setTempTitle] = useState(bookTitle);
  const [tempSubtitle, setTempSubtitle] = useState(bookSubtitle);
  const [tempSignature, setTempSignature] = useState('우리 가족의 따뜻한 이야기');

  const handleOpenEditTitleModal = useCallback(() => {
    setTempTitle(bookTitle);
    setTempSubtitle(bookSubtitle);
    setTempSignature(coverSignature);
    setEditTitleModalVisible(true);
  }, [bookTitle, bookSubtitle, coverSignature]);

  // 3. 15×21cm A5 세로형 단행본 1:1 낱장 포커스 페이징 체계 (0: 겉표지, 1..16: P.1~P.16)
  const [currentPageNum, setCurrentPageNum] = useState(0); // 0 = 겉표지, 1~16 = P.1 ~ P.16
  const isEditingCover = currentPageNum === 0;
  const currentSpreadIndex = currentPageNum > 0 ? Math.floor((currentPageNum - 1) / 2) : 0;
  const activeSingleSide = currentPageNum > 0 ? (currentPageNum % 2 === 1 ? 'left' : 'right') : 'left';

  // 레이아웃 모드 가로 페이징 스크롤 레퍼런스 및 낱장 이동 핸들러
  const pageScrollRef = useRef<any>(null);
  const isProgrammaticScrollRef = useRef(false);
  const programmaticScrollTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (programmaticScrollTimerRef.current) {
        clearTimeout(programmaticScrollTimerRef.current);
      }
    };
  }, []);

  // 겉표지(0) + P.1 ~ P.16 총 17페이지 명세 리스트
  const PAGES_LIST = useMemo(() => {
    const list: any[] = [{ pageNum: 0, isCover: true, label: '겉표지' }];
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

  const handlePageScroll = useCallback((e: any) => {
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

  const handleMomentumScrollEnd = useCallback((e: any) => {
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

  const handleGoToPage = (pNum: number) => {
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

  const handleGoToSpread = (sIdx: number) => {
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
  const viewerScrollRef = useRef<any>(null);

  const handleOpenFullViewer = (pNum: number = currentPageNum) => {
    const target = Math.max(0, Math.min(TOTAL_PHOTOBOOK_PAGES, pNum));
    setViewerPageNum(target);
    setCurrentPageNum(target);
    setFullViewerVisible(true);
    setTimeout(() => {
      const winW = windowWidth || Dimensions.get('window').width;
      viewerScrollRef.current?.scrollTo({ x: target * winW, animated: false });
    }, 60);
  };

  const handleGoToViewerPage = (pNum: number) => {
    const target = Math.max(0, Math.min(TOTAL_PHOTOBOOK_PAGES, pNum));
    setViewerPageNum(target);
    setCurrentPageNum(target);
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

  // 4. 단톡방 사진 목록 추출 (image_url 및 image, Base64 data 모두 완벽 지원)
  const chatPhotos = useMemo(() => {
    if (!messages || !Array.isArray(messages)) return [];
    return (messages as any[])
      .filter(m => m && (m.image || m.image_url || (m.text && m.text.startsWith('data:image'))))
      .map((m, idx) => ({
        id: m.id || `photo-${idx}`,
        uri: m.image_url || m.image || m.text,
        sender: m.sender || m.userName || '가족',
        createdAt: m.createdAt || m.created_at || '최근',
      }));
  }, [messages]);

  // 4-1. 본인 기기 사진첩(갤러리)에서 직접 불러온 사진 목록
  const [customGalleryPhotos, setCustomGalleryPhotos] = useState<string[]>([]);

  // 스프레드별 커스텀 사진 매핑 { [spreadIndex]: [photoUri1, photoUri2, ...] }
  const [spreadPhotos, setSpreadPhotos] = useState<Record<string | number, string[]>>({});
  // 스프레드별 사진 레이아웃 셔플 모드: 'single' | 'wide' | 'split' | 'grid'
  const [spreadLayouts, setSpreadLayouts] = useState<Record<string | number, string>>({});
  // 스프레드별 AI 감성 한 줄 글귀
  const [spreadCaptions, setSpreadCaptions] = useState<Record<string | number, string>>({});

  // 5. 모달 제어 상태
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);
  const [activePhotoSlotIndex, setActivePhotoSlotIndex] = useState<number | 'cover'>(0);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [topicPickerModalVisible, setTopicPickerModalVisible] = useState(false);
  const [selectedTopicSlot, setSelectedTopicSlot] = useState(0);
  const [topicSearchQuery, setTopicSearchQuery] = useState('');
  const [selectedArchiveMonth, setSelectedArchiveMonth] = useState<string>('all');
  const [isMonthPickerExpanded, setIsMonthPickerExpanded] = useState<boolean>(false);
  const [appendixModalVisible, setAppendixModalVisible] = useState(false);
  const [customSpreadTopics, setCustomSpreadTopics] = useState<Record<string | number, any>>({});

  // AI 프롤로그(P.1) & 에필로그(P.32) 문학 에세이 상태
  const [prologueEssay, setPrologueEssay] = useState(
    '가장 눈부신 순간은 언제나 멀리 있지 않았습니다. 함께 밥을 먹고, 사소한 농담을 주고받고, 문득 전해진 다정한 안부 속에 우리 가족의 가장 따뜻한 계절이 깃들어 있었습니다.\n\n지난 6개월간 매일 주고받은 스몰톡 문답과 카메라에 담긴 온기를 엮어, 우리들의 찬란했던 시간들을 이 한 권의 책에 고이 남깁니다.'
  );
  const [epilogueEssay, setEpilogueEssay] = useState(
    '계절은 바뀌어도 우리가 함께 나눈 사랑의 온도는 변하지 않습니다. 함께여서 눈부셨던 180일간의 발자취는 이제 우리 마음속 가장 깊은 보물이 되었습니다.\n\n다음 6개월 뒤에도 더 풍성하고 다정한 추억으로 이 자리를 채워나가길 소망하며, 서로의 든든한 버팀목이 되어준 온 가족에게 이 책을 바칩니다.'
  );
  const [aiEssayModalVisible, setAiEssayModalVisible] = useState(false);
  const [targetEssayType, setTargetEssayType] = useState<'prologue' | 'epilogue'>('prologue');
  const [customEssayInput, setCustomEssayInput] = useState('');
  const [isGeneratingAiEssay, setIsGeneratingAiEssay] = useState(false);

  // 주문 관련 폼 상태
  const [orderName, setOrderName] = useState(currentUserProfile?.name || '');
  const [orderPhone, setOrderPhone] = useState(currentUserProfile?.phone || '');
  const [orderPostalCode, setOrderPostalCode] = useState('06234');
  const [orderAddress, setOrderAddress] = useState(currentUserProfile?.address || '');
  const [orderDetailAddress, setOrderDetailAddress] = useState('');
  const [orderShippingMemo, setOrderShippingMemo] = useState('문 앞에 놓아주세요');
  const [orderAddCopy, setOrderAddCopy] = useState(false); // 부모님/선물용 추가 1권 (+12,000원 또는 +12,000 P)
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  const [mobileAddrSearchVisible, setMobileAddrSearchVisible] = useState(false);
  const [mobileAddrKeyword, setMobileAddrKeyword] = useState('');
  const [mobileAddrResults, setMobileAddrResults] = useState<AddressSearchResult[]>([]);
  const [isSearchingMobileAddr, setIsSearchingMobileAddr] = useState(false);

  // 카카오(다음) 공식 우편번호 및 모바일 인앱 도로명 주소 검색 연동
  const handleSearchAddress = () => {
    openAddressSearch(
      ({ zonecode, fullAddress }) => {
        setOrderPostalCode(zonecode);
        setOrderAddress(fullAddress);
      },
      () => {
        setMobileAddrSearchVisible((prev) => !prev);
      }
    );
  };

  const handleRunMobileAddressQuery = async () => {
    const q = mobileAddrKeyword.trim();
    if (!q) {
      Alert.alert('알림', '도로명, 건물명 또는 지번을 입력해 주세요. (예: 테헤란로 152)');
      return;
    }
    setIsSearchingMobileAddr(true);
    try {
      const list = await searchKoreanAddressByKeyword(q);
      setMobileAddrResults(list);
    } finally {
      setIsSearchingMobileAddr(false);
    }
  };

  // DB(family_points)에서 소속 가족의 실시간 포인트 직접 조회 (가족 그룹 단일 진실 공급원)
  const [dbPoints, setDbPoints] = useState<number | null>(null);

  const fetchLatestFamilyPoints = useCallback(async () => {
    const famId = currentUserProfile?.family_id;
    if (!famId || famId === 'default-family') return;
    try {
      const { data, error } = await supabase
        .from('family_points')
        .select('points')
        .eq('family_id', famId)
        .maybeSingle();

      if (!error && data && typeof data.points === 'number') {
        setDbPoints(data.points);
      }
    } catch (e) {
      console.warn('Failed to fetch latest family points from DB:', e);
    }
  }, [currentUserProfile?.family_id]);

  useEffect(() => {
    fetchLatestFamilyPoints();
  }, [fetchLatestFamilyPoints]);

  useEffect(() => {
    if (orderModalVisible) {
      fetchLatestFamilyPoints();
    }
  }, [orderModalVisible, fetchLatestFamilyPoints]);

  // 하이브리드 유연 결제 토크노믹스 (12,000 P 전액 무료 교환 + 부족분 계좌이체)
  const currentFamilyPoints = dbPoints !== null ? dbPoints : (points || 0);
  const targetPoints = orderAddCopy ? PHOTOBOOK_POINT_PRICE + PHOTOBOOK_EXTRA_COPY_POINT : PHOTOBOOK_POINT_PRICE;
  // 보유 포인트 중 최대 targetPoints까지 우선 전액 차감
  const usedPoints = Math.min(currentFamilyPoints, targetPoints);
  // 부족한 차액 (계좌이체 입금 필요 금액, 원 단위)
  const cashDiff = Math.max(0, targetPoints - usedPoints);
  const isFullyCovered = cashDiff === 0;
  const appliedPoints = usedPoints;
  const finalCashPrice = cashDiff;

  // =========================================================
  // 🌐 가족 간 실시간 공동 편집 및 동기화 (Supabase Realtime Sync)
  // =========================================================
  const effectiveFamilyId = currentUserProfile?.family_id || currentUserProfile?.familyCode || 'default-family';
  const currentUserName = currentUserProfile?.name || currentUser || '가족';
  const photobookChannelRef = useRef<any>(null);
  const isApplyingRemoteRef = useRef(false);
  const [lastSyncNotice, setLastSyncNotice] = useState<string | null>(null); // 다른 가족 변경 시 토스트 알림
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // 원격(다른 가족)의 변경 사항을 내 화면 상태에 실시간 주입
  const applyRemotePhotobookUpdate = useCallback((payload: any, targetVolumeId?: string) => {
    if (!payload) return;
    const currentVol = targetVolumeId || selectedVolume;
    // 내가 작업 중인 권차와 다른 권차의 실시간 수정 사항은 현재 화면에 주입하지 않음 (권차 간 화면 오염 방지)
    if (payload.selectedVolume && payload.selectedVolume !== currentVol) {
      return;
    }
    isApplyingRemoteRef.current = true;
    try {
      if (payload.selectedVolume !== undefined) setSelectedVolume(payload.selectedVolume);
      if (payload.selectedThemeId !== undefined) setSelectedThemeId(payload.selectedThemeId);
      if (payload.bookFontFamily !== undefined) setBookFontFamily(payload.bookFontFamily);
      if (payload.bookFontSize !== undefined) setBookFontSize(payload.bookFontSize);
      if (payload.bookTitle !== undefined) setBookTitle(payload.bookTitle);
      if (payload.bookSubtitle !== undefined) setBookSubtitle(payload.bookSubtitle);
      if (payload.coverSignature !== undefined) setCoverSignature(payload.coverSignature);
      if (payload.coverPhoto !== undefined) {
        // 웹 브라우저 환경에서 모바일 로컬 file:/// 경로 수신 시 무시하여 런타임 오류 방지
        if (!(Platform.OS === 'web' && typeof payload.coverPhoto === 'string' && payload.coverPhoto.startsWith('file://'))) {
          setCoverPhoto(payload.coverPhoto);
        }
      }
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
          const validOnly = (payload.customGalleryPhotos as string[]).filter((u: string) => u && (Platform.OS !== 'web' || !u.startsWith('file://')));
          const combined = [...validOnly, ...prev];
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
  }, [currentUserName, selectedVolume]);

  // 내 화면 변경 사항을 가족 채널로 실시간 브로드캐스트 + AsyncStorage 백업
  const broadcastPhotobookChange = useCallback((updatedPartial?: any) => {
    if (isApplyingRemoteRef.current) return;
    const fullPayload = {
      selectedVolume,
      selectedThemeId,
      bookFontFamily,
      bookFontSize,
      bookTitle,
      bookSubtitle,
      coverSignature,
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

    // 로컬 캐시 즉시 저장 (권차별 분리 캐싱으로 다권 데이터 오염 방지)
    const currentVol = updatedPartial?.selectedVolume || selectedVolume || 'vol-1';
    AsyncStorage.setItem(`FAMLINK_PHOTOBOOK_SYNC_${effectiveFamilyId}_${currentVol}`, JSON.stringify(fullPayload)).catch(() => {});

    // Supabase Realtime Broadcast 전송 (가족 기기들에 0.1초 내 실시간 전송)
    if (photobookChannelRef.current) {
      photobookChannelRef.current.send({
        type: 'broadcast',
        event: 'PHOTOBOOK_SYNC',
        payload: fullPayload,
      }).catch(() => {});
    }

    // 4. Supabase DB (family_photobooks) 영구 저장 및 활동 백업 (photobookService 위임)
    if (effectiveFamilyId && effectiveFamilyId !== 'default-family') {
      const currentVol = updatedPartial?.selectedVolume || selectedVolume || 'vol-1';
      saveFamilyPhotobookToDB({
        familyId: effectiveFamilyId,
        volumeId: currentVol,
        payload: fullPayload,
        updatedBy: currentUserName,
      });
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
    coverSignature,
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

  // 특정 권차의 기본 상태 리셋
  const resetVolumeToDefaults = useCallback((volId: string, volObj?: any) => {
    const vObj = volObj || volumeList.find(v => v.id === volId) || VOLUME_OPTIONS.find(v => v.id === volId);
    const volNumMatch = (volId || '').match(/\d+/);
    const volNum = volNumMatch ? volNumMatch[0] : '1';
    const volLabel = vObj?.label || `제${volNum}권`;
    const volTitle = vObj?.title || `Vol. ${volNum}`;
    setBookTitle(`우리 가족의 ${volLabel} 이야기 (${volTitle})`);
    setBookSubtitle('사소한 일상이 모여 만든 가장 눈부신 기적');
    setCoverSignature('우리 가족의 따뜻한 이야기');
    setCoverPhoto(null);
    setCoverStyle('classic');
    setSelectedThemeId('linen');
    setBookFontFamily('serif');
    setBookFontSize('medium');
    setSpreadPhotos({});
    setSpreadLayouts({});
    setSpreadCaptions({});
    setPageFormats({});
    setCustomSpreadTopics({});
  }, [volumeList]);

  // 권차(이야기책) 전환 핸들러
  const handleSwitchVolume = useCallback((volId: string, volObj?: any) => {
    if (volId === selectedVolume) {
      setVolumePickerModalVisible(false);
      return;
    }
    setSelectedVolume(volId);
    setVolumePickerModalVisible(false);
    setCurrentPageNum(0);
    setViewerPageNum(0);

    // 1. 해당 권차의 로컬 캐시 조회
    AsyncStorage.getItem(`FAMLINK_PHOTOBOOK_SYNC_${effectiveFamilyId}_${volId}`)
      .then(saved => {
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            applyRemotePhotobookUpdate(parsed, volId);
            return;
          } catch (e) {}
        }
        resetVolumeToDefaults(volId, volObj);
      })
      .catch(() => {
        resetVolumeToDefaults(volId, volObj);
      });

    // 2. Supabase DB에서 해당 권차 데이터 조회 (photobookService 위임)
    if (effectiveFamilyId && effectiveFamilyId !== 'default-family') {
      fetchFamilyPhotobookVolume(effectiveFamilyId, volId).then((remoteState) => {
        if (remoteState) {
          applyRemotePhotobookUpdate(remoteState, volId);
        } else {
          resetVolumeToDefaults(volId, volObj);
        }
      });
    }
  }, [effectiveFamilyId, selectedVolume, applyRemotePhotobookUpdate, resetVolumeToDefaults]);

  // 새로운 이야기책(권차) 무한 추가
  const handleAddNewVolume = () => {
    const nextNum = volumeList.length + 1;
    const newVolId = `vol-${nextNum}`;
    const newVolObj = {
      id: newVolId,
      title: `Vol. ${nextNum}`,
      label: `제${nextNum}권`,
      period: `${nextNum * 180}일의 기록`,
      desc: `우리 가족 ${nextNum}번째 이야기`,
    };
    setVolumeList(prev => [...prev, newVolObj]);
    handleSwitchVolume(newVolId, newVolObj);
  };

  // 실시간 Supabase 채널 구독 및 초기 캐시 로드
  useEffect(() => {
    if (!effectiveFamilyId) return;

    // 0. 가족이 작성해 둔 모든 권차 목록 조회하여 volumeList에 동적 병합
    if (effectiveFamilyId !== 'default-family') {
      fetchFamilyPhotobookVolumes(effectiveFamilyId).then((rows) => {
        if (rows.length > 0) {
          setVolumeList(prev => {
            const existingIds = new Set(prev.map(v => v.id));
            const additions: any[] = [];
            rows.forEach((row: any) => {
              if (row.volume_id && !existingIds.has(row.volume_id)) {
                const numMatch = row.volume_id.match(/\d+/);
                const num = numMatch ? numMatch[0] : (prev.length + additions.length + 1);
                additions.push({
                  id: row.volume_id,
                  title: `Vol. ${num}`,
                  label: `제${num}권`,
                  period: `${num * 180}일의 기록`,
                  desc: row.title || `우리 가족 ${num}번째 이야기`,
                });
              }
            });
            return additions.length > 0 ? [...prev, ...additions] : prev;
          });
        }
      });
    }

    // 1. AsyncStorage 캐시 불러오기 (해당 권차 캐시)
    AsyncStorage.getItem(`FAMLINK_PHOTOBOOK_SYNC_${effectiveFamilyId}_${selectedVolume}`)
      .then(saved => {
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            applyRemotePhotobookUpdate(parsed, selectedVolume);
          } catch (e) {}
        }
      })
      .catch(() => {});

    // 2. Supabase DB (family_photobooks)에서 최신 원격 설정 조회
    if (effectiveFamilyId !== 'default-family') {
      fetchFamilyPhotobookVolume(effectiveFamilyId, selectedVolume || 'vol-1').then((remoteState) => {
        if (remoteState) {
          applyRemotePhotobookUpdate(remoteState, selectedVolume);
        }
      });
    }

    // 3. Supabase Realtime Broadcast 채널 연결
    const channel = supabase.channel(`family-photobook-${effectiveFamilyId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'PHOTOBOOK_SYNC' }, ({ payload }) => {
        if (payload && payload.selectedVolume === selectedVolume) {
          applyRemotePhotobookUpdate(payload, selectedVolume);
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'family_photobooks',
          filter: `family_id=eq.${effectiveFamilyId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (row && row.volume_id === selectedVolume) {
            applyRemotePhotobookUpdate(mapPhotobookRowToState(row), selectedVolume);
          }
        }
      )
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
  }, [effectiveFamilyId, selectedVolume, applyRemotePhotobookUpdate]);

  // 단일 1:1 페이지 포맷 지정 핸들러 (실시간 브로드캐스트 연동)
  const handleSetPageFormat = (newFormat: string, targetPage: number = currentPageNum) => {
    if (targetPage <= 0) return;
    const sIdx = Math.floor((targetPage - 1) / 2);
    const side = targetPage % 2 === 1 ? 'left' : 'right';
    const key = `${sIdx}_${side}`;
    const nextFormats = { ...pageFormats, [key]: newFormat };
    setPageFormats(nextFormats);
    broadcastPhotobookChange({ pageFormats: nextFormats });
  };

  // 임의의 스프레드 번호에 할당된 사진 목록 반환 헬퍼
  const getSpreadPhotos = (sIdx: number) => {
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
    if (coverPhoto) {
      if (Platform.OS === 'web' && typeof coverPhoto === 'string' && coverPhoto.startsWith('file://')) {
        if (chatPhotos && chatPhotos.length > 0) return chatPhotos[0]?.uri;
        return null;
      }
      return coverPhoto;
    }
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

  const MONTHLY_INTERVIEW_TOPICS = MONTHLY_INTERVIEW_TOPICS_PRESET;

  // 임의의 스프레드 번호에 할당된 3개 인터뷰 질문 및 실제 가족 답변 매칭 헬퍼
  const getSpreadInterviewTopics = (sIdx: number) => {
    const custom = customSpreadTopics[sIdx];
    if (custom && custom.length > 0) return custom;
    const sDef = SPREAD_DEFINITIONS[sIdx] || SPREAD_DEFINITIONS[0];
    const mIdx = sDef.monthIndex !== undefined ? sDef.monthIndex : 0;
    const monthSet = MONTHLY_INTERVIEW_TOPICS[mIdx % MONTHLY_INTERVIEW_TOPICS.length];

    // smallTalkArchiveList에서 일치하는 실제 가족 답변 바인딩
    const enrichedMonthSet = monthSet.map(item => {
      const cleanTopic = stripEmojis(item.topic);
      const matchedArchive = (smallTalkArchiveList || []).find((a: any) => stripEmojis(a.topic) === cleanTopic);
      if (matchedArchive && matchedArchive.answers && matchedArchive.answers.length > 0) {
        const ansMap: Record<string, string> = {};
        matchedArchive.answers.forEach((a: any) => {
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
    return (smallTalkArchiveList as any[]).filter((item: any) => item.isAnswered).length;
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
    const answered = (smallTalkArchiveList as any[]).filter((item: any) => item.isAnswered && Array.isArray(item.answers) && item.answers.length > 0);
    if (answered.length > 0) {
      return answered.slice(0, 2);
    }
    return (smallTalkArchiveList as any[]).slice(0, 2);
  }, [smallTalkArchiveList]);

  // 스몰톡 문답 교체 모달용 연·월(기간) 집계 및 필터링
  const availableArchiveMonths = useMemo(() => {
    const monthMap = new Map<string, { id: string; label: string; year: number; month: number; count: number }>();
    (smallTalkArchiveList || []).forEach((item: any) => {
      const ym = item.yearMonth || (item.date ? String(item.date).slice(0, 7) : '');
      if (ym && ym.includes('-')) {
        const parts = ym.split('-');
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const label = item.yearMonthLabel || `${year}년 ${month}월`;
        const cur = monthMap.get(ym);
        if (cur) {
          cur.count += 1;
        } else {
          monthMap.set(ym, { id: ym, label, year, month, count: 1 });
        }
      }
    });
    return Array.from(monthMap.values()).sort((a, b) => b.id.localeCompare(a.id));
  }, [smallTalkArchiveList]);

  const groupedArchiveYears = useMemo(() => {
    const groups: Record<number, { id: string; label: string; year: number; month: number; count: number }[]> = {};
    availableArchiveMonths.forEach(m => {
      if (!groups[m.year]) groups[m.year] = [];
      groups[m.year].push(m);
    });
    return Object.keys(groups)
      .map(Number)
      .sort((a, b) => b - a)
      .map(year => ({
        year,
        months: groups[year].sort((a, b) => b.month - a.month),
      }));
  }, [availableArchiveMonths]);

  const currentMonthInfo = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const curMonthId = `${curYear}-${String(curMonth + 1).padStart(2, '0')}`;
    const curMatch = availableArchiveMonths.find((m) => m.id === curMonthId);
    return {
      id: curMonthId,
      label: `현재달 (${curMonth + 1}월)`,
      year: curYear,
      month: curMonth + 1,
      count: curMatch ? curMatch.count : 0,
    };
  }, [availableArchiveMonths]);

  const selectedArchiveMonthLabel = useMemo(() => {
    if (selectedArchiveMonth === 'all') return '전체 기간';
    const found = availableArchiveMonths.find(m => m.id === selectedArchiveMonth);
    return found ? found.label : selectedArchiveMonth;
  }, [selectedArchiveMonth, availableArchiveMonths]);

  const filteredArchiveList = useMemo(() => {
    return (smallTalkArchiveList || []).filter((item: any) => {
      if (selectedArchiveMonth !== 'all') {
        const ym = item.yearMonth || (item.date ? String(item.date).slice(0, 7) : '');
        if (ym !== selectedArchiveMonth) return false;
      }
      if (topicSearchQuery.trim()) {
        const query = topicSearchQuery.trim().toLowerCase();
        const topicText = (item.topic || '').toLowerCase();
        return topicText.includes(query);
      }
      return true;
    });
  }, [smallTalkArchiveList, selectedArchiveMonth, topicSearchQuery]);

  // 7. 레이아웃 셔플 핸들러 (15×15 스퀘어 4대 조판 템플릿)
  const handleShuffleLayout = () => {
    const layouts = ['single', 'wide', 'grid', 'polaroid'];
    const currentIdx = layouts.indexOf(currentLayout);
    const nextLayout = layouts[(currentIdx + 1) % layouts.length];
    setSpreadLayouts(prev => ({ ...prev, [currentSpreadIndex]: nextLayout }));
  };

  const CAPTION_PRESETS = CAPTION_PRESETS_POOL;

  // AI 프롤로그(P.1) & 에필로그(P.16) 문학 에세이 실시간 집필 (geminiService 위임)
  const handleGenerateAiEssay = async (type: 'prologue' | 'epilogue' = targetEssayType) => {
    setIsGeneratingAiEssay(true);

    const topicSnippets: string[] = [];
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
    const essayText = await generatePhotobookEssay({
      type,
      memberNames,
      topicSnippets,
    });

    setCustomEssayInput(essayText);
    setIsGeneratingAiEssay(false);
  };

  const handleOpenAiEssayModal = (type: 'prologue' | 'epilogue') => {
    setTargetEssayType(type);
    if (type === 'prologue') {
      setCustomEssayInput(prologueEssay);
    } else {
      setCustomEssayInput(epilogueEssay);
    }
    setAiEssayModalVisible(true);
  };

  const handleApplyAiEssay = (textToApply?: string) => {
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
  const handleOpenPhotoPicker = (slotIdx: number | 'cover') => {
    setActivePhotoSlotIndex(slotIdx);
    setPhotoPickerVisible(true);
  };

  const handleSelectPhoto = (photoUri: string) => {
    if (activePhotoSlotIndex === 'cover') {
      setCoverPhoto(photoUri);
      setPhotoPickerVisible(false);
      // 로컬 파일 경로(file://)는 다른 가족 기기(PC 등)에서 열 수 없으므로 브로드캐스트하지 않음
      if (photoUri && !photoUri.startsWith('file://')) {
        broadcastPhotobookChange({ coverPhoto: photoUri });
      }
      return;
    }
    const currentPhotos = getSpreadPhotos(currentSpreadIndex);
    const updated = [...(spreadPhotos[currentSpreadIndex] || currentPhotos)];
    updated[activePhotoSlotIndex] = photoUri;
    const nextSpreadPhotos = { ...spreadPhotos, [currentSpreadIndex]: updated };
    setSpreadPhotos(nextSpreadPhotos);
    setPhotoPickerVisible(false);
    if (photoUri && !photoUri.startsWith('file://')) {
      broadcastPhotobookChange({ spreadPhotos: nextSpreadPhotos });
    }
  };

  // 9-1. 본인 기기 사진첩(갤러리)에서 직접 사진 불러오기 (크로스 디바이스 클라우드 동기화 지원)
  const [isUploadingGalleryPhoto, setIsUploadingGalleryPhoto] = useState(false);

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
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const localPickedUri = asset.uri;

        setIsUploadingGalleryPhoto(true);

        // 1. 현재 사용자 기기 화면에만 즉각 반영 (원격 가족에게는 업로드 완료 후 정규 https:// URL로 전송)
        if (activePhotoSlotIndex === 'cover') {
          setCoverPhoto(localPickedUri);
          setPhotoPickerVisible(false);
        } else {
          const currentPhotos = getSpreadPhotos(currentSpreadIndex);
          const updated = [...(spreadPhotos[currentSpreadIndex] || currentPhotos)];
          updated[activePhotoSlotIndex] = localPickedUri;
          setSpreadPhotos({ ...spreadPhotos, [currentSpreadIndex]: updated });
          setPhotoPickerVisible(false);
        }

        // 2. 다른 가족 기기(PC, 다른 스마트폰)에서도 열릴 수 있도록 Supabase Storage 업로드 시도
        let cloudPhotoUrl = null;
        try {
          if (effectiveFamilyId && effectiveFamilyId !== 'default-family' && asset.base64) {
            const fileName = `${effectiveFamilyId}/photobook_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;

            // 크로스 플랫폼 바이너리 바이트 변환 (React Native & Web 호환)
            const cleanB64 = asset.base64.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/, '');
            const binary = atob(cleanB64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }

            const { error: uploadError } = await supabase.storage
              .from('family-photos')
              .upload(fileName, bytes, {
                cacheControl: '3600',
                upsert: true,
                contentType: 'image/jpeg',
              });

            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('family-photos')
                .getPublicUrl(fileName);
              if (publicUrl) cloudPhotoUrl = publicUrl;
            } else {
              console.warn('⚠️ Supabase Storage 업로드 오류 (버킷 및 정책 확인 필요):', uploadError.message);
            }
          }
        } catch (uploadErr) {
          console.warn('⚠️ 포토북 사진 클라우드 변환 안내:', uploadErr);
        } finally {
          setIsUploadingGalleryPhoto(false);
        }

        // 3. 클라우드 URL 생성 성공 시 원격 가족 브로드캐스트 + DB 동기화
        if (cloudPhotoUrl) {
          const nextList = [cloudPhotoUrl, ...customGalleryPhotos.filter(u => u && !u.startsWith('file://') && u !== cloudPhotoUrl)];
          setCustomGalleryPhotos(nextList);
          if (activePhotoSlotIndex === 'cover') {
            setCoverPhoto(cloudPhotoUrl);
            broadcastPhotobookChange({
              customGalleryPhotos: nextList,
              coverPhoto: cloudPhotoUrl,
            });
          } else {
            const currentPhotos = getSpreadPhotos(currentSpreadIndex);
            const updated = [...(spreadPhotos[currentSpreadIndex] || currentPhotos)];
            updated[activePhotoSlotIndex] = cloudPhotoUrl;
            const nextSpreadPhotos = { ...spreadPhotos, [currentSpreadIndex]: updated };
            setSpreadPhotos(nextSpreadPhotos);
            broadcastPhotobookChange({
              customGalleryPhotos: nextList,
              spreadPhotos: nextSpreadPhotos,
            });
          }
        }
      }
    } catch (err) {
      setIsUploadingGalleryPhoto(false);
      console.warn('사진첩 선택 오류:', err);
      Alert.alert('오류', '사진첩에서 사진을 가져오는 중 오류가 발생했습니다.');
    }
  };

  // 9-2. 사진첩에서 가져온 사진 목록에서 삭제하기
  const handleDeleteCustomPhoto = (targetUri: string) => {
    Alert.alert(
      '사진 삭제',
      '사진첩 등록 목록에서 이 사진을 삭제하시겠습니까?\n(이미 포토북 페이지에 수록된 사진은 유지됩니다)',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            const nextList = customGalleryPhotos.filter(u => u !== targetUri);
            setCustomGalleryPhotos(nextList);
            broadcastPhotobookChange({ customGalleryPhotos: nextList });
          },
        },
      ]
    );
  };

  // 10. 주문 완료 처리 (하이브리드: 12,000 P 무료 교환 또는 포인트 할인 + 차액 계좌이체)
  const handleExecuteOrder = async () => {
    if (!orderName.trim() || !orderPhone.trim() || !orderAddress.trim()) {
      Alert.alert('알림', '받는 분 성함, 연락처, 배송지 주소를 모두 입력해주세요.');
      return;
    }

    setIsSubmittingOrder(true);

    const orderDateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ORD-${orderDateStr}-${randomSuffix}`;

    const bookSnapshot = {
      volume_id: selectedVolume || 'vol-1',
      title: bookTitle || '우리 가족 이야기',
      subtitle: bookSubtitle || '',
      cover_photo_url: effectiveCoverPhoto || null,
      cover_signature: coverSignature || '',
      cover_style: coverStyle || 'classic',
      theme_id: selectedThemeId || 'linen',
      font_family: bookFontFamily || 'serif',
      font_size: bookFontSize || 'medium',
      spread_photos: spreadPhotos || {},
      spread_layouts: spreadLayouts || {},
      page_formats: pageFormats || {},
      spread_captions: spreadCaptions || {},
      custom_spread_topics: customSpreadTopics || {},
      prologue_essay: prologueEssay || '',
      epilogue_essay: epilogueEssay || '',
      ordered_by: currentUserName,
      ordered_at: new Date().toISOString(),
    };

      const fullShippingAddress = orderDetailAddress.trim()
        ? `${orderAddress.trim()} ${orderDetailAddress.trim()}`
        : orderAddress.trim();

      const isValidUUID = (val?: string | null) =>
        typeof val === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

      const targetFamilyId = isValidUUID(currentUserProfile?.family_id) ? (currentUserProfile?.family_id ?? null) : null;
      const targetProfileId = isValidUUID(currentUserProfile?.id) ? (currentUserProfile?.id ?? null) : null;

      const orderRecord = {
        family_id: targetFamilyId,
        profile_id: targetProfileId,
        volume_id: selectedVolume || 'vol-1',
        order_number: orderNumber,
        book_title: bookTitle || '우리 가족 이야기',
        cover_type: coverStyle === 'hardcover' ? '하드커버 (양장본)' : (coverStyle === 'softcover' ? '소프트커버' : '양장본'),
        page_count: TOTAL_PHOTOBOOK_PAGES || 16,
        recipient_name: orderName.trim(),
        recipient_phone: orderPhone.trim(),
        postal_code: orderPostalCode.trim() || '06234',
        shipping_address: fullShippingAddress,
        shipping_memo: orderShippingMemo.trim() || '문 앞 배송 부탁드립니다',
        book_snapshot: bookSnapshot,
        status: isFullyCovered ? 'pending' : 'pending_payment',
      };

      // Supabase photobook_orders 테이블에 주문 데이터 INSERT (photobookService 위임)
      await createPhotobookOrderInDB(orderRecord);

      setTimeout(() => {
        setIsSubmittingOrder(false);
        setOrderModalVisible(false);

        if (onDeductPoints && usedPoints > 0) {
          onDeductPoints(usedPoints, `실물 포토북 ${orderAddCopy ? '2권' : '1권'} ${isFullyCovered ? '100% 무료 교환' : '포인트 차감 주문'}`);
          setDbPoints((prev) => (prev !== null ? Math.max(0, prev - usedPoints) : null));
        }

        if (onSendOrderNotice) {
          const orderPayload = {
            orderNumber,
            bookTitle,
            volume: selectedVolume,
            copies: orderAddCopy ? 2 : 1,
            totalPrice: cashDiff,
            pointsUsed: usedPoints,
            recipient: orderName.trim(),
            address: fullShippingAddress,
            postalCode: orderPostalCode.trim() || '06234',
          };
          onSendOrderNotice(`[포토북카드] ${JSON.stringify(orderPayload)}`);
        }

      if (isFullyCovered) {
        Alert.alert(
          '양장본 실물 포토북 무료 교환 완료! 📦',
          `[${bookTitle}] 총 ${orderAddCopy ? '2권 (선물용 1권 포함)' : '1권'}이 인쇄 제작에 들어갑니다.\n\n• 주문번호: ${orderNumber}\n• 가족 포인트 사용: -${usedPoints.toLocaleString()} P (100% 전액 교환)\n• 실결제 금액: 0원 (무료 배송)\n• 정밀 POD 인쇄 (150×210mm A5 클래식 16P 랑데뷰 160g 양장본)\n• 예상 배송일: 영업일 기준 3~4일 이내`,
          [{ text: '확인' }]
        );
      } else {
        Alert.alert(
          '양장본 인쇄 주문 접수 완료 (입금 대기) 📦',
          `[${bookTitle}] 총 ${orderAddCopy ? '2권 (선물용 1권 포함)' : '1권'} 주문이 접수되었습니다.\n\n• 주문번호: ${orderNumber}\n• 가족 포인트 할인: -${usedPoints.toLocaleString()} P\n• 입금하실 금액: ${cashDiff.toLocaleString()}원 (배송비 무료)\n• 입금 계좌: 카카오뱅크 3333-28-5683901 (예금주: FamLink)\n• 입금자명: ${orderName.trim()}\n\n입금 확인 즉시 정밀 POD 양장본 인쇄 제작이 시작됩니다! ✨`,
          [{ text: '확인' }]
        );
      }
    }, 1000);
  };

  // =========================================================
  // 📘 겉표지 렌더러 (3대 표지 스타일: classic, full, minimal)
  // =========================================================
  const renderCoverPage = (isFull = false, isViewer = false) => {
    const isCompactCanvas = !isViewer && a5CanvasHeight < 410;
    const isCompactViewer = isViewer && isCompactViewerHeight;

    // 모바일 캔버스 높이에 맞춘 대표 사진 액자 반응형 크기 산출
    const photoBoxWidth = isViewer
      ? (isCompactViewer ? 135 : 165)
      : isFull
        ? (isCompactCanvas ? 105 : 130)
        : 90;
    const photoBoxHeight = isViewer
      ? (isCompactViewer ? 145 : 180)
      : isFull
        ? (isCompactCanvas ? 115 : 145)
        : 100;

    return (
      <View style={[styles.coverPageContent, { backgroundColor: currentTheme.bg }]}>
        {/* 책등 스파인 효과 라인 */}
        <View style={[styles.coverSpineBand, { backgroundColor: currentTheme.accent }]} />

        <View style={[styles.coverInnerSurface, (isCompactCanvas || isCompactViewer) && { paddingVertical: 2 }]}>
          {coverStyle === 'classic' && (
            <View style={[styles.coverClassicContainer, (isCompactCanvas || isCompactViewer) && { padding: 4 }]}>
              <View style={[styles.coverEmbossFrame, (isCompactCanvas || isCompactViewer) && { paddingVertical: 6, paddingHorizontal: 6 }]}>
                <Text style={[styles.coverKickerBadge, { color: currentTheme.accent, ...fontStyle }, (isCompactCanvas || isCompactViewer) && { fontSize: 6.8 }]}>
                  FAMLINK FAMILY STORYBOOK · 150×210MM A5
                </Text>
                <TouchableOpacity
                  onPress={handleOpenEditTitleModal}
                  activeOpacity={0.75}
                  style={{ alignItems: 'center' }}
                >
                  <Text
                    style={[
                      styles.coverMainTitle,
                      {
                        color: currentTheme.text,
                        ...fontStyle,
                        fontSize: Math.round((isViewer ? (isCompactViewer ? 17 : 20) : isFull ? (isCompactCanvas ? 15 : 17) : 13) * fontScale),
                        lineHeight: Math.round((isViewer ? (isCompactViewer ? 22 : 26) : isFull ? (isCompactCanvas ? 19 : 22) : 17) * fontScale),
                      }
                    ]}
                    numberOfLines={2}
                  >
                    {bookTitle}
                  </Text>
                  <Text
                    style={[
                      styles.coverSubTitle,
                      {
                        color: currentTheme.accent,
                        ...fontStyle,
                        fontSize: Math.round((isViewer ? (isCompactViewer ? 10.5 : 12) : isFull ? (isCompactCanvas ? 9.5 : 11) : 8.5) * fontScale),
                        marginBottom: (isCompactCanvas || isCompactViewer) ? 2 : 5,
                      }
                    ]}
                    numberOfLines={1}
                  >
                    {bookSubtitle}
                  </Text>
                </TouchableOpacity>

                {/* 중앙 정방형 대표 사진 액자 */}
                <TouchableOpacity
                  style={[styles.coverPhotoFrameBox, { width: photoBoxWidth, height: photoBoxHeight }]}
                  onPress={() => handleOpenPhotoPicker('cover')}
                  activeOpacity={0.85}
                >
                  {effectiveCoverPhoto ? (
                    <Image source={{ uri: effectiveCoverPhoto }} style={styles.coverPhotoImg} resizeMode="cover" />
                  ) : (
                    <View style={styles.coverPhotoEmptyPlaceholder}>
                      <Camera size={isCompactCanvas ? 22 : 26} color={currentTheme.accent} />
                      <Text style={[styles.coverPhotoEmptyText, { color: currentTheme.accent }, isCompactCanvas && { fontSize: 8.5 }]}>표지 사진</Text>
                    </View>
                  )}
                  <View style={styles.coverPhotoBadge}>
                    <Text style={[styles.coverPhotoBadgeText, isCompactCanvas && { fontSize: 7.5 }]}>대표 사진 📸</Text>
                  </View>
                </TouchableOpacity>

                {/* 하단 서명 및 양장제본 각주 영역 (터치 시 서명 편집 연동) */}
                <TouchableOpacity
                  style={styles.coverFooterArea}
                  onPress={handleOpenEditTitleModal}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.coverFamilySignature,
                      {
                        color: currentTheme.text,
                        ...fontStyle,
                        fontSize: Math.round((isCompactCanvas ? 8.5 : 9.5) * fontScale),
                      }
                    ]}
                    numberOfLines={1}
                  >
                    {coverSignature || '우리 가족의 따뜻한 이야기'}
                  </Text>
                  <Text style={[styles.coverHardcoverFootnote, (isCompactCanvas || isCompactViewer) && { fontSize: 7, marginTop: 1 }]}>
                    16P Hardcover 양장제본 · 랑데뷰 160g
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {coverStyle === 'full' && (
            <TouchableOpacity
              style={styles.coverFullPhotoContainer}
              onPress={() => handleOpenPhotoPicker('cover')}
              activeOpacity={0.88}
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
              <TouchableOpacity
                style={styles.coverFullPhotoOverlay}
                onPress={handleOpenEditTitleModal}
                activeOpacity={0.8}
              >
                <Text style={[styles.coverFullTitle, { ...fontStyle, fontSize: Math.round((isViewer ? 20 : isFull ? 17 : 14) * fontScale) }]} numberOfLines={2}>
                  {bookTitle}
                </Text>
                <Text style={[styles.coverFullSub, { ...fontStyle, fontSize: Math.round((isViewer ? 12 : 10.5) * fontScale) }]} numberOfLines={1}>
                  {bookSubtitle}
                </Text>
              </TouchableOpacity>
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
                <Heart size={isCompactCanvas ? 22 : 28} color={currentTheme.accent} style={{ marginBottom: isCompactCanvas ? 8 : 12 }} />
                <TouchableOpacity
                  onPress={handleOpenEditTitleModal}
                  activeOpacity={0.75}
                  style={{ alignItems: 'center' }}
                >
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
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={handleOpenEditTitleModal}
                activeOpacity={0.75}
                style={{ alignItems: 'center' }}
              >
                <Text style={[styles.coverFamilySignature, { color: currentTheme.text, ...fontStyle }, isCompactCanvas && { fontSize: 8.5 }]}>
                  {coverSignature || '우리 가족의 따뜻한 이야기'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  // =========================================================
  // 📖 통합 페이지 렌더러 (3대 포맷 & 폰트/크기 완벽 반영)
  // =========================================================
  const renderPage = (sIdx: number, side: 'left' | 'right', isFull = false, isViewer = false) => {
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

            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
              <TouchableOpacity
                style={styles.editTitleMiniBtn}
                onPress={handleOpenEditTitleModal}
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

          <TouchableOpacity
            style={[styles.editTitleMiniBtn, { backgroundColor: '#FFF5F2', borderColor: '#FFD5CC', alignSelf: 'flex-start', marginVertical: 6 }]}
            onPress={() => handleOpenAiEssayModal('epilogue')}
            activeOpacity={0.7}
          >
            <Sparkles size={11} color="#FF6B47" style={{ marginRight: 4 }} />
            <Text style={[styles.editTitleMiniBtnText, { color: '#FF6B47', fontWeight: '800' }]}>AI 에필로그 집필</Text>
          </TouchableOpacity>

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
                onPress={() => {
                  setCurrentPageNum(pageNum);
                  handleOpenPhotoPicker(photoSlotIndex);
                }}
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
                onPress={() => {
                  setCurrentPageNum(pageNum);
                  handleOpenPhotoPicker(photoSlotIndex + 1);
                }}
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
              onPress={() => {
                setCurrentPageNum(pageNum);
                handleOpenPhotoPicker(photoSlotIndex);
              }}
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
            {displayTopics.map((item: any, qIdx: number) => (
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
                  setCurrentPageNum(pageNum);
                  setSelectedTopicSlot(qIdx);
                  setTopicPickerModalVisible(true);
                }}
                activeOpacity={0.78}
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
                  <View style={styles.bookQnaEditBadge}>
                    <RotateCcw size={8} color="#FF6B47" style={{ marginRight: 2 }} />
                    <Text style={styles.bookQnaEditBadgeText}>교체</Text>
                  </View>
                </View>

                {/* 가족 답변 단락 (단행본 인쇄 스타일 화자 라벨 + 본문) */}
                <View style={[styles.bookAnswersEditorialBox, isCompactViewer && { gap: 1.5, paddingTop: 2 }]}>
                  {activeFamilyList.length === 0 ? (
                    <Text style={[styles.bookAnswerQuotes, { color: '#A8A29E', ...fontStyle, fontSize: Math.round(aFontSize * fontScale), fontStyle: 'italic', paddingVertical: 4 }]}>
                      가족 구성원을 등록하여 함께 답변을 남겨보세요.
                    </Text>
                  ) : (
                    activeFamilyList.slice(0, maxMembersPerQuestion).map(m => {
                      const ansText = (m.id && item.answers?.[m.id]) || (m.profileId && item.answers?.[m.profileId]) || (m.name && item.answers?.[m.name]) || m.answer || '';
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
          onPress={() => {
            setCurrentPageNum(pageNum);
            handleOpenPhotoPicker(photoSlotIndex);
          }}
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

        {/* 하단 스몰톡 영역 (도서 본문 스타일 - 터치 시 질문 교체) */}
        <TouchableOpacity
          style={styles.hybridTalkBox}
          onPress={() => {
            setCurrentPageNum(pageNum);
            setSelectedTopicSlot(0);
            setTopicPickerModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.hybridTalkHeader}>
            <Text style={[styles.hybridTopicText, { ...fontStyle, fontSize: Math.round((isViewer ? 12 : 10.5) * fontScale), color: currentTheme.text, flex: 1, marginRight: 4 }]} numberOfLines={1}>
              ❝ {coreTopic.topic} ❞
            </Text>
            <View style={styles.bookQnaEditBadge}>
              <RotateCcw size={7.5} color="#FF6B47" style={{ marginRight: 2 }} />
              <Text style={styles.bookQnaEditBadgeText}>교체</Text>
            </View>
          </View>
          <View style={styles.hybridAnswersList}>
            {activeFamilyList.length === 0 ? (
              <Text style={{ fontSize: 9, color: '#A8A29E', fontStyle: 'italic', paddingVertical: 2 }}>가족 구성원 답변 대기 중</Text>
            ) : (
              activeFamilyList.slice(0, 2).map(m => {
                const ans = (m.id && coreTopic.answers?.[m.id]) || (m.profileId && coreTopic.answers?.[m.profileId]) || (m.name && coreTopic.answers?.[m.name]) || m.answer || '';
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

  // =========================================================
  // 🪟 재사용 모달 콘텐츠 렌더러 (일반 편집 & 전체화면 뷰어 공용)
  // =========================================================
  const renderPhotoPickerContent = () => (
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
            <View style={{ width: '100%', marginBottom: 18 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.photoTraySectionTitle}>
                  📱 사진첩에서 가져온 사진 ({customGalleryPhotos.length}장)
                </Text>
                <Text style={{ fontSize: 11, color: '#A8A29E', fontWeight: '600' }}>
                  ✕ 버튼으로 삭제 가능
                </Text>
              </View>
              <View style={styles.photoTrayGridRow}>
                {customGalleryPhotos
                  .filter(uri => !(Platform.OS === 'web' && typeof uri === 'string' && uri.startsWith('file://')))
                  .map((uri, idx) => (
                  <View key={`custom-${idx}`} style={styles.gridThumbBox}>
                    <TouchableOpacity
                      style={{ width: '100%', height: '100%' }}
                      onPress={() => handleSelectPhoto(uri)}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri }} style={styles.gridThumbImage} resizeMode="cover" />
                    </TouchableOpacity>

                    {/* 우측 상단 삭제 (✕) 배지 버튼 */}
                    <TouchableOpacity
                      style={styles.deletePhotoBadgeBtn}
                      onPress={() => handleDeleteCustomPhoto(uri)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <X size={11} color="#FFFFFF" strokeWidth={2.8} />
                    </TouchableOpacity>
                  </View>
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
  );

  const renderVolumePickerContent = () => (
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
          {volumeList.map((v, idx) => {
            const isSelected = selectedVolume === v.id;
            return (
              <TouchableOpacity
                key={v.id}
                style={[styles.volumeOptionCard, isSelected && styles.volumeOptionCardActive]}
                onPress={() => handleSwitchVolume(v.id, v)}
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

          {/* ➕ 새 권차(이야기책) 추가하기 버튼 */}
          <TouchableOpacity
            style={styles.addVolumeCtaBtn}
            onPress={handleAddNewVolume}
            activeOpacity={0.85}
          >
            <Plus size={16} color="#FF6B47" strokeWidth={2.5} style={{ marginRight: 6 }} />
            <Text style={styles.addVolumeCtaText}>새 이야기책(권차) 추가하기</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );

  const renderOrderModalContent = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.modalBackdrop}
    >
      <View style={styles.orderSheetCard}>
        <View style={styles.sheetHeader}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.sheetTitle}>실물 양장 하드커버 도서 발주</Text>
            <Text style={styles.sheetSub}>
              {isFullyCovered
                ? '온 가족이 모은 12,000 P로 소중한 기록을 100% 무료 제작합니다.'
                : '보유 포인트를 전액 할인받고, 남은 차액만 계좌이체로 결제해 바로 제작합니다.'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setOrderModalVisible(false)} style={styles.closeBtn}>
            <X size={20} color="#1C1917" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.orderFormScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 도서 명세 요약 */}
          <View style={styles.orderSummaryCard}>
            <Text style={styles.orderBookTitle}>{bookTitle}</Text>
            <Text style={styles.orderBookSub}>
              150×210mm A5 세로형 · 16페이지 · 무광 하드커버 양장제본 · 세네카 책등 4mm 인쇄
            </Text>
            <View style={styles.priceDivider} />
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>기본 1권 정가:</Text>
              <Text style={[styles.priceVal, { color: colors.primary, fontWeight: '800' }]}>
                {PHOTOBOOK_POINT_PRICE.toLocaleString()}원 (또는 {PHOTOBOOK_POINT_PRICE.toLocaleString()} P)
              </Text>
            </View>
          </View>

          {/* 🌟 가족 활동 포인트 현황 카드 (DB 실시간 동기화) */}
          <View style={styles.pointsDiscountCard}>
            <View style={styles.pointsHeaderRow}>
              <View style={styles.pointsTitleGroup}>
                <Award size={16} color="#059669" style={{ marginRight: 6 }} />
                <Text style={styles.pointsTitleText}>온 가족 활동 포인트 (DB 실시간)</Text>
              </View>
              <View style={styles.holdingPointsBadge}>
                <Text style={styles.holdingPointsBadgeText}>
                  보유 {currentFamilyPoints.toLocaleString()} P
                </Text>
              </View>
            </View>

            {isFullyCovered ? (
              <View
                style={[
                  styles.pointsApplyBtn,
                  { borderColor: '#059669', backgroundColor: '#ECFDF5' },
                ]}
              >
                <View
                  style={[
                    styles.pointsCheckSquare,
                    { backgroundColor: '#059669', borderColor: '#059669' },
                  ]}
                >
                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.pointsApplyTitle}>
                    100% 무료 교환 가능 ✨
                  </Text>
                  <Text style={styles.pointsApplySub}>
                    가족 포인트 -{usedPoints.toLocaleString()} P가 전액 적용되어 실결제 금액은 0원(무료 배송)입니다!
                  </Text>
                </View>
                <Text style={[styles.pointsDiscountAmt, { color: '#059669', fontWeight: '800' }]}>
                  -{usedPoints.toLocaleString()} P
                </Text>
              </View>
            ) : (
              <View style={[styles.pointsApplyBtn, { borderColor: '#FDBA74', backgroundColor: '#FFF7ED' }]}>
                <View style={[styles.pointsCheckSquare, { backgroundColor: '#EA580C', borderColor: '#EA580C' }]}>
                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.pointsApplyTitle, { color: '#C2410C' }]}>
                    보유 {usedPoints.toLocaleString()} P 전액 할인 적용 ✨
                  </Text>
                  <Text style={[styles.pointsApplySub, { color: '#9A3412' }]}>
                    {usedPoints > 0
                      ? `보유한 포인트 ${usedPoints.toLocaleString()} P를 전액 할인받고, 남은 차액 ${cashDiff.toLocaleString()}원만 계좌이체로 결제하여 바로 제작할 수 있어요!`
                      : `보유 포인트가 없어도 전액 계좌이체(${cashDiff.toLocaleString()}원)로 지금 바로 실물 책을 주문할 수 있어요!`}
                  </Text>
                </View>
                {usedPoints > 0 && (
                  <Text style={[styles.pointsDiscountAmt, { color: '#C2410C', fontWeight: '800' }]}>
                    -{usedPoints.toLocaleString()}원
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* 추가 옵션: 조부모님/선물용 1권 추가 (+12,000원 / +12,000 P) */}
          <TouchableOpacity
            style={[styles.addCopyBox, orderAddCopy && styles.addCopyBoxActive]}
            onPress={() => setOrderAddCopy(!orderAddCopy)}
            activeOpacity={0.85}
          >
            <View style={styles.addCopyCheckbox}>
              {orderAddCopy && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                <Text style={styles.addCopyTitle}>부모님/조부모님 선물용 +1권 추가</Text>
                <View style={[styles.discountBadge, { backgroundColor: '#FFF5F2', borderColor: '#FFE8E0', borderWidth: 1 }]}>
                  <Text style={[styles.discountBadgeText, { color: colors.primary }]}>선물용</Text>
                </View>
              </View>
              <Text style={styles.addCopySub}>
                추가 1권도 동일하게 +{PHOTOBOOK_EXTRA_COPY_POINT.toLocaleString()}원(또는 포인트)으로 함께 제작합니다.
              </Text>
            </View>
            <Text style={[styles.addCopyPriceText, { color: colors.primary }]}>
              +{PHOTOBOOK_EXTRA_COPY_POINT.toLocaleString()}원
            </Text>
          </TouchableOpacity>

          {/* 총 결제 예정 금액 배너 */}
          <View style={styles.totalPriceBanner}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.totalPriceLabel}>
                {isFullyCovered ? '총 교환 소모 포인트:' : '최종 실결제 금액 (배송비 무료):'}
              </Text>
              <Text style={styles.totalPriceSubNotice}>
                {isFullyCovered
                  ? '실제 결제할 현금: 0원 (전액 무료 교환 ✨)'
                  : usedPoints > 0
                  ? `(가족 포인트 -${usedPoints.toLocaleString()}P 전액 할인 적용됨 ✨)`
                  : '(배송비 무료 포함)'}
              </Text>
            </View>
            <Text style={[styles.totalPriceNumber, { color: colors.primary }]}>
              {isFullyCovered
                ? `${usedPoints.toLocaleString()} P (0원)`
                : `${cashDiff.toLocaleString()}원`}
            </Text>
          </View>

          {/* 계좌이체 입금 안내 카드 (차액이 있을 경우에만 표시) */}
          {cashDiff > 0 && (
            <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Info size={14} color="#475569" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E293B' }}>
                  계좌이체 입금 안내 (인쇄비 지원)
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: '#334155', fontWeight: '700', marginTop: 2 }}>
                카카오뱅크 3333-28-5683901 (FamLink)
              </Text>
              <Text style={{ fontSize: 11, color: '#64748B', marginTop: 3, lineHeight: 15 }}>
                • 입금자명을 아래 받는 분 성함('{orderName.trim() || '홍길동'}')과 동일하게 입금해 주시면 확인 후 즉시 제작에 들어갑니다.
              </Text>
            </View>
          )}

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

          <Text style={styles.formInputLabel}>우편번호</Text>
          <View style={styles.addressRow}>
            <TextInput
              style={[styles.formInput, { flex: 1, marginBottom: 0 }]}
              value={orderPostalCode}
              onChangeText={setOrderPostalCode}
              placeholder="우편번호 (예: 06234)"
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={styles.addressSearchBtn}
              onPress={handleSearchAddress}
              activeOpacity={0.8}
            >
              <Search size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.addressSearchBtnText}>주소 검색</Text>
            </TouchableOpacity>
          </View>

          {/* 📱 모바일 앱 전용 인앱 도로명·우편번호 실시간 검색창 */}
          {mobileAddrSearchVisible && (
            <View
              style={{
                backgroundColor: '#FFF5F2',
                borderWidth: 1,
                borderColor: '#FFE8E0',
                borderRadius: 12,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#C2410C' }}>
                  🔍 도로명 · 지번 · 아파트명 검색
                </Text>
                <TouchableOpacity onPress={() => setMobileAddrSearchVisible(false)}>
                  <X size={15} color="#78716C" />
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  style={[styles.formInput, { flex: 1, marginBottom: 0, backgroundColor: '#FFFFFF', height: 42 }]}
                  value={mobileAddrKeyword}
                  onChangeText={setMobileAddrKeyword}
                  placeholder="예: 테헤란로 152, 판교역로 166"
                  returnKeyType="search"
                  onSubmitEditing={handleRunMobileAddressQuery}
                />
                <TouchableOpacity
                  style={[styles.addressSearchBtn, { height: 42, paddingHorizontal: 14 }]}
                  onPress={handleRunMobileAddressQuery}
                  disabled={isSearchingMobileAddr}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addressSearchBtnText}>
                    {isSearchingMobileAddr ? '검색중' : '찾기'}
                  </Text>
                </TouchableOpacity>
              </View>

              {mobileAddrResults.length > 0 && (
                <View style={{ marginTop: 10, maxHeight: 190 }}>
                  {mobileAddrResults.slice(0, 5).map((item, idx) => (
                    <TouchableOpacity
                      key={`${item.zonecode}-${idx}`}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 10,
                        paddingVertical: 9,
                        paddingHorizontal: 11,
                        marginBottom: 6,
                        borderWidth: 1,
                        borderColor: '#F5F0E8',
                      }}
                      onPress={() => {
                        setOrderPostalCode(item.zonecode);
                        setOrderAddress(item.fullAddress);
                        setMobileAddrSearchVisible(false);
                      }}
                      activeOpacity={0.75}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <View
                          style={{
                            backgroundColor: '#FF6B47',
                            borderRadius: 4,
                            paddingHorizontal: 5,
                            paddingVertical: 1,
                            marginRight: 6,
                          }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>
                            {item.zonecode}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1C1917', flex: 1 }} numberOfLines={1}>
                          {item.fullAddress}
                        </Text>
                      </View>
                      {Boolean(item.jibunAddress) && (
                        <Text style={{ fontSize: 10, color: '#78716C' }} numberOfLines={1}>
                          지번: {item.jibunAddress}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          <Text style={styles.formInputLabel}>배송지 기본 주소</Text>
          <TextInput
            style={styles.formInput}
            value={orderAddress}
            onChangeText={setOrderAddress}
            placeholder="주소 검색 버튼을 눌러 주소를 선택하세요"
          />

          <Text style={styles.formInputLabel}>상세 주소 (동·호수 등)</Text>
          <TextInput
            style={styles.formInput}
            value={orderDetailAddress}
            onChangeText={setOrderDetailAddress}
            placeholder="상세 주소를 입력하세요 (예: 101동 1204호)"
          />

          <Text style={styles.formInputLabel}>배송 요청사항</Text>
          <TextInput
            style={styles.formInput}
            value={orderShippingMemo}
            onChangeText={setOrderShippingMemo}
            placeholder="배송 요청사항 (예: 문 앞에 놓아주세요)"
          />

          {/* POD 주문제작 청약철회(환불) 규정 및 사업자 고지 박스 */}
          <View
            style={{
              backgroundColor: '#FAF8F3',
              borderWidth: 1,
              borderColor: '#E7E5E4',
              borderRadius: 12,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#44403C', marginBottom: 4 }}>
              📦 맞춤 제작(POD) 청약철회 및 품질 보증 안내
            </Text>
            <Text style={{ fontSize: 11, color: '#78716C', lineHeight: 16 }}>
              • 주문 접수 후 1시간 이내(인쇄 준비 전)에는 100% 즉시 취소 및 포인트·결제액 전액 복구가 가능합니다.{'\n'}
              • 전자상거래법 제17조 제2항 제6호에 따라 인쇄소 제작 착수 이후에는 1:1 맞춤 도서 특성상 단순 변심 환불이 불가합니다.{'\n'}
              • 파본·인쇄 불량·배송 파손 시 100% 무료 재제작 및 재배송해 드립니다. (상호: 팸링크(FamLink) | 사업자등록번호: 302-42-01661)
            </Text>
          </View>

          <TouchableOpacity
            style={styles.submitOrderBtn}
            onPress={handleExecuteOrder}
            disabled={isSubmittingOrder}
            activeOpacity={0.85}
          >
            <Gift size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.submitOrderBtnText}>
              {isSubmittingOrder
                ? '주문 신청 접수 중...'
                : isFullyCovered
                ? `🎉 100% 포인트로 총 ${orderAddCopy ? '2권' : '1권'} 무료 교환하기`
                : usedPoints > 0
                ? `${usedPoints.toLocaleString()}P 할인 + ${cashDiff.toLocaleString()}원 계좌이체 주문`
                : `${cashDiff.toLocaleString()}원 계좌이체로 실물 주문하기`}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );

  const renderEditTitleModalContent = () => (
    <View style={[styles.modalBackdrop, { justifyContent: 'center' }]}>
      <View style={styles.editTitleModalCard}>
        <Text style={styles.editTitleHeading}>도서 제목 & 표지 서명 편집</Text>
        <Text style={styles.formInputLabel}>메인 제목</Text>
        <TextInput
          style={styles.formInput}
          value={tempTitle}
          onChangeText={setTempTitle}
          placeholder="예: 우리 가족의 첫 번째 이야기"
          placeholderTextColor="#A8A29E"
        />
        <Text style={styles.formInputLabel}>부제 (한 줄 설명)</Text>
        <TextInput
          style={styles.formInput}
          value={tempSubtitle}
          onChangeText={setTempSubtitle}
          placeholder="예: 사소한 일상이 모여 만든 가장 눈부신 기적"
          placeholderTextColor="#A8A29E"
        />
        <Text style={styles.formInputLabel}>표지 하단 서명 (가족 문구)</Text>
        <TextInput
          style={styles.formInput}
          value={tempSignature}
          onChangeText={setTempSignature}
          placeholder="예: 우리 가족의 따뜻한 이야기, 행복한 우리 집"
          placeholderTextColor="#A8A29E"
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
              const newSig = tempSignature.trim() || '우리 가족의 따뜻한 이야기';
              setBookTitle(newT);
              setBookSubtitle(newSub);
              setCoverSignature(newSig);
              broadcastPhotobookChange({ bookTitle: newT, bookSubtitle: newSub, coverSignature: newSig });
              setEditTitleModalVisible(false);
            }}
          >
            <Text style={styles.modalSaveBtnText}>저장</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderAiEssayModalContent = () => (
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
                ? '가족들과 나눈 지난 스몰톡 문답을 바탕으로 따뜻한 여는 글을 완성합니다.'
                : '180일간의 온기 기록을 갈무리하는 감동적인 맺는 글을 완성합니다.'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setAiEssayModalVisible(false)} style={styles.closeBtn}>
            <X size={20} color="#1C1917" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
          {/* AI 자동 생성 CTA 배너 */}
          <TouchableOpacity
            style={styles.aiGenerateCtaCard}
            onPress={() => handleGenerateAiEssay(targetEssayType)}
            disabled={isGeneratingAiEssay}
            activeOpacity={0.85}
          >
            <View style={styles.aiGenerateIconBox}>
              {isGeneratingAiEssay ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Wand2 size={20} color="#FFFFFF" />
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.aiGenerateCtaTitle}>
                  {isGeneratingAiEssay ? 'Gemini AI 작가가 집필 중...' : 'Gemini AI 감성 작가 자동 집필'}
                </Text>
                <View style={styles.aiModelBadge}>
                  <Text style={styles.aiModelBadgeText}>AI 2.5</Text>
                </View>
              </View>
              <Text style={styles.aiGenerateCtaDesc}>
                {smallTalkArchiveList.length > 0
                  ? `가족 스몰톡 ${smallTalkArchiveList.length}개 답변을 분석해 문학 수필로 승화합니다.`
                  : '가족들의 따뜻한 일상을 문학적 에세이로 빚어냅니다.'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* 에세이 직접 편집 인풋창 */}
          <Text style={styles.essayInputSectionTitle}>
            {targetEssayType === 'prologue' ? '📖 프롤로그 본문 문구' : '✍️ 에필로그 본문 문구'}
          </Text>
          <View style={styles.essayInputCard}>
            <TextInput
              style={styles.essayTextInput}
              multiline
              numberOfLines={6}
              value={customEssayInput}
              onChangeText={setCustomEssayInput}
              placeholder="직접 글귀를 작성하거나 위의 AI 집필 버튼을 눌러보세요..."
              placeholderTextColor="#A8A29E"
            />
          </View>

          {/* 추천 프리셋 문구 리스트 */}
          <Text style={styles.presetSectionTitle}>추천 감성 글귀 프리셋</Text>
          {(targetEssayType === 'prologue'
            ? [
                '서로 다른 하루를 보낸 우리가 한자리에 모여 속마음을 털어놓던 매 순간이 눈부신 기적이었습니다.',
                '가장 평범했던 우리 가족의 오늘이 훗날 꺼내볼 가장 애틋하고 빛나는 페이지가 됩니다.',
                '말하지 않아도 전해지던 마음, 식탁 위에 피어난 웃음꽃을 이 책의 첫 페이지에 새깁니다.',
              ]
            : [
                '180번의 질문과 수많은 대화 속에 우리 가족의 사랑은 더욱 단단하고 깊어졌습니다.',
                '책장을 덮어도 우리 가족의 이야기는 계속됩니다. 언제나 서로의 가장 든든한 품이 되어주길.',
                '그리울 때마다 펼쳐볼 우리들의 청춘과 사랑의 앨범, 함께여서 참 고맙습니다.',
              ]
          ).map((presetText, pIdx) => (
            <TouchableOpacity
              key={pIdx}
              style={styles.captionPresetItem}
              onPress={() => setCustomEssayInput(presetText)}
              activeOpacity={0.8}
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
  );

  const renderTopicPickerContent = () => (
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

            {/* B. 가족 스몰톡 기록 검색 및 목록 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MessageSquare size={14} color="#FF6B47" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#1C1917' }}>
                  가족 실제 문답 기록 ({filteredArchiveList.length}개)
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: '#78716C', fontWeight: '600' }}>
                탭하여 Q{selectedTopicSlot + 1}에 즉시 교체
              </Text>
            </View>

            {/* 연·월 기간 필터 바 (스몰톡 아카이브와 동일한 [연·월 선택] / [현재달] 2버튼 구성) */}
            <View style={styles.topicMonthChipsRow}>
              <TouchableOpacity
                style={[
                  styles.topicMonthChipBtn,
                  selectedArchiveMonth !== currentMonthInfo.id && styles.topicMonthChipBtnActive,
                ]}
                onPress={() => setIsMonthPickerExpanded(prev => !prev)}
                activeOpacity={0.8}
              >
                <Calendar
                  size={13}
                  color={selectedArchiveMonth !== currentMonthInfo.id ? '#FFFFFF' : '#FF6B47'}
                  style={{ marginRight: 5 }}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.topicMonthChipBtnText,
                    selectedArchiveMonth !== currentMonthInfo.id && styles.topicMonthChipBtnTextActive,
                  ]}
                >
                  {selectedArchiveMonth !== currentMonthInfo.id ? selectedArchiveMonthLabel : '연·월 선택'}
                </Text>
                <ChevronDown
                  size={13}
                  color={selectedArchiveMonth !== currentMonthInfo.id ? '#FFFFFF' : '#78716C'}
                  style={{
                    marginLeft: 3,
                    transform: [{ rotate: isMonthPickerExpanded ? '180deg' : '0deg' }],
                  }}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.topicMonthChipBtn,
                  selectedArchiveMonth === currentMonthInfo.id && styles.topicMonthChipBtnActive,
                ]}
                onPress={() => {
                  setSelectedArchiveMonth(currentMonthInfo.id);
                  setIsMonthPickerExpanded(false);
                }}
                activeOpacity={0.8}
              >
                <Calendar
                  size={13}
                  color={selectedArchiveMonth === currentMonthInfo.id ? '#FFFFFF' : '#78716C'}
                  style={{ marginRight: 5 }}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.topicMonthChipBtnText,
                    selectedArchiveMonth === currentMonthInfo.id && styles.topicMonthChipBtnTextActive,
                  ]}
                >
                  {currentMonthInfo.label} ({currentMonthInfo.count}개)
                </Text>
              </TouchableOpacity>
            </View>

            {/* 연·월 선택기 확장 패널 (아코디언 그리드) */}
            {isMonthPickerExpanded && (
              <View style={styles.topicPeriodPickerExpandedCard}>
                <View style={styles.topicPeriodPickerHeader}>
                  <Text style={styles.topicPeriodPickerHeading}>조회할 연·월 선택</Text>
                  <TouchableOpacity
                    style={[
                      styles.topicPeriodPickerAllBtn,
                      selectedArchiveMonth === 'all' && styles.topicPeriodPickerAllBtnActive,
                    ]}
                    onPress={() => {
                      setSelectedArchiveMonth('all');
                      setIsMonthPickerExpanded(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.topicPeriodPickerAllBtnText,
                        selectedArchiveMonth === 'all' && styles.topicPeriodPickerAllBtnTextActive,
                      ]}
                    >
                      전체 기간 ({smallTalkArchiveList.length}개)
                    </Text>
                  </TouchableOpacity>
                </View>

                {groupedArchiveYears.map(group => (
                  <View key={group.year} style={styles.topicPeriodYearGroup}>
                    <Text style={styles.topicPeriodYearTitle}>{group.year}년</Text>
                    <View style={styles.topicPeriodMonthGrid}>
                      {group.months.map(m => {
                        const isSelected = selectedArchiveMonth === m.id;
                        return (
                          <TouchableOpacity
                            key={m.id}
                            style={[
                              styles.topicPeriodMonthCell,
                              isSelected && styles.topicPeriodMonthCellActive,
                            ]}
                            onPress={() => {
                              setSelectedArchiveMonth(m.id);
                              setIsMonthPickerExpanded(false);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.topicPeriodMonthCellText,
                                isSelected && styles.topicPeriodMonthCellTextActive,
                              ]}
                            >
                              {m.month}월
                            </Text>
                            <Text
                              style={[
                                styles.topicPeriodMonthCellCount,
                                isSelected && styles.topicPeriodMonthCellCountActive,
                              ]}
                            >
                              {m.count}개
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* 검색창 */}
            <View style={styles.topicSearchBox}>
              <Search size={14} color="#78716C" style={{ marginRight: 6 }} />
              <TextInput
                style={styles.topicSearchInput}
                value={topicSearchQuery}
                onChangeText={setTopicSearchQuery}
                placeholder={selectedArchiveMonth === 'all' ? '가족과 나눈 질문 검색...' : `${selectedArchiveMonthLabel} 질문 검색...`}
                placeholderTextColor="#A8A29E"
              />
              {topicSearchQuery ? (
                <TouchableOpacity onPress={() => setTopicSearchQuery('')}>
                  <X size={14} color="#78716C" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* C. 아카이브 리스트 */}
            <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
              {filteredArchiveList.map((item, aIdx) => {
                // 실제 가족 답변들 매핑
                const answersMap: Record<string, string> = {};
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

              {filteredArchiveList.length === 0 && (
                <View style={styles.emptyArchiveBox}>
                  <Text style={styles.emptyArchiveText}>
                    {topicSearchQuery
                      ? '검색 결과와 일치하는 스몰톡 기록이 없습니다.'
                      : `${selectedArchiveMonthLabel}에 등록된 스몰톡 기록이 없습니다.`}
                  </Text>
                </View>
              )}
            </ScrollView>
          </>
        )}
      </View>
    </View>
  );

  const renderAppendixModalContent = () => (
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
  );

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

      {/* 🎁 런칭 기념 선착순 10가족 한정 포토북 교환 이벤트 배너 */}
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFF5F2',
          borderBottomWidth: 1,
          borderBottomColor: '#FFE8E0',
          paddingHorizontal: 14,
          paddingVertical: 7,
        }}
        onPress={() => setOrderModalVisible(true)}
        activeOpacity={0.85}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Gift size={13} color="#FF6B47" style={{ marginRight: 6 }} />
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#C2410C' }} numberOfLines={1}>
            런칭 기념 선착순 10가족 한정! 12,000 P 실물 양장본 무료 교환 이벤트
          </Text>
        </View>
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#FF6B47', marginLeft: 8 }}>
          신청하기 →
        </Text>
      </TouchableOpacity>

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
                    : `P.${currentPageNum} (${getPageFormat(currentSpreadIndex, activeSingleSide) === 'photo' ? '사진' : getPageFormat(currentSpreadIndex, activeSingleSide) === 'hybrid' ? '사진+톡' : currentPageNum === 1 ? '프롤로그' : currentPageNum === 15 ? '리포트' : currentPageNum === TOTAL_PHOTOBOOK_PAGES ? '에필로그' : '스몰톡'}) · ${TOTAL_PHOTOBOOK_PAGES}P`}
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
                        <View style={[styles.singlePageFullContent, (isSmallScreen || a5CanvasHeight < 420) ? { padding: 8 } : { padding: 12 }]}>
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
                      onPress={handleOpenEditTitleModal}
                      activeOpacity={0.8}
                    >
                      <Edit3 size={13} color="#1C1917" style={{ marginRight: 4 }} />
                      <Text style={styles.dockSubBtnText}>제목/서명 편집</Text>
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

              {/* 실물 도서 포인트 교환/주문 메인 CTA 버튼 */}
              <TouchableOpacity
                style={styles.dockMainOrderBtn}
                onPress={() => setOrderModalVisible(true)}
                activeOpacity={0.85}
              >
                <Gift size={14} color="#FFFFFF" strokeWidth={2.4} style={{ marginRight: 5 }} />
                <Text style={styles.dockMainOrderBtnText}>
                  {isFullyCovered
                    ? '12,000 P · 100% 무료 실물 도서 교환'
                    : usedPoints > 0
                    ? `-${usedPoints.toLocaleString()}P 할인 + ${cashDiff.toLocaleString()}원 실물 주문`
                    : '12,000원 · 15×21cm A5 양장본 실물 주문'}
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
              <Gift size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.previewBottomOrderBtnText}>
                {isFullyCovered
                  ? '가족 포인트 12,000 P로 실물 양장본 도서 100% 무료 교환하기 🎁'
                  : usedPoints > 0
                  ? `가족 포인트 -${usedPoints.toLocaleString()}P 할인받고 ${cashDiff.toLocaleString()}원 주문하기 📦`
                  : '12,000원에 실물 양장본 도서 주문하기 📦'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}



      {/* 3-1 ~ 3-3. HUD 테마 / 서체 / 16P 페이지 이동 모달 */}
      <PhotobookHudModals
        fullViewerVisible={fullViewerVisible}
        themePickerModalVisible={themePickerModalVisible}
        setThemePickerModalVisible={setThemePickerModalVisible}
        selectedThemeId={selectedThemeId}
        setSelectedThemeId={setSelectedThemeId}
        fontPickerModalVisible={fontPickerModalVisible}
        setFontPickerModalVisible={setFontPickerModalVisible}
        bookFontFamily={bookFontFamily}
        setBookFontFamily={setBookFontFamily}
        bookFontSize={bookFontSize}
        setBookFontSize={setBookFontSize}
        pagePickerModalVisible={pagePickerModalVisible}
        setPagePickerModalVisible={setPagePickerModalVisible}
        currentPageNum={currentPageNum}
        handleGoToPage={handleGoToPage}
        getPageFormat={getPageFormat}
        broadcastPhotobookChange={broadcastPhotobookChange}
      />

      {/* ========================================================= */}
      {/* 4. 사진 트레이 선택 모달 (Photo Picker Tray)                */}
      {/* ========================================================= */}
      <Modal visible={!fullViewerVisible && photoPickerVisible} transparent animationType="slide" onRequestClose={() => setPhotoPickerVisible(false)}>
        {renderPhotoPickerContent()}
      </Modal>

      {/* ========================================================= */}
      {/* 5. 가족 기록(권차) 선택 모달 (Volume Picker Modal)            */}
      {/* ========================================================= */}
      <Modal visible={!fullViewerVisible && volumePickerModalVisible} transparent animationType="slide" onRequestClose={() => setVolumePickerModalVisible(false)}>
        {renderVolumePickerContent()}
      </Modal>

      {/* ========================================================= */}
      {/* 6. 실물 양장본 인쇄 주문 모달 (POD Commerce Modal)         */}
      {/* ========================================================= */}
      <Modal visible={!fullViewerVisible && orderModalVisible} transparent animationType="slide" onRequestClose={() => setOrderModalVisible(false)}>
        {renderOrderModalContent()}
      </Modal>

      {/* 도서 제목 편집 모달 */}
      <Modal visible={!fullViewerVisible && editTitleModalVisible} transparent animationType="fade" onRequestClose={() => setEditTitleModalVisible(false)}>
        {renderEditTitleModalContent()}
      </Modal>

      {/* ========================================================= */}
      {/* 6-B. AI 스몰톡 에세이(프롤로그 / 에필로그) 집필 & 편집 모달 */}
      {/* ========================================================= */}
      <Modal visible={!fullViewerVisible && aiEssayModalVisible} transparent animationType="slide" onRequestClose={() => setAiEssayModalVisible(false)}>
        {renderAiEssayModalContent()}
      </Modal>

      {/* ========================================================= */}
      {/* 7. 스몰톡 질문 교체 및 아카이브 담기 모달                   */}
      {/* ========================================================= */}
      <Modal visible={!fullViewerVisible && topicPickerModalVisible} transparent animationType="slide" onRequestClose={() => setTopicPickerModalVisible(false)}>
        {renderTopicPickerContent()}
      </Modal>

      {/* ========================================================= */}
      {/* 8. 180문답 전수 인덱스 부록 모달 (Appendix Modal)           */}
      {/* ========================================================= */}
      <Modal visible={!fullViewerVisible && appendixModalVisible} transparent animationType="slide" onRequestClose={() => setAppendixModalVisible(false)}>
        {renderAppendixModalContent()}
      </Modal>

      {/* ========================================================= */}
      {/* 4. 실물 책 1:1 전체화면 감상 & 편집 뷰어 (Full-screen Book Reader & Editor) */}
      {/* ========================================================= */}
      <Modal
        visible={fullViewerVisible}
        animationType="fade"
        transparent={false}
        statusBarTranslucent
        onRequestClose={() => {
          if (photoPickerVisible) setPhotoPickerVisible(false);
          else if (topicPickerModalVisible) setTopicPickerModalVisible(false);
          else if (editTitleModalVisible) setEditTitleModalVisible(false);
          else if (aiEssayModalVisible) setAiEssayModalVisible(false);
          else if (orderModalVisible) setOrderModalVisible(false);
          else if (appendixModalVisible) setAppendixModalVisible(false);
          else setFullViewerVisible(false);
        }}
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
              onPress={() => setOrderModalVisible(true)}
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
                💡 사진이나 질문을 터치하여 실물 크기로 바로 편집하세요
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

          {/* ========================================================= */}
          {/* 인-뷰어 오버레이 모달들 (네이티브 중복 Modal 충돌 없이 즉시 표시) */}
          {/* ========================================================= */}
          {photoPickerVisible && (
            <View style={styles.inViewerModalOverlay}>
              {renderPhotoPickerContent()}
            </View>
          )}
          {topicPickerModalVisible && (
            <View style={styles.inViewerModalOverlay}>
              {renderTopicPickerContent()}
            </View>
          )}
          {editTitleModalVisible && (
            <View style={styles.inViewerModalOverlay}>
              {renderEditTitleModalContent()}
            </View>
          )}
          {aiEssayModalVisible && (
            <View style={styles.inViewerModalOverlay}>
              {renderAiEssayModalContent()}
            </View>
          )}
          {orderModalVisible && (
            <View style={styles.inViewerModalOverlay}>
              {renderOrderModalContent()}
            </View>
          )}
          {appendixModalVisible && (
            <View style={styles.inViewerModalOverlay}>
              {renderAppendixModalContent()}
            </View>
          )}
        </View>
      </Modal>

    </View>
  );
}

