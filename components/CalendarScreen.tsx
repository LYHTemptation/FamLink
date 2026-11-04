import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Plus,
  Clock,
  Trash2,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  Edit3,
} from 'lucide-react-native';
import UserAvatar from './UserAvatar';
import {
  getKoreanHoliday,
  getMonthKoreanHolidays,
  getNextUpcomingHoliday,
} from '../utils/koreanHolidays';
import CalendarEventModal, {
  CategoryInfoItem,
  getCategoryInfo,
} from './calendar/CalendarEventModal';
import styles from './calendar/CalendarStyles';
import { CalendarEvent, UserProfile, FamilyMember } from '../types/domain';

export type { CategoryInfoItem };
export { getCategoryInfo };

const FAMILY_MEMBERS: Record<string, { name: string; avatar: string; color: string }> = {
  mom: { name: '엄마', avatar: '👩‍🦰', color: '#FF6B47' },
  dad: { name: '아빠', avatar: '👨‍💼', color: '#4A90E2' },
  son: { name: '아들', avatar: '👦', color: '#2ECC71' },
  daughter: { name: '딸', avatar: '👧', color: '#F39C12' },
};

const getTodayString = (dateObj = new Date()) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export interface CalendarScreenProps {
  events: CalendarEvent[];
  currentUser?: any;
  currentUserProfile?: UserProfile | null;
  familyMembers: FamilyMember[];
  onAddEvent: (event: any) => void;
  onUpdateEvent?: (idOrEvent: any, maybeEvent?: any) => void;
  onDeleteEvent: (id: string) => void;
}

function CalendarScreenComponent({
  events = [],
  currentUser,
  currentUserProfile,
  familyMembers = [],
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
}: CalendarScreenProps) {
  // ⚡ O(1) 가족 구성원 해시 맵 인덱싱 (id, role, name 동시 매핑)
  const memberLookupMap = useMemo(() => {
    const map = new Map<string, FamilyMember>();
    if (familyMembers && Array.isArray(familyMembers)) {
      for (let i = 0; i < familyMembers.length; i++) {
        const m = familyMembers[i];
        if (!m || typeof m !== 'object') continue;
        if (m.id) map.set(String(m.id), m);
        if (m.role && !map.has(String(m.role))) map.set(String(m.role), m);
        if (m.name && !map.has(String(m.name))) map.set(String(m.name), m);
      }
    }
    return map;
  }, [familyMembers]);

  const getCreatorInfo = useCallback(
    (item: any) => {
      if (item?.creatorObj && typeof item.creatorObj === 'object') {
        return {
          name: item.creatorObj.name || item.creatorObj.role || '가족',
          avatar: item.creatorObj.avatar || '👦',
          color: item.creatorObj.color || '#4A90E2',
        };
      }
      if (item?.profile_id) {
        const matchById = memberLookupMap.get(String(item.profile_id));
        if (matchById) {
          return {
            name: matchById.name,
            avatar: matchById.avatar || '👦',
            color: matchById.color || '#4A90E2',
          };
        }
      }
      if (item?.creator) {
        const matchByCreator = memberLookupMap.get(String(item.creator));
        if (matchByCreator) {
          return {
            name: matchByCreator.name,
            avatar: matchByCreator.avatar || '👦',
            color: matchByCreator.color || '#4A90E2',
          };
        }
      }
      return (
        FAMILY_MEMBERS[item?.creator] || {
          name: item?.creator || '가족',
          avatar: '👦',
          color: '#8E8E93',
        }
      );
    },
    [memberLookupMap]
  );

  const isEventOwner = useCallback(
    (item: any) => {
      if (!item) return false;
      if (
        currentUserProfile?.id &&
        item.profile_id &&
        item.profile_id === currentUserProfile.id
      ) {
        return true;
      }
      if (
        currentUserProfile?.id &&
        item.creatorObj?.id &&
        item.creatorObj.id === currentUserProfile.id
      ) {
        return true;
      }
      const currentName = currentUserProfile?.name || currentUser;
      const currentRole = currentUserProfile?.role;
      if (
        item.creator &&
        (item.creator === currentName ||
          (currentRole && item.creator === currentRole))
      ) {
        return true;
      }
      return false;
    },
    [currentUserProfile?.id, currentUserProfile?.name, currentUserProfile?.role, currentUser]
  );

  const mainScrollRef = useRef<ScrollView>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const todayFormattedKorean = useMemo(() => {
    const now = new Date();
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    return `${now.getMonth() + 1}월 ${now.getDate()}일 ${days[now.getDay()]}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState(() => getTodayString());
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const daysInMonth = new Date(year, month, 0).getDate();
  const startDayOfWeek = new Date(year, month - 1, 1).getDay();

  const handlePrevMonth = useCallback(() => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const handleToday = useCallback(() => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(getTodayString(today));
    setTimeout(() => {
      mainScrollRef.current?.scrollTo({ y: 160, animated: true });
    }, 100);
  }, []);

  const handleSelectDate = useCallback(
    (dateStr: any) => {
      setSelectedDate(dateStr);
      if (dateStr && typeof dateStr === 'string' && dateStr.includes('-')) {
        const [tY, tM] = dateStr.split('-').map(Number);
        if (tY && tM && (tY !== year || tM !== month)) {
          setCurrentDate(new Date(tY, tM - 1, 1));
        }
      }
      setTimeout(() => {
        mainScrollRef.current?.scrollTo({ y: 180, animated: true });
      }, 100);
    },
    [year, month]
  );

  const handleOpenAddModal = useCallback(() => {
    setEditingEvent(null);
    setModalVisible(true);
  }, []);

  const handleOpenEditModal = useCallback(
    (eventItem: any) => {
      if (!isEventOwner(eventItem)) {
        Alert.alert('권한 없음 ⚠️', '일정을 등록한 본인만 수정할 수 있습니다.');
        return;
      }
      setEditingEvent(eventItem);
      setModalVisible(true);
    },
    [isEventOwner]
  );

  const handleDeleteClick = useCallback(
    (eventItem: any) => {
      if (!isEventOwner(eventItem)) {
        Alert.alert('권한 없음 ⚠️', '일정을 등록한 본인만 삭제할 수 있습니다.');
        return;
      }
      Alert.alert(
        '일정 삭제 🗑️',
        `'${eventItem.title}' 일정을 삭제하시겠습니까?`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: () => onDeleteEvent(String(eventItem.id)),
          },
        ]
      );
    },
    [isEventOwner, onDeleteEvent]
  );

  // 달력 그리드 셀 배열 메모이제이션
  const calendarCells = useMemo(() => {
    const cells: (string | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push(null);
    }
    const mm = String(month).padStart(2, '0');
    for (let d = 1; d <= daysInMonth; d++) {
      const dd = String(d).padStart(2, '0');
      cells.push(`${year}-${mm}-${dd}`);
    }
    return cells;
  }, [year, month, startDayOfWeek, daysInMonth]);

  // ⚡ 월간 날짜별 이벤트 O(1) 해시 맵 사전 인덱싱 (31개 셀 렌더링 시마다 전체 events.filter() 반복 호출 제거)
  const monthEventsByDateMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    const mm = String(month).padStart(2, '0');
    const monthStart = `${year}-${mm}-01`;
    const monthEnd = `${year}-${mm}-${String(daysInMonth).padStart(2, '0')}`;

    const evts = events || [];
    for (let i = 0; i < evts.length; i++) {
      const e = evts[i];
      if (!e || !e.date) continue;
      const start = e.date;
      const end = e.endDate || e.end_date || e.date;
      if (end < monthStart || start > monthEnd) continue;

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${mm}-${String(d).padStart(2, '0')}`;
        if (dateStr >= start && dateStr <= end) {
          const bucket = map.get(dateStr);
          if (bucket) {
            bucket.push(e);
          } else {
            map.set(dateStr, [e]);
          }
        }
      }
    }
    return map;
  }, [events, year, month, daysInMonth]);

  const selectedDateEvents = useMemo(() => {
    const fromMonthMap = monthEventsByDateMap.get(selectedDate);
    if (fromMonthMap) return fromMonthMap;
    return (events || []).filter((e) => {
      if (!e?.date) return false;
      const start = e.date;
      const end = e.endDate || e.end_date || e.date;
      return selectedDate >= start && selectedDate <= end;
    });
  }, [monthEventsByDateMap, selectedDate, events]);

  // 다가오는 D-Day 리스트 메모이제이션
  const dDayItems = useMemo(() => {
    const list: any[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (events && Array.isArray(events)) {
      for (let i = 0; i < events.length; i++) {
        const e = events[i];
        if (!e?.date) continue;
        const startDateStr = e.date;
        const endDateStr = e.endDate || e.end_date || e.date;
        const [eY, eM, eD] = startDateStr.split('-').map(Number);
        const eventStartDate = new Date(eY, eM - 1, eD);
        eventStartDate.setHours(0, 0, 0, 0);

        const [endY, endM, endD] = endDateStr.split('-').map(Number);
        const eventEndDate = new Date(endY, endM - 1, endD);
        eventEndDate.setHours(23, 59, 59, 999);

        const diffTime = eventStartDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const isOngoing = today >= eventStartDate && today <= eventEndDate;

        if (isOngoing || diffDays >= 0) {
          list.push({ ...e, diffDays, isOngoing });
        }
      }
    }

    const upcomingHoliday = getNextUpcomingHoliday(getTodayString());
    if (
      upcomingHoliday &&
      upcomingHoliday.diffDays >= 0 &&
      upcomingHoliday.diffDays <= 45
    ) {
      list.push({
        id: `holiday-${upcomingHoliday.date}`,
        title: `${upcomingHoliday.name} 🇰🇷`,
        category: 'anniversary',
        date: upcomingHoliday.date,
        endDate: upcomingHoliday.date,
        diffDays: upcomingHoliday.diffDays,
        isOngoing: upcomingHoliday.isToday,
        isHolidayChip: true,
      });
    }

    return list.sort((a, b) => {
      if (a.isOngoing && !b.isOngoing) return -1;
      if (!a.isOngoing && b.isOngoing) return 1;
      return a.diffDays - b.diffDays;
    });
  }, [events]);

  const monthHolidays = useMemo(
    () => getMonthKoreanHolidays(year, month),
    [year, month]
  );
  const selectedDateHoliday = useMemo(
    () => getKoreanHoliday(selectedDate),
    [selectedDate]
  );

  const monthEventsCount = useMemo(() => {
    const evts = events || [];
    let count = 0;
    for (let i = 0; i < evts.length; i++) {
      const e = evts[i];
      if (!e || !e.date) continue;
      const parts = e.date.split('-');
      if (
        parseInt(parts[0], 10) === year &&
        parseInt(parts[1], 10) === month
      ) {
        count += 1;
      }
    }
    return count;
  }, [events, year, month]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={mainScrollRef}
        style={styles.mainScrollView}
        contentContainerStyle={styles.mainScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. 상단 헤더 & 지오메트릭 액센트 */}
        <View style={styles.headerSection}>
          <View style={[styles.blobCircle, styles.blobCoral]} />
          <View style={[styles.blobCircle, styles.blobOrange]} />
          <View style={[styles.blobCircle, styles.blobMint]} />
          <View style={[styles.blobRect, styles.blobLavender]} />

          <View style={styles.headerTopRow}>
            <View style={styles.headerTitleCol}>
              <Text style={styles.headerDateBadge}>
                {todayFormattedKorean.toUpperCase()}
              </Text>
              <Text style={styles.headerMainTitle}>가족 캘린더 📅</Text>
            </View>

            <TouchableOpacity
              style={styles.addButton}
              onPress={handleOpenAddModal}
              activeOpacity={0.85}
            >
              <Plus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.addButtonText}>일정 추가</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. 이번 달 가족 일정 대시보드 하이라이트 카드 */}
        <View style={styles.cardSection}>
          <View style={[styles.dashboardCard, styles.monthSummaryTheme]}>
            <View style={styles.summaryHeaderRow}>
              <View style={styles.summaryLeftCol}>
                <Text style={styles.summarySubLabel}>이번 달 가족 일정</Text>
                <View style={styles.summaryCountRow}>
                  <Text style={styles.summaryBigNumber}>{monthEventsCount}</Text>
                  <Text style={styles.summaryUnitText}>개의 소중한 일정</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.summaryTodayBtn}
                onPress={handleToday}
                activeOpacity={0.8}
              >
                <Text style={styles.summaryTodayText}>오늘 보기 🗓️</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryFooterRow}>
              <Text style={styles.summaryFooterText}>
                {monthEventsCount > 0
                  ? `가족들과 함께할 ${monthEventsCount}개의 약속이 있어요! ${
                      monthHolidays.length > 0
                        ? `(공휴일 ${monthHolidays.length}일 🎈)`
                        : '✨'
                    }`
                  : monthHolidays.length > 0
                  ? `이번 달에는 ${monthHolidays
                      .map((h) => h.name)
                      .join(', ')} 등 ${monthHolidays.length}일의 공휴일이 있어요! 🎈`
                  : '이번 달 일정이 아직 없어요. 새로운 일정을 등록해보세요! 🌱'}
              </Text>
            </View>
          </View>
        </View>

        {/* 3. 다가오는 D-Day 캐러셀 */}
        {dDayItems.length > 0 && (
          <View style={styles.dDaySection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dDayScroll}
            >
              {dDayItems.map((item) => {
                const catInfo = getCategoryInfo(item.category);
                const CatIcon = catInfo.icon;
                const catColor = item.isHolidayChip ? '#EF4444' : catInfo.color;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.dDayChip}
                    onPress={() => handleSelectDate(item.date)}
                    activeOpacity={0.85}
                  >
                    <View
                      style={[
                        styles.dDayIconBox,
                        { backgroundColor: catColor + '18' },
                      ]}
                    >
                      {CatIcon ? (
                        <CatIcon size={14} color={catColor} />
                      ) : (
                        <PartyPopper size={14} color={catColor} />
                      )}
                    </View>
                    <Text style={styles.dDayTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View style={[styles.dDayBadge, { backgroundColor: catColor }]}>
                      <Text style={styles.dDayBadgeText}>
                        {item.isOngoing
                          ? '진행 중'
                          : item.diffDays === 0
                          ? 'D-Day'
                          : `D-${item.diffDays}`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 4. 월간 달력 카드 */}
        <View style={styles.cardSection}>
          <View style={[styles.dashboardCard, styles.calendarGridCard]}>
            {/* Calendar Month Navigation Bar */}
            <View style={styles.monthNavRow}>
              <TouchableOpacity
                onPress={handlePrevMonth}
                style={styles.navArrowBtn}
                activeOpacity={0.7}
              >
                <ChevronLeft size={20} color="#1C1917" />
              </TouchableOpacity>

              <Text style={styles.monthNavTitle}>
                {year}년 {month}월
              </Text>

              <TouchableOpacity
                onPress={handleNextMonth}
                style={styles.navArrowBtn}
                activeOpacity={0.7}
              >
                <ChevronRight size={20} color="#1C1917" />
              </TouchableOpacity>
            </View>

            {/* Weekdays Row */}
            <View style={styles.weekdaysRow}>
              {['일', '월', '화', '수', '목', '금', '토'].map((w, index) => (
                <Text
                  key={w}
                  style={[
                    styles.weekdayText,
                    index === 0 && styles.weekdaySunday,
                    index === 6 && styles.weekdaySaturday,
                  ]}
                >
                  {w}
                </Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.daysGrid}>
              {calendarCells.map((dateStr, index) => {
                if (!dateStr) {
                  return <View key={`empty-${index}`} style={styles.dayCell} />;
                }

                const dayNum = parseInt(dateStr.split('-')[2], 10);
                const isSelected = selectedDate === dateStr;
                const dayEvents = monthEventsByDateMap.get(dateStr) || [];
                const dayOfWeek = (startDayOfWeek + dayNum - 1) % 7;
                const isSunday = dayOfWeek === 0;
                const isSaturday = dayOfWeek === 6;
                const holidayInfo = getKoreanHoliday(dateStr);
                const isHoliday = Boolean(holidayInfo);

                return (
                  <TouchableOpacity
                    key={dateStr}
                    style={[styles.dayCell, isSelected && styles.selectedDayCell]}
                    onPress={() => handleSelectDate(dateStr)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        (isSunday || isHoliday) && styles.sundayText,
                        isSaturday && !isHoliday && styles.saturdayText,
                        isSelected && styles.selectedDayNumber,
                      ]}
                    >
                      {dayNum}
                    </Text>
                    {holidayInfo ? (
                      <Text
                        style={[
                          styles.holidayLabel,
                          isSelected && styles.selectedHolidayLabel,
                        ]}
                        numberOfLines={1}
                      >
                        {holidayInfo.name}
                      </Text>
                    ) : null}
                    <View style={styles.dotRow}>
                      {dayEvents.length <= 3 ? (
                        dayEvents.map((evt, i) => {
                          const catColor = getCategoryInfo(evt.category).color;
                          return (
                            <View
                              key={i}
                              style={[styles.eventDot, { backgroundColor: catColor }]}
                            />
                          );
                        })
                      ) : (
                        <>
                          {dayEvents.slice(0, 2).map((evt, i) => {
                            const catColor = getCategoryInfo(evt.category).color;
                            return (
                              <View
                                key={i}
                                style={[
                                  styles.eventDot,
                                  { backgroundColor: catColor },
                                ]}
                              />
                            );
                          })}
                          <View style={styles.moreDotBadge}>
                            <Text style={styles.moreDotBadgeText}>
                              +{dayEvents.length - 2}
                            </Text>
                          </View>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* 5. 선택한 날짜 일정 섹션 */}
        <View style={styles.cardSection}>
          <View style={styles.eventSectionHeader}>
            <View>
              <Text style={styles.eventSectionSub}>선택한 날짜</Text>
              <Text style={styles.eventSectionTitle}>{selectedDate} 일정</Text>
            </View>
            <View style={styles.eventCountBadge}>
              <Text style={styles.eventCountBadgeText}>
                {selectedDateEvents.length}개 일정
              </Text>
            </View>
          </View>

          {/* 법정 공휴일 / 대체공휴일 안내 카드 */}
          {selectedDateHoliday && (
            <View style={styles.holidayBannerCard}>
              <View style={styles.holidayFlagBadge}>
                <Text style={styles.holidayFlagText}>🇰🇷</Text>
              </View>
              <View style={styles.holidayBannerInfo}>
                <View style={styles.holidayTitleRow}>
                  <Text style={styles.holidayBannerTitle}>
                    {selectedDateHoliday.name}
                  </Text>
                  <View
                    style={[
                      styles.holidayPill,
                      selectedDateHoliday.isSubstitute &&
                        styles.holidaySubstitutePill,
                    ]}
                  >
                    <Text
                      style={[
                        styles.holidayPillText,
                        selectedDateHoliday.isSubstitute &&
                          styles.holidaySubstitutePillText,
                      ]}
                    >
                      {selectedDateHoliday.isSubstitute
                        ? '대체공휴일'
                        : '법정 공휴일'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.holidayBannerDesc}>
                  {selectedDateHoliday.isSubstitute
                    ? '공휴일이 주말 또는 다른 공휴일과 겹쳐 지정된 소중한 대체 휴일이에요! 🌿'
                    : '온 가족이 함께 푹 쉬며 여유를 즐기는 국가 공휴일이에요! 🎉'}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.eventList}>
            {selectedDateEvents.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>🕊️</Text>
                <Text style={styles.emptyText}>등록된 가족 일정이 없습니다.</Text>
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={handleOpenAddModal}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyAddBtnText}>+ 새 일정 등록하기</Text>
                </TouchableOpacity>
              </View>
            ) : (
              selectedDateEvents.map((item) => {
                const catInfo = getCategoryInfo(item.category);
                const creatorInfo = getCreatorInfo(item);
                const CatIcon = catInfo.icon;

                return (
                  <View key={item.id} style={styles.eventCard}>
                    <View
                      style={[
                        styles.categoryIndicator,
                        { backgroundColor: catInfo.color },
                      ]}
                    />
                    <View style={styles.eventContent}>
                      <Text style={styles.eventTitle}>{item.title}</Text>
                      <View style={styles.eventMetaRow}>
                        <Clock
                          size={12}
                          color="#A8A29E"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.eventMetaText}>
                          {item.date &&
                          (item.endDate || item.end_date) &&
                          item.date !== (item.endDate || item.end_date)
                            ? `${item.date} ~ ${item.endDate || item.end_date} (${
                                item.time
                              })`
                            : `${item.time}`}
                        </Text>

                        <View
                          style={[
                            styles.categoryBadge,
                            { backgroundColor: catInfo.color + '18' },
                          ]}
                        >
                          {CatIcon && (
                            <CatIcon
                              size={12}
                              color={catInfo.color}
                              style={{ marginRight: 4 }}
                            />
                          )}
                          <Text
                            style={[
                              styles.categoryBadgeText,
                              { color: catInfo.color },
                            ]}
                          >
                            {catInfo.label}
                          </Text>
                        </View>

                        <View style={styles.creatorTag}>
                          <UserAvatar
                            avatar={creatorInfo.avatar}
                            size={16}
                            style={{ marginRight: 4 }}
                          />
                          <Text
                            style={[
                              styles.creatorName,
                              { color: creatorInfo.color },
                            ]}
                          >
                            {creatorInfo.name}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {isEventOwner(item) && (
                      <View style={styles.cardBtnGroup}>
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => handleOpenEditModal(item)}
                          activeOpacity={0.7}
                        >
                          <Edit3 size={15} color="#FF6B47" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteClick(item)}
                          activeOpacity={0.7}
                        >
                          <Trash2 size={15} color="#A8A29E" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      {/* 일정 추가/수정 모달 (폼 입력 상태 내부 격리) */}
      <CalendarEventModal
        visible={modalVisible}
        editingEvent={editingEvent}
        selectedDate={selectedDate}
        currentUserProfile={currentUserProfile}
        currentUser={currentUser}
        onClose={() => setModalVisible(false)}
        onAddEvent={onAddEvent}
        onUpdateEvent={onUpdateEvent}
      />
    </View>
  );
}

const CalendarScreen = React.memo(CalendarScreenComponent);
export default CalendarScreen;
