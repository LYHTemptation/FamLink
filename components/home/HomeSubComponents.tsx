import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Send, Sparkles, X } from 'lucide-react-native';
import { commonStyles } from '../../theme';
import styles from './HomeStyles';

export interface HomeSmallTalkCardProps {
  topicCategory: string;
  topicTitle: string;
  myResponse?: string;
  answeredMembersCount: number;
  totalMembersCount: number;
  allAnswered: boolean;
  actorId: any;
  onAddResponse?: (textOrId: any, maybeText?: string) => Promise<any> | void;
  onNavigateSmallTalk: () => void;
}

function HomeSmallTalkCardComponent({
  topicCategory,
  topicTitle,
  myResponse,
  answeredMembersCount,
  totalMembersCount,
  allAnswered,
  actorId,
  onAddResponse,
  onNavigateSmallTalk,
}: HomeSmallTalkCardProps): React.ReactElement {
  // ⚡ 타이핑 상태를 HomeSmallTalkCard 내부에 격리하여 입력 시 홈 대시보드 전체 리렌더링 방지
  const [smallTalkInputText, setSmallTalkInputText] = useState('');
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

  const handleQuickSubmitSmallTalk = async () => {
    const trimmed = smallTalkInputText.trim();
    if (!trimmed) {
      Alert.alert('알림', '답변 내용을 입력해주세요.');
      return;
    }
    if (onAddResponse) {
      setIsSubmittingAnswer(true);
      try {
        await onAddResponse(actorId, trimmed);
        setSmallTalkInputText('');
        Alert.alert(
          '답변 등록 완료 🎉',
          '스몰톡 답변이 등록되고 +5 가족 포인트가 적립되었습니다!'
        );
      } catch (e) {
        console.error('Error submitting smalltalk answer from home:', e);
      } finally {
        setIsSubmittingAnswer(false);
      }
    } else {
      Alert.alert('안내', '스몰톡 화면으로 이동하여 답변을 등록해주세요.');
      onNavigateSmallTalk();
    }
  };

  return (
    <View style={styles.cardSection}>
      <View style={[styles.dashboardCard, styles.smallTalkHomeCard]}>
        {/* 상단 헤더: 라벨 + 포인트 뱃지 + 스몰톡 전체 보기 */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeaderLeftCol}>
            <View style={styles.smallTalkBadgeRow}>
              <Text style={[styles.cardSubLabel, styles.smallTalkSubLabel]}>
                오늘의 스몰톡
              </Text>
              <View style={styles.smallTalkPointsPill}>
                <Text style={styles.smallTalkPointsPillText}>+5 P</Text>
              </View>
            </View>
            <Text style={styles.smallTalkCategoryText}>{topicCategory}</Text>
          </View>

          <TouchableOpacity
            style={styles.cardHeaderPillBtn}
            onPress={onNavigateSmallTalk}
            activeOpacity={0.7}
          >
            <Text style={styles.cardHeaderPillText}>전체 보기 →</Text>
          </TouchableOpacity>
        </View>

        {/* 질문 본문 */}
        <TouchableOpacity
          onPress={onNavigateSmallTalk}
          activeOpacity={0.85}
          style={styles.smallTalkQuestionBox}
        >
          <Text style={styles.smallTalkQuestionText}>{topicTitle}</Text>
        </TouchableOpacity>

        {/* 카드 구분선 */}
        <View style={[styles.cardDivider, styles.smallTalkDivider]} />

        {/* 답변 입력 또는 내 답변 노출 영역 */}
        {myResponse ? (
          <View style={styles.myAnswerDoneBox}>
            <View style={styles.myAnswerHeaderRow}>
              <View style={styles.myAnswerBadge}>
                <Text style={styles.myAnswerCheckIcon}>✓</Text>
                <Text style={styles.myAnswerBadgeText}>
                  내 답변 완료 (+5P 적립됨)
                </Text>
              </View>
              <TouchableOpacity
                onPress={onNavigateSmallTalk}
                activeOpacity={0.7}
              >
                <Text style={styles.myAnswerEditBtn}>수정 ✍️</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.myAnswerContentText} numberOfLines={2}>
              "{myResponse}"
            </Text>
          </View>
        ) : (
          <View style={styles.quickAnswerInputContainer}>
            <TextInput
              style={styles.quickAnswerInput}
              placeholder="답변을 남겨보세요... (+5P)"
              placeholderTextColor="#A8A29E"
              value={smallTalkInputText}
              onChangeText={setSmallTalkInputText}
              multiline={false}
              returnKeyType="send"
              onSubmitEditing={handleQuickSubmitSmallTalk}
            />
            <TouchableOpacity
              style={[
                styles.quickAnswerSubmitBtn,
                (!smallTalkInputText.trim() || isSubmittingAnswer) &&
                  styles.quickAnswerSubmitBtnDisabled,
              ]}
              onPress={handleQuickSubmitSmallTalk}
              disabled={!smallTalkInputText.trim() || isSubmittingAnswer}
              activeOpacity={0.85}
            >
              <Send size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.quickAnswerSubmitBtnText}>등록</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 하단 가족 참여 진행 현황 */}
        <View style={styles.smallTalkFooterRow}>
          <Text style={styles.smallTalkParticipationText}>
            가족 참여:{' '}
            <Text style={{ fontWeight: '800', color: '#1C1917' }}>
              {answeredMembersCount}명
            </Text>{' '}
            / {totalMembersCount}명
          </Text>
          <Text style={styles.smallTalkBonusHint}>
            {allAnswered
              ? '🎉 전원 완료 (+30P 보너스 달성!)'
              : '모두 참여 시 +30 P 보너스 🎁'}
          </Text>
        </View>
      </View>
    </View>
  );
}

export const HomeSmallTalkCard = React.memo(HomeSmallTalkCardComponent);

export interface HomeNicknameModalProps {
  visible: boolean;
  initialNickname: string;
  presets: string[];
  onClose: () => void;
  onSaveNickname: (newNickname: string) => void;
}

function HomeNicknameModalComponent({
  visible,
  initialNickname,
  presets,
  onClose,
  onSaveNickname,
}: HomeNicknameModalProps): React.ReactElement {
  const [tempNickname, setTempNickname] = useState(initialNickname);

  useEffect(() => {
    if (visible) {
      setTempNickname(initialNickname);
    }
  }, [visible, initialNickname]);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={commonStyles.modalOverlay}
      >
        <View style={commonStyles.modalBottomSheet}>
          <View style={commonStyles.modalHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Sparkles size={18} color="#FF6B47" />
              <Text style={commonStyles.modalHeaderTitle}>
                우리 가족 별칭 설정 🏡
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <Text
            style={{
              fontSize: 12,
              color: '#78716C',
              marginBottom: 12,
              lineHeight: 17,
            }}
          >
            홈 화면 상단에 표시될 우리 집만의 다정한 별칭을 지어보세요. 온 가족의 홈
            화면에 함께 적용됩니다!
          </Text>

          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: '#78716C',
              marginBottom: 8,
            }}
          >
            추천 별칭 빠르게 선택하기
          </Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 14,
            }}
          >
            {presets.map((preset) => {
              const isSelected = tempNickname.trim() === preset;
              return (
                <TouchableOpacity
                  key={preset}
                  onPress={() => setTempNickname(preset)}
                  activeOpacity={0.8}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: isSelected ? '#FF6B47' : '#F5F0E8',
                    backgroundColor: isSelected ? '#FFF5F2' : '#FFFFFF',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: isSelected ? '800' : '600',
                      color: isSelected ? '#FF6B47' : '#78716C',
                    }}
                  >
                    {preset}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: '#78716C',
              marginBottom: 6,
            }}
          >
            직접 입력 (최대 16자)
          </Text>
          <TextInput
            style={{
              backgroundColor: '#FAF8F3',
              borderRadius: 12,
              padding: 12,
              fontSize: 14,
              color: '#1C1917',
              borderWidth: 1,
              borderColor: '#F5F0E8',
              marginBottom: 14,
            }}
            placeholder="예: 행복한 김씨네 가족, 우당탕탕 우리집"
            placeholderTextColor="#AEAEB2"
            value={tempNickname}
            onChangeText={setTempNickname}
            maxLength={16}
          />

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              backgroundColor: '#FF6B47',
              padding: 14,
              borderRadius: 16,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={() => onSaveNickname(tempNickname)}
            activeOpacity={0.85}
          >
            <Sparkles size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>
              우리 가족 별칭 저장하기
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export const HomeNicknameModal = React.memo(HomeNicknameModalComponent);
