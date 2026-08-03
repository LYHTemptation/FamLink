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
import { ShoppingCart, CheckSquare, Square, Plus, Trash2, X, Award, CheckCircle2 } from 'lucide-react-native';

export default function ShoppingListScreen({
  shoppingItems,
  currentUserProfile,
  familyMembers,
  onAddItem,
  onToggleItem,
  onDeleteItem,
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [itemTitle, setItemTitle] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('가족 전체');

  const handleCreateItem = () => {
    if (!itemTitle.trim()) {
      Alert.alert('알림', '구매/할 일 항목을 입력해 주세요.');
      return;
    }

    onAddItem({
      title: itemTitle.trim(),
      assignee: selectedAssignee,
    });

    setItemTitle('');
    setSelectedAssignee('가족 전체');
    setModalVisible(false);
  };

  const handleDeleteConfirm = (item) => {
    Alert.alert(
      '항목 삭제 🗑️',
      `'${item.title}' 항목을 삭제하시겠습니까?`,
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

  const getTodayString = (dateObj = new Date()) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayStr = getTodayString();
  const activeItems = shoppingItems ? shoppingItems.filter(i => !i.is_completed) : [];
  const completedItems = shoppingItems ? shoppingItems.filter(i => i.is_completed) : [];
  const todayEarnedCount = shoppingItems
    ? shoppingItems.filter(i => i.points_earned && i.completed_date === todayStr).length
    : 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTitleRow}>
            <ShoppingCart size={22} color="#FF7E82" style={{ marginRight: 8 }} />
            <Text style={styles.headerTitle}>가족 장보기 & 체크리스트</Text>
          </View>
          <Text style={styles.headerSub}>
            필요한 물품이나 가사 일을 함께 공유해 보세요! 완료 시 건당 +10P가 적립됩니다.
          </Text>

          {/* Daily Reward Progress Badge */}
          <View style={styles.dailyRewardBadge}>
            <Award size={14} color="#FF7E82" style={{ marginRight: 4 }} />
            <Text style={styles.dailyRewardText}>
              오늘의 보상 한도: {todayEarnedCount * 10} / 30 P ({todayEarnedCount}/3건 적립)
            </Text>
          </View>

          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Plus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.addBtnText}>항목 추가하기</Text>
          </TouchableOpacity>
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
                  <Square size={20} color="#8E8E93" />
                </TouchableOpacity>

                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitleText}>{item.title}</Text>
                  <View style={styles.tagRow}>
                    <Text style={styles.assigneeBadge}>담당: {item.assignee}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteConfirm(item)}
                >
                  <Trash2 size={16} color="#AEAEB2" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Completed Items Section */}
        {completedItems.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitleDone}>완료된 목록 (+10P 적립 완료)</Text>
            {completedItems.map((item) => (
              <View key={item.id} style={styles.itemRowDone}>
                <TouchableOpacity
                  style={styles.checkboxTouch}
                  onPress={() => onToggleItem(item, false)}
                >
                  <CheckCircle2 size={20} color="#2ECC71" />
                </TouchableOpacity>

                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitleTextDone}>{item.title}</Text>
                  <Text style={styles.completedByText}>
                    {item.completed_by ? `${item.completed_by}님이 완료함` : '완료됨'}
                    {item.points_earned ? ' (+10P 적립됨)' : ''}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteConfirm(item)}
                >
                  <Trash2 size={16} color="#AEAEB2" />
                </TouchableOpacity>
              </View>
            ))}
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
                <X size={20} color="#8E8E93" />
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
              {['가족 전체', ...(familyMembers ? familyMembers.map(m => m.name || m.role) : ['엄마', '아빠', '아들', '딸'])].map((name) => {
                const isSelected = selectedAssignee === name;
                return (
                  <TouchableOpacity
                    key={name}
                    style={[styles.assigneeChip, isSelected && styles.assigneeChipActive]}
                    onPress={() => setSelectedAssignee(name)}
                  >
                    <Text style={[styles.assigneeChipText, isSelected && styles.assigneeChipTextActive]}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

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
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  headerSub: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 18,
    marginBottom: 10,
  },
  dailyRewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF2F3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  dailyRewardText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF7E82',
  },
  addBtn: {
    flexDirection: 'row',
    backgroundColor: '#FF7E82',
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 14,
  },
  sectionTitleDone: {
    fontSize: 14,
    fontWeight: '800',
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
  },
  assigneeBadge: {
    fontSize: 10,
    color: '#FF7E82',
    backgroundColor: '#FFF2F3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
  completedByText: {
    fontSize: 10,
    color: '#2ECC71',
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 6,
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
  modalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#F1F2F4',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#1C1C1E',
    marginBottom: 8,
  },
  assigneeScroll: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingVertical: 4,
  },
  assigneeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
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
});
