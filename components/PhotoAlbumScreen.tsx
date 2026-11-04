import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BookOpen, MessageSquare } from 'lucide-react-native';
import PhotobookStudioScreen from './PhotobookStudioScreen';
import { getTopicForToday, stripEmojis } from '../utils/topics';
import { fetchSmallTalkTopicsFromDB, getTopicForDateFromList } from '../services/smallTalkService';
import { supabase } from '../lib/supabase';
import { colors } from '../theme';
import { styles } from './album/PhotoAlbumStyles';
import { SmallTalkArchiveView } from './album/SmallTalkArchiveView';
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

export type ArchiveTabType = 'photobook' | 'smalltalk-archive';
export type { ArchiveFilterType } from './album/SmallTalkArchiveView';

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

const DEFAULT_NAMES: Record<string, string> = {
  mom: '엄마',
  dad: '아빠',
  son: '아들',
  daughter: '딸',
};

const DEFAULT_AVATARS: Record<string, string> = {
  mom: '👩‍🦰',
  dad: '👨‍💼',
  son: '👦',
  daughter: '👧',
};

function PhotoAlbumScreen({
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

  // SmallTalk Archive DB States
  const [dbResponses, setDbResponses] = useState<SmallTalkResponseRow[]>([]);
  const [dbTopics, setDbTopics] = useState<any[]>([]);

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

  // O(1) 가족 구성원 조회 맵
  const memberLookupMap = useMemo<Record<string, FamilyMember>>(() => {
    const map: Record<string, FamilyMember> = {};
    for (const m of familyMembers) {
      if (!m) continue;
      if (m.id) map[m.id] = m;
      if (m.role) map[m.role] = m;
    }
    return map;
  }, [familyMembers]);

  const getMemberName = useCallback(
    (idOrRole: string): string => {
      const match = memberLookupMap[idOrRole];
      if (match?.name) return match.name;
      return DEFAULT_NAMES[idOrRole] || idOrRole;
    },
    [memberLookupMap]
  );

  const getMemberAvatar = useCallback(
    (idOrRole: string): string => {
      const match = memberLookupMap[idOrRole];
      if (match?.avatar) return match.avatar;
      return DEFAULT_AVATARS[idOrRole] || '👦';
    },
    [memberLookupMap]
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
    for (const r of dbResponses || []) {
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
      return new Date(
        (earliestDate as Date).getFullYear(),
        (earliestDate as Date).getMonth(),
        1
      );
    }
    return new Date(2026, 7, 1);
  }, [currentUserProfile?.family_created_at, currentUserProfile?.created_at, dbResponses]);

  const includedTopicsSet = useMemo<Set<string>>(
    () => new Set(includedSmallTalkTopics.map((t) => stripEmojis(t))),
    [includedSmallTalkTopics]
  );

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
      const seenProfileIds = new Set<string>();

      if (isToday) {
        Object.entries(todayResponses).forEach(([key, text]) => {
          if (text) {
            seenProfileIds.add(key);
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
        if (!seenProfileIds.has(ans.profile_id)) {
          seenProfileIds.add(ans.profile_id);
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
      const isInBook = includedTopicsSet.has(topic);

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
      const isInBook = includedTopicsSet.has(topic);

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
    familyMembers.length,
    includedTopicsSet,
    familyCreatedAt,
    getMemberName,
    getMemberAvatar,
  ]);

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
        <SmallTalkArchiveView
          smallTalkArchiveList={smallTalkArchiveList}
          familyCreatedAt={familyCreatedAt}
        />
      )}
    </View>
  );
}

export default React.memo(PhotoAlbumScreen);
