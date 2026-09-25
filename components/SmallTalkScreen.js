import React, { useState, useEffect } from 'react';
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
  Award,
  Check,
  MessageSquare,
  ShoppingBag,
  Trophy,
  Lock,
  Plus,
  X,
  Ticket,
  CheckCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Coins,
  Pencil,
  Trash2,
  Target,
  BookOpen,
  Sparkles,
  ShoppingCart,
  Crown,
  ChevronRight,
  PartyPopper,
  Utensils,
  Compass,
  Tv,
  Coffee,
  History,
} from 'lucide-react-native';
import FamilyStorybookModal from './FamilyStorybookModal';
import { colors, typography, commonStyles } from '../theme';
import ShoppingListScreen from './ShoppingListScreen';
import UserAvatar from './UserAvatar';

const DEFAULT_COOP_GOALS = [
  { id: 'g1', title: '주말 패밀리 맛집 외식 데이', targetPoints: 3000, category: 'dinner', desc: '온 가족이 다 함께 먹고 싶은 메뉴 자유 외식' },
  { id: 'g2', title: '가족 1박 2일 글램핑/여행', targetPoints: 5000, category: 'travel', desc: '자연 속에서 힐링하는 가족 힐링 캠핑' },
  { id: 'g3', title: '거실 홈시네마 & 팝콘 파티', targetPoints: 1500, category: 'cinema', desc: '보고 싶었던 최신 영화와 맛있는 스낵 파티' },
  { id: 'g4', title: '가족 보드게임 & 디저트 카페 나들이', targetPoints: 2000, category: 'cafe', desc: '달콤한 디저트와 함께 즐기는 보드게임 시간' },
];

export const renderGoalCategorySvg = (category, size = 20, color = '#FF7E82') => {
  switch (category) {
    case 'storybook':
    case 'book':
      return <BookOpen size={size} color={color} />;
    case 'dinner':
      return <Utensils size={size} color={color} />;
    case 'travel':
      return <Compass size={size} color={color} />;
    case 'cinema':
      return <Tv size={size} color={color} />;
    case 'cafe':
      return <Coffee size={size} color={color} />;
    default:
      return <Target size={size} color={color} />;
  }
};

export default function SmallTalkScreen({
  smallTalkState,
  currentUser,
  currentUserProfile,
  points,
  pointHistory = [],
  onAddResponse,
  onRedeemReward,
  onDeductPoints,
  familyMembers,
  rewardsList,
  onAddReward,
  onUpdateReward,
  onDeleteReward,
  userCoupons,
  onUseCoupon,
  coopGoal,
  onUpdateCoopGoal,
  messages,
  onSendOrderNotice,
  shoppingItems = [],
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onClearCompleted,
  onToggleRepeat,
}) {
  const [activeSubTab, setActiveSubTab] = useState('smalltalk'); // 'smalltalk', 'shopping', 'rewards'
  const [answer, setAnswer] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all', 'earn', 'spend'
  const [editingRewardId, setEditingRewardId] = useState(null);

  // Co-op Goal & Storybook States
  const [storybookVisible, setStorybookVisible] = useState(false);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [customGoalTitle, setCustomGoalTitle] = useState('');
  const [customGoalPoints, setCustomGoalPoints] = useState('2000');
  const [goalPresets, setGoalPresets] = useState(DEFAULT_COOP_GOALS);
  const [editingPresetId, setEditingPresetId] = useState(null);
  const [editPresetTitle, setEditPresetTitle] = useState('');
  const [editPresetPoints, setEditPresetPoints] = useState('3000');
  const [editPresetCategory, setEditPresetCategory] = useState('dinner');
  const [achievedGoals, setAchievedGoals] = useState([]);
  const [achievedGoalsModalVisible, setAchievedGoalsModalVisible] = useState(false);
  const [goalCelebrationModalVisible, setGoalCelebrationModalVisible] = useState(false);
  const [lastAchievedGoal, setLastAchievedGoal] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('FAMLINK_ACHIEVED_GOALS');
        if (stored) {
          setAchievedGoals(JSON.parse(stored));
        }
      } catch (e) {
        console.log('Error loading achieved goals', e);
      }

      try {
        const storedPresets = await AsyncStorage.getItem('FAMLINK_COOP_GOAL_PRESETS');
        if (storedPresets) {
          const parsed = JSON.parse(storedPresets);
          const cleanPresets = parsed.filter(p => p.category !== 'storybook' && p.id !== 'g0');
          setGoalPresets(cleanPresets.length > 0 ? cleanPresets : DEFAULT_COOP_GOALS);
        }
      } catch (e) {
        console.log('Error loading goal presets', e);
      }
    })();
  }, []);

  const handleStartEditPreset = (preset) => {
    setEditingPresetId(preset.id);
    setEditPresetTitle(preset.title);
    setEditPresetPoints(String(preset.targetPoints));
    setEditPresetCategory(preset.category || 'dinner');
  };

  const handleSaveEditPreset = async (presetId) => {
    if (!editPresetTitle.trim()) {
      Alert.alert('알림', '목표 이름을 입력해주세요.');
      return;
    }
    const pts = parseInt(editPresetPoints, 10);
    if (isNaN(pts) || pts <= 0) {
      Alert.alert('알림', '올바른 목표 포인트를 입력해주세요.');
      return;
    }

    const updated = goalPresets.map(p => {
      if (p.id === presetId) {
        return {
          ...p,
          title: editPresetTitle.trim(),
          targetPoints: pts,
          category: editPresetCategory,
        };
      }
      return p;
    });

    setGoalPresets(updated);
    setEditingPresetId(null);
    try {
      await AsyncStorage.setItem('FAMLINK_COOP_GOAL_PRESETS', JSON.stringify(updated));
    } catch (e) {
      console.log('Error saving goal presets', e);
    }

    if (coopGoal && (coopGoal.id === presetId || coopGoal.title === editPresetTitle.trim())) {
      if (onUpdateCoopGoal) {
        onUpdateCoopGoal({
          id: presetId,
          title: editPresetTitle.trim(),
          targetPoints: pts,
          category: editPresetCategory,
          desc: '가족이 함께 모으는 버킷리스트',
        });
      }
    }
  };

  const handleDeletePreset = (preset) => {
    Alert.alert(
      '목표 삭제',
      `'${preset.title}' 목표를 목록에서 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            const updated = goalPresets.filter(p => p.id !== preset.id);
            setGoalPresets(updated);
            try {
              await AsyncStorage.setItem('FAMLINK_COOP_GOAL_PRESETS', JSON.stringify(updated));
            } catch (e) {
              console.log('Error deleting goal preset', e);
            }

            if (coopGoal && (coopGoal.id === preset.id || coopGoal.title === preset.title)) {
              const fallback = updated[0] || DEFAULT_COOP_GOALS[0];
              if (onUpdateCoopGoal && fallback) {
                onUpdateCoopGoal(fallback);
              }
            }
          },
        },
      ]
    );
  };

  const handleAddCustomGoal = async () => {
    if (!customGoalTitle.trim()) {
      Alert.alert('알림', '목표 이름을 입력해주세요.');
      return;
    }
    const pts = parseInt(customGoalPoints, 10);
    if (isNaN(pts) || pts <= 0) {
      Alert.alert('알림', '올바른 목표 포인트를 입력해주세요.');
      return;
    }

    const newPreset = {
      id: `custom-${Date.now()}`,
      title: customGoalTitle.trim(),
      targetPoints: pts,
      category: 'custom',
      desc: '가족이 직접 정한 특별한 버킷리스트',
    };

    const updatedPresets = [...goalPresets, newPreset];
    setGoalPresets(updatedPresets);
    try {
      await AsyncStorage.setItem('FAMLINK_COOP_GOAL_PRESETS', JSON.stringify(updatedPresets));
    } catch (e) {
      console.log('Error adding goal preset', e);
    }

    if (onUpdateCoopGoal) {
      onUpdateCoopGoal(newPreset);
    }

    setCustomGoalTitle('');
    setGoalModalVisible(false);
    Alert.alert('목표 생성 완료', `'${newPreset.title}' 목표가 설정되었습니다!`);
  };

  const handleClaimCoopGoal = async (targetGoal, targetPts) => {
    if (targetGoal.category === 'storybook' || targetGoal.id === 'g0') {
      setStorybookVisible(true);
      return;
    }

    Alert.alert(
      '가족 버킷리스트 달성!',
      `우리 가족이 함께 모은 ${targetPts.toLocaleString()} P를 사용하여 '${targetGoal.title}' 목표를 달성하시겠습니까?\n\n달성 시 가족 단톡방에 축하 공지가 발송됩니다!`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '달성 & 파티 열기',
          onPress: async () => {
            if (onDeductPoints) {
              await onDeductPoints(targetPts, `[버킷리스트 달성] ${targetGoal.title}`);
            }

            if (onSendOrderNotice) {
              await onSendOrderNotice(
                `🎉 [가족 버킷리스트 달성!] 우리 가족이 함께 ${targetPts.toLocaleString()} P를 모아 '${targetGoal.title}' 버킷리스트를 달성했습니다! 온 가족 모두 축하해 주세요! 🥳🍕`
              );
            }

            const newAchieved = {
              id: `achieved-${Date.now()}`,
              title: targetGoal.title,
              category: targetGoal.category || 'general',
              targetPoints: targetPts,
              achievedAt: new Date().toISOString(),
            };

            const updatedHistory = [newAchieved, ...achievedGoals];
            setAchievedGoals(updatedHistory);
            try {
              await AsyncStorage.setItem('FAMLINK_ACHIEVED_GOALS', JSON.stringify(updatedHistory));
            } catch (e) {
              console.log('Error saving achieved goal history', e);
            }

            setLastAchievedGoal(newAchieved);
            setGoalCelebrationModalVisible(true);
          },
        },
      ]
    );
  };

  // Custom Coupon Form States
  const [couponTitle, setCouponTitle] = useState('');
  const [couponCost, setCouponCost] = useState('100');
  const [couponDesc, setCouponDesc] = useState('');
  const [couponProvider, setCouponProvider] = useState('');

  // Coupon Wallet Tab State ('available', 'used', 'expired')
  const [walletTab, setWalletTab] = useState('available');

  const DEFAULT_MEMBERS = {
    mom: { name: '엄마', avatar: '👩‍🦰', color: '#FF7E82' },
    dad: { name: '아빠', avatar: '👨‍💼', color: '#4A90E2' },
    son: { name: '아들', avatar: '👦', color: '#2ECC71' },
    daughter: { name: '딸', avatar: '👧', color: '#F39C12' },
  };

  const getMemberInfo = (roleKey) => {
    if (familyMembers && Array.isArray(familyMembers)) {
      const match = familyMembers.find(m => m && typeof m === 'object' && m.role === roleKey);
      if (match) {
        return { name: match.name, avatar: match.avatar, color: match.color };
      }
    }
    return DEFAULT_MEMBERS[roleKey] || { name: roleKey, avatar: '👦', color: '#8E8E93' };
  };

  const { topic, responses, pointsAwarded } = smallTalkState;

  const myId = currentUserProfile?.id;
  const myRole = currentUserProfile?.role || currentUser;
  const hasAnswered = Boolean(
    responses && (
      (myId ? Boolean(responses[myId]) : false) ||
      (!myId && (
        (myRole && Boolean(responses[myRole])) ||
        Boolean(responses[currentUser])
      ))
    )
  );

  // Calculate unique answered count
  let answeredCount = 0;
  if (responses) {
    if (familyMembers && Array.isArray(familyMembers) && familyMembers.length > 0) {
      answeredCount = familyMembers.filter(m => {
        if (m && typeof m === 'object' && m.id) {
          return Boolean(responses[m.id]);
        }
        const roleK = m?.role || m;
        return Boolean(responses[roleK]);
      }).length;
    } else {
      answeredCount = Object.keys(responses).length;
    }
  }

  const totalCount = familyMembers && Array.isArray(familyMembers) && familyMembers.length > 0
    ? familyMembers.length
    : 4;
  const isMissionComplete = totalCount > 0 && answeredCount >= totalCount;

  const handleSubmit = () => {
    if (!answer.trim()) {
      Alert.alert('알림', '한 마디 답변을 적어주세요!');
      return;
    }

    onAddResponse(currentUser, answer);
    setAnswer('');
  };

  const handleRedeem = (reward) => {
    if (points < reward.cost) {
      Alert.alert('포인트 부족', '포인트가 부족하여 쿠폰을 교환할 수 없습니다. 스몰톡 미션을 완료해보세요!');
      return;
    }

    Alert.alert(
      '쿠폰 교환',
      `[${reward.title}]을(를) ${reward.cost} 포인트로 교환하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '교환하기',
          onPress: async () => {
            const success = await onRedeemReward(reward);
            if (success !== false) {
              Alert.alert('교환 완료 🎉', `[${reward.title}] 쿠폰이 발급되었습니다! 내 쿠폰함에서 확인하세요.`);
            }
          }
        }
      ]
    );
  };

  const handleOpenAddModal = () => {
    setEditingRewardId(null);
    setCouponTitle('');
    setCouponCost('100');
    setCouponDesc('');
    setCouponProvider(currentUserProfile?.name || '');
    setModalVisible(true);
  };

  const handleStartEditReward = (reward) => {
    setEditingRewardId(reward.id);
    setCouponTitle(reward.title);
    setCouponCost(String(reward.cost));
    setCouponDesc(reward.description || reward.desc || '');
    setCouponProvider(reward.provider || '');
    setModalVisible(true);
  };

  const handleDeleteRewardClick = (reward) => {
    Alert.alert(
      '쿠폰 삭제',
      `'${reward.title}' 쿠폰을 상점에서 삭제하시겠습니까?\n\n(이미 가족이 발급받아 보유 중인 쿠폰은 안전하게 유지됩니다.)`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            if (onDeleteReward) onDeleteReward(reward.id);
            Alert.alert('삭제 완료', `'${reward.title}' 쿠폰이 상점에서 삭제되었습니다.`);
          }
        }
      ]
    );
  };

  const canManageReward = (reward) => {
    const myName = currentUserProfile?.name;
    const myRole = currentUserProfile?.role || currentUser;
    if (reward.provider && (reward.provider === myName || reward.provider === myRole)) {
      return true;
    }
    if (myRole === 'mom' || myRole === 'dad') {
      return true;
    }
    if (reward.provider === '아들' && (myRole === 'son' || myRole === '아들')) {
      return true;
    }
    if (reward.provider === '딸' && (myRole === 'daughter' || myRole === '딸')) {
      return true;
    }
    if (reward.provider === '엄마' && (myRole === 'mom' || myRole === '엄마')) {
      return true;
    }
    if (reward.provider === '아빠' && (myRole === 'dad' || myRole === '아빠')) {
      return true;
    }
    return false;
  };

  const handleSubmitRewardForm = () => {
    if (!couponTitle.trim()) {
      Alert.alert('알림', '쿠폰 명칭을 입력해주세요.');
      return;
    }
    const costNum = parseInt(couponCost, 10);
    if (isNaN(costNum) || costNum <= 0) {
      Alert.alert('알림', '올바른 포인트를 입력해주세요.');
      return;
    }

    const rewardPayload = {
      title: couponTitle.trim(),
      cost: costNum,
      desc: couponDesc.trim() || '가족 소통을 위한 보상 쿠폰입니다.',
      provider: couponProvider.trim() || (currentUserProfile?.name || '가족 전체'),
    };

    if (editingRewardId) {
      if (onUpdateReward) onUpdateReward(editingRewardId, rewardPayload);
      Alert.alert('수정 완료', `'${couponTitle.trim()}' 쿠폰 정보가 수정되었습니다.`);
    } else {
      if (onAddReward) onAddReward(rewardPayload);
      Alert.alert('등록 완료', `'${couponTitle.trim()}' 쿠폰이 새로 등록되었습니다.`);
    }

    setEditingRewardId(null);
    setCouponTitle('');
    setCouponCost('100');
    setCouponDesc('');
    setCouponProvider('');
    setModalVisible(false);
  };

  const handleUseCouponClick = (coupon) => {
    Alert.alert(
      '쿠폰 사용 확인',
      `'${coupon.title}' 쿠폰을 ${coupon.provider || '가족'}님에게 사용하시겠습니까?\n\n사용 완료 시 가족 단체 대화방에 사용 알림이 자동 전송됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '사용하기',
          onPress: () => {
            if (onUseCoupon) onUseCoupon(coupon);
            Alert.alert('사용 완료 🎟️', `'${coupon.title}' 쿠폰이 사용 처리되었으며, 가족 단체 대화방에 알림이 전송되었습니다!`);
          }
        }
      ]
    );
  };

  // Point Ledger Summary Calculations
  const totalEarned = (pointHistory || [])
    .filter(item => item.type === 'earn')
    .reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalSpent = (pointHistory || [])
    .filter(item => item.type === 'spend')
    .reduce((sum, item) => sum + (item.amount || 0), 0);
  const filteredHistory = (pointHistory || []).filter(item => {
    if (historyFilter === 'earn') return item.type === 'earn';
    if (historyFilter === 'spend') return item.type === 'spend';
    return true;
  });

  const getTodayString = (dateObj = new Date()) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getDDayDays = (expireDateStr) => {
    if (!expireDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(expireDateStr)) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = expireDateStr.split('-').map(Number);
    const expDate = new Date(y, m - 1, d);
    expDate.setHours(23, 59, 59, 999);
    const diffTime = expDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const todayStr = getTodayString();
  const availableCoupons = [];
  const usedCoupons = [];
  const expiredCoupons = [];

  (userCoupons || []).forEach(c => {
    if (c.status === 'used') {
      usedCoupons.push(c);
    } else if (c.expire_date && c.expire_date < todayStr) {
      expiredCoupons.push(c);
    } else {
      availableCoupons.push(c);
    }
  });

  // Stack available coupons by title & provider
  const stackedAvailableCoupons = [];
  const stackMap = {};

  availableCoupons.forEach(coupon => {
    const key = `${coupon.title}_${coupon.provider || '가족'}`;
    if (!stackMap[key]) {
      stackMap[key] = {
        title: coupon.title,
        provider: coupon.provider || '가족',
        cost: coupon.cost,
        expire_date: coupon.expire_date,
        items: [coupon],
      };
      stackedAvailableCoupons.push(stackMap[key]);
    } else {
      stackMap[key].items.push(coupon);
      if (coupon.expire_date && (!stackMap[key].expire_date || coupon.expire_date < stackMap[key].expire_date)) {
        stackMap[key].expire_date = coupon.expire_date;
      }
    }
  });

  const activeShoppingCount = Array.isArray(shoppingItems)
    ? shoppingItems.filter(i => !i.is_completed).length
    : 0;

  return (
    <View style={styles.container}>
      {/* Sub-header Bar */}
      <View style={styles.subHeaderBar}>
        <View>
          <Text style={styles.subHeaderTitle}>미션 & 혜택</Text>
          <Text style={styles.subHeaderSub}>소통 · 장보기 · 포인트 보상</Text>
        </View>

        <View style={styles.subHeaderRight}>
          <TouchableOpacity
            style={styles.pointChip}
            activeOpacity={0.8}
            onPress={() => setHistoryModalVisible(true)}
          >
            <Trophy size={14} color="#F1C40F" style={{ marginRight: 4 }} />
            <Text style={styles.pointChipText}>{points} P</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3-Segment Sub Tabs */}
      <View style={styles.subTabBar}>
        <TouchableOpacity
          style={[styles.subTabItem, activeSubTab === 'smalltalk' && styles.subTabItemActive]}
          onPress={() => setActiveSubTab('smalltalk')}
          activeOpacity={0.7}
        >
          <MessageSquare
            size={15}
            color={activeSubTab === 'smalltalk' ? '#FF7E82' : '#8E8E93'}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.subTabText, activeSubTab === 'smalltalk' && styles.subTabTextActive]}>
            스몰톡
          </Text>
          {!hasAnswered && <View style={styles.subTabBadgeDot} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabItem, activeSubTab === 'shopping' && styles.subTabItemActive]}
          onPress={() => setActiveSubTab('shopping')}
          activeOpacity={0.7}
        >
          <ShoppingCart
            size={15}
            color={activeSubTab === 'shopping' ? '#FF7E82' : '#8E8E93'}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.subTabText, activeSubTab === 'shopping' && styles.subTabTextActive]}>
            장보기/심부름
          </Text>
          {activeShoppingCount > 0 && (
            <View style={styles.subTabCountBadge}>
              <Text style={styles.subTabCountBadgeText}>{activeShoppingCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabItem, activeSubTab === 'rewards' && styles.subTabItemActive]}
          onPress={() => setActiveSubTab('rewards')}
          activeOpacity={0.7}
        >
          <ShoppingBag
            size={15}
            color={activeSubTab === 'rewards' ? '#FF7E82' : '#8E8E93'}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.subTabText, activeSubTab === 'rewards' && styles.subTabTextActive]}>
            포인트 & 혜택
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAB 1: SMALL TALK (소통 미션) */}
      {activeSubTab === 'smalltalk' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Daily Topic Box */}
          <View style={styles.topicCard}>
            <View style={styles.topicHeader}>
              <Award size={18} color="#FF7E82" style={{ marginRight: 6 }} />
              <Text style={styles.topicTag}>오늘의 소통 미션 (답변당 +5P / 전원 +30P)</Text>
            </View>
            <Text style={styles.topicTitle}>"{topic}"</Text>

            {isMissionComplete && (
              <View style={styles.completedBadge}>
                <Trophy size={14} color="#196F3D" style={{ marginRight: 6 }} />
                <Text style={styles.completedBadgeText}>가족 전원 미션 완료! 보너스 30P 획득 🎉</Text>
              </View>
            )}
          </View>

          {/* Answer Submission Card (Prioritized at Top if Unanswered so user never has to scroll past 10 cards) */}
          {!hasAnswered && (
            <View style={styles.actionCard}>
              <Text style={styles.actionTitle}>오늘 미션 참여하기 ✍️</Text>
              <Text style={styles.actionDesc}>나의 답변을 적으면 즉시 +5P, 가족 전원 완료 시 +30P 보너스를 받아요!</Text>

              <TextInput
                style={styles.textInput}
                placeholder="오늘의 주제에 대해 가볍게 답해보세요."
                placeholderTextColor="#AEAEB2"
                value={answer}
                onChangeText={setAnswer}
              />

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <MessageSquare size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.submitButtonText}>답변 등록</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 10-Member Quick Status Rail (Horizontal at a glance) */}
          <View style={styles.quickRailCard}>
            <View style={styles.quickRailHeader}>
              <Text style={styles.quickRailTitle}>
                가족 참여 현황 ({answeredCount} / {totalCount}명)
              </Text>
              {isMissionComplete && (
                <View style={styles.quickRailDoneBadge}>
                  <Check size={11} color="#059669" />
                  <Text style={styles.quickRailDoneText}>전원 완료 🎉</Text>
                </View>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickRailScroll}>
              {(familyMembers && Array.isArray(familyMembers) ? familyMembers : Object.keys(DEFAULT_MEMBERS)).map((item) => {
                const isDbProfile = typeof item === 'object' && ('id' in item || 'role' in item);
                const roleKey = isDbProfile ? item.role : item;
                const memberInfo = getMemberInfo(roleKey);
                const responseText = isDbProfile
                  ? (item.id ? responses?.[item.id] : responses?.[item.role])
                  : responses?.[roleKey];
                const isAnswered = !!responseText;
                const memberName = isDbProfile ? item.name : memberInfo.name;
                const memberAvatar = isDbProfile ? item.avatar : memberInfo.avatar;

                return (
                  <View
                    key={isDbProfile ? (item.id || item.role) : roleKey}
                    style={[styles.quickChip, isAnswered && styles.quickChipAnswered]}
                  >
                    <Text style={styles.quickChipAvatar}>{memberAvatar}</Text>
                    <Text style={[styles.quickChipName, isAnswered && styles.quickChipNameAnswered]}>
                      {memberName}
                    </Text>
                    {isAnswered ? (
                      <Check size={11} color="#059669" style={{ marginLeft: 3 }} />
                    ) : (
                      <View style={styles.quickChipWaitingDot} />
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>

          {/* Answered State Confirmation Banner */}
          {hasAnswered && (
            <View style={styles.actionCardDone}>
              <Check size={24} color="#2ECC71" style={{ marginBottom: 6 }} />
              <Text style={styles.doneTitle}>오늘의 답변을 성공적으로 남겼습니다!</Text>
              <Text style={styles.doneDesc}>다른 가족들도 모두 답변하면 미션 포인트가 적립됩니다.</Text>
              <Text style={styles.myAnswerText}>
                내 답변: "{(myId && responses?.[myId]) || responses?.[currentUser] || (myRole && responses?.[myRole]) || ''}"
              </Text>
            </View>
          )}

          {/* Detailed Responses List */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>가족 답변 상세 ({answeredCount}/{totalCount})</Text>

            {(familyMembers && Array.isArray(familyMembers) ? familyMembers : Object.keys(DEFAULT_MEMBERS)).map((item) => {
              const isDbProfile = typeof item === 'object' && ('id' in item || 'role' in item);
              const roleKey = isDbProfile ? item.role : item;
              const memberInfo = getMemberInfo(roleKey);
              const responseText = isDbProfile
                ? (item.id ? responses?.[item.id] : responses?.[item.role])
                : responses?.[roleKey];
              const isAnswered = !!responseText;

              const memberName = isDbProfile ? item.name : memberInfo.name;
              const memberAvatar = isDbProfile ? item.avatar : memberInfo.avatar;
              const memberColor = isDbProfile ? item.color : memberInfo.color;

              return (
                <View key={isDbProfile ? (item.id || item.role) : roleKey} style={styles.memberRow}>
                  <UserAvatar
                    avatar={memberAvatar}
                    size={36}
                    borderColor={memberColor + '40'}
                    style={{ marginRight: 10 }}
                  />

                  <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                      <Text style={[styles.memberName, { color: memberColor }]}>{memberName}</Text>
                      {isAnswered ? (
                        <View style={styles.checkBadge}>
                          <Check size={10} color="#FFFFFF" />
                          <Text style={styles.checkText}>답변 완료</Text>
                        </View>
                      ) : (
                        <Text style={styles.waitingText}>답변 대기 중</Text>
                      )}
                    </View>

                    {isAnswered ? (
                      <Text style={styles.responseText}>{responseText}</Text>
                    ) : (
                      <Text style={styles.emptyResponseText}>아직 오늘 답변을 등록하지 않았습니다.</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* TAB 2: SHOPPING & CHORES (생활 미션) */}
      {activeSubTab === 'shopping' && (
        <View style={{ flex: 1 }}>
          <ShoppingListScreen
            embedded={true}
            shoppingItems={shoppingItems}
            currentUserProfile={currentUserProfile}
            familyMembers={familyMembers}
            onAddItem={onAddItem}
            onToggleItem={onToggleItem}
            onDeleteItem={onDeleteItem}
            onClearCompleted={onClearCompleted}
            onToggleRepeat={onToggleRepeat}
          />
        </View>
      )}

      {/* TAB 3: REWARDS & BOOK STUDIO (보상 & 출판 센터) */}
      {activeSubTab === 'rewards' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Points Banner (Clickable to open Point History) */}
          <TouchableOpacity
            style={styles.pointsBanner}
            activeOpacity={0.85}
            onPress={() => setHistoryModalVisible(true)}
          >
            <View style={styles.pointsInfo}>
              <View style={styles.pointsLabelRow}>
                <Text style={styles.pointsLabel}>우리 가족의 총 포인트</Text>
                <View style={styles.historyBadgeBtn}>
                  <Text style={styles.historyBadgeBtnText}>내역 보기 ›</Text>
                </View>
              </View>
              <View style={styles.pointsRow}>
                <Trophy size={24} color="#F1C40F" style={{ marginRight: 6 }} />
                <Text style={styles.pointsValue}>{points}</Text>
                <Text style={styles.pointsUnit}> P</Text>
              </View>
            </View>
            <View style={styles.missionProgressBox}>
              <Text style={styles.progressText}>오늘의 미션</Text>
              <Text style={styles.progressValue}>{answeredCount} / {totalCount} 완료</Text>
            </View>
          </TouchableOpacity>

          {/* Family Co-op Goal Funding Card */}
          {(() => {
            const currentGoal = coopGoal || DEFAULT_COOP_GOALS[0];
            const targetPts = currentGoal.targetPoints || 2000;
            const pct = Math.min(100, Math.round((points / targetPts) * 100));
            const isFinished = points >= targetPts;
            const diffPts = Math.max(0, targetPts - points);

            return (
              <View style={[styles.coopCard, isFinished && styles.coopCardFinished]}>
                <View style={styles.coopHeaderRow}>
                  <View style={styles.coopTagBadge}>
                    <Target size={13} color="#FF7E82" style={{ marginRight: 4 }} />
                    <Text style={styles.coopTagText}>공동 펀딩 버킷리스트</Text>
                  </View>

                  <View style={styles.coopHeaderBtnGroup}>
                    {/* Hall of Fame / Achieved Goals Button */}
                    <TouchableOpacity
                      style={styles.coopHistoryBtn}
                      onPress={() => setAchievedGoalsModalVisible(true)}
                      activeOpacity={0.7}
                    >
                      <Trophy size={12} color="#D97706" style={{ marginRight: 3 }} />
                      <Text style={styles.coopHistoryBtnText}>
                        달성 ({achievedGoals.length})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.coopChangeBtn}
                      onPress={() => setGoalModalVisible(true)}
                      activeOpacity={0.7}
                    >
                      <Pencil size={12} color="#8E8E93" style={{ marginRight: 3 }} />
                      <Text style={styles.coopChangeBtnText}>목표 변경</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.coopTitleRow}>
                  <View style={[styles.coopGoalIconBox, isFinished && { backgroundColor: '#E8F8F0' }]}>
                    {renderGoalCategorySvg(currentGoal.category, 22, isFinished ? '#2ECC71' : '#FF7E82')}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.coopGoalTitle}>{currentGoal.title}</Text>
                    <Text style={styles.coopGoalSub}>
                      목표: {targetPts.toLocaleString()} P • 모은 포인트: {points.toLocaleString()} P
                    </Text>
                  </View>
                  <View style={[styles.coopPercentBadge, isFinished && { backgroundColor: '#E8F8F0' }]}>
                    <Text style={[styles.coopPercentText, isFinished && { color: '#2ECC71' }]}>{pct}%</Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.coopProgressTrack}>
                  <View
                    style={[
                      styles.coopProgressBar,
                      { width: `${pct}%` },
                      isFinished && { backgroundColor: '#2ECC71' },
                    ]}
                  />
                </View>

                {/* Status Note */}
                <View style={styles.coopFooterRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    {isFinished ? (
                      <CheckCircle2 size={15} color="#27AE60" style={{ marginRight: 5 }} />
                    ) : (
                      <Sparkles size={14} color="#FF7E82" style={{ marginRight: 5 }} />
                    )}
                    <Text style={[styles.coopStatusText, isFinished && { color: '#27AE60', fontWeight: '800' }]}>
                      {isFinished
                        ? `100% 달성 완료! [${currentGoal.title}]을(를) 달성했어요!`
                        : `목표까지 ${diffPts.toLocaleString()} P 남았어요! 가족과 함께 모아봐요 ✨`}
                    </Text>
                  </View>
                </View>

                {/* 100% Reached: Claim & Party Action Button */}
                {isFinished && (
                  <TouchableOpacity
                    style={styles.coopClaimBtn}
                    onPress={() => handleClaimCoopGoal(currentGoal, targetPts)}
                    activeOpacity={0.85}
                  >
                    <PartyPopper size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.coopClaimBtnText}>
                      버킷리스트 달성! 포인트 사용하고 파티 열기
                    </Text>
                    <ChevronRight size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })()}

          {/* Reward Shop & Coupon Wallet Navigation */}
          <View style={styles.shopCard}>
            <View style={styles.shopHeader}>
              <View style={styles.shopHeaderTitleRow}>
                <ShoppingBag size={18} color="#FF7E82" style={{ marginRight: 6 }} />
                <Text style={styles.shopTitle}>포인트 쿠폰 상점</Text>
              </View>

              <View style={styles.headerBtnGroup}>
                {/* My Coupon Wallet Button */}
                <TouchableOpacity style={styles.walletBtn} onPress={() => setWalletModalVisible(true)}>
                  <Ticket size={14} color="#4A90E2" style={{ marginRight: 4 }} />
                  <Text style={styles.walletBtnText}>내 쿠폰함 ({availableCoupons.length})</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.addRewardBtn} onPress={handleOpenAddModal}>
                  <Plus size={14} color="#FF7E82" style={{ marginRight: 2 }} />
                  <Text style={styles.addRewardBtnText}>쿠폰 등록</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.shopDesc}>미션으로 모은 포인트로 가족 상호 간 쿠폰을 교환해 보세요.</Text>

            {(!rewardsList || rewardsList.length === 0) ? (
              <Text style={styles.emptyShopText}>아직 등록된 쿠폰이 없습니다. 첫 쿠폰을 등록해 보세요!</Text>
            ) : (
              rewardsList.map((reward) => {
                const canAfford = points >= reward.cost;
                const ownedCoupons = (userCoupons || []).filter(
                  c => c.status === 'available' && (c.reward_id === reward.id || c.title === reward.title)
                );
                const ownedCount = ownedCoupons.length;

                return (
                  <View key={reward.id} style={styles.rewardItem}>
                    <View style={styles.rewardDetails}>
                      <View style={styles.rewardTitleRow}>
                        <Text style={styles.rewardTitle}>{reward.title}</Text>
                        {ownedCount > 0 && (
                          <View style={styles.ownedCouponBadge}>
                            <Text style={styles.ownedCouponBadgeText}>보유 {ownedCount}장</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.rewardDesc}>{reward.description || reward.desc}</Text>
                      <View style={styles.rewardProviderRow}>
                        <Text style={styles.rewardProvider}>쿠폰 제공자: {reward.provider}</Text>
                        {canManageReward(reward) && (
                          <View style={styles.rewardManageButtons}>
                            <TouchableOpacity
                              style={styles.rewardManageBtn}
                              onPress={() => handleStartEditReward(reward)}
                              activeOpacity={0.7}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Pencil size={11} color="#8E8E93" style={{ marginRight: 2 }} />
                              <Text style={styles.rewardManageBtnText}>수정</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.rewardManageBtn}
                              onPress={() => handleDeleteRewardClick(reward)}
                              activeOpacity={0.7}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Trash2 size={11} color="#FF6B6B" style={{ marginRight: 2 }} />
                              <Text style={[styles.rewardManageBtnText, { color: '#FF6B6B' }]}>삭제</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.rewardActionRow}>
                      {ownedCount > 0 && (
                        <TouchableOpacity
                          style={styles.useCouponDirectBtn}
                          onPress={() => handleUseCouponClick(ownedCoupons[0])}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.useCouponDirectBtnText}>사용하기</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.redeemButton, !canAfford && styles.redeemDisabled]}
                        onPress={() => handleRedeem(reward)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.redeemButtonText}>교환 ({reward.cost}P)</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* ============================================================ */}
          {/* 👑 우리 가족의 최종 목표: 실물 이야기책 출판 스튜디오 (Grand Finale) */}
          {/* ============================================================ */}
          <View style={styles.masterpieceCard}>
            {/* Header Badge */}
            <View style={styles.masterpieceHeaderRow}>
              <View style={styles.masterpieceCrownBadge}>
                <Crown size={13} color="#B45309" style={{ marginRight: 4 }} />
                <Text style={styles.masterpieceCrownText}>우리 가족의 최종 프로젝트</Text>
              </View>
              <View style={styles.masterpieceSpecBadge}>
                <Text style={styles.masterpieceSpecText}>6개월 목표: 2,500 P • A5 양장본</Text>
              </View>
            </View>

            {/* Main Visual & Title */}
            <View style={styles.masterpieceTitleRow}>
              <View style={styles.masterpieceBookIconBox}>
                <BookOpen size={26} color="#92400E" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.masterpieceTitle}>우리 가족 실물 이야기책 출판 📖</Text>
                <Text style={styles.masterpieceSub}>
                  가족의 6개월 일상과 문답이 모여 완성되는 영원한 기록
                </Text>
              </View>
            </View>

            {/* Narrative Description */}
            <Text style={styles.masterpieceDesc}>
              매일 스몰톡에서 나눈 속마음과 채팅방의 소중한 사진들을 엮어, 인쇄소에서 정식 발간되는 세상에 단 한 권뿐인 하드커버 양장본 책으로 간직해 보세요.
            </Text>

            {/* Archive Content Highlights */}
            <View style={styles.masterpieceStatsRow}>
              <View style={styles.masterpieceStatChip}>
                <MessageSquare size={12} color="#92400E" style={{ marginRight: 4 }} />
                <Text style={styles.masterpieceStatText}>
                  스몰톡 문답 {Object.keys(responses || {}).length}개
                </Text>
              </View>
              <View style={styles.masterpieceStatChip}>
                <Sparkles size={12} color="#92400E" style={{ marginRight: 4 }} />
                <Text style={styles.masterpieceStatText}>
                  Gemini AI 가족 연대기
                </Text>
              </View>
              <View style={styles.masterpieceStatChip}>
                <CheckCircle size={12} color="#059669" style={{ marginRight: 4 }} />
                <Text style={[styles.masterpieceStatText, { color: '#059669' }]}>
                  언제든 제작/열람 가능
                </Text>
              </View>
            </View>

            {/* Grand Action Button */}
            <TouchableOpacity
              style={styles.masterpieceEnterBtn}
              onPress={() => setStorybookVisible(true)}
              activeOpacity={0.85}
            >
              <View style={styles.masterpieceBtnMainRow}>
                <BookOpen size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.masterpieceEnterBtnTitle} numberOfLines={1}>
                  이야기책 스튜디오 입장하기
                </Text>
                <ChevronRight size={16} color="#FDE68A" style={{ marginLeft: 4 }} />
              </View>
              <Text style={styles.masterpieceEnterBtnSub} numberOfLines={1}>
                A5 양장본 미리보기 & 발주 (2,500 P)
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Add Reward Modal */}
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
              <Text style={styles.modalHeader}>{editingRewardId ? '보상 쿠폰 수정' : '새 보상 쿠폰 만들기'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>쿠폰 명칭</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="예: 설거지 1회 대행권, 등 안마 15분"
              placeholderTextColor="#AEAEB2"
              value={couponTitle}
              onChangeText={setCouponTitle}
            />

            <Text style={styles.modalLabel}>필요 포인트</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="예: 100"
              placeholderTextColor="#AEAEB2"
              keyboardType="number-pad"
              value={couponCost}
              onChangeText={text => setCouponCost(text.replace(/[^0-9]/g, ''))}
            />

            <Text style={styles.modalLabel}>쿠폰 상세 설명</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="쿠폰 사용법이나 세부 규칙을 적어주세요."
              placeholderTextColor="#AEAEB2"
              value={couponDesc}
              onChangeText={setCouponDesc}
            />

            <Text style={styles.modalLabel}>쿠폰 제공자</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="예: 아빠, 엄마, 아들, 가족 전체"
              placeholderTextColor="#AEAEB2"
              value={couponProvider}
              onChangeText={setCouponProvider}
            />

            <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleSubmitRewardForm}>
              <Text style={styles.modalConfirmBtnText}>{editingRewardId ? '수정 완료' : '쿠폰 등록하기'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* My Coupon Wallet Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={walletModalVisible}
        onRequestClose={() => setWalletModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleRow}>
                <Ticket size={22} color="#4A90E2" style={{ marginRight: 6 }} />
                <Text style={styles.modalHeader}>내 쿠폰 보관함</Text>
              </View>
              <TouchableOpacity onPress={() => setWalletModalVisible(false)}>
                <X size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {/* Wallet Tabs (사용 가능 / 사용 완료 / 만료됨) */}
            <View style={styles.walletTabRow}>
              <TouchableOpacity
                style={[styles.walletTabItem, walletTab === 'available' && styles.walletTabItemActive]}
                onPress={() => setWalletTab('available')}
              >
                <Text style={[styles.walletTabText, walletTab === 'available' && styles.walletTabTextActive]}>
                  사용 가능 ({availableCoupons.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.walletTabItem, walletTab === 'used' && styles.walletTabItemActive]}
                onPress={() => setWalletTab('used')}
              >
                <Text style={[styles.walletTabText, walletTab === 'used' && styles.walletTabTextActive]}>
                  사용 완료 ({usedCoupons.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.walletTabItem, walletTab === 'expired' && styles.walletTabItemActive]}
                onPress={() => setWalletTab('expired')}
              >
                <Text style={[styles.walletTabText, walletTab === 'expired' && styles.walletTabTextActive]}>
                  만료됨 ({expiredCoupons.length})
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.walletScrollContent}>
              {/* TAB 1: Available Coupons (Stacked) */}
              {walletTab === 'available' && (
                stackedAvailableCoupons.length === 0 ? (
                  <Text style={styles.emptyWalletText}>보유 중인 사용 가능 쿠폰이 없습니다. 포인트 상점에서 교환해보세요!</Text>
                ) : (
                  stackedAvailableCoupons.map((stack, idx) => {
                    const dDay = getDDayDays(stack.expire_date);
                    return (
                      <View key={`stack-${idx}`} style={styles.walletItem}>
                        <View style={styles.walletItemInfo}>
                          <View style={styles.couponTitleRow}>
                            <Text style={styles.walletItemTitle}>{stack.title}</Text>
                            {stack.items.length > 1 && (
                              <View style={styles.stackBadge}>
                                <Text style={styles.stackBadgeText}>× {stack.items.length}장</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.couponMetaRow}>
                            <Text style={styles.walletItemProvider}>제공자: {stack.provider}</Text>
                            {dDay !== null && (
                              <Text style={styles.expireBadgeText}>
                                ⏳ D-{dDay}일 (까지 {stack.expire_date})
                              </Text>
                            )}
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.useCouponBtn}
                          onPress={() => handleUseCouponClick(stack.items[0])}
                        >
                          <Text style={styles.useCouponBtnText}>사용하기</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )
              )}

              {/* TAB 2: Used Coupons */}
              {walletTab === 'used' && (
                usedCoupons.length === 0 ? (
                  <Text style={styles.emptyWalletText}>사용 완료된 쿠폰 내역이 없습니다.</Text>
                ) : (
                  usedCoupons.map((coupon) => (
                    <View key={coupon.id} style={styles.walletItemDone}>
                      <View style={styles.walletItemInfo}>
                        <Text style={styles.walletItemTitleDone}>{coupon.title}</Text>
                        <Text style={styles.walletItemProvider}>제공자: {coupon.provider || '가족'}</Text>
                      </View>
                      <View style={styles.usedBadge}>
                        <CheckCircle size={14} color="#2ECC71" style={{ marginRight: 2 }} />
                        <Text style={styles.usedBadgeText}>사용됨</Text>
                      </View>
                    </View>
                  ))
                )
              )}

              {/* TAB 3: Expired Coupons */}
              {walletTab === 'expired' && (
                expiredCoupons.length === 0 ? (
                  <Text style={styles.emptyWalletText}>만료된 쿠폰이 없습니다.</Text>
                ) : (
                  expiredCoupons.map((coupon) => (
                    <View key={coupon.id} style={styles.walletItemExpired}>
                      <View style={styles.walletItemInfo}>
                        <Text style={styles.walletItemTitleExpired}>{coupon.title}</Text>
                        <Text style={styles.walletItemProvider}>제공자: {coupon.provider || '가족'} (만료일: {coupon.expire_date})</Text>
                      </View>
                      <View style={styles.expiredBadge}>
                        <Text style={styles.expiredBadgeText}>만료됨</Text>
                      </View>
                    </View>
                  ))
                )
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 3. Point History / Ledger Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={historyModalVisible}
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalView, { maxHeight: '85%' }]}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleRow}>
                <Coins size={22} color="#F1C40F" style={{ marginRight: 8 }} />
                <Text style={styles.modalHeader}>포인트 적립 / 사용 내역</Text>
              </View>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {/* Point Summary Cards */}
            <View style={styles.historySummaryContainer}>
              <View style={styles.historySummaryCard}>
                <Text style={styles.historySummaryLabel}>현재 잔여</Text>
                <Text style={[styles.historySummaryValue, { color: '#F1C40F' }]}>{points} P</Text>
              </View>
              <View style={styles.historySummaryCard}>
                <Text style={styles.historySummaryLabel}>총 적립 (+)</Text>
                <Text style={[styles.historySummaryValue, { color: '#2ECC71' }]}>+{totalEarned} P</Text>
              </View>
              <View style={styles.historySummaryCard}>
                <Text style={styles.historySummaryLabel}>총 사용 (-)</Text>
                <Text style={[styles.historySummaryValue, { color: '#FF6B6B' }]}>-{totalSpent} P</Text>
              </View>
            </View>

            {/* Filter Tabs */}
            <View style={styles.historyTabRow}>
              <TouchableOpacity
                style={[styles.historyTabItem, historyFilter === 'all' && styles.historyTabItemActive]}
                onPress={() => setHistoryFilter('all')}
              >
                <Text style={[styles.historyTabText, historyFilter === 'all' && styles.historyTabTextActive]}>
                  전체 ({pointHistory.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.historyTabItem, historyFilter === 'earn' && styles.historyTabItemActive]}
                onPress={() => setHistoryFilter('earn')}
              >
                <Text style={[styles.historyTabText, historyFilter === 'earn' && styles.historyTabTextActive]}>
                  적립 (+)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.historyTabItem, historyFilter === 'spend' && styles.historyTabItemActive]}
                onPress={() => setHistoryFilter('spend')}
              >
                <Text style={[styles.historyTabText, historyFilter === 'spend' && styles.historyTabTextActive]}>
                  사용 (-)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Transaction List */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.historyScrollContent}>
              {filteredHistory.length === 0 ? (
                <View style={styles.emptyHistoryBox}>
                  <Text style={styles.emptyHistoryText}>해당하는 포인트 내역이 없습니다.</Text>
                </View>
              ) : (
                filteredHistory.map((item) => {
                  const isEarn = item.type === 'earn';
                  return (
                    <View key={item.id} style={styles.historyItemCard}>
                      <View style={[styles.historyItemIconBox, { backgroundColor: isEarn ? '#E8F8F0' : '#FFF0F0' }]}>
                        {isEarn ? (
                          <TrendingUp size={18} color="#2ECC71" />
                        ) : (
                          <TrendingDown size={18} color="#FF6B6B" />
                        )}
                      </View>
                      <View style={styles.historyItemInfo}>
                        <Text style={styles.historyItemTitle} numberOfLines={1}>{item.title}</Text>
                        <View style={styles.historyItemSubRow}>
                          <Text style={styles.historyItemDate}>{item.date}</Text>
                          {item.balance !== undefined && (
                            <Text style={styles.historyItemBalance}>잔액 {item.balance}P</Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.historyItemAmountBox}>
                        <Text style={[styles.historyItemAmountText, { color: isEarn ? '#2ECC71' : '#FF6B6B' }]}>
                          {isEarn ? `+${item.amount}` : `-${item.amount}`} P
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Co-op Goal Setting Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={goalModalVisible}
        onRequestClose={() => setGoalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleRow}>
                <Target size={22} color="#FF7E82" style={{ marginRight: 6 }} />
                <Text style={styles.modalHeader}>가족 공동 펀딩 목표 설정</Text>
              </View>
              <TouchableOpacity onPress={() => setGoalModalVisible(false)}>
                <X size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={styles.goalSectionTitle}>추천 버킷리스트 목표 선택</Text>
              {goalPresets.map((preset) => {
                const isSelected = (coopGoal?.id === preset.id) || (coopGoal?.title === preset.title);
                const isEditing = editingPresetId === preset.id;

                if (isEditing) {
                  return (
                    <View key={preset.id} style={styles.presetEditCard}>
                      <Text style={styles.presetEditHeaderTitle}>버킷리스트 목표 수정</Text>
                      <TextInput
                        style={styles.presetEditInput}
                        value={editPresetTitle}
                        onChangeText={setEditPresetTitle}
                        placeholder="목표 이름"
                        placeholderTextColor="#AEAEB2"
                      />
                      <TextInput
                        style={styles.presetEditInput}
                        value={editPresetPoints}
                        onChangeText={(t) => setEditPresetPoints(t.replace(/[^0-9]/g, ''))}
                        placeholder="목표 포인트"
                        placeholderTextColor="#AEAEB2"
                        keyboardType="number-pad"
                      />

                      <View style={styles.categoryPickerRow}>
                        {[
                          { key: 'dinner', label: '외식' },
                          { key: 'travel', label: '여행' },
                          { key: 'cinema', label: '영화' },
                          { key: 'cafe', label: '카페' },
                          { key: 'custom', label: '맞춤' },
                        ].map(opt => {
                          const isCatActive = editPresetCategory === opt.key;
                          return (
                            <TouchableOpacity
                              key={opt.key}
                              style={[styles.categoryChip, isCatActive && styles.categoryChipActive]}
                              onPress={() => setEditPresetCategory(opt.key)}
                            >
                              {renderGoalCategorySvg(opt.key, 12, isCatActive ? '#FFFFFF' : '#8E8E93')}
                              <Text style={[styles.categoryChipText, isCatActive && styles.categoryChipTextActive]}>
                                {opt.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <View style={styles.presetEditActionsRow}>
                        <TouchableOpacity
                          style={styles.presetEditCancelBtn}
                          onPress={() => setEditingPresetId(null)}
                        >
                          <X size={13} color="#8E8E93" style={{ marginRight: 4 }} />
                          <Text style={styles.presetEditCancelBtnText}>취소</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.presetEditSaveBtn}
                          onPress={() => handleSaveEditPreset(preset.id)}
                        >
                          <Check size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.presetEditSaveBtnText}>저장</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }

                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[styles.goalPresetCard, isSelected && styles.goalPresetCardActive]}
                    onPress={() => {
                      if (onUpdateCoopGoal) {
                        onUpdateCoopGoal({
                          id: preset.id,
                          title: preset.title,
                          targetPoints: preset.targetPoints,
                          category: preset.category,
                          desc: preset.desc || '가족이 함께 모으는 버킷리스트',
                        });
                      }
                      setGoalModalVisible(false);
                      Alert.alert('목표 설정 완료', `'${preset.title}'(으)로 공동 목표가 변경되었습니다!`);
                    }}
                  >
                    <View style={[styles.goalPresetIconBox, isSelected && { backgroundColor: '#FFEBEF' }]}>
                      {renderGoalCategorySvg(preset.category, 20, isSelected ? '#FF7E82' : '#8E8E93')}
                    </View>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.goalPresetTitle, isSelected && { color: '#FF7E82', fontWeight: '800' }]}>
                        {preset.title}
                      </Text>
                      <Text style={styles.goalPresetDesc}>{preset.desc || '가족이 함께 모으는 버킷리스트'}</Text>
                    </View>
                    <View style={styles.presetRightControls}>
                      <View style={styles.goalPresetPointsBadge}>
                        <Text style={styles.goalPresetPointsText}>{preset.targetPoints.toLocaleString()} P</Text>
                      </View>
                      <View style={styles.presetActionBtnRow}>
                        <TouchableOpacity
                          style={styles.presetSmallActionBtn}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleStartEditPreset(preset);
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Pencil size={12} color="#4A90E2" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.presetSmallActionBtn}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDeletePreset(preset);
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Trash2 size={12} color="#FF3B30" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

              <View style={styles.customGoalDivider} />
              <Text style={styles.goalSectionTitle}>직접 목표 만들기</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="가족 공동 목표 이름 (예: 제주도 여행)"
                placeholderTextColor="#AEAEB2"
                value={customGoalTitle}
                onChangeText={setCustomGoalTitle}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="목표 포인트 (예: 2500)"
                placeholderTextColor="#AEAEB2"
                keyboardType="number-pad"
                value={customGoalPoints}
                onChangeText={(t) => setCustomGoalPoints(t.replace(/[^0-9]/g, ''))}
              />

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleAddCustomGoal}
              >
                <Text style={styles.modalConfirmBtnText}>직접 입력한 목표로 설정</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Achieved Goals History Modal (Hall of Fame) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={achievedGoalsModalVisible}
        onRequestClose={() => setAchievedGoalsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleRow}>
                <Trophy size={20} color="#D97706" style={{ marginRight: 6 }} />
                <Text style={styles.modalHeader}>우리가 이룬 버킷리스트</Text>
              </View>
              <TouchableOpacity onPress={() => setAchievedGoalsModalVisible(false)}>
                <X size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <Text style={styles.historyDesc}>
              가족이 함께 힘을 모아 달성한 소중한 추억들입니다.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380, width: '100%' }}>
              {achievedGoals.length === 0 ? (
                <View style={styles.emptyHistoryContainer}>
                  <Trophy size={36} color="#D1D1D6" style={{ marginBottom: 10 }} />
                  <Text style={styles.emptyHistoryTitle}>아직 달성한 버킷리스트가 없습니다</Text>
                  <Text style={styles.emptyHistorySub}>
                    미션을 완수하고 포인트를 모아 첫 버킷리스트를 달성해 보세요!
                  </Text>
                </View>
              ) : (
                achievedGoals.map((item, idx) => (
                  <View key={item.id || idx} style={styles.achievedItemCard}>
                    <View style={styles.achievedItemIconBox}>
                      {renderGoalCategorySvg(item.category, 20, '#FF7E82')}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.achievedItemTitle}>{item.title}</Text>
                      <Text style={styles.achievedItemDate}>
                        달성일: {new Date(item.achievedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </Text>
                    </View>
                    <View style={styles.achievedItemBadge}>
                      <Text style={styles.achievedItemBadgeText}>
                        {item.targetPoints?.toLocaleString()} P
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Co-op Goal Achieved Celebration Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={goalCelebrationModalVisible}
        onRequestClose={() => setGoalCelebrationModalVisible(false)}
      >
        <View style={styles.celebrationOverlay}>
          <View style={styles.celebrationCard}>
            <View style={styles.celebrationIconCircle}>
              <PartyPopper size={36} color="#FF7E82" />
            </View>

            <Text style={styles.celebrationTitle}>가족 버킷리스트 달성 완료!</Text>
            <Text style={styles.celebrationSubText}>
              우리 가족이 힘을 합쳐 목표를 멋지게 달성했습니다!
            </Text>

            <View style={styles.celebrationGoalCard}>
              <View style={styles.celebrationGoalIconBox}>
                {renderGoalCategorySvg(lastAchievedGoal?.category, 24, '#FF7E82')}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.celebrationGoalTitle}>{lastAchievedGoal?.title}</Text>
                <Text style={styles.celebrationGoalPoints}>
                  사용 포인트: {lastAchievedGoal?.targetPoints?.toLocaleString()} P
                </Text>
              </View>
              <CheckCircle2 size={20} color="#2ECC71" />
            </View>

            <Text style={styles.celebrationNoticeDesc}>
              가족 단톡방에 축하 공지가 발송되었으며, 달성 내역에 영구 보관되었습니다.
            </Text>

            <TouchableOpacity
              style={styles.celebrationNextBtn}
              onPress={() => {
                setGoalCelebrationModalVisible(false);
                setGoalModalVisible(true);
              }}
              activeOpacity={0.85}
            >
              <Target size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.celebrationNextBtnText}>다음 버킷리스트 정하러 가기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.celebrationCloseBtn}
              onPress={() => setGoalCelebrationModalVisible(false)}
            >
              <Text style={styles.celebrationCloseBtnText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* AI Family Storybook Modal */}
      <FamilyStorybookModal
        visible={storybookVisible}
        onClose={() => setStorybookVisible(false)}
        smallTalkState={smallTalkState}
        familyMembers={familyMembers}
        messages={messages}
        currentUserProfile={currentUserProfile}
        onSendOrderNotice={onSendOrderNotice}
        points={points}
        onDeductPoints={onDeductPoints}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: commonStyles.screenContainer,
  subHeaderBar: commonStyles.subHeaderBar,
  subHeaderTitle: commonStyles.subHeaderTitle,
  subHeaderSub: commonStyles.subHeaderSub,
  subHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pointChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B45309',
  },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F2',
    gap: 8,
  },
  subTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#ECEFF1',
    position: 'relative',
  },
  subTabItemActive: {
    backgroundColor: '#FFF2F3',
    borderColor: '#FF7E82',
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  subTabTextActive: {
    color: '#FF7E82',
    fontWeight: '700',
  },
  subTabBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF7E82',
    marginLeft: 4,
  },
  subTabCountBadge: {
    backgroundColor: '#FF7E82',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 4,
  },
  subTabCountBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  pointsBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  pointsInfo: {
    flex: 1,
  },
  pointsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pointsLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
  },
  historyBadgeBtn: {
    backgroundColor: '#F1F2F4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  historyBadgeBtnText: {
    fontSize: 10,
    color: '#4A90E2',
    fontWeight: '700',
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1C1C1E',
  },
  pointsUnit: {
    fontSize: 14,
    color: '#F1C40F',
    fontWeight: '700',
  },
  missionProgressBox: {
    backgroundColor: '#FFF2F3',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 10,
    color: '#FF7E82',
    fontWeight: '700',
    marginBottom: 2,
  },
  progressValue: {
    fontSize: 13,
    color: '#FF7E82',
    fontWeight: '800',
  },
  topicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  topicTag: {
    fontSize: 12,
    color: '#FF7E82',
    fontWeight: '700',
  },
  topicTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1C1E',
    lineHeight: 25,
    marginBottom: 10,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4EFDF',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  completedBadgeText: {
    fontSize: 12,
    color: '#196F3D',
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
  memberRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  avatarText: {
    fontSize: 18,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '700',
  },
  checkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2ECC71',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  checkText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    marginLeft: 2,
  },
  waitingText: {
    fontSize: 10,
    color: '#AEAEB2',
    fontWeight: '600',
  },
  responseText: {
    fontSize: 13,
    color: '#1C1C1E',
    lineHeight: 18,
  },
  emptyResponseText: {
    fontSize: 12,
    color: '#AEAEB2',
    fontStyle: 'italic',
  },
  quickRailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  quickRailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickRailTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  quickRailDoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  quickRailDoneText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    marginLeft: 3,
  },
  quickRailScroll: {
    flexDirection: 'row',
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  quickChipAnswered: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  quickChipAvatar: {
    fontSize: 14,
    marginRight: 4,
  },
  quickChipName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
  },
  quickChipNameAnswered: {
    color: '#166534',
    fontWeight: '800',
  },
  quickChipWaitingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    marginLeft: 5,
  },
  actionCard: {
    backgroundColor: '#FFF2F3',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE5E7',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF7E82',
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#FFE5E7',
    marginBottom: 10,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#FF7E82',
    borderRadius: 12,
    paddingVertical: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  actionCardDone: {
    backgroundColor: '#E8F8F5',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1F2EB',
  },
  doneTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16A085',
    marginBottom: 2,
  },
  doneDesc: {
    fontSize: 11,
    color: '#7F8C8D',
    marginBottom: 10,
    textAlign: 'center',
  },
  myAnswerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16A085',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  shopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    rowGap: 10,
    columnGap: 12,
    marginBottom: 8,
  },
  shopHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  headerBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  walletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#AED6F1',
  },
  walletBtnText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '700',
  },
  addRewardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF2F3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#FFA2A5',
  },
  addRewardBtnText: {
    fontSize: 12,
    color: '#FF7E82',
    fontWeight: '700',
  },
  shopDesc: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 16,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    paddingVertical: 12,
  },
  rewardDetails: {
    flex: 1,
    marginRight: 10,
  },
  rewardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  rewardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  ownedCouponBadge: {
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  ownedCouponBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2ECC71',
  },
  rewardDesc: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 2,
  },
  rewardProviderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  rewardProvider: {
    fontSize: 11,
    color: '#AEAEB2',
    fontWeight: '500',
  },
  rewardManageButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  rewardManageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F2F4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  rewardManageBtnText: {
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: '700',
  },
  rewardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  useCouponDirectBtn: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    marginRight: 6,
  },
  useCouponDirectBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  redeemButton: {
    backgroundColor: '#FF7E82',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  redeemDisabled: {
    backgroundColor: '#C7C7CC',
  },
  redeemButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyShopText: {
    fontSize: 12,
    color: '#AEAEB2',
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
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
    maxHeight: '80%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    padding: 10,
    fontSize: 14,
    color: '#1C1C1E',
    marginBottom: 4,
  },
  modalConfirmBtn: {
    backgroundColor: '#FF7E82',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  modalConfirmBtnText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  walletScrollContent: {
    paddingVertical: 6,
  },
  walletSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 10,
  },
  walletSectionTitleDone: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 10,
  },
  emptyWalletText: {
    fontSize: 12,
    color: '#AEAEB2',
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  walletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  walletItemDone: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    opacity: 0.6,
  },
  walletItemInfo: {
    flex: 1,
  },
  walletItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  walletItemTitleDone: {
    fontSize: 13,
    color: '#8E8E93',
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  walletItemProvider: {
    fontSize: 11,
    color: '#8E8E93',
  },
  useCouponBtn: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  useCouponBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  usedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usedBadgeText: {
    fontSize: 11,
    color: '#2ECC71',
    fontWeight: '700',
  },
  walletTabRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F2F4',
    borderRadius: 10,
    padding: 3,
    marginVertical: 12,
  },
  walletTabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  walletTabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  walletTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  walletTabTextActive: {
    color: '#1C1C1E',
    fontWeight: '700',
  },
  couponTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackBadge: {
    backgroundColor: '#E6F4FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  stackBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4A90E2',
  },
  couponMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  expireBadgeText: {
    fontSize: 11,
    color: '#FF7E82',
    fontWeight: '600',
    marginLeft: 8,
  },
  walletItemExpired: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    opacity: 0.5,
  },
  walletItemTitleExpired: {
    fontSize: 13,
    color: '#8E8E93',
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  expiredBadge: {
    backgroundColor: '#EBEBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  expiredBadgeText: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
  },
  // Point History Modal Styles
  historySummaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  historySummaryCard: {
    flex: 1,
    alignItems: 'center',
  },
  historySummaryLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
    marginBottom: 4,
  },
  historySummaryValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  historyTabRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F2F4',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  historyTabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  historyTabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  historyTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  historyTabTextActive: {
    color: '#1C1C1E',
    fontWeight: '700',
  },
  historyScrollContent: {
    paddingVertical: 4,
  },
  emptyHistoryBox: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHistoryText: {
    fontSize: 13,
    color: '#AEAEB2',
    fontStyle: 'italic',
  },
  historyItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F0F0F2',
  },
  historyItemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyItemInfo: {
    flex: 1,
  },
  historyItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 3,
  },
  historyItemSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyItemDate: {
    fontSize: 11,
    color: '#8E8E93',
    marginRight: 8,
  },
  historyItemBalance: {
    fontSize: 11,
    color: '#AEAEB2',
    fontWeight: '500',
  },
  historyItemAmountBox: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  historyItemAmountText: {
    fontSize: 14,
    fontWeight: '800',
  },
  // Co-op Goal Card Styles
  coopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F0F0F2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  coopCardFinished: {
    borderColor: '#A7F3D0',
    borderWidth: 1.5,
    backgroundColor: '#FAFFFC',
    shadowColor: '#10B981',
    shadowOpacity: 0.15,
  },
  coopHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  coopTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },
  coopTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF7E82',
  },
  coopHeaderBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  coopHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#FDE68A',
  },
  coopHistoryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  coopChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F2F2F7',
    borderRadius: 6,
  },
  coopChangeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6C757D',
  },
  coopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  coopGoalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF0F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  coopGoalIcon: {
    fontSize: 26,
    marginRight: 10,
  },
  coopGoalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  coopGoalSub: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  coopPercentBadge: {
    backgroundColor: '#FFF0F1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  coopPercentText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FF7E82',
  },
  coopProgressTrack: {
    height: 10,
    backgroundColor: '#F2F2F7',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  coopProgressBar: {
    height: '100%',
    backgroundColor: '#FF7E82',
    borderRadius: 5,
  },
  coopFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  coopStatusText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
    minWidth: 180,
  },
  coopClaimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  coopClaimBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  coopStudioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF7E82',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    shadowColor: '#FF7E82',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  coopStudioBtnComplete: {
    backgroundColor: '#2ECC71',
    shadowColor: '#2ECC71',
  },
  coopStudioBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Masterpiece Storybook Card Styles
  masterpieceCard: {
    backgroundColor: '#FFFDF9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  masterpieceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  masterpieceCrownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  masterpieceCrownText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  masterpieceSpecBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  masterpieceSpecText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
  },
  masterpieceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  masterpieceBookIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  masterpieceTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  masterpieceSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B45309',
  },
  masterpieceDesc: {
    fontSize: 12,
    color: '#52525B',
    lineHeight: 18,
    marginBottom: 12,
  },
  masterpieceStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  masterpieceStatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF6E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#FDE68A',
  },
  masterpieceStatText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78350F',
  },
  masterpieceEnterBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#92400E',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    shadowColor: '#92400E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  masterpieceBtnMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  masterpieceEnterBtnTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  masterpieceEnterBtnSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FDE68A',
    opacity: 0.9,
  },
  // Goal Modal Styles
  goalSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 10,
    marginTop: 4,
  },
  goalPresetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    backgroundColor: '#FAFAFA',
    marginBottom: 8,
  },
  goalPresetCardActive: {
    borderColor: '#FF7E82',
    backgroundColor: '#FFF5F5',
  },
  goalPresetIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  goalPresetIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  goalPresetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C3E50',
  },
  goalPresetDesc: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  goalPresetPointsBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  goalPresetPointsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555',
  },
  presetRightControls: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  presetActionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  presetSmallActionBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetEditCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FF7E82',
    backgroundColor: '#FFFDFD',
    marginBottom: 10,
  },
  presetEditHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  presetEditInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    color: '#1C1C1E',
    marginBottom: 8,
  },
  categoryPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
  },
  categoryChipActive: {
    backgroundColor: '#FF7E82',
    borderColor: '#FF7E82',
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    marginLeft: 3,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  presetEditActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  presetEditCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  presetEditCancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  presetEditSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FF7E82',
  },
  presetEditSaveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  customGoalDivider: {
    height: 1,
    backgroundColor: '#EBEBEB',
    marginVertical: 14,
  },
  // Celebration Modal Styles
  celebrationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  celebrationCard: {
    width: '90%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  celebrationIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF0F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  celebrationTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#1C1C1E',
    marginBottom: 6,
    textAlign: 'center',
  },
  celebrationSubText: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 18,
  },
  celebrationGoalCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    marginBottom: 14,
  },
  celebrationGoalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF0F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  celebrationGoalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  celebrationGoalPoints: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF7E82',
  },
  celebrationNoticeDesc: {
    fontSize: 11,
    color: '#AEAEB2',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 20,
  },
  celebrationNextBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF7E82',
    paddingVertical: 13,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#FF7E82',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  celebrationNextBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  celebrationCloseBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  celebrationCloseBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  // Achieved Goals History Styles
  historyDesc: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 16,
    lineHeight: 18,
  },
  emptyHistoryContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  emptyHistoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8E8E93',
    marginBottom: 4,
  },
  emptyHistorySub: {
    fontSize: 11,
    color: '#AEAEB2',
    textAlign: 'center',
  },
  achievedItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F0F0F2',
  },
  achievedItemIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFF0F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  achievedItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  achievedItemDate: {
    fontSize: 11,
    color: '#8E8E93',
  },
  achievedItemBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#FDE68A',
  },
  achievedItemBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
});
