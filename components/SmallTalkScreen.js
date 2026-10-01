import React, { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react-native';
import UserAvatar from './UserAvatar';

// 한국형 생활 행동 기반 아이콘 & 카테고리 스마트 매퍼
export const getChoreIconMeta = (category, title = '') => {
  const safe = (title || '').toLowerCase();
  // 1. 쓰레기 / 분리수거
  if (safe.includes('분리수거') || safe.includes('쓰레기') || safe.includes('음식물') || safe.includes('재활용')) {
    return { icon: '🗑️', category: '분리수거', iconBg: '#C7D2FE', tagColor: '#1E40AF' };
  }
  // 2. 식사 / 설거지
  if (safe.includes('설거지') || safe.includes('식기') || safe.includes('그릇')) {
    return { icon: '🍽️', category: '설거지', iconBg: '#F5F0E8', tagColor: '#78716C' };
  }
  if (safe.includes('식탁') || safe.includes('요리') || safe.includes('밥') || safe.includes('저녁') || safe.includes('아침') || safe.includes('점심')) {
    return { icon: '🍳', category: '식사/요리', iconBg: '#FDE68A', tagColor: '#78350F' };
  }
  // 3. 청소 / 정리
  if (safe.includes('청소기') || safe.includes('청소') || safe.includes('물걸레') || safe.includes('걸레') || safe.includes('정리') || safe.includes('환기')) {
    return { icon: '🧹', category: '청소/정리', iconBg: '#DDD6FE', tagColor: '#5B21B6' };
  }
  // 4. 세탁 / 빨래
  if (safe.includes('빨래') || safe.includes('세탁') || safe.includes('건조기') || safe.includes('이불') || safe.includes('옷')) {
    return { icon: '🧺', category: '세탁/빨래', iconBg: '#FED7AA', tagColor: '#9A3412' };
  }
  // 5. 반려동물
  if (safe.includes('산책') || safe.includes('브루노') || safe.includes('강아지') || safe.includes('고양이') || safe.includes('배변')) {
    return { icon: '🐕', category: '반려동물', iconBg: '#A7F3D0', tagColor: '#064E3B' };
  }
  // 6. 식물 / 화분
  if (safe.includes('화분') || safe.includes('식물') || safe.includes('물 주기') || safe.includes('물주기')) {
    return { icon: '🌿', category: '식물관리', iconBg: '#BBF7D0', tagColor: '#166534' };
  }
  // 7. 욕실
  if (safe.includes('욕실') || safe.includes('화장실') || safe.includes('세면대') || safe.includes('변기')) {
    return { icon: '🚿', category: '욕실청소', iconBg: '#BFDBFE', tagColor: '#1E40AF' };
  }
  // 8. 심부름 / 장보기
  if (safe.includes('마트') || safe.includes('장보기') || safe.includes('심부름') || safe.includes('택배') || safe.includes('우유') || safe.includes('사오기')) {
    return { icon: '🛒', category: '심부름', iconBg: '#FBCFE8', tagColor: '#9D174D' };
  }

  const meta = {
    야외: { icon: '🌿', category: '야외', iconBg: '#A7F3D0', tagColor: '#064E3B' },
    거실: { icon: '🛋️', category: '거실', iconBg: '#DDD6FE', tagColor: '#5B21B6' },
    기타: { icon: '📋', category: '기타', iconBg: '#F5F0E8', tagColor: '#78716C' },
    침실: { icon: '🛏️', category: '침실', iconBg: '#FBCFE8', tagColor: '#9D174D' },
    욕실: { icon: '🚿', category: '욕실', iconBg: '#BFDBFE', tagColor: '#1E40AF' },
    주방: { icon: '🍳', category: '주방', iconBg: '#FDE68A', tagColor: '#78350F' },
  }[category];

  return meta || { icon: '✅', category: category || '할 일', iconBg: '#E8E0D0', tagColor: '#1C1917' };
};

export const renderGoalCategorySvg = () => null;

export default function SmallTalkScreen({
  smallTalkState = {},
  currentUser,
  currentUserProfile,
  points = 0,
  pointHistory = [],
  onAddResponse,
  onRedeemReward,
  onDeductPoints,
  familyMembers = [],
  rewardsList = [],
  onAddReward,
  onUpdateReward,
  onDeleteReward,
  userCoupons = [],
  onUseCoupon,
  coopGoal,
  onUpdateCoopGoal,
  messages = [],
  onSendOrderNotice,
  shoppingItems = [],
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onClearCompleted,
  onToggleRepeat,
}) {
  // Figma 2대 서브탭: 'chores' (✅ 집안일) | 'games' (🎮 게임)
  const [activeTab, setActiveTab] = useState('chores');

  // 대화 답변 작성 모달 상태 (로그인 사용자 전용)
  const [answerModalVisible, setAnswerModalVisible] = useState(false);
  const [answerText, setAnswerText] = useState('');

  // 다른 가족 멤버 답변 열람 모달 상태 (Read-Only)
  const [viewingMemberAnswer, setViewingMemberAnswer] = useState(null); // { member, text }

  // 집안일 추가 모달 상태
  const [addChoreModalVisible, setAddChoreModalVisible] = useState(false);
  const [newChoreTitle, setNewChoreTitle] = useState('');
  const [newChorePoints, setNewChorePoints] = useState('20');
  const [newChoreAssignee, setNewChoreAssignee] = useState('가족 전체');
  const [newChoreRepeatType, setNewChoreRepeatType] = useState('daily'); // 'none' (오늘만) | 'daily' (매일 반복)

  // 실시간 스마트 카테고리 프리뷰 (제목 키워드 자동 분석)
  const previewIconMeta = useMemo(() => getChoreIconMeta(null, newChoreTitle), [newChoreTitle]);

  // 로컬 집안일 상태
  const [fallbackChores, setFallbackChores] = useState([]);

  // 게임 실행 모달 상태 (가족 퀴즈, 짝 맞추기, 사진 챌린지)
  const [quizModalVisible, setQuizModalVisible] = useState(false);
  const [matchModalVisible, setMatchModalVisible] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);

  // 1. 가족 멤버 구성 (기본 4인: 엄마, 아빠, 지수, 민준)
  const membersList = useMemo(() => {
    if (familyMembers && familyMembers.length > 0) {
      return familyMembers;
    }
    return [
      { id: 'm1', name: '엄마', role: '엄마', avatar: '👩', color: '#FFA500' },
      { id: 'm2', name: '아빠', role: '아빠', avatar: '👨', color: '#87CEEB' },
      { id: 'm3', name: '지수', role: '지수', avatar: '👧', color: '#DDA0DD' },
      { id: 'm4', name: '민준', role: '민준', avatar: '👦', color: '#90EE90' },
    ];
  }, [familyMembers]);

  // 2. 오늘의 대화 주제 및 응답 계산 (FamLink 기존 스몰톡 기능 100% 연동)
  const { topic = '', responses = {} } = smallTalkState || {};
  const topicTitle = useMemo(() => {
    if (!topic) return '오늘 가장 많이 웃었던 일은 무엇인가요? 😂';
    if (typeof topic === 'string') return topic;
    return topic.text || topic.title || '오늘 하루 가장 기억에 남는 순간은?';
  }, [topic]);

  const topicCategory = useMemo(() => {
    if (typeof topic === 'object' && topic?.category) return topic.category;
    return '오늘의 스몰톡 질문';
  }, [topic]);

  const myId = currentUserProfile?.id;
  const myName = currentUserProfile?.name || (typeof currentUser === 'string' ? currentUser : '');
  const myRole = currentUserProfile?.role;

  // 멤버별 스몰톡 답변 조회 (고유 ID 우선, 이름 차선 - 역할 role 기반 공유 절대 방지)
  const getMemberResponse = (member) => {
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
  const isCurrentMember = (member) => {
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
    return membersList.find(m => isCurrentMember(m)) || membersList[0];
  }, [membersList, myId, myName]);

  // 빠른 인라인 답변 텍스트 상태
  const [quickAnswerText, setQuickAnswerText] = useState('');

  // 3. 집안일 목록 구성 (DB shoppingItems 실시간 양방향 동기화)
  const choresList = useMemo(() => {
    const source = (shoppingItems !== undefined && shoppingItems !== null) ? shoppingItems : fallbackChores;
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
  const todayEarnedScore = completedChoresList.reduce((sum, c) => sum + (c.points || 20), 0);

  // 집안일 완료 토글 (홈 화면 퀘스트 보드와 양방향 100% 실시간 연동)
  const handleToggleChoreItem = (chore) => {
    if (onToggleItem) {
      onToggleItem(chore.rawItem || chore, !chore.is_completed);
    } else {
      setFallbackChores(prev =>
        prev.map(c => (c.id === chore.id ? { ...c, is_completed: !c.is_completed } : c))
      );
    }
  };

  // 집안일 개별 삭제 핸들러 (할 일 및 완료 항목 공통)
  const handleDeleteChoreItem = (chore) => {
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
      `완료된 1회성 집안일 ${oneTimeCompleted.length}개를 목록에서 비우시겠습니까?\n(매일 반복 루틴은 유지됩니다)`,
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
    const pts = parseInt(newChorePoints, 10) || 20;
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
    setNewChorePoints('20');
    setNewChoreRepeatType('daily');
    setAddChoreModalVisible(false);
    const repeatLabel = newChoreRepeatType === 'daily' ? '매일 루틴' : '오늘만';
    Alert.alert('등록 완료 🎉', `'${trimmedTitle}' [${repeatLabel}] 집안일이 추가되었습니다!`);
  };

  // 내 대화 답변 모달 열기 (로그인한 사용자 전용)
  const handleOpenAnswerModal = () => {
    setAnswerText(myAnswer || '');
    setAnswerModalVisible(true);
  };

  // 가족 멤버 항목 탭: 본인이면 작성/수정, 타인이면 답변 열람 모달 팝업
  const handlePressMemberCard = (member) => {
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

  // -------------------------------------------------------------
  // 게임 1: 가족 퀴즈 로직
  // -------------------------------------------------------------
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const QUIZ_QUESTIONS = [
    { q: '우리 가족 반려몽이 가장 좋아하는 간식은?', options: ['🍗 닭다리', '🥦 브로콜리', '🍰 케이크', '🥕 당근'], ans: 0 },
    { q: '오늘 함께하는 미션 완료 시 받을 수 있는 보너스는?', options: ['50점', '100점', '200점', '500점'], ans: 2 },
    { q: '온 가족이 모이는 저녁 시간은 언제일까요?', options: ['오후 6시', '오후 7시', '오후 8시', '오후 9시'], ans: 1 },
  ];

  const handleSelectQuizAnswer = (optionIdx) => {
    const isCorrect = optionIdx === QUIZ_QUESTIONS[quizIndex].ans;
    if (isCorrect) {
      setQuizScore(prev => prev + 50);
      Alert.alert('정답입니다! 🎉', '+50 포인트를 획득했습니다!');
    } else {
      Alert.alert('아쉬워요!', '다음 문제에 도전해보세요!');
    }

    if (quizIndex + 1 < QUIZ_QUESTIONS.length) {
      setQuizIndex(prev => prev + 1);
    } else {
      Alert.alert('퀴즈 완료! 🏆', `총 ${quizScore + (isCorrect ? 50 : 0)}점을 획득했습니다!`, [
        {
          text: '확인',
          onPress: () => {
            setQuizModalVisible(false);
            setQuizIndex(0);
            setQuizScore(0);
          },
        },
      ]);
    }
  };

  // -------------------------------------------------------------
  // 게임 2: 짝 맞추기 (Memory Card Match)
  // -------------------------------------------------------------
  const [cards, setCards] = useState([
    { id: 1, icon: '🐶', isFlipped: false, isMatched: false },
    { id: 2, icon: '🍕', isFlipped: false, isMatched: false },
    { id: 3, icon: '🐶', isFlipped: false, isMatched: false },
    { id: 4, icon: '🌟', isFlipped: false, isMatched: false },
    { id: 5, icon: '🍕', isFlipped: false, isMatched: false },
    { id: 6, icon: '🌟', isFlipped: false, isMatched: false },
  ]);
  const [selectedCards, setSelectedCards] = useState([]);

  const handleFlipCard = (card) => {
    if (card.isFlipped || card.isMatched || selectedCards.length >= 2) return;

    const nextCards = cards.map(c => c.id === card.id ? { ...c, isFlipped: true } : c);
    setCards(nextCards);

    const newSelected = [...selectedCards, card];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      const [first, second] = newSelected;
      if (first.icon === second.icon) {
        setTimeout(() => {
          setCards(prev => prev.map(c => (c.id === first.id || c.id === second.id) ? { ...c, isMatched: true } : c));
          setSelectedCards([]);
        }, 500);
      } else {
        setTimeout(() => {
          setCards(prev => prev.map(c => (c.id === first.id || c.id === second.id) ? { ...c, isFlipped: false } : c));
          setSelectedCards([]);
        }, 800);
      }
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================= */}
        {/* 1. 상단 헤더 & 포인트 배지 (Figma 14:1676)                */}
        {/* ========================================================= */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeftCol}>
            <Text style={styles.categorySubText}>우리 가족 일상</Text>
            <Text style={styles.headerMainTitle}>오늘 함께</Text>
          </View>

          <View style={styles.pointsBadgePill}>
            <Text style={styles.pointsBadgeText}>⭐ {points.toLocaleString()} pts</Text>
          </View>
        </View>

        {/* ========================================================= */}
        {/* 2. 오늘의 대화 주제 카드 (Figma 14:1689)                  */}
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
                  placeholder="오늘의 스몰톡 답변 남기기... (+20 EXP, +5P)"
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

            {/* 가족 멤버별 답변 리스트 (엄마, 아빠, 지수, 민준) */}
            <View style={styles.membersAnswerList}>
              {membersList.map((member, idx) => {
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
              })}
            </View>

            {/* 카드 하단 200점 보너스 배너 */}
            <View style={styles.dailyTalkBonusBanner}>
              <Text style={styles.dailyTalkBonusText}>모두 참여하면 가족 +200점 🎁</Text>
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
              <Text style={styles.gamesNoticeTitle}>🎮 게임으로 가족 포인트를 모아요!</Text>
              <Text style={styles.gamesNoticeSub}>
                모든 게임은 짧고 재밌으며 온 가족이 즐길 수 있어요.
              </Text>
            </View>

            {/* 3대 인터랙티브 게임 카드 목록 */}
            <View style={styles.gamesCardsList}>
              {/* 게임 1: 가족 퀴즈 */}
              <TouchableOpacity
                style={styles.gameActionCard}
                onPress={() => setQuizModalVisible(true)}
                activeOpacity={0.85}
              >
                <View style={[styles.gameLargeIconBox, { backgroundColor: '#FDE68A' }]}>
                  <Text style={styles.gameLargeIcon}>🧠</Text>
                </View>

                <View style={styles.gameInfoCol}>
                  <View style={styles.gameTitleRow}>
                    <Text style={styles.gameTitleText}>가족 퀴즈</Text>
                    <View style={[styles.gameBadgePill, { backgroundColor: '#FDE68A' }]}>
                      <Text style={[styles.gameBadgePillText, { color: '#78350F' }]}>지식</Text>
                    </View>
                  </View>

                  <Text style={styles.gameDescText}>온 가족이 함께 즐기는 재미있는 문제</Text>
                  <Text style={styles.gamePointsText}>최대 150점</Text>
                </View>

                <Text style={styles.gameChevron}>›</Text>
              </TouchableOpacity>

              {/* 게임 2: 짝 맞추기 */}
              <TouchableOpacity
                style={styles.gameActionCard}
                onPress={() => setMatchModalVisible(true)}
                activeOpacity={0.85}
              >
                <View style={[styles.gameLargeIconBox, { backgroundColor: '#DDD6FE' }]}>
                  <Text style={styles.gameLargeIcon}>🃏</Text>
                </View>

                <View style={styles.gameInfoCol}>
                  <View style={styles.gameTitleRow}>
                    <Text style={styles.gameTitleText}>짝 맞추기</Text>
                    <View style={[styles.gameBadgePill, { backgroundColor: '#DDD6FE' }]}>
                      <Text style={[styles.gameBadgePillText, { color: '#5B21B6' }]}>두뇌</Text>
                    </View>
                  </View>

                  <Text style={styles.gameDescText}>카드를 뒤집어 같은 그림을 찾아보세요</Text>
                  <Text style={styles.gamePointsText}>최대 100점</Text>
                </View>

                <Text style={styles.gameChevron}>›</Text>
              </TouchableOpacity>

              {/* 게임 3: 사진 챌린지 */}
              <TouchableOpacity
                style={styles.gameActionCard}
                onPress={() => setPhotoModalVisible(true)}
                activeOpacity={0.85}
              >
                <View style={[styles.gameLargeIconBox, { backgroundColor: '#FBCFE8' }]}>
                  <Text style={styles.gameLargeIcon}>📸</Text>
                </View>

                <View style={styles.gameInfoCol}>
                  <View style={styles.gameTitleRow}>
                    <Text style={styles.gameTitleText}>사진 챌린지</Text>
                    <View style={[styles.gameBadgePill, { backgroundColor: '#FBCFE8' }]}>
                      <Text style={[styles.gameBadgePillText, { color: '#9D174D' }]}>창의</Text>
                    </View>
                  </View>

                  <Text style={styles.gameDescText}>집 안 곳곳을 사진으로 찍고 포인트 받기</Text>
                  <Text style={styles.gamePointsText}>최대 60점</Text>
                </View>

                <Text style={styles.gameChevron}>›</Text>
              </TouchableOpacity>
            </View>

            {/* 일일 보너스 배너 */}
            <View style={styles.dailyBonusBanner}>
              <Text style={styles.dailyBonusIcon}>🌟</Text>
              <View style={styles.dailyBonusInfo}>
                <Text style={styles.dailyBonusTitle}>일일 보너스</Text>
                <Text style={styles.dailyBonusSub}>
                  오늘 3가지 게임을 모두 완료하면 추가 50점을 드려요!
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ========================================================= */}
      {/* 모달 1: 대화 주제 답변 작성 모달                          */}
      {/* ========================================================= */}
      <Modal visible={answerModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalTopRow}>
              <Text style={styles.modalMainTitle}>내 스몰톡 답변 남기기</Text>
              <TouchableOpacity onPress={() => setAnswerModalVisible(false)}>
                <X size={20} color="#78716C" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalTopicTitle}>{topicTitle}</Text>

            <TextInput
              style={styles.modalTextInput}
              placeholder="가족에게 전할 따뜻한 마음을 입력해보세요..."
              placeholderTextColor="#A8A29E"
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
                <Text style={styles.modalSubmitBtnText}>답변 등록 (+20 EXP)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================= */}
      {/* 모달 1-2: 다른 가족 멤버 답변 열람 모달 (Read-Only)      */}
      {/* ========================================================= */}
      <Modal
        visible={Boolean(viewingMemberAnswer)}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingMemberAnswer(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* 상단 프로필 및 닫기 버튼 */}
            <View style={styles.modalTopRow}>
              <View style={styles.viewerHeaderInfo}>
                <View style={[styles.memberAvatarRing, { backgroundColor: 'rgba(255, 107, 71, 0.15)', marginRight: 10 }]}>
                  <UserAvatar avatar={viewingMemberAnswer?.member?.avatar} size={24} />
                </View>
                <View>
                  <Text style={styles.modalMainTitle}>
                    {viewingMemberAnswer?.member?.name || viewingMemberAnswer?.member?.role} 님의 답변
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
                <X size={20} color="#78716C" />
              </TouchableOpacity>
            </View>

            {/* 오늘의 질문 */}
            <View style={styles.viewerTopicBox}>
              <Text style={styles.viewerTopicLabel}>오늘의 대화 질문</Text>
              <Text style={styles.viewerTopicTitle}>{topicTitle}</Text>
            </View>

            {/* 답변 본문 */}
            <View style={styles.viewerContentBox}>
              <Text style={styles.viewerQuoteMark}>“</Text>
              <ScrollView style={styles.viewerScrollContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.viewerAnswerText}>
                  {viewingMemberAnswer?.text}
                </Text>
              </ScrollView>
              <Text style={[styles.viewerQuoteMark, { textAlign: 'right' }]}>”</Text>
            </View>

            {/* 닫기 / 공감 버튼 */}
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

      {/* ========================================================= */}
      {/* 모달 2: 새 집안일 추가 모달                                */}
      {/* ========================================================= */}
      <Modal visible={addChoreModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalTopRow}>
              <Text style={styles.modalMainTitle}>새 집안일 등록</Text>
              <TouchableOpacity onPress={() => setAddChoreModalVisible(false)}>
                <X size={20} color="#78716C" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInputSingle}
              placeholder="집안일 제목 (예: 분리수거하기)"
              placeholderTextColor="#A8A29E"
              value={newChoreTitle}
              onChangeText={setNewChoreTitle}
            />

            <View style={styles.modalFieldRow}>
              <Text style={styles.modalFieldLabel}>보상 포인트 (P):</Text>
              <TextInput
                style={styles.modalNumberInput}
                keyboardType="numeric"
                value={newChorePoints}
                onChangeText={setNewChorePoints}
              />
            </View>

            {/* 자동 스마트 카테고리 실시간 프리뷰 */}
            <View style={styles.modalFieldCol}>
              <Text style={styles.modalFieldLabel}>자동 분류 태그:</Text>
              <View style={styles.autoCategoryPreviewRow}>
                <View style={[styles.autoCategoryPill, { backgroundColor: previewIconMeta.iconBg }]}>
                  <Text style={styles.autoCategoryEmoji}>{previewIconMeta.icon}</Text>
                  <Text style={[styles.autoCategoryLabel, { color: previewIconMeta.tagColor }]}>
                    {previewIconMeta.category}
                  </Text>
                </View>
                <Text style={styles.autoCategoryHint}>✨ 제목 키워드로 자동 지정돼요</Text>
              </View>
            </View>

            <View style={styles.modalFieldCol}>
              <Text style={styles.modalFieldLabel}>담당 가족:</Text>
              <View style={styles.categoryChipsRow}>
                {['가족 전체', ...membersList.map(m => m.name || m.role)].filter((v, i, a) => a.indexOf(v) === i).map(mem => (
                  <TouchableOpacity
                    key={mem}
                    style={[styles.categoryChip, newChoreAssignee === mem && styles.categoryChipActive]}
                    onPress={() => setNewChoreAssignee(mem)}
                  >
                    <Text style={[styles.categoryChipText, newChoreAssignee === mem && styles.categoryChipTextActive]}>
                      {mem}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 반복 주기 설정 (오늘만 vs 매일 반복) */}
            <View style={styles.modalFieldCol}>
              <Text style={styles.modalFieldLabel}>반복 설정:</Text>
              <View style={styles.repeatToggleRow}>
                <TouchableOpacity
                  style={[styles.repeatTabBtn, newChoreRepeatType === 'none' && styles.repeatTabBtnActive]}
                  onPress={() => setNewChoreRepeatType('none')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.repeatTabText, newChoreRepeatType === 'none' && styles.repeatTabTextActive]}>
                    📌 오늘만 (1회성)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.repeatTabBtn, newChoreRepeatType === 'daily' && styles.repeatTabBtnActive]}
                  onPress={() => setNewChoreRepeatType('daily')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.repeatTabText, newChoreRepeatType === 'daily' && styles.repeatTabTextActive]}>
                    🔄 매일 반복 (루틴)
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.repeatHintText}>
                {newChoreRepeatType === 'daily'
                  ? '✨ 매일 자정(00:00)이 지나면 새로운 오늘 할 일로 자동 갱신돼요'
                  : '✨ 오늘 완료하면 끝나는 일회성 할 일이에요'}
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

      {/* ========================================================= */}
      {/* 모달 3: 가족 퀴즈 게임 모달                                */}
      {/* ========================================================= */}
      <Modal visible={quizModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.gameModalCard}>
            <View style={styles.modalTopRow}>
              <Text style={styles.modalMainTitle}>🧠 가족 퀴즈 (Q{quizIndex + 1}/3)</Text>
              <TouchableOpacity onPress={() => setQuizModalVisible(false)}>
                <X size={20} color="#78716C" />
              </TouchableOpacity>
            </View>

            <Text style={styles.quizQuestionText}>{QUIZ_QUESTIONS[quizIndex]?.q}</Text>

            <View style={styles.quizOptionsCol}>
              {QUIZ_QUESTIONS[quizIndex]?.options.map((opt, oIdx) => (
                <TouchableOpacity
                  key={oIdx}
                  style={styles.quizOptionBtn}
                  onPress={() => handleSelectQuizAnswer(oIdx)}
                >
                  <Text style={styles.quizOptionText}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* 모달 4: 짝 맞추기 게임 모달                                */}
      {/* ========================================================= */}
      <Modal visible={matchModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.gameModalCard}>
            <View style={styles.modalTopRow}>
              <Text style={styles.modalMainTitle}>🃏 짝 맞추기 게임</Text>
              <TouchableOpacity onPress={() => setMatchModalVisible(false)}>
                <X size={20} color="#78716C" />
              </TouchableOpacity>
            </View>

            <Text style={styles.gameModalSubtitle}>같은 이모지 카드 2장을 뒤집어 맞춰보세요!</Text>

            <View style={styles.cardsGrid}>
              {cards.map(card => (
                <TouchableOpacity
                  key={card.id}
                  style={[styles.memoryCardBox, card.isFlipped && styles.memoryCardFlipped]}
                  onPress={() => handleFlipCard(card)}
                >
                  <Text style={styles.memoryCardText}>
                    {card.isFlipped || card.isMatched ? card.icon : '❓'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* 모달 5: 사진 챌린지 모달                                   */}
      {/* ========================================================= */}
      <Modal visible={photoModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.gameModalCard}>
            <View style={styles.modalTopRow}>
              <Text style={styles.modalMainTitle}>📸 사진 챌린지</Text>
              <TouchableOpacity onPress={() => setPhotoModalVisible(false)}>
                <X size={20} color="#78716C" />
              </TouchableOpacity>
            </View>

            <Text style={styles.gameModalSubtitle}>
              오늘의 미션: "가장 아늑한 우리 집 공간을 찍어주세요!"
            </Text>

            <TouchableOpacity
              style={styles.photoUploadArea}
              onPress={() => {
                Alert.alert('미션 완료! 🎉', '+60 포인트가 가족 적립되었습니다!');
                setPhotoModalVisible(false);
              }}
            >
              <Camera size={44} color="#FF6B47" style={{ marginBottom: 8 }} />
              <Text style={styles.photoUploadText}>사진 촬영 및 업로드</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F3', // Figma node 1:700 배경색
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },

  // 1. 헤더 섹션
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerLeftCol: {
    justifyContent: 'center',
  },
  categorySubText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A8A29E',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerMainTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#1C1917',
    letterSpacing: -0.5,
  },
  pointsBadgePill: {
    backgroundColor: '#FDE68A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  pointsBadgeText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#78350F',
  },

  sectionPad: {
    paddingHorizontal: 20,
    marginTop: 12,
  },

  // 2. 오늘의 대화 주제 카드 (Figma 14:1689)
  dailyTalkCard: {
    backgroundColor: '#FAF5FF', // 소프트 라벤더
    borderRadius: 24,
    borderWidth: 1.2,
    borderColor: '#C4B5FD',
    padding: 18,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  dailyTalkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(196, 181, 253, 0.35)',
    paddingBottom: 14,
    marginBottom: 14,
  },
  dailyTalkHeaderLeft: {
    flex: 1,
    paddingRight: 10,
  },
  dailyTalkTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  dailyTalkTag: {
    fontSize: 10,
    fontWeight: '900',
    color: '#7C3AED',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  participationBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  participationBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#6D28D9',
  },
  dailyTalkTopicRow: {
    marginBottom: 4,
  },
  dailyTalkTopicText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1C1917',
    lineHeight: 22,
  },
  dailyTalkSubText: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  gaugeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#C4B5FD',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeCircleText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#7C3AED',
  },

  // 인라인 바로 답변 입력창
  quickAnswerInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 14,
    gap: 8,
  },
  quickAnswerInput: {
    flex: 1,
    fontSize: 13,
    color: '#1C1917',
    paddingVertical: 6,
  },
  quickAnswerSubmitBtn: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAnswerSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  // 내 답변 완료 배너
  myAnswerConfirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.2,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    gap: 10,
  },
  myAnswerCheckIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  myAnswerConfirmedTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
    marginBottom: 2,
  },
  myAnswerConfirmedText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  myAnswerEditBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },

  // 가족 답변 카드 리스트
  membersAnswerList: {
    gap: 10,
  },
  memberAnswerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  myMemberAnswerCard: {
    backgroundColor: '#FFFDF9',
    borderColor: '#FDBA74',
  },
  memberAvatarRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberAnswerInfoCol: {
    flex: 1,
  },
  memberAnswerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  memberAnswerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberAnswerName: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1C1917',
  },
  mySelfBadge: {
    backgroundColor: '#FF6B47',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  mySelfBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  memberStatusActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chevronArrowInline: {
    fontSize: 16,
    color: '#C4B5A0',
    fontWeight: '700',
    marginLeft: 2,
    lineHeight: 18,
  },
  myActionPill: {
    backgroundColor: 'rgba(255, 107, 71, 0.1)',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  myActionPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF6B47',
  },
  answeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  answeredBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  waitingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A8A29E',
  },
  memberAnswerSnippet: {
    fontSize: 12,
    color: '#A8A29E',
    fontWeight: '500',
  },
  memberAnswerSnippetDone: {
    color: '#44403C',
    fontWeight: '600',
  },
  dailyTalkBonusBanner: {
    marginTop: 14,
    backgroundColor: '#EDE9FE',
    borderWidth: 1.2,
    borderColor: '#C4B5FD',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dailyTalkBonusText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#6D28D9',
  },

  // 3. 서브탭 스위처: [✅ 집안일] vs [🎮 게임]
  subTabSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F0E8',
    borderRadius: 16,
    padding: 5,
  },
  subTabSegmentBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  subTabSegmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  subTabSegmentText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#A8A29E',
  },
  subTabSegmentTextActive: {
    color: '#FF6B47',
    fontWeight: '900',
  },

  // 4. 서브탭 1: 집안일 탭
  tabContentContainer: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  choresProgressBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FF6B47',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#FF6B47',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  choresProgressLeft: {
    justifyContent: 'center',
  },
  choresProgressMainText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  choresProgressSubText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  choresProgressRight: {
    alignItems: 'flex-end',
  },
  choresScorePoints: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  choresScoreSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },

  // 새 집안일 추가 대시 버튼
  addChoreDashedBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  addChoreDashedBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#78716C',
  },

  choresListSection: {
    marginBottom: 20,
  },
  choresSectionHeading: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1C1917',
    marginBottom: 12,
  },
  choresCardsContainer: {
    gap: 12,
  },
  emptyChoresCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  emptyChoresEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyChoresTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1917',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyChoresSub: {
    fontSize: 13,
    color: '#78716C',
    textAlign: 'center',
  },
  choreItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  choreIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  choreIconText: {
    fontSize: 24,
  },
  choreDetailsCol: {
    flex: 1,
  },
  choreTitleText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1C1917',
    marginBottom: 4,
  },
  choreMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  choreTagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  choreTagBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  choreRepeatBadge: {
    backgroundColor: 'rgba(255, 107, 71, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  choreRepeatBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF6B47',
  },
  choreAssigneeText: {
    fontSize: 12,
    color: '#78716C',
    fontWeight: '600',
  },
  choreRightCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  chorePointsText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FF6B47',
  },
  choreCheckRoundBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F5F0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 완료된 집안일
  completedChoresSection: {
    marginTop: 10,
  },
  completedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  completedSectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#A8A29E',
  },
  clearCompletedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 71, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  clearCompletedBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF6B47',
  },
  completedChoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F0E8',
    borderRadius: 16,
    padding: 14,
    opacity: 0.85,
  },
  completedRightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 8,
  },
  choreDeleteTouchBtn: {
    padding: 4,
  },
  completedCheckCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8E0D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  completedCheckMark: {
    fontSize: 16,
    fontWeight: '900',
    color: '#78716C',
  },
  completedChoreTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#78716C',
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  completedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  completedChoreMeta: {
    fontSize: 12,
    color: '#A8A29E',
  },
  completedPointsText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#A8A29E',
  },

  // 5. 서브탭 2: 게임 탭
  gamesNoticeBanner: {
    backgroundColor: 'rgba(255, 107, 71, 0.08)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 107, 71, 0.25)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  gamesNoticeTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FF6B47',
    marginBottom: 4,
  },
  gamesNoticeSub: {
    fontSize: 13,
    color: '#78716C',
    lineHeight: 18,
  },
  gamesCardsList: {
    gap: 14,
    marginBottom: 18,
  },
  gameActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  gameLargeIconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  gameLargeIcon: {
    fontSize: 32,
  },
  gameInfoCol: {
    flex: 1,
  },
  gameTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  gameTitleText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1C1917',
  },
  gameBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  gameBadgePillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  gameDescText: {
    fontSize: 13,
    color: '#78716C',
    marginBottom: 6,
    lineHeight: 18,
  },
  gamePointsText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FF6B47',
  },
  gameChevron: {
    fontSize: 24,
    color: '#D1D5DC',
    fontWeight: '700',
    marginLeft: 6,
  },
  dailyBonusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(167, 243, 208, 0.25)',
    borderWidth: 1.2,
    borderColor: '#6EE7B7',
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  dailyBonusIcon: {
    fontSize: 30,
  },
  dailyBonusInfo: {
    flex: 1,
  },
  dailyBonusTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#064E3B',
    marginBottom: 2,
  },
  dailyBonusSub: {
    fontSize: 12,
    color: '#065F46',
    lineHeight: 16,
  },

  // 모달 공통 스타일
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  modalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalMainTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C1917',
  },
  modalTopicTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#7C3AED',
    marginBottom: 12,
    lineHeight: 20,
  },
  viewerHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalSubHeaderRole: {
    fontSize: 12,
    color: '#78716C',
    fontWeight: '600',
    marginTop: 2,
  },
  viewerTopicBox: {
    backgroundColor: '#FAF8F3',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E0D0',
    padding: 12,
    marginBottom: 14,
  },
  viewerTopicLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF6B47',
    marginBottom: 4,
  },
  viewerTopicTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1917',
    lineHeight: 19,
  },
  viewerContentBox: {
    backgroundColor: '#FFFDF8',
    borderWidth: 1.2,
    borderColor: '#FED7AA',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 18,
  },
  viewerQuoteMark: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FDBA74',
    lineHeight: 22,
  },
  viewerScrollContent: {
    maxHeight: 220,
    marginVertical: 4,
  },
  viewerAnswerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#292524',
    lineHeight: 23,
  },
  viewerConfirmBtn: {
    backgroundColor: '#FF6B47',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerConfirmBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalTextInput: {
    backgroundColor: '#FAF8F3',
    borderWidth: 1,
    borderColor: '#E8E0D0',
    borderRadius: 14,
    padding: 14,
    minHeight: 100,
    fontSize: 14,
    color: '#1C1917',
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalInputSingle: {
    backgroundColor: '#FAF8F3',
    borderWidth: 1,
    borderColor: '#E8E0D0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1C1917',
    marginBottom: 14,
  },
  modalFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalFieldCol: {
    marginBottom: 14,
  },
  modalFieldLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1917',
    marginBottom: 6,
  },
  modalNumberInput: {
    width: 80,
    backgroundColor: '#FAF8F3',
    borderWidth: 1,
    borderColor: '#E8E0D0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: '#FF6B47',
  },
  autoCategoryPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  autoCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 5,
  },
  autoCategoryEmoji: {
    fontSize: 16,
  },
  autoCategoryLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  autoCategoryHint: {
    fontSize: 12,
    color: '#A8A29E',
    fontWeight: '500',
  },
  categoryChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F5F0E8',
  },
  categoryChipActive: {
    backgroundColor: '#FF6B47',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78716C',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  repeatToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F5F0E8',
    borderRadius: 12,
    padding: 3,
    marginTop: 4,
    gap: 4,
  },
  repeatTabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
  },
  repeatTabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  repeatTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78716C',
  },
  repeatTabTextActive: {
    color: '#FF6B47',
    fontWeight: '800',
  },
  repeatHintText: {
    fontSize: 12,
    color: '#A8A29E',
    marginTop: 6,
    fontWeight: '500',
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#F5F0E8',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#78716C',
  },
  modalSubmitBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#FF6B47',
    alignItems: 'center',
  },
  modalSubmitBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // 게임 공통 모달
  gameModalCard: {
    width: '90%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    alignItems: 'stretch',
  },
  gameModalSubtitle: {
    fontSize: 14,
    color: '#78716C',
    marginBottom: 16,
    lineHeight: 20,
  },
  quizQuestionText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1C1917',
    marginBottom: 18,
    lineHeight: 24,
  },
  quizOptionsCol: {
    gap: 10,
  },
  quizOptionBtn: {
    backgroundColor: '#FAF8F3',
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  quizOptionText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1917',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  memoryCardBox: {
    width: '30%',
    height: 80,
    backgroundColor: '#F5F0E8',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: '#E8E0D0',
  },
  memoryCardFlipped: {
    backgroundColor: '#EDE9FE',
    borderColor: '#C4B5FD',
  },
  memoryCardText: {
    fontSize: 28,
  },
  photoUploadArea: {
    backgroundColor: '#FFF5F2',
    borderWidth: 1.5,
    borderColor: '#FFB39F',
    borderStyle: 'dashed',
    borderRadius: 18,
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoUploadText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FF6B47',
  },
});
