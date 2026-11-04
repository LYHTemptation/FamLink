import React, { useState, useMemo, useCallback } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Award,
  ChevronDown,
  ChevronUp,
  Trash2,
  Clock,
} from 'lucide-react-native';
import {
  IconPlus,
  IconTrash,
  IconSquare,
  IconCheckCircle,
  IconRepeat,
} from './icons';
import { styles } from './shopping/ShoppingStyles';
import {
  ShoppingAddModal,
  type NewShoppingItemPayload,
} from './shopping/ShoppingAddModal';
import type { ShoppingItem, UserProfile, FamilyMember } from '../types/domain';

export type { NewShoppingItemPayload };

export interface ShoppingListScreenProps {
  shoppingItems: ShoppingItem[];
  currentUserProfile?: UserProfile | null;
  familyMembers: FamilyMember[];
  onAddItem: (item: NewShoppingItemPayload) => void;
  onToggleItem: (itemOrId: any, completed?: boolean) => void;
  onDeleteItem: (id: string) => void;
  onClearCompleted?: () => void;
  onToggleRepeat?: (itemOrId: any, currentRepeatType?: string) => void;
  embedded?: boolean;
}

function getTodayString(dateObj = new Date()): string {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatItemDateTime(dateVal: any): string {
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
}

function ShoppingListScreen({
  shoppingItems = [],
  familyMembers = [],
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onClearCompleted,
  onToggleRepeat,
  embedded = false,
}: ShoppingListScreenProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(true);
  const [showAllCompleted, setShowAllCompleted] = useState(false);

  const todayStr = useMemo(() => getTodayString(), []);

  const isDateToday = useCallback(
    (dateVal: any) => {
      if (!dateVal) return false;
      try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return String(dateVal).startsWith(todayStr);
        const now = new Date();
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate()
        );
      } catch {
        return false;
      }
    },
    [todayStr]
  );

  const { activeItems, completedItems, todayEarnedCount } = useMemo(() => {
    const active: ShoppingItem[] = [];
    const completed: ShoppingItem[] = [];
    let rawEarned = 0;

    for (const i of shoppingItems || []) {
      if (i.is_completed) {
        completed.push(i);
        const isDoneToday =
          i.completed_date === todayStr || isDateToday(i.completed_at);
        if (isDoneToday && (i.points_earned || isDoneToday)) {
          rawEarned++;
        }
      } else {
        active.push(i);
      }
    }

    return {
      activeItems: active,
      completedItems: completed,
      todayEarnedCount: Math.min(3, rawEarned),
    };
  }, [shoppingItems, todayStr, isDateToday]);

  const handleDeleteConfirm = useCallback(
    (item: ShoppingItem) => {
      const isRepeating = item.repeat_type && item.repeat_type !== 'none';
      Alert.alert(
        '항목 삭제',
        isRepeating
          ? `'${item.title}' (${
              item.repeat_type === 'daily' ? '매일' : '매주'
            } 반복) 항목을 삭제하시겠습니까?\n삭제 시 더 이상 반복되지 않습니다.`
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
    },
    [onDeleteItem]
  );

  const handleClearCompletedConfirm = useCallback(() => {
    if (!completedItems || completedItems.length === 0) return;
    const recurringCount = completedItems.filter(
      (i) => i.repeat_type && i.repeat_type !== 'none'
    ).length;
    const oneTimeCount = completedItems.length - recurringCount;

    const message =
      recurringCount > 0
        ? `완료된 1회성 항목(${oneTimeCount}개)을 모두 삭제하시겠습니까?\n(매일/반복 할 일 ${recurringCount}개는 삭제되지 않고 내일 다시 등록됩니다)`
        : `완료된 ${completedItems.length}개의 항목을 모두 삭제하시겠습니까?`;

    Alert.alert('완료 목록 비우기', message, [
      { text: '취소', style: 'cancel' },
      {
        text: '모두 비우기',
        style: 'destructive',
        onPress: () => {
          if (onClearCompleted) {
            onClearCompleted();
          } else {
            completedItems.forEach((i) => onDeleteItem(i.id));
          }
        },
      },
    ]);
  }, [completedItems, onClearCompleted, onDeleteItem]);

  return (
    <View
      style={[
        styles.container,
        embedded && { backgroundColor: 'transparent' },
      ]}
    >
      {/* Sub-header Bar */}
      {!embedded ? (
        <View style={styles.subHeaderBar}>
          <View>
            <Text style={styles.subHeaderTitle}>장보기</Text>
            <Text style={styles.subHeaderSub}>
              미완료 {activeItems.length}개 · 완료 {completedItems.length}개
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <IconPlus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.addBtnText}>품목 추가</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.embeddedHeaderBar}>
          <Text style={styles.embeddedHeaderCount}>
            미완료 {activeItems.length}개 · 완료 {completedItems.length}개
          </Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <IconPlus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.addBtnText}>품목 추가</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Daily Reward Progress Badge */}
        <View style={styles.dailyRewardCard}>
          <Award size={16} color="#FF6B47" style={{ marginRight: 6 }} />
          <Text style={styles.dailyRewardText}>
            오늘의 집안일 보상: 일일 최대 60P ({todayEarnedCount}/3건 완료)
          </Text>
        </View>

        {/* Active Items Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            구매 / 할 일 목록 ({activeItems.length})
          </Text>

          {activeItems.length === 0 ? (
            <Text style={styles.emptyText}>
              아직 등록된 장보기 항목이 없습니다.
            </Text>
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
                    <Text style={styles.assigneeBadge}>
                      담당: {item.assignee}
                    </Text>
                    {item.repeat_type && item.repeat_type !== 'none' ? (
                      <TouchableOpacity
                        style={styles.repeatBadge}
                        onPress={() => onToggleRepeat && onToggleRepeat(item)}
                        activeOpacity={0.7}
                      >
                        <IconRepeat
                          size={10}
                          color="#FF6B47"
                          style={{ marginRight: 3 }}
                        />
                        <Text style={styles.repeatBadgeText}>
                          {item.repeat_type === 'daily'
                            ? '매일 반복'
                            : '매주 반복'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                    {item.created_at || item.created_time ? (
                      <View style={styles.metaTimeRow}>
                        <Clock
                          size={11}
                          color="#8E8E93"
                          style={{ marginRight: 3 }}
                        />
                        <Text style={styles.metaTimeText}>
                          {formatItemDateTime(
                            item.created_at || item.created_time
                          )}{' '}
                          등록
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
                onPress={() => setIsCompletedExpanded((prev) => !prev)}
                activeOpacity={0.7}
              >
                <Text style={styles.sectionTitleDone}>
                  완료된 목록 ({completedItems.length})
                </Text>
                {isCompletedExpanded ? (
                  <ChevronUp
                    size={16}
                    color="#2ECC71"
                    style={{ marginLeft: 4 }}
                  />
                ) : (
                  <ChevronDown
                    size={16}
                    color="#8E8E93"
                    style={{ marginLeft: 4 }}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.clearAllBtn}
                onPress={handleClearCompletedConfirm}
                activeOpacity={0.7}
              >
                <Trash2 size={12} color="#FF6B47" style={{ marginRight: 4 }} />
                <Text style={styles.clearAllBtnText}>모두 비우기</Text>
              </TouchableOpacity>
            </View>

            {isCompletedExpanded ? (
              <View>
                {(showAllCompleted
                  ? completedItems
                  : completedItems.slice(0, 3)
                ).map((item) => (
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
                          {item.completed_by
                            ? `${item.completed_by}님이 완료함`
                            : '완료됨'}
                          {item.points_earned ? ` (+${item.points || 20}P)` : ''}
                        </Text>
                        {item.repeat_type && item.repeat_type !== 'none' ? (
                          <View style={styles.repeatBadgeDone}>
                            <IconRepeat
                              size={10}
                              color="#2ECC71"
                              style={{ marginRight: 3 }}
                            />
                            <Text style={styles.repeatBadgeTextDone}>
                              {item.repeat_type === 'daily'
                                ? '매일 반복'
                                : '매주 반복'}
                            </Text>
                          </View>
                        ) : null}
                        {item.completed_at ||
                        item.completed_time ||
                        item.created_at ? (
                          <View style={styles.metaTimeRow}>
                            <Clock
                              size={11}
                              color="#A0A0A5"
                              style={{ marginRight: 3 }}
                            />
                            <Text style={styles.metaTimeTextDone}>
                              {formatItemDateTime(
                                item.completed_at ||
                                  item.completed_time ||
                                  item.created_at
                              )}{' '}
                              완료
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
                    onPress={() => setShowAllCompleted((prev) => !prev)}
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

      {/* Add Item Modal (타이핑 상태 격리) */}
      <ShoppingAddModal
        visible={modalVisible}
        familyMembers={familyMembers}
        onClose={() => setModalVisible(false)}
        onAddItem={onAddItem}
      />
    </View>
  );
}

export default React.memo(ShoppingListScreen);
