import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import {
  Users,
  Heart,
  Award,
  ShieldCheck,
  Edit3,
  LogOut,
  Sparkles,
  Trash2,
  FileText,
  Gift,
  MessageSquare,
} from 'lucide-react-native';
import {
  MoodIcon,
  IconCopy,
  IconShare,
  IconChevronRight,
} from './icons';
import { supabase, isSupabaseReady } from '../lib/supabase';
import UserAvatar from './UserAvatar';
import { styles } from './family/FamilyStyles';
import {
  FamilyPolicyModal,
  FamilyProfileEditModal,
  FamilyFeedbackModal,
} from './family/FamilyModals';
import type { FamilyMember, UserProfile } from '../types/domain';

const FAMILY_MEMBERS_STATIC: Record<
  string,
  { name: string; avatar: string; color: string }
> = {
  mom: { name: '엄마', avatar: '👩‍🦰', color: '#FF6B47' },
  dad: { name: '아빠', avatar: '👨‍💼', color: '#4A90E2' },
  son: { name: '아들', avatar: '👦', color: '#2ECC71' },
  daughter: { name: '딸', avatar: '👧', color: '#F39C12' },
};

export interface FamilyScreenProps {
  familyCode?: string | null;
  familyMembersList: FamilyMember[];
  currentUserProfile?: UserProfile | null;
  onUpdateMood?: (mood: string, statusText?: string) => void;
  onUpdateProfile?: (updated: any) => void;
  onlineUsers?: any;
  onLogout?: () => void;
  onDeleteAccount?: () => void;
  onNavigateScreen?: (screen: string) => void;
  onAwardPoints?: (
    amount: number,
    reason?: string
  ) => Promise<boolean> | boolean | void;
}

function FamilyScreen({
  familyCode,
  familyMembersList = [],
  currentUserProfile,
  onUpdateMood,
  onUpdateProfile,
  onlineUsers,
  onLogout,
  onDeleteAccount,
  onNavigateScreen,
  onAwardPoints,
}: FamilyScreenProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [policyModalVisible, setPolicyModalVisible] = useState(false);
  const [activePolicyTab, setActivePolicyTab] = useState('terms');
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [hasClaimedFeedbackReward, setHasClaimedFeedbackReward] =
    useState(false);

  const familyKey =
    currentUserProfile?.family_id || familyCode || 'default-family';
  const feedbackStorageKey = `@famlink_feedback_reward_1000p_${familyKey}`;

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(feedbackStorageKey)
      .then((val) => {
        if (isMounted && val === 'true') {
          setHasClaimedFeedbackReward(true);
        }
      })
      .catch(() => {});

    if (isSupabaseReady && currentUserProfile?.family_id) {
      supabase
        .from('user_feedbacks')
        .select('id')
        .eq('family_id', currentUserProfile.family_id)
        .eq('reward_claimed', true)
        .limit(1)
        .then(({ data }) => {
          if (isMounted && Array.isArray(data) && data.length > 0) {
            setHasClaimedFeedbackReward(true);
            AsyncStorage.setItem(feedbackStorageKey, 'true').catch(() => {});
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [feedbackStorageKey, currentUserProfile?.family_id]);

  // O(1) 온라인 접속자 Set
  const onlineUserSet = useMemo<Set<string>>(() => {
    if (!Array.isArray(onlineUsers) || onlineUsers.length === 0) {
      return new Set<string>();
    }
    return new Set<string>(onlineUsers);
  }, [onlineUsers]);

  const handleDeleteAccountClick = useCallback(() => {
    Alert.alert(
      '회원 탈퇴 ⚠️',
      '정말로 FamLink를 탈퇴하시겠습니까?\n\n탈퇴 시 내 프로필, 작성한 대화 및 모든 가족 데이터가 영구히 삭제되며 복구할 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴 진행',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '최종 확인',
              '모든 계정 및 데이터가 완전히 삭제됩니다. 계속 진행하시겠습니까?',
              [
                { text: '취소', style: 'cancel' },
                {
                  text: '영구 삭제 및 탈퇴',
                  style: 'destructive',
                  onPress: () => {
                    if (onDeleteAccount) {
                      onDeleteAccount();
                    } else if (onLogout) {
                      onLogout();
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }, [onDeleteAccount, onLogout]);

  const openEditModal = useCallback(() => {
    setModalVisible(true);
  }, []);

  const isFamilyFull = (familyMembersList?.length || 0) >= 10;

  const handleCopyCode = useCallback(async () => {
    if (isFamilyFull) {
      Alert.alert(
        '정원 마감 안내',
        '우리 가족의 최대 정원(10명)이 모두 찼습니다. 추가 가입이 제한됩니다.'
      );
      return;
    }
    await Clipboard.setStringAsync(familyCode || '');
    Alert.alert(
      '복사 완료',
      '가족 코드가 클립보드에 복사되었습니다. 다른 가족에게 보내 가입하도록 하세요!'
    );
  }, [isFamilyFull, familyCode]);

  const handleCopyInviteMessage = useCallback(async () => {
    if (isFamilyFull) {
      Alert.alert(
        '정원 마감 안내',
        '우리 가족의 최대 정원(10명)이 모두 찼습니다. 추가 가입이 제한됩니다.'
      );
      return;
    }
    const inviteMsg = `[FamLink] 우리 가족만의 소통 공간에 당신을 초대합니다! ❤️\n\n앱을 설치하고 가입하실 때 아래 가족 코드를 입력하시면 같이 채팅과 일정을 공유할 수 있어요.\n\n가족 코드: ${familyCode}`;
    await Clipboard.setStringAsync(inviteMsg);
    Alert.alert(
      '초대문구 복사',
      '초대 메시지가 복사되었습니다. 카카오톡이나 메시지로 가족에게 전송해 보세요!'
    );
  }, [isFamilyFull, familyCode]);

  const handleClaimedFeedbackReward = useCallback(() => {
    setHasClaimedFeedbackReward(true);
  }, []);

  return (
    <View style={styles.container}>
      {/* Sub-header Bar */}
      <View style={styles.subHeaderBar}>
        <View style={styles.subHeaderLeftGroup}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.subHeaderTitle}>가족</Text>
            {isFamilyFull && (
              <View style={styles.limitFullBadge}>
                <Text style={styles.limitFullBadgeText}>정원 마감 (10/10)</Text>
              </View>
            )}
          </View>
          <Text style={styles.subHeaderSub}>
            가족 멤버 {familyMembersList.length} / 10명
          </Text>
        </View>

        <View style={styles.subHeaderRightGroup}>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={openEditModal}
            activeOpacity={0.8}
          >
            <Edit3 size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.headerActionBtnText}>내 프로필 수정</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Family Code Card */}
        <View style={styles.codeCard}>
          <View style={styles.cardHeader}>
            <Users size={20} color="#FF6B47" style={{ marginRight: 6 }} />
            <Text style={styles.cardHeaderTitle}>우리 가족 연결 코드</Text>
          </View>
          <Text style={styles.codeText}>{familyCode}</Text>
          <Text style={styles.codeDesc}>
            {isFamilyFull
              ? '⚠️ 현재 최대 정원(10명)이 모두 찼습니다. 새 멤버 가입이 제한됩니다.'
              : '다른 가족들이 가입 시 이 코드를 입력하면 이 방으로 자동 연결됩니다. (최대 10명)'}
          </Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleCopyCode}
            >
              <IconCopy size={14} color="#FF6B47" style={{ marginRight: 4 }} />
              <Text style={styles.actionButtonText}>코드 복사</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleCopyInviteMessage}
            >
              <IconShare size={14} color="#FF6B47" style={{ marginRight: 4 }} />
              <Text style={styles.actionButtonText}>초대 링크 복사</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Family Mission Promotion Banner */}
        <TouchableOpacity
          style={styles.inviteGuideCard}
          onPress={() => onNavigateScreen && onNavigateScreen('smalltalk')}
          activeOpacity={0.85}
        >
          <View style={styles.guideIconWrap}>
            <Award size={22} color="#FF6B47" />
          </View>

          <View style={styles.guideTextCol}>
            <View style={styles.guideTitleRow}>
              <Text style={styles.guideTitle}>가족 단합 미션 시작하기!</Text>
              <View style={styles.guideTag}>
                <Sparkles
                  size={10}
                  color="#FF6B47"
                  style={{ marginRight: 2 }}
                />
                <Text style={styles.guideTagText}>포인트 적립</Text>
              </View>
            </View>
            <Text style={styles.guideDesc}>
              가족이 함께 스몰톡·장보기 미션을 수행할수록 보너스 포인트가 쑥쑥 쌓여요.
            </Text>
          </View>

          <View style={styles.guideActionBtn}>
            <IconChevronRight size={16} color="#FF6B47" />
          </View>
        </TouchableOpacity>

        {/* 소중한 피드백 보내기 (+1,000P 1회 지급 이벤트 배너) */}
        <TouchableOpacity
          style={styles.inviteGuideCard}
          onPress={() => setFeedbackModalVisible(true)}
          activeOpacity={0.85}
        >
          <View style={[styles.guideIconWrap, { backgroundColor: '#FFF5F2' }]}>
            <Gift size={22} color="#FF6B47" />
          </View>

          <View style={styles.guideTextCol}>
            <View style={styles.guideTitleRow}>
              <Text style={styles.guideTitle}>소중한 피드백 보내기</Text>
              <View style={styles.guideTag}>
                <Sparkles
                  size={10}
                  color="#FF6B47"
                  style={{ marginRight: 2 }}
                />
                <Text style={styles.guideTagText}>
                  {hasClaimedFeedbackReward ? '참여 완료 ✓' : '+1,000P 선물'}
                </Text>
              </View>
            </View>
            <Text style={styles.guideDesc}>
              {hasClaimedFeedbackReward
                ? '우리 가족의 따뜻한 응원으로 +1,000P 선물이 적립되었습니다! 언제든 의견을 더 남겨주세요.'
                : 'FamLink 사용 소감이나 응원 메시지를 보내주시면 우리 가족방에 1,000 포인트를 즉시 선물해 드려요.'}
            </Text>
          </View>

          <View style={styles.guideActionBtn}>
            <IconChevronRight size={16} color="#FF6B47" />
          </View>
        </TouchableOpacity>

        {/* Member List Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Heart
              size={18}
              color="#FF6B47"
              fill="#FF6B47"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.sectionTitle}>
              가입된 가족 멤버 ({familyMembersList.length} / 10명)
            </Text>
          </View>

          {familyMembersList.map(
            (member: FamilyMember | any, index: number) => {
              const isDbProfile =
                member && typeof member === 'object' && 'name' in member;
              const roleKey = isDbProfile ? member.role || 'son' : member;
              const staticInfo = FAMILY_MEMBERS_STATIC[roleKey] || {
                name: '가족',
                avatar: '👦',
                color: '#8E8E93',
              };

              const memberName = isDbProfile ? member.name : staticInfo.name;
              const memberAvatar = isDbProfile
                ? member.avatar
                : staticInfo.avatar;
              const memberColor = isDbProfile ? member.color : staticInfo.color;
              const moodEmoji = isDbProfile ? member.mood || '😊' : '😊';
              const memberStatusText = isDbProfile
                ? member.status_text || ''
                : '';

              const isMe = isDbProfile
                ? Boolean(
                    currentUserProfile && currentUserProfile.id === member.id
                  )
                : index === 0;
              const isOnline =
                onlineUserSet.size > 0
                  ? isDbProfile
                    ? (member.id
                        ? onlineUserSet.has(member.id)
                        : onlineUserSet.has(member.role)) || isMe
                    : index === 0 || onlineUserSet.has(roleKey)
                  : isMe;

              return (
                <View
                  key={isDbProfile ? member.id : roleKey}
                  style={styles.memberItem}
                >
                  <UserAvatar
                    avatar={memberAvatar}
                    size={42}
                    style={{ marginRight: 12 }}
                  />

                  <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                      <Text style={[styles.memberName, { color: memberColor }]}>
                        {memberName}
                      </Text>
                      {isMe && (
                        <View style={styles.meBadge}>
                          <Text style={styles.meBadgeText}>나</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.moodBadgeRow}>
                      <MoodIcon
                        mood={moodEmoji}
                        size={14}
                        style={{ marginRight: 5 }}
                      />
                      <Text style={styles.moodStatusText}>
                        {memberStatusText || '오늘도 화이팅!'}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statusBox,
                      isOnline
                        ? styles.statusBoxOnline
                        : styles.statusBoxOffline,
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        isOnline
                          ? styles.statusDotOnline
                          : styles.statusDotOffline,
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        isOnline
                          ? styles.statusTextOnline
                          : styles.statusTextOffline,
                      ]}
                    >
                      {isOnline ? '접속 중' : '오프라인'}
                    </Text>
                  </View>
                </View>
              );
            }
          )}
        </View>

        {/* Account & Settings Card */}
        <View style={styles.accountCard}>
          <View style={styles.accountHeader}>
            <Users size={16} color="#78716C" style={{ marginRight: 6 }} />
            <Text style={styles.accountHeaderTitle}>내 계정 정보</Text>
          </View>

          <View style={styles.accountProfileRow}>
            <UserAvatar
              avatar={currentUserProfile?.avatar}
              size={46}
              style={{ marginRight: 12 }}
            />
            <View style={styles.accountInfoCol}>
              <Text style={styles.accountNameText} numberOfLines={1}>
                {currentUserProfile?.name || '내 계정'}
                <Text style={styles.accountRoleTagText}>
                  {' '}
                  ({currentUserProfile?.role || '가족'})
                </Text>
              </Text>
              {currentUserProfile?.email ? (
                <Text style={styles.accountEmailText} numberOfLines={1}>
                  {currentUserProfile.email.endsWith('@famlink.local')
                    ? currentUserProfile.email.replace('@famlink.local', '')
                    : currentUserProfile.email}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.accountEditBtn}
              onPress={openEditModal}
              activeOpacity={0.8}
            >
              <Edit3 size={13} color="#FF6B47" style={{ marginRight: 4 }} />
              <Text style={styles.accountEditBtnText}>프로필 수정</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.accountPolicyBox}>
            <TouchableOpacity
              style={styles.accountPolicyRow}
              onPress={() => setFeedbackModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.accountPolicyLeft}>
                <MessageSquare
                  size={14}
                  color="#FF6B47"
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[
                    styles.accountPolicyTitle,
                    { color: '#1C1917', fontWeight: '700' },
                  ]}
                >
                  소중한 피드백 보내기{' '}
                  {hasClaimedFeedbackReward ? '(참여 완료)' : '(+1,000P)'}
                </Text>
              </View>
              <IconChevronRight size={14} color="#FF6B47" />
            </TouchableOpacity>

            <View style={styles.accountPolicyDivider} />

            <TouchableOpacity
              style={styles.accountPolicyRow}
              onPress={() => {
                setActivePolicyTab('terms');
                setPolicyModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.accountPolicyLeft}>
                <FileText
                  size={14}
                  color="#78716C"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.accountPolicyTitle}>서비스 이용약관</Text>
              </View>
              <IconChevronRight size={14} color="#A8A29E" />
            </TouchableOpacity>

            <View style={styles.accountPolicyDivider} />

            <TouchableOpacity
              style={styles.accountPolicyRow}
              onPress={() => {
                setActivePolicyTab('privacy');
                setPolicyModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.accountPolicyLeft}>
                <ShieldCheck
                  size={14}
                  color="#78716C"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.accountPolicyTitle}>개인정보 처리방침</Text>
              </View>
              <IconChevronRight size={14} color="#A8A29E" />
            </TouchableOpacity>
          </View>

          <View style={styles.accountBottomActionRow}>
            {onLogout && (
              <TouchableOpacity
                style={styles.accountLogoutBtn}
                onPress={onLogout}
                activeOpacity={0.8}
              >
                <LogOut size={13} color="#78716C" style={{ marginRight: 4 }} />
                <Text style={styles.accountLogoutBtnText}>로그아웃</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.accountDeleteBtn}
              onPress={handleDeleteAccountClick}
              activeOpacity={0.8}
            >
              <Trash2 size={13} color="#EF4444" style={{ marginRight: 4 }} />
              <Text style={styles.accountDeleteBtnText}>회원 탈퇴</Text>
            </TouchableOpacity>
          </View>

          <View
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: '#F5F0E8',
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: '#78716C',
                marginBottom: 2,
              }}
            >
              팸링크(FamLink) | 맞춤형 가족 포토북 & 라이프스타일
            </Text>
            <Text style={{ fontSize: 10, color: '#A8A29E', lineHeight: 15 }}>
              사업자등록번호: 302-42-01661 | 업종: 전자상거래 소매업 (525101) | 고객센터: 카카오톡 @팸링크FamLink{'\n'}
              실물 포토북은 1:1 주문 제작(POD) 상품으로 인쇄 착수 후 단순 변심 환불이 제한되며, 파본·불량 시 100% 무료 재제작됩니다.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <FamilyPolicyModal
        visible={policyModalVisible}
        initialTab={activePolicyTab}
        onClose={() => setPolicyModalVisible(false)}
      />

      <FamilyProfileEditModal
        visible={modalVisible}
        currentUserProfile={currentUserProfile}
        onClose={() => setModalVisible(false)}
        onUpdateProfile={onUpdateProfile}
        onUpdateMood={onUpdateMood}
      />

      <FamilyFeedbackModal
        visible={feedbackModalVisible}
        currentUserProfile={currentUserProfile}
        feedbackStorageKey={feedbackStorageKey}
        hasClaimedFeedbackReward={hasClaimedFeedbackReward}
        onClaimedReward={handleClaimedFeedbackReward}
        onAwardPoints={onAwardPoints}
        onClose={() => setFeedbackModalVisible(false)}
      />
    </View>
  );
}

export default React.memo(FamilyScreen);
