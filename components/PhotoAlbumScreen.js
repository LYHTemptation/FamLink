import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { Image as ImageIcon, X, Calendar, User, BookOpen } from 'lucide-react-native';
import FamilyStorybookModal from './FamilyStorybookModal';
import { colors, typography, commonStyles } from '../theme';

const { width } = Dimensions.get('window');
const GRID_ITEM_SIZE = (width - 48) / 3;

export default function PhotoAlbumScreen({
  messages,
  familyMembers,
  smallTalkState,
  currentUserProfile,
  onSendOrderNotice,
  points = 0,
  onDeductPoints,
}) {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [storybookVisible, setStorybookVisible] = useState(false);

  // Extract all messages containing image URLs or image URIs
  const photoMessages = messages
    ? messages.filter(m => m.image || m.image_url)
    : [];

  const getSenderInfo = (profileId, senderRole, senderObj) => {
    if (senderObj && typeof senderObj === 'object' && senderObj.name) {
      return {
        name: senderObj.name,
        avatar: senderObj.avatar || '👦',
        color: senderObj.color || '#4A90E2',
      };
    }
    if (familyMembers && Array.isArray(familyMembers)) {
      if (profileId) {
        const matchById = familyMembers.find(m => m && typeof m === 'object' && m.id === profileId);
        if (matchById) return { name: matchById.name, avatar: matchById.avatar || '👦', color: matchById.color || '#4A90E2' };
      }
      if (senderRole) {
        const matchByRole = familyMembers.find(m => m && typeof m === 'object' && (m.role === senderRole || m.id === senderRole));
        if (matchByRole) return { name: matchByRole.name, avatar: matchByRole.avatar || '👦', color: matchByRole.color || '#4A90E2' };
      }
    }
    const DEFAULTS = {
      mom: { name: '엄마', avatar: '👩‍🦰', color: '#FF7E82' },
      dad: { name: '아빠', avatar: '👨‍💼', color: '#4A90E2' },
      son: { name: '아들', avatar: '👦', color: '#2ECC71' },
      daughter: { name: '딸', avatar: '👧', color: '#F39C12' },
    };
    return DEFAULTS[senderRole] || { name: senderRole || '가족', avatar: '👦', color: '#8E8E93' };
  };

  return (
    <View style={styles.container}>
      {/* Sub-header Bar */}
      <View style={styles.subHeaderBar}>
        <View>
          <Text style={styles.subHeaderTitle}>추억 앨범</Text>
          <Text style={styles.subHeaderSub}>공유된 사진 {photoMessages.length}장</Text>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.storybookBtn}
            onPress={() => setStorybookVisible(true)}
            activeOpacity={0.8}
          >
            <BookOpen size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
            <Text style={styles.storybookBtnText}>이야기책 출판</Text>
          </TouchableOpacity>

          <View style={styles.photoCountBadge}>
            <ImageIcon size={14} color="#FF7E82" style={{ marginRight: 4 }} />
            <Text style={styles.photoCountBadgeText}>{photoMessages.length}장</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Photo Grid */}
        {photoMessages.length === 0 ? (
          <View style={styles.emptyBox}>
            <ImageIcon size={40} color="#D1D1D6" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyText}>아직 메신저에 공유된 사진이 없습니다.</Text>
            <Text style={styles.emptySub}>대화창에서 카메라/갤러리 사진을 공유해보세요!</Text>
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {photoMessages.map((msg) => {
              const photoUri = msg.image_url || msg.image;
              const sender = getSenderInfo(msg.profile_id, msg.sender, msg.senderObj);

              return (
                <TouchableOpacity
                  key={msg.id}
                  style={styles.gridCell}
                  onPress={() => setSelectedPhoto({ ...msg, photoUri, sender })}
                >
                  <Image source={{ uri: photoUri }} style={styles.gridImage} resizeMode="cover" />
                  <View style={styles.senderBadge}>
                    <Text style={styles.senderAvatar}>{sender.avatar}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Full Photo Modal Preview */}
      <Modal
        visible={!!selectedPhoto}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        {selectedPhoto && (
          <View style={styles.modalBg}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setSelectedPhoto(null)}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <X size={28} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalBackdropTouch}
              activeOpacity={1}
              onPress={() => setSelectedPhoto(null)}
            >
              <Image
                source={{ uri: selectedPhoto.photoUri }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            </TouchableOpacity>

            <View style={styles.photoFooter}>
              <View style={styles.footerSenderRow}>
                <Text style={styles.footerAvatar}>{selectedPhoto.sender?.avatar || '👦'}</Text>
                <Text style={[styles.footerSenderName, { color: selectedPhoto.sender?.color || '#FF7E82' }]}>
                  {selectedPhoto.sender?.name || '가족'}
                </Text>
              </View>
              {selectedPhoto.text ? (
                <Text style={styles.photoCaption}>"{selectedPhoto.text}"</Text>
              ) : null}
              <Text style={styles.photoTime}>
                {selectedPhoto.timestamp || (selectedPhoto.created_at ? new Date(selectedPhoto.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '가족 단톡방 공유')}
              </Text>
            </View>
          </View>
        )}
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
  scrollContent: commonStyles.scrollContent,
  subHeaderBar: commonStyles.subHeaderBar,
  subHeaderTitle: commonStyles.subHeaderTitle,
  subHeaderSub: commonStyles.subHeaderSub,
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  storybookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF7E82',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    shadowColor: '#FF7E82',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  storybookBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  photoCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF2F3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFE5E7',
  },
  photoCountBadgeText: {
    fontSize: 12,
    color: '#FF7E82',
    fontWeight: '700',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EBEBEB',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8E8E93',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: '#AEAEB2',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridCell: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#EBEBEB',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  senderBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  senderAvatar: {
    fontSize: 12,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdropTouch: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 20,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
  },
  fullPhotoContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 20,
    padding: 10,
  },
  fullImage: {
    width: width,
    height: width * 1.2,
  },
  photoFooter: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 16,
    borderRadius: 16,
  },
  footerSenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  footerAvatar: {
    fontSize: 20,
    marginRight: 6,
  },
  footerSenderName: {
    fontSize: 15,
    fontWeight: '800',
  },
  photoCaption: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 4,
  },
  photoTime: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
});
