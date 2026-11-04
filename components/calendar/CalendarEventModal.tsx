import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import {
  CategoryMealIcon,
  CategoryAnniversaryIcon,
  CategoryTripIcon,
  CategoryHouseworkIcon,
  CategoryOtherIcon,
  CategoryCustomIcon,
  IconClose,
} from '../icons';
import styles from './CalendarStyles';

export interface CategoryInfoItem {
  label: string;
  icon: any;
  color: string;
}

export const PRESET_CATEGORIES = ['dinner', 'anniversary', 'trip', 'housework', 'etc'];

export const CATEGORIES: Record<string, CategoryInfoItem> = {
  dinner: { label: '가족 식사', icon: CategoryMealIcon, color: '#E74C3C' },
  meal: { label: '가족 식사', icon: CategoryMealIcon, color: '#E74C3C' },
  anniversary: { label: '기념일/생일', icon: CategoryAnniversaryIcon, color: '#9B59B6' },
  trip: { label: '나들이/외출', icon: CategoryTripIcon, color: '#2ECC71' },
  travel: { label: '나들이/외출', icon: CategoryTripIcon, color: '#2ECC71' },
  housework: { label: '집안일', icon: CategoryHouseworkIcon, color: '#F39C12' },
  etc: { label: '기타', icon: CategoryOtherIcon, color: '#95A5A6' },
};

export const getCategoryInfo = (catKeyOrName?: string | null): CategoryInfoItem => {
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

const addDaysToDateStr = (dateStr: any, days: number) => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const ry = dt.getFullYear();
  const rm = String(dt.getMonth() + 1).padStart(2, '0');
  const rd = String(dt.getDate()).padStart(2, '0');
  return `${ry}-${rm}-${rd}`;
};

export interface CalendarEventModalProps {
  visible: boolean;
  editingEvent: any | null;
  selectedDate: string;
  currentUserProfile?: any;
  currentUser?: any;
  onClose: () => void;
  onAddEvent: (event: any) => void;
  onUpdateEvent?: (id: any, event: any) => void;
}

function CalendarEventModalComponent({
  visible,
  editingEvent,
  selectedDate,
  currentUserProfile,
  currentUser,
  onClose,
  onAddEvent,
  onUpdateEvent,
}: CalendarEventModalProps): React.ReactElement {
  // ⚡ 모달 폼 입력 상태를 내부로 캡슐화하여 타이핑 시 월간 달력 그리드 리렌더링 0회 유지
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('19:00');
  const [category, setCategory] = useState('anniversary');
  const [customCategory, setCustomCategory] = useState('');
  const [startDateInput, setStartDateInput] = useState(selectedDate);
  const [endDateInput, setEndDateInput] = useState(selectedDate);
  const [isRange, setIsRange] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (editingEvent) {
      setTitle(editingEvent.title || '');
      setTime(editingEvent.time || '19:00');
      if (CATEGORIES[editingEvent.category]) {
        setCategory(editingEvent.category);
        setCustomCategory('');
      } else {
        setCategory('custom');
        setCustomCategory(editingEvent.category || '');
      }
      const start = editingEvent.date || selectedDate;
      const end = editingEvent.endDate || editingEvent.end_date || start;
      setStartDateInput(start);
      setEndDateInput(end);
      setIsRange(start !== end);
    } else {
      setTitle('');
      setTime('19:00');
      setCategory('anniversary');
      setCustomCategory('');
      setStartDateInput(selectedDate);
      setEndDateInput(selectedDate);
      setIsRange(false);
    }
  }, [visible, editingEvent, selectedDate]);

  const handleSave = () => {
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

    if (editingEvent?.id) {
      if (onUpdateEvent) {
        onUpdateEvent(editingEvent.id, eventData);
      }
    } else {
      onAddEvent(eventData);
    }

    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalView}>
          {/* Modal Header */}
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalHeader}>
              {editingEvent ? '일정 수정' : '새 일정 추가'}
            </Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={onClose}
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
            {/* Date Type Selector */}
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
                  <Text
                    style={[
                      styles.rangeTabText,
                      !isRange && styles.rangeTabTextActive,
                    ]}
                  >
                    당일 일정
                  </Text>
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
                  <Text
                    style={[
                      styles.rangeTabText,
                      isRange && styles.rangeTabTextActive,
                    ]}
                  >
                    기간 범위 지정
                  </Text>
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
                    ].map((chip) => (
                      <TouchableOpacity
                        key={chip.label}
                        style={styles.quickChip}
                        onPress={() =>
                          setEndDateInput(addDaysToDateStr(startDateInput, chip.days))
                        }
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
                        isSelected && {
                          backgroundColor: cat.color,
                          borderColor: cat.color,
                        },
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
                      <Text
                        style={[
                          styles.categoryButtonText,
                          isSelected && { color: '#FFFFFF' },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[
                    styles.categoryButton,
                    category === 'custom' && {
                      backgroundColor: '#3498DB',
                      borderColor: '#3498DB',
                    },
                  ]}
                  onPress={() => setCategory('custom')}
                  activeOpacity={0.7}
                >
                  <CategoryCustomIcon
                    size={14}
                    color={category === 'custom' ? '#FFFFFF' : '#3498DB'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.categoryButtonText,
                      category === 'custom' && { color: '#FFFFFF' },
                    ]}
                  >
                    직접 입력
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Custom Category Direct Input */}
              {category === 'custom' && (
                <View style={styles.customCategoryInputWrap}>
                  <CategoryCustomIcon
                    size={16}
                    color="#3498DB"
                    style={{ marginRight: 8 }}
                  />
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
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleSave}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonText}>
                  {editingEvent ? '수정 완료' : '등록'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const CalendarEventModal = React.memo(CalendarEventModalComponent);
export default CalendarEventModal;
