import React, { useState } from 'react';
import {
  StyleSheet,
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
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { Users, Heart, Award, ShieldCheck, Smile, Edit3, LogOut, Sparkles, Check, Camera, Trash2, FileText } from 'lucide-react-native';
import { MoodIcon, MOOD_ITEMS, IconCopy, IconShare, IconClose, IconChevronRight } from './icons';
import { colors, typography, commonStyles } from '../theme';
import UserAvatar from './UserAvatar';

const EDIT_AVATAR_PRESETS = [
  '👩‍🦰', '👨‍💼', '👦', '👧', '👵', '👴', '🧑', '👱', '👶', '🐱', '🐶', '🐰', '🐻', '🐼', '🦊', '🐣'
];

const FAMILY_MEMBERS_STATIC = {
  mom: { name: '엄마', avatar: '👩‍🦰', color: '#FF6B47' },
  dad: { name: '아빠', avatar: '👨‍💼', color: '#4A90E2' },
  son: { name: '아들', avatar: '👦', color: '#2ECC71' },
  daughter: { name: '딸', avatar: '👧', color: '#F39C12' },
};

export default function FamilyScreen({
  familyCode,
  familyMembersList,
  currentUserProfile,
  onUpdateMood,
  onUpdateProfile,
  onlineUsers,
  onLogout,
  onDeleteAccount,
  onNavigateScreen,
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [policyModalVisible, setPolicyModalVisible] = useState(false);
  const [activePolicyTab, setActivePolicyTab] = useState('terms'); // 'terms' | 'privacy'
  const [editName, setEditName] = useState(currentUserProfile?.name || '');
  const [editRole, setEditRole] = useState(currentUserProfile?.role || '');
  const [selectedAvatar, setSelectedAvatar] = useState(currentUserProfile?.avatar || '👦');
  const [selectedMood, setSelectedMood] = useState(currentUserProfile?.mood || '😊');
  const [statusText, setStatusText] = useState(currentUserProfile?.status_text || '');

  const handleDeleteAccountClick = () => {
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
  };

  const openEditModal = () => {
    setEditName(currentUserProfile?.name || '');
    setEditRole(currentUserProfile?.role || '');
    setSelectedAvatar(currentUserProfile?.avatar || '👦');
    setSelectedMood(currentUserProfile?.mood || '😊');
    setStatusText(currentUserProfile?.status_text || '');
    setModalVisible(true);
  };

  const handlePickProfileImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert('권한 필요', '프로필 사진 설정을 위해 사진첩 접근 권한이 필요합니다.');
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

  const isFamilyFull = (familyMembersList?.length || 0) >= 10;

  const handleCopyCode = async () => {
    if (isFamilyFull) {
      Alert.alert('정원 마감 안내', '우리 가족의 최대 정원(10명)이 모두 찼습니다. 추가 가입이 제한됩니다.');
      return;
    }
    await Clipboard.setStringAsync(familyCode);
    Alert.alert('복사 완료', '가족 코드가 클립보드에 복사되었습니다. 다른 가족에게 보내 가입하도록 하세요!');
  };

  const handleCopyInviteMessage = async () => {
    if (isFamilyFull) {
      Alert.alert('정원 마감 안내', '우리 가족의 최대 정원(10명)이 모두 찼습니다. 추가 가입이 제한됩니다.');
      return;
    }
    const inviteMsg = `[FamLink] 우리 가족만의 소통 공간에 당신을 초대합니다! ❤️\n\n앱을 설치하고 가입하실 때 아래 가족 코드를 입력하시면 같이 채팅과 일정을 공유할 수 있어요.\n\n가족 코드: ${familyCode}`;
    await Clipboard.setStringAsync(inviteMsg);
    Alert.alert('초대문구 복사', '초대 메시지가 복사되었습니다. 카카오톡이나 메시지로 가족에게 전송해 보세요!');
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
    setModalVisible(false);
  };

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
          <Text style={styles.subHeaderSub}>가족 멤버 {familyMembersList.length} / 10명</Text>
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
          <TouchableOpacity style={styles.actionButton} onPress={handleCopyCode}>
            <IconCopy size={14} color="#FF6B47" style={{ marginRight: 4 }} />
            <Text style={styles.actionButtonText}>코드 복사</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleCopyInviteMessage}>
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
              <Sparkles size={10} color="#FF6B47" style={{ marginRight: 2 }} />
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

      {/* Member List Section */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Heart size={18} color="#FF6B47" fill="#FF6B47" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>
            가입된 가족 멤버 ({familyMembersList.length} / 10명)
          </Text>
        </View>

        {familyMembersList.map((member, index) => {
          const isDbProfile = member && typeof member === 'object' && 'name' in member;
          const roleKey = isDbProfile ? (member.role || 'son') : member;
          const staticInfo = FAMILY_MEMBERS_STATIC[roleKey] || { name: '가족', avatar: '👦', color: '#8E8E93' };
          
          const memberName = isDbProfile ? member.name : staticInfo.name;
          const memberAvatar = isDbProfile ? member.avatar : staticInfo.avatar;
          const memberColor = isDbProfile ? member.color : staticInfo.color;
          const moodEmoji = isDbProfile ? (member.mood || '😊') : '😊';
          const memberStatusText = isDbProfile ? (member.status_text || '') : '';

          const isMe = isDbProfile ? currentUserProfile && currentUserProfile.id === member.id : index === 0;
          const isOnline = onlineUsers && onlineUsers.length > 0 ? (
            isDbProfile
              ? ((member.id ? onlineUsers.includes(member.id) : onlineUsers.includes(member.role)) || isMe)
              : index === 0 || onlineUsers.includes(roleKey)
          ) : isMe;

          return (
            <View key={isDbProfile ? member.id : roleKey} style={styles.memberItem}>
              <UserAvatar avatar={memberAvatar} size={42} style={{ marginRight: 12 }} />

              <View style={styles.memberInfo}>
                <View style={styles.memberNameRow}>
                  <Text style={[styles.memberName, { color: memberColor }]}>{memberName}</Text>
                  {isMe && (
                    <View style={styles.meBadge}>
                      <Text style={styles.meBadgeText}>나</Text>
                    </View>
                  )}
                </View>

                {/* Mood & Status Message Badge */}
                <View style={styles.moodBadgeRow}>
                  <MoodIcon mood={moodEmoji} size={14} style={{ marginRight: 5 }} />
                  <Text style={styles.moodStatusText}>
                    {memberStatusText || '오늘도 화이팅!'}
                  </Text>
                </View>
              </View>

              <View style={[styles.statusBox, isOnline ? styles.statusBoxOnline : styles.statusBoxOffline]}>
                <View style={[styles.statusDot, isOnline ? styles.statusDotOnline : styles.statusDotOffline]} />
                <Text style={[styles.statusText, isOnline ? styles.statusTextOnline : styles.statusTextOffline]}>
                  {isOnline ? '접속 중' : '오프라인'}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Account & Settings Card */}
      <View style={styles.accountCard}>
        <View style={styles.accountHeader}>
          <Users size={16} color="#78716C" style={{ marginRight: 6 }} />
          <Text style={styles.accountHeaderTitle}>내 계정 정보</Text>
        </View>

        {/* 1. 프로필 정보 및 수정 버튼 (가로 정렬, 계정 정보 최대 너비 확보) */}
        <View style={styles.accountProfileRow}>
          <UserAvatar avatar={currentUserProfile?.avatar} size={46} style={{ marginRight: 12 }} />
          <View style={styles.accountInfoCol}>
            <Text style={styles.accountNameText} numberOfLines={1}>
              {currentUserProfile?.name || '내 계정'}
              <Text style={styles.accountRoleTagText}> ({currentUserProfile?.role || '가족'})</Text>
            </Text>
            {currentUserProfile?.email ? (
              <Text style={styles.accountEmailText} numberOfLines={1}>{currentUserProfile.email}</Text>
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

        {/* 2. 약관 및 운영 정책 전용 페이지 바로가기 (리스트형) */}
        <View style={styles.accountPolicyBox}>
          <TouchableOpacity
            style={styles.accountPolicyRow}
            onPress={() => {
              setActivePolicyTab('terms');
              setPolicyModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.accountPolicyLeft}>
              <FileText size={14} color="#78716C" style={{ marginRight: 8 }} />
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
              <ShieldCheck size={14} color="#78716C" style={{ marginRight: 8 }} />
              <Text style={styles.accountPolicyTitle}>개인정보 처리방침</Text>
            </View>
            <IconChevronRight size={14} color="#A8A29E" />
          </TouchableOpacity>
        </View>

        {/* 3. 하단 계정 액션 (로그아웃 & 회원 탈퇴) */}
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
      </View>

      {/* Terms & Privacy Policy Dedicated Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={policyModalVisible}
        onRequestClose={() => setPolicyModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalView, { maxHeight: '88%', paddingBottom: 20 }]}>
            {/* Header */}
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={18} color="#FF6B47" />
                <Text style={styles.modalHeader}>운영 정책 및 약관</Text>
              </View>
              <TouchableOpacity onPress={() => setPolicyModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <IconClose size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {/* 2-Tab Bar (1. 서비스 이용약관, 2. 개인정보 처리방침) */}
            <View style={styles.policyTabBar}>
              <TouchableOpacity
                style={[styles.policyTabBtn, activePolicyTab === 'terms' && styles.policyTabBtnActive]}
                onPress={() => setActivePolicyTab('terms')}
                activeOpacity={0.8}
              >
                <Text style={[styles.policyTabBtnText, activePolicyTab === 'terms' && styles.policyTabBtnTextActive]}>
                  서비스 이용약관
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.policyTabBtn, activePolicyTab === 'privacy' && styles.policyTabBtnActive]}
                onPress={() => setActivePolicyTab('privacy')}
                activeOpacity={0.8}
              >
                <Text style={[styles.policyTabBtnText, activePolicyTab === 'privacy' && styles.policyTabBtnTextActive]}>
                  개인정보 처리방침
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content Body */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12 }}>
              {activePolicyTab === 'privacy' ? (
                <View style={styles.policyContentCard}>
                  <Text style={styles.policySectionHeading}>FamLink 개인정보 처리방침</Text>
                  <Text style={styles.policyMetaText}>최종 수정일: 2026년 10월 9일 (Apple Guideline 5.1.1 준수)</Text>

                  <Text style={styles.policyArticleTitle}>제1조 (개인정보 수집 항목 및 방법)</Text>
                  <Text style={styles.policyBodyText}>
                    FamLink는 가족 간 프라이빗 소통 및 실물 포토북 배송을 위한 최소한의 개인정보만을 수집합니다.{'\n'}
                    • 필수 수집 항목: 로그인 이메일, 가족 내 호칭/이름, 프로필 아바타{'\n'}
                    • 서비스 이용 시 생성 정보: 가족 대화 내역, 공유 캘린더 일정, 스몰톡 답변, 업로드 사진{'\n'}
                    • 포토북 제작 주문 시: 수령인 이름, 배송지 주소, 연락처 전화번호
                  </Text>

                  <Text style={styles.policyArticleTitle}>제2조 (개인정보 수집 및 이용 목적)</Text>
                  <Text style={styles.policyBodyText}>
                    1. 가족 구성원 간의 실시간 암호화 대화 및 스몰톡 질문 매칭{'\n'}
                    2. 반려몽 가상 펫 육성 게이미피케이션 및 온기 데이터 동기화{'\n'}
                    3. 실물 양장본 포토북 POD(Print on Demand) 주문 제작 및 배송
                  </Text>

                  <Text style={styles.policyArticleTitle}>제3조 (개인정보의 보유 및 파기 - 회원 탈퇴 연동)</Text>
                  <Text style={styles.policyBodyText}>
                    FamLink는 이용자가 회원 탈퇴를 요청하는 즉시 해당 이용자의 계정, 프로필, 작성 데이터 일체를 서버 및 로컬 데이터베이스에서 지체 없이 영구 파기합니다.{'\n'}
                    회원 탈퇴는 앱 내 [가족] 탭의 [내 계정 정보] → [회원 탈퇴] 버튼을 통해 언제든 즉시 실행할 수 있습니다.
                  </Text>

                  <Text style={styles.policyArticleTitle}>제4조 (제3자 데이터 판매 금지 및 보안)</Text>
                  <Text style={styles.policyBodyText}>
                    FamLink는 어떠한 경우에도 가족들의 사진, 대화, 개인정보를 광고 목적으로 제3자에게 판매하거나 마케팅 데이터로 제공하지 않습니다. 모든 데이터는 엄격한 접근 제어(RLS) 하에 안전하게 보호됩니다.
                  </Text>

                  <Text style={styles.policyArticleTitle}>제5조 (개인정보 보호책임자 및 문의처)</Text>
                  <Text style={styles.policyBodyText}>
                    • 개인정보 보호책임 부서: FamLink Privacy Team{'\n'}
                    • 문의 이메일: privacy@famlink.com
                  </Text>
                </View>
              ) : (
                <View style={styles.policyContentCard}>
                  <Text style={styles.policySectionHeading}>FamLink 서비스 이용약관</Text>
                  <Text style={styles.policyMetaText}>최종 수정일: 2026년 10월 9일</Text>

                  <Text style={styles.policyArticleTitle}>제1조 (목적)</Text>
                  <Text style={styles.policyBodyText}>
                    본 약관은 FamLink(이하 "서비스")가 제공하는 가족 전용 메신저, 스몰톡 문답, 반려몽 육성, 공유 캘린더 및 AI 포토북 출판 서비스의 이용 조건 및 절차를 규정함을 목적으로 합니다.
                  </Text>

                  <Text style={styles.policyArticleTitle}>제2조 (가족 그룹 및 계정 관리)</Text>
                  <Text style={styles.policyBodyText}>
                    1. 이용자는 초대 코드(Family Code)를 통해 가족 구성원과 비공개 그룹을 형성합니다.{'\n'}
                    2. 계정 정보는 본인이 직접 관리하여야 하며, 타인에게 양도하거나 대여할 수 없습니다.
                  </Text>

                  <Text style={styles.policyArticleTitle}>제3조 (실물 양장본 포토북 POD 서비스)</Text>
                  <Text style={styles.policyBodyText}>
                    1. 가족 스튜디오에서 편집한 150×210mm A5 하드커버 양장본은 주문 시 맞춤 POD 방식으로 실물 인쇄됩니다.{'\n'}
                    2. 가족들이 모은 포인트는 주문 시 정가 대비 할인 혜택으로 차감 적용될 수 있습니다.{'\n'}
                    3. 인쇄가 개시된 맞춤 주문 제작 상품의 특성상 단순 변심에 의한 취소는 제한될 수 있습니다.
                  </Text>

                  <Text style={styles.policyArticleTitle}>제4조 (이용자의 의무)</Text>
                  <Text style={styles.policyBodyText}>
                    이용자는 음란, 폭력, 타인의 권리를 침해하는 유해 콘텐츠를 게시할 수 없으며, 플랫폼의 건전한 가족 소통 환경을 준수해야 합니다.
                  </Text>

                  <Text style={styles.policyArticleTitle}>제5조 (서비스 종료 및 회원 탈퇴)</Text>
                  <Text style={styles.policyBodyText}>
                    이용자는 언제든지 앱 내 설정을 통해 회원 탈퇴를 진행할 수 있으며, 탈퇴 시 관련 데이터는 관련 법령이 정한 바에 따라 안전하게 즉시 파기 처리됩니다.
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Bottom Close CTA */}
            <TouchableOpacity
              style={styles.policyModalCloseCta}
              onPress={() => setPolicyModalVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.policyModalCloseCtaText}>확인</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Profile & Mood Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalView, { maxHeight: '88%' }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Edit3 size={18} color="#FF6B47" />
                <Text style={styles.modalHeader}>내 프로필 설정</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <IconClose size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
              {/* 1. KakaoTalk-style Avatar Preview & Photo Picker */}
              <Text style={styles.modalLabel}>프로필 사진 / 아바타</Text>
              <View style={styles.avatarPreviewWrap}>
                <TouchableOpacity
                  style={styles.avatarLargeCircleTouchable}
                  onPress={handlePickProfileImage}
                  activeOpacity={0.85}
                >
                  <View style={styles.avatarLargeCircle}>
                    {selectedAvatar && (selectedAvatar.startsWith('http') || selectedAvatar.startsWith('data:') || selectedAvatar.length > 50) ? (
                      <Image
                        source={{
                          uri:
                            selectedAvatar.startsWith('http') || selectedAvatar.startsWith('data:')
                              ? selectedAvatar
                              : `data:image/jpeg;base64,${selectedAvatar}`,
                        }}
                        style={styles.avatarLargeImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.avatarLargeText}>
                        {typeof selectedAvatar === 'string' && selectedAvatar.length <= 10 ? selectedAvatar : '👦'}
                      </Text>
                    )}
                  </View>
                  <View style={styles.avatarCameraBadge}>
                    <Camera size={14} color="#FFFFFF" strokeWidth={2.5} />
                  </View>
                </TouchableOpacity>

                {/* Photo Action Buttons */}
                <View style={styles.avatarActionBtnsRow}>
                  <TouchableOpacity
                    style={styles.avatarUploadBtn}
                    onPress={handlePickProfileImage}
                    activeOpacity={0.8}
                  >
                    <Camera size={14} color="#FF6B47" style={{ marginRight: 5 }} />
                    <Text style={styles.avatarUploadBtnText}>앨범에서 사진 선택</Text>
                  </TouchableOpacity>

                  {(selectedAvatar && (selectedAvatar.startsWith('http') || selectedAvatar.startsWith('data:'))) && (
                    <TouchableOpacity
                      style={styles.avatarResetBtn}
                      onPress={() => setSelectedAvatar('👦')}
                      activeOpacity={0.8}
                    >
                      <Trash2 size={13} color="#8E8E93" style={{ marginRight: 4 }} />
                      <Text style={styles.avatarResetBtnText}>기본 이모지로</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.avatarSubText}>
                  카카오톡처럼 사진첩에서 사진을 등록하거나 아래 캐릭터를 골라보세요
                </Text>
              </View>

              {/* Emoji Character Presets */}
              <Text style={[styles.modalLabel, { marginTop: 10, marginBottom: 8 }]}>또는 기본 캐릭터 이모티콘 선택</Text>
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

              {/* 2. Name & Role Input */}
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

              {/* 3. Mood Selector */}
              <Text style={[styles.modalLabel, { marginTop: 14 }]}>오늘의 기분 스티커</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiScroll} contentContainerStyle={{ paddingVertical: 4 }}>
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
                        }
                      ]}
                      onPress={() => setSelectedMood(item.id)}
                    >
                      <MoodIcon mood={item.id} size={22} color={item.color} />
                      <Text style={[styles.moodChipLabel, isSelected && { color: item.color, fontWeight: '800' }]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* 4. Status Message */}
              <Text style={[styles.modalLabel, { marginTop: 14 }]}>한 줄 상태 메시지</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="예: 공부 중, 퇴근길 피곤함, 헬스장 도착!"
                placeholderTextColor="#AEAEB2"
                value={statusText}
                onChangeText={setStatusText}
                maxLength={30}
              />
            </ScrollView>

            <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleSaveProfile} activeOpacity={0.85}>
              <Sparkles size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.modalConfirmBtnText}>프로필 저장 완료</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: commonStyles.screenContainer,
  subHeaderBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 64,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  subHeaderLeftGroup: {
    flex: 1,
    minWidth: 110,
    marginRight: 8,
  },
  subHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1917',
  },
  subHeaderSub: {
    fontSize: 12,
    color: '#78716C',
    marginTop: 2,
  },
  limitFullBadge: {
    backgroundColor: '#FFF1F0',
    borderColor: '#FFA39E',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  limitFullBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF4D4F',
  },
  subHeaderRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B47',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    flexShrink: 0,
    shadowColor: '#FF6B47',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  headerActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  codeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F5F0E8',
    alignItems: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78716C',
  },
  codeText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FF6B47',
    letterSpacing: 2,
    marginVertical: 10,
  },
  codeDesc: {
    fontSize: 12,
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: '#FFE8E0',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#FF6B47',
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F5F0E8',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1917',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0E8',
  },
  avatarBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  avatarText: {
    fontSize: 20,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
  },
  meBadge: {
    backgroundColor: '#FF6B47',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  meBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  moodBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  moodEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  moodStatusText: {
    fontSize: 12,
    color: '#78716C',
    fontWeight: '500',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBoxOnline: {
    backgroundColor: '#E8F8F5',
    borderColor: '#D1F2EB',
  },
  statusBoxOffline: {
    backgroundColor: '#FAF8F3',
    borderColor: '#F5F0E8',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusDotOnline: {
    backgroundColor: '#2ECC71',
  },
  statusDotOffline: {
    backgroundColor: '#A8A29E',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextOnline: {
    color: '#2ECC71',
  },
  statusTextOffline: {
    color: '#78716C',
  },
  inviteGuideCard: {
    backgroundColor: '#FFF5F2',
    borderWidth: 1,
    borderColor: '#FFE8E0',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  guideIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFE8E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  guideTextCol: {
    flex: 1,
    paddingRight: 6,
  },
  guideTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
    flexWrap: 'wrap',
    gap: 6,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1917',
  },
  guideTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#FFE8E0',
  },
  guideTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF6B47',
  },
  guideDesc: {
    fontSize: 11,
    color: '#78716C',
    lineHeight: 15,
  },
  guideActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE8E0',
  },
  accountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#F5F0E8',
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  accountHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78716C',
  },
  accountProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  accountInfoCol: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 10,
  },
  accountNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1917',
  },
  accountRoleTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716C',
  },
  accountEmailText: {
    fontSize: 11,
    color: '#78716C',
    marginTop: 2,
  },
  accountEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE8E0',
  },
  accountEditBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B47',
  },
  accountPolicyBox: {
    backgroundColor: '#FAF8F3',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F5F0E8',
    overflow: 'hidden',
    marginBottom: 14,
  },
  accountPolicyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  accountPolicyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountPolicyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#44403C',
  },
  accountPolicyDivider: {
    height: 1,
    backgroundColor: '#F5F0E8',
    marginHorizontal: 12,
  },
  accountBottomActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  accountLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F5F0E8',
  },
  accountLogoutBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78716C',
  },
  accountDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  accountDeleteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  policyTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FAF8F3',
    borderRadius: 12,
    padding: 4,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#F5F0E8',
  },
  policyTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  policyTabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  policyTabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78716C',
  },
  policyTabBtnTextActive: {
    fontWeight: '800',
    color: '#FF6B47',
  },
  policyContentCard: {
    backgroundColor: '#FAF8F3',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F5F0E8',
  },
  policySectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1917',
    marginBottom: 4,
  },
  policyMetaText: {
    fontSize: 11,
    color: '#A8A29E',
    marginBottom: 14,
    fontWeight: '500',
  },
  policyArticleTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#292524',
    marginTop: 10,
    marginBottom: 4,
  },
  policyBodyText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#57534E',
    fontWeight: '500',
  },
  policyModalCloseCta: {
    backgroundColor: '#FF6B47',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  policyModalCloseCtaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  modalOverlay: commonStyles.modalOverlay,
  modalView: commonStyles.modalBottomSheet,
  modalHeaderRow: commonStyles.modalHeaderRow,
  modalHeader: commonStyles.modalHeaderTitle,
  modalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78716C',
    marginBottom: 6,
    marginTop: 10,
  },
  avatarPreviewWrap: {
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#FAF8F3',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F5F0E8',
    marginBottom: 10,
  },
  avatarLargeCircleTouchable: {
    position: 'relative',
    marginBottom: 8,
  },
  avatarLargeCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF6B47',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarLargeImage: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FF6B47',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarActionBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  avatarUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F2',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFE8E0',
  },
  avatarUploadBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B47',
  },
  avatarResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F3',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F5F0E8',
  },
  avatarResetBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716C',
  },
  avatarLargeText: {
    fontSize: 40,
  },
  avatarSubText: {
    fontSize: 11,
    color: '#78716C',
    fontWeight: '500',
  },
  avatarGridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 6,
    marginBottom: 8,
  },
  avatarGridCell: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#F5F0E8',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarGridCellActive: {
    borderColor: '#FF6B47',
    backgroundColor: '#FFF5F2',
  },
  avatarGridEmoji: {
    fontSize: 22,
  },
  avatarCheckBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF6B47',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  modalRowInputs: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  emojiScroll: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingVertical: 4,
  },
  emojiChip: {
    width: 52,
    height: 58,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#F5F0E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
  },
  emojiChipActive: {
    borderColor: '#FF6B47',
    backgroundColor: '#FFF5F2',
  },
  moodChipLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#78716C',
    marginTop: 3,
  },
  modalInput: {
    backgroundColor: '#FAF8F3',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#1C1917',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F5F0E8',
  },
  modalConfirmBtn: {
    flexDirection: 'row',
    backgroundColor: '#FF6B47',
    padding: 14,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  modalConfirmBtnText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
