import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import {
  Heart,
  MessageCircle,
  Smile,
  Flame,
  BookOpen,
  Mail,
  ChevronRight,
} from 'lucide-react-native';
import styles from './PetmongStyles';

export interface PetmongWarmthModalProps {
  visible: boolean;
  onClose: () => void;
  characterName: string;
  characterLevel: number;
  familyWarmth: number;
  todayMessagesCount: number;
  todayResponsesCount: number;
  onOpenGrowthBook?: (() => void) | null;
  onOpenWriteWhisper?: (() => void) | null;
}

export default function PetmongWarmthModal({
  visible,
  onClose,
  characterName,
  characterLevel,
  familyWarmth,
  todayMessagesCount,
  todayResponsesCount,
  onOpenGrowthBook,
  onOpenWriteWhisper,
}: PetmongWarmthModalProps): React.ReactElement {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.warmthModalBackdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.warmthModalCard}>
          <View style={styles.warmthModalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Heart size={20} color="#FF4D6D" fill="#FF4D6D" />
              <Text style={styles.warmthModalTitle}>우리 가족 대화 온기</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.warmthModalClose}>닫기</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.warmthModalSubtitle}>
            {characterName}은(는) 가족들의 다정한 대화와 스몰톡을 먹고 자라요 🌱
          </Text>

          <View style={styles.warmthProgressCard}>
            <View style={styles.warmthProgressTop}>
              <Text style={styles.warmthScoreTitle}>오늘의 가족 온기 지수</Text>
              <Text style={styles.warmthScoreValue}>{familyWarmth}%</Text>
            </View>
            <View style={styles.warmthProgressBarBg}>
              <View
                style={[
                  styles.warmthProgressBarFill,
                  { width: `${familyWarmth}%` },
                ]}
              />
            </View>
            <Text style={styles.warmthProgressDesc}>
              {familyWarmth >= 80
                ? '💖 온기가 가득 차서 반려몽이 무척 행복해해요!'
                : familyWarmth >= 50
                ? '☕ 훈훈한 대화가 오가며 무럭무럭 자라는 중이에요.'
                : '💌 가족들의 안부와 대화가 더 필요해요!'}
            </Text>
          </View>

          <View style={styles.warmthStatsGrid}>
            <View style={styles.warmthStatBox}>
              <MessageCircle size={20} color="#2563EB" />
              <Text style={styles.warmthStatNum}>{todayMessagesCount}개</Text>
              <Text style={styles.warmthStatLabel}>오늘 나눈 대화</Text>
            </View>

            <View style={styles.warmthStatBox}>
              <Smile size={20} color="#16A34A" />
              <Text style={styles.warmthStatNum}>{todayResponsesCount}명</Text>
              <Text style={styles.warmthStatLabel}>스몰톡 답변 가족</Text>
            </View>

            <View style={styles.warmthStatBox}>
              <Flame size={20} color="#EA580C" />
              <Text style={styles.warmthStatNum}>Lv.{characterLevel}</Text>
              <Text style={styles.warmthStatLabel}>수호 성장 단계</Text>
            </View>
          </View>

          <View style={styles.warmthActionGrid}>
            {onOpenGrowthBook && (
              <TouchableOpacity
                style={styles.warmthSubActionBtn}
                onPress={() => {
                  onClose();
                  onOpenGrowthBook();
                }}
                activeOpacity={0.8}
              >
                <BookOpen size={16} color="#4F46E5" />
                <Text style={styles.warmthSubActionBtnText}>4단계 성장 도감</Text>
                <ChevronRight size={14} color="#A5B4FC" />
              </TouchableOpacity>
            )}

            {onOpenWriteWhisper && (
              <TouchableOpacity
                style={styles.warmthSubActionBtn}
                onPress={() => {
                  onClose();
                  onOpenWriteWhisper();
                }}
                activeOpacity={0.8}
              >
                <Mail size={16} color="#EC4899" />
                <Text style={styles.warmthSubActionBtnText}>비밀 귓속말 맡기기</Text>
                <ChevronRight size={14} color="#FBCFE8" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
