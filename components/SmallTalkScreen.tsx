import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import {
  Plus,
  X,
  Check,
  CheckCircle2,
  Trophy,
  Award,
  Sparkles,
  ChevronRight,
  BookOpen,
  Camera,
  RotateCcw,
  Trash2,
  Gamepad2,
  Play,
  Flame,
  Gift,
} from 'lucide-react-native';
import UserAvatar from './UserAvatar';
import { colors, typography, commonStyles } from '../theme';
import SnackCatchGame from './minigames/SnackCatchGame';
import CardMatchGame from './minigames/CardMatchGame';
import BubblePopGame from './minigames/BubblePopGame';
import { useTransparentImage } from '../lib/imageTransparencyService';
import { stripEmojis } from '../utils/topics';

import {
  getChoreIconMeta,
  renderGoalCategorySvg,
} from './smalltalk/smallTalkHelpers';
import SmallTalkModals from './smalltalk/SmallTalkModals';
import styles from './smalltalk/SmallTalkStyles';

export { getChoreIconMeta, renderGoalCategorySvg };

import {
  FamilyMember,
  ChatMessage,
  UserProfile,
  PetmongCharacter,
} from '../types/domain';

export interface ChoreItem {
  id: string;
  title: string;
  category: string;
  assignee: string;
  points: number;
  repeat_type: string;
  is_completed: boolean;
  completed_date?: string | null;
  completed_at?: string | null;
  rawItem?: any;
}

export interface SmallTalkScreenProps {
  smallTalkState?: any;
  currentUser?: any;
  currentUserProfile?: UserProfile | null;
  points?: number;
  pointHistory?: any[];
  onAddResponse?: (targetOrText: any, text?: string) => Promise<boolean> | boolean | void;
  familyMembers?: FamilyMember[];
  messages?: ChatMessage[];
  onSendOrderNotice?: (orderInfo: any) => Promise<void> | void;
  shoppingItems?: any[];
  onAddItem?: (item: any) => Promise<void> | void;
  onToggleItem?: (item: any, isCompleted?: boolean) => Promise<void> | void;
  onDeleteItem?: (id: string) => Promise<void> | void;
  onClearCompleted?: () => Promise<void> | void;
  onToggleRepeat?: (item: any) => Promise<void> | void;
  petCharacter?: PetmongCharacter | any | null;
  onAwardPetExp?: ((actorId: any, amount: number, reason?: string) => void) | null;
  onAwardPoints?: ((amount: number, reason?: string) => void) | null;
}

export default function SmallTalkScreen({
  smallTalkState = {},
  currentUser,
  currentUserProfile,
  points = 0,
  pointHistory = [],
  onAddResponse,
  familyMembers = [],
  messages = [],
  onSendOrderNotice,
  shoppingItems = [],
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onClearCompleted,
  onToggleRepeat,
  petCharacter = null,
  onAwardPetExp = null,
  onAwardPoints = null,
}: SmallTalkScreenProps) {
  // Figma 2대 서브탭: 'chores' (✅ 집안일) | 'games' (🎮 게임)
  const [activeTab, setActiveTab] = useState<'chores' | 'games' | string>('chores');

  // 대화 답변 작성 모달 상태 (로그인 사용자 전용)
  const [answerModalVisible, setAnswerModalVisible] = useState(false);
  const [answerText, setAnswerText] = useState('');

  // 다른 가족 멤버 답변 열람 모달 상태 (Read-Only)
  const [viewingMemberAnswer, setViewingMemberAnswer] = useState<{ member: any; text: string } | null>(null);

  // 집안일 추가 모달 상태
  const [addChoreModalVisible, setAddChoreModalVisible] = useState(false);
  const [newChoreTitle, setNewChoreTitle] = useState('');
  const [newChoreAssignee, setNewChoreAssignee] = useState('가족 전체');
  const [newChoreRepeatType, setNewChoreRepeatType] = useState('daily'); // 'none' (오늘만) | 'daily' (매일 반복)

  // 실시간 스마트 카테고리 프리뷰 (제목 키워드 자동 분석)
  const previewIconMeta = useMemo(() => getChoreIconMeta(null, newChoreTitle), [newChoreTitle]);

  // 로컬 집안일 상태
  const [fallbackChores, setFallbackChores] = useState<ChoreItem[]>([]);

  // 1. 체류형 3대 반려몽 미니게임 모달 상태
  const [isSnackGameVisible, setIsSnackGameVisible] = useState(false);
  const [isCardMatchGameVisible, setIsCardMatchGameVisible] = useState(false);
  const [isBubbleGameVisible, setIsBubbleGameVisible] = useState(false);

  // 온디바이스 배경 투명화 처리된 펫 이미지 URI
  const cleanPetmongUri = useTransparentImage(petCharacter?.image_url);

  // 사용자별(개인별) 일일 미니게임 성장 보상 한도 (1인당 하루 최대 3회)
  const DAILY_GAME_REWARD_LIMIT = 3;
  const [dailyGameRewardCount, setDailyGameRewardCount] = useState(0);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayStartIso = useMemo(() => `${todayStr}T00:00:00.000Z`, [todayStr]);
  const currentUserId = currentUserProfile?.id || (typeof currentUser === 'string' ? currentUser : 'guest');
  const rewardStorageKey = useMemo(() => {
    return `@famlink_daily_game_rewards_${currentUserId}_${todayStr}`;
  }, [currentUserId, todayStr]);

  // DB(petmong_activities)에서 오늘 완료한 미니게임 보상 횟수 직접 조회 (크로스 디바이스 동기화)
  const refreshGameRewardCount = useCallback(async () => {
    if (!currentUserProfile?.id) return;
    try {
      const { data, error } = await supabase
        .from('petmong_activities')
        .select('activity_type, exp_earned')
        .eq('user_id', currentUserProfile.id)
        .gte('created_at', todayStartIso)
        .eq('activity_type', 'MINIGAME');

      if (!error && Array.isArray(data)) {
        const rewardedCount = data.filter(d => (d.exp_earned || 0) > 0).length;
        setDailyGameRewardCount(rewardedCount);
        AsyncStorage.setItem(rewardStorageKey, String(rewardedCount)).catch(() => {});
        return;
      }
    } catch (e) {
      console.warn('petmong_activities minigame query note:', e);
    }

    // DB 조회 실패 또는 오프라인 시 로컬 캐시 폴백
    AsyncStorage.getItem(rewardStorageKey)
      .then((val) => {
        if (val !== null) {
          setDailyGameRewardCount(parseInt(val, 10) || 0);
        }
      })
      .catch(() => {});
  }, [currentUserProfile?.id, todayStartIso, rewardStorageKey]);

  useEffect(() => {
    refreshGameRewardCount();
  }, [refreshGameRewardCount]);

  const remainingRewards = Math.max(0, DAILY_GAME_REWARD_LIMIT - dailyGameRewardCount);
  const canEarnReward = remainingRewards > 0;

  // 반려몽 체류형 미니게임 완료 콜백 (사용자별 일일 한도 체크 및 연습 모드 분기)
  const handleCompletePetmongGame = async (gameTitle: string, { score = 0, exp: awardedExp = 0, isPractice = false }: any) => {
    if (!isPractice && dailyGameRewardCount < DAILY_GAME_REWARD_LIMIT) {
      const nextCount = dailyGameRewardCount + 1;
      setDailyGameRewardCount(nextCount);
      AsyncStorage.setItem(rewardStorageKey, String(nextCount)).catch(() => {});

      const finalExp = awardedExp || Math.max(15, Math.min(50, Math.round((score || 100) / 10)));
      if (onAwardPetExp) {
        onAwardPetExp(null, finalExp, `${currentUserProfile?.name || '가족'}님의 ${gameTitle} (+${finalExp} EXP)`);
      }

      // Log to petmong_activities for cross-device truth
      try {
        await supabase.from('petmong_activities').insert({
          character_id: petCharacter?.id,
          user_id: currentUserProfile?.id,
          activity_type: 'MINIGAME',
          notes: `${currentUserProfile?.name || '가족'}님이 [${gameTitle}]을 완료했습니다! (${score}점)`,
          exp_earned: finalExp,
        });
      } catch (logErr) {
        console.warn('Failed to log minigame activity:', logErr);
      }
      refreshGameRewardCount();

      const left = DAILY_GAME_REWARD_LIMIT - nextCount;
      Alert.alert(
        '🎉 미니게임 완료!',
        `${gameTitle}을(를) 멋지게 마쳤어요!\n\n🌱 반려몽이 +${finalExp} EXP를 획득하여 쑥쑥 성장했습니다!\n🎁 오늘 내 남은 성장 보상: ${left > 0 ? `${left}회` : '모두 달성 (이후 자유 연습)'}`
      );
    } else {
      Alert.alert(
        '🎮 자유 연습 모드 완료!',
        `${gameTitle} 연습을 멋지게 마쳤어요!\n\n최종 점수: ${score}점\n(오늘의 1인 성장 보상 ${DAILY_GAME_REWARD_LIMIT}회를 모두 달성하여 연습 모드로 기록되었습니다. 내일 다시 만나요! ✨)`
      );
    }
  };

  // 1. 가족 멤버 구성 (실제 연동 멤버, 없을 시 본인 프로필 단일 구성)
  const membersList = useMemo(() => {
    if (familyMembers && familyMembers.length > 0) {
      return familyMembers;
    }
    if (currentUserProfile) {
      return [{
        id: currentUserProfile.id || 'me',
        name: currentUserProfile.name || (typeof currentUser === 'string' ? currentUser : '나'),
        role: currentUserProfile.role || '본인',
        avatar: currentUserProfile.avatar || '😊',
        color: '#FF6B47',
      }];
    }
    return [];
  }, [familyMembers, currentUserProfile, currentUser]);

  // 2. 오늘의 대화 주제 및 응답 계산 (FamLink 기존 스몰톡 기능 100% 연동)
  const { topic = '', responses = {} } = smallTalkState || {};
  const topicTitle = useMemo(() => {
    if (!topic) return '오늘 가장 많이 웃었던 일은 무엇인가요?';
    const raw = typeof topic === 'string' ? topic : (topic.text || topic.title || '오늘 하루 가장 기억에 남는 순간은?');
    return stripEmojis(raw);
  }, [topic]);

  const topicCategory = useMemo(() => {
    if (typeof topic === 'object' && topic?.category) return topic.category;
    return '오늘의 스몰톡 질문';
  }, [topic]);

  const myId = currentUserProfile?.id;
  const myName = currentUserProfile?.name || (typeof currentUser === 'string' ? currentUser : '');
  const myRole = currentUserProfile?.role;

  // 멤버별 스몰톡 답변 조회 (고유 ID 우선, 이름 차선 - 역할 role 기반 공유 절대 방지)
  const getMemberResponse = (member: any) => {
    if (!member || !responses) return '';
    if (member.id && responses[member.id]) {
      return responses[member.id];
    }
    if (member.name && responses[member.name]) {
      return responses[member.name];
    }
    return '';
  };

  // 내 답변 조회 (ID 우선, Name 차선 - 타 가족과 역할이 같아도 오염 방지)
  const myAnswer = useMemo(() => {
    if (!responses) return '';
    if (myId && responses[myId]) return responses[myId];
    if (myName && responses[myName]) return responses[myName];
    return '';
  }, [responses, myId, myName]);
  const hasAnswered = Boolean(myAnswer);

  // 현재 로그인한 본인 여부 확인 (고유 ID 엄격 비교 -> 이름 비교 -> ID/이름 둘 다 없을 때만 예외적 역할 비교)
  const isCurrentMember = (member: any) => {
    if (!member) return false;
    // 1. 고유 ID 엄격 비교 (Supabase UUID 및 mock 고유 ID)
    if (myId && member.id) {
      return member.id === myId;
    }
    // 2. 실명/이름 비교
    if (myName && member.name) {
      return member.name === myName;
    }
    // 3. ID와 이름이 모두 누락된 순수 목(mock) 환경일 때만 예외적 역할 비교
    if (!myId && !member.id && !myName && !member.name && myRole && member.role) {
      return member.role === myRole;
    }
    return false;
  };

  const answeredCount = useMemo(() => {
    if (!responses) return 0;
    return membersList.filter(m => {
      const isMe = isCurrentMember(m);
      const ans = isMe ? myAnswer : getMemberResponse(m);
      return Boolean(ans);
    }).length;
  }, [responses, membersList, myAnswer]);
  const totalMemberCount = membersList.length;

  const currentUserMember = useMemo(() => {
    return membersList.find(m => isCurrentMember(m)) || membersList[0] || null;
  }, [membersList, myId, myName]);

  // 빠른 인라인 답변 텍스트 상태
  const [quickAnswerText, setQuickAnswerText] = useState('');

  // 3. 집안일 목록 구성 (DB shoppingItems 실시간 양방향 동기화)
  const choresList = useMemo(() => {
    const source: any[] = (shoppingItems !== undefined && shoppingItems !== null) ? shoppingItems : fallbackChores;
    return source.map((item, idx) => {
      const iconMeta = getChoreIconMeta(item.category, item.title);
      return {
        id: item.id,
        rawItem: item,
        title: item.title,
        category: iconMeta.category || item.category || '할 일',
        assignee: item.assignee || '가족 전체',
        points: item.points || 20,
        repeat_type: item.repeat_type || 'none',
        is_completed: Boolean(item.is_completed),
        icon: iconMeta.icon,
        iconBg: iconMeta.iconBg,
        tagColor: iconMeta.tagColor,
      };
    });
  }, [shoppingItems, fallbackChores]);

  const activeChores = useMemo(() => choresList.filter(c => !c.is_completed), [choresList]);
  const completedChoresList = useMemo(() => choresList.filter(c => c.is_completed), [choresList]);
  const totalChoresCount = choresList.length;
  const completedChoresCount = completedChoresList.length;
  const remainingChoresCount = activeChores.length;

  // ⭐ 오늘 실제로 완료하여 획득한 점수만 정확히 합산 (과거 완료 점수 누적 완벽 방지)
  const todayCompletedChores = useMemo(() => {
    return completedChoresList.filter(c => {
      const raw = c.rawItem || c;
      const compDate = raw.completed_date || (raw.completed_at ? raw.completed_at.slice(0, 10) : null);
      return !compDate || compDate === todayStr;
    });
  }, [completedChoresList, todayStr]);

  const todayEarnedScore = useMemo(() => {
    return todayCompletedChores.reduce((sum, c) => sum + (c.points || 20), 0);
  }, [todayCompletedChores]);

  // 집안일 완료 토글 (홈 화면 퀘스트 보드와 양방향 100% 실시간 연동)
  const handleToggleChoreItem = (chore: any) => {
    if (onToggleItem) {
      onToggleItem(chore.rawItem || chore, !chore.is_completed);
    } else {
      setFallbackChores(prev =>
        prev.map(c => (c.id === chore.id ? { ...c, is_completed: !c.is_completed } : c))
      );
    }
  };

  // 집안일 개별 삭제 핸들러 (할 일 및 완료 항목 공통)
  const handleDeleteChoreItem = (chore: any) => {
    const isDaily = chore.repeat_type === 'daily';
    const msg = isDaily
      ? `'${chore.title}' [매일 루틴] 항목을 완전히 삭제하시겠습니까?\n내일부터도 목록에 나타나지 않습니다.`
      : `'${chore.title}' 항목을 삭제하시겠습니까?`;

    Alert.alert(
      '집안일 삭제 🗑️',
      msg,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            if (onDeleteItem) {
              onDeleteItem(chore.id);
            }
            setFallbackChores(prev => prev.filter(c => c.id !== chore.id));
          },
        },
      ]
    );
  };

  // 완료된 집안일 일괄 비우기 핸들러 (1회성 완료 항목만 비우고, 매일 루틴은 보존)
  const handleClearCompleted = () => {
    const oneTimeCompleted = completedChoresList.filter(c => !c.repeat_type || c.repeat_type === 'none');
    if (oneTimeCompleted.length === 0) {
      Alert.alert(
        '알림 💡',
        '삭제할 1회성 완료 항목이 없습니다.\n매일 반복 루틴(🔄)은 일일 루틴 유지를 위해 목록에 안전하게 보존됩니다.'
      );
      return;
    }

    Alert.alert(
      '완료 목록 비우기 🧹',
      `완료된 1회성 집안일 ${oneTimeCompleted.length}개를 목록에서 즉시 비우시겠습니까?\n(다음 날이 되면 자동으로도 정리됩니다)`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '비우기',
          style: 'destructive',
          onPress: () => {
            if (onClearCompleted) {
              onClearCompleted();
            }
            setFallbackChores(prev => prev.filter(c => !c.is_completed || c.repeat_type === 'daily'));
          },
        },
      ]
    );
  };

  // 집안일 추가 제출 (홈 화면 및 DB 실시간 동기화)
  const handleCreateChore = () => {
    const trimmedTitle = newChoreTitle.trim();
    if (!trimmedTitle) {
      Alert.alert('알림', '집안일 이름을 입력해주세요.');
      return;
    }
    const pts = 20; // 표준 가족 집안일 고정 보상 (+20 P)
    const iconMeta = getChoreIconMeta(null, trimmedTitle);

    if (onAddItem) {
      onAddItem({
        title: trimmedTitle,
        assignee: newChoreAssignee,
        category: iconMeta.category,
        points: pts,
        repeat_type: newChoreRepeatType,
      });
    } else {
      const newChore = {
        id: `chore-${Date.now()}`,
        title: trimmedTitle,
        category: iconMeta.category,
        assignee: newChoreAssignee,
        points: pts,
        repeat_type: newChoreRepeatType,
        is_completed: false,
      };
      setFallbackChores(prev => [newChore, ...prev]);
    }

    setNewChoreTitle('');
    setNewChoreRepeatType('daily');
    setAddChoreModalVisible(false);
    const repeatLabel = newChoreRepeatType === 'daily' ? '매일 루틴' : '오늘만';
    Alert.alert('등록 완료 🎉', `'${trimmedTitle}' [${repeatLabel}] 집안일이 추가되었습니다!\n완료 시 +20 가족 포인트가 적립돼요.`);
  };

  // 내 대화 답변 모달 열기 (로그인한 사용자 전용)
  const handleOpenAnswerModal = () => {
    setAnswerText(myAnswer || '');
    setAnswerModalVisible(true);
  };

  // 가족 멤버 항목 탭: 본인이면 작성/수정, 타인이면 답변 열람 모달 팝업
  const handlePressMemberCard = (member: any) => {
    const isMe = isCurrentMember(member);
    if (isMe) {
      handleOpenAnswerModal();
    } else {
      const memberResponse = getMemberResponse(member);
      if (memberResponse) {
        setViewingMemberAnswer({
          member,
          text: memberResponse,
        });
      } else {
        Alert.alert(
          '답변 대기 중 🕊️',
          `${member.name || member.role} 님은 아직 오늘의 대화 답변을 작성하지 않았습니다.`
        );
      }
    }
  };

  // 대화 답변 저장 (모달) - 항상 현재 사용자 계정(ID 또는 이름)으로만 안전하게 저장
  const handleSaveAnswer = () => {
    if (!answerText.trim()) {
      Alert.alert('알림', '따뜻한 답변을 작성해주세요!');
      return;
    }
    const target = myId || myName || currentUser;
    if (onAddResponse) {
      onAddResponse(target, answerText.trim());
    }
    setAnswerModalVisible(false);
    setAnswerText('');
  };

  // 빠른 인라인 답변 제출
  const handleQuickAnswerSubmit = () => {
    if (!quickAnswerText.trim()) {
      Alert.alert('알림', '스몰톡 답변을 입력해주세요!');
      return;
    }
    const target = myId || myName || currentUser;
    if (onAddResponse) {
      onAddResponse(target, quickAnswerText.trim());
    }
    setQuickAnswerText('');
  };


  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ========================================================= */}
        {/* 1. 오늘의 대화 주제 카드 (Figma 14:1689)                  */}
        {/* ========================================================= */}
        <View style={styles.sectionPad}>
          <View style={styles.dailyTalkCard}>
            {/* 카드 상단: 태그, 참여율 뱃지, 주제 */}
            <View style={styles.dailyTalkHeader}>
              <View style={styles.dailyTalkHeaderLeft}>
                <View style={styles.dailyTalkTagRow}>
                  <Text style={styles.dailyTalkTag}>오늘의 대화 주제</Text>
                  <View style={styles.participationBadge}>
                    <Text style={styles.participationBadgeText}>
                      {answeredCount}/{totalMemberCount}명 응답
                    </Text>
                  </View>
                </View>

                <View style={styles.dailyTalkTopicRow}>
                  <Text style={styles.dailyTalkTopicText}>{topicTitle}</Text>
                </View>

                <Text style={styles.dailyTalkSubText}>{topicCategory}</Text>
              </View>

              {/* 원형 참여율 게이지 인디케이터 */}
              <View style={styles.gaugeCircle}>
                <Text style={styles.gaugeCircleText}>
                  {answeredCount}/{totalMemberCount}
                </Text>
              </View>
            </View>

            {/* 인라인 바로 답변 작성 영역 (아직 답변하지 않은 경우) */}
            {!hasAnswered ? (
              <View style={styles.quickAnswerInputContainer}>
                <TextInput
                  style={styles.quickAnswerInput}
                  placeholder="오늘의 스몰톡 답변 남기기... (+5P, 대화 온기 충전)"
                  placeholderTextColor="#A8A29E"
                  value={quickAnswerText}
                  onChangeText={setQuickAnswerText}
                  onSubmitEditing={handleQuickAnswerSubmit}
                />
                <TouchableOpacity
                  style={styles.quickAnswerSubmitBtn}
                  onPress={handleQuickAnswerSubmit}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickAnswerSubmitBtnText}>등록</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.myAnswerConfirmedBanner}
                onPress={handleOpenAnswerModal}
                activeOpacity={0.8}
              >
                <View style={styles.myAnswerCheckIconBox}>
                  <Check size={14} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.myAnswerConfirmedTitle}>내 스몰톡 답변 완료! 🎉</Text>
                  <Text style={styles.myAnswerConfirmedText} numberOfLines={1}>"{myAnswer}"</Text>
                </View>
                <Text style={styles.myAnswerEditBtnText}>수정</Text>
              </TouchableOpacity>
            )}

            {/* 가족 멤버별 답변 리스트 */}
            <View style={styles.membersAnswerList}>
              {membersList.length === 0 ? (
                <View style={{ paddingVertical: 18, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#A8A29E' }}>가족 구성원을 등록하거나 초대해보세요.</Text>
                </View>
              ) : (
                membersList.map((member, idx) => {
                const ringColors = [
                  'rgba(255, 179, 71, 0.25)',
                  'rgba(135, 206, 235, 0.25)',
                  'rgba(221, 160, 221, 0.25)',
                  'rgba(144, 238, 144, 0.25)',
                ];
                const bgRing = ringColors[idx % ringColors.length];
                const isMe = isCurrentMember(member);
                const memberResponse = isMe ? myAnswer : getMemberResponse(member);
                const hasAnswer = Boolean(memberResponse);

                return (
                  <TouchableOpacity
                    key={member.id || idx}
                    style={[styles.memberAnswerCard, isMe && styles.myMemberAnswerCard]}
                    onPress={() => handlePressMemberCard(member)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.memberAvatarRing, { backgroundColor: bgRing }]}>
                      <UserAvatar avatar={member.avatar} size={24} />
                    </View>

                    <View style={styles.memberAnswerInfoCol}>
                      <View style={styles.memberAnswerHeaderRow}>
                        <View style={styles.memberAnswerNameRow}>
                          <Text style={styles.memberAnswerName}>{member.name || member.role}</Text>
                          {isMe && (
                            <View style={styles.mySelfBadge}>
                              <Text style={styles.mySelfBadgeText}>나</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.memberStatusActionRow}>
                          {hasAnswer ? (
                            <View style={styles.answeredBadge}>
                              <Check size={10} color="#059669" />
                              <Text style={styles.answeredBadgeText}>답변 완료</Text>
                            </View>
                          ) : (
                            <Text style={styles.waitingBadgeText}>대기 중</Text>
                          )}

                          {isMe ? (
                            <View style={styles.myActionPill}>
                              <Text style={styles.myActionPillText}>{hasAnswer ? '수정' : '작성'}</Text>
                            </View>
                          ) : (
                            <Text style={[styles.chevronArrowInline, !hasAnswer && { opacity: 0.35 }]}>›</Text>
                          )}
                        </View>
                      </View>

                      <Text
                        style={[styles.memberAnswerSnippet, hasAnswer && styles.memberAnswerSnippetDone]}
                        numberOfLines={2}
                      >
                        {hasAnswer
                          ? memberResponse
                          : (isMe ? '탭하여 내 답변 남기기… ✍️' : '아직 답변 전이에요 💬')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }))}
            </View>

            {/* 카드 하단 30P 보너스 배너 */}
            <View style={styles.dailyTalkBonusBanner}>
              <Text style={styles.dailyTalkBonusText}>모두 참여하면 가족 +30 P 보너스 🎁</Text>
            </View>
          </View>
        </View>

        {/* ========================================================= */}
        {/* 3. 2단 서브탭 스위처: [✅ 집안일] vs [🎮 게임] (Figma 14:1790) */}
        {/* ========================================================= */}
        <View style={styles.sectionPad}>
          <View style={styles.subTabSegmentContainer}>
            <TouchableOpacity
              style={[styles.subTabSegmentBtn, activeTab === 'chores' && styles.subTabSegmentBtnActive]}
              onPress={() => setActiveTab('chores')}
              activeOpacity={0.85}
            >
              <Text style={[styles.subTabSegmentText, activeTab === 'chores' && styles.subTabSegmentTextActive]}>
                ✅ 집안일
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.subTabSegmentBtn, activeTab === 'games' && styles.subTabSegmentBtnActive]}
              onPress={() => setActiveTab('games')}
              activeOpacity={0.85}
            >
              <Text style={[styles.subTabSegmentText, activeTab === 'games' && styles.subTabSegmentTextActive]}>
                🎮 게임
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ========================================================= */}
        {/* 4. 서브탭 1: [✅ 집안일] 탭 콘텐츠 (Figma 14:1797)        */}
        {/* ========================================================= */}
        {activeTab === 'chores' && (
          <View style={styles.tabContentContainer}>
            {/* 상단 완료 진행 카드 (코랄 그라데이션 스타일) */}
            <View style={styles.choresProgressBanner}>
              <View style={styles.choresProgressLeft}>
                <Text style={styles.choresProgressMainText}>
                  {totalChoresCount === 0 ? '집안일 현황' : `${totalChoresCount}개 중 ${completedChoresCount}개 완료`}
                </Text>
                <Text style={styles.choresProgressSubText}>
                  {totalChoresCount === 0 ? '새로운 집안일을 등록해보세요 🌱' : `${remainingChoresCount}개 남았어요`}
                </Text>
              </View>

              <View style={styles.choresProgressRight}>
                <Text style={styles.choresScorePoints}>⭐ {todayEarnedScore}</Text>
                <Text style={styles.choresScoreSub}>오늘 획득한 점수</Text>
              </View>
            </View>

            {/* ＋ 새 집안일 추가 버튼 */}
            <TouchableOpacity
              style={styles.addChoreDashedBtn}
              onPress={() => setAddChoreModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.addChoreDashedBtnText}>＋ 새 집안일 추가</Text>
            </TouchableOpacity>

            {/* 할 일 (N) 리스트 */}
            <View style={styles.choresListSection}>
              <Text style={styles.choresSectionHeading}>할 일 ({activeChores.length})</Text>

              <View style={styles.choresCardsContainer}>
                {activeChores.length > 0 ? (
                  activeChores.map((chore) => (
                    <TouchableOpacity
                      key={chore.id}
                      style={styles.choreItemCard}
                      onPress={() => handleToggleChoreItem(chore)}
                      onLongPress={() => handleDeleteChoreItem(chore)}
                      activeOpacity={0.85}
                    >
                      {/* 카테고리 대표 이모지 */}
                      <View style={[styles.choreIconBox, { backgroundColor: chore.iconBg }]}>
                        <Text style={styles.choreIconText}>{chore.icon}</Text>
                      </View>

                      {/* 집안일 정보: 제목, 태그, 담당자 */}
                      <View style={styles.choreDetailsCol}>
                        <Text style={styles.choreTitleText} numberOfLines={1}>
                          {chore.title}
                        </Text>

                        <View style={styles.choreMetaRow}>
                          <View style={[styles.choreTagBadge, { backgroundColor: chore.iconBg }]}>
                            <Text style={[styles.choreTagBadgeText, { color: chore.tagColor }]}>
                              {chore.category}
                            </Text>
                          </View>
                          {chore.repeat_type === 'daily' && (
                            <View style={styles.choreRepeatBadge}>
                              <Text style={styles.choreRepeatBadgeText}>🔄 매일</Text>
                            </View>
                          )}
                          <Text style={styles.choreAssigneeText}>→ {chore.assignee}</Text>
                        </View>
                      </View>

                      {/* 우측 포인트 및 완료 체크 버튼 */}
                      <View style={styles.choreRightCol}>
                        <Text style={styles.chorePointsText}>+{chore.points}</Text>
                        <TouchableOpacity
                          style={styles.choreCheckRoundBtn}
                          onPress={() => handleToggleChoreItem(chore)}
                          activeOpacity={0.7}
                        >
                          <Check size={14} color="#A8A29E" />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyChoresCard}>
                    <Text style={styles.emptyChoresEmoji}>🌱</Text>
                    <Text style={styles.emptyChoresTitle}>
                      {completedChoresList.length > 0
                        ? '오늘의 모든 집안일을 완료했어요! 🎉'
                        : '아직 등록된 집안일이 없어요'}
                    </Text>
                    <Text style={styles.emptyChoresSub}>
                      {completedChoresList.length > 0
                        ? '가족과 함께 여유로운 시간을 보내보세요 ☕'
                        : '위의 [＋ 새 집안일 추가] 버튼을 눌러 등록해보세요!'}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* 완료된 집안일 (N) 섹션 */}
            {completedChoresList.length > 0 && (
              <View style={styles.completedChoresSection}>
                <View style={styles.completedHeaderRow}>
                  <Text style={styles.completedSectionHeading}>
                    ✓ 완료 ({completedChoresList.length})
                  </Text>
                  <TouchableOpacity
                    style={styles.clearCompletedBtn}
                    onPress={handleClearCompleted}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={13} color="#FF6B47" style={{ marginRight: 4 }} />
                    <Text style={styles.clearCompletedBtnText}>완료 비우기</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.choresCardsContainer}>
                  {completedChoresList.map((chore) => (
                    <View
                      key={chore.id}
                      style={styles.completedChoreCard}
                    >
                      <TouchableOpacity
                        style={styles.completedCheckCircle}
                        onPress={() => handleToggleChoreItem(chore)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.completedCheckMark}>✓</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.choreDetailsCol}
                        onPress={() => handleToggleChoreItem(chore)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.completedChoreTitle} numberOfLines={1}>
                          {chore.title}
                        </Text>
                        <View style={styles.completedMetaRow}>
                          <Text style={styles.completedChoreMeta}>
                            {chore.assignee} · {chore.category}
                          </Text>
                          {chore.repeat_type === 'daily' && (
                            <View style={styles.choreRepeatBadge}>
                              <Text style={styles.choreRepeatBadgeText}>🔄 매일</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>

                      <View style={styles.completedRightActionsRow}>
                        <Text style={styles.completedPointsText}>+{chore.points}</Text>
                        <TouchableOpacity
                          style={styles.choreDeleteTouchBtn}
                          onPress={() => handleDeleteChoreItem(chore)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          activeOpacity={0.7}
                        >
                          <Trash2 size={15} color="#A8A29E" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* ========================================================= */}
        {/* 5. 서브탭 2: [🎮 게임] 탭 콘텐츠 (Figma 14:2175)          */}
        {/* ========================================================= */}
        {activeTab === 'games' && (
          <View style={styles.tabContentContainer}>
            {/* 상단 안내 배너 */}
            <View style={styles.gamesNoticeBanner}>
              <Text style={styles.gamesNoticeTitle}>🎮 반려몽과 놀며 성장 EXP를 모아요!</Text>
              <Text style={styles.gamesNoticeSub}>
                모든 게임은 짧고 재밌으며 반려몽을 쑥쑥 성장시킬 수 있어요.
              </Text>
            </View>

            {/* 1. 반려몽과 함께하는 3대 액션 게임 */}
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Gamepad2 size={18} color="#FF6B47" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#1C1917' }}>반려몽 액션 놀이터</Text>
                </View>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: canEarnReward ? '#FFF5F2' : '#F5F0E8',
                  borderWidth: 1,
                  borderColor: canEarnReward ? '#FFE8E0' : '#E7E5E4',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 12,
                }}>
                  <Gift size={11} color={canEarnReward ? '#FF6B47' : '#78716C'} style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: canEarnReward ? '#FF6B47' : '#78716C' }}>
                    오늘 내 보상 {dailyGameRewardCount}/{DAILY_GAME_REWARD_LIMIT}회
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: '#78716C', paddingHorizontal: 4, marginBottom: 10 }}>
                {canEarnReward
                  ? `가족 구성원 1인당 매일 최대 ${DAILY_GAME_REWARD_LIMIT}회까지 성장 EXP(+15 ~ +50 EXP)를 획득할 수 있어요!`
                  : `오늘의 1인 성장 보상을 모두 획득했습니다! 자유 연습 모드로 계속 플레이할 수 있어요.`}
              </Text>

              <View style={styles.gamesCardsList}>
                {/* 펫게임 1: 후르츠 닌자 */}
                <TouchableOpacity
                  style={styles.gameActionCard}
                  onPress={() => setIsSnackGameVisible(true)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.gameLargeIconBox, { backgroundColor: '#FFEDD5' }]}>
                    <Text style={styles.gameLargeIcon}>🍉</Text>
                  </View>
                  <View style={styles.gameInfoCol}>
                    <View style={styles.gameTitleRow}>
                      <Text style={styles.gameTitleText}>후르츠 닌자</Text>
                      <View style={[styles.gameBadgePill, { backgroundColor: '#FFEDD5' }]}>
                        <Text style={[styles.gameBadgePillText, { color: '#C2410C' }]}>슬라이스</Text>
                      </View>
                    </View>
                    <Text style={styles.gameDescText}>솟구치는 수박과 과일을 샥- 썰어 반려몽 먹방 완성!</Text>
                    <Text style={[styles.gamePointsText, { color: canEarnReward ? '#16A34A' : '#78716C' }]}>
                      {canEarnReward ? '+15 ~ +50 EXP 획득 🌱' : '자유 연습 모드 🎯 (EXP 완료)'}
                    </Text>
                  </View>
                  <Text style={styles.gameChevron}>›</Text>
                </TouchableOpacity>

                {/* 펫게임 2: 반려몽 카드 짝맞추기 */}
                <TouchableOpacity
                  style={styles.gameActionCard}
                  onPress={() => setIsCardMatchGameVisible(true)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.gameLargeIconBox, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={styles.gameLargeIcon}>🃏</Text>
                  </View>
                  <View style={styles.gameInfoCol}>
                    <View style={styles.gameTitleRow}>
                      <Text style={styles.gameTitleText}>카드 짝맞추기</Text>
                      <View style={[styles.gameBadgePill, { backgroundColor: '#FEF3C7' }]}>
                        <Text style={[styles.gameBadgePillText, { color: '#B45309' }]}>3×6 메모리 🃏</Text>
                      </View>
                    </View>
                    <Text style={styles.gameDescText}>뒤집힌 18장의 카드 속 반려몽과 보물들의 짝을 찾아라!</Text>
                    <Text style={[styles.gamePointsText, { color: canEarnReward ? '#16A34A' : '#78716C' }]}>
                      {canEarnReward ? '+25 ~ +50 EXP 획득 🌱' : '자유 연습 모드 🎯 (EXP 완료)'}
                    </Text>
                  </View>
                  <Text style={styles.gameChevron}>›</Text>
                </TouchableOpacity>

                {/* 펫게임 3: 비누방울 머지 */}
                <TouchableOpacity
                  style={styles.gameActionCard}
                  onPress={() => setIsBubbleGameVisible(true)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.gameLargeIconBox, { backgroundColor: '#E0F2FE' }]}>
                    <Text style={styles.gameLargeIcon}>🫧</Text>
                  </View>
                  <View style={styles.gameInfoCol}>
                    <View style={styles.gameTitleRow}>
                      <Text style={styles.gameTitleText}>비누방울 머지</Text>
                      <View style={[styles.gameBadgePill, { backgroundColor: '#E0F2FE' }]}>
                        <Text style={[styles.gameBadgePillText, { color: '#0284C7' }]}>머지퍼즐</Text>
                      </View>
                    </View>
                    <Text style={styles.gameDescText}>수박게임 스타일! 방울을 합쳐 대왕 무지개 거품 완성!</Text>
                    <Text style={[styles.gamePointsText, { color: canEarnReward ? '#16A34A' : '#78716C' }]}>
                      {canEarnReward ? '+15 ~ +50 EXP 획득 🌱' : '자유 연습 모드 🎯 (EXP 완료)'}
                    </Text>
                  </View>
                  <Text style={styles.gameChevron}>›</Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* 스몰톡 답변 작성 / 답변 열람 / 새 집안일 등록 모달 통합 컴포넌트 */}
      <SmallTalkModals
        answerModalVisible={answerModalVisible}
        setAnswerModalVisible={setAnswerModalVisible}
        topicTitle={topicTitle}
        answerText={answerText}
        setAnswerText={setAnswerText}
        handleSaveAnswer={handleSaveAnswer}
        viewingMemberAnswer={viewingMemberAnswer}
        setViewingMemberAnswer={setViewingMemberAnswer}
        addChoreModalVisible={addChoreModalVisible}
        setAddChoreModalVisible={setAddChoreModalVisible}
        newChoreTitle={newChoreTitle}
        setNewChoreTitle={setNewChoreTitle}
        previewIconMeta={previewIconMeta}
        membersList={membersList}
        newChoreAssignee={newChoreAssignee}
        setNewChoreAssignee={setNewChoreAssignee}
        newChoreRepeatType={newChoreRepeatType}
        setNewChoreRepeatType={setNewChoreRepeatType}
        handleCreateChore={handleCreateChore}
      />

      {/* ========================================================= */}
      {/* 반려몽 4대 체류형 액션 미니게임 모달                        */}
      {/* ========================================================= */}
      {/* 1. 와구와구 간식 캐치 */}
      <SnackCatchGame
        visible={isSnackGameVisible}
        character={petCharacter}
        transparentUrl={cleanPetmongUri || petCharacter?.image_url}
        canEarnReward={canEarnReward}
        remainingRewards={remainingRewards}
        onClose={() => setIsSnackGameVisible(false)}
        onGameComplete={(result) => handleCompletePetmongGame('후르츠 닌자', result)}
      />

      {/* 2. 반려몽 카드 짝맞추기 */}
      <CardMatchGame
        visible={isCardMatchGameVisible}
        character={petCharacter}
        transparentUrl={cleanPetmongUri || petCharacter?.image_url}
        canEarnReward={canEarnReward}
        remainingRewards={remainingRewards}
        onClose={() => setIsCardMatchGameVisible(false)}
        onGameComplete={(result) => handleCompletePetmongGame('카드 짝맞추기', result)}
      />

      {/* 3. 뽀득뽀득 버블 팝 */}
      <BubblePopGame
        visible={isBubbleGameVisible}
        character={petCharacter}
        transparentUrl={cleanPetmongUri || petCharacter?.image_url}
        canEarnReward={canEarnReward}
        remainingRewards={remainingRewards}
        onClose={() => setIsBubbleGameVisible(false)}
        onGameComplete={(result) => handleCompletePetmongGame('비누방울 머지', result)}
      />
    </View>
  );
}

