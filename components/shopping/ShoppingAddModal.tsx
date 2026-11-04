import React, { useState } from 'react';
import {
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
import { IconClose, IconRepeat } from '../icons';
import UserAvatar from '../UserAvatar';
import { styles } from './ShoppingStyles';
import type { FamilyMember } from '../../types/domain';

export interface NewShoppingItemPayload {
  title: string;
  assignee: string;
  repeat_type: 'none' | 'daily' | 'weekly' | string;
}

export interface ShoppingAddModalProps {
  visible: boolean;
  familyMembers: FamilyMember[];
  onClose: () => void;
  onAddItem: (item: NewShoppingItemPayload) => void;
}

export const ShoppingAddModal = React.memo(function ShoppingAddModal({
  visible,
  familyMembers = [],
  onClose,
  onAddItem,
}: ShoppingAddModalProps) {
  const [itemTitle, setItemTitle] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('가족 전체');
  const [repeatType, setRepeatType] = useState('none');

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
    onClose();
  };

  if (!visible) return null;

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
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalHeader}>새 장보기/할 일 추가</Text>
            <TouchableOpacity onPress={onClose}>
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.assigneeScroll}
          >
            {[
              { key: 'all', name: '가족 전체', avatar: '👨‍👩‍👧‍👦' },
              ...(familyMembers &&
              Array.isArray(familyMembers) &&
              familyMembers.length > 0
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
                  ]),
            ].map((item) => {
              const isSelected = selectedAssignee === item.name;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.assigneeChip,
                    isSelected && styles.assigneeChipActive,
                  ]}
                  onPress={() => setSelectedAssignee(item.name || '')}
                >
                  <UserAvatar
                    avatar={item.avatar}
                    size={18}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.assigneeChipText,
                      isSelected && styles.assigneeChipTextActive,
                    ]}
                  >
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
                  style={[
                    styles.repeatOptionChip,
                    isSelected && styles.repeatOptionChipActive,
                  ]}
                  onPress={() => setRepeatType(opt.key)}
                  activeOpacity={0.7}
                >
                  {opt.key !== 'none' && (
                    <IconRepeat
                      size={12}
                      color={isSelected ? '#FF6B47' : '#8E8E93'}
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.repeatOptionText,
                      isSelected && styles.repeatOptionTextActive,
                    ]}
                  >
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

          <TouchableOpacity
            style={styles.modalConfirmBtn}
            onPress={handleCreateItem}
          >
            <Text style={styles.modalConfirmBtnText}>등록하기 (+20P 미션)</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});
