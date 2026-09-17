import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ShoppingCart, Award, ChevronDown, ChevronUp, Trash2, Clock } from 'lucide-react-native';
import {
  IconPlus,
  IconTrash,
  IconClose,
  IconSquare,
  IconCheckCircle,
  IconRepeat,
} from './icons';
import { colors, typography, commonStyles } from '../theme';

export default function ShoppingListScreen({
  shoppingItems,
  currentUserProfile,
  familyMembers,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onClearCompleted,
  onToggleRepeat,
  embedded = false,
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [itemTitle, setItemTitle] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('가족 전체');
  const [repeatType, setRepeatType] = useState('none'); // 'none', 'daily', 'weekly'
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(true);
  const [showAllCompleted, setShowAllCompleted] = useState(false);

  const handleCreateItem = () => {
    if (!itemTitle.trim()) {
      Alert.alert('알림', '구매/할 일 항목을 입력해 주세요.');
      return;
    }

    onAddItem({
      title: itemTitle.trim(),
      assignee: selectedAssignee,
      repeat_type: repeatType,
    });

    setItemTitle('');
    setSelectedAssignee('가족 전체');
    setRepeatType('none');
    setModalVisible(false);
  };

  const handleDeleteConfirm = (item) => {
    const isRepeating = item.repeat_type && item.repeat_type !== 'none';
    Alert.alert(
      '항목 삭제',
      isRepeating
        ? `'${item.title}' (${item.repeat_type === 'daily' ? '매일' : '매주'} 반복) 항목을 삭제하시겠습니까?\n삭제 시 더 이상 반복되지 않습니다.`
        : `'${item.title}' 항목을 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => onDeleteItem(item.id),
        },
      ]
    );
  };

  const handleClearCompletedConfirm = () => {
    if (!completedItems || completedItems.length === 0) return;
    const recurringCount = completedItems.filter(i => i.repeat_type && i.repeat_type !== 'none').length;
    const oneTimeCount = completedItems.length - recurringCount;

    const message = recurringCount > 0
      ? `완료된 1회성 항목(${oneTimeCount}개)을 모두 삭제하시겠습니까?\n(매일/반복 할 일 ${recurringCount}개는 삭제되지 않고 내일 다시 등록됩니다)`
      : `완료된 ${completedItems.length}개의 항목을 모두 삭제하시겠습니까?`;

    Alert.alert(
      '완료 목록 비우기',
      message,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '모두 비우기',
          style: 'destructive',
          onPress: () => {
            if (onClearCompleted) {
              onClearCompleted();
            } else {
              completedItems.forEach(i => onDeleteItem(i.id));
            }
          },
        },
      ]
    );
  };

  const formatItemDateTime = (dateVal) => {
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);

      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();

      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const isYesterday = d.toDateString() === yesterday.toDateString();

      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;

      if (isToday) return `오늘 ${timeStr}`;
      if (isYesterday) return `어제 ${timeStr}`;
      return `${d.getMonth() + 1}/${d.getDate()} ${timeStr}`;
    } catch (e) {
      return String(dateVal);
    }
  };

  const getTodayString = (dateObj = new Date()) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayStr = getTodayString();

  const isDateToday = (dateVal) => {
    if (!dateVal) return false;
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal).startsWith(todayStr);
      const now = new Date();
      return d.getFullYear() === now.getFullYear() &&
             d.getMonth() === now.getMonth() &&
             d.getDate() === now.getDate();
    } catch {
      return false;
    }
  };

  const activeItems = shoppingItems ? shoppingItems.filter(i => !i.is_completed) : [];
  const completedItems = shoppingItems ? shoppingItems.filter(i => i.is_completed) : [];
  const rawEarnedCount = shoppingItems
    ? shoppingItems.filter(i =>
        i.is_completed &&
        (i.points_earned || i.completed_date === todayStr || isDateToday(i.completed_at)) &&
        (i.completed_date === todayStr || isDateToday(i.completed_at))
      ).length
    : 0;
  const todayEarnedCount = Math.min(3, rawEarnedCount);

  return (
    <View style={[styles.container, embedded && { backgroundColor: 'transparent' }]}>
      {/* Sub-header Bar */}
      {!embedded ? (
        <View style={styles.subHeaderBar}>
          <View>
            <Text style={styles.subHeaderTitle}>장보기</Text>
            <Text style={styles.subHeaderSub}>미완료 {activeItems.length}개 · 완료 {completedItems.length}개</Text>
          </View>

          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
            <IconPlus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.addBtnText}>품목 추가</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.embeddedHeaderBar}>
          <Text style={styles.embeddedHeaderCount}>
            미완료 {activeItems.length}개 · 완료 {completedItems.length}개
          </Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
            <IconPlus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.addBtnText}>품목 추가</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Daily Reward Progress Badge */}
        <View style={styles.dailyRewardCard}>
          <Award size={16} color="#FF7E82" style={{ marginRight: 6 }} />
          <Text style={styles.dailyRewardText}>
            오늘의 보상: {todayEarnedCount * 10} / 30 P ({todayEarnedCount}/3건 적립 완료)
          </Text>
        </View>

        {/* Active Items Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>구매 / 할 일 목록 ({activeItems.length})</Text>

          {activeItems.length === 0 ? (
            <Text style={styles.emptyText}>아직 등록된 장보기 항목이 없습니다.</Text>
          ) : (
            activeItems.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <TouchableOpacity
                  style={styles.checkboxTouch}
                  onPress={() => onToggleItem(item, true)}
                >
                  <IconSquare size={20} color="#8E8E93" />
                </TouchableOpacity>

                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitleText}>{item.title}</Text>
                  <View style={styles.tagRow}>
                    <Text style={styles.assigneeBadge}>담당: {item.assignee}</Text>
                    {item.repeat_type && item.repeat_type !== 'none' ? (
                      <TouchableOpacity
                        style={styles.repeatBadge}
                        onPress={() => onToggleRepeat && onToggleRepeat(item)}
                        activeOpacity={0.7}
                      >
                        <IconRepeat size={10} color="#FF7E82" style={{ marginRight: 3 }} />
                        <Text style={styles.repeatBadgeText}>
                          {item.repeat_type === 'daily' ? '매일 반복' : '매주 반복'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                    {(item.created_at || item.created_time) ? (
                      <View style={styles.metaTimeRow}>
                        <Clock size={11} color="#8E8E93" style={{ marginRight: 3 }} />
                        <Text style={styles.metaTimeText}>
                          {formatItemDateTime(item.created_at || item.created_time)} 등록
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteConfirm(item)}
                >
                  <IconTrash size={16} color="#AEAEB2" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Completed Items Section (Accordion + Recent 3 Limit + Clear All) */}
        {completedItems.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.completedHeaderRow}>
              <TouchableOpacity
                style={styles.completedHeaderToggle}
                onPress={() => setIsCompletedExpanded(prev => !prev)}
                activeOpacity={0.7}
              >
                <Text style={styles.sectionTitleDone}>
                  완료된 목록 ({completedItems.length})
                </Text>
                {isCompletedExpanded ? (
                  <ChevronUp size={16} color="#2ECC71" style={{ marginLeft: 4 }} />
                ) : (
                  <ChevronDown size={16} color="#8E8E93" style={{ marginLeft: 4 }} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.clearAllBtn}
                onPress={handleClearCompletedConfirm}
                activeOpacity={0.7}
              >
                <Trash2 size={12} color="#FF7E82" style={{ marginRight: 4 }} />
                <Text style={styles.clearAllBtnText}>모두 비우기</Text>
              </TouchableOpacity>
            </View>

            {isCompletedExpanded ? (
              <View>
                {(showAllCompleted ? completedItems : completedItems.slice(0, 3)).map((item) => (
                  <View key={item.id} style={styles.itemRowDone}>
                    <TouchableOpacity
                      style={styles.checkboxTouch}
                      onPress={() => onToggleItem(item, false)}
                    >
                      <IconCheckCircle size={20} color="#2ECC71" />
                    </TouchableOpacity>

                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitleTextDone}>{item.title}</Text>
                      <View style={styles.tagRow}>
                        <Text style={styles.completedByText}>
                          {item.completed_by ? `${item.completed_by}님이 완료함` : '완료됨'}
                          {item.points_earned ? ' (+10P)' : ''}
                        </Text>
                        {item.repeat_type && item.repeat_type !== 'none' ? (
                          <View style={styles.repeatBadgeDone}>
                            <IconRepeat size={10} color="#2ECC71" style={{ marginRight: 3 }} />
                            <Text style={styles.repeatBadgeTextDone}>
                              {item.repeat_type === 'daily' ? '매일 반복' : '매주 반복'}
                            </Text>
                          </View>
                        ) : null}
                        {(item.completed_at || item.completed_time || item.created_at) ? (
                          <View style={styles.metaTimeRow}>
                            <Clock size={11} color="#A0A0A5" style={{ marginRight: 3 }} />
                            <Text style={styles.metaTimeTextDone}>
                              {formatItemDateTime(item.completed_at || item.completed_time || item.created_at)} 완료
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteConfirm(item)}
                    >
                      <IconTrash size={16} color="#AEAEB2" />
                    </TouchableOpacity>
                  </View>
                ))}

                {completedItems.length > 3 && (
                  <TouchableOpacity
                    style={styles.showMoreBtn}
                    onPress={() => setShowAllCompleted(prev => !prev)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.showMoreBtnText}>
                      {showAllCompleted
                        ? '접기 ▲'
                        : `지난 완료 내역 ${completedItems.length - 3}개 더보기 ▼`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.collapsedSummaryTouch}
                onPress={() => setIsCompletedExpanded(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.collapsedSummaryText}>
                  총 {completedItems.length}개의 완료된 항목이 있습니다. (터치하여 펼치기)
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Add Item Modal */}
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
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeader}>새 장보기/할 일 추가</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <IconClose size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>항목 명칭</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="예: 우유 2팩, 라면, 음식물 쓰레기 버리기"
              placeholderTextColor="#AEAEB2"
              value={itemTitle}
              onChangeText={setItemTitle}
            />

            <Text style={styles.modalLabel}>담당 가족 지정</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.assigneeScroll}>
              {[
                { key: 'all', name: '가족 전체', avatar: '👨‍👩‍👧‍👦' },
                ...(familyMembers && Array.isArray(familyMembers) && familyMembers.length > 0
                  ? familyMembers.map((m, idx) => ({
                      key: m.id || `${m.name || m.role}_${idx}`,
                      name: m.name || m.role,
                      avatar: m.avatar || '👦',
                    }))
                  : [
                      { key: 'mom', name: '엄마', avatar: '👩‍🦰' },
                      { key: 'dad', name: '아빠', avatar: '👨‍💼' },
                      { key: 'son', name: '아들', avatar: '👦' },
                      { key: 'daughter', name: '딸', avatar: '👧' },
                    ])
              ].map((item) => {
                const isSelected = selectedAssignee === item.name;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.assigneeChip, isSelected && styles.assigneeChipActive]}
                    onPress={() => setSelectedAssignee(item.name)}
                  >
                    <Text style={styles.assigneeAvatar}>{item.avatar}</Text>
                    <Text style={[styles.assigneeChipText, isSelected && styles.assigneeChipTextActive]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.modalLabel}>반복 설정</Text>
            <View style={styles.repeatSelectorRow}>
              {[
                { key: 'none', label: '반복 없음' },
                { key: 'daily', label: '매일 반복' },
                { key: 'weekly', label: '매주 반복' },
              ].map((opt) => {
                const isSelected = repeatType === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.repeatOptionChip, isSelected && styles.repeatOptionChipActive]}
                    onPress={() => setRepeatType(opt.key)}
                    activeOpacity={0.7}
                  >
                    {opt.key !== 'none' && (
                      <IconRepeat
                        size={12}
                        color={isSelected ? '#FF7E82' : '#8E8E93'}
                        style={{ marginRight: 4 }}
                      />
                    )}
                    <Text style={[styles.repeatOptionText, isSelected && styles.repeatOptionTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {repeatType === 'daily' && (
              <View style={styles.repeatHintBox}>
                <Text style={styles.repeatHintText}>
                  💡 매일 자정이 지나면 오늘 할 일로 자동 갱신됩니다.
                </Text>
              </View>
            )}
            {repeatType === 'weekly' && (
              <View style={styles.repeatHintBox}>
                <Text style={styles.repeatHintText}>
                  💡 완료 후 7일이 지나면 자동으로 새 할 일로 갱신됩니다.
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleCreateItem}>
              <Text style={styles.modalConfirmBtnText}>등록하기 (+10P 미션)</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: commonStyles.screenContainer,
  scrollContent: commonStyles.scrollContent,
  subHeaderBar: commonStyles.subHeaderBar,
  subHeaderTitle: commonStyles.subHeaderTitle,
  subHeaderSub: commonStyles.subHeaderSub,
  addBtn: {
    flexDirection: 'row',
    backgroundColor: '#FF7E82',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  dailyRewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF2F3',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE5E7',
  },
  dailyRewardText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF7E82',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 14,
  },
  sectionTitleDone: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2ECC71',
    marginBottom: 14,
  },
  emptyText: {
    fontSize: 12,
    color: '#AEAEB2',
    textAlign: 'center',
    paddingVertical: 16,
    fontStyle: 'italic',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  itemRowDone: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    opacity: 0.7,
  },
  checkboxTouch: {
    paddingRight: 10,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  itemTitleTextDone: {
    fontSize: 14,
    color: '#8E8E93',
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  assigneeBadge: {
    fontSize: 11,
    color: '#FF7E82',
    backgroundColor: '#FFF2F3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
  completedByText: {
    fontSize: 11,
    color: '#2ECC71',
    fontWeight: '600',
  },
  completedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  completedHeaderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FFF2F3',
  },
  clearAllBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF7E82',
  },
  metaTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaTimeText: {
    fontSize: 11,
    color: '#8E8E93',
  },
  metaTimeTextDone: {
    fontSize: 11,
    color: '#A0A0A5',
  },
  showMoreBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EFEFF4',
  },
  showMoreBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#636366',
  },
  collapsedSummaryTouch: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  collapsedSummaryText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  modalOverlay: commonStyles.modalOverlay,
  modalView: commonStyles.modalBottomSheet,
  modalHeaderRow: commonStyles.modalHeaderRow,
  modalHeader: commonStyles.modalHeaderTitle,
  modalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8E8E93',
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#F1F2F4',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1C1C1E',
    marginBottom: 8,
  },
  assigneeScroll: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingVertical: 4,
  },
  assigneeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  assigneeAvatar: {
    fontSize: 13,
    marginRight: 4,
  },
  assigneeChipActive: {
    borderColor: '#FF7E82',
    backgroundColor: '#FFF2F3',
  },
  assigneeChipText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },
  assigneeChipTextActive: {
    color: '#FF7E82',
    fontWeight: '700',
  },
  modalConfirmBtn: {
    backgroundColor: '#FF7E82',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  modalConfirmBtnText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  embeddedHeaderBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  embeddedHeaderCount: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '600',
  },
  repeatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF2F3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#FFE0E3',
  },
  repeatBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF7E82',
  },
  repeatBadgeDone: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDFAF1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#D4F5DE',
  },
  repeatBadgeTextDone: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2ECC71',
  },
  repeatSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  repeatOptionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    backgroundColor: '#F8F9FA',
  },
  repeatOptionChipActive: {
    borderColor: '#FF7E82',
    backgroundColor: '#FFF2F3',
  },
  repeatOptionText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },
  repeatOptionTextActive: {
    color: '#FF7E82',
    fontWeight: '700',
  },
  repeatHintBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EFEFF4',
  },
  repeatHintText: {
    fontSize: 11,
    color: '#8E8E93',
  },
});
