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
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Users, Copy, Share2, Heart, Award, ShieldCheck, Smile, Edit3, X } from 'lucide-react-native';

const FAMILY_MEMBERS_STATIC = {
  mom: { name: '엄마', avatar: '👩‍🦰', color: '#FF7E82' },
  dad: { name: '아빠', avatar: '👨‍💼', color: '#4A90E2' },
  son: { name: '아들', avatar: '👦', color: '#2ECC71' },
  daughter: { name: '딸', avatar: '👧', color: '#F39C12' },
};

const MOOD_EMOJIS = ['😊', '😄', '😴', '✏️', '🛍️', '🍗', '💪', '❤️', '🏠', '🎮'];

export default function FamilyScreen({ familyCode, familyMembersList, currentUserProfile, onUpdateMood }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMood, setSelectedMood] = useState(currentUserProfile?.mood || '😊');
  const [statusText, setStatusText] = useState(currentUserProfile?.status_text || '');

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(familyCode);
    Alert.alert('복사 완료', '가족 코드가 클립보드에 복사되었습니다. 다른 가족에게 보내 가입하도록 하세요!');
  };

  const handleCopyInviteMessage = async () => {
    const inviteMsg = `[FamLink] 우리 가족만의 소통 공간에 당신을 초대합니다! ❤️\n\n앱을 설치하고 가입하실 때 아래 가족 코드를 입력하시면 같이 채팅과 일정을 공유할 수 있어요.\n\n가족 코드: ${familyCode}`;
    await Clipboard.setStringAsync(inviteMsg);
    Alert.alert('초대문구 복사', '초대 메시지가 복사되었습니다. 카카오톡이나 메시지로 가족에게 전송해 보세요!');
  };

  const handleSaveMood = () => {
    if (onUpdateMood) {
      onUpdateMood(selectedMood, statusText.trim());
    }
    setModalVisible(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Family Code Card */}
      <View style={styles.codeCard}>
        <View style={styles.cardHeader}>
          <Users size={20} color="#FF7E82" style={{ marginRight: 6 }} />
          <Text style={styles.cardHeaderTitle}>우리 가족 연결 코드</Text>
        </View>
        <Text style={styles.codeText}>{familyCode}</Text>
        <Text style={styles.codeDesc}>
          다른 가족들이 가입 시 이 코드를 입력하면 이 방으로 자동 연결됩니다.
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCopyCode}>
            <Copy size={14} color="#FF7E82" style={{ marginRight: 4 }} />
            <Text style={styles.actionButtonText}>코드 복사</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleCopyInviteMessage}>
            <Share2 size={14} color="#FF7E82" style={{ marginRight: 4 }} />
            <Text style={styles.actionButtonText}>초대 링크 복사</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Member List Section */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeader}>
            <Heart size={18} color="#FF7E82" fill="#FF7E82" style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>가입된 가족 멤버 ({familyMembersList.length}명)</Text>
          </View>

          {/* Update My Mood Button */}
          <TouchableOpacity style={styles.updateMoodBtn} onPress={() => setModalVisible(true)}>
            <Smile size={14} color="#FF7E82" style={{ marginRight: 4 }} />
            <Text style={styles.updateMoodBtnText}>내 기분 변경</Text>
          </TouchableOpacity>
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

          return (
            <View key={isDbProfile ? member.id : roleKey} style={styles.memberItem}>
              <View style={[styles.avatarBox, { backgroundColor: memberColor + '15' }]}>
                <Text style={styles.avatarText}>{memberAvatar}</Text>
              </View>

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
                  <Text style={styles.moodEmoji}>{moodEmoji}</Text>
                  <Text style={styles.moodStatusText}>
                    {memberStatusText || '오늘도 화이팅! ❤️'}
                  </Text>
                </View>
              </View>

              <View style={styles.statusBox}>
                <ShieldCheck size={14} color="#2ECC71" style={{ marginRight: 4 }} />
                <Text style={styles.statusText}>연결됨</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Invite Guide Box */}
      <View style={styles.inviteGuideCard}>
        <Award size={22} color="#FF7E82" style={{ marginBottom: 8 }} />
        <Text style={styles.guideTitle}>가족 단합 미션 시작하기!</Text>
        <Text style={styles.guideDesc}>
          더 많은 가족이 가입하여 미션을 수행할수록 스몰톡 포인트가 더 빨리 쌓입니다. 모은 포인트로 포인트 상점에서 다양한 쿠폰을 획득해 보세요!
        </Text>
      </View>

      {/* Mood Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeader}>오늘의 기분 & 한 줄 상태</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>기분 이모지 선택</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiScroll}>
              {MOOD_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.emojiChip, selectedMood === emoji && styles.emojiChipActive]}
                  onPress={() => setSelectedMood(emoji)}
                >
                  <Text style={styles.emojiChipText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>한 줄 상태 메시지</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="예: 공부 중, 퇴근길 피곤함, 헬스장 도착!"
              placeholderTextColor="#AEAEB2"
              value={statusText}
              onChangeText={setStatusText}
              maxLength={30}
            />

            <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleSaveMood}>
              <Text style={styles.modalConfirmBtnText}>상태 업데이트</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
    borderColor: '#EBEBEB',
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
    color: '#8E8E93',
  },
  codeText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FF7E82',
    letterSpacing: 2,
    marginVertical: 10,
  },
  codeDesc: {
    fontSize: 11,
    color: '#AEAEB2',
    textAlign: 'center',
    lineHeight: 16,
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
    backgroundColor: '#FFF2F3',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginHorizontal: 6,
    borderWidth: 0.5,
    borderColor: '#FFA2A5',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#FF7E82',
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  updateMoodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF2F3',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#FFA2A5',
  },
  updateMoodBtnText: {
    fontSize: 11,
    color: '#FF7E82',
    fontWeight: '700',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F2F2F7',
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
    fontSize: 14,
    fontWeight: '700',
  },
  meBadge: {
    backgroundColor: '#FF7E82',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginLeft: 6,
  },
  meBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
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
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    color: '#2ECC71',
    fontWeight: '700',
  },
  inviteGuideCard: {
    backgroundColor: '#FFF8F8',
    borderWidth: 1,
    borderColor: '#FFEBEB',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF7E82',
    marginBottom: 4,
  },
  guideDesc: {
    fontSize: 11,
    color: '#8E8E93',
    lineHeight: 16,
    textAlign: 'center',
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
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  emojiScroll: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingVertical: 4,
  },
  emojiChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#EBEBEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  emojiChipActive: {
    borderColor: '#FF7E82',
    backgroundColor: '#FFF2F3',
  },
  emojiChipText: {
    fontSize: 22,
  },
  modalInput: {
    backgroundColor: '#F1F2F4',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#1C1C1E',
    marginBottom: 16,
  },
  modalConfirmBtn: {
    backgroundColor: '#FF7E82',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
