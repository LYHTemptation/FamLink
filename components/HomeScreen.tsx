import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Plus, Edit3 } from 'lucide-react-native';
import UserAvatar from './UserAvatar';
import { supabase, isSupabaseReady } from '../lib/supabase';
import {
  getEvolutionStage,
  getStageNameWithPet,
  getRequiredExpForLevel,
} from '../lib/petmongEvolution';
import { stripEmojis } from '../utils/topics';
import { getKoreanHoliday } from '../utils/koreanHolidays';
import { useTransparentImage } from '../lib/imageTransparencyService';
import { parseKoreanTimeToMs } from './chat/chatHelpers';
import styles from './home/HomeStyles';
import { HomeSmallTalkCard, HomeNicknameModal } from './home/HomeSubComponents';
import {
  CalendarEvent,
  ChatMessage,
  FamilyMember,
  PetmongCharacter,
  PetmongVitals,
  ShoppingItem,
  SmallTalkState,
  UserProfile,
} from '../types/domain';

export interface ChoreIconMeta {
  icon: string;
  category: string;
  iconBg: string;
  tagColor: string;
}

// 한국형 생활 행동 기반 아이콘 & 카테고리 스마트 매퍼
export const getChoreIconMeta = (category?: string, title: string = ''): ChoreIconMeta => {
  const safe = (title || '').toLowerCase();
  if (
    safe.includes('분리수거') ||
    safe.includes('쓰레기') ||
    safe.includes('음식물') ||
    safe.includes('재활용')
  ) {
    return { icon: '🗑️', category: '분리수거', iconBg: '#C7D2FE', tagColor: '#1E40AF' };
  }
  if (safe.includes('설거지') || safe.includes('식기') || safe.includes('그릇')) {
    return { icon: '🍽️', category: '설거지', iconBg: '#F5F0E8', tagColor: '#78716C' };
  }
  if (
    safe.includes('식탁') ||
    safe.includes('요리') ||
    safe.includes('밥') ||
    safe.includes('저녁') ||
    safe.includes('아침') ||
    safe.includes('점심')
  ) {
    return { icon: '🍳', category: '식사/요리', iconBg: '#FDE68A', tagColor: '#78350F' };
  }
  if (
    safe.includes('청소기') ||
    safe.includes('청소') ||
    safe.includes('물걸레') ||
    safe.includes('걸레') ||
    safe.includes('정리') ||
    safe.includes('환기')
  ) {
    return { icon: '🧹', category: '청소/정리', iconBg: '#DDD6FE', tagColor: '#5B21B6' };
  }
  if (
    safe.includes('빨래') ||
    safe.includes('세탁') ||
    safe.includes('건조기') ||
    safe.includes('이불') ||
    safe.includes('옷')
  ) {
    return { icon: '🧺', category: '세탁/빨래', iconBg: '#FED7AA', tagColor: '#9A3412' };
  }
  if (
    safe.includes('산책') ||
    safe.includes('브루노') ||
    safe.includes('강아지') ||
    safe.includes('고양이') ||
    safe.includes('배변')
  ) {
    return { icon: '🐕', category: '반려동물', iconBg: '#A7F3D0', tagColor: '#064E3B' };
  }
  if (
    safe.includes('화분') ||
    safe.includes('식물') ||
    safe.includes('물 주기') ||
    safe.includes('물주기')
  ) {
    return { icon: '🌿', category: '식물관리', iconBg: '#BBF7D0', tagColor: '#166534' };
  }
  if (
    safe.includes('욕실') ||
    safe.includes('화장실') ||
    safe.includes('세면대') ||
    safe.includes('변기')
  ) {
    return { icon: '🚿', category: '욕실청소', iconBg: '#BFDBFE', tagColor: '#1E40AF' };
  }
  if (
    safe.includes('마트') ||
    safe.includes('장보기') ||
    safe.includes('심부름') ||
    safe.includes('택배') ||
    safe.includes('우유') ||
    safe.includes('사오기')
  ) {
    return { icon: '🛒', category: '심부름', iconBg: '#FBCFE8', tagColor: '#9D174D' };
  }

  const metaMap: Record<string, ChoreIconMeta> = {
    야외: { icon: '🌿', category: '야외', iconBg: '#A7F3D0', tagColor: '#064E3B' },
    거실: { icon: '🛋️', category: '거실', iconBg: '#DDD6FE', tagColor: '#5B21B6' },
    기타: { icon: '📋', category: '기타', iconBg: '#F5F0E8', tagColor: '#78716C' },
    침실: { icon: '🛏️', category: '침실', iconBg: '#FBCFE8', tagColor: '#9D174D' },
    욕실: { icon: '🚿', category: '욕실', iconBg: '#BFDBFE', tagColor: '#1E40AF' },
    주방: { icon: '🍳', category: '주방', iconBg: '#FDE68A', tagColor: '#78350F' },
  };

  const meta = category ? metaMap[category] : undefined;
  return (
    meta || {
      icon: '✅',
      category: category || '할 일',
      iconBg: '#E8E0D0',
      tagColor: '#1C1917',
    }
  );
};

export interface HomeScreenProps {
  points?: number;
  events?: CalendarEvent[];
  messages?: ChatMessage[];
  currentUser?: any;
  currentUserProfile?: UserProfile | null;
  familyMembers?: FamilyMember[];
  shoppingItems?: ShoppingItem[];
  petmongCharacters?: PetmongCharacter[];
  petVitals?: PetmongVitals | null;
  smallTalkState?: SmallTalkState | null;
  noticeBannerText?: string;
  onNavigateScreen?: (screen: string) => void;
  onToggleQuest?: (questId: any, currentStatus?: boolean) => void;
  onAwardPoints?: (amount: number, reason?: string) => void;
  onAddResponse?: (textOrId: any, maybeText?: string) => Promise<any> | void;
}

function HomeScreenComponent({
  points = 0,
  events = [],
  messages = [],
  currentUser,
  currentUserProfile,
  familyMembers = [],
  shoppingItems = [],
  petmongCharacters = [],
  smallTalkState = { topic: '', responses: {} },
  noticeBannerText = '',
  onNavigateScreen,
  onAddResponse,
}: HomeScreenProps) {
  // shoppingItems 기반 퀘스트/집안일 진행 통계
  const { totalQuests, completedCount, progressRatio, remainingCount } = useMemo(() => {
    const source = shoppingItems || [];
    const total = source.length;
    let completed = 0;
    for (let i = 0; i < total; i++) {
      if (source[i]?.is_completed) completed += 1;
    }
    return {
      totalQuests: total,
      completedCount: completed,
      progressRatio: total > 0 ? completed / total : 0,
      remainingCount: total - completed,
    };
  }, [shoppingItems]);

  // 한국어 오늘 날짜
  const todayFormattedKorean = useMemo(() => {
    const now = new Date();
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    return `${now.getMonth() + 1}월 ${now.getDate()}일 ${days[now.getDay()]}`;
  }, []);

  // 가족 별칭(우리 집 이름) 직접 설정 상태
  const familyKey =
    currentUserProfile?.family_id ||
    currentUserProfile?.family_code ||
    'default-family';
  const nicknameStorageKey = `@famlink_family_nickname_${familyKey}`;
  const [familyNickname, setFamilyNickname] = useState<string>('사랑하는 우리 가족');
  const [nicknameModalVisible, setNicknameModalVisible] = useState<boolean>(false);

  const FAMILY_NICKNAME_PRESETS = useMemo(() => {
    const petName = petmongCharacters?.[0]?.name || '몽이';
    return [
      '사랑하는 우리 가족',
      '행복한 우리 집',
      '웃음꽃 피는 우리 가족',
      `다정한 ${petName}네 가족`,
      '세상에서 제일 따뜻한 집',
    ];
  }, [petmongCharacters]);

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(nicknameStorageKey)
      .then((saved) => {
        if (isMounted && saved && saved.trim()) {
          setFamilyNickname(saved.trim());
        }
      })
      .catch(() => {});

    if (isSupabaseReady && currentUserProfile?.family_id) {
      supabase
        .from('petmong_activities')
        .select('notes, created_at')
        .eq('family_id', currentUserProfile.family_id)
        .eq('action_type', 'FAMILY_NICKNAME_UPDATE')
        .order('created_at', { ascending: false })
        .limit(1)
        .then(({ data }) => {
          const remoteName = data?.[0]?.notes?.trim();
          if (isMounted && remoteName) {
            setFamilyNickname(remoteName);
            AsyncStorage.setItem(nicknameStorageKey, remoteName).catch(() => {});
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [nicknameStorageKey, currentUserProfile?.family_id]);

  const handleSaveFamilyNickname = useCallback(
    async (rawNickname: string) => {
      const cleaned = rawNickname.trim() || '사랑하는 우리 가족';
      setFamilyNickname(cleaned);
      setNicknameModalVisible(false);
      AsyncStorage.setItem(nicknameStorageKey, cleaned).catch(() => {});

      if (isSupabaseReady && currentUserProfile?.family_id) {
        supabase
          .from('petmong_activities')
          .insert({
            family_id: currentUserProfile.family_id,
            user_id: currentUserProfile.id,
            action_type: 'FAMILY_NICKNAME_UPDATE',
            notes: cleaned,
            exp_gained: 0,
            points_awarded: 0,
          })
          .then(
            () => {},
            () => {}
          );
      }
    },
    [nicknameStorageKey, currentUserProfile?.family_id, currentUserProfile?.id]
  );

  const familyTitle = familyNickname || '사랑하는 우리 가족';

  // 대표 활성 반려몽 캐릭터
  const activePetmong = useMemo(() => {
    if (petmongCharacters && petmongCharacters.length > 0) {
      return petmongCharacters[0];
    }
    return null;
  }, [petmongCharacters]);

  const transparentAvatarUrl = useTransparentImage(activePetmong?.image_url);

  // ⚡ 가족 대화 온기 산출 (한국어 timestamp 포맷 "오후 3:20" 파싱 폴백 추가로 NaN 누락 방지)
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const todayMessagesCount = useMemo(() => {
    if (!messages || !Array.isArray(messages)) return 0;
    let count = 0;
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (!m) continue;
      let t = m.created_at ? new Date(m.created_at).getTime() : NaN;
      if (isNaN(t) && m.timestamp) {
        t = parseKoreanTimeToMs(m.timestamp);
      }
      if (!isNaN(t) && t >= todayStart) {
        count += 1;
      }
    }
    return count;
  }, [messages, todayStart]);

  const todayResponsesCount = useMemo(() => {
    if (!smallTalkState || !smallTalkState.responses) return 0;
    return Object.keys(smallTalkState.responses).length;
  }, [smallTalkState]);

  const familyWarmth = useMemo(() => {
    const chatScore = Math.min(60, todayMessagesCount * 10);
    const smallTalkScore = Math.min(40, todayResponsesCount * 20);
    return Math.min(100, Math.max(20, chatScore + smallTalkScore));
  }, [todayMessagesCount, todayResponsesCount]);

  const canHarvestFruit = todayMessagesCount > 0 || todayResponsesCount > 0;

  const petLevel = activePetmong?.level || 1;
  const stageInfo = useMemo(() => getEvolutionStage(petLevel), [petLevel]);
  const stageTitle = useMemo(
    () => getStageNameWithPet(stageInfo?.stage || 1, activePetmong?.name || '우리 몽이'),
    [stageInfo, activePetmong?.name]
  );
  const petExp = activePetmong?.exp || 0;
  const petMaxExp = activePetmong?.max_exp || getRequiredExpForLevel(petLevel);
  const expRatio = Math.min(100, Math.max(0, Math.round((petExp / petMaxExp) * 100)));

  const routineDialogue = useMemo(() => {
    if (familyWarmth >= 80) {
      return '가족 대화 소리가 가득해서 마음이 훈훈해요 몽! ✨';
    }
    if (canHarvestFruit) {
      return '가족 대화 온기가 가득 찼어요! 보러와 주세요 몽 ✨';
    }
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) {
      return '코오... 조용한 밤 단꿈을 꾸고 있어요 zZ 🌙';
    } else if (hour >= 6 && hour < 11) {
      return '좋은 아침! 오늘 하루도 온 가족 화이팅이에요 ☀️';
    } else if (hour >= 11 && hour < 17) {
      return '따스한 햇살 받으며 가족 앨범을 넘겨보고 있어요 📖';
    } else {
      return '가족들이 모이는 저녁 시간이 기다려져요 몽 🐾';
    }
  }, [familyWarmth, canHarvestFruit]);

  // 오늘의 일정 필터링
  const todayScheduleList = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(now.getDate()).padStart(2, '0')}`;
    const todayHoliday = getKoreanHoliday(todayStr);

    const list: any[] = [];
    if (todayHoliday) {
      list.push({
        id: `holiday-${todayStr}`,
        emoji: '🇰🇷',
        title: `${todayHoliday.name} (${
          todayHoliday.isSubstitute ? '대체공휴일' : '법정 공휴일'
        })`,
        category: '공휴일',
        member: '대한민국 공휴일',
        dotColor: '#EF4444',
      });
    }

    const matchedEvents = (events || []).filter((e) => {
      if (!e.date) return false;
      const start = e.date;
      const end = e.endDate || e.end_date || e.date;
      return todayStr >= start && todayStr <= end;
    });

    if (matchedEvents.length > 0) {
      const formatted = matchedEvents.slice(0, 3).map((e, idx) => {
        let emoji = '📅';
        if (e.emoji) {
          emoji = e.emoji;
        } else if (
          e.title?.includes('외식') ||
          e.title?.includes('밥') ||
          e.title?.includes('치킨') ||
          e.title?.includes('피자') ||
          e.category === 'dinner'
        ) {
          emoji = '🍜';
        } else if (
          e.title?.includes('생일') ||
          e.title?.includes('파티') ||
          e.title?.includes('기념일') ||
          e.category === 'anniversary'
        ) {
          emoji = '🎉';
        } else if (
          e.title?.includes('공부') ||
          e.title?.includes('숙제') ||
          e.title?.includes('학원') ||
          e.title?.includes('학교')
        ) {
          emoji = '📚';
        } else if (
          e.title?.includes('병원') ||
          e.title?.includes('진료') ||
          e.title?.includes('약')
        ) {
          emoji = '💊';
        } else if (
          e.title?.includes('여행') ||
          e.title?.includes('캠핑') ||
          e.title?.includes('나들이')
        ) {
          emoji = '🚗';
        } else if (
          e.title?.includes('운동') ||
          e.title?.includes('축구') ||
          e.title?.includes('헬스')
        ) {
          emoji = '⚽';
        }

        return {
          id: e.id,
          emoji,
          title: e.title,
          category: e.category || '가족 일정',
          member: e.creatorObj?.name || e.creator || '가족 전체',
          dotColor: idx % 2 === 0 ? '#34D399' : '#60A5FA',
        };
      });
      list.push(...formatted);
    }

    return list;
  }, [events]);

  const displayFamilyMembers = useMemo(() => {
    if (familyMembers && familyMembers.length > 0) {
      return familyMembers;
    }
    return [
      { id: 'm1', name: '엄마', role: '엄마', avatar: '👩', color: '#FFA500' },
      { id: 'm2', name: '아빠', role: '아빠', avatar: '👨', color: '#87CEEB' },
      { id: 'm3', name: '지수', role: '지수', avatar: '👧', color: '#DDA0DD' },
      { id: 'm4', name: '민준', role: '민준', avatar: '👦', color: '#90EE90' },
    ];
  }, [familyMembers]);

  const { topic = '', responses = {} } = smallTalkState || {};
  const topicTitle = useMemo(() => {
    if (!topic) return '오늘 가장 많이 웃었던 일은 무엇인가요?';
    const raw =
      typeof topic === 'string'
        ? topic
        : (topic as any).text ||
          (topic as any).title ||
          '오늘 하루 가장 기억에 남는 순간은?';
    return stripEmojis(raw);
  }, [topic]);

  const topicCategory = useMemo(() => {
    if (typeof topic === 'object' && topic && 'category' in (topic as any)) {
      return (topic as any).category;
    }
    return '오늘의 스몰톡 질문';
  }, [topic]);

  const myId = currentUserProfile?.id;
  const myResponse = myId
    ? responses[myId] || responses[currentUser]
    : responses[currentUser];

  const answeredMembersCount = useMemo(() => {
    return displayFamilyMembers.filter(
      (m) =>
        responses[m.id] ||
        responses[m.name] ||
        (m.role ? responses[m.role] : false)
    ).length;
  }, [displayFamilyMembers, responses]);

  const allAnswered =
    displayFamilyMembers.length > 0 &&
    answeredMembersCount >= displayFamilyMembers.length;

  const handleNavigateSmallTalk = useCallback(() => {
    if (onNavigateScreen) onNavigateScreen('smalltalk');
  }, [onNavigateScreen]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {noticeBannerText ? (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 10,
              marginBottom: 4,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: '#FFF5F2',
              borderWidth: 1,
              borderColor: '#FFE8E0',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#FF6B47', lineHeight: 17 }}>
              📢 {noticeBannerText}
            </Text>
          </View>
        ) : null}

        {/* 1. 상단 헤더 & 지오메트릭 액센트 */}
        <View style={styles.headerSection}>
          <View style={[styles.blobCircle, styles.blobCoral]} />
          <View style={[styles.blobCircle, styles.blobOrange]} />
          <View style={[styles.blobCircle, styles.blobMint]} />
          <View style={[styles.blobRect, styles.blobLavender]} />

          <View style={styles.headerTopRow}>
            <View style={styles.greetingCol}>
              <TouchableOpacity
                onPress={() => onNavigateScreen && onNavigateScreen('calendar')}
                activeOpacity={0.7}
              >
                <Text style={styles.dateText}>{todayFormattedKorean.toUpperCase()}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setNicknameModalVisible(true)}
                activeOpacity={0.75}
                style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap' }}
              >
                <Text style={styles.greetingTitle}>
                  안녕하세요,{'\n'}
                  {familyTitle} 🏡
                </Text>
                <View
                  style={{
                    marginLeft: 6,
                    marginBottom: 5,
                    backgroundColor: 'rgba(255, 107, 71, 0.12)',
                    paddingHorizontal: 7,
                    paddingVertical: 3,
                    borderRadius: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Edit3 size={11} color="#FF6B47" />
                </View>
              </TouchableOpacity>
            </View>

            {/* 실시간 포인트 뱃지 */}
            <TouchableOpacity
              style={styles.pointsBadge}
              onPress={handleNavigateSmallTalk}
              activeOpacity={0.8}
            >
              <Text style={styles.pointsStar}>⭐</Text>
              <Text style={styles.pointsText}>{points} pts</Text>
            </TouchableOpacity>
          </View>

          {/* 가족 멤버 아바타 레일 */}
          <View style={styles.membersRowContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.membersScroll}
            >
              {displayFamilyMembers.map((member, idx) => {
                const ringColors = [
                  { bg: 'rgba(255, 179, 71, 0.2)', stroke: 'rgba(255, 179, 71, 0.6)' },
                  { bg: 'rgba(135, 206, 235, 0.2)', stroke: 'rgba(135, 206, 235, 0.6)' },
                  { bg: 'rgba(221, 160, 221, 0.2)', stroke: 'rgba(221, 160, 221, 0.6)' },
                  { bg: 'rgba(144, 238, 144, 0.2)', stroke: 'rgba(144, 238, 144, 0.6)' },
                ];
                const ring = ringColors[idx % ringColors.length];
                const isMe = member.id === currentUserProfile?.id;

                return (
                  <TouchableOpacity
                    key={member.id || idx}
                    style={styles.memberItem}
                    onPress={() => onNavigateScreen && onNavigateScreen('family')}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.memberAvatarRing,
                        { backgroundColor: ring.bg, borderColor: ring.stroke },
                      ]}
                    >
                      <UserAvatar avatar={member.avatar} size={28} />
                    </View>
                    <Text style={styles.memberNameText}>
                      {member.name || member.role || '가족'} {isMe ? '(나)' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* 구성원 추가 '+' 버튼 */}
              <TouchableOpacity
                style={styles.addMemberBtn}
                onPress={() => onNavigateScreen && onNavigateScreen('family')}
                activeOpacity={0.7}
              >
                <Plus size={18} color="#A8A29E" />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>

        {/* 🎁 런칭 기념 선착순 10가족 한정 포토북 교환 프로모션 배지 */}
        <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#FFF5F2',
              borderWidth: 1,
              borderColor: '#FFE8E0',
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
            onPress={() => onNavigateScreen && onNavigateScreen('album')}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View
                style={{
                  backgroundColor: '#FF6B47',
                  borderRadius: 6,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  marginRight: 8,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>
                  선착순 10가족
                </Text>
              </View>
              <Text
                style={{ fontSize: 12, fontWeight: '700', color: '#1C1917', flex: 1 }}
                numberOfLines={1}
              >
                가족 포인트 12,000P로 실물 양장본 무료 교환하기
              </Text>
            </View>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '800',
                color: '#FF6B47',
                marginLeft: 6,
              }}
            >
              스튜디오 →
            </Text>
          </TouchableOpacity>
        </View>

        {/* 2. 📅 오늘의 일정 */}
        <View style={styles.cardSection}>
          <TouchableOpacity
            style={[styles.dashboardCard, styles.scheduleCardTheme]}
            onPress={() => onNavigateScreen && onNavigateScreen('calendar')}
            activeOpacity={0.9}
          >
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeftCol}>
                <Text style={[styles.cardSubLabel, styles.scheduleSubLabel]}>
                  오늘의 일정
                </Text>
                <Text style={styles.cardMainTitle}>{todayFormattedKorean}</Text>
              </View>

              <TouchableOpacity
                style={styles.cardHeaderPillBtn}
                onPress={() => onNavigateScreen && onNavigateScreen('calendar')}
                activeOpacity={0.7}
              >
                <Text style={styles.cardHeaderPillText}>전체 보기 →</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.cardDivider, styles.scheduleDivider]} />

            <View style={styles.scheduleEventsList}>
              {todayScheduleList.length > 0 ? (
                todayScheduleList.map((evt, idx) => (
                  <View key={evt.id || idx} style={styles.scheduleEventRow}>
                    <View style={styles.scheduleEmojiBox}>
                      <Text style={styles.scheduleEmojiText}>{evt.emoji}</Text>
                    </View>
                    <View style={styles.scheduleEventContent}>
                      <Text style={styles.scheduleEventTitleText} numberOfLines={1}>
                        {evt.title}
                      </Text>
                      <Text style={styles.scheduleEventMemberText}>{evt.member}</Text>
                    </View>
                    <View
                      style={[
                        styles.scheduleDot,
                        { backgroundColor: evt.dotColor || '#34D399' },
                      ]}
                    />
                  </View>
                ))
              ) : (
                <View style={styles.scheduleEmptyRow}>
                  <Text style={styles.scheduleEmptyEmoji}>🕊️</Text>
                  <Text style={styles.scheduleEmptyText}>
                    오늘 예정된 일정이 없어요
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* 2.5 💬 오늘의 스몰톡 즉시 답변 카드 (타이핑 상태 내부 격리) */}
        <HomeSmallTalkCard
          topicCategory={topicCategory}
          topicTitle={topicTitle}
          myResponse={myResponse}
          answeredMembersCount={answeredMembersCount}
          totalMembersCount={displayFamilyMembers.length}
          allAnswered={allAnswered}
          actorId={myId || currentUser}
          onAddResponse={onAddResponse}
          onNavigateSmallTalk={handleNavigateSmallTalk}
        />

        {/* 3. 오늘의 퀘스트 진행도 카드 */}
        <View style={styles.cardSection}>
          <TouchableOpacity
            style={[styles.dashboardCard, styles.questCardTheme]}
            onPress={handleNavigateSmallTalk}
            activeOpacity={0.9}
          >
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeftCol}>
                <Text style={[styles.cardSubLabel, styles.questSubLabel]}>
                  오늘 함께
                </Text>
                <View style={styles.questTitleRow}>
                  <Text style={styles.cardMainTitle}>{completedCount}개 완료</Text>
                  <Text style={styles.questTitleTotal}> / {totalQuests}개</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.cardHeaderPillBtn}
                onPress={handleNavigateSmallTalk}
                activeOpacity={0.7}
              >
                <Text style={styles.cardHeaderPillText}>전체 보기 →</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.cardDivider, styles.questDivider]} />

            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width:
                      totalQuests === 0
                        ? '0%'
                        : `${Math.max(
                            4,
                            Math.min(100, Math.round(progressRatio * 100))
                          )}%`,
                  },
                ]}
              />
            </View>

            <View style={styles.questMetaRow}>
              <Text style={styles.questRemainingText}>
                {totalQuests === 0
                  ? '등록된 집안일이 없어요 🕊️'
                  : remainingCount > 0
                  ? `${remainingCount}개 남음`
                  : '오늘 할 일 모두 완료!'}
              </Text>
              <Text style={styles.questPercentText}>
                {totalQuests === 0 ? '0%' : `${Math.round(progressRatio * 100)}%`}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 4. 내 반려몽 (가족 대화 자율 성장 대시보드 카드) */}
        <View style={styles.cardSection}>
          <TouchableOpacity
            style={[styles.dashboardCard, styles.petCardTheme]}
            onPress={() => onNavigateScreen && onNavigateScreen('interior')}
            activeOpacity={0.9}
          >
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeftCol}>
                <View style={styles.petSubLabelRow}>
                  <Text style={[styles.cardSubLabel, styles.petSubLabel]}>
                    우리 가족 반려몽
                  </Text>
                </View>
                <View style={styles.petTitleRow}>
                  <Text style={styles.cardMainTitle}>
                    {activePetmong?.name || '우리 몽이'}
                  </Text>
                  <Text style={styles.petTitleSub}>
                    {' '}
                    · Lv.{petLevel} {stageTitle}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.cardHeaderPillBtn}
                onPress={() => onNavigateScreen && onNavigateScreen('interior')}
                activeOpacity={0.7}
              >
                <Text style={styles.cardHeaderPillText}>보러가기 →</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.cardDivider, styles.petDivider]} />

            <View style={styles.petCardInnerRow}>
              <View style={styles.petEmojiBox}>
                {activePetmong?.image_url ? (
                  Platform.OS === 'web' ? (
                    <img
                      src={transparentAvatarUrl || activePetmong.image_url}
                      alt={activePetmong.name || '반려몽'}
                      style={{
                        width: 56,
                        height: 56,
                        objectFit: 'contain',
                        mixBlendMode: 'multiply',
                        display: 'block',
                        pointerEvents: 'none',
                        userSelect: 'none',
                      }}
                    />
                  ) : (
                    <Image
                      source={{ uri: transparentAvatarUrl || activePetmong.image_url }}
                      style={styles.petAvatarImage}
                      resizeMode="contain"
                    />
                  )
                ) : (
                  <Text style={styles.petAvatarEmoji}>
                    {activePetmong?.emoji || '😸'}
                  </Text>
                )}
                {canHarvestFruit && (
                  <View style={styles.petFruitBadge}>
                    <Text style={styles.petFruitBadgeEmoji}>✨</Text>
                  </View>
                )}
              </View>

              <View style={styles.petInfoCol}>
                <View style={styles.petStatRow}>
                  <Text style={styles.petStatLabel}>🔥 대화 온기</Text>
                  <View style={styles.petStatBarBg}>
                    <View
                      style={[
                        styles.petStatBarFill,
                        { width: `${familyWarmth}%`, backgroundColor: '#FF6B47' },
                      ]}
                    />
                  </View>
                  <Text style={[styles.petStatValText, { color: '#E11D48' }]}>
                    {familyWarmth}%
                  </Text>
                </View>

                <View style={styles.petStatRow}>
                  <Text style={styles.petStatLabel}>🌱 다음 진화</Text>
                  <View style={styles.petStatBarBg}>
                    <View
                      style={[
                        styles.petStatBarFill,
                        { width: `${expRatio}%`, backgroundColor: '#6366F1' },
                      ]}
                    />
                  </View>
                  <Text style={[styles.petStatValText, { color: '#4338CA' }]}>
                    {expRatio}%
                  </Text>
                </View>

                <View style={styles.petRoutineBubble}>
                  <Text style={styles.petRoutineText} numberOfLines={1}>
                    💬 {routineDialogue}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* 5. 우리 가족 앨범 티저 */}
        <View style={styles.cardSection}>
          <TouchableOpacity
            style={[styles.dashboardCard, styles.albumCardTheme]}
            onPress={() => onNavigateScreen && onNavigateScreen('album')}
            activeOpacity={0.9}
          >
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeftCol}>
                <Text style={[styles.cardSubLabel, styles.albumSubLabel]}>
                  우리 가족 앨범
                </Text>
                <Text style={styles.cardMainTitle}>소중한 추억 모아보기</Text>
              </View>

              <TouchableOpacity
                style={styles.cardHeaderPillBtn}
                onPress={() => onNavigateScreen && onNavigateScreen('album')}
                activeOpacity={0.7}
              >
                <Text style={styles.cardHeaderPillText}>앨범 보기 →</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.cardDivider, styles.albumDivider]} />

            <View style={styles.albumInnerRow}>
              <View style={styles.albumEmojiBox}>
                <Text style={styles.albumEmojiText}>📸</Text>
              </View>

              <View style={styles.albumContentCol}>
                <Text style={styles.albumTitleText} numberOfLines={1}>
                  함께 나눈 일상 사진과 이야기
                </Text>
                <Text style={styles.albumSubText}>
                  가족들과 나눈 따뜻한 순간들을 모아보세요
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 우리 가족 별칭(애칭) 설정 모달 */}
      <HomeNicknameModal
        visible={nicknameModalVisible}
        initialNickname={familyTitle}
        presets={FAMILY_NICKNAME_PRESETS}
        onClose={() => setNicknameModalVisible(false)}
        onSaveNickname={handleSaveFamilyNickname}
      />
    </View>
  );
}

const HomeScreen = React.memo(HomeScreenComponent);
export default HomeScreen;
