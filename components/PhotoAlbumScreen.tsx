import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BookOpen,
  X,
  Calendar,
  MessageSquare,
  Check,
  Search,
  Layers,
  Bookmark,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import PhotobookStudioScreen from './PhotobookStudioScreen';
import { getTopicForToday, stripEmojis } from '../utils/topics';
import { fetchSmallTalkTopicsFromDB, getTopicForDateFromList } from '../services/smallTalkService';
import { supabase } from '../lib/supabase';
import { colors } from '../theme';
import UserAvatar from './UserAvatar';
import type {
  FamilyMember,
  UserProfile,
  ChatMessage,
  SmallTalkState,
  SmallTalkResponseRow,
  SmallTalkArchiveAnswer,
  SmallTalkArchiveItem,
  PetmongCharacter,
} from '../types/domain';

const { width } = Dimensions.get('window');

export type ArchiveTabType = 'photobook' | 'smalltalk-archive';
export type ArchiveFilterType = 'all' | 'answered' | 'unanswered';

export interface PhotoAlbumScreenProps {
  currentUser?: string;
  familyMembers?: FamilyMember[];
  messages?: ChatMessage[];
  smallTalkState?: SmallTalkState;
  currentUserProfile?: UserProfile | null;
  onSendOrderNotice?: (orderData: any) => void;
  points?: number;
  onDeductPoints?: (amount: number, reason?: string) => Promise<boolean> | void;
  petmongCharacters?: PetmongCharacter[];
  petCharacter?: PetmongCharacter | null;
}

interface FamilyMonthItem {
  id: string;
  label: string;
  year: number;
  month: number;
}

interface AvailableMonthStat extends FamilyMonthItem {
  count: number;
  answeredCount: number;
}

interface YearMonthCell {
  id: string;
  year: number;
  month: number;
  count: number;
  isDisabled: boolean;
}

interface YearGroupItem {
  year: number;
  months: YearMonthCell[];
}

export default function PhotoAlbumScreen({
  currentUser,
  familyMembers = [],
  messages = [],
  smallTalkState,
  currentUserProfile,
  onSendOrderNotice,
  points = 0,
  onDeductPoints,
  petmongCharacters = [],
  petCharacter = null,
}: PhotoAlbumScreenProps): React.ReactElement {
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = windowWidth || Dimensions.get('window').width;
  const isSmallScreen = screenWidth < 380;

  // Navigation Tabs: 'photobook' (포토북 스튜디오) | 'smalltalk-archive' (스몰톡 아카이브)
  const [activeTab, setActiveTab] = useState<ArchiveTabType>('photobook');
  const [includedSmallTalkTopics, setIncludedSmallTalkTopics] = useState<string[]>([]);
  const [monthPickerModalVisible, setMonthPickerModalVisible] = useState<boolean>(false);

  // SmallTalk Archive States (Monthly fast-jump & Accordion)
  const [dbResponses, setDbResponses] = useState<SmallTalkResponseRow[]>([]);
  const [dbTopics, setDbTopics] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [expandedTopicIds, setExpandedTopicIds] = useState<string[]>(['topic-0']);
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilterType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Load Photobook Project & SmallTalk History on Mount
  useEffect(() => {
    loadSavedPhotobookConfig();
    fetchSmallTalkHistory();
  }, [currentUserProfile?.family_id]);

  const loadSavedPhotobookConfig = async (): Promise<void> => {
    try {
      const saved = await AsyncStorage.getItem('FAMLINK_PHOTOBOOK_CONFIG');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.includedSmallTalkTopics)) {
          setIncludedSmallTalkTopics(parsed.includedSmallTalkTopics);
        }
      } else if (typeof smallTalkState?.topic === 'string' && smallTalkState.topic) {
        setIncludedSmallTalkTopics([smallTalkState.topic]);
      }
    } catch (e) {
      console.warn('Failed to load photobook config:', e);
    }
  };

  const fetchSmallTalkHistory = async (): Promise<void> => {
    if (!currentUserProfile?.family_id) return;
    try {
      const [respResult, topics] = await Promise.all([
        supabase
          .from('small_talk_responses')
          .select('*')
          .eq('family_id', currentUserProfile.family_id)
          .order('created_at', { ascending: false }),
        fetchSmallTalkTopicsFromDB(currentUserProfile.family_id),
      ]);

      if (!respResult.error && respResult.data) {
        setDbResponses(respResult.data as SmallTalkResponseRow[]);
      }
      if (Array.isArray(topics) && topics.length > 0) {
        setDbTopics(topics);
      }
    } catch (e) {
      console.warn('Failed to fetch small talk history from DB:', e);
    }
  };

  const getMemberName = useCallback(
    (idOrRole: string): string => {
      if (familyMembers && Array.isArray(familyMembers)) {
        const match = familyMembers.find(
          (m) => m && (m.id === idOrRole || m.role === idOrRole)
        );
        if (match) return match.name;
      }
      const DEFAULTS: Record<string, string> = {
        mom: '엄마',
        dad: '아빠',
        son: '아들',
        daughter: '딸',
      };
      return DEFAULTS[idOrRole] || idOrRole;
    },
    [familyMembers]
  );

  const getMemberAvatar = useCallback(
    (idOrRole: string): string => {
      if (familyMembers && Array.isArray(familyMembers)) {
        const match = familyMembers.find(
          (m) => m && (m.id === idOrRole || m.role === idOrRole)
        );
        if (match?.avatar) return match.avatar;
      }
      const DEFAULTS: Record<string, string> = {
        mom: '👩‍🦰',
        dad: '👨‍💼',
        son: '👦',
        daughter: '👧',
      };
      return DEFAULTS[idOrRole] || '👦';
    },
    [familyMembers]
  );

  // Family creation date (lower bound for archive dates, start of creation month)
  const familyCreatedAt = useMemo<Date>(() => {
    let earliestDate: Date | null = null;
    const raw =
      currentUserProfile?.family_created_at || currentUserProfile?.created_at;
    if (raw) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        earliestDate = d;
      }
    }
    for (const r of (dbResponses || [])) {
      if (r.created_at) {
        const d = new Date(r.created_at);
        if (!isNaN(d.getTime())) {
          if (!earliestDate || d < earliestDate) {
            earliestDate = d;
          }
        }
      }
    }

    if (earliestDate) {
      return new Date((earliestDate as Date).getFullYear(), (earliestDate as Date).getMonth(), 1);
    }
    return new Date(2026, 7, 1);
  }, [currentUserProfile?.family_created_at, currentUserProfile?.created_at, dbResponses]);

  // All valid calendar months since the family group was created
  const allFamilyMonths = useMemo<FamilyMonthItem[]>(() => {
    const list: FamilyMonthItem[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const startYear = familyCreatedAt.getFullYear();
    const startMonth = familyCreatedAt.getMonth();

    let y = currentYear;
    let m = currentMonth;

    while (y > startYear || (y === startYear && m >= startMonth)) {
      const monthStr = String(m + 1).padStart(2, '0');
      const id = `${y}-${monthStr}`;
      const label = `${y}년 ${m + 1}월`;
      list.push({ id, label, year: y, month: m + 1 });

      m--;
      if (m < 0) {
        m = 11;
        y--;
      }
    }

    return list;
  }, [familyCreatedAt]);

  // Build the complete SmallTalk Archive list with all calendar daily questions + DB answers
  const smallTalkArchiveList = useMemo<SmallTalkArchiveItem[]>(() => {
    const list: SmallTalkArchiveItem[] = [];
    const todayTopic = smallTalkState?.topic || getTopicForToday();
    const todayResponses = smallTalkState?.responses || {};

    const dbTopicMap: Record<string, SmallTalkResponseRow[]> = {};
    (dbResponses || []).forEach((row) => {
      if (!row.topic) return;
      const cleanKey = stripEmojis(row.topic);
      if (!dbTopicMap[cleanKey]) {
        dbTopicMap[cleanKey] = [];
      }
      dbTopicMap[cleanKey].push({
        id: row.id,
        profile_id: row.profile_id,
        topic: cleanKey,
        text: row.text,
        created_at: row.created_at,
      });
    });

    // DB 답변이 작성된 최초 일자 기준으로 날짜별 매핑 맵 구축 (답변 작성 날짜 우선 바인딩)
    const dateToAnsweredTopicMap: Record<string, string[]> = {};
    for (const [cleanKey, rows] of Object.entries(dbTopicMap)) {
      let earliestDate: Date | null = null;
      for (const r of rows) {
        if (r.created_at) {
          const d = new Date(r.created_at);
          if (!isNaN(d.getTime())) {
            if (!earliestDate || d < earliestDate) {
              earliestDate = d;
            }
          }
        }
      }

      if (earliestDate) {
        const y = (earliestDate as Date).getFullYear();
        const m = String((earliestDate as Date).getMonth() + 1).padStart(2, '0');
        const d = String((earliestDate as Date).getDate()).padStart(2, '0');
        const dateKey = `${y}-${m}-${d}`;
        if (!dateToAnsweredTopicMap[dateKey]) {
          dateToAnsweredTopicMap[dateKey] = [];
        }
        if (!dateToAnsweredTopicMap[dateKey].includes(cleanKey)) {
          dateToAnsweredTopicMap[dateKey].push(cleanKey);
        }
      }
    }

    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDate = now.getDate();

    const startCursor = new Date(
      familyCreatedAt.getFullYear(),
      familyCreatedAt.getMonth(),
      familyCreatedAt.getDate(),
      0,
      0,
      0
    );
    const curCursor = new Date(todayYear, todayMonth, todayDate, 12, 0, 0);

    const coveredAnsweredTopics = new Set<string>();
    let topicIdx = 0;

    while (curCursor >= startCursor) {
      const y = curCursor.getFullYear();
      const m = String(curCursor.getMonth() + 1).padStart(2, '0');
      const d = String(curCursor.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${d}`;
      const yearMonth = `${y}-${m}`;
      const yearMonthLabel = `${y}년 ${parseInt(m, 10)}월`;

      const isToday =
        y === todayYear &&
        curCursor.getMonth() === todayMonth &&
        curCursor.getDate() === todayDate;
      const rawTodayTopic =
        typeof todayTopic === 'string'
          ? todayTopic
          : todayTopic?.text || todayTopic?.title || todayTopic?.topic || '';

      let topic = '';
      if (isToday) {
        topic = stripEmojis(rawTodayTopic);
      } else {
        // 1순위: 해당 날짜에 작성된 답변의 실제 토픽이 있으면 우선 채택 (중복 extra 생성 방지)
        const answeredTopicsOnThisDate = (dateToAnsweredTopicMap[dateKey] || []).filter(
          (t) => !coveredAnsweredTopics.has(t)
        );
        if (answeredTopicsOnThisDate.length > 0) {
          topic = answeredTopicsOnThisDate[0];
        } else {
          // 2순위: 해당 일자의 순환 공식 질문
          topic = stripEmojis(getTopicForDateFromList(dbTopics, curCursor));
        }
      }

      const answersList: SmallTalkArchiveAnswer[] = [];

      if (isToday) {
        Object.entries(todayResponses).forEach(([key, text]) => {
          if (text) {
            answersList.push({
              id: `today-${key}`,
              profileId: key,
              name: getMemberName(key),
              avatar: getMemberAvatar(key),
              text,
              created_at: now.toISOString(),
            });
          }
        });
      }

      const dbAnswers = dbTopicMap[topic] || [];
      dbAnswers.forEach((ans) => {
        const already = answersList.some((a) => a.profileId === ans.profile_id);
        if (!already) {
          answersList.push({
            id: ans.id,
            profileId: ans.profile_id,
            name: getMemberName(ans.profile_id),
            avatar: getMemberAvatar(ans.profile_id),
            text: ans.text,
            created_at: ans.created_at,
          });
        }
      });

      if (answersList.length > 0) {
        coveredAnsweredTopics.add(topic);
      }

      const dateLabel = isToday
        ? '오늘의 질문 🌟'
        : `${parseInt(m, 10)}월 ${parseInt(d, 10)}일`;
      const totalFamily = Math.max(1, familyMembers.length || 1);
      const isAnswered = answersList.length > 0;
      const isComplete = answersList.length >= totalFamily;
      const isInBook = includedSmallTalkTopics.some(
        (t) => stripEmojis(t) === topic
      );

      list.push({
        id: `topic-${y}-${m}-${d}`,
        topic,
        index: topicIdx + 1,
        isToday,
        answers: answersList,
        answeredCount: answersList.length,
        totalFamily,
        isAnswered,
        isComplete,
        isInBook,
        dateLabel,
        yearMonth,
        yearMonthLabel,
        itemDate: new Date(curCursor),
      });

      topicIdx++;
      curCursor.setDate(curCursor.getDate() - 1);
    }

    // 날짜 슬롯에 매핑되지 않고 남은 실제 DB 답변이 있는 경우에만 안전하게 추가 슬롯 생성
    Object.keys(dbTopicMap).forEach((topic) => {
      if (coveredAnsweredTopics.has(topic)) return;
      const dbAnswers = dbTopicMap[topic] || [];
      if (dbAnswers.length === 0) return;

      const answersList: SmallTalkArchiveAnswer[] = dbAnswers.map((ans) => ({
        id: ans.id,
        profileId: ans.profile_id,
        name: getMemberName(ans.profile_id),
        avatar: getMemberAvatar(ans.profile_id),
        text: ans.text,
        created_at: ans.created_at,
      }));

      const latestAnsDate = answersList.find((a) => a.created_at)?.created_at;
      const itemDate = latestAnsDate
        ? new Date(latestAnsDate)
        : new Date(familyCreatedAt);
      const y = itemDate.getFullYear();
      const m = String(itemDate.getMonth() + 1).padStart(2, '0');
      const d = String(itemDate.getDate()).padStart(2, '0');
      const yearMonth = `${y}-${m}`;
      const yearMonthLabel = `${y}년 ${parseInt(m, 10)}월`;
      const dateLabel = `${parseInt(m, 10)}월 ${parseInt(d, 10)}일`;
      const totalFamily = Math.max(1, familyMembers.length || 1);
      const isInBook = includedSmallTalkTopics.some(
        (t) => stripEmojis(t) === topic
      );

      coveredAnsweredTopics.add(topic);

      list.push({
        id: `topic-extra-${topicIdx}`,
        topic,
        index: topicIdx + 1,
        isToday: false,
        answers: answersList,
        answeredCount: answersList.length,
        totalFamily,
        isAnswered: true,
        isComplete: answersList.length >= totalFamily,
        isInBook,
        dateLabel,
        yearMonth,
        yearMonthLabel,
        itemDate,
      });

      topicIdx++;
    });

    list.sort((a, b) => {
      if (a.isToday) return -1;
      if (b.isToday) return 1;
      return (b.itemDate?.getTime() || 0) - (a.itemDate?.getTime() || 0);
    });

    return list;
  }, [
    smallTalkState,
    dbResponses,
    dbTopics,
    familyMembers,
    includedSmallTalkTopics,
    familyCreatedAt,
    getMemberName,
    getMemberAvatar,
  ]);

  const availableMonths = useMemo<AvailableMonthStat[]>(() => {
    const monthStats: Record<string, { total: number; answered: number }> = {};
    smallTalkArchiveList.forEach((item) => {
      if (!monthStats[item.yearMonth]) {
        monthStats[item.yearMonth] = { total: 0, answered: 0 };
      }
      monthStats[item.yearMonth].total += 1;
      if (item.isAnswered) {
        monthStats[item.yearMonth].answered += 1;
      }
    });

    return allFamilyMonths.map((fm) => ({
      id: fm.id,
      label: fm.label,
      year: fm.year,
      month: fm.month,
      count: monthStats[fm.id]?.total || 0,
      answeredCount: monthStats[fm.id]?.answered || 0,
    }));
  }, [allFamilyMonths, smallTalkArchiveList]);

  const currentMonthInfo = useMemo<AvailableMonthStat>(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const curMonthId = `${curYear}-${String(curMonth + 1).padStart(2, '0')}`;
    const curMatch = availableMonths.find((m) => m.id === curMonthId);
    return {
      id: curMonthId,
      label: `현재달 (${curMonth + 1}월)`,
      year: curYear,
      month: curMonth + 1,
      count: curMatch ? curMatch.count : 0,
      answeredCount: curMatch ? curMatch.answeredCount : 0,
    };
  }, [availableMonths]);

  const selectedMonthLabel = useMemo<string>(() => {
    if (selectedMonth === 'all') return '전체';
    const match = availableMonths.find((m) => m.id === selectedMonth);
    return match ? match.label : selectedMonth;
  }, [selectedMonth, availableMonths]);

  const groupedYears = useMemo<YearGroupItem[]>(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const startYear = familyCreatedAt.getFullYear();
    const startMonth = familyCreatedAt.getMonth();

    const years: YearGroupItem[] = [];
    for (let y = currentYear; y >= startYear; y--) {
      const monthsForYear: YearMonthCell[] = [];
      for (let m = 11; m >= 0; m--) {
        const monthNum = m + 1;
        const monthStr = String(monthNum).padStart(2, '0');
        const id = `${y}-${monthStr}`;
        const isFuture = y === currentYear && m > currentMonth;
        const isBeforeFamily = y === startYear && m < startMonth;
        const isDisabled = isFuture || isBeforeFamily;

        const match = availableMonths.find((am) => am.id === id);
        const count = match ? match.count : 0;

        if (!isFuture) {
          monthsForYear.push({
            id,
            year: y,
            month: monthNum,
            count,
            isDisabled,
          });
        }
      }

      monthsForYear.sort((a, b) => b.month - a.month);
      years.push({ year: y, months: monthsForYear });
    }

    return years;
  }, [familyCreatedAt, availableMonths]);

  const monthScopedList = useMemo<SmallTalkArchiveItem[]>(() => {
    if (selectedMonth === 'all') return smallTalkArchiveList;
    return smallTalkArchiveList.filter((item) => item.yearMonth === selectedMonth);
  }, [smallTalkArchiveList, selectedMonth]);

  const trimmedSearchQuery = useMemo<string>(
    () => (searchQuery || '').trim().toLowerCase(),
    [searchQuery]
  );
  const isSearchActive = trimmedSearchQuery.length > 0;

  const baseArchiveList = useMemo<SmallTalkArchiveItem[]>(() => {
    if (isSearchActive) return smallTalkArchiveList;
    return monthScopedList;
  }, [isSearchActive, smallTalkArchiveList, monthScopedList]);

  const checkItemMatchesSearch = useCallback(
    (item: SmallTalkArchiveItem, query: string): boolean => {
      if (!query) return true;
      const topicStr = (item.topic || '').toLowerCase();
      if (topicStr.includes(query)) return true;

      if (Array.isArray(item.answers)) {
        return item.answers.some((a) => {
          const text = (a?.text || '').toLowerCase();
          const name = (a?.name || '').toLowerCase();
          const role = (a?.role || '').toLowerCase();
          return (
            text.includes(query) ||
            name.includes(query) ||
            role.includes(query)
          );
        });
      }
      return false;
    },
    []
  );

  const filteredArchiveList = useMemo<SmallTalkArchiveItem[]>(() => {
    return baseArchiveList.filter((item) => {
      if (archiveFilter === 'answered' && !item.isAnswered) return false;
      if (archiveFilter === 'unanswered' && item.isAnswered) return false;
      if (isSearchActive) {
        return checkItemMatchesSearch(item, trimmedSearchQuery);
      }
      return true;
    });
  }, [
    baseArchiveList,
    archiveFilter,
    isSearchActive,
    trimmedSearchQuery,
    checkItemMatchesSearch,
  ]);

  const getFilterTabCount = useCallback(
    (filterType: ArchiveFilterType): number => {
      const list = isSearchActive
        ? smallTalkArchiveList.filter((item) =>
            checkItemMatchesSearch(item, trimmedSearchQuery)
          )
        : monthScopedList;

      if (filterType === 'answered') return list.filter((i) => i.isAnswered).length;
      if (filterType === 'unanswered')
        return list.filter((i) => !i.isAnswered).length;
      return list.length;
    },
    [
      isSearchActive,
      smallTalkArchiveList,
      monthScopedList,
      trimmedSearchQuery,
      checkItemMatchesSearch,
    ]
  );

  useEffect(() => {
    if (isSearchActive && filteredArchiveList.length > 0) {
      setExpandedTopicIds(filteredArchiveList.map((item) => item.id));
    }
  }, [isSearchActive, trimmedSearchQuery]);

  const handleToggleExpand = (topicId: string): void => {
    setExpandedTopicIds((prev) =>
      prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId]
    );
  };

  const handleExpandAll = (): void => {
    if (expandedTopicIds.length === filteredArchiveList.length) {
      setExpandedTopicIds([]);
    } else {
      setExpandedTopicIds(filteredArchiveList.map((item) => item.id));
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Top Segmented Navigation Tabs */}
      <View
        style={[
          styles.segmentedTabContainer,
          isSmallScreen && { marginHorizontal: 14 },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === 'photobook' && styles.segmentBtnActive,
          ]}
          onPress={() => setActiveTab('photobook')}
          activeOpacity={0.8}
        >
          <BookOpen
            size={16}
            color={
              activeTab === 'photobook'
                ? colors.primary
                : colors.text.secondary
            }
            strokeWidth={2.2}
          />
          <Text
            style={[
              styles.segmentBtnText,
              activeTab === 'photobook' && styles.segmentBtnTextActive,
              isSmallScreen && { fontSize: 12 },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            포토북 스튜디오
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === 'smalltalk-archive' && styles.segmentBtnActive,
          ]}
          onPress={() => setActiveTab('smalltalk-archive')}
          activeOpacity={0.8}
        >
          <MessageSquare
            size={16}
            color={
              activeTab === 'smalltalk-archive'
                ? colors.primary
                : colors.text.secondary
            }
            strokeWidth={2.2}
          />
          <Text
            style={[
              styles.segmentBtnText,
              activeTab === 'smalltalk-archive' && styles.segmentBtnTextActive,
              isSmallScreen && { fontSize: 12 },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            스몰톡 아카이브
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Main Content Views by Tab */}
      {activeTab === 'photobook' ? (
        <View style={{ flex: 1 }}>
          <PhotobookStudioScreen
            currentUser={currentUser}
            familyMembers={familyMembers}
            messages={messages}
            smallTalkState={smallTalkState}
            currentUserProfile={currentUserProfile}
            points={points}
            smallTalkArchiveList={smallTalkArchiveList}
            onDeductPoints={onDeductPoints}
            onSendOrderNotice={onSendOrderNotice}
            petCharacter={
              petCharacter ||
              (petmongCharacters && petmongCharacters.length > 0
                ? petmongCharacters[0]
                : null)
            }
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.archiveSection}>
            {/* Archive Explainer Banner */}
            <View style={styles.archiveBanner}>
              <View style={styles.archiveBannerIconBox}>
                <Bookmark size={20} color={colors.primary} />
              </View>
              <View style={styles.archiveBannerContent}>
                <Text style={styles.archiveBannerTitle}>
                  우리 가족 스몰톡 기록 보관소
                </Text>
                <Text style={styles.archiveBannerDesc}>
                  매일 나눈 질문과 가족들의 솔직한 답변들입니다. 답변이 완료된 소중한 문답은 우리 가족 포토북에 자동으로 수록됩니다 📖
                </Text>
              </View>
            </View>

            {/* 1. Month Picker & Current Month Quick Jump */}
            <View style={styles.monthChipsRow}>
              <TouchableOpacity
                style={[
                  styles.monthChipBtn,
                  styles.monthChipHalfBtn,
                  selectedMonth !== currentMonthInfo.id
                    ? styles.monthChipBtnActive
                    : styles.moreMonthPickerBtn,
                ]}
                onPress={() => setMonthPickerModalVisible(true)}
                activeOpacity={0.8}
              >
                <Calendar
                  size={13}
                  color={
                    selectedMonth !== currentMonthInfo.id
                      ? colors.text.inverse
                      : colors.primary
                  }
                  style={{ marginRight: 5 }}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.monthChipBtnText,
                    styles.moreMonthPickerBtnText,
                    selectedMonth !== currentMonthInfo.id &&
                      styles.monthChipBtnTextActive,
                  ]}
                >
                  {selectedMonth !== currentMonthInfo.id
                    ? selectedMonthLabel
                    : '연·월 선택'}
                </Text>
                <ChevronDown
                  size={13}
                  color={
                    selectedMonth !== currentMonthInfo.id
                      ? colors.text.inverse
                      : colors.primary
                  }
                  style={{ marginLeft: 2 }}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.monthChipBtn,
                  styles.monthChipHalfBtn,
                  selectedMonth === currentMonthInfo.id &&
                    styles.monthChipBtnActive,
                ]}
                onPress={() => setSelectedMonth(currentMonthInfo.id)}
                activeOpacity={0.8}
              >
                <Calendar
                  size={13}
                  color={
                    selectedMonth === currentMonthInfo.id
                      ? colors.text.inverse
                      : colors.text.secondary
                  }
                  style={{ marginRight: 5 }}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.monthChipBtnText,
                    selectedMonth === currentMonthInfo.id &&
                      styles.monthChipBtnTextActive,
                  ]}
                >
                  {currentMonthInfo.label} ({currentMonthInfo.answeredCount}/{currentMonthInfo.count})
                </Text>
              </TouchableOpacity>
            </View>

            {/* 2. Monthly Summary & Batch Action Bar */}
            <View style={styles.monthSummaryRow}>
              <View style={styles.monthSummaryLeft}>
                {isSearchActive ? (
                  <>
                    <Text style={styles.monthSummaryTitle}>
                      🔍 '{searchQuery}' 검색 결과 ({filteredArchiveList.length}건)
                    </Text>
                    <Text style={styles.monthSummarySub}>
                      전체 기간의 질문 및 가족 답변에서 일치하는 기록입니다.
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.monthSummaryTitle}>
                      📅 {selectedMonthLabel} 스몰톡
                    </Text>
                    <Text style={styles.monthSummarySub}>
                      총 {monthScopedList.length}개 질문 중 {monthScopedList.filter((i) => i.isAnswered).length}개 답변 완료 ({monthScopedList.length > 0 ? Math.round((monthScopedList.filter((i) => i.isAnswered).length / monthScopedList.length) * 100) : 0}%)
                    </Text>
                  </>
                )}
              </View>

              <View style={styles.monthSummaryRightActions}>
                <TouchableOpacity
                  style={styles.expandAllToggleBtn}
                  onPress={handleExpandAll}
                  activeOpacity={0.7}
                >
                  <Text style={styles.expandAllToggleBtnText}>
                    {expandedTopicIds.length === filteredArchiveList.length
                      ? '모두 접기'
                      : '모두 펼치기'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 3. Search & Filter Controls */}
            <View style={styles.archiveControlsRow}>
              <View
                style={[
                  styles.searchBarBox,
                  isSearchActive && styles.searchBarBoxActive,
                ]}
              >
                <Search
                  size={16}
                  color={isSearchActive ? colors.primary : colors.text.muted}
                  style={{ marginRight: 8 }}
                />
                <TextInput
                  style={styles.searchBarInput}
                  placeholder="질문이나 가족의 답변, 작성자 검색..."
                  placeholderTextColor={colors.text.muted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                {searchQuery !== '' && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{ padding: 4 }}
                  >
                    <X size={15} color={colors.text.secondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Filter Tabs */}
            <View style={styles.archiveFilterChipsRow}>
              <TouchableOpacity
                style={[
                  styles.archiveFilterChip,
                  archiveFilter === 'all' && styles.archiveFilterChipActive,
                ]}
                onPress={() => setArchiveFilter('all')}
              >
                <Text
                  style={[
                    styles.archiveFilterChipText,
                    archiveFilter === 'all' &&
                      styles.archiveFilterChipTextActive,
                  ]}
                >
                  전체 ({getFilterTabCount('all')})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.archiveFilterChip,
                  archiveFilter === 'answered' &&
                    styles.archiveFilterChipActive,
                ]}
                onPress={() => setArchiveFilter('answered')}
              >
                <Text
                  style={[
                    styles.archiveFilterChipText,
                    archiveFilter === 'answered' &&
                      styles.archiveFilterChipTextActive,
                  ]}
                >
                  답변 완료 ({getFilterTabCount('answered')})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.archiveFilterChip,
                  archiveFilter === 'unanswered' &&
                    styles.archiveFilterChipActive,
                ]}
                onPress={() => setArchiveFilter('unanswered')}
              >
                <Text
                  style={[
                    styles.archiveFilterChipText,
                    archiveFilter === 'unanswered' &&
                      styles.archiveFilterChipTextActive,
                  ]}
                >
                  미답변 ({getFilterTabCount('unanswered')})
                </Text>
              </TouchableOpacity>
            </View>

            {/* 4. SmallTalk Q&A Cards with Accordion Expand / Collapse */}
            <View style={styles.archiveCardsList}>
              {filteredArchiveList.map((item) => {
                const isExpanded = expandedTopicIds.includes(item.id);
                const topicMatchesSearch =
                  isSearchActive &&
                  item.topic.toLowerCase().includes(trimmedSearchQuery);

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.archiveCard,
                      isExpanded && styles.archiveCardExpanded,
                    ]}
                  >
                    <View style={styles.archiveCardHeader}>
                      <View style={styles.archiveHeaderLeft}>
                        <View
                          style={[
                            styles.archiveDateBadge,
                            item.isToday && styles.archiveDateBadgeToday,
                          ]}
                        >
                          <Text
                            style={[
                              styles.archiveDateBadgeText,
                              item.isToday && styles.archiveDateBadgeTextToday,
                            ]}
                          >
                            {item.dateLabel}
                          </Text>
                        </View>
                        <View style={styles.archiveIndexBadge}>
                          <Text style={styles.archiveIndexBadgeText}>
                            #{item.index}
                          </Text>
                        </View>
                      </View>

                      {item.isAnswered ? (
                        <View style={styles.autoBookBadge}>
                          <Check
                            size={11}
                            color="#059669"
                            strokeWidth={2.5}
                            style={{ marginRight: 3 }}
                          />
                          <Text style={styles.autoBookBadgeText}>
                            포토북 수록
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.waitingAnswerBadge}>
                          <Text style={styles.waitingAnswerBadgeText}>
                            답변 대기 중
                          </Text>
                        </View>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.archiveQuestionToggleRow}
                      onPress={() => handleToggleExpand(item.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.archiveQuestionTitleCol}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 6,
                            marginBottom: 4,
                          }}
                        >
                          {isSearchActive && item.yearMonthLabel && (
                            <View style={styles.searchMonthBadge}>
                              <Text style={styles.searchMonthBadgeText}>
                                {item.yearMonthLabel}
                              </Text>
                            </View>
                          )}
                          {topicMatchesSearch && (
                            <View style={styles.searchMatchPill}>
                              <Text style={styles.searchMatchPillText}>
                                질문 일치
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.archiveQuestionTitle,
                            !isExpanded &&
                              styles.archiveQuestionTitleCollapsed,
                            topicMatchesSearch &&
                              styles.archiveQuestionTitleMatched,
                          ]}
                          numberOfLines={isExpanded ? undefined : 2}
                        >
                          "{item.topic}"
                        </Text>

                        {!isExpanded && (
                          <View style={styles.collapsedMetaRow}>
                            {item.answers.length > 0 ? (
                              <View style={styles.collapsedAvatarsRow}>
                                <View style={styles.avatarMiniIcons}>
                                  {item.answers.slice(0, 4).map((ans, aIdx) => (
                                    <UserAvatar
                                      key={aIdx}
                                      avatar={ans.avatar}
                                      size={20}
                                      style={{
                                        marginLeft: aIdx > 0 ? -6 : 0,
                                        borderWidth: 1.5,
                                        borderColor: colors.card,
                                      }}
                                    />
                                  ))}
                                </View>
                                <Text style={styles.collapsedAnswerCountText}>
                                  {item.answeredCount}명 답변 완료 · 탭하여 읽기
                                </Text>
                              </View>
                            ) : (
                              <Text style={styles.collapsedNoAnswerText}>
                                아직 등록된 답변 없음 🕊️
                              </Text>
                            )}
                          </View>
                        )}
                      </View>

                      <View style={styles.chevronToggleBtn}>
                        {isExpanded ? (
                          <ChevronUp
                            size={20}
                            color={colors.text.secondary}
                            strokeWidth={2.2}
                          />
                        ) : (
                          <ChevronDown
                            size={20}
                            color={colors.text.secondary}
                            strokeWidth={2.2}
                          />
                        )}
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.answersContainer}>
                        {item.answers.map((ans, aIdx) => {
                          const ansTextLower = (ans.text || '').toLowerCase();
                          const ansNameLower = (ans.name || '').toLowerCase();
                          const ansMatched =
                            isSearchActive &&
                            (ansTextLower.includes(trimmedSearchQuery) ||
                              ansNameLower.includes(trimmedSearchQuery));

                          return (
                            <View key={ans.id || aIdx} style={styles.answerRow}>
                              <UserAvatar
                                avatar={ans.avatar}
                                size={32}
                                style={{ marginRight: 10, marginTop: 2 }}
                              />
                              <View style={styles.answerContentCol}>
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 6,
                                  }}
                                >
                                  <Text
                                    style={[
                                      styles.answerAuthorName,
                                      ansMatched &&
                                        ansNameLower.includes(
                                          trimmedSearchQuery
                                        ) &&
                                        styles.answerAuthorNameMatched,
                                    ]}
                                  >
                                    {ans.name}
                                  </Text>
                                  {ansMatched && (
                                    <View style={styles.searchMatchPill}>
                                      <Text style={styles.searchMatchPillText}>
                                        답변 일치
                                      </Text>
                                    </View>
                                  )}
                                </View>
                                <View
                                  style={[
                                    styles.answerBubble,
                                    ansMatched && styles.answerBubbleMatched,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.answerText,
                                      ansMatched && styles.answerTextMatched,
                                    ]}
                                  >
                                    “{ans.text}”
                                  </Text>
                                </View>
                              </View>
                            </View>
                          );
                        })}

                        {item.answers.length === 0 && (
                          <View style={styles.emptyAnswersBox}>
                            <Text style={styles.emptyAnswersText}>
                              아직 가족들의 답변이 등록되지 않았습니다.{'\n'}함께 탭에서 오늘의 질문에 답변을 남겨보세요! 🕊️
                            </Text>
                          </View>
                        )}

                        <TouchableOpacity
                          style={styles.collapseFooterBtn}
                          onPress={() => handleToggleExpand(item.id)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.collapseFooterBtnText}>
                            답변 접기 ▲
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}

              {filteredArchiveList.length === 0 && (
                <View style={styles.emptySearchBox}>
                  <Search
                    size={32}
                    color={colors.text.muted}
                    style={{ marginBottom: 10 }}
                  />
                  <Text style={styles.emptySearchTitle}>
                    {isSearchActive
                      ? `'${searchQuery}'에 대한 검색 결과가 없습니다`
                      : '선택하신 기간에 스몰톡 질문이 없습니다'}
                  </Text>
                  <Text style={styles.emptySearchSub}>
                    {isSearchActive
                      ? '다른 질문 키워드나 가족 이름, 답변 내용으로 검색해보세요.'
                      : '다른 월을 선택하시거나 검색어를 확인해보세요.'}
                  </Text>
                  {isSearchActive && (
                    <TouchableOpacity
                      style={styles.clearSearchBtn}
                      onPress={() => setSearchQuery('')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.clearSearchBtnText}>
                        검색어 지우기
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      )}

      {/* 3. Month & Year Fast-Jump Picker Modal */}
      <Modal
        visible={monthPickerModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setMonthPickerModalVisible(false)}
      >
        <View style={styles.monthPickerContainer}>
          <View style={styles.photoModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.photoModalTitle}>스몰톡 기간 선택</Text>
              <Text style={styles.photoModalSubtitle}>
                우리 가족이 생성된 달({familyCreatedAt.getFullYear()}년 {familyCreatedAt.getMonth() + 1}월)부터의 모든 문답 아카이브입니다.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.photoModalCloseBtn}
              onPress={() => setMonthPickerModalVisible(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={22} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.monthPickerQuickRow}>
            <TouchableOpacity
              style={[
                styles.monthPickerAllBtn,
                selectedMonth === 'all' && styles.monthPickerAllBtnActive,
              ]}
              onPress={() => {
                setSelectedMonth('all');
                setMonthPickerModalVisible(false);
              }}
              activeOpacity={0.8}
            >
              <Layers
                size={16}
                color={
                  selectedMonth === 'all' ? colors.text.inverse : colors.primary
                }
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.monthPickerAllBtnText,
                  selectedMonth === 'all' &&
                    styles.monthPickerAllBtnTextActive,
                ]}
              >
                모든 기간 전체 보기 ({smallTalkArchiveList.length}개 질문)
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.monthPickerScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {groupedYears.map((group) => (
              <View key={group.year} style={styles.yearGroupSection}>
                <View style={styles.yearGroupHeader}>
                  <Text style={styles.yearGroupTitle}>{group.year}년</Text>
                  <Text style={styles.yearGroupCountText}>
                    총 {group.months.reduce((acc, m) => acc + m.count, 0)}개 질문
                  </Text>
                </View>

                <View style={styles.yearMonthsGrid}>
                  {group.months.map((item) => {
                    const isSelected = selectedMonth === item.id;
                    const isDisabled = item.isDisabled;

                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.monthGridCell,
                          isSelected && styles.monthGridCellActive,
                          isDisabled && styles.monthGridCellDisabled,
                        ]}
                        disabled={isDisabled}
                        onPress={() => {
                          setSelectedMonth(item.id);
                          setMonthPickerModalVisible(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.monthGridCellText,
                            isSelected && styles.monthGridCellTextActive,
                            isDisabled && styles.monthGridCellTextDisabled,
                          ]}
                        >
                          {item.month}월
                        </Text>
                        <Text
                          style={[
                            styles.monthGridCellCount,
                            isSelected && styles.monthGridCellCountActive,
                            isDisabled && styles.monthGridCellCountDisabled,
                          ]}
                        >
                          {isDisabled ? '생성 전' : `${item.count}개`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, // Figma Warm Cream Background
  },
  scrollContent: {
    paddingBottom: 40,
  },
  segmentedTabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 3,
    marginTop: 8,
    marginBottom: 8,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  segmentBtnTextActive: {
    color: colors.primary,
    fontWeight: '900',
  },
  archiveSection: {
    paddingHorizontal: 20,
  },
  archiveBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    marginBottom: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  archiveBannerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: '#FFE0D6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  archiveBannerContent: {
    flex: 1,
  },
  archiveBannerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.text.primary,
    marginBottom: 3,
  },
  archiveBannerDesc: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 17,
  },
  monthChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  monthChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
  },
  monthChipHalfBtn: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  monthChipBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  monthChipBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  monthChipBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  moreMonthPickerBtn: {
    backgroundColor: colors.primaryLight,
    borderColor: '#FFD5CC',
  },
  moreMonthPickerBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.primary,
  },
  monthSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  monthSummaryLeft: {
    flex: 1,
    marginRight: 8,
  },
  monthSummaryTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.text.primary,
    marginBottom: 2,
  },
  monthSummarySub: {
    fontSize: 11.5,
    color: colors.text.secondary,
  },
  monthSummaryRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expandAllToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.border,
  },
  expandAllToggleBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  archiveControlsRow: {
    marginBottom: 10,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
  },
  searchBarBoxActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFFBF9',
  },
  searchBarInput: {
    flex: 1,
    fontSize: 13.5,
    color: colors.text.primary,
    padding: 0,
    ...(Platform.OS === 'web' ? { outlineWidth: 0, outlineStyle: 'none' } : {}),
  },
  archiveFilterChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  archiveFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  archiveFilterChipActive: {
    backgroundColor: colors.primary,
  },
  archiveFilterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  archiveFilterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  archiveCardsList: {
    gap: 10,
  },
  archiveCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  archiveCardExpanded: {
    borderColor: '#FED7AA',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  archiveCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  archiveHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  archiveDateBadge: {
    backgroundColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  archiveDateBadgeToday: {
    backgroundColor: colors.primaryLight,
  },
  archiveDateBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text.secondary,
  },
  archiveDateBadgeTextToday: {
    color: colors.primary,
  },
  archiveIndexBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  archiveIndexBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.muted,
  },
  autoBookBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  autoBookBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#059669',
  },
  waitingAnswerBadge: {
    backgroundColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  waitingAnswerBadgeText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.text.muted,
  },
  archiveQuestionToggleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  archiveQuestionTitleCol: {
    flex: 1,
    marginRight: 8,
  },
  archiveQuestionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.text.primary,
    lineHeight: 21,
  },
  archiveQuestionTitleCollapsed: {
    marginBottom: 4,
  },
  chevronToggleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  collapsedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  collapsedAvatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarMiniIcons: {
    flexDirection: 'row',
    marginRight: 6,
  },
  collapsedAnswerCountText: {
    fontSize: 11.5,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  collapsedNoAnswerText: {
    fontSize: 11.5,
    color: colors.text.muted,
  },
  answersContainer: {
    gap: 8,
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E0D0',
    marginTop: 10,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  answerContentCol: {
    flex: 1,
  },
  answerAuthorName: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.text.secondary,
    marginBottom: 2,
  },
  answerBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E8E0D0',
  },
  answerText: {
    fontSize: 13,
    color: colors.text.primary,
    lineHeight: 18,
    fontWeight: '500',
  },
  emptyAnswersBox: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyAnswersText: {
    fontSize: 12,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 17,
  },
  collapseFooterBtn: {
    alignItems: 'center',
    paddingVertical: 6,
    marginTop: 4,
  },
  collapseFooterBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.text.muted,
  },
  emptySearchBox: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptySearchTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: colors.text.secondary,
    marginBottom: 4,
  },
  emptySearchSub: {
    fontSize: 12,
    color: colors.text.muted,
  },
  searchMonthBadge: {
    backgroundColor: colors.border,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  searchMonthBadgeText: {
    fontSize: 10,
    color: colors.text.secondary,
    fontWeight: '700',
  },
  searchMatchPill: {
    backgroundColor: colors.primaryLight,
    borderColor: '#FFE8E0',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  searchMatchPillText: {
    fontSize: 9.5,
    color: colors.primary,
    fontWeight: '800',
  },
  archiveQuestionTitleMatched: {
    color: '#C2410C',
  },
  answerAuthorNameMatched: {
    color: colors.primary,
    fontWeight: '800',
  },
  answerBubbleMatched: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderWidth: 1.2,
  },
  answerTextMatched: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  clearSearchBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE8E0',
  },
  clearSearchBtnText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
  },
  photoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    paddingBottom: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E0D0',
  },
  photoModalTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.text.primary,
  },
  photoModalSubtitle: {
    fontSize: 12.5,
    color: colors.text.secondary,
    marginTop: 3,
  },
  photoModalCloseBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: colors.border,
  },
  monthPickerContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  monthPickerQuickRow: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAE1',
  },
  monthPickerAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    borderWidth: 1.2,
    borderColor: '#FFD5CC',
    paddingVertical: 10,
    borderRadius: 14,
  },
  monthPickerAllBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  monthPickerAllBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  monthPickerAllBtnTextActive: {
    color: '#FFFFFF',
  },
  monthPickerScrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  yearGroupSection: {
    marginBottom: 24,
  },
  yearGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  yearGroupTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.text.primary,
  },
  yearGroupCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  yearMonthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthGridCell: {
    width: (width - 40 - 24) / 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
  },
  monthGridCellActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  monthGridCellDisabled: {
    backgroundColor: '#F5F5F4',
    borderColor: '#E7E5E4',
    opacity: 0.5,
  },
  monthGridCellText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: 2,
  },
  monthGridCellTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  monthGridCellTextDisabled: {
    color: colors.text.muted,
  },
  monthGridCellCount: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  monthGridCellCountActive: {
    color: '#FFFFFF',
  },
  monthGridCellCountDisabled: {
    color: colors.text.muted,
    fontSize: 10,
  },
});
