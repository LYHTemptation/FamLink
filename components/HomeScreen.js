import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import { Plus, Send } from 'lucide-react-native';
import UserAvatar from './UserAvatar';
import { getEvolutionStage, getStageNameWithPet, getRequiredExpForLevel } from '../lib/petmongEvolution';
import { stripEmojis } from '../utils/topics';
import { getKoreanHoliday } from '../utils/koreanHolidays';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 한국형 생활 행동 기반 아이콘 & 카테고리 스마트 매퍼
export const getChoreIconMeta = (category, title = '') => {
  const safe = (title || '').toLowerCase();
  // 1. 쓰레기 / 분리수거
  if (safe.includes('분리수거') || safe.includes('쓰레기') || safe.includes('음식물') || safe.includes('재활용')) {
    return { icon: '🗑️', category: '분리수거', iconBg: '#C7D2FE', tagColor: '#1E40AF' };
  }
  // 2. 식사 / 설거지
  if (safe.includes('설거지') || safe.includes('식기') || safe.includes('그릇')) {
    return { icon: '🍽️', category: '설거지', iconBg: '#F5F0E8', tagColor: '#78716C' };
  }
  if (safe.includes('식탁') || safe.includes('요리') || safe.includes('밥') || safe.includes('저녁') || safe.includes('아침') || safe.includes('점심')) {
    return { icon: '🍳', category: '식사/요리', iconBg: '#FDE68A', tagColor: '#78350F' };
  }
  // 3. 청소 / 정리
  if (safe.includes('청소기') || safe.includes('청소') || safe.includes('물걸레') || safe.includes('걸레') || safe.includes('정리') || safe.includes('환기')) {
    return { icon: '🧹', category: '청소/정리', iconBg: '#DDD6FE', tagColor: '#5B21B6' };
  }
  // 4. 세탁 / 빨래
  if (safe.includes('빨래') || safe.includes('세탁') || safe.includes('건조기') || safe.includes('이불') || safe.includes('옷')) {
    return { icon: '🧺', category: '세탁/빨래', iconBg: '#FED7AA', tagColor: '#9A3412' };
  }
  // 5. 반려동물
  if (safe.includes('산책') || safe.includes('브루노') || safe.includes('강아지') || safe.includes('고양이') || safe.includes('배변')) {
    return { icon: '🐕', category: '반려동물', iconBg: '#A7F3D0', tagColor: '#064E3B' };
  }
  // 6. 식물 / 화분
  if (safe.includes('화분') || safe.includes('식물') || safe.includes('물 주기') || safe.includes('물주기')) {
    return { icon: '🌿', category: '식물관리', iconBg: '#BBF7D0', tagColor: '#166534' };
  }
  // 7. 욕실
  if (safe.includes('욕실') || safe.includes('화장실') || safe.includes('세면대') || safe.includes('변기')) {
    return { icon: '🚿', category: '욕실청소', iconBg: '#BFDBFE', tagColor: '#1E40AF' };
  }
  // 8. 심부름 / 장보기
  if (safe.includes('마트') || safe.includes('장보기') || safe.includes('심부름') || safe.includes('택배') || safe.includes('우유') || safe.includes('사오기')) {
    return { icon: '🛒', category: '심부름', iconBg: '#FBCFE8', tagColor: '#9D174D' };
  }

  const meta = {
    야외: { icon: '🌿', category: '야외', iconBg: '#A7F3D0', tagColor: '#064E3B' },
    거실: { icon: '🛋️', category: '거실', iconBg: '#DDD6FE', tagColor: '#5B21B6' },
    기타: { icon: '📋', category: '기타', iconBg: '#F5F0E8', tagColor: '#78716C' },
    침실: { icon: '🛏️', category: '침실', iconBg: '#FBCFE8', tagColor: '#9D174D' },
    욕실: { icon: '🚿', category: '욕실', iconBg: '#BFDBFE', tagColor: '#1E40AF' },
    주방: { icon: '🍳', category: '주방', iconBg: '#FDE68A', tagColor: '#78350F' },
  }[category];

  return meta || { icon: '✅', category: category || '할 일', iconBg: '#E8E0D0', tagColor: '#1C1917' };
};

export default function HomeScreen({
  points = 0,
  events = [],
  messages = [],
  currentUser,
  currentUserProfile,
  familyMembers = [],
  shoppingItems = [],
  petmongCharacters = [],
  petVitals,
  smallTalkState = {},
  onNavigateScreen,
  onToggleQuest,
  onAwardPoints,
  onAddResponse,
}) {
  // shoppingItems를 기반으로 홈 화면 집안일/미션 목록 구성 (함께 페이지와 양방향 100% 실시간 연동)
  const quests = useMemo(() => {
    const source = shoppingItems || [];
    return source.map((item, idx) => {
      const category = item.category || '기타';
      const iconMeta = getChoreIconMeta(category, item.title);
      return {
        id: item.id,
        rawItem: item,
        title: item.title,
        member: item.assignee || '가족 전체',
        assignee: item.assignee || '가족 전체',
        category: iconMeta.category || category,
        points: item.points || 20,
        isCompleted: Boolean(item.is_completed),
        icon: iconMeta.icon,
        bg: iconMeta.iconBg,
        tagColor: iconMeta.tagColor,
      };
    });
  }, [shoppingItems]);

  // 한국어 오늘 날짜 (예: "9월 26일 토요일")
  const todayFormattedKorean = useMemo(() => {
    const now = new Date();
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    return `${now.getMonth() + 1}월 ${now.getDate()}일 ${days[now.getDay()]}`;
  }, []);

  // 가족 명칭
  const familyTitle = useMemo(() => {
    if (currentUserProfile?.family_code) {
      return `${currentUserProfile.family_code} 가족`;
    }
    return '김 가족';
  }, [currentUserProfile?.family_code]);

  // 대표 활성 반려몽 캐릭터 (1가족 1공동 반려몽)
  const activePetmong = useMemo(() => {
    if (petmongCharacters && petmongCharacters.length > 0) {
      return petmongCharacters[0];
    }
    return null;
  }, [petmongCharacters]);

  // 가족 대화 온기 & 자율 성장 지표 산출 (썸원 방식)
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const todayMessages = useMemo(() => {
    return (messages || []).filter(m => {
      const t = new Date(m.created_at || m.timestamp || Date.now()).getTime();
      return t >= todayStart;
    });
  }, [messages, todayStart]);

  const todayResponsesCount = useMemo(() => {
    if (!smallTalkState || !smallTalkState.responses) return 0;
    return Object.keys(smallTalkState.responses).length;
  }, [smallTalkState]);

  const familyWarmth = useMemo(() => {
    const chatScore = Math.min(60, todayMessages.length * 10);
    const smallTalkScore = Math.min(40, todayResponsesCount * 20);
    return Math.min(100, Math.max(20, chatScore + smallTalkScore));
  }, [todayMessages.length, todayResponsesCount]);

  const canHarvestFruit = (todayMessages.length > 0 || todayResponsesCount > 0);

  // 실제 대화방에 보관된 사진 수 집계 (Mock 데이터 제거)
  const totalPhotosCount = useMemo(() => {
    if (!messages || !Array.isArray(messages)) return 0;
    return messages.filter(m => m && (m.image || m.image_url)).length;
  }, [messages]);

  const petLevel = activePetmong?.level || 1;
  const stageInfo = useMemo(() => getEvolutionStage(petLevel), [petLevel]);
  const stageTitle = useMemo(() => getStageNameWithPet(stageInfo?.stage || 1, activePetmong?.name || '우리 몽이'), [stageInfo, activePetmong?.name]);
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

  // 퀘스트 완료 카운트 계산
  const totalQuests = quests.length;
  const completedCount = quests.filter(q => q.isCompleted).length;
  const progressRatio = totalQuests > 0 ? completedCount / totalQuests : 0;
  const remainingCount = totalQuests - completedCount;

  // 오늘의 일정 필터링 (데이터 없으면 빈 리스트)
  const todayScheduleList = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayHoliday = getKoreanHoliday(todayStr);

    const list = [];
    if (todayHoliday) {
      list.push({
        id: `holiday-${todayStr}`,
        emoji: '🇰🇷',
        title: `${todayHoliday.name} (${todayHoliday.isSubstitute ? '대체공휴일' : '법정 공휴일'})`,
        category: '공휴일',
        member: '대한민국 공휴일',
        dotColor: '#EF4444',
      });
    }
    
    // 실제 events 중 오늘에 해당하는 일정 탐색
    const matchedEvents = (events || []).filter(e => {
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
        } else if (e.title?.includes('외식') || e.title?.includes('밥') || e.title?.includes('치킨') || e.title?.includes('피자') || e.category === 'dinner') {
          emoji = '🍜';
        } else if (e.title?.includes('생일') || e.title?.includes('파티') || e.title?.includes('기념일') || e.category === 'anniversary') {
          emoji = '🎉';
        } else if (e.title?.includes('공부') || e.title?.includes('숙제') || e.title?.includes('학원') || e.title?.includes('학교')) {
          emoji = '📚';
        } else if (e.title?.includes('병원') || e.title?.includes('진료') || e.title?.includes('약')) {
          emoji = '💊';
        } else if (e.title?.includes('여행') || e.title?.includes('캠핑') || e.title?.includes('나들이')) {
          emoji = '🚗';
        } else if (e.title?.includes('운동') || e.title?.includes('축구') || e.title?.includes('헬스')) {
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

  // 가족 멤버 목록 (데이터 없으면 Figma 기본 목업: 엄마, 아빠, 지수, 민준)
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

  // 스몰톡 즉시 답변 상태 & 파싱
  const [smallTalkInputText, setSmallTalkInputText] = useState('');
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

  const { topic = '', responses = {} } = smallTalkState || {};
  const topicTitle = useMemo(() => {
    if (!topic) return '오늘 가장 많이 웃었던 일은 무엇인가요?';
    const raw = typeof topic === 'string' ? topic : (topic.text || topic.title || '오늘 하루 가장 기억에 남는 순간은?');
    return stripEmojis(raw);
  }, [topic]);

  const topicCategory = useMemo(() => {
    if (typeof topic === 'object' && topic?.category) return topic.category;
    return '오늘의 스몰톡 질문';
  }, [topic]);

  const myId = currentUserProfile?.id;
  const myResponse = myId ? (responses[myId] || responses[currentUser]) : responses[currentUser];

  const answeredMembersCount = useMemo(() => {
    return displayFamilyMembers.filter(m => responses[m.id] || responses[m.name] || responses[m.role]).length;
  }, [displayFamilyMembers, responses]);

  const allAnswered = displayFamilyMembers.length > 0 && answeredMembersCount >= displayFamilyMembers.length;

  const handleQuickSubmitSmallTalk = async () => {
    const trimmed = smallTalkInputText.trim();
    if (!trimmed) {
      Alert.alert('알림', '답변 내용을 입력해주세요.');
      return;
    }
    if (onAddResponse) {
      setIsSubmittingAnswer(true);
      try {
        await onAddResponse(myId || currentUser, trimmed);
        setSmallTalkInputText('');
        Alert.alert('답변 등록 완료 🎉', '스몰톡 답변이 등록되고 +5 가족 포인트가 적립되었습니다!');
      } catch (e) {
        console.error('Error submitting smalltalk answer from home:', e);
      } finally {
        setIsSubmittingAnswer(false);
      }
    } else {
      Alert.alert('안내', '스몰톡 화면으로 이동하여 답변을 등록해주세요.');
      if (onNavigateScreen) onNavigateScreen('smalltalk');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================= */}
        {/* 1. 상단 헤더 & 지오메트릭 액센트 (Figma 11:1439)          */}
        {/* ========================================================= */}
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
              <Text style={styles.greetingTitle}>
                안녕하세요,{'\n'}{familyTitle} 👋
              </Text>
            </View>

            {/* 실시간 포인트 뱃지 */}
            <TouchableOpacity
              style={styles.pointsBadge}
              onPress={() => onNavigateScreen && onNavigateScreen('smalltalk')}
              activeOpacity={0.8}
            >
              <Text style={styles.pointsStar}>⭐</Text>
              <Text style={styles.pointsText}>{points} pts</Text>
            </TouchableOpacity>
          </View>

          {/* 가족 멤버 아바타 레일 (가로 스크롤) */}
          <View style={styles.membersRowContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.membersScroll}>
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
                    <View style={[styles.memberAvatarRing, { backgroundColor: ring.bg, borderColor: ring.stroke }]}>
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

        {/* ========================================================= */}
        {/* ========================================================= */}
        {/* 2. 📅 오늘의 일정 (이미지 시안 스타일)                       */}
        {/* ========================================================= */}
        <View style={styles.cardSection}>
          <TouchableOpacity
            style={[styles.dashboardCard, styles.scheduleCardTheme]}
            onPress={() => onNavigateScreen && onNavigateScreen('calendar')}
            activeOpacity={0.9}
          >
            {/* 카드 상단 헤더: 서브라벨 + 메인 타이틀 + 전체 보기 */}
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeftCol}>
                <Text style={[styles.cardSubLabel, styles.scheduleSubLabel]}>오늘의 일정</Text>
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

            {/* 카드 구분선 */}
            <View style={[styles.cardDivider, styles.scheduleDivider]} />

            {/* 일정 리스트 (일정이 있을 때 vs 없을 때) */}
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
                      <Text style={styles.scheduleEventMemberText}>
                        {evt.member}
                      </Text>
                    </View>
                    <View style={[styles.scheduleDot, { backgroundColor: evt.dotColor || '#34D399' }]} />
                  </View>
                ))
              ) : (
                <View style={styles.scheduleEmptyRow}>
                  <Text style={styles.scheduleEmptyEmoji}>🕊️</Text>
                  <Text style={styles.scheduleEmptyText}>오늘 예정된 일정이 없어요</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* ========================================================= */}
        {/* 2.5 💬 오늘의 스몰톡 즉시 답변 (오늘의 일정 바로 아래)     */}
        {/* ========================================================= */}
        <View style={styles.cardSection}>
          <View style={[styles.dashboardCard, styles.smallTalkHomeCard]}>
            {/* 상단 헤더: 라벨 + 포인트 뱃지 + 스몰톡 전체 보기 */}
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeftCol}>
                <View style={styles.smallTalkBadgeRow}>
                  <Text style={[styles.cardSubLabel, styles.smallTalkSubLabel]}>오늘의 스몰톡</Text>
                  <View style={styles.smallTalkPointsPill}>
                    <Text style={styles.smallTalkPointsPillText}>+5 P</Text>
                  </View>
                </View>
                <Text style={styles.smallTalkCategoryText}>{topicCategory}</Text>
              </View>

              <TouchableOpacity
                style={styles.cardHeaderPillBtn}
                onPress={() => onNavigateScreen && onNavigateScreen('smalltalk')}
                activeOpacity={0.7}
              >
                <Text style={styles.cardHeaderPillText}>전체 보기 →</Text>
              </TouchableOpacity>
            </View>

            {/* 질문 본문 */}
            <TouchableOpacity
              onPress={() => onNavigateScreen && onNavigateScreen('smalltalk')}
              activeOpacity={0.85}
              style={styles.smallTalkQuestionBox}
            >
              <Text style={styles.smallTalkQuestionText}>
                {topicTitle}
              </Text>
            </TouchableOpacity>

            {/* 카드 구분선 */}
            <View style={[styles.cardDivider, styles.smallTalkDivider]} />

            {/* 답변 입력 또는 내 답변 노출 영역 */}
            {myResponse ? (
              <View style={styles.myAnswerDoneBox}>
                <View style={styles.myAnswerHeaderRow}>
                  <View style={styles.myAnswerBadge}>
                    <Text style={styles.myAnswerCheckIcon}>✓</Text>
                    <Text style={styles.myAnswerBadgeText}>내 답변 완료 (+5P 적립됨)</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => onNavigateScreen && onNavigateScreen('smalltalk')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.myAnswerEditBtn}>수정 ✍️</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.myAnswerContentText} numberOfLines={2}>
                  "{myResponse}"
                </Text>
              </View>
            ) : (
              <View style={styles.quickAnswerInputContainer}>
                <TextInput
                  style={styles.quickAnswerInput}
                  placeholder="답변을 남겨보세요... (+5P)"
                  placeholderTextColor="#A8A29E"
                  value={smallTalkInputText}
                  onChangeText={setSmallTalkInputText}
                  multiline={false}
                  returnKeyType="send"
                  onSubmitEditing={handleQuickSubmitSmallTalk}
                />
                <TouchableOpacity
                  style={[
                    styles.quickAnswerSubmitBtn,
                    (!smallTalkInputText.trim() || isSubmittingAnswer) && styles.quickAnswerSubmitBtnDisabled,
                  ]}
                  onPress={handleQuickSubmitSmallTalk}
                  disabled={!smallTalkInputText.trim() || isSubmittingAnswer}
                  activeOpacity={0.85}
                >
                  <Send size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.quickAnswerSubmitBtnText}>등록</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 하단 가족 참여 진행 현황 */}
            <View style={styles.smallTalkFooterRow}>
              <Text style={styles.smallTalkParticipationText}>
                가족 참여: <Text style={{ fontWeight: '800', color: '#1C1917' }}>{answeredMembersCount}명</Text> / {displayFamilyMembers.length}명
              </Text>
              <Text style={styles.smallTalkBonusHint}>
                {allAnswered ? '🎉 전원 완료 (+30P 보너스 달성!)' : '모두 참여 시 +30 P 보너스 🎁'}
              </Text>
            </View>
          </View>
        </View>

        {/* ========================================================= */}
        {/* 3. 오늘의 퀘스트 진행도 카드 (이미지 시안 스타일)             */}
        {/* ========================================================= */}
        <View style={styles.cardSection}>
          <TouchableOpacity
            style={[styles.dashboardCard, styles.questCardTheme]}
            onPress={() => onNavigateScreen && onNavigateScreen('smalltalk')}
            activeOpacity={0.9}
          >
            {/* 카드 상단 헤더: 서브라벨 + 완료수/전체수 + 알약형 전체 보기 버튼 */}
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeftCol}>
                <Text style={[styles.cardSubLabel, styles.questSubLabel]}>오늘 함께</Text>
                <View style={styles.questTitleRow}>
                  <Text style={styles.cardMainTitle}>{completedCount}개 완료</Text>
                  <Text style={styles.questTitleTotal}> / {totalQuests}개</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.cardHeaderPillBtn}
                onPress={() => onNavigateScreen && onNavigateScreen('smalltalk')}
                activeOpacity={0.7}
              >
                <Text style={styles.cardHeaderPillText}>전체 보기 →</Text>
              </TouchableOpacity>
            </View>

            {/* 카드 구분선 */}
            <View style={[styles.cardDivider, styles.questDivider]} />

            {/* 진행률 막대 그래프 */}
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: totalQuests === 0 ? '0%' : `${Math.max(4, Math.min(100, Math.round(progressRatio * 100)))}%` },
                ]}
              />
            </View>

            {/* 하단 메타 정보 (남은 개수 / 진행률 %) */}
            <View style={styles.questMetaRow}>
              <Text style={styles.questRemainingText}>
                {totalQuests === 0
                  ? '등록된 집안일이 없어요 🕊️'
                  : (remainingCount > 0 ? `${remainingCount}개 남음` : '오늘 할 일 모두 완료!')}
              </Text>
              <Text style={styles.questPercentText}>
                {totalQuests === 0 ? '0%' : `${Math.round(progressRatio * 100)}%`}
              </Text>
            </View>
          </TouchableOpacity>
        </View>


        {/* ========================================================= */}
        {/* ========================================================= */}
        {/* 4. 내 반려몽 (가족 대화 자율 성장 대시보드 카드)             */}
        {/* ========================================================= */}
        <View style={styles.cardSection}>
          <TouchableOpacity
            style={[styles.dashboardCard, styles.petCardTheme]}
            onPress={() => onNavigateScreen && onNavigateScreen('interior')}
            activeOpacity={0.9}
          >
            {/* 카드 상단 헤더: 서브라벨 + 펫 이름/단계 + 보러가기 버튼 */}
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeftCol}>
                <View style={styles.petSubLabelRow}>
                  <Text style={[styles.cardSubLabel, styles.petSubLabel]}>우리 가족 반려몽</Text>
                </View>
                <View style={styles.petTitleRow}>
                  <Text style={styles.cardMainTitle}>{activePetmong?.name || '우리 몽이'}</Text>
                  <Text style={styles.petTitleSub}> · Lv.{petLevel} {stageTitle}</Text>
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

            {/* 카드 구분선 */}
            <View style={[styles.cardDivider, styles.petDivider]} />

            {/* 펫 콘텐츠: 좌측 아바타 박스 + 우측 2대 성장 지표 & 자율 루틴 말풍선 */}
            <View style={styles.petCardInnerRow}>
              <View style={styles.petEmojiBox}>
                {activePetmong?.image_url ? (
                  Platform.OS === 'web' ? (
                    <img
                      src={activePetmong.image_url}
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
                      source={{ uri: activePetmong.image_url }}
                      style={styles.petAvatarImage}
                      resizeMode="contain"
                    />
                  )
                ) : (
                  <Text style={styles.petAvatarEmoji}>{activePetmong?.emoji || '😸'}</Text>
                )}
                {canHarvestFruit && (
                  <View style={styles.petFruitBadge}>
                    <Text style={styles.petFruitBadgeEmoji}>✨</Text>
                  </View>
                )}
              </View>

              <View style={styles.petInfoCol}>
                {/* 지표 1: 오늘 대화 온기 */}
                <View style={styles.petStatRow}>
                  <Text style={styles.petStatLabel}>🔥 대화 온기</Text>
                  <View style={styles.petStatBarBg}>
                    <View style={[styles.petStatBarFill, { width: `${familyWarmth}%`, backgroundColor: '#FF6B47' }]} />
                  </View>
                  <Text style={[styles.petStatValText, { color: '#E11D48' }]}>{familyWarmth}%</Text>
                </View>

                {/* 지표 2: 성장 진화 EXP */}
                <View style={styles.petStatRow}>
                  <Text style={styles.petStatLabel}>🌱 다음 진화</Text>
                  <View style={styles.petStatBarBg}>
                    <View style={[styles.petStatBarFill, { width: `${expRatio}%`, backgroundColor: '#6366F1' }]} />
                  </View>
                  <Text style={[styles.petStatValText, { color: '#4338CA' }]}>{expRatio}%</Text>
                </View>

                {/* 지표 3: 현재 자율 루틴 말풍선 */}
                <View style={styles.petRoutineBubble}>
                  <Text style={styles.petRoutineText} numberOfLines={1}>
                    💬 {routineDialogue}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* ========================================================= */}
        {/* 5. 우리 가족 앨범 티저 (대시보드 카드 스타일)               */}
        {/* ========================================================= */}
        <View style={styles.cardSection}>
          <TouchableOpacity
            style={[styles.dashboardCard, styles.albumCardTheme]}
            onPress={() => onNavigateScreen && onNavigateScreen('album')}
            activeOpacity={0.9}
          >
            {/* 카드 상단 헤더: 서브라벨 + 메인 타이틀 + 알약형 버튼 */}
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeftCol}>
                <Text style={[styles.cardSubLabel, styles.albumSubLabel]}>우리 가족 앨범</Text>
                <View style={styles.albumTitleRow}>
                  <Text style={styles.cardMainTitle}>이번 달 추억</Text>
                  <Text style={styles.albumTitleTotal}> · {totalPhotosCount}장 보관 중</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.cardHeaderPillBtn}
                onPress={() => onNavigateScreen && onNavigateScreen('album')}
                activeOpacity={0.7}
              >
                <Text style={styles.cardHeaderPillText}>앨범 보기 →</Text>
              </TouchableOpacity>
            </View>

            {/* 카드 구분선 */}
            <View style={[styles.cardDivider, styles.albumDivider]} />

            {/* 앨범 콘텐츠: 아이콘 박스 + 설명 텍스트 + 우측 상태 도트 */}
            <View style={styles.albumInnerRow}>
              <View style={styles.albumEmojiBox}>
                <Text style={styles.albumEmojiText}>📸</Text>
              </View>

              <View style={styles.albumContentCol}>
                <Text style={styles.albumTitleText} numberOfLines={1}>
                  소중한 일상 사진과 일기
                </Text>
                <Text style={styles.albumSubText}>
                  가족들과 나눈 따뜻한 순간들을 모아보세요
                </Text>
              </View>

              <View style={styles.albumDot} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F3', // Figma node 11:1436 테마 배경
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // 1. 헤더 섹션 & 지오메트릭 액센트
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  blobCircle: {
    position: 'absolute',
    borderRadius: 9999,
  },
  blobCoral: {
    width: 192,
    height: 192,
    top: -40,
    right: -30,
    backgroundColor: '#FF6B47',
    opacity: 0.12,
  },
  blobOrange: {
    width: 90,
    height: 90,
    top: 66,
    right: 20,
    backgroundColor: '#FFB347',
    opacity: 0.10,
  },
  blobMint: {
    width: 128,
    height: 128,
    top: 45,
    left: -20,
    backgroundColor: '#A7F3D0',
    opacity: 0.12,
  },
  blobRect: {
    position: 'absolute',
    width: 38,
    height: 38,
    top: 78,
    right: 50,
    backgroundColor: '#DDA0DD',
    opacity: 0.18,
    borderRadius: 18,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    zIndex: 2,
  },
  greetingCol: {
    flex: 1,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A8A29E',
    letterSpacing: 1,
    marginBottom: 4,
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1C1917',
    lineHeight: 30,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDE68A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  pointsStar: {
    fontSize: 14,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#78350F',
  },

  // 가족 멤버 아바타 레일
  membersRowContainer: {
    marginTop: 8,
    zIndex: 2,
  },
  membersScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  memberItem: {
    alignItems: 'center',
    gap: 4,
  },
  memberAvatarRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberNameText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78716C',
  },
  addMemberBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#C621360F',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },

  // 2. 공통 카드 섹션 래퍼
  cardSection: {
    paddingHorizontal: 20,
    marginTop: 18,
  },

  // 2. 공통 대시보드 카드 (오늘의 일정 & 오늘의 퀘스트 공통 CSS)
  dashboardCard: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F5F0E8',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1.5,
  },
  scheduleCardTheme: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F5F0E8',
  },
  questCardTheme: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F5F0E8',
  },
  petCardTheme: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F5F0E8',
  },
  albumCardTheme: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F5F0E8',
  },
  smallTalkHomeCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F5F0E8',
  },
  smallTalkSubLabel: {
    color: '#FF6B47',
  },
  smallTalkBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  smallTalkPointsPill: {
    backgroundColor: '#FFF5F2',
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE8E0',
  },
  smallTalkPointsPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF6B47',
  },
  smallTalkCategoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A8A29E',
  },
  smallTalkLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6B47',
  },
  smallTalkQuestionBox: {
    marginTop: 10,
    marginBottom: 4,
    paddingVertical: 2,
  },
  smallTalkQuestionText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C1917',
    lineHeight: 23,
    letterSpacing: -0.3,
  },
  smallTalkDivider: {
    backgroundColor: '#F5F0E8',
    marginVertical: 12,
  },
  myAnswerDoneBox: {
    backgroundColor: '#FFF5F2',
    borderWidth: 1,
    borderColor: '#FFE4DC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  myAnswerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  myAnswerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  myAnswerCheckIcon: {
    fontSize: 13,
    fontWeight: '900',
    color: '#16A34A',
  },
  myAnswerBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },
  myAnswerEditBtn: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#78716C',
  },
  myAnswerContentText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#292524',
    lineHeight: 19,
  },
  quickAnswerInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F3',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 5,
    marginBottom: 10,
  },
  quickAnswerInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1C1917',
    paddingVertical: 6,
  },
  quickAnswerSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B47',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickAnswerSubmitBtnDisabled: {
    backgroundColor: '#E8E0D0',
  },
  quickAnswerSubmitBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  smallTalkFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  smallTalkParticipationText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#78716C',
  },
  smallTalkBonusHint: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6B47',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderLeftCol: {
    flex: 1,
  },
  cardSubLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.2,
    color: '#78716C',
  },
  scheduleSubLabel: {
    color: '#78716C',
  },
  questSubLabel: {
    color: '#78716C',
  },
  petSubLabel: {
    color: '#78716C',
  },
  albumSubLabel: {
    color: '#78716C',
  },
  cardMainTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1C1917',
    letterSpacing: -0.4,
  },
  questTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  questTitleTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#A8A29E',
  },
  cardHeaderPillBtn: {
    backgroundColor: '#FAF8F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F5F0E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  cardHeaderPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B47',
    letterSpacing: -0.2,
  },
  cardActionLink: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  scheduleLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B47',
  },
  questPillBtn: {
    backgroundColor: '#FAF8F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F5F0E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
    alignSelf: 'flex-start',
  },
  questPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B47',
  },
  cardDivider: {
    height: 1,
    width: '100%',
    marginVertical: 14,
    backgroundColor: '#F5F0E8',
  },
  scheduleDivider: {
    backgroundColor: '#F5F0E8',
  },
  questDivider: {
    backgroundColor: '#F5F0E8',
  },
  petDivider: {
    backgroundColor: '#F5F0E8',
  },
  albumDivider: {
    backgroundColor: '#F5F0E8',
  },

  // 2.1 오늘의 일정 전용 스타일
  scheduleEventsList: {
    gap: 12,
  },
  scheduleEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleEmojiBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#FAF8F3',
    borderWidth: 1,
    borderColor: '#F5F0E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  scheduleEmojiText: {
    fontSize: 20,
  },
  scheduleEventContent: {
    flex: 1,
  },
  scheduleEventTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1917',
    marginBottom: 2,
  },
  scheduleEventMemberText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#78716C',
  },
  scheduleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  scheduleEmptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  scheduleEmptyEmoji: {
    fontSize: 18,
  },
  scheduleEmptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#A8A29E',
  },

  // 3.1 오늘의 퀘스트 전용 스타일
  progressBarTrack: {
    height: 8,
    backgroundColor: '#F5F0E8',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF6B47',
    borderRadius: 4,
  },
  questMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questRemainingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78716C',
  },
  questPercentText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1917',
  },

  // 4. 내 반려몽 전용 스타일
  petSubLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  harvestFruitChip: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#F59E0B',
  },
  harvestFruitChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  petTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  petTitleSub: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78716C',
    marginLeft: 4,
  },
  petPillBtn: {
    backgroundColor: '#FAF8F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F5F0E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  petPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B47',
  },
  petCardInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  petEmojiBox: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  petAvatarImage: {
    width: 56,
    height: 56,
    resizeMode: 'contain',
    ...(Platform.OS === 'web' ? { mixBlendMode: 'multiply' } : {}),
  },
  petAvatarEmoji: {
    fontSize: 34,
  },
  petFruitBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FEF3C7',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  petFruitBadgeEmoji: {
    fontSize: 10,
  },
  petInfoCol: {
    flex: 1,
    gap: 5,
  },
  petStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  petStatLabel: {
    width: 60,
    fontSize: 11,
    fontWeight: '700',
    color: '#78716C',
  },
  petStatBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#F5F0E8',
    borderRadius: 3,
    overflow: 'hidden',
  },
  petStatBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  petStatValText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1C1917',
    width: 32,
    textAlign: 'right',
  },
  petRoutineBubble: {
    backgroundColor: '#FAF8F3',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#F5F0E8',
  },
  petRoutineText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78716C',
  },

  // 5. 우리 가족 앨범 전용 스타일
  albumTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  albumTitleTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78716C',
    marginLeft: 4,
  },
  albumPillBtn: {
    backgroundColor: '#FAF8F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F5F0E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  albumPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B47',
  },
  albumInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  albumEmojiBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FAF8F3',
    borderWidth: 1,
    borderColor: '#F5F0E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  albumEmojiText: {
    fontSize: 22,
  },
  albumContentCol: {
    flex: 1,
  },
  albumTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1917',
    marginBottom: 2,
  },
  albumSubText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#78716C',
  },
  albumDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B47',
    marginLeft: 8,
  },
});
