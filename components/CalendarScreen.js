import React, { useState, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Plus,
  Calendar as CalendarIcon,
  Clock,
  User,
  Tag,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Gift,
  PartyPopper,
  Edit3,
} from 'lucide-react-native';
import {
  CategoryMealIcon,
  CategoryAnniversaryIcon,
  CategoryTripIcon,
  CategoryHouseworkIcon,
  CategoryOtherIcon,
  CategoryCustomIcon,
  IconClose,
} from './icons';
import { colors, typography, commonStyles } from '../theme';
import UserAvatar from './UserAvatar';
import { getKoreanHoliday, getMonthKoreanHolidays, getNextUpcomingHoliday } from '../utils/koreanHolidays';

const FAMILY_MEMBERS = {
  mom: { name: '엄마', avatar: '👩‍🦰', color: '#FF6B47' },
  dad: { name: '아빠', avatar: '👨‍💼', color: '#4A90E2' },
  son: { name: '아들', avatar: '👦', color: '#2ECC71' },
  daughter: { name: '딸', avatar: '👧', color: '#F39C12' },
};

const PRESET_CATEGORIES = ['dinner', 'anniversary', 'trip', 'housework', 'etc'];

const CATEGORIES = {
  dinner: { label: '가족 식사', icon: CategoryMealIcon, color: '#E74C3C' },
  meal: { label: '가족 식사', icon: CategoryMealIcon, color: '#E74C3C' },
  anniversary: { label: '기념일/생일', icon: CategoryAnniversaryIcon, color: '#9B59B6' },
  trip: { label: '나들이/외출', icon: CategoryTripIcon, color: '#2ECC71' },
  travel: { label: '나들이/외출', icon: CategoryTripIcon, color: '#2ECC71' },
  housework: { label: '집안일', icon: CategoryHouseworkIcon, color: '#F39C12' },
  etc: { label: '기타', icon: CategoryOtherIcon, color: '#95A5A6' },
};

const getCategoryInfo = (catKeyOrName) => {
  if (!catKeyOrName) return CATEGORIES.etc;
  if (CATEGORIES[catKeyOrName]) {
    return CATEGORIES[catKeyOrName];
  }
  return {
    label: catKeyOrName,
    icon: CategoryCustomIcon,
    color: '#3498DB',
  };
};

export default function CalendarScreen({
  events,
  currentUser,
  currentUserProfile,
  familyMembers,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
}) {
  const getCreatorInfo = (item) => {
    if (item?.creatorObj && typeof item.creatorObj === 'object') {
      return {
        name: item.creatorObj.name || item.creatorObj.role || '가족',
        avatar: item.creatorObj.avatar || '👦',
        color: item.creatorObj.color || '#4A90E2',
      };
    }
    if (familyMembers && Array.isArray(familyMembers)) {
      if (item?.profile_id || item?.creator) {
        const matchById = familyMembers.find(m => m && typeof m === 'object' && (m.id === item.profile_id || m.id === item.creator));
        if (matchById) {
          return { name: matchById.name, avatar: matchById.avatar || '👦', color: matchById.color || '#4A90E2' };
        }
      }
      const matchByName = familyMembers.find(m => m && typeof m === 'object' && m.name === item?.creator);
      if (matchByName) {
        return { name: matchByName.name, avatar: matchByName.avatar || '👦', color: matchByName.color || '#4A90E2' };
      }
    }
    return FAMILY_MEMBERS[item?.creator] || { name: item?.creator || '가족', avatar: '👦', color: '#8E8E93' };
  };

  const isEventOwner = (item) => {
    if (!item) return false;
    // 1. Check profile_id matching
    if (currentUserProfile?.id && item.profile_id && item.profile_id === currentUserProfile.id) {
      return true;
    }
    // 2. Check creatorObj matching
    if (currentUserProfile?.id && item.creatorObj?.id && item.creatorObj.id === currentUserProfile.id) {
      return true;
    }
    // 3. Fallback check (name, role, or currentUser string match)
    const currentName = currentUserProfile?.name || currentUser;
    const currentRole = currentUserProfile?.role;
    if (item.creator && (item.creator === currentName || (currentRole && item.creator === currentRole))) {
      return true;
    }
    return false;
  };

  const getTodayString = (dateObj = new Date()) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const mainScrollRef = useRef(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const todayFormattedKorean = useMemo(() => {
    const now = new Date();
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    return `${now.getMonth() + 1}월 ${now.getDate()}일 ${days[now.getDay()]}`;
  }, []);
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('19:00');
  const [category, setCategory] = useState('anniversary');
  const [customCategory, setCustomCategory] = useState('');

  // Range date states
  const [startDateInput, setStartDateInput] = useState(getTodayString());
  const [endDateInput, setEndDateInput] = useState(getTodayString());
  const [isRange, setIsRange] = useState(false);

  // Edit event state
  const [editingEventId, setEditingEventId] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const daysInMonth = new Date(year, month, 0).getDate();
  const startDayOfWeek = new Date(year, month - 1, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(getTodayString(today));
    setTimeout(() => {
      mainScrollRef.current?.scrollTo({ y: 160, animated: true });
    }, 100);
  };

  const handleSelectDate = (dateStr) => {
    setSelectedDate(dateStr);
    if (dateStr && dateStr.includes('-')) {
      const [tY, tM] = dateStr.split('-').map(Number);
      if (tY && tM && (tY !== year || tM !== month)) {
        setCurrentDate(new Date(tY, tM - 1, 1));
      }
    }
    setTimeout(() => {
      mainScrollRef.current?.scrollTo({ y: 180, animated: true });
    }, 100);
  };

  const handleOpenAddModal = () => {
    setEditingEventId(null);
    setTitle('');
    setTime('19:00');
    setCategory('anniversary');
    setCustomCategory('');
    setStartDateInput(selectedDate);
    setEndDateInput(selectedDate);
    setIsRange(false);
    setModalVisible(true);
  };

  const handleOpenEditModal = (eventItem) => {
    if (!isEventOwner(eventItem)) {
      Alert.alert('권한 없음 ⚠️', '일정을 등록한 본인만 수정할 수 있습니다.');
      return;
    }
    setEditingEventId(eventItem.id);
    setTitle(eventItem.title || '');
    setTime(eventItem.time || '19:00');
    if (CATEGORIES[eventItem.category]) {
      setCategory(eventItem.category);
      setCustomCategory('');
    } else {
      setCategory('custom');
      setCustomCategory(eventItem.category || '');
    }
    const start = eventItem.date || selectedDate;
    const end = eventItem.endDate || eventItem.end_date || start;
    setStartDateInput(start);
    setEndDateInput(end);
    setIsRange(start !== end);
    setModalVisible(true);
  };

  const addDaysToDateStr = (dateStr, days) => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    const ry = dt.getFullYear();
    const rm = String(dt.getMonth() + 1).padStart(2, '0');
    const rd = String(dt.getDate()).padStart(2, '0');
    return `${ry}-${rm}-${rd}`;
  };

  const handleSaveEvent = () => {
    if (!title.trim()) {
      Alert.alert('알림', '일정 제목을 입력해 주세요.');
      return;
    }

    if (category === 'custom' && !customCategory.trim()) {
      Alert.alert('알림', '직접 입력할 카테고리명을 입력해 주세요.');
      return;
    }

    const start = isRange ? startDateInput.trim() : selectedDate;
    const end = isRange ? endDateInput.trim() : selectedDate;

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start) || !dateRegex.test(end)) {
      Alert.alert('알림', '날짜 형식이 올바르지 않습니다. (예: 2026-08-03)');
      return;
    }

    if (start > end) {
      Alert.alert('알림', '종료일은 시작일보다 빠를 수 없습니다.');
      return;
    }

    const finalCategory = category === 'custom' ? customCategory.trim() : category;

    const eventData = {
      title: title.trim(),
      date: start,
      endDate: end,
      time: time.trim() || '시간 미정',
      category: finalCategory,
      profile_id: currentUserProfile?.id,
      creator: currentUserProfile?.name || currentUser,
    };

    if (editingEventId) {
      if (onUpdateEvent) {
        onUpdateEvent(editingEventId, eventData);
      }
    } else {
      onAddEvent(eventData);
    }

    setTitle('');
    setTime('19:00');
    setCustomCategory('');
    setIsRange(false);
    setEditingEventId(null);
    setModalVisible(false);
  };

  const handleDeleteClick = (eventItem) => {
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
          onPress: () => onDeleteEvent(eventItem.id),
        },
      ]
    );
  };

  // Generate calendar grid cells
  const calendarCells = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push(dateStr);
  }

  const getEventsForDate = (dateStr) => {
    return events ? events.filter((e) => {
      const start = e.date;
      const end = e.endDate || e.end_date || e.date;
      return dateStr >= start && dateStr <= end;
    }) : [];
  };

  const selectedDateEvents = getEventsForDate(selectedDate);

  // Compute upcoming D-Days (가족 일정 + 다음 다가오는 법정 공휴일 연동)
  const getDDayList = () => {
    const list = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (events && Array.isArray(events)) {
      events.forEach(e => {
        const startDateStr = e.date;
        const endDateStr = e.endDate || e.end_date || e.date;
        const [eY, eM, eD] = startDateStr.split('-').map(Number);
        const eventStartDate = new Date(eY, eM - 1, eD);
        eventStartDate.setHours(0, 0, 0, 0);

        const [endY, endM, endD] = endDateStr.split('-').map(Number);
        const eventEndDate = new Date(endY, endM - 1, endD);
        eventEndDate.setHours(23, 59, 59, 999);

        const diffTime = eventStartDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const isOngoing = today >= eventStartDate && today <= eventEndDate;

        if (isOngoing || diffDays >= 0) {
          list.push({ ...e, diffDays, isOngoing });
        }
      });
    }

    // 다음 다가오는 법정 공휴일 1건 자동 연동 (45일 이내)
    const upcomingHoliday = getNextUpcomingHoliday(getTodayString());
    if (upcomingHoliday && upcomingHoliday.diffDays >= 0 && upcomingHoliday.diffDays <= 45) {
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
  };

  const dDayItems = getDDayList();
  const monthHolidays = useMemo(() => getMonthKoreanHolidays(year, month), [year, month]);
  const selectedDateHoliday = useMemo(() => getKoreanHoliday(selectedDate), [selectedDate]);

  const monthEventsCount = (events || []).filter(e => {
    if (!e || !e.date) return false;
    const parts = e.date.split('-');
    return parseInt(parts[0], 10) === year && parseInt(parts[1], 10) === month;
  }).length;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={mainScrollRef}
        style={styles.mainScrollView}
        contentContainerStyle={styles.mainScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================= */}
        {/* 1. 상단 헤더 & 지오메트릭 액센트 (HomeScreen 스타일)       */}
        {/* ========================================================= */}
        <View style={styles.headerSection}>
          <View style={[styles.blobCircle, styles.blobCoral]} />
          <View style={[styles.blobCircle, styles.blobOrange]} />
          <View style={[styles.blobCircle, styles.blobMint]} />
          <View style={[styles.blobRect, styles.blobLavender]} />

          <View style={styles.headerTopRow}>
            <View style={styles.headerTitleCol}>
              <Text style={styles.headerDateBadge}>{todayFormattedKorean.toUpperCase()}</Text>
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

        {/* ========================================================= */}
        {/* 2. 이번 달 가족 일정 대시보드 하이라이트 카드 (핵심 강조)  */}
        {/* ========================================================= */}
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
                  ? `가족들과 함께할 ${monthEventsCount}개의 약속이 있어요! ${monthHolidays.length > 0 ? `(공휴일 ${monthHolidays.length}일 🎈)` : '✨'}`
                  : monthHolidays.length > 0
                    ? `이번 달에는 ${monthHolidays.map(h => h.name).join(', ')} 등 ${monthHolidays.length}일의 공휴일이 있어요! 🎈`
                    : '이번 달 일정이 아직 없어요. 새로운 일정을 등록해보세요! 🌱'}
              </Text>
            </View>
          </View>
        </View>

        {/* ========================================================= */}
        {/* 3. 다가오는 D-Day 캐러셀                                   */}
        {/* ========================================================= */}
        {dDayItems.length > 0 && (
          <View style={styles.dDaySection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dDayScroll}>
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
                    <View style={[styles.dDayIconBox, { backgroundColor: catColor + '18' }]}>
                      {CatIcon ? (
                        <CatIcon size={14} color={catColor} />
                      ) : (
                        <PartyPopper size={14} color={catColor} />
                      )}
                    </View>
                    <Text style={styles.dDayTitle} numberOfLines={1}>{item.title}</Text>
                    <View style={[styles.dDayBadge, { backgroundColor: catColor }]}>
                      <Text style={styles.dDayBadgeText}>
                        {item.isOngoing ? '진행 중' : (item.diffDays === 0 ? 'D-Day' : `D-${item.diffDays}`)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ========================================================= */}
        {/* 4. 월간 달력 카드 (HomeScreen 카드 스타일)                  */}
        {/* ========================================================= */}
        <View style={styles.cardSection}>
          <View style={[styles.dashboardCard, styles.calendarGridCard]}>
            {/* Calendar Month Navigation Bar */}
            <View style={styles.monthNavRow}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.navArrowBtn} activeOpacity={0.7}>
                <ChevronLeft size={20} color="#1C1917" />
              </TouchableOpacity>
              
              <Text style={styles.monthNavTitle}>{year}년 {month}월</Text>
              
              <TouchableOpacity onPress={handleNextMonth} style={styles.navArrowBtn} activeOpacity={0.7}>
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
                const dayEvents = getEventsForDate(dateStr);
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
                          return <View key={i} style={[styles.eventDot, { backgroundColor: catColor }]} />;
                        })
                      ) : (
                        <>
                          {dayEvents.slice(0, 2).map((evt, i) => {
                            const catColor = getCategoryInfo(evt.category).color;
                            return <View key={i} style={[styles.eventDot, { backgroundColor: catColor }]} />;
                          })}
                          <View style={styles.moreDotBadge}>
                            <Text style={styles.moreDotBadgeText}>+{dayEvents.length - 2}</Text>
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

        {/* ========================================================= */}
        {/* 5. 선택한 날짜 일정 섹션                                    */}
        {/* ========================================================= */}
        <View style={styles.cardSection}>
          <View style={styles.eventSectionHeader}>
            <View>
              <Text style={styles.eventSectionSub}>선택한 날짜</Text>
              <Text style={styles.eventSectionTitle}>{selectedDate} 일정</Text>
            </View>
            <View style={styles.eventCountBadge}>
              <Text style={styles.eventCountBadgeText}>{selectedDateEvents.length}개 일정</Text>
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
                  <Text style={styles.holidayBannerTitle}>{selectedDateHoliday.name}</Text>
                  <View style={[styles.holidayPill, selectedDateHoliday.isSubstitute && styles.holidaySubstitutePill]}>
                    <Text style={[styles.holidayPillText, selectedDateHoliday.isSubstitute && styles.holidaySubstitutePillText]}>
                      {selectedDateHoliday.isSubstitute ? '대체공휴일' : '법정 공휴일'}
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
                    <View style={[styles.categoryIndicator, { backgroundColor: catInfo.color }]} />
                    <View style={styles.eventContent}>
                      <Text style={styles.eventTitle}>{item.title}</Text>
                      <View style={styles.eventMetaRow}>
                        <Clock size={12} color="#A8A29E" style={{ marginRight: 4 }} />
                        <Text style={styles.eventMetaText}>
                          {item.date && (item.endDate || item.end_date) && item.date !== (item.endDate || item.end_date)
                            ? `${item.date} ~ ${item.endDate || item.end_date} (${item.time})`
                            : `${item.time}`}
                        </Text>

                        <View style={[styles.categoryBadge, { backgroundColor: catInfo.color + '18' }]}>
                          {CatIcon && (
                            <CatIcon size={12} color={catInfo.color} style={{ marginRight: 4 }} />
                          )}
                          <Text style={[styles.categoryBadgeText, { color: catInfo.color }]}>
                            {catInfo.label}
                          </Text>
                        </View>

                        <View style={styles.creatorTag}>
                          <UserAvatar avatar={creatorInfo.avatar} size={16} style={{ marginRight: 4 }} />
                          <Text style={[styles.creatorName, { color: creatorInfo.color }]}>
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

      {/* Add Event Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalView}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeader}>{editingEventId ? '일정 수정' : '새 일정 추가'}</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <IconClose size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Date Type Selector (당일 vs 기간) */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>일정 기간 설정</Text>
                <View style={styles.rangeToggleRow}>
                  <TouchableOpacity
                    style={[styles.rangeTab, !isRange && styles.rangeTabActive]}
                    onPress={() => {
                      setIsRange(false);
                      setStartDateInput(selectedDate);
                      setEndDateInput(selectedDate);
                    }}
                  >
                    <Text style={[styles.rangeTabText, !isRange && styles.rangeTabTextActive]}>당일 일정</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rangeTab, isRange && styles.rangeTabActive]}
                    onPress={() => {
                      setIsRange(true);
                      if (endDateInput === startDateInput) {
                        setEndDateInput(addDaysToDateStr(startDateInput, 1));
                      }
                    }}
                  >
                    <Text style={[styles.rangeTabText, isRange && styles.rangeTabTextActive]}>기간 범위 지정</Text>
                  </TouchableOpacity>
                </View>

                {!isRange ? (
                  <View style={styles.singleDateBox}>
                    <Text style={styles.singleDateText}>선택한 날짜: {selectedDate}</Text>
                  </View>
                ) : (
                  <View style={styles.rangeInputContainer}>
                    <View style={styles.dateInputRow}>
                      <View style={styles.dateInputHalf}>
                        <Text style={styles.subLabel}>시작일</Text>
                        <TextInput
                          style={styles.textInput}
                          value={startDateInput}
                          onChangeText={setStartDateInput}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor="#AEAEB2"
                        />
                      </View>
                      <Text style={styles.dateSeparator}>~</Text>
                      <View style={styles.dateInputHalf}>
                        <Text style={styles.subLabel}>종료일</Text>
                        <TextInput
                          style={styles.textInput}
                          value={endDateInput}
                          onChangeText={setEndDateInput}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor="#AEAEB2"
                        />
                      </View>
                    </View>

                    {/* Quick Duration Chips */}
                    <View style={styles.quickDurationRow}>
                      <Text style={styles.quickLabel}>빠른 기간:</Text>
                      {[
                        { label: '+1일', days: 1 },
                        { label: '+2일', days: 2 },
                        { label: '+3일', days: 3 },
                        { label: '+7일', days: 7 },
                      ].map(chip => (
                        <TouchableOpacity
                          key={chip.label}
                          style={styles.quickChip}
                          onPress={() => setEndDateInput(addDaysToDateStr(startDateInput, chip.days))}
                        >
                          <Text style={styles.quickChipText}>{chip.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* 일정 내용 */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>일정 내용</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="일정 제목을 입력하세요 (예: 가족 식사, 기념일)"
                  placeholderTextColor="#AEAEB2"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              {/* 시간 */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>시간</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="예: 19:00 또는 오후 7시"
                  placeholderTextColor="#AEAEB2"
                  value={time}
                  onChangeText={setTime}
                />
              </View>

              {/* 카테고리 */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>카테고리</Text>
                <View style={styles.categoryContainer}>
                  {PRESET_CATEGORIES.map((catKey) => {
                    const isSelected = category === catKey;
                    const cat = CATEGORIES[catKey];
                    const CatIcon = cat.icon;
                    return (
                      <TouchableOpacity
                        key={catKey}
                        style={[
                          styles.categoryButton,
                          isSelected && { backgroundColor: cat.color, borderColor: cat.color }
                        ]}
                        onPress={() => setCategory(catKey)}
                        activeOpacity={0.7}
                      >
                        {CatIcon && (
                          <CatIcon
                            size={14}
                            color={isSelected ? '#FFFFFF' : cat.color}
                            style={{ marginRight: 6 }}
                          />
                        )}
                        <Text style={[styles.categoryButtonText, isSelected && { color: '#FFFFFF' }]}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      category === 'custom' && { backgroundColor: '#3498DB', borderColor: '#3498DB' }
                    ]}
                    onPress={() => setCategory('custom')}
                    activeOpacity={0.7}
                  >
                    <CategoryCustomIcon
                      size={14}
                      color={category === 'custom' ? '#FFFFFF' : '#3498DB'}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.categoryButtonText, category === 'custom' && { color: '#FFFFFF' }]}>
                      직접 입력
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Custom Category Direct Input */}
                {category === 'custom' && (
                  <View style={styles.customCategoryInputWrap}>
                    <CategoryCustomIcon size={16} color="#3498DB" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.customCategoryInput}
                      placeholder="카테고리명 직접 입력 (예: 병원, 학원, 운동, 캠핑)"
                      placeholderTextColor="#AEAEB2"
                      value={customCategory}
                      onChangeText={setCustomCategory}
                      maxLength={15}
                    />
                  </View>
                )}
              </View>

              {/* Modal Buttons */}
              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleSaveEvent}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmButtonText}>{editingEventId ? '수정 완료' : '등록'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F3', // Figma 홈 화면과 100% 동일한 웜 린넨 테마 배경
  },
  mainScrollView: {
    flex: 1,
  },
  mainScrollContent: {
    paddingBottom: 48,
  },

  // 1. 헤더 섹션 & 지오메트릭 액센트 (HomeScreen 스타일)
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
    alignItems: 'center',
    zIndex: 2,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerDateBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A8A29E',
    letterSpacing: 0.8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  headerMainTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1C1917',
    letterSpacing: -0.4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B47',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    shadowColor: '#FF6B47',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },

  // 2. 공통 카드 섹션 & 대시보드 하이라이트 카드 (이번 달 가족 일정)
  cardSection: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
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
  monthSummaryTheme: {
    backgroundColor: '#FEFBF2',
    borderColor: '#F6E8B8',
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryLeftCol: {
    flex: 1,
  },
  summarySubLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#854D0E',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  summaryCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  summaryBigNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FF6B47',
    letterSpacing: -0.5,
  },
  summaryUnitText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1C1917',
    marginLeft: 6,
  },
  summaryTodayBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F6E8B8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  summaryTodayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#854D0E',
  },
  summaryDivider: {
    height: 1,
    width: '100%',
    backgroundColor: '#F8E8BE',
    marginVertical: 14,
  },
  summaryFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryFooterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78716C',
  },

  // 3. D-Day 캐러셀
  dDaySection: {
    marginTop: 14,
  },
  dDayScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  dDayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  dDayIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  dDayTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1917',
    marginRight: 8,
    maxWidth: 120,
  },
  dDayBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dDayBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  // 4. 월간 달력 카드
  calendarGridCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E0D0',
    paddingTop: 16,
    paddingBottom: 16,
  },
  monthNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  navArrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FAF8F3',
    borderWidth: 1,
    borderColor: '#E8E0D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1C1917',
  },
  weekdaysRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0E8',
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#78716C',
  },
  weekdaySunday: {
    color: '#EF4444',
  },
  weekdaySaturday: {
    color: '#3B82F6',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
    paddingBottom: 4,
    borderRadius: 14,
  },
  selectedDayCell: {
    backgroundColor: '#FF6B47',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1917',
    lineHeight: 18,
  },
  sundayText: {
    color: '#EF4444',
  },
  saturdayText: {
    color: '#3B82F6',
  },
  selectedDayNumber: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  holidayLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#EF4444',
    textAlign: 'center',
    lineHeight: 11,
    letterSpacing: -0.4,
    marginTop: 0,
  },
  selectedHolidayLabel: {
    color: '#FFFFFF',
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginHorizontal: 1,
  },
  moreDotBadge: {
    backgroundColor: '#F5F0E8',
    paddingHorizontal: 2.5,
    paddingVertical: 0.5,
    borderRadius: 4,
    marginLeft: 1.5,
  },
  moreDotBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#78716C',
  },

  // 5. 선택한 날짜 일정 섹션
  eventSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  eventSectionSub: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A8A29E',
    marginBottom: 2,
  },
  eventSectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C1917',
  },
  eventCountBadge: {
    backgroundColor: 'rgba(255, 107, 71, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  eventCountBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF6B47',
  },
  holidayBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F2',
    borderWidth: 1,
    borderColor: '#FFE8E0',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  holidayFlagBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FFE8E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  holidayFlagText: {
    fontSize: 20,
  },
  holidayBannerInfo: {
    flex: 1,
  },
  holidayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  holidayBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1917',
  },
  holidayPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  holidayPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
  },
  holidaySubstitutePill: {
    backgroundColor: '#FEF3C7',
  },
  holidaySubstitutePillText: {
    color: '#D97706',
  },
  holidayBannerDesc: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716C',
    lineHeight: 16,
  },
  eventList: {
    gap: 10,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#A8A29E',
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyAddBtn: {
    backgroundColor: '#FAF8F3',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E0D0',
  },
  emptyAddBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B47',
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryIndicator: {
    width: 4,
    height: 38,
    borderRadius: 2,
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1917',
    marginBottom: 4,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  eventMetaText: {
    fontSize: 12,
    color: '#78716C',
    fontWeight: '500',
  },
  creatorTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorName: {
    fontSize: 11,
    fontWeight: '700',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF8F3',
    borderWidth: 1,
    borderColor: '#E8E0D0',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF8F3',
    borderWidth: 1,
    borderColor: '#E8E0D0',
  },

  // 6. 모달 스타일
  modalOverlay: commonStyles.modalOverlay,
  modalView: commonStyles.modalBottomSheet,
  modalHeaderRow: commonStyles.modalHeaderRow,
  modalHeader: commonStyles.modalHeaderTitle,
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F0E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollContent: {
    paddingBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1917',
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78716C',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#FAF8F3',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E0D0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1C1917',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E0D0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#FAF8F3',
  },
  categoryButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1917',
  },
  customCategoryInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F3',
    borderWidth: 1,
    borderColor: '#FF6B47',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  customCategoryInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 13,
    color: '#1C1917',
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
  },
  rangeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F5F0E8',
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  rangeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  rangeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  rangeTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A8A29E',
  },
  rangeTabTextActive: {
    color: '#1C1917',
    fontWeight: '800',
  },
  singleDateBox: {
    backgroundColor: '#FAF8F3',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8E0D0',
  },
  singleDateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1917',
  },
  rangeInputContainer: {
    marginBottom: 14,
  },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateInputHalf: {
    flex: 1,
  },
  dateSeparator: {
    fontSize: 16,
    fontWeight: '700',
    color: '#A8A29E',
    marginHorizontal: 8,
    marginTop: 16,
  },
  quickDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  quickLabel: {
    fontSize: 12,
    color: '#78716C',
    marginRight: 6,
    fontWeight: '700',
  },
  quickChip: {
    backgroundColor: '#FAF8F3',
    borderWidth: 1,
    borderColor: '#E8E0D0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  quickChipText: {
    fontSize: 12,
    color: '#FF6B47',
    fontWeight: '700',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FAF8F3',
    borderWidth: 1,
    borderColor: '#E8E0D0',
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#78716C',
    fontWeight: '700',
  },
  confirmButton: {
    flex: 2,
    backgroundColor: '#FF6B47',
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#FF6B47',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
