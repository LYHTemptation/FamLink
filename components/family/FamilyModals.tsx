import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import {
  ShieldCheck,
  Edit3,
  Sparkles,
  Check,
  Camera,
  Trash2,
  Gift,
  ExternalLink,
} from 'lucide-react-native';
import { MoodIcon, MOOD_ITEMS, IconClose } from '../icons';
import { supabase, isSupabaseReady } from '../../lib/supabase';
import { styles } from './FamilyStyles';
import type { UserProfile } from '../../types/domain';

const EDIT_AVATAR_PRESETS = [
  '👩‍🦰', '👨‍💼', '👦', '👧', '👵', '👴', '🧑', '👱', '👶', '🐱', '🐶', '🐰', '🐻', '🐼', '🦊', '🐣',
];

const FEEDBACK_QUICK_CHIPS = [
  '가족과 대화가 늘었어요 ❤️',
  '반려몽 키우기가 귀여워요 🐾',
  '스몰톡 질문이 따뜻해요 💬',
  '포토북 제작이 기대돼요 📖',
];

// 1. Terms & Privacy Policy Dedicated Modal
export interface FamilyPolicyModalProps {
  visible: boolean;
  initialTab?: string;
  onClose: () => void;
}

export const FamilyPolicyModal = React.memo(function FamilyPolicyModal({
  visible,
  initialTab = 'terms',
  onClose,
}: FamilyPolicyModalProps) {
  const [activePolicyTab, setActivePolicyTab] = useState(initialTab);

  useEffect(() => {
    if (visible) {
      setActivePolicyTab(initialTab);
    }
  }, [visible, initialTab]);

  if (!visible) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalView, { maxHeight: '88%', paddingBottom: 20 }]}>
          <View style={styles.modalHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={18} color="#FF6B47" />
              <Text style={styles.modalHeader}>운영 정책 및 약관</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <IconClose size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <View style={styles.policyTabBar}>
            <TouchableOpacity
              style={[
                styles.policyTabBtn,
                activePolicyTab === 'terms' && styles.policyTabBtnActive,
              ]}
              onPress={() => setActivePolicyTab('terms')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.policyTabBtnText,
                  activePolicyTab === 'terms' && styles.policyTabBtnTextActive,
                ]}
              >
                서비스 이용약관
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.policyTabBtn,
                activePolicyTab === 'privacy' && styles.policyTabBtnActive,
              ]}
              onPress={() => setActivePolicyTab('privacy')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.policyTabBtnText,
                  activePolicyTab === 'privacy' &&
                    styles.policyTabBtnTextActive,
                ]}
              >
                개인정보 처리방침
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 12 }}
          >
            {activePolicyTab === 'privacy' ? (
              <View style={styles.policyContentCard}>
                <Text style={styles.policySectionHeading}>
                  FamLink 개인정보 처리방침
                </Text>
                <Text style={styles.policyMetaText}>
                  최종 수정일: 2026년 10월 9일 (Apple Guideline 5.1.1 준수)
                </Text>

                <Text style={styles.policyArticleTitle}>
                  제1조 (개인정보 수집 항목 및 방법)
                </Text>
                <Text style={styles.policyBodyText}>
                  FamLink는 가족 간 프라이빗 소통 및 실물 포토북 배송을 위한 최소한의 개인정보만을 수집합니다.{'\n'}
                  • 필수 수집 항목: 로그인 이메일, 가족 내 호칭/이름, 프로필 아바타{'\n'}
                  • 서비스 이용 시 생성 정보: 가족 대화 내역, 공유 캘린더 일정, 스몰톡 답변, 업로드 사진{'\n'}
                  • 포토북 제작 주문 시: 수령인 이름, 배송지 주소, 연락처 전화번호
                </Text>

                <Text style={styles.policyArticleTitle}>
                  제2조 (개인정보 수집 및 이용 목적)
                </Text>
                <Text style={styles.policyBodyText}>
                  1. 가족 구성원 간의 실시간 암호화 대화 및 스몰톡 질문 매칭{'\n'}
                  2. 반려몽 가상 펫 육성 게이미피케이션 및 온기 데이터 동기화{'\n'}
                  3. 실물 양장본 포토북 POD(Print on Demand) 주문 제작 및 배송
                </Text>

                <Text style={styles.policyArticleTitle}>
                  제3조 (개인정보의 보유 및 파기 - 회원 탈퇴 연동)
                </Text>
                <Text style={styles.policyBodyText}>
                  FamLink는 이용자가 회원 탈퇴를 요청하는 즉시 해당 이용자의 계정, 프로필, 작성 데이터 일체를 서버 및 로컬 데이터베이스에서 지체 없이 영구 파기합니다.{'\n'}
                  회원 탈퇴는 앱 내 [가족] 탭의 [내 계정 정보] → [회원 탈퇴] 버튼을 통해 언제든 즉시 실행할 수 있습니다.
                </Text>

                <Text style={styles.policyArticleTitle}>
                  제4조 (제3자 데이터 판매 금지 및 보안)
                </Text>
                <Text style={styles.policyBodyText}>
                  FamLink는 어떠한 경우에도 가족들의 사진, 대화, 개인정보를 광고 목적으로 제3자에게 판매하거나 마케팅 데이터로 제공하지 않습니다. 모든 데이터는 엄격한 접근 제어(RLS) 하에 안전하게 보호됩니다.
                </Text>

                <Text style={styles.policyArticleTitle}>
                  제5조 (개인정보 보호책임자 및 문의처)
                </Text>
                <Text style={styles.policyBodyText}>
                  • 개인정보 보호책임 부서: FamLink Privacy Team{'\n'}
                  • 문의 이메일: privacy@famlink.com
                </Text>
              </View>
            ) : (
              <View style={styles.policyContentCard}>
                <Text style={styles.policySectionHeading}>
                  FamLink 서비스 이용약관
                </Text>
                <Text style={styles.policyMetaText}>
                  최종 수정일: 2026년 10월 9일
                </Text>

                <Text style={styles.policyArticleTitle}>제1조 (목적)</Text>
                <Text style={styles.policyBodyText}>
                  본 약관은 FamLink(이하 "서비스")가 제공하는 가족 전용 메신저, 스몰톡 문답, 반려몽 육성, 공유 캘린더 및 AI 포토북 출판 서비스의 이용 조건 및 절차를 규정함을 목적으로 합니다.
                </Text>

                <Text style={styles.policyArticleTitle}>
                  제2조 (가족 그룹 및 계정 관리)
                </Text>
                <Text style={styles.policyBodyText}>
                  1. 이용자는 초대 코드(Family Code)를 통해 가족 구성원과 비공개 그룹을 형성합니다.{'\n'}
                  2. 계정 정보는 본인이 직접 관리하여야 하며, 타인에게 양도하거나 대여할 수 없습니다.
                </Text>

                <Text style={styles.policyArticleTitle}>
                  제3조 (실물 양장본 포토북 POD 주문 제작 및 청약철회·환불 규정)
                </Text>
                <Text style={styles.policyBodyText}>
                  1. 가족 스튜디오에서 편집한 150×210mm A5 하드커버 양장본은 주문 시 1:1 맞춤 POD(Print on Demand) 방식으로 개별 생산됩니다.{'\n'}
                  2. 가족들이 모은 포인트(12,000 P)로 100% 무료 교환하거나, 보유 포인트를 전액 할인 적용한 뒤 차액만 계좌이체로 결제할 수 있습니다.{'\n'}
                  3. [청약철회 및 취소 기준] 주문 접수 후 '인쇄 준비중' 단계 이전(접수 후 1시간 이내)에는 100% 즉시 취소 및 차감 포인트·결제액 전액 복구가 가능합니다. 단, 전자상거래법 제17조 제2항 제6호에 따라 인쇄소 데이터 전송 및 제작이 착수된 이후에는 맞춤 제작 상품 특성상 단순 변심에 의한 취소·환불이 불가합니다.{'\n'}
                  4. [품질 보증 및 무료 재제작] 파본, 제본 불량, 인쇄 결함 또는 배송 중 파손 발생 시 수령 후 7일 이내 접수하시면 당사 부담으로 100% 무료 재제작 및 재배송해 드립니다.
                </Text>

                <Text style={styles.policyArticleTitle}>제4조 (이용자의 의무)</Text>
                <Text style={styles.policyBodyText}>
                  이용자는 음란, 폭력, 타인의 권리를 침해하는 유해 콘텐츠를 게시할 수 없으며, 플랫폼의 건전한 가족 소통 환경을 준수해야 합니다.
                </Text>

                <Text style={styles.policyArticleTitle}>
                  제5조 (서비스 종료 및 회원 탈퇴)
                </Text>
                <Text style={styles.policyBodyText}>
                  이용자는 언제든지 앱 내 설정을 통해 회원 탈퇴를 진행할 수 있으며, 탈퇴 시 계정(auth.users) 및 프로필·대화 데이터는 관련 법령이 정한 바에 따라 즉시 영구 파기 처리됩니다.
                </Text>

                <Text style={styles.policyArticleTitle}>
                  제6조 (사업자 정보 및 고객센터)
                </Text>
                <Text style={styles.policyBodyText}>
                  • 상호명: 팸링크(FamLink){'\n'}
                  • 사업자등록번호: 302-42-01661{'\n'}
                  • 주요 종목: 전자상거래 소매업 (525101) / 맞춤형 포토북 제작{'\n'}
                  • 고객센터: 카카오톡 채널 @팸링크FamLink / support@famlink.com (평일 10:00~18:00)
                </Text>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            style={styles.policyModalCloseCta}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.policyModalCloseCtaText}>확인</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

// 2. Profile & Mood Edit Modal (isolating typing state)
export interface FamilyProfileEditModalProps {
  visible: boolean;
  currentUserProfile?: UserProfile | null;
  onClose: () => void;
  onUpdateProfile?: (updated: any) => void;
  onUpdateMood?: (mood: string, statusText?: string) => void;
}

export const FamilyProfileEditModal = React.memo(function FamilyProfileEditModal({
  visible,
  currentUserProfile,
  onClose,
  onUpdateProfile,
  onUpdateMood,
}: FamilyProfileEditModalProps) {
  const [editName, setEditName] = useState(currentUserProfile?.name || '');
  const [editRole, setEditRole] = useState(currentUserProfile?.role || '');
  const [selectedAvatar, setSelectedAvatar] = useState(
    currentUserProfile?.avatar || '👦'
  );
  const [selectedMood, setSelectedMood] = useState(
    currentUserProfile?.mood || '😊'
  );
  const [statusText, setStatusText] = useState(
    currentUserProfile?.status_text || ''
  );

  useEffect(() => {
    if (visible) {
      setEditName(currentUserProfile?.name || '');
      setEditRole(currentUserProfile?.role || '');
      setSelectedAvatar(currentUserProfile?.avatar || '👦');
      setSelectedMood(currentUserProfile?.mood || '😊');
      setStatusText(currentUserProfile?.status_text || '');
    }
  }, [visible, currentUserProfile]);

  const handlePickProfileImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert(
          '권한 필요',
          '프로필 사진 설정을 위해 사진첩 접근 권한이 필요합니다.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const imageUri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setSelectedAvatar(imageUri);
      }
    } catch (e) {
      console.log('Error picking profile image:', e);
      Alert.alert('오류', '사진을 불러오는 중 문제가 발생했습니다.');
    }
  };

  const handleSaveProfile = () => {
    if (onUpdateProfile) {
      onUpdateProfile({
        name: editName.trim() || currentUserProfile?.name,
        role: editRole.trim() || currentUserProfile?.role,
        avatar: selectedAvatar,
        mood: selectedMood,
        status_text: statusText.trim(),
      });
    } else if (onUpdateMood) {
      onUpdateMood(selectedMood, statusText.trim());
    }
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
        <View style={[styles.modalView, { maxHeight: '88%' }]}>
          <View style={styles.modalHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Edit3 size={18} color="#FF6B47" />
              <Text style={styles.modalHeader}>내 프로필 설정</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <IconClose size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            <Text style={styles.modalLabel}>프로필 사진 / 아바타</Text>
            <View style={styles.avatarPreviewWrap}>
              <TouchableOpacity
                style={styles.avatarLargeCircleTouchable}
                onPress={handlePickProfileImage}
                activeOpacity={0.85}
              >
                <View style={styles.avatarLargeCircle}>
                  {selectedAvatar &&
                  (selectedAvatar.startsWith('http') ||
                    selectedAvatar.startsWith('data:') ||
                    selectedAvatar.length > 50) ? (
                    <Image
                      source={{
                        uri:
                          selectedAvatar.startsWith('http') ||
                          selectedAvatar.startsWith('data:')
                            ? selectedAvatar
                            : `data:image/jpeg;base64,${selectedAvatar}`,
                      }}
                      style={styles.avatarLargeImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.avatarLargeText}>
                      {typeof selectedAvatar === 'string' &&
                      selectedAvatar.length <= 10
                        ? selectedAvatar
                        : '👦'}
                    </Text>
                  )}
                </View>
                <View style={styles.avatarCameraBadge}>
                  <Camera size={14} color="#FFFFFF" strokeWidth={2.5} />
                </View>
              </TouchableOpacity>

              <View style={styles.avatarActionBtnsRow}>
                <TouchableOpacity
                  style={styles.avatarUploadBtn}
                  onPress={handlePickProfileImage}
                  activeOpacity={0.8}
                >
                  <Camera size={14} color="#FF6B47" style={{ marginRight: 5 }} />
                  <Text style={styles.avatarUploadBtnText}>앨범에서 사진 선택</Text>
                </TouchableOpacity>

                {selectedAvatar &&
                  (selectedAvatar.startsWith('http') ||
                    selectedAvatar.startsWith('data:')) && (
                    <TouchableOpacity
                      style={styles.avatarResetBtn}
                      onPress={() => setSelectedAvatar('👦')}
                      activeOpacity={0.8}
                    >
                      <Trash2
                        size={13}
                        color="#8E8E93"
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.avatarResetBtnText}>기본 이모지로</Text>
                    </TouchableOpacity>
                  )}
              </View>

              <Text style={styles.avatarSubText}>
                카카오톡처럼 사진첩에서 사진을 등록하거나 아래 캐릭터를 골라보세요
              </Text>
            </View>

            <Text style={[styles.modalLabel, { marginTop: 10, marginBottom: 8 }]}>
              또는 기본 캐릭터 이모티콘 선택
            </Text>
            <View style={styles.avatarGridWrap}>
              {EDIT_AVATAR_PRESETS.map((emoji) => {
                const isSelected = selectedAvatar === emoji;
                return (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.avatarGridCell,
                      isSelected && styles.avatarGridCellActive,
                    ]}
                    onPress={() => setSelectedAvatar(emoji)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.avatarGridEmoji}>{emoji}</Text>
                    {isSelected && (
                      <View style={styles.avatarCheckBadge}>
                        <Check size={10} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalRowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>내 이름 (실명)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="이름 입력"
                  placeholderTextColor="#AEAEB2"
                  value={editName}
                  onChangeText={setEditName}
                  maxLength={10}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>가족 내 호칭/역할</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="예: 엄마, 큰아들"
                  placeholderTextColor="#AEAEB2"
                  value={editRole}
                  onChangeText={setEditRole}
                  maxLength={10}
                />
              </View>
            </View>

            <Text style={[styles.modalLabel, { marginTop: 14 }]}>
              오늘의 기분 스티커
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.emojiScroll}
              contentContainerStyle={{ paddingVertical: 4 }}
            >
              {MOOD_ITEMS.map((item) => {
                const isSelected = selectedMood === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.emojiChip,
                      isSelected && {
                        borderColor: item.color,
                        backgroundColor: item.color + '15',
                        borderWidth: 2,
                      },
                    ]}
                    onPress={() => setSelectedMood(item.id)}
                  >
                    <MoodIcon mood={item.id} size={22} color={item.color} />
                    <Text
                      style={[
                        styles.moodChipLabel,
                        isSelected && { color: item.color, fontWeight: '800' },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={[styles.modalLabel, { marginTop: 14 }]}>
              한 줄 상태 메시지
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="예: 공부 중, 퇴근길 피곤함, 헬스장 도착!"
              placeholderTextColor="#AEAEB2"
              value={statusText}
              onChangeText={setStatusText}
              maxLength={30}
            />
          </ScrollView>

          <TouchableOpacity
            style={styles.modalConfirmBtn}
            onPress={handleSaveProfile}
            activeOpacity={0.85}
          >
            <Sparkles size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.modalConfirmBtnText}>프로필 저장 완료</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

// 3. Feedback Reward Modal (+1,000P) (isolating typing state)
export interface FamilyFeedbackModalProps {
  visible: boolean;
  currentUserProfile?: UserProfile | null;
  feedbackStorageKey: string;
  hasClaimedFeedbackReward: boolean;
  onClaimedReward: () => void;
  onAwardPoints?: (
    amount: number,
    reason?: string
  ) => Promise<boolean> | boolean | void;
  onClose: () => void;
}

export const FamilyFeedbackModal = React.memo(function FamilyFeedbackModal({
  visible,
  currentUserProfile,
  feedbackStorageKey,
  hasClaimedFeedbackReward,
  onClaimedReward,
  onAwardPoints,
  onClose,
}: FamilyFeedbackModalProps) {
  const [feedbackText, setFeedbackText] = useState('');
  const [selectedFeedbackChip, setSelectedFeedbackChip] = useState<string>(
    FEEDBACK_QUICK_CHIPS[0]
  );
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const handleSubmitFeedback = async (openStoreLink: boolean = false) => {
    const finalNote = [selectedFeedbackChip, feedbackText.trim()]
      .filter(Boolean)
      .join(' | ');
    if (!finalNote) {
      Alert.alert('알림', '응원 한마디나 피드백 항목을 선택해 주세요.');
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      if (openStoreLink) {
        const storeUrl =
          Platform.OS === 'android'
            ? 'market://details?id=com.yon_know.familymessenger'
            : 'https://apps.apple.com/kr/search?term=FamLink';
        Linking.openURL(storeUrl).catch(() => {});
      }

      if (!hasClaimedFeedbackReward) {
        await AsyncStorage.setItem(feedbackStorageKey, 'true');
        onClaimedReward();

        if (isSupabaseReady && currentUserProfile?.family_id) {
          await supabase
            .from('user_feedbacks')
            .insert({
              family_id: currentUserProfile.family_id,
              user_id: currentUserProfile.id || null,
              user_name: currentUserProfile.name || '가족',
              category_chip: selectedFeedbackChip || null,
              content: feedbackText.trim() || selectedFeedbackChip,
              reward_claimed: true,
              points_awarded: 1000,
              platform: Platform.OS,
            })
            .then(
              () => {},
              () => {}
            );
        }

        if (onAwardPoints) {
          await onAwardPoints(1000, '소중한 피드백 보내기 (+1,000P)');
        }

        onClose();
        setFeedbackText('');
        Alert.alert(
          '소중한 피드백 감사합니다! 🎁',
          '보내주신 따뜻한 의견을 바탕으로 더 좋은 FamLink를 만들어갈게요.\n\n우리 가족방에 감사 선물로 +1,000 포인트가 즉시 적립되었습니다!'
        );
      } else {
        if (isSupabaseReady && currentUserProfile?.family_id) {
          await supabase
            .from('user_feedbacks')
            .insert({
              family_id: currentUserProfile.family_id,
              user_id: currentUserProfile.id || null,
              user_name: currentUserProfile.name || '가족',
              category_chip: selectedFeedbackChip || null,
              content: feedbackText.trim() || selectedFeedbackChip,
              reward_claimed: false,
              points_awarded: 0,
              platform: Platform.OS,
            })
            .then(
              () => {},
              () => {}
            );
        }
        onClose();
        setFeedbackText('');
        Alert.alert(
          '피드백 전달 완료 💌',
          '소중한 의견이 FamLink 팀에 잘 전달되었습니다! (1,000P 첫 피드백 보상은 이미 우리 가족방에 지급 완료되었습니다 ✨)'
        );
      }
    } finally {
      setIsSubmittingFeedback(false);
    }
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalView}>
          <View style={styles.modalHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Gift size={18} color="#FF6B47" />
              <Text style={styles.modalHeader}>소중한 피드백 보내기</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <IconClose size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <View
            style={{
              backgroundColor: '#FFF5F2',
              borderRadius: 14,
              padding: 12,
              borderWidth: 1,
              borderColor: '#FFE8E0',
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '800',
                color: '#FF6B47',
                marginBottom: 4,
              }}
            >
              {hasClaimedFeedbackReward
                ? '✨ 우리 가족 첫 피드백 선물(+1,000P) 지급 완료'
                : '🎁 우리 가족 첫 피드백 감사 선물: +1,000 포인트 즉시 지급!'}
            </Text>
            <Text style={{ fontSize: 12, color: '#78716C', lineHeight: 17 }}>
              가족분들의 따뜻한 응원 한마디와 개선 의견이 FamLink를 더욱 다정한 공간으로 만듭니다.
            </Text>
          </View>

          <Text style={styles.modalLabel}>어떤 점이 가장 좋으셨나요?</Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 10,
            }}
          >
            {FEEDBACK_QUICK_CHIPS.map((chip) => {
              const isSelected = selectedFeedbackChip === chip;
              return (
                <TouchableOpacity
                  key={chip}
                  onPress={() => setSelectedFeedbackChip(chip)}
                  activeOpacity={0.8}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
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
                    {chip}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.modalLabel}>
            자유로운 응원 또는 개선 의견 (선택)
          </Text>
          <TextInput
            style={[
              styles.modalInput,
              { minHeight: 76, textAlignVertical: 'top' },
            ]}
            placeholder="더 추가되었으면 하는 기능이나 따뜻한 응원 한마디를 남겨주세요!"
            placeholderTextColor="#AEAEB2"
            value={feedbackText}
            onChangeText={setFeedbackText}
            multiline
            maxLength={200}
          />

          <TouchableOpacity
            style={[
              styles.modalConfirmBtn,
              isSubmittingFeedback && { opacity: 0.6 },
            ]}
            onPress={() => handleSubmitFeedback(false)}
            disabled={isSubmittingFeedback}
            activeOpacity={0.85}
          >
            <Sparkles size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.modalConfirmBtnText}>
              {hasClaimedFeedbackReward
                ? '소중한 피드백 전달하기'
                : '피드백 보내고 +1,000P 즉시 받기'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              paddingVertical: 11,
              marginTop: 6,
              borderRadius: 14,
              backgroundColor: '#FAF8F3',
              borderWidth: 1,
              borderColor: '#F5F0E8',
            }}
            onPress={() => handleSubmitFeedback(true)}
            disabled={isSubmittingFeedback}
            activeOpacity={0.8}
          >
            <ExternalLink
              size={14}
              color="#78716C"
              style={{ marginRight: 6 }}
            />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#78716C' }}>
              스토어에서도 응원 남기기{' '}
              {hasClaimedFeedbackReward ? '' : '(+1,000P 적립)'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});
