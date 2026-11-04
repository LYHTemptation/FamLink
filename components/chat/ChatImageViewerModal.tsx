import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  Image as ImageIcon,
  FileText,
  Video,
  FolderOpen,
} from 'lucide-react-native';
import styles from './ChatStyles';
import { extractReactionsAndCleanText, parseReplyHeader } from './chatHelpers';

export interface ViewerImageState {
  uri: string;
  senderName?: string;
  timestamp?: string;
}

export interface ChatImageViewerAndDrawerProps {
  viewerImage: ViewerImageState | null;
  onCloseViewer: () => void;
  mediaDrawerVisible: boolean;
  onCloseMediaDrawer: () => void;
  roomMessages: any[];
  onSelectPhotoFromDrawer: (photo: ViewerImageState) => void;
  insetsTop: number;
  insetsBottom: number;
}

export default function ChatImageViewerModal({
  viewerImage,
  onCloseViewer,
  mediaDrawerVisible,
  onCloseMediaDrawer,
  roomMessages,
  onSelectPhotoFromDrawer,
  insetsTop,
  insetsBottom,
}: ChatImageViewerAndDrawerProps): React.ReactElement {
  const [isZoomed, setIsZoomed] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'photos' | 'files'>('photos');

  const handleCloseViewer = () => {
    setIsZoomed(false);
    onCloseViewer();
  };

  const handleDownloadOrOpenImage = (uri: string) => {
    if (!uri) return;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const a = document.createElement('a');
        a.href = uri;
        a.target = '_blank';
        a.download = `famlink_photo_${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      } catch (_) {}
    }
    Linking.openURL(uri).catch(() => {
      Alert.alert('사진 저장 안내', '사진을 길게 눌러 기기에 저장하거나 외부 브라우저에서 열 수 있습니다.');
    });
  };

  // 대화방 내 공유된 사진 및 파일/동영상 추출 (⚡ 지연 평가: 서랍이 열렸을 때만 연산하여 평상시 채팅 CPU 0% 유지)
  const { sharedPhotos, sharedFiles } = useMemo(() => {
    if (!mediaDrawerVisible) {
      return { sharedPhotos: [], sharedFiles: [] };
    }
    const photos: { id: string; uri: string; senderName: string; timestamp: string }[] = [];
    const files: {
      id: string;
      type: 'file' | 'video';
      name: string;
      subInfo: string;
      uri: string;
      timestamp: string;
    }[] = [];

    roomMessages.forEach((msg, idx) => {
      const raw = typeof msg.text === 'string' ? msg.text : '';
      const { cleanText } = extractReactionsAndCleanText(raw);
      const replyMeta = parseReplyHeader(cleanText);
      const bodyText = replyMeta ? replyMeta.cleanText : cleanText;
      if (bodyText === '[삭제된 메시지입니다]') return;

      const imgUri = msg.image || msg.image_url;
      if (imgUri) {
        photos.push({
          id: String(msg.id || `photo-${idx}`),
          uri: imgUri,
          senderName: msg.senderName || msg.senderObj?.name || '가족',
          timestamp: msg.timestamp || '',
        });
      }

      if (bodyText.startsWith('[파일] ')) {
        try {
          const parsed = JSON.parse(bodyText.replace('[파일] ', ''));
          files.push({
            id: String(msg.id || `file-${idx}`),
            type: 'file',
            name: parsed.name || '첨부파일',
            subInfo: parsed.size || '문서 파일',
            uri: parsed.uri || '',
            timestamp: msg.timestamp || '',
          });
        } catch (_) {}
      } else if (bodyText.startsWith('[동영상] ')) {
        try {
          const parsed = JSON.parse(bodyText.replace('[동영상] ', ''));
          files.push({
            id: String(msg.id || `video-${idx}`),
            type: 'video',
            name: parsed.name || '가족 동영상',
            subInfo: parsed.duration ? `${parsed.duration}초 동영상` : '동영상',
            uri: parsed.uri || '',
            timestamp: msg.timestamp || '',
          });
        } catch (_) {}
      }
    });

    return {
      sharedPhotos: photos.reverse(),
      sharedFiles: files.reverse(),
    };
  }, [roomMessages]);

  return (
    <>
      {/* 1. 대화방 사진·파일 모아보기 서랍 (Media Drawer Modal) */}
      <Modal
        visible={mediaDrawerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={onCloseMediaDrawer}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.overlayBackdrop}
            activeOpacity={1}
            onPress={onCloseMediaDrawer}
          />
          <View
            style={[
              styles.mediaDrawerSheet,
              { paddingBottom: Math.max(24, insetsBottom + 12) },
            ]}
          >
            <View style={styles.sheetHandleBar} />
            <View style={styles.mediaDrawerHeader}>
              <View style={styles.mediaDrawerTitleRow}>
                <FolderOpen size={19} color="#FF6B47" style={{ marginRight: 7 }} />
                <Text style={styles.mediaDrawerTitle}>대화방 서랍 (사진·파일 모아보기)</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={onCloseMediaDrawer}
              >
                <X size={18} color="#78716C" />
              </TouchableOpacity>
            </View>

            {/* 탭 전환 (사진 / 파일·동영상) */}
            <View style={styles.mediaDrawerTabBar}>
              <TouchableOpacity
                style={[
                  styles.mediaDrawerTabBtn,
                  drawerTab === 'photos' && styles.mediaDrawerTabBtnActive,
                ]}
                onPress={() => setDrawerTab('photos')}
              >
                <ImageIcon
                  size={15}
                  color={drawerTab === 'photos' ? '#FF6B47' : '#78716C'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.mediaDrawerTabText,
                    drawerTab === 'photos' && styles.mediaDrawerTabTextActive,
                  ]}
                >
                  사진 ({sharedPhotos.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.mediaDrawerTabBtn,
                  drawerTab === 'files' && styles.mediaDrawerTabBtnActive,
                ]}
                onPress={() => setDrawerTab('files')}
              >
                <FileText
                  size={15}
                  color={drawerTab === 'files' ? '#FF6B47' : '#78716C'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.mediaDrawerTabText,
                    drawerTab === 'files' && styles.mediaDrawerTabTextActive,
                  ]}
                >
                  파일·동영상 ({sharedFiles.length})
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.mediaDrawerContentScroll}
              showsVerticalScrollIndicator={false}
            >
              {drawerTab === 'photos' ? (
                sharedPhotos.length === 0 ? (
                  <View style={styles.mediaDrawerEmptyBox}>
                    <ImageIcon size={32} color="#D6D3D1" />
                    <Text style={styles.mediaDrawerEmptyText}>
                      이 대화방에서 공유된 사진이 아직 없습니다.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.mediaPhotoGrid}>
                    {sharedPhotos.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={styles.mediaPhotoGridCell}
                        activeOpacity={0.85}
                        onPress={() => {
                          onCloseMediaDrawer();
                          onSelectPhotoFromDrawer({
                            uri: p.uri,
                            senderName: p.senderName,
                            timestamp: p.timestamp,
                          });
                        }}
                      >
                        <Image
                          source={{ uri: p.uri }}
                          style={styles.mediaPhotoGridImg}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                )
              ) : sharedFiles.length === 0 ? (
                <View style={styles.mediaDrawerEmptyBox}>
                  <FileText size={32} color="#D6D3D1" />
                  <Text style={styles.mediaDrawerEmptyText}>
                    이 대화방에서 공유된 문서나 동영상이 없습니다.
                  </Text>
                </View>
              ) : (
                <View style={styles.mediaFileList}>
                  {sharedFiles.map((f) => (
                    <TouchableOpacity
                      key={f.id}
                      style={styles.mediaFileRowCard}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (f.uri) {
                          Linking.openURL(f.uri).catch(() => {
                            Alert.alert('파일 안내', f.name);
                          });
                        } else {
                          Alert.alert('파일 안내', f.name);
                        }
                      }}
                    >
                      <View
                        style={[
                          styles.fileIconBadge,
                          f.type === 'video' && { backgroundColor: '#FAF5FF' },
                        ]}
                      >
                        {f.type === 'video' ? (
                          <Video size={20} color="#8B5CF6" />
                        ) : (
                          <FileText size={20} color="#FF6B47" />
                        )}
                      </View>
                      <View style={styles.fileDetails}>
                        <Text style={styles.fileNameText} numberOfLines={1}>
                          {f.name}
                        </Text>
                        <Text style={styles.fileSizeText}>
                          {f.subInfo} · {f.timestamp}
                        </Text>
                      </View>
                      <Download size={18} color="#78716C" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 2. 채팅 사진 전체화면 확대/저장 뷰어 모달 */}
      <Modal
        visible={Boolean(viewerImage)}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseViewer}
      >
        <View style={styles.imageViewerOverlay}>
          {/* 상단 컨트롤 바 */}
          <View
            style={[
              styles.imageViewerTopBar,
              { paddingTop: Math.max(16, insetsTop + 8) },
            ]}
          >
            <View style={styles.imageViewerMetaCol}>
              <Text style={styles.imageViewerSenderText}>
                {viewerImage?.senderName || '가족 사진'}
              </Text>
              {Boolean(viewerImage?.timestamp) && (
                <Text style={styles.imageViewerTimeText}>
                  {viewerImage?.timestamp}
                </Text>
              )}
            </View>

            <View style={styles.imageViewerActionsRow}>
              <TouchableOpacity
                style={styles.imageViewerIconBtn}
                onPress={() => setIsZoomed((prev) => !prev)}
              >
                {isZoomed ? (
                  <ZoomOut size={20} color="#FFFFFF" />
                ) : (
                  <ZoomIn size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.imageViewerIconBtn}
                onPress={() =>
                  viewerImage?.uri && handleDownloadOrOpenImage(viewerImage.uri)
                }
              >
                <Download size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.imageViewerIconBtn}
                onPress={handleCloseViewer}
              >
                <X size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* 본문 이미지 (확대/축소 지원) */}
          <ScrollView
            contentContainerStyle={styles.imageViewerScrollContent}
            horizontal={isZoomed}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              activeOpacity={0.95}
              onPress={() => setIsZoomed((prev) => !prev)}
              style={styles.imageViewerTouchArea}
            >
              {viewerImage?.uri ? (
                <Image
                  source={{ uri: viewerImage.uri }}
                  style={
                    isZoomed
                      ? styles.imageViewerImgZoomed
                      : styles.imageViewerImgFit
                  }
                  resizeMode="contain"
                />
              ) : null}
            </TouchableOpacity>
          </ScrollView>

          {/* 하단 안내 캡션 */}
          <View
            style={[
              styles.imageViewerBottomBar,
              { paddingBottom: Math.max(20, insetsBottom + 10) },
            ]}
          >
            <Text style={styles.imageViewerHintText}>
              사진을 탭하면 {isZoomed ? '화면에 맞춤' : '2배 확대'}됩니다
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}
