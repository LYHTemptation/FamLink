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
import { Award, Check, MessageSquare, ShoppingBag, Trophy, Lock, Plus, X, Ticket, CheckCircle } from 'lucide-react-native';

export default function SmallTalkScreen({
  smallTalkState,
  currentUser,
  points,
  onAddResponse,
  onRedeemReward,
  familyMembers,
  rewardsList,
  onAddReward,
  userCoupons,
  onUseCoupon,
}) {
  const [answer, setAnswer] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [walletModalVisible, setWalletModalVisible] = useState(false);

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

  const hasAnswered = responses && responses[currentUser];
  const answeredCount = responses ? Object.keys(responses).length : 0;
  const totalCount = familyMembers && Array.isArray(familyMembers) ? familyMembers.length : 4;
  const isMissionComplete = answeredCount === totalCount;

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
          onPress: () => {
            onRedeemReward(reward);
            Alert.alert('교환 완료 🎉', `[${reward.title}] 쿠폰이 발급되었습니다! 내 쿠폰함에서 확인하세요.`);
          }
        }
      ]
    );
  };

  const handleCreateReward = () => {
    if (!couponTitle.trim()) {
      Alert.alert('알림', '쿠폰 명칭을 입력해주세요.');
      return;
    }
    const costNum = parseInt(couponCost, 10);
    if (isNaN(costNum) || costNum <= 0) {
      Alert.alert('알림', '올바른 포인트를 입력해주세요.');
      return;
    }

    onAddReward({
      title: couponTitle.trim(),
      cost: costNum,
      desc: couponDesc.trim() || '가족 소통을 위한 보상 쿠폰입니다.',
      provider: couponProvider.trim() || '가족 전체',
    });

    setCouponTitle('');
    setCouponCost('100');
    setCouponDesc('');
    setCouponProvider('');
    setModalVisible(false);
  };

  const handleUseCouponClick = (coupon) => {
    Alert.alert(
      '쿠폰 사용 요청',
      `[${coupon.title}] 쿠폰을 지금 사용하시겠습니까?\n(제공자: ${coupon.provider || '가족'})`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '사용하기',
          onPress: () => {
            if (onUseCoupon) onUseCoupon(coupon.id);
            Alert.alert('사용 완료 🎟️', `[${coupon.title}] 사용 요청이 완료되었습니다!`);
          }
        }
      ]
    );
  };

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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Points Banner */}
        <View style={styles.pointsBanner}>
          <View style={styles.pointsInfo}>
            <Text style={styles.pointsLabel}>우리 가족의 총 포인트</Text>
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
        </View>

        {/* Daily Topic Box */}
        <View style={styles.topicCard}>
          <View style={styles.topicHeader}>
            <Award size={18} color="#FF7E82" style={{ marginRight: 6 }} />
            <Text style={styles.topicTag}>오늘의 소통 미션 (+100P)</Text>
          </View>
          <Text style={styles.topicTitle}>"{topic}"</Text>

          {isMissionComplete && (
            <View style={styles.completedBadge}>
              <Text style={styles.completedBadgeText}>🎉 미션 완료! 100포인트 획득 🎉</Text>
            </View>
          )}
        </View>

        {/* Responses List */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>가족 답변 현황</Text>

          {(familyMembers && Array.isArray(familyMembers) ? familyMembers : Object.keys(DEFAULT_MEMBERS)).map((item) => {
            const isDbProfile = typeof item === 'object' && 'role' in item;
            const roleKey = isDbProfile ? item.role : item;
            const memberInfo = getMemberInfo(roleKey);
            const responseText = responses[roleKey];
            const isAnswered = !!responseText;

            const memberName = isDbProfile ? item.name : memberInfo.name;
            const memberAvatar = isDbProfile ? item.avatar : memberInfo.avatar;
            const memberColor = isDbProfile ? item.color : memberInfo.color;

            return (
              <View key={isDbProfile ? item.id : roleKey} style={styles.memberRow}>
                <View style={[styles.avatarBox, { backgroundColor: memberColor + '15' }]}>
                  <Text style={styles.avatarText}>{memberAvatar}</Text>
                </View>

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

        {/* Answer Submission */}
        {!hasAnswered ? (
          <View style={styles.actionCard}>
            <Text style={styles.actionTitle}>오늘 미션 참여하기</Text>
            <Text style={styles.actionDesc}>나의 답변을 적고 전원 참여 포인트 100점을 획득하세요!</Text>

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
        ) : (
          <View style={styles.actionCardDone}>
            <Check size={24} color="#2ECC71" style={{ marginBottom: 6 }} />
            <Text style={styles.doneTitle}>오늘의 답변을 성공적으로 남겼습니다!</Text>
            <Text style={styles.doneDesc}>다른 가족들도 모두 답변하면 미션 포인트가 적립됩니다.</Text>
            <Text style={styles.myAnswerText}>내 답변: "{responses[currentUser]}"</Text>
          </View>
        )}

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

              <TouchableOpacity style={styles.addRewardBtn} onPress={() => setModalVisible(true)}>
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
              return (
                <View key={reward.id} style={styles.rewardItem}>
                  <View style={styles.rewardDetails}>
                    <Text style={styles.rewardTitle}>{reward.title}</Text>
                    <Text style={styles.rewardDesc}>{reward.description || reward.desc}</Text>
                    <Text style={styles.rewardProvider}>쿠폰 제공자: {reward.provider}</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.redeemButton, !canAfford && styles.redeemDisabled]}
                    onPress={() => handleRedeem(reward)}
                  >
                    <Text style={styles.redeemButtonText}>{reward.cost} P</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

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
              <Text style={styles.modalHeader}>새 보상 쿠폰 만들기</Text>
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

            <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleCreateReward}>
              <Text style={styles.modalConfirmBtnText}>쿠폰 등록하기</Text>
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
  pointsLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
    marginBottom: 4,
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
    fontSize: 17,
    fontWeight: '800',
    color: '#1C1C1E',
    lineHeight: 24,
    marginBottom: 10,
  },
  completedBadge: {
    backgroundColor: '#D4EFDF',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
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
    borderRadius: 10,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
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
    marginBottom: 6,
  },
  shopHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  headerBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#AED6F1',
    marginRight: 6,
  },
  walletBtnText: {
    fontSize: 11,
    color: '#4A90E2',
    fontWeight: '700',
  },
  addRewardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF2F3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#FFA2A5',
  },
  addRewardBtnText: {
    fontSize: 11,
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
  rewardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  rewardDesc: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 2,
  },
  rewardProvider: {
    fontSize: 10,
    color: '#AEAEB2',
    fontWeight: '500',
  },
  redeemButton: {
    backgroundColor: '#FF7E82',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
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
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#F1F2F4',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
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
    paddingVertical: 8,
    borderRadius: 8,
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
});
