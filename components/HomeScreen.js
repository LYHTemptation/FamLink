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
} from 'react-native';
import { Plus } from 'lucide-react-native';
import UserAvatar from './UserAvatar';

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
  onNavigateScreen,
  onToggleQuest,
  onAwardPoints,
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

  // 퀘스트 완료 카운트 계산
  const totalQuests = quests.length;
  const completedCount = quests.filter(q => q.isCompleted).length;
  const progressRatio = totalQuests > 0 ? completedCount / totalQuests : 0;
  const remainingCount = totalQuests - completedCount;

  // 오늘의 일정 필터링 (데이터 없으면 빈 리스트)
  const todayScheduleList = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    // 실제 events 중 오늘에 해당하는 일정 탐색
    const matchedEvents = (events || []).filter(e => {
      if (!e.date) return false;
      const start = e.date;
      const end = e.endDate || e.end_date || e.date;
      return todayStr >= start && todayStr <= end;
    });

    if (matchedEvents.length > 0) {
      return matchedEvents.slice(0, 3).map((e, idx) => {
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
    }

    return [];
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
                style={styles.cardActionLink}
                onPress={() => onNavigateScreen && onNavigateScreen('calendar')}
                activeOpacity={0.7}
              >
                <Text style={styles.scheduleLinkText}>전체 보기 →</Text>
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
                style={styles.questPillBtn}
                onPress={() => onNavigateScreen && onNavigateScreen('smalltalk')}
                activeOpacity={0.7}
              >
                <Text style={styles.questPillText}>전체 보기 →</Text>
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
        {/* 4. 내 반려몽 (개인별 펫 대시보드 카드)                      */}
        {/* ========================================================= */}
        <View style={styles.cardSection}>
          <TouchableOpacity
            style={[styles.dashboardCard, styles.petCardTheme]}
            onPress={() => onNavigateScreen && onNavigateScreen('interior')}
            activeOpacity={0.9}
          >
            {/* 카드 상단 헤더: 서브라벨 + 펫 이름/상태 + 알약형 버튼 */}
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeftCol}>
                <Text style={[styles.cardSubLabel, styles.petSubLabel]}>우리 가족 반려몽</Text>
                <View style={styles.petTitleRow}>
                  <Text style={styles.cardMainTitle}>{activePetmong?.name || '우리 몽이'}</Text>
                  <Text style={styles.petTitleSub}> · {activePetmong?.personality || '기분 좋아요!'}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.petPillBtn}
                onPress={() => onNavigateScreen && onNavigateScreen('interior')}
                activeOpacity={0.7}
              >
                <Text style={styles.petPillText}>돌봐주기 →</Text>
              </TouchableOpacity>
            </View>

            {/* 카드 구분선 */}
            <View style={[styles.cardDivider, styles.petDivider]} />

            {/* 펫 콘텐츠: 좌측 아바타 박스 + 우측 3대 생체 게이지 */}
            <View style={styles.petCardInnerRow}>
              <View style={styles.petEmojiBox}>
                {activePetmong?.image_url ? (
                  <Image
                    source={{ uri: activePetmong.image_url }}
                    style={styles.petAvatarImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={styles.petAvatarEmoji}>{activePetmong?.emoji || '😸'}</Text>
                )}
              </View>

              <View style={styles.petInfoCol}>
                {/* 게이지 1: 건강 */}
                <View style={styles.petStatRow}>
                  <Text style={styles.petStatLabel}>❤️ 건강</Text>
                  <View style={styles.petStatBarBg}>
                    <View style={[styles.petStatBarFill, { width: `${Math.round(petVitals?.cleanliness ?? 90)}%`, backgroundColor: '#34D399' }]} />
                  </View>
                  <Text style={styles.petStatValText}>{Math.round(petVitals?.cleanliness ?? 90)}%</Text>
                </View>

                {/* 게이지 2: 행복 */}
                <View style={styles.petStatRow}>
                  <Text style={styles.petStatLabel}>😊 행복</Text>
                  <View style={styles.petStatBarBg}>
                    <View style={[styles.petStatBarFill, { width: `${Math.round(petVitals?.happiness ?? 85)}%`, backgroundColor: '#60A5FA' }]} />
                  </View>
                  <Text style={styles.petStatValText}>{Math.round(petVitals?.happiness ?? 85)}%</Text>
                </View>

                {/* 게이지 3: 식사 */}
                <View style={styles.petStatRow}>
                  <Text style={styles.petStatLabel}>🍖 식사</Text>
                  <View style={styles.petStatBarBg}>
                    <View style={[styles.petStatBarFill, { width: `${Math.round(petVitals?.hunger ?? 80)}%`, backgroundColor: '#F59E0B' }]} />
                  </View>
                  <Text style={styles.petStatValText}>{Math.round(petVitals?.hunger ?? 80)}%</Text>
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
                  <Text style={styles.albumTitleTotal}> · {messages.length + 19}개 보관 중</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.albumPillBtn}
                onPress={() => onNavigateScreen && onNavigateScreen('album')}
                activeOpacity={0.7}
              >
                <Text style={styles.albumPillText}>앨범 보기 →</Text>
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
    borderWidth: 1.2,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  scheduleCardTheme: {
    backgroundColor: '#FEFBF2',
    borderColor: '#F6E8B8',
  },
  questCardTheme: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FECDD3',
  },
  petCardTheme: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  albumCardTheme: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
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
  },
  scheduleSubLabel: {
    color: '#854D0E',
  },
  questSubLabel: {
    color: '#9F1239',
  },
  petSubLabel: {
    color: '#4338CA',
  },
  albumSubLabel: {
    color: '#C2410C',
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
    color: '#FDA4AF',
  },
  cardActionLink: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  scheduleLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#854D0E',
  },
  questPillBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  questPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9F1239',
  },
  cardDivider: {
    height: 1,
    width: '100%',
    marginVertical: 14,
  },
  scheduleDivider: {
    backgroundColor: '#F8E8BE',
  },
  questDivider: {
    backgroundColor: '#FEE2E2',
  },
  petDivider: {
    backgroundColor: '#E0E7FF',
  },
  albumDivider: {
    backgroundColor: '#FFEDD5',
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
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
    backgroundColor: '#FECDD3',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#E11D48',
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
    color: '#9F1239',
  },
  questPercentText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1917',
  },

  // 4. 내 반려몽 전용 스타일
  petTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  petTitleSub: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366F1',
    marginLeft: 4,
  },
  petPillBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  petPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4338CA',
  },
  petCardInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  petEmojiBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  petAvatarImage: {
    width: 48,
    height: 48,
  },
  petAvatarEmoji: {
    fontSize: 34,
  },
  petInfoCol: {
    flex: 1,
    gap: 6,
  },
  petStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  petStatLabel: {
    width: 52,
    fontSize: 11,
    fontWeight: '700',
    color: '#4338CA',
  },
  petStatBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#E0E7FF',
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
    width: 28,
    textAlign: 'right',
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
    color: '#F97316',
    marginLeft: 4,
  },
  albumPillBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FED7AA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  albumPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C2410C',
  },
  albumInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  albumEmojiBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
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
    backgroundColor: '#F97316',
    marginLeft: 8,
  },
});
