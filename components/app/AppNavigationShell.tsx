import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trophy, RotateCcw } from 'lucide-react-native';
import {
  TabHomeIcon,
  TabQuestIcon,
  TabPetIcon,
  TabChatIcon,
  TabBookIcon,
} from '../icons';
import UserAvatar from '../UserAvatar';
import { colors } from '../../theme';
import styles from './AppStyles';

export interface AppTopNavbarProps {
  points: number;
  isSupabaseReady: boolean;
  activeMember: {
    name?: string;
    avatar?: string;
    color?: string;
  };
  profileName?: string;
  onPressProfile: () => void;
}

export function AppTopNavbar({
  points,
  isSupabaseReady,
  activeMember,
  profileName,
  onPressProfile,
}: AppTopNavbarProps): React.ReactElement {
  return (
    <View style={styles.topNavbar}>
      <View style={styles.logoRow}>
        <Text style={styles.logoText}>FamLink</Text>
      </View>

      <View style={styles.topRightControls}>
        <View style={styles.pointIndicator}>
          <Trophy size={14} color="#F1C40F" style={{ marginRight: 4 }} />
          <Text style={styles.pointIndicatorText}>{points} P</Text>
        </View>

        {!isSupabaseReady ? (
          <TouchableOpacity
            style={[
              styles.userSwitcherButton,
              { borderColor: activeMember.color || colors.primary },
            ]}
            onPress={onPressProfile}
            activeOpacity={0.7}
          >
            <UserAvatar
              avatar={activeMember.avatar}
              size={22}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.switcherName}>{activeMember.name} (시뮬)</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.userBadge,
              { borderColor: activeMember.color || colors.primary },
            ]}
            onPress={onPressProfile}
            activeOpacity={0.7}
          >
            <UserAvatar
              avatar={activeMember.avatar}
              size={22}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.switcherName}>
              {profileName || activeMember.name}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export interface AppBottomTabbarProps {
  currentScreen: string;
  onSelectScreen: (screen: string) => void;
  hidden?: boolean;
}

export function AppBottomTabbar({
  currentScreen,
  onSelectScreen,
  hidden = false,
}: AppBottomTabbarProps): React.ReactElement | null {
  const [keyboardOpen, setKeyboardOpen] = useState<boolean>(false);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (hidden || keyboardOpen) {
    return null;
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.tabbarContainer}>
      <View style={styles.tabbar}>
        <TouchableOpacity
          style={[styles.tabItem, currentScreen === 'home' && styles.tabItemActive]}
          onPress={() => onSelectScreen('home')}
          activeOpacity={0.8}
        >
          <TabHomeIcon
            size={20}
            color={currentScreen === 'home' ? colors.primary : colors.text.muted}
            focused={currentScreen === 'home'}
          />
          <Text
            style={[
              styles.tabLabel,
              currentScreen === 'home' && styles.tabLabelActive,
            ]}
          >
            홈
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            currentScreen === 'smalltalk' && styles.tabItemActive,
          ]}
          onPress={() => onSelectScreen('smalltalk')}
          activeOpacity={0.8}
        >
          <TabQuestIcon
            size={20}
            color={
              currentScreen === 'smalltalk' ? colors.primary : colors.text.muted
            }
            focused={currentScreen === 'smalltalk'}
          />
          <Text
            style={[
              styles.tabLabel,
              currentScreen === 'smalltalk' && styles.tabLabelActive,
            ]}
          >
            함께
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            currentScreen === 'interior' && styles.tabItemActive,
          ]}
          onPress={() => onSelectScreen('interior')}
          activeOpacity={0.8}
        >
          <TabPetIcon
            size={20}
            color={
              currentScreen === 'interior' ? colors.primary : colors.text.muted
            }
            focused={currentScreen === 'interior'}
          />
          <Text
            style={[
              styles.tabLabel,
              currentScreen === 'interior' && styles.tabLabelActive,
            ]}
          >
            반려몽
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, currentScreen === 'chat' && styles.tabItemActive]}
          onPress={() => onSelectScreen('chat')}
          activeOpacity={0.8}
        >
          <TabChatIcon
            size={20}
            color={currentScreen === 'chat' ? colors.primary : colors.text.muted}
            focused={currentScreen === 'chat'}
          />
          <Text
            style={[
              styles.tabLabel,
              currentScreen === 'chat' && styles.tabLabelActive,
            ]}
          >
            채팅
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, currentScreen === 'album' && styles.tabItemActive]}
          onPress={() => onSelectScreen('album')}
          activeOpacity={0.8}
        >
          <TabBookIcon
            size={20}
            color={currentScreen === 'album' ? colors.primary : colors.text.muted}
            focused={currentScreen === 'album'}
          />
          <Text
            style={[
              styles.tabLabel,
              currentScreen === 'album' && styles.tabLabelActive,
            ]}
          >
            앨범
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export interface AppGlobalModalsProps {
  userModalVisible: boolean;
  setUserModalVisible: (visible: boolean) => void;
  familyMembersList: any[];
  profile: any;
  currentUser: string;
  switchUser: (member: any) => void;
  handleResetData: () => void;
  celebrationVisible: boolean;
  setCelebrationVisible: (visible: boolean) => void;
}

export function AppGlobalModals({
  userModalVisible,
  setUserModalVisible,
  familyMembersList,
  profile,
  currentUser,
  switchUser,
  handleResetData,
  celebrationVisible,
  setCelebrationVisible,
}: AppGlobalModalsProps): React.ReactElement {
  return (
    <>
      <Modal
        animationType="fade"
        transparent={true}
        visible={userModalVisible}
        onRequestClose={() => setUserModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setUserModalVisible(false)}
        >
          <View style={styles.switcherModal}>
            <Text style={styles.switcherModalTitle}>시뮬레이터 계정 전환</Text>
            <Text style={styles.switcherModalDesc}>
              가족 역할을 바꾸며 테스트해 보세요.
            </Text>

            <View style={styles.membersGrid}>
              {familyMembersList.map((member) => {
                const isCurrent =
                  profile?.id && member.id
                    ? profile.id === member.id
                    : currentUser === member.id || currentUser === member.role;
                return (
                  <TouchableOpacity
                    key={member.id || member.role}
                    style={[
                      styles.memberSelectCard,
                      { borderColor: isCurrent ? member.color : '#EBEBEB' },
                      isCurrent && { backgroundColor: member.color + '10' },
                    ]}
                    onPress={() => switchUser(member)}
                  >
                    <UserAvatar
                      avatar={member.avatar}
                      size={36}
                      style={{ marginBottom: 4 }}
                    />
                    <Text
                      style={[
                        styles.memberSelectName,
                        isCurrent && {
                          fontWeight: 'bold',
                          color: member.color,
                        },
                      ]}
                    >
                      {member.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.resetButton} onPress={handleResetData}>
              <RotateCcw size={13} color="#E74C3C" style={{ marginRight: 6 }} />
              <Text style={styles.resetButtonText}>목업 데이터 리셋</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setUserModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={celebrationVisible}
        onRequestClose={() => setCelebrationVisible(false)}
      >
        <View style={styles.celebrationOverlay}>
          <View style={styles.celebrationCard}>
            <Text style={styles.celebrationEmoji}>🎉🏆🎉</Text>
            <Text style={styles.celebrationTitle}>가족 전원 답변 완료!</Text>
            <Text style={styles.celebrationText}>
              오늘의 스몰톡 미션이 완료되었습니다.
            </Text>
            <Text style={styles.celebrationPoints}>+100 포인트 적립!</Text>
            <Text style={styles.celebrationSub}>
              차곡차곡 모아 가족 포토북을 발주해보세요 ✨
            </Text>

            <TouchableOpacity
              style={styles.celebrationCloseButton}
              onPress={() => setCelebrationVisible(false)}
            >
              <Text style={styles.celebrationCloseText}>신난다!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
