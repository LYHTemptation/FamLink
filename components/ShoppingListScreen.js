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
import { ShoppingCart, Award } from 'lucide-react-native';
import {
  IconPlus,
  IconTrash,
  IconClose,
  IconSquare,
  IconCheckCircle,
} from './icons';

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
      '항목 삭제',
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
      {/* Sub-header Bar */}
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
                  <IconCheckCircle size={20} color="#2ECC71" />
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
                  <IconTrash size={16} color="#AEAEB2" />
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
                { key: 'all', name: '가족 전체' },
                ...(familyMembers && Array.isArray(familyMembers) && familyMembers.length > 0
                  ? familyMembers.map((m, idx) => ({ key: m.id || `${m.name || m.role}_${idx}`, name: m.name || m.role }))
                  : ['엄마', '아빠', '아들', '딸'].map(r => ({ key: r, name: r })))
              ].map((item) => {
                const isSelected = selectedAssignee === item.name;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.assigneeChip, isSelected && styles.assigneeChipActive]}
                    onPress={() => setSelectedAssignee(item.name)}
                  >
                    <Text style={[styles.assigneeChipText, isSelected && styles.assigneeChipTextActive]}>
                      {item.name}
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
  subHeaderBar: {
    paddingHorizontal: 20,
    height: 64,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
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
