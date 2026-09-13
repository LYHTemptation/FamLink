import React, { useState } from 'react';
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
} from './icons';

const FAMILY_MEMBERS = {
  mom: { name: '엄마', avatar: '👩‍🦰', color: '#FF7E82' },
  dad: { name: '아빠', avatar: '👨‍💼', color: '#4A90E2' },
  son: { name: '아들', avatar: '👦', color: '#2ECC71' },
  daughter: { name: '딸', avatar: '👧', color: '#F39C12' },
};

const CATEGORIES = {
  dinner: { label: '가족 식사', icon: CategoryMealIcon, color: '#E74C3C' },
  anniversary: { label: '기념일/생일', icon: CategoryAnniversaryIcon, color: '#9B59B6' },
  trip: { label: '나들이/외출', icon: CategoryTripIcon, color: '#2ECC71' },
  housework: { label: '집안일', icon: CategoryHouseworkIcon, color: '#F39C12' },
  etc: { label: '기타', icon: CategoryOtherIcon, color: '#95A5A6' },
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

  const getTodayString = (dateObj = new Date()) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('19:00');
  const [category, setCategory] = useState('anniversary');

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
  };

  const handleOpenAddModal = () => {
    setEditingEventId(null);
    setTitle('');
    setTime('19:00');
    setCategory('anniversary');
    setStartDateInput(selectedDate);
    setEndDateInput(selectedDate);
    setIsRange(false);
    setModalVisible(true);
  };

  const handleOpenEditModal = (eventItem) => {
    setEditingEventId(eventItem.id);
    setTitle(eventItem.title || '');
    setTime(eventItem.time || '19:00');
    setCategory(eventItem.category || 'etc');
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

    const eventData = {
      title: title.trim(),
      date: start,
      endDate: end,
      time,
      category,
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
    setIsRange(false);
    setEditingEventId(null);
    setModalVisible(false);
  };

  const handleDeleteClick = (eventItem) => {
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

  // Compute upcoming D-Days
  const getDDayList = () => {
    if (!events || !Array.isArray(events)) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return events
      .map(e => {
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

        return { ...e, diffDays, isOngoing };
      })
      .filter(e => e.isOngoing || e.diffDays >= 0)
      .sort((a, b) => {
        if (a.isOngoing && !b.isOngoing) return -1;
        if (!a.isOngoing && b.isOngoing) return 1;
        return a.diffDays - b.diffDays;
      })
      .slice(0, 3);
  };

  const dDayItems = getDDayList();
  const monthEventsCount = (events || []).filter(e => {
    if (!e || !e.date) return false;
    const parts = e.date.split('-');
    return parseInt(parts[0], 10) === year && parseInt(parts[1], 10) === month;
  }).length;

  return (
    <View style={styles.container}>
      {/* Sub-header Bar */}
      <View style={styles.calendarHeader}>
        <View>
          <Text style={styles.subHeaderTitle}>캘린더</Text>
          <Text style={styles.subHeaderSub}>이번 달 가족 일정 {monthEventsCount}개</Text>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={handleOpenAddModal} activeOpacity={0.8}>
          <Plus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.addButtonText}>일정 추가</Text>
        </TouchableOpacity>
      </View>

      {/* D-Day Banner Carousel */}
      {dDayItems.length > 0 && (
        <View style={styles.dDayContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dDayScroll}>
            {dDayItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.dDayChip}
                onPress={() => setSelectedDate(item.date)}
              >
                <PartyPopper size={16} color="#9B59B6" style={{ marginRight: 6 }} />
                <Text style={styles.dDayTitle}>{item.title}</Text>
                <View style={styles.dDayBadge}>
                  <Text style={styles.dDayBadgeText}>
                    {item.isOngoing ? '진행 중' : (item.diffDays === 0 ? 'D-Day' : `D-${item.diffDays}`)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Calendar Month Navigation Bar */}
      <View style={styles.monthNavRow}>
        <View style={styles.monthNavControls}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.navArrowBtn} activeOpacity={0.7}>
            <ChevronLeft size={20} color="#1C1C1E" />
          </TouchableOpacity>
          <Text style={styles.monthNavTitle}>{year}년 {month}월</Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.navArrowBtn} activeOpacity={0.7}>
            <ChevronRight size={20} color="#1C1C1E" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.todayBtn} onPress={handleToday} activeOpacity={0.7}>
          <Text style={styles.todayBtnText}>오늘</Text>
        </TouchableOpacity>
      </View>

      {/* Weekdays Row */}
      <View style={styles.weekdaysRow}>
        {['일', '월', '화', '수', '목', '금', '토'].map((w, index) => (
          <Text key={w} style={[styles.weekdayText, index === 0 && { color: '#E74C3C' }, index === 6 && { color: '#4A90E2' }]}>
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

          return (
            <TouchableOpacity
              key={dateStr}
              style={[styles.dayCell, isSelected && styles.selectedDayCell]}
              onPress={() => setSelectedDate(dateStr)}
            >
              <Text style={[styles.dayNumber, isSelected && styles.selectedDayNumber]}>
                {dayNum}
              </Text>
              <View style={styles.dotRow}>
                {dayEvents.map((evt, i) => {
                  const catColor = CATEGORIES[evt.category]?.color || '#FF7E82';
                  return <View key={i} style={[styles.eventDot, { backgroundColor: catColor }]} />;
                })}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected Date Events List */}
      <View style={styles.eventSection}>
        <View style={styles.eventSectionHeader}>
          <Text style={styles.eventSectionTitle}>{selectedDate} 일정</Text>
          <Text style={styles.eventCount}>{selectedDateEvents.length}개 건</Text>
        </View>

        <ScrollView style={styles.eventList}>
          {selectedDateEvents.length === 0 ? (
            <Text style={styles.emptyText}>등록된 가족 일정이 없습니다.</Text>
          ) : (
            selectedDateEvents.map((item) => {
              const catInfo = CATEGORIES[item.category] || CATEGORIES.etc;
              const creatorInfo = getCreatorInfo(item);
              const CatIcon = catInfo.icon;

              return (
                <View key={item.id} style={styles.eventCard}>
                  <View style={[styles.categoryIndicator, { backgroundColor: catInfo.color }]} />
                  <View style={styles.eventContent}>
                    <Text style={styles.eventTitle}>{item.title}</Text>
                    <View style={styles.eventMetaRow}>
                      <Clock size={12} color="#8E8E93" style={{ marginRight: 4 }} />
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
                        <Text style={styles.creatorAvatar}>{creatorInfo.avatar}</Text>
                        <Text style={[styles.creatorName, { color: creatorInfo.color }]}>
                          {creatorInfo.name}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardBtnGroup}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleOpenEditModal(item)}
                    >
                      <Edit3 size={16} color="#4A90E2" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteClick(item)}
                    >
                      <Trash2 size={16} color="#FF7E82" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

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
            <Text style={styles.modalHeader}>{editingEventId ? '일정 수정' : '새 일정 추가'}</Text>

            {/* Date Type Selector (당일 vs 기간) */}
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
                <Text style={styles.singleDateText}>📅 선택한 날짜: {selectedDate}</Text>
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

            <Text style={styles.label}>일정 내용</Text>
            <TextInput
              style={styles.textInput}
              placeholder="일정 제목을 입력하세요 (예: 가족 식사, 기념일)"
              placeholderTextColor="#AEAEB2"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>시간</Text>
            <TextInput
              style={styles.textInput}
              placeholder="예: 19:00 또는 오후 7시"
              placeholderTextColor="#AEAEB2"
              value={time}
              onChangeText={setTime}
            />

            <Text style={styles.label}>카테고리</Text>
            <View style={styles.categoryContainer}>
              {Object.keys(CATEGORIES).map((catKey) => {
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
                  >
                    {CatIcon && (
                      <CatIcon
                        size={15}
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
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleSaveEvent}>
                <Text style={styles.confirmButtonText}>{editingEventId ? '수정 완료' : '등록'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  dDayContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  dDayScroll: {
    paddingHorizontal: 16,
  },
  dDayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5EEF8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E8DAEF',
  },
  dDayTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1C1E',
    marginRight: 8,
  },
  dDayBadge: {
    backgroundColor: '#9B59B6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dDayBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    backgroundColor: '#FFFFFF',
  },
  subHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  subHeaderSub: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  monthNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  monthNavControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navArrowBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  monthNavTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1C1C1E',
    marginHorizontal: 12,
  },
  todayBtn: {
    backgroundColor: '#FFF2F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFA2A5',
  },
  todayBtnText: {
    fontSize: 12,
    color: '#FF7E82',
    fontWeight: '700',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF7E82',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  weekdaysRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    paddingBottom: 10,
  },
  dayCell: {
    width: '14.28%',
    height: 52,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 6,
  },
  selectedDayCell: {
    backgroundColor: '#FFF2F3',
    borderRadius: 10,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  selectedDayNumber: {
    color: '#FF7E82',
    fontWeight: '800',
  },
  dotRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginHorizontal: 1,
  },
  eventSection: {
    flex: 1,
    padding: 16,
  },
  eventSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  eventCount: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },
  eventList: {
    flex: 1,
  },
  emptyText: {
    fontSize: 13,
    color: '#AEAEB2',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  categoryIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventMetaText: {
    fontSize: 11,
    color: '#8E8E93',
    marginRight: 10,
  },
  creatorTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorAvatar: {
    fontSize: 12,
    marginRight: 2,
  },
  creatorName: {
    fontSize: 11,
    fontWeight: '600',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  cardBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    marginRight: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalView: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 20,
    color: '#8E8E93',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F1F2F4',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1C1C1E',
    marginBottom: 16,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EBEBEB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  categoryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  rangeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F2F4',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  rangeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  rangeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  rangeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  rangeTabTextActive: {
    color: '#1C1C1E',
    fontWeight: '700',
  },
  singleDateBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  singleDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
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
  subLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8E8E93',
    marginBottom: 4,
  },
  dateSeparator: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8E8E93',
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
    color: '#8E8E93',
    marginRight: 6,
  },
  quickChip: {
    backgroundColor: '#F1F2F4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  quickChipText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F1F2F4',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '700',
  },
  confirmButton: {
    flex: 2,
    backgroundColor: '#FF7E82',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  confirmButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
