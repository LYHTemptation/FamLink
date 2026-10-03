import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
  TextInput,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BookOpen,
  Sparkles,
  Image as ImageIcon,
  X,
  Calendar,
  User,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  MessageSquare,
  Heart,
  Award,
  Search,
  Filter,
  Layers,
  Trash2,
  Edit3,
  Bookmark,
  Share2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import FamilyStorybookModal from './FamilyStorybookModal';
import PhotobookStudioScreen from './PhotobookStudioScreen';
import { PREDEFINED_TOPICS, getTopicForDate, getTopicForToday, stripEmojis } from '../utils/topics';
import { fetchSmallTalkTopicsFromDB, getTopicForDateFromList } from '../services/smallTalkService';
import { supabase } from '../lib/supabase';
import UserAvatar from './UserAvatar';

const { width } = Dimensions.get('window');
const GRID_ITEM_SIZE = (width - 48) / 3;

// Snaps Photobook Cover Theme Presets
const PHOTOBOOK_THEMES = [
  { id: 'linen', name: '내추럴 린넨', bg: '#F5EBE1', text: '#3E2723', border: '#D7CCC8', accent: '#8D6E63' },
  { id: 'coral', name: '포근한 코랄', bg: '#FFF3F0', text: '#5D2E28', border: '#FFCDD2', accent: '#FF6B47' },
  { id: 'navy', name: '클래식 네이비', bg: '#1A2A3A', text: '#FFFFFF', border: '#2C3E50', accent: '#F1C40F', dark: true },
  { id: 'forest', name: '따뜻한 올리브', bg: '#F1F5E8', text: '#2C3B20', border: '#C5E1A5', accent: '#558B2F' },
];

export default function PhotoAlbumScreen({
  currentUser,
  familyMembers = [],
  messages = [],
  smallTalkState,
  currentUserProfile,
  onSendOrderNotice,
  points = 0,
  onDeductPoints,
}) {
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = windowWidth || Dimensions.get('window').width;
  const isSmallScreen = screenWidth < 380;

  // Navigation Tabs: 'photobook' (스냅스 포토북 스튜디오) | 'smalltalk-archive' (스몰톡 아카이브) | 'photos' (전체 사진함)
  const [activeTab, setActiveTab] = useState('photobook');

  // Photobook Project Configuration
  const [bookTitle, setBookTitle] = useState('우리 가족의 따뜻한 기록');
  const [bookSubtitle, setBookSubtitle] = useState('FamLink Story Vol.1');
  const [selectedThemeId, setSelectedThemeId] = useState('coral');
  const [includedSmallTalkTopics, setIncludedSmallTalkTopics] = useState([]);
  const [includedPhotoIds, setIncludedPhotoIds] = useState([]);

  // Modals & Viewer States
  const [storybookVisible, setStorybookVisible] = useState(false);
  const [photoManageModalVisible, setPhotoManageModalVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [editTitleModalVisible, setEditTitleModalVisible] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [tempSubtitle, setTempSubtitle] = useState('');
  const [monthPickerModalVisible, setMonthPickerModalVisible] = useState(false);

  // SmallTalk Archive States (Monthly fast-jump & Accordion)
  const [dbResponses, setDbResponses] = useState([]);
  const [dbTopics, setDbTopics] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }); // e.g. '2026-10' (현재 월 자동 선택) | 'all'
  const [expandedTopicIds, setExpandedTopicIds] = useState(['topic-0']); // Accordion open set
  const [archiveFilter, setArchiveFilter] = useState('all'); // 'all' | 'answered' | 'in-book'
  const [searchQuery, setSearchQuery] = useState('');

  // Extract all photos from messages
  const photoMessages = useMemo(() => {
    if (!messages || !Array.isArray(messages)) return [];
    return messages.filter(m => m && (m.image || m.image_url));
  }, [messages]);

  // Load Photobook Project & SmallTalk History on Mount
  useEffect(() => {
    loadSavedPhotobookConfig();
    fetchSmallTalkHistory();
  }, [currentUserProfile?.family_id]);

  const loadSavedPhotobookConfig = async () => {
    try {
      const saved = await AsyncStorage.getItem('FAMLINK_PHOTOBOOK_CONFIG');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.bookTitle) setBookTitle(parsed.bookTitle);
        if (parsed.bookSubtitle) setBookSubtitle(parsed.bookSubtitle);
        if (parsed.selectedThemeId) setSelectedThemeId(parsed.selectedThemeId);
        if (Array.isArray(parsed.includedSmallTalkTopics)) {
          setIncludedSmallTalkTopics(parsed.includedSmallTalkTopics);
        }
        if (Array.isArray(parsed.includedPhotoIds)) {
          setIncludedPhotoIds(parsed.includedPhotoIds);
        }
      } else {
        // Default initial setup: include today's smalltalk topic if available
        if (smallTalkState?.topic) {
          setIncludedSmallTalkTopics([smallTalkState.topic]);
        }
      }
    } catch (e) {
      console.warn('Failed to load photobook config:', e);
    }
  };

  const savePhotobookConfig = async (newConfig) => {
    try {
      const current = {
        bookTitle,
        bookSubtitle,
        selectedThemeId,
        includedSmallTalkTopics,
        includedPhotoIds,
        ...newConfig,
      };
      await AsyncStorage.setItem('FAMLINK_PHOTOBOOK_CONFIG', JSON.stringify(current));
    } catch (e) {
      console.warn('Failed to save photobook config:', e);
    }
  };

  // Fetch all small talk responses and topics from Supabase
  const fetchSmallTalkHistory = async () => {
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
        setDbResponses(respResult.data);
      }
      if (Array.isArray(topics) && topics.length > 0) {
        setDbTopics(topics);
      }
    } catch (e) {
      console.warn('Failed to fetch small talk history from DB:', e);
    }
  };

  // Map family members helper
  const getSenderInfo = (profileId, senderRole, senderObj) => {
    if (senderObj && typeof senderObj === 'object' && senderObj.name) {
      return {
        name: senderObj.name,
        avatar: senderObj.avatar || '👦',
        color: senderObj.color || '#3B82F6',
      };
    }
    if (familyMembers && Array.isArray(familyMembers)) {
      if (profileId) {
        const matchById = familyMembers.find(m => m && typeof m === 'object' && m.id === profileId);
        if (matchById) return { name: matchById.name, avatar: matchById.avatar || '👦', color: matchById.color || '#3B82F6' };
      }
      if (senderRole) {
        const matchByRole = familyMembers.find(m => m && typeof m === 'object' && (m.role === senderRole || m.id === senderRole));
        if (matchByRole) return { name: matchByRole.name, avatar: matchByRole.avatar || '👦', color: matchByRole.color || '#3B82F6' };
      }
    }
    const DEFAULTS = {
      mom: { name: '엄마', avatar: '👩‍🦰', color: '#FF6B47' },
      dad: { name: '아빠', avatar: '👨‍💼', color: '#3B82F6' },
      son: { name: '아들', avatar: '👦', color: '#10B981' },
      daughter: { name: '딸', avatar: '👧', color: '#F59E0B' },
    };
    return DEFAULTS[senderRole] || { name: senderRole || '가족', avatar: '👦', color: '#78716C' };
  };

  const getMemberName = (idOrRole) => {
    if (familyMembers && Array.isArray(familyMembers)) {
      const match = familyMembers.find(m => m && (m.id === idOrRole || m.role === idOrRole));
      if (match) return match.name;
    }
    const DEFAULTS = { mom: '엄마', dad: '아빠', son: '아들', daughter: '딸' };
    return DEFAULTS[idOrRole] || idOrRole;
  };

  const getMemberAvatar = (idOrRole) => {
    if (familyMembers && Array.isArray(familyMembers)) {
      const match = familyMembers.find(m => m && (m.id === idOrRole || m.role === idOrRole));
      if (match?.avatar) return match.avatar;
    }
    const DEFAULTS = { mom: '👩‍🦰', dad: '👨‍💼', son: '👦', daughter: '👧' };
    return DEFAULTS[idOrRole] || '👦';
  };

  // Family creation date (lower bound for archive dates, start of creation month)
  const familyCreatedAt = useMemo(() => {
    const raw = currentUserProfile?.family_created_at || currentUserProfile?.created_at;
    if (raw) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        return new Date(d.getFullYear(), d.getMonth(), 1);
      }
    }
    // Safe fallback: 2026-09-01
    return new Date(2026, 8, 1);
  }, [currentUserProfile?.family_created_at, currentUserProfile?.created_at]);

  // All valid calendar months since the family group was created (current month down to creation month)
  const allFamilyMonths = useMemo(() => {
    const list = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    const startYear = familyCreatedAt.getFullYear();
    const startMonth = familyCreatedAt.getMonth(); // 0-11

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
  const smallTalkArchiveList = useMemo(() => {
    const list = [];
    const todayTopic = smallTalkState?.topic || getTopicForToday();
    const todayResponses = smallTalkState?.responses || {};

    // 1. Group DB responses by topic (clean topic string without emojis)
    const dbTopicMap = {};
    (dbResponses || []).forEach(row => {
      if (!row.topic) return;
      const cleanKey = stripEmojis(row.topic);
      if (!dbTopicMap[cleanKey]) {
        dbTopicMap[cleanKey] = [];
      }
      dbTopicMap[cleanKey].push({
        id: row.id,
        profile_id: row.profile_id,
        text: row.text,
        created_at: row.created_at,
      });
    });

    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDate = now.getDate();

    // 2. Iterate each calendar day from today backwards to familyCreatedAt
    const startCursor = new Date(familyCreatedAt.getFullYear(), familyCreatedAt.getMonth(), familyCreatedAt.getDate(), 0, 0, 0);
    const curCursor = new Date(todayYear, todayMonth, todayDate, 12, 0, 0);

    const coveredTopics = new Set();
    let topicIdx = 0;

    while (curCursor >= startCursor) {
      const y = curCursor.getFullYear();
      const m = String(curCursor.getMonth() + 1).padStart(2, '0');
      const d = String(curCursor.getDate()).padStart(2, '0');
      const yearMonth = `${y}-${m}`;
      const yearMonthLabel = `${y}년 ${parseInt(m, 10)}월`;

      const isToday = y === todayYear && curCursor.getMonth() === todayMonth && curCursor.getDate() === todayDate;
      const topic = isToday ? todayTopic : stripEmojis(getTopicForDateFromList(dbTopics, curCursor));
      coveredTopics.add(topic);

      const answersList = [];

      // Check today's active responses from smallTalkState
      if (isToday) {
        Object.entries(todayResponses).forEach(([key, text]) => {
          if (text) {
            answersList.push({
              id: `today-${key}`,
              profileId: key,
              name: getMemberName(key),
              avatar: getMemberAvatar(key),
              text: text,
              created_at: now.toISOString(),
            });
          }
        });
      }

      // Merge DB answers for this topic
      const dbAnswers = dbTopicMap[topic] || [];
      dbAnswers.forEach(ans => {
        const already = answersList.some(a => a.profileId === ans.profile_id);
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

      const dateLabel = isToday ? '오늘의 질문 🌟' : `${parseInt(m, 10)}월 ${parseInt(d, 10)}일`;
      const totalFamily = Math.max(1, familyMembers.length || 4);
      const isAnswered = answersList.length > 0;
      const isComplete = answersList.length >= totalFamily;
      const isInBook = includedSmallTalkTopics.some(t => stripEmojis(t) === topic);

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

    // 3. Include any extra answered topics from DB that might not match getTopicForDateFromList
    Object.keys(dbTopicMap).forEach(topic => {
      if (coveredTopics.has(topic)) return;
      const dbAnswers = dbTopicMap[topic] || [];
      if (dbAnswers.length === 0) return;

      const answersList = dbAnswers.map(ans => ({
        id: ans.id,
        profileId: ans.profile_id,
        name: getMemberName(ans.profile_id),
        avatar: getMemberAvatar(ans.profile_id),
        text: ans.text,
        created_at: ans.created_at,
      }));

      const latestAnsDate = answersList.find(a => a.created_at)?.created_at;
      const itemDate = latestAnsDate ? new Date(latestAnsDate) : new Date(familyCreatedAt);
      const y = itemDate.getFullYear();
      const m = String(itemDate.getMonth() + 1).padStart(2, '0');
      const d = String(itemDate.getDate()).padStart(2, '0');
      const yearMonth = `${y}-${m}`;
      const yearMonthLabel = `${y}년 ${parseInt(m, 10)}월`;
      const dateLabel = `${parseInt(m, 10)}월 ${parseInt(d, 10)}일`;
      const totalFamily = Math.max(1, familyMembers.length || 4);
      const isInBook = includedSmallTalkTopics.some(t => stripEmojis(t) === topic);

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

    // Sort: Today's question first, then newest date descending
    list.sort((a, b) => {
      if (a.isToday) return -1;
      if (b.isToday) return 1;
      return (b.itemDate?.getTime() || 0) - (a.itemDate?.getTime() || 0);
    });

    return list;
  }, [smallTalkState, dbResponses, dbTopics, familyMembers, includedSmallTalkTopics, familyCreatedAt]);

  // Available Months with total and answered count
  const availableMonths = useMemo(() => {
    const monthStats = {};
    smallTalkArchiveList.forEach(item => {
      if (!monthStats[item.yearMonth]) {
        monthStats[item.yearMonth] = { total: 0, answered: 0 };
      }
      monthStats[item.yearMonth].total += 1;
      if (item.isAnswered) {
        monthStats[item.yearMonth].answered += 1;
      }
    });

    return allFamilyMonths.map(fm => ({
      id: fm.id,
      label: fm.label,
      year: fm.year,
      month: fm.month,
      count: monthStats[fm.id]?.total || 0,
      answeredCount: monthStats[fm.id]?.answered || 0,
    }));
  }, [allFamilyMonths, smallTalkArchiveList]);

  // Quick Jump Chips: 현재 월, 전 월, (필요시 선택된 과거월), 전체
  const displayedChips = useMemo(() => {
    const chips = [];
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth(); // 0-11
    const curMonthId = `${curYear}-${String(curMonth + 1).padStart(2, '0')}`;

    // 1. 현재 월 (년도 월 형식 + 답변/전체 비율)
    const curMonthMatch = availableMonths.find(m => m.id === curMonthId);
    chips.push({
      id: curMonthId,
      label: `${curYear}년 ${curMonth + 1}월`,
      fullLabel: `${curYear}년 ${curMonth + 1}월`,
      count: curMonthMatch ? curMonthMatch.count : 0,
      answeredCount: curMonthMatch ? curMonthMatch.answeredCount : 0,
    });

    // 2. 전 월 (년도 월 형식 + 답변/전체 비율)
    const prevDate = new Date(curYear, curMonth - 1, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth();
    const prevMonthId = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;
    const prevMonthMatch = availableMonths.find(m => m.id === prevMonthId);
    chips.push({
      id: prevMonthId,
      label: `${prevYear}년 ${prevMonth + 1}월`,
      fullLabel: `${prevYear}년 ${prevMonth + 1}월`,
      count: prevMonthMatch ? prevMonthMatch.count : 0,
      answeredCount: prevMonthMatch ? prevMonthMatch.answeredCount : 0,
    });

    // 3. 만약 사용자가 '연·월 선택'으로 현재월/전월이 아닌 과거 월을 선택한 경우, 칩 목록에 노출 유지
    if (selectedMonth !== 'all' && selectedMonth !== curMonthId && selectedMonth !== prevMonthId) {
      const match = availableMonths.find(m => m.id === selectedMonth);
      if (match) {
        chips.push({
          id: match.id,
          label: match.label,
          fullLabel: match.label,
          count: match.count,
          answeredCount: match.answeredCount,
        });
      }
    }

    // 4. 전체 (답변/전체 비율)
    chips.push({
      id: 'all',
      label: '전체',
      fullLabel: '전체',
      count: smallTalkArchiveList.length,
      answeredCount: smallTalkArchiveList.filter(i => i.isAnswered).length,
    });

    return chips;
  }, [availableMonths, selectedMonth, smallTalkArchiveList]);

  // Grouped Years for multi-year month picker modal
  const groupedYears = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    const startYear = familyCreatedAt.getFullYear();
    const startMonth = familyCreatedAt.getMonth(); // 0-11

    const years = [];
    for (let y = currentYear; y >= startYear; y--) {
      const monthsForYear = [];
      for (let m = 11; m >= 0; m--) {
        const monthNum = m + 1;
        const monthStr = String(monthNum).padStart(2, '0');
        const id = `${y}-${monthStr}`;
        const isFuture = y === currentYear && m > currentMonth;
        const isBeforeFamily = y === startYear && m < startMonth;
        const isDisabled = isFuture || isBeforeFamily;

        const match = availableMonths.find(am => am.id === id);
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

      years.push({
        year: y,
        months: monthsForYear,
      });
    }

    return years;
  }, [familyCreatedAt, availableMonths]);

  // Selected month scope list (or all)
  const monthScopedList = useMemo(() => {
    if (selectedMonth === 'all') return smallTalkArchiveList;
    return smallTalkArchiveList.filter(item => item.yearMonth === selectedMonth);
  }, [smallTalkArchiveList, selectedMonth]);

  // Filtered Archive List based on Monthly chip, Filter chips & Search
  const filteredArchiveList = useMemo(() => {
    return monthScopedList.filter(item => {
      if (archiveFilter === 'answered' && !item.isAnswered) return false;
      if (archiveFilter === 'unanswered' && item.isAnswered) return false;
      if (archiveFilter === 'in-book' && !item.isInBook) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const topicMatch = item.topic.toLowerCase().includes(query);
        const ansMatch = item.answers.some(a => (a.text || '').toLowerCase().includes(query) || (a.name || '').toLowerCase().includes(query));
        return topicMatch || ansMatch;
      }
      return true;
    });
  }, [monthScopedList, archiveFilter, searchQuery]);

  // Accordion Toggle Handlers
  const handleToggleExpand = (topicId) => {
    setExpandedTopicIds(prev => {
      if (prev.includes(topicId)) {
        return prev.filter(id => id !== topicId);
      } else {
        return [...prev, topicId];
      }
    });
  };

  const handleExpandAll = () => {
    if (expandedTopicIds.length === filteredArchiveList.length) {
      setExpandedTopicIds([]);
    } else {
      setExpandedTopicIds(filteredArchiveList.map(item => item.id));
    }
  };

  // Toggle SmallTalk into Photobook
  const handleToggleSmallTalkInBook = (topic) => {
    const already = includedSmallTalkTopics.includes(topic);
    let updated;
    if (already) {
      updated = includedSmallTalkTopics.filter(t => t !== topic);
      setIncludedSmallTalkTopics(updated);
      savePhotobookConfig({ includedSmallTalkTopics: updated });
      Alert.alert('알림', `'${topic.slice(0, 15)}...' 질문이 포토북에서 제외되었습니다.`);
    } else {
      updated = [...includedSmallTalkTopics, topic];
      setIncludedSmallTalkTopics(updated);
      savePhotobookConfig({ includedSmallTalkTopics: updated });
      Alert.alert(
        '포토북 수록 완료! 🎉',
        `가족들의 소중한 문답이 '우리 가족 포토북'의 인터뷰 페이지로 수록되었습니다.\n[포토북 스튜디오] 탭에서 확인해보세요!`,
        [
          { text: '계속 둘러보기' },
          { text: '포토북 보기', onPress: () => setActiveTab('photobook') },
        ]
      );
    }
  };

  // Batch add current month's answered topics into photobook
  const handleBatchAddMonthToBook = () => {
    const currentMonthAnsweredTopics = filteredArchiveList
      .filter(i => i.isAnswered)
      .map(i => i.topic);

    if (currentMonthAnsweredTopics.length === 0) {
      Alert.alert('알림', '포토북에 담을 수 있는 답변 완료된 스몰톡이 없습니다.');
      return;
    }

    const newTopics = Array.from(new Set([...includedSmallTalkTopics, ...currentMonthAnsweredTopics]));
    setIncludedSmallTalkTopics(newTopics);
    savePhotobookConfig({ includedSmallTalkTopics: newTopics });

    const activeMonthObj = availableMonths.find(m => m.id === selectedMonth);
    const activeMonthName = activeMonthObj ? activeMonthObj.label : '해당 기간';
    Alert.alert(
      '월간 전체 수록 완료! 🎉',
      `${activeMonthName}의 스몰톡 문답 ${currentMonthAnsweredTopics.length}개가 포토북에 일괄 수록되었습니다!\n[포토북 스튜디오] 탭에서 확인해보세요.`,
      [
        { text: '확인' },
        { text: '포토북 보기', onPress: () => setActiveTab('photobook') },
      ]
    );
  };

  // Toggle Photo into Photobook
  const handleTogglePhotoInBook = (photoMsgId, showAlert = false) => {
    const already = includedPhotoIds.includes(photoMsgId);
    let updated;
    if (already) {
      updated = includedPhotoIds.filter(id => id !== photoMsgId);
      setIncludedPhotoIds(updated);
      savePhotobookConfig({ includedPhotoIds: updated });
    } else {
      updated = [...includedPhotoIds, photoMsgId];
      setIncludedPhotoIds(updated);
      savePhotobookConfig({ includedPhotoIds: updated });
      if (showAlert) {
        Alert.alert('포토북에 담김 📸', '선택하신 사진이 포토북 사진 페이지에 추가되었습니다!');
      }
    }
  };

  // Batch Select / Deselect All Photos
  const handleSelectAllPhotos = () => {
    const allIds = photoMessages.map(m => m.id);
    setIncludedPhotoIds(allIds);
    savePhotobookConfig({ includedPhotoIds: allIds });
  };

  const handleDeselectAllPhotos = () => {
    setIncludedPhotoIds([]);
    savePhotobookConfig({ includedPhotoIds: [] });
  };

  // Active theme object
  const currentTheme = PHOTOBOOK_THEMES.find(t => t.id === selectedThemeId) || PHOTOBOOK_THEMES[1];

  // Prepared custom smalltalks for FamilyStorybookModal
  const photobookCustomSmallTalks = useMemo(() => {
    return includedSmallTalkTopics.map(topic => {
      const match = smallTalkArchiveList.find(a => a.topic === topic);
      return {
        topic,
        items: (match?.answers || []).map(a => ({
          name: a.name,
          role: a.name,
          avatar: a.avatar || '👦',
          answer: a.text,
        })),
      };
    });
  }, [includedSmallTalkTopics, smallTalkArchiveList]);

  // Selected cover photo
  const coverPhoto = useMemo(() => {
    if (includedPhotoIds.length > 0) {
      const found = photoMessages.find(m => includedPhotoIds.includes(m.id));
      if (found) return found.image_url || found.image;
    }
    if (photoMessages.length > 0) {
      return photoMessages[0].image_url || photoMessages[0].image;
    }
    return null;
  }, [includedPhotoIds, photoMessages]);

  return (
    <View style={styles.container}>
      {/* 1. Header Bar matching Figma Home/Together Warm Style */}
      <View style={[styles.headerRow, isSmallScreen && { paddingHorizontal: 14, paddingVertical: 12 }]}>
        <View style={styles.headerLeftCol}>
          <Text style={styles.categorySubText}>가족 추억 · PHOTOBOOK & ARCHIVE</Text>
          <Text style={[styles.headerMainTitle, isSmallScreen && { fontSize: 18 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
            가족 앨범 & 포토북
          </Text>
        </View>

        {activeTab !== 'photobook' && (
          <TouchableOpacity
            style={[styles.openStorybookBtn, isSmallScreen && { paddingHorizontal: 12, paddingVertical: 7 }]}
            onPress={() => setStorybookVisible(true)}
            activeOpacity={0.85}
          >
            <BookOpen size={15} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 5 }} />
            <Text style={[styles.openStorybookBtnText, isSmallScreen && { fontSize: 12 }]}>포토북 펼치기</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 2. Top Segmented Navigation Tabs */}
      <View style={[styles.segmentedTabContainer, isSmallScreen && { marginHorizontal: 14 }]}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'photobook' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('photobook')}
          activeOpacity={0.8}
        >
          <BookOpen size={16} color={activeTab === 'photobook' ? '#FF6B47' : '#78716C'} strokeWidth={2.2} />
          <Text
            style={[styles.segmentBtnText, activeTab === 'photobook' && styles.segmentBtnTextActive, isSmallScreen && { fontSize: 12 }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            포토북 스튜디오
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'smalltalk-archive' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('smalltalk-archive')}
          activeOpacity={0.8}
        >
          <MessageSquare size={16} color={activeTab === 'smalltalk-archive' ? '#FF6B47' : '#78716C'} strokeWidth={2.2} />
          <Text
            style={[styles.segmentBtnText, activeTab === 'smalltalk-archive' && styles.segmentBtnTextActive, isSmallScreen && { fontSize: 12 }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            스몰톡 아카이브
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. Main Content Views by Tab */}
      {activeTab === 'photobook' ? (
        <View style={{ flex: 1 }}>
          <PhotobookStudioScreen
            currentUser={currentUser}
            familyMembers={familyMembers}
            messages={messages}
            smallTalkState={smallTalkState}
            currentUserProfile={currentUserProfile}
            points={points}
            onDeductPoints={onDeductPoints}
            onSendOrderNotice={onSendOrderNotice}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {false && (
            <View>
              <View>
                <View>
                  <View style={[styles.bookSpine, { backgroundColor: currentTheme.accent }]} />
                <View style={styles.bookCoverFace}>
                  <View style={styles.bookEmbossBorder}>
                    <Text style={[styles.bookBadgeLabel, { color: currentTheme.accent }]}>
                      FAMILY STORYBOOK · VOL. 1
                    </Text>
                    <Text style={[styles.bookTitleDisplay, { color: currentTheme.text }]} numberOfLines={2}>
                      {bookTitle}
                    </Text>
                    <Text style={[styles.bookSubtitleDisplay, { color: currentTheme.accent }]} numberOfLines={1}>
                      {bookSubtitle}
                    </Text>

                    {/* Cover Hero Photo or Fallback */}
                    <TouchableOpacity
                      style={styles.bookHeroPhotoFrame}
                      onPress={() => setPhotoManageModalVisible(true)}
                      activeOpacity={0.85}
                    >
                      {coverPhoto ? (
                        <Image source={{ uri: coverPhoto }} style={styles.bookHeroImage} resizeMode="cover" />
                      ) : (
                        <View style={styles.bookHeroPhotoPlaceholder}>
                          <Heart size={36} color={currentTheme.accent} />
                          <Text style={[styles.bookHeroPlaceholderText, { color: currentTheme.text }]}>
                            터치하여 포토북 수록 사진을 선택해보세요 📷
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    <Text style={[styles.bookFamilySign, { color: currentTheme.text }]}>
                      {currentUserProfile?.name || '가족'}네 따뜻한 보금자리 • FamLink Press
                    </Text>
                  </View>
                </View>
              </View>

              {/* Book Edit / Customization Actions */}
              <View style={styles.bookCustomRow}>
                <TouchableOpacity
                  style={styles.editTitleBtn}
                  onPress={() => {
                    setTempTitle(bookTitle);
                    setTempSubtitle(bookSubtitle);
                    setEditTitleModalVisible(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Edit3 size={14} color="#78716C" style={{ marginRight: 5 }} />
                  <Text style={styles.editTitleBtnText}>책 제목 & 부제 편집</Text>
                </TouchableOpacity>

                {/* Theme Color Selector Chips */}
                <View style={styles.themeSelectorRow}>
                  {PHOTOBOOK_THEMES.map(theme => (
                    <TouchableOpacity
                      key={theme.id}
                      style={[
                        styles.themeDotBtn,
                        { backgroundColor: theme.bg, borderColor: theme.border },
                        selectedThemeId === theme.id && styles.themeDotBtnActive,
                      ]}
                      onPress={() => {
                        setSelectedThemeId(theme.id);
                        savePhotobookConfig({ selectedThemeId: theme.id });
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.themeDotInner, { backgroundColor: theme.accent }]} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Progress Summary Card */}
              <View style={styles.bookStatsCard}>
                <View style={styles.bookStatCol}>
                  <Text style={styles.bookStatNum}>{8 + Math.max(0, includedSmallTalkTopics.length - 1)}</Text>
                  <Text style={styles.bookStatLabel}>페이지 구성</Text>
                </View>
                <View style={styles.statDivider} />
                <TouchableOpacity
                  style={styles.bookStatCol}
                  onPress={() => setPhotoManageModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.bookStatNum, { color: '#3B82F6' }]}>
                      {includedPhotoIds.length > 0 ? includedPhotoIds.length : photoMessages.length}
                    </Text>
                    <ChevronRight size={13} color="#3B82F6" style={{ marginLeft: 2 }} />
                  </View>
                  <Text style={styles.bookStatLabel}>수록 사진 관리</Text>
                </TouchableOpacity>
                <View style={styles.statDivider} />
                <TouchableOpacity
                  style={styles.bookStatCol}
                  onPress={() => setActiveTab('smalltalk-archive')}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.bookStatNum, { color: '#FF6B47' }]}>{includedSmallTalkTopics.length}</Text>
                    <ChevronRight size={13} color="#FF6B47" style={{ marginLeft: 2 }} />
                  </View>
                  <Text style={styles.bookStatLabel}>스몰톡 문답 수록</Text>
                </TouchableOpacity>
              </View>

              {/* CTA Action Buttons */}
              <View style={styles.bookActionButtonsRow}>
                <TouchableOpacity
                  style={styles.primaryFlipBookBtn}
                  onPress={() => setStorybookVisible(true)}
                  activeOpacity={0.85}
                >
                  <BookOpen size={18} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 6 }} />
                  <Text style={styles.primaryFlipBookBtnText}>실제 책처럼 넘겨보기</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.podOrderShortcutBtn}
                  onPress={() => setStorybookVisible(true)}
                  activeOpacity={0.85}
                >
                  <ShoppingBag size={17} color="#FF6B47" strokeWidth={2.2} style={{ marginRight: 6 }} />
                  <Text style={styles.podOrderShortcutBtnText}>실물 양장본 인쇄 주문</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Photobook Table of Contents & Spreads List */}
            <View style={styles.chapterSection}>
              <View style={styles.chapterSectionHeader}>
                <View>
                  <Text style={styles.chapterSectionTitle}>포토북 수록 목차 & 페이지</Text>
                  <Text style={styles.chapterSectionSub}>
                    스냅스와의 차별점: 사진뿐 아니라 가족의 스몰톡 문답을 직접 인터뷰 페이지로 수록합니다.
                  </Text>
                </View>
              </View>

              <View style={styles.pageCardList}>
                {/* 1. 표지 */}
                <View style={styles.pageItemCard}>
                  <View style={styles.pageNumberBadge}>
                    <Text style={styles.pageNumberText}>Cover</Text>
                  </View>
                  <View style={styles.pageItemInfo}>
                    <Text style={styles.pageItemTitle}>겉표지: "{bookTitle}"</Text>
                    <Text style={styles.pageItemDesc}>양장 하드커버 · {currentTheme.name} 테마</Text>
                  </View>
                  <Check size={18} color="#10B981" />
                </View>

                {/* 2. 프롤로그 */}
                <View style={styles.pageItemCard}>
                  <View style={styles.pageNumberBadge}>
                    <Text style={styles.pageNumberText}>P. 1</Text>
                  </View>
                  <View style={styles.pageItemInfo}>
                    <Text style={styles.pageItemTitle}>프롤로그: 우리의 이야기, 그리고 가족들</Text>
                    <Text style={styles.pageItemDesc}>가족 구성원 프로필 및 따뜻한 시작의 글</Text>
                  </View>
                  <Check size={18} color="#10B981" />
                </View>

                {/* 3. 스몰톡 인터뷰 페이지들 (스냅스 차별화!) */}
                {includedSmallTalkTopics.map((topic, idx) => {
                  const match = smallTalkArchiveList.find(a => a.topic === topic);
                  return (
                    <View key={topic} style={[styles.pageItemCard, styles.smalltalkPageCardHighlight]}>
                      <View style={[styles.pageNumberBadge, { backgroundColor: '#FF6B47' }]}>
                        <Text style={[styles.pageNumberText, { color: '#FFFFFF' }]}>P. {idx + 2}</Text>
                      </View>
                      <View style={styles.pageItemInfo}>
                        <View style={styles.smalltalkTagPill}>
                          <MessageSquare size={11} color="#FF6B47" style={{ marginRight: 4 }} />
                          <Text style={styles.smalltalkTagPillText}>스몰톡 인터뷰 수록</Text>
                        </View>
                        <Text style={styles.pageItemTitle} numberOfLines={1}>
                          "{topic}"
                        </Text>
                        <Text style={styles.pageItemDesc}>
                          {match ? `${match.answers.length}명의 가족 답변 수록 (${match.answers.map(a => a.name).join(', ')})` : '답변 수록 완료'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleToggleSmallTalkInBook(topic)}
                        style={styles.removePageBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={16} color="#A8A29E" />
                      </TouchableOpacity>
                    </View>
                  );
                })}

                {/* 4. 사진 갤러리 페이지들 */}
                <TouchableOpacity
                  style={[styles.pageItemCard, { borderColor: '#BFDBFE', backgroundColor: '#F8FAFC' }]}
                  onPress={() => setPhotoManageModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.pageNumberBadge, { backgroundColor: '#3B82F6' }]}>
                    <Text style={[styles.pageNumberText, { color: '#FFFFFF' }]}>P. {includedSmallTalkTopics.length + 2}</Text>
                  </View>
                  <View style={styles.pageItemInfo}>
                    <View style={styles.smalltalkTagPill}>
                      <ImageIcon size={11} color="#3B82F6" style={{ marginRight: 4 }} />
                      <Text style={[styles.smalltalkTagPillText, { color: '#3B82F6' }]}>사진 갤러리 챕터</Text>
                    </View>
                    <Text style={styles.pageItemTitle}>가족 사진 갤러리 & 추억 콜라주</Text>
                    <Text style={styles.pageItemDesc}>
                      {includedPhotoIds.length > 0
                        ? `포토북 수록 사진 ${includedPhotoIds.length}장 선택됨 (전체 ${photoMessages.length}장) · 탭하여 관리`
                        : `채팅 사진 ${photoMessages.length}장 수록 · 탭하여 사진 관리`}
                    </Text>
                  </View>
                  <View style={styles.managePhotosBadge}>
                    <Text style={styles.managePhotosBadgeText}>사진 관리</Text>
                    <ChevronRight size={14} color="#3B82F6" />
                  </View>
                </TouchableOpacity>

                {/* 5. AI 문예 수필 */}
                <View style={styles.pageItemCard}>
                  <View style={styles.pageNumberBadge}>
                    <Text style={styles.pageNumberText}>P. {includedSmallTalkTopics.length + 3}</Text>
                  </View>
                  <View style={styles.pageItemInfo}>
                    <Text style={styles.pageItemTitle}>AI 문예 수필: 가족 연대기</Text>
                    <Text style={styles.pageItemDesc}>사진과 스몰톡을 바탕으로 Gemini AI가 엮어낸 감동 에세이</Text>
                  </View>
                  <Sparkles size={16} color="#8B5CF6" />
                </View>

                {/* 6. 에필로그 */}
                <View style={styles.pageItemCard}>
                  <View style={styles.pageNumberBadge}>
                    <Text style={styles.pageNumberText}>P. {includedSmallTalkTopics.length + 4}</Text>
                  </View>
                  <View style={styles.pageItemInfo}>
                    <Text style={styles.pageItemTitle}>에필로그 & 도서 판권지 (Colophon)</Text>
                    <Text style={styles.pageItemDesc}>150×150mm 코지 스퀘어 양장 300DPI 인쇄 사양 및 가족 완독 도장</Text>
                  </View>
                  <Check size={18} color="#10B981" />
                </View>
              </View>

              {/* Quick Add Bar to Curate More Pages */}
              <View style={styles.quickAddBar}>
                <TouchableOpacity
                  style={styles.quickAddBtn}
                  onPress={() => setActiveTab('smalltalk-archive')}
                  activeOpacity={0.85}
                >
                  <Plus size={16} color="#FF6B47" strokeWidth={2.5} style={{ marginRight: 6 }} />
                  <Text style={styles.quickAddBtnText}>＋ 스몰톡 문답 페이지 추가</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickAddBtnPhoto, { borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' }]}
                  onPress={() => setPhotoManageModalVisible(true)}
                  activeOpacity={0.85}
                >
                  <ImageIcon size={16} color="#3B82F6" strokeWidth={2.2} style={{ marginRight: 6 }} />
                  <Text style={[styles.quickAddBtnPhotoText, { color: '#2563EB' }]}>
                    📷 수록 사진 관리 ({includedPhotoIds.length > 0 ? includedPhotoIds.length : photoMessages.length}장)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 2: 💬 스몰톡 아카이브 (질문 리스트 & 글 작성 내역)         */}
        {/* ========================================================= */}
        {activeTab === 'smalltalk-archive' && (
          <View style={styles.archiveSection}>
            {/* Archive Explainer Banner */}
            <View style={styles.archiveBanner}>
              <View style={styles.archiveBannerIconBox}>
                <Bookmark size={20} color="#FF6B47" />
              </View>
              <View style={styles.archiveBannerContent}>
                <Text style={styles.archiveBannerTitle}>우리 가족 스몰톡 기록 보관소</Text>
                <Text style={styles.archiveBannerDesc}>
                  매일 나눈 질문과 가족들의 솔직한 답변들입니다. 월별 점프와 카드 접기/펼치기로 언제든 편리하게 찾아보세요! 📖
                </Text>
              </View>
            </View>

            {/* 1. Monthly Fast-Jump Selector Chips */}
            <View style={styles.monthScrollContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.monthScrollContent}
              >
                {displayedChips.map(month => {
                  const isSelected = selectedMonth === month.id;
                  return (
                    <TouchableOpacity
                      key={month.id}
                      style={[styles.monthChipBtn, isSelected && styles.monthChipBtnActive]}
                      onPress={() => setSelectedMonth(month.id)}
                      activeOpacity={0.8}
                    >
                      <Calendar
                        size={13}
                        color={isSelected ? '#FFFFFF' : '#78716C'}
                        style={{ marginRight: 5 }}
                      />
                      <Text style={[styles.monthChipBtnText, isSelected && styles.monthChipBtnTextActive]}>
                        {month.label} ({month.answeredCount}/{month.count})
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {/* More Months / Multi-year Picker Button */}
                <TouchableOpacity
                  style={[styles.monthChipBtn, styles.moreMonthPickerBtn]}
                  onPress={() => setMonthPickerModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Calendar size={13} color="#FF6B47" style={{ marginRight: 4 }} />
                  <Text style={styles.moreMonthPickerBtnText}>
                    🗓️ 연·월 선택
                  </Text>
                  <ChevronDown size={13} color="#FF6B47" style={{ marginLeft: 2 }} />
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* 2. Monthly Summary & Batch Action Bar */}
            <View style={styles.monthSummaryRow}>
              <View style={styles.monthSummaryLeft}>
                <Text style={styles.monthSummaryTitle}>
                  📅 {selectedMonth === 'all' ? '전체' : (displayedChips.find(m => m.id === selectedMonth)?.fullLabel || availableMonths.find(m => m.id === selectedMonth)?.label || '전체')} 스몰톡
                </Text>
                <Text style={styles.monthSummarySub}>
                  총 {monthScopedList.length}개 질문 중 {monthScopedList.filter(i => i.isAnswered).length}개 답변 완료 ({monthScopedList.length > 0 ? Math.round((monthScopedList.filter(i => i.isAnswered).length / monthScopedList.length) * 100) : 0}%)
                </Text>
              </View>

              <View style={styles.monthSummaryRightActions}>
                <TouchableOpacity
                  style={styles.expandAllToggleBtn}
                  onPress={handleExpandAll}
                  activeOpacity={0.7}
                >
                  <Text style={styles.expandAllToggleBtnText}>
                    {expandedTopicIds.length === filteredArchiveList.length ? '모두 접기' : '모두 펼치기'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.batchAddBtn}
                  onPress={handleBatchAddMonthToBook}
                  activeOpacity={0.85}
                >
                  <Plus size={13} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 4 }} />
                  <Text style={styles.batchAddBtnText}>월간 전체 담기</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 3. Search & Filter Controls */}
            <View style={styles.archiveControlsRow}>
              <View style={styles.searchBarBox}>
                <Search size={16} color="#A8A29E" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchBarInput}
                  placeholder="질문이나 가족의 답변 검색..."
                  placeholderTextColor="#A8A29E"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery !== '' && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={16} color="#A8A29E" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Filter Tabs */}
            <View style={styles.archiveFilterChipsRow}>
              <TouchableOpacity
                style={[styles.archiveFilterChip, archiveFilter === 'all' && styles.archiveFilterChipActive]}
                onPress={() => setArchiveFilter('all')}
              >
                <Text style={[styles.archiveFilterChipText, archiveFilter === 'all' && styles.archiveFilterChipTextActive]}>
                  전체 질문 ({monthScopedList.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.archiveFilterChip, archiveFilter === 'answered' && styles.archiveFilterChipActive]}
                onPress={() => setArchiveFilter('answered')}
              >
                <Text style={[styles.archiveFilterChipText, archiveFilter === 'answered' && styles.archiveFilterChipTextActive]}>
                  답변 완료 ({monthScopedList.filter(i => i.isAnswered).length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.archiveFilterChip, archiveFilter === 'unanswered' && styles.archiveFilterChipActive]}
                onPress={() => setArchiveFilter('unanswered')}
              >
                <Text style={[styles.archiveFilterChipText, archiveFilter === 'unanswered' && styles.archiveFilterChipTextActive]}>
                  미답변 ({monthScopedList.filter(i => !i.isAnswered).length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.archiveFilterChip, archiveFilter === 'in-book' && styles.archiveFilterChipActive]}
                onPress={() => setArchiveFilter('in-book')}
              >
                <Text style={[styles.archiveFilterChipText, archiveFilter === 'in-book' && styles.archiveFilterChipTextActive]}>
                  📖 포토북 ({monthScopedList.filter(i => i.isInBook).length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* 4. SmallTalk Q&A Cards with Accordion Expand / Collapse */}
            <View style={styles.archiveCardsList}>
              {filteredArchiveList.map((item) => {
                const isExpanded = expandedTopicIds.includes(item.id);

                return (
                  <View key={item.id} style={[styles.archiveCard, isExpanded && styles.archiveCardExpanded]}>
                    {/* Card Header: Date & Completion Badge & Photobook Button */}
                    <View style={styles.archiveCardHeader}>
                      <View style={styles.archiveHeaderLeft}>
                        <View style={[styles.archiveDateBadge, item.isToday && styles.archiveDateBadgeToday]}>
                          <Text style={[styles.archiveDateBadgeText, item.isToday && styles.archiveDateBadgeTextToday]}>
                            {item.dateLabel}
                          </Text>
                        </View>
                        <View style={styles.archiveIndexBadge}>
                          <Text style={styles.archiveIndexBadgeText}>#{item.index}</Text>
                        </View>
                      </View>

                      {/* Add to Photobook Action Button */}
                      <TouchableOpacity
                        style={[styles.addToBookBtn, item.isInBook && styles.addToBookBtnDone]}
                        onPress={() => handleToggleSmallTalkInBook(item.topic)}
                        activeOpacity={0.8}
                      >
                        {item.isInBook ? (
                          <>
                            <Check size={13} color="#059669" strokeWidth={2.5} style={{ marginRight: 4 }} />
                            <Text style={styles.addToBookBtnTextDone}>포토북 수록됨</Text>
                          </>
                        ) : (
                          <>
                            <Plus size={13} color="#FF6B47" strokeWidth={2.5} style={{ marginRight: 4 }} />
                            <Text style={styles.addToBookBtnText}>포토북에 담기 📖</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Question Title & Accordion Toggle Bar */}
                    <TouchableOpacity
                      style={styles.archiveQuestionToggleRow}
                      onPress={() => handleToggleExpand(item.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.archiveQuestionTitleCol}>
                        <Text
                          style={[styles.archiveQuestionTitle, !isExpanded && styles.archiveQuestionTitleCollapsed]}
                          numberOfLines={isExpanded ? undefined : 2}
                        >
                          "{item.topic}"
                        </Text>

                        {/* Collapsed state mini avatars preview */}
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
                                      style={{ marginLeft: aIdx > 0 ? -6 : 0, borderWidth: 1.5, borderColor: '#FFFFFF' }}
                                    />
                                  ))}
                                </View>
                                <Text style={styles.collapsedAnswerCountText}>
                                  {item.answeredCount}명 답변 완료 · 탭하여 읽기
                                </Text>
                              </View>
                            ) : (
                              <Text style={styles.collapsedNoAnswerText}>아직 등록된 답변 없음 🕊️</Text>
                            )}
                          </View>
                        )}
                      </View>

                      <View style={styles.chevronToggleBtn}>
                        {isExpanded ? (
                          <ChevronUp size={20} color="#78716C" strokeWidth={2.2} />
                        ) : (
                          <ChevronDown size={20} color="#78716C" strokeWidth={2.2} />
                        )}
                      </View>
                    </TouchableOpacity>

                    {/* Family Member Answers - Only when expanded */}
                    {isExpanded && (
                      <View style={styles.answersContainer}>
                        {item.answers.map((ans, aIdx) => (
                          <View key={ans.id || aIdx} style={styles.answerRow}>
                            <UserAvatar avatar={ans.avatar} size={32} style={{ marginRight: 10, marginTop: 2 }} />
                            <View style={styles.answerContentCol}>
                              <Text style={styles.answerAuthorName}>{ans.name}</Text>
                              <View style={styles.answerBubble}>
                                <Text style={styles.answerText}>“{ans.text}”</Text>
                              </View>
                            </View>
                          </View>
                        ))}

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
                          <Text style={styles.collapseFooterBtnText}>답변 접기 ▲</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}

              {filteredArchiveList.length === 0 && (
                <View style={styles.emptySearchBox}>
                  <Search size={32} color="#A8A29E" style={{ marginBottom: 10 }} />
                  <Text style={styles.emptySearchTitle}>선택하신 기간에 스몰톡 질문이 없습니다</Text>
                  <Text style={styles.emptySearchSub}>다른 월을 선택하시거나 검색어를 확인해보세요.</Text>
                </View>
              )}
            </View>
          </View>
        )}

        </ScrollView>
      )}

      {/* 4. Photobook Photo Picker & Manager Modal */}
      <Modal
        visible={photoManageModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPhotoManageModalVisible(false)}
      >
        <View style={styles.photoModalContainer}>
          {/* Header */}
          <View style={styles.photoModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.photoModalTitle}>포토북 수록 사진 관리</Text>
              <Text style={styles.photoModalSubtitle}>
                대화창에서 공유된 사진 중 포토북에 실을 사진을 선택하세요.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.photoModalCloseBtn}
              onPress={() => setPhotoManageModalVisible(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={22} color="#1C1917" />
            </TouchableOpacity>
          </View>

          {/* Batch Action Toolbar */}
          <View style={styles.photoModalToolbar}>
            <View style={styles.photoModalCountChip}>
              <Text style={styles.photoModalCountText}>
                선택됨 <Text style={{ fontWeight: '900', color: '#FF6B47' }}>{includedPhotoIds.length}</Text>장 / 전체 {photoMessages.length}장
              </Text>
            </View>
            <View style={styles.photoModalToolbarActions}>
              <TouchableOpacity
                style={styles.toolbarSmallBtn}
                onPress={handleSelectAllPhotos}
                activeOpacity={0.7}
              >
                <Text style={styles.toolbarSmallBtnText}>전체 선택</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.toolbarSmallBtn}
                onPress={handleDeselectAllPhotos}
                activeOpacity={0.7}
              >
                <Text style={styles.toolbarSmallBtnText}>전체 해제</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Photo Grid */}
          {photoMessages.length === 0 ? (
            <View style={styles.emptyPhotosBox}>
              <ImageIcon size={48} color="#D1D1D6" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyPhotosTitle}>대화방에 공유된 사진이 없습니다</Text>
              <Text style={styles.emptyPhotosSub}>가족 채팅방에서 사진을 올리면 자동으로 여기에 모여 포토북에 담을 수 있어요!</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.photoModalGridContent} showsVerticalScrollIndicator={false}>
              <View style={styles.photosGrid}>
                {photoMessages.map((msg) => {
                  const photoUri = msg.image_url || msg.image;
                  const sender = getSenderInfo(msg.profile_id, msg.sender, msg.senderObj);
                  const isSaved = includedPhotoIds.includes(msg.id);

                  return (
                    <TouchableOpacity
                      key={msg.id}
                      style={[styles.photoGridCell, isSaved && styles.photoGridCellSelected]}
                      onPress={() => handleTogglePhotoInBook(msg.id, false)}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: photoUri }} style={styles.photoGridImage} resizeMode="cover" />

                      {/* Sender Badge */}
                      <View style={styles.photoSenderBadge}>
                        <UserAvatar avatar={sender.avatar} size={18} />
                      </View>

                      {/* Checkbox Overlay */}
                      <View style={[styles.photoCheckOverlay, isSaved ? styles.photoCheckActive : styles.photoCheckInactive]}>
                        {isSaved ? (
                          <Check size={14} color="#FFFFFF" strokeWidth={3} />
                        ) : (
                          <View style={styles.photoUncheckedCircle} />
                        )}
                      </View>

                      {/* Tap to Preview Full Screen */}
                      <TouchableOpacity
                        style={styles.photoZoomBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          setSelectedPhoto({ ...msg, photoUri, sender });
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Search size={12} color="#FFFFFF" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* Footer Done Button */}
          <View style={styles.photoModalFooter}>
            <TouchableOpacity
              style={styles.photoModalDoneBtn}
              onPress={() => setPhotoManageModalVisible(false)}
              activeOpacity={0.85}
            >
              <Check size={18} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 6 }} />
              <Text style={styles.photoModalDoneBtnText}>
                선택 완료 ({includedPhotoIds.length}장 수록)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Full Photo Modal Preview */}
      <Modal
        visible={Boolean(selectedPhoto)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        {selectedPhoto && (
          <View style={styles.modalBg}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setSelectedPhoto(null)}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <X size={26} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalBackdropTouch}
              activeOpacity={1}
              onPress={() => setSelectedPhoto(null)}
            >
              <Image
                source={{ uri: selectedPhoto.photoUri }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            </TouchableOpacity>

            <View style={styles.photoFooter}>
              <View style={styles.footerSenderRow}>
                <UserAvatar avatar={selectedPhoto.sender?.avatar} size={24} style={{ marginRight: 8 }} />
                <Text style={[styles.footerSenderName, { color: selectedPhoto.sender?.color || '#FF6B47' }]}>
                  {selectedPhoto.sender?.name || '가족'}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.footerAddToBookBtn,
                    includedPhotoIds.includes(selectedPhoto.id) && styles.footerAddToBookBtnActive,
                  ]}
                  onPress={() => handleTogglePhotoInBook(selectedPhoto.id)}
                  activeOpacity={0.8}
                >
                  <Check size={14} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 4 }} />
                  <Text style={styles.footerAddToBookBtnText}>
                    {includedPhotoIds.includes(selectedPhoto.id) ? '포토북에 담김' : '포토북에 추가'}
                  </Text>
                </TouchableOpacity>
              </View>
              {selectedPhoto.text ? (
                <Text style={styles.photoCaption}>"{selectedPhoto.text}"</Text>
              ) : null}
              <Text style={styles.photoTime}>
                {selectedPhoto.timestamp || (selectedPhoto.created_at ? new Date(selectedPhoto.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '가족 단톡방 공유')}
              </Text>
            </View>
          </View>
        )}
      </Modal>

      {/* Edit Title Modal */}
      <Modal
        visible={editTitleModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditTitleModalVisible(false)}
      >
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalCard}>
            <Text style={styles.editModalHeading}>포토북 제목 & 부제 변경</Text>
            
            <Text style={styles.editModalLabel}>포토북 제목</Text>
            <TextInput
              style={styles.editModalInput}
              value={tempTitle}
              onChangeText={setTempTitle}
              placeholder="예: 2026 우리 가족 이야기"
              placeholderTextColor="#A8A29E"
            />

            <Text style={styles.editModalLabel}>부제목</Text>
            <TextInput
              style={styles.editModalInput}
              value={tempSubtitle}
              onChangeText={setTempSubtitle}
              placeholder="예: FamLink Story Vol.1"
              placeholderTextColor="#A8A29E"
            />

            <View style={styles.editModalActions}>
              <TouchableOpacity
                style={styles.editModalCancelBtn}
                onPress={() => setEditTitleModalVisible(false)}
              >
                <Text style={styles.editModalCancelBtnText}>취소</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.editModalConfirmBtn}
                onPress={() => {
                  if (!tempTitle.trim()) {
                    Alert.alert('알림', '포토북 제목을 입력해주세요.');
                    return;
                  }
                  setBookTitle(tempTitle.trim());
                  setBookSubtitle(tempSubtitle.trim() || 'FamLink Story Vol.1');
                  savePhotobookConfig({
                    bookTitle: tempTitle.trim(),
                    bookSubtitle: tempSubtitle.trim() || 'FamLink Story Vol.1',
                  });
                  setEditTitleModalVisible(false);
                }}
              >
                <Text style={styles.editModalConfirmBtnText}>저장하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 5. Month & Year Fast-Jump Picker Modal */}
      <Modal
        visible={monthPickerModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setMonthPickerModalVisible(false)}
      >
        <View style={styles.monthPickerContainer}>
          {/* Header */}
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
              <X size={22} color="#1C1917" />
            </TouchableOpacity>
          </View>

          {/* Quick Option: 전체 보기 */}
          <View style={styles.monthPickerQuickRow}>
            <TouchableOpacity
              style={[styles.monthPickerAllBtn, selectedMonth === 'all' && styles.monthPickerAllBtnActive]}
              onPress={() => {
                setSelectedMonth('all');
                setMonthPickerModalVisible(false);
              }}
              activeOpacity={0.8}
            >
              <Layers size={16} color={selectedMonth === 'all' ? '#FFFFFF' : '#FF6B47'} style={{ marginRight: 6 }} />
              <Text style={[styles.monthPickerAllBtnText, selectedMonth === 'all' && styles.monthPickerAllBtnTextActive]}>
                모든 기간 전체 보기 ({smallTalkArchiveList.length}개 질문)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Grouped by Year List */}
          <ScrollView contentContainerStyle={styles.monthPickerScrollContent} showsVerticalScrollIndicator={false}>
            {groupedYears.map(group => (
              <View key={group.year} style={styles.yearGroupSection}>
                <View style={styles.yearGroupHeader}>
                  <Text style={styles.yearGroupTitle}>{group.year}년</Text>
                  <Text style={styles.yearGroupCountText}>
                    총 {group.months.reduce((acc, m) => acc + m.count, 0)}개 질문
                  </Text>
                </View>

                <View style={styles.yearMonthsGrid}>
                  {group.months.map(item => {
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

      {/* Full Flipbook Storybook Modal */}
      <FamilyStorybookModal
        visible={storybookVisible}
        onClose={() => setStorybookVisible(false)}
        smallTalkState={smallTalkState}
        familyMembers={familyMembers}
        messages={messages}
        currentUserProfile={currentUserProfile}
        onSendOrderNotice={onSendOrderNotice}
        points={points}
        onDeductPoints={onDeductPoints}
        customSmallTalks={photobookCustomSmallTalks}
        initialTitle={bookTitle}
        initialSubtitle={bookSubtitle}
        initialTheme={currentTheme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F3', // Figma Warm Cream Background
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // 1. HEADER
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#FAF8F3',
  },
  headerLeftCol: {
    justifyContent: 'center',
  },
  categorySubText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A8A29E',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerMainTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1C1917',
    letterSpacing: -0.5,
  },
  openStorybookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B47',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    shadowColor: '#FF6B47',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  openStorybookBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // 2. SEGMENTED TABS
  segmentedTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F0E8',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
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
    color: '#78716C',
  },
  segmentBtnTextActive: {
    color: '#FF6B47',
    fontWeight: '900',
  },
  tabBadge: {
    backgroundColor: '#FF6B47',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // TAB 1: PHOTOBOOK STUDIO
  photobookStudioSection: {
    paddingHorizontal: 20,
  },
  bookShowcaseCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  bookCoverMockup: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 16,
  },
  bookSpine: {
    width: 22,
    borderRightWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  bookCoverFace: {
    flex: 1,
    padding: 16,
  },
  bookEmbossBorder: {
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  bookBadgeLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  bookTitleDisplay: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
  },
  bookSubtitleDisplay: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  bookHeroPhotoFrame: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FAF8F3',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8E0D0',
  },
  bookHeroImage: {
    width: '100%',
    height: '100%',
  },
  bookHeroPhotoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  bookHeroPlaceholderText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  bookFamilySign: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  bookCustomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editTitleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E0D0',
  },
  editTitleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78716C',
  },
  themeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themeDotBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeDotBtnActive: {
    borderWidth: 2.5,
    borderColor: '#1C1917',
  },
  themeDotInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  bookStatsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  bookStatCol: {
    alignItems: 'center',
    flex: 1,
  },
  bookStatNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C1917',
    marginBottom: 2,
  },
  bookStatLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#78716C',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E8E0D0',
  },
  bookActionButtonsRow: {
    gap: 10,
  },
  primaryFlipBookBtn: {
    backgroundColor: '#FF6B47',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#FF6B47',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryFlipBookBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  podOrderShortcutBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FFD8C4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 16,
  },
  podOrderShortcutBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF6B47',
  },

  // CHAPTER SPREAD LIST
  chapterSection: {
    marginTop: 8,
  },
  chapterSectionHeader: {
    marginBottom: 12,
  },
  chapterSectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C1917',
    marginBottom: 4,
  },
  chapterSectionSub: {
    fontSize: 12.5,
    color: '#78716C',
    lineHeight: 18,
  },
  pageCardList: {
    gap: 10,
    marginBottom: 16,
  },
  pageItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  smalltalkPageCardHighlight: {
    backgroundColor: '#FFF9F6',
    borderColor: '#FFE0D6',
  },
  pageNumberBadge: {
    backgroundColor: '#F5F0E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 12,
    minWidth: 44,
    alignItems: 'center',
  },
  pageNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#78716C',
  },
  pageItemInfo: {
    flex: 1,
  },
  smalltalkTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  smalltalkTagPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF6B47',
  },
  pageItemTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1C1917',
    marginBottom: 2,
  },
  pageItemDesc: {
    fontSize: 12,
    color: '#78716C',
  },
  removePageBtn: {
    padding: 6,
  },
  quickAddBar: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  quickAddBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F2',
    borderWidth: 1.5,
    borderColor: '#FFD8C4',
    paddingVertical: 12,
    borderRadius: 14,
  },
  quickAddBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FF6B47',
  },
  quickAddBtnPhoto: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    paddingVertical: 12,
    borderRadius: 14,
  },
  quickAddBtnPhotoText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78716C',
  },

  // TAB 2: SMALLTALK ARCHIVE
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
    backgroundColor: '#FFF5F2',
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
    color: '#1C1917',
    marginBottom: 3,
  },
  archiveBannerDesc: {
    fontSize: 12,
    color: '#78716C',
    lineHeight: 17,
  },

  // 1. Monthly Fast-Jump Selector
  monthScrollContainer: {
    marginBottom: 12,
  },
  monthScrollContent: {
    gap: 8,
  },
  monthChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
  },
  monthChipBtnActive: {
    backgroundColor: '#FF6B47',
    borderColor: '#FF6B47',
    shadowColor: '#FF6B47',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  monthChipBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#78716C',
  },
  monthChipBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  moreMonthPickerBtn: {
    backgroundColor: '#FFF5F2',
    borderColor: '#FFD5CC',
  },
  moreMonthPickerBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FF6B47',
  },

  // 2. Month Summary & Batch Action Bar
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
    color: '#1C1917',
    marginBottom: 2,
  },
  monthSummarySub: {
    fontSize: 11.5,
    color: '#78716C',
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
    backgroundColor: '#F5F0E8',
  },
  expandAllToggleBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#78716C',
  },
  batchAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B47',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: '#FF6B47',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  batchAddBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // 3. Search & Filter Controls
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
  searchBarInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#1C1917',
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
    backgroundColor: '#F5F0E8',
  },
  archiveFilterChipActive: {
    backgroundColor: '#FF6B47',
  },
  archiveFilterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78716C',
  },
  archiveFilterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // 4. SmallTalk Q&A Cards with Accordion
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
    backgroundColor: '#F5F0E8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  archiveDateBadgeToday: {
    backgroundColor: '#FFF5F2',
  },
  archiveDateBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#78716C',
  },
  archiveDateBadgeTextToday: {
    color: '#FF6B47',
  },
  archiveIndexBadge: {
    backgroundColor: '#FAF8F3',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  archiveIndexBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A8A29E',
  },
  addToBookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F2',
    borderWidth: 1.2,
    borderColor: '#FFE0D6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  addToBookBtnDone: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  addToBookBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FF6B47',
  },
  addToBookBtnTextDone: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#059669',
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
    color: '#1C1917',
    lineHeight: 21,
  },
  archiveQuestionTitleCollapsed: {
    marginBottom: 4,
  },
  chevronToggleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FAF8F3',
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
  collapsedAvatarEmoji: {
    fontSize: 13,
    marginRight: 2,
  },
  collapsedAnswerCountText: {
    fontSize: 11.5,
    color: '#78716C',
    fontWeight: '600',
  },
  collapsedNoAnswerText: {
    fontSize: 11.5,
    color: '#A8A29E',
  },
  answersContainer: {
    gap: 8,
    backgroundColor: '#FAF8F3',
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
    color: '#78716C',
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
    color: '#1C1917',
    lineHeight: 18,
    fontWeight: '500',
  },
  emptyAnswersBox: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyAnswersText: {
    fontSize: 12,
    color: '#A8A29E',
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
    color: '#A8A29E',
  },
  emptySearchBox: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptySearchTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#78716C',
    marginBottom: 4,
  },
  emptySearchSub: {
    fontSize: 12,
    color: '#A8A29E',
  },

  // PHOTO MANAGE MODAL & BADGES
  managePhotosBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 2,
  },
  managePhotosBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3B82F6',
  },
  photoModalContainer: {
    flex: 1,
    backgroundColor: '#FAF8F3',
  },
  photoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    paddingBottom: 12,
    backgroundColor: '#FAF8F3',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E0D0',
  },
  photoModalTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#1C1917',
  },
  photoModalSubtitle: {
    fontSize: 12.5,
    color: '#78716C',
    marginTop: 3,
  },
  photoModalCloseBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F5F0E8',
  },
  photoModalToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAE1',
  },
  photoModalCountChip: {
    backgroundColor: '#FFF5F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoModalCountText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#78716C',
  },
  photoModalToolbarActions: {
    flexDirection: 'row',
    gap: 8,
  },
  toolbarSmallBtn: {
    backgroundColor: '#F5F0E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toolbarSmallBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#78716C',
  },
  photoModalGridContent: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyPhotosBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
  },
  emptyPhotosTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#78716C',
    marginBottom: 4,
  },
  emptyPhotosSub: {
    fontSize: 12.5,
    color: '#A8A29E',
    textAlign: 'center',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoGridCell: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8E0D0',
  },
  photoGridCellSelected: {
    borderColor: '#FF6B47',
    borderWidth: 2.5,
  },
  photoGridImage: {
    width: '100%',
    height: '100%',
  },
  photoSenderBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCheckOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  photoCheckActive: {
    backgroundColor: '#FF6B47',
  },
  photoCheckInactive: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  photoUncheckedCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  photoZoomBtn: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 10,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoModalFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E8E0D0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 4,
  },
  photoModalDoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B47',
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#FF6B47',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  photoModalDoneBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // FULL PHOTO MODAL
  modalBg: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
  },
  modalBackdropTouch: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '75%',
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 20,
  },
  photoFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    padding: 20,
    paddingBottom: 40,
  },
  footerSenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  footerAvatar: {
    fontSize: 20,
    marginRight: 8,
  },
  footerSenderName: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  footerAddToBookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B47',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  footerAddToBookBtnActive: {
    backgroundColor: '#10B981',
  },
  footerAddToBookBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  photoCaption: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 20,
  },
  photoTime: {
    color: '#8E8E93',
    fontSize: 11,
  },

  // EDIT TITLE MODAL
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 25, 23, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  editModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
  },
  editModalHeading: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C1917',
    marginBottom: 16,
    textAlign: 'center',
  },
  editModalLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#78716C',
    marginBottom: 6,
  },
  editModalInput: {
    backgroundColor: '#FAF8F3',
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14.5,
    color: '#1C1917',
    marginBottom: 14,
  },
  editModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  editModalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F5F0E8',
    alignItems: 'center',
  },
  editModalCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78716C',
  },
  editModalConfirmBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#FF6B47',
    alignItems: 'center',
  },
  editModalConfirmBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // 5. MONTH & YEAR PICKER MODAL
  monthPickerContainer: {
    flex: 1,
    backgroundColor: '#FAF8F3',
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
    backgroundColor: '#FFF5F2',
    borderWidth: 1.2,
    borderColor: '#FFD5CC',
    paddingVertical: 10,
    borderRadius: 14,
  },
  monthPickerAllBtnActive: {
    backgroundColor: '#FF6B47',
    borderColor: '#FF6B47',
  },
  monthPickerAllBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FF6B47',
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
    color: '#1C1917',
  },
  yearGroupCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78716C',
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
    backgroundColor: '#FF6B47',
    borderColor: '#FF6B47',
    shadowColor: '#FF6B47',
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
    color: '#1C1917',
    marginBottom: 2,
  },
  monthGridCellTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  monthGridCellTextDisabled: {
    color: '#A8A29E',
  },
  monthGridCellCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78716C',
  },
  monthGridCellCountActive: {
    color: '#FFFFFF',
  },
  monthGridCellCountDisabled: {
    color: '#A8A29E',
    fontSize: 10,
  },
});
