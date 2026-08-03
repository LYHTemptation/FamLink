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
import { Image as ImageIcon, X, Calendar, User } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const GRID_ITEM_SIZE = (width - 48) / 3;

export default function PhotoAlbumScreen({ messages, familyMembers }) {
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Extract all messages containing image URLs or image URIs
  const photoMessages = messages
    ? messages.filter(m => m.image || m.image_url)
    : [];

  const getSenderInfo = (senderKey) => {
    if (familyMembers && Array.isArray(familyMembers)) {
      const match = familyMembers.find(m => m && typeof m === 'object' && (m.role === senderKey || m.id === senderKey));
      if (match) return { name: match.name, avatar: match.avatar, color: match.color };
    }
    const DEFAULTS = {
      mom: { name: '엄마', avatar: '👩‍🦰', color: '#FF7E82' },
      dad: { name: '아빠', avatar: '👨‍💼', color: '#4A90E2' },
      son: { name: '아들', avatar: '👦', color: '#2ECC71' },
      daughter: { name: '딸', avatar: '👧', color: '#F39C12' },
    };
    return DEFAULTS[senderKey] || { name: senderKey, avatar: '👦', color: '#8E8E93' };
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Banner */}
        <View style={styles.headerCard}>
          <View style={styles.headerTitleRow}>
            <ImageIcon size={22} color="#FF7E82" style={{ marginRight: 8 }} />
            <Text style={styles.headerTitle}>가족 추억 앨범 🖼️</Text>
          </View>
          <Text style={styles.headerSub}>
            메신저에서 주고받은 소중한 사진들이 자동으로 모이는 우리 가족 전원 갤러리입니다. (총 {photoMessages.length}장)
          </Text>
        </View>

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
              const sender = getSenderInfo(msg.sender);

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
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedPhoto(null)}>
              <X size={26} color="#FFFFFF" />
            </TouchableOpacity>

            <Image
              source={{ uri: selectedPhoto.photoUri }}
              style={styles.fullImage}
              resizeMode="contain"
            />

            <View style={styles.photoFooter}>
              <View style={styles.footerSenderRow}>
                <Text style={styles.footerAvatar}>{selectedPhoto.sender.avatar}</Text>
                <Text style={[styles.footerSenderName, { color: selectedPhoto.sender.color }]}>
                  {selectedPhoto.sender.name}
                </Text>
              </View>
              {selectedPhoto.text ? (
                <Text style={styles.photoCaption}>"{selectedPhoto.text}"</Text>
              ) : null}
              <Text style={styles.photoTime}>{selectedPhoto.timestamp || '가족 단톡방 공유'}</Text>
            </View>
          </View>
        )}
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
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  headerSub: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 18,
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
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
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
