import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Award } from 'lucide-react-native';
import UserAvatar from '../UserAvatar';
import { colors } from '../../theme';
import type { ChoreIconMeta } from './smallTalkHelpers';
import styles from './SmallTalkStyles';

export interface SmallTalkModalsProps {
  answerModalVisible: boolean;
  setAnswerModalVisible: (visible: boolean) => void;
  topicTitle: string;
  answerText: string;
  setAnswerText: (val: string) => void;
  handleSaveAnswer: () => void;
  viewingMemberAnswer: { member?: any; text?: string } | null;
  setViewingMemberAnswer: (val: any) => void;
  addChoreModalVisible: boolean;
  setAddChoreModalVisible: (visible: boolean) => void;
  newChoreTitle: string;
  setNewChoreTitle: (val: string) => void;
  previewIconMeta: ChoreIconMeta;
  membersList: any[];
  newChoreAssignee: string;
  setNewChoreAssignee: (val: string) => void;
  newChoreRepeatType: string;
  setNewChoreRepeatType: (val: string) => void;
  handleCreateChore: () => void;
}

export default function SmallTalkModals({
  answerModalVisible,
  setAnswerModalVisible,
  topicTitle,
  answerText,
  setAnswerText,
  handleSaveAnswer,
  viewingMemberAnswer,
  setViewingMemberAnswer,
  addChoreModalVisible,
  setAddChoreModalVisible,
  newChoreTitle,
  setNewChoreTitle,
  previewIconMeta,
  membersList,
  newChoreAssignee,
  setNewChoreAssignee,
  newChoreRepeatType,
  setNewChoreRepeatType,
  handleCreateChore,
}: SmallTalkModalsProps): React.ReactElement {
  return (
    <>
      {/* 모달 1: 대화 주제 답변 작성 모달 */}
      <Modal visible={answerModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalTopRow}>
              <Text style={styles.modalMainTitle}>내 스몰톡 답변 남기기</Text>
              <TouchableOpacity onPress={() => setAnswerModalVisible(false)}>
                <X size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalTopicTitle}>{topicTitle}</Text>

            <TextInput
              style={styles.modalTextInput}
              placeholder="가족에게 전할 따뜻한 마음을 입력해보세요..."
              placeholderTextColor={colors.text.muted}
              multiline
              value={answerText}
              onChangeText={setAnswerText}
              autoFocus
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setAnswerModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>취소</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSaveAnswer}
              >
                <Text style={styles.modalSubmitBtnText}>답변 등록 (+5P)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 모달 1-2: 다른 가족 멤버 답변 열람 모달 (Read-Only) */}
      <Modal
        visible={Boolean(viewingMemberAnswer)}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingMemberAnswer(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalTopRow}>
              <View style={styles.viewerHeaderInfo}>
                <View
                  style={[
                    styles.memberAvatarRing,
                    {
                      backgroundColor: 'rgba(255, 107, 71, 0.15)',
                      marginRight: 10,
                    },
                  ]}
                >
                  <UserAvatar avatar={viewingMemberAnswer?.member?.avatar} size={24} />
                </View>
                <View>
                  <Text style={styles.modalMainTitle}>
                    {viewingMemberAnswer?.member?.name ||
                      viewingMemberAnswer?.member?.role}{' '}
                    님의 답변
                  </Text>
                  <Text style={styles.modalSubHeaderRole}>
                    오늘의 가족 스몰톡 이야기 💬
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setViewingMemberAnswer(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.viewerTopicBox}>
              <Text style={styles.viewerTopicLabel}>오늘의 대화 질문</Text>
              <Text style={styles.viewerTopicTitle}>{topicTitle}</Text>
            </View>

            <View style={styles.viewerContentBox}>
              <Text style={styles.viewerQuoteMark}>“</Text>
              <ScrollView
                style={styles.viewerScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.viewerAnswerText}>
                  {viewingMemberAnswer?.text}
                </Text>
              </ScrollView>
              <Text style={[styles.viewerQuoteMark, { textAlign: 'right' }]}>”</Text>
            </View>

            <TouchableOpacity
              style={styles.viewerConfirmBtn}
              onPress={() => setViewingMemberAnswer(null)}
              activeOpacity={0.85}
            >
              <Text style={styles.viewerConfirmBtnText}>공감했어요 ❤️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 모달 2: 새 집안일 추가 모달 */}
      <Modal visible={addChoreModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalTopRow}>
              <Text style={styles.modalMainTitle}>새 집안일 등록</Text>
              <TouchableOpacity onPress={() => setAddChoreModalVisible(false)}>
                <X size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInputSingle}
              placeholder="집안일 제목 (예: 분리수거하기)"
              placeholderTextColor={colors.text.muted}
              value={newChoreTitle}
              onChangeText={setNewChoreTitle}
            />

            <View style={styles.choreRewardBadgeRow}>
              <Award size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.choreRewardBadgeText}>
                완료 시 가족 포인트{' '}
                <Text style={{ fontWeight: '800', color: colors.primary }}>+20 P</Text>{' '}
                자동 적립
              </Text>
            </View>

            <View style={styles.modalFieldCol}>
              <Text style={styles.modalFieldLabel}>자동 분류 태그:</Text>
              <View style={styles.autoCategoryPreviewRow}>
                <View
                  style={[
                    styles.autoCategoryPill,
                    { backgroundColor: previewIconMeta.iconBg },
                  ]}
                >
                  <Text style={styles.autoCategoryEmoji}>{previewIconMeta.icon}</Text>
                  <Text
                    style={[
                      styles.autoCategoryLabel,
                      { color: previewIconMeta.tagColor },
                    ]}
                  >
                    {previewIconMeta.category}
                  </Text>
                </View>
                <Text style={styles.autoCategoryHint}>
                  ✨ 제목 키워드로 자동 지정돼요
                </Text>
              </View>
            </View>

            <View style={styles.modalFieldCol}>
              <Text style={styles.modalFieldLabel}>담당 가족:</Text>
              <View style={styles.categoryChipsRow}>
                {[
                  '가족 전체',
                  ...membersList.map((m) => m.name || m.role),
                ]
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .map((mem) => (
                    <TouchableOpacity
                      key={mem}
                      style={[
                        styles.categoryChip,
                        newChoreAssignee === mem && styles.categoryChipActive,
                      ]}
                      onPress={() => setNewChoreAssignee(mem)}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          newChoreAssignee === mem && styles.categoryChipTextActive,
                        ]}
                      >
                        {mem}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </View>

            <View style={styles.modalFieldCol}>
              <Text style={styles.modalFieldLabel}>반복 설정:</Text>
              <View style={styles.repeatToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.repeatTabBtn,
                    newChoreRepeatType === 'none' && styles.repeatTabBtnActive,
                  ]}
                  onPress={() => setNewChoreRepeatType('none')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.repeatTabText,
                      newChoreRepeatType === 'none' && styles.repeatTabTextActive,
                    ]}
                  >
                    📌 오늘만 (1회성)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.repeatTabBtn,
                    newChoreRepeatType === 'daily' && styles.repeatTabBtnActive,
                  ]}
                  onPress={() => setNewChoreRepeatType('daily')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.repeatTabText,
                      newChoreRepeatType === 'daily' && styles.repeatTabTextActive,
                    ]}
                  >
                    🔄 매일 반복 (루틴)
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.repeatHintText}>
                {newChoreRepeatType === 'daily'
                  ? '✨ 매일 자정(00:00)이 지나면 새로운 오늘 할 일로 자동 갱신돼요'
                  : '✨ 완료하면 오늘 목록에 머물고 다음 날(자정)에 자동 정리돼요'}
              </Text>
            </View>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setAddChoreModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>취소</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleCreateChore}
              >
                <Text style={styles.modalSubmitBtnText}>등록하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
