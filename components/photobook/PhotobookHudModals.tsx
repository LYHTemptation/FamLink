import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import {
  Palette,
  Type,
  BookOpen,
  X,
  Check,
  ChevronRight,
} from 'lucide-react-native';
import { colors } from '../../theme';
import {
  STUDIO_THEMES,
  TOTAL_PHOTOBOOK_PAGES,
} from './photobookConstants';
import styles from './PhotobookStyles';

export interface PhotobookHudModalsProps {
  fullViewerVisible: boolean;
  themePickerModalVisible: boolean;
  setThemePickerModalVisible: (visible: boolean) => void;
  selectedThemeId: string;
  setSelectedThemeId: (id: string) => void;
  fontPickerModalVisible: boolean;
  setFontPickerModalVisible: (visible: boolean) => void;
  bookFontFamily: string;
  setBookFontFamily: (font: string) => void;
  bookFontSize: string;
  setBookFontSize: (size: string) => void;
  pagePickerModalVisible: boolean;
  setPagePickerModalVisible: (visible: boolean) => void;
  currentPageNum: number;
  handleGoToPage: (pageNum: number) => void;
  getPageFormat: (sIdx: number, side: 'left' | 'right') => string;
  broadcastPhotobookChange: (partial: Record<string, any>) => void;
}

export default function PhotobookHudModals({
  fullViewerVisible,
  themePickerModalVisible,
  setThemePickerModalVisible,
  selectedThemeId,
  setSelectedThemeId,
  fontPickerModalVisible,
  setFontPickerModalVisible,
  bookFontFamily,
  setBookFontFamily,
  bookFontSize,
  setBookFontSize,
  pagePickerModalVisible,
  setPagePickerModalVisible,
  currentPageNum,
  handleGoToPage,
  getPageFormat,
  broadcastPhotobookChange,
}: PhotobookHudModalsProps): React.ReactElement {
  return (
    <>
      {/* 3-1. 테마 선택 모달 (Theme Picker Modal) */}
      <Modal
        visible={!fullViewerVisible && themePickerModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setThemePickerModalVisible(false)}
      >
        <View style={styles.modalCenterBackdrop}>
          <TouchableOpacity
            style={styles.modalCenterBackdropTouch}
            activeOpacity={1}
            onPress={() => setThemePickerModalVisible(false)}
          />
          <View style={styles.miniPickerCard}>
            <View style={styles.miniPickerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Palette size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.miniPickerTitle}>포토북 테마 팔레트</Text>
              </View>
              <TouchableOpacity
                onPress={() => setThemePickerModalVisible(false)}
                style={styles.closeBtn}
              >
                <X size={18} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.themeOptionsGrid2x2}>
              {STUDIO_THEMES.map((t) => {
                const isSelected = selectedThemeId === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.themeOptionItem2x2,
                      isSelected && styles.themeOptionItemActive,
                      {
                        backgroundColor: t.bg,
                        borderColor: isSelected ? colors.primary : t.border,
                      },
                    ]}
                    onPress={() => {
                      setSelectedThemeId(t.id);
                      broadcastPhotobookChange({ selectedThemeId: t.id });
                      setThemePickerModalVisible(false);
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.themeDotBig, { backgroundColor: t.accent }]} />
                    <Text
                      style={[styles.themeOptionItemName, { color: t.text }]}
                      numberOfLines={1}
                    >
                      {t.name}
                    </Text>
                    {isSelected && (
                      <Check size={14} color={colors.primary} strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* 3-2. 폰트 & 글자 크기 선택 모달 (Font Picker Modal) */}
      <Modal
        visible={!fullViewerVisible && fontPickerModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFontPickerModalVisible(false)}
      >
        <View style={styles.modalCenterBackdrop}>
          <TouchableOpacity
            style={styles.modalCenterBackdropTouch}
            activeOpacity={1}
            onPress={() => setFontPickerModalVisible(false)}
          />
          <View style={styles.miniPickerCard}>
            <View style={styles.miniPickerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Type size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.miniPickerTitle}>서체 및 글자 크기 설정</Text>
              </View>
              <TouchableOpacity
                onPress={() => setFontPickerModalVisible(false)}
                style={styles.closeBtn}
              >
                <X size={18} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.miniPickerSectionTitle}>서체 선택</Text>
            <View style={styles.fontOptionRow}>
              {[
                { id: 'serif', label: '감성 명조', desc: '에세이 감성' },
                { id: 'sans', label: '모던 고딕', desc: '깔끔한 사진집' },
                { id: 'handwriting', label: '다정 손글씨', desc: '가족 일기체' },
              ].map((f) => {
                const isSelected = bookFontFamily === f.id;
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={[
                      styles.fontOptionBtn,
                      isSelected && styles.fontOptionBtnActive,
                    ]}
                    onPress={() => {
                      setBookFontFamily(f.id);
                      broadcastPhotobookChange({ bookFontFamily: f.id });
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.fontOptionLabel,
                        isSelected && styles.fontOptionLabelActive,
                      ]}
                    >
                      {f.label}
                    </Text>
                    <Text style={styles.fontOptionDesc}>{f.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.miniPickerSectionTitle, { marginTop: 14 }]}>
              글자 크기
            </Text>
            <View style={styles.fontSizeRow}>
              {[
                { id: 'small', label: '작게 (12pt)' },
                { id: 'medium', label: '보통 (14pt · 권장)' },
                { id: 'large', label: '크게 (16pt · 부모님용)' },
              ].map((s) => {
                const isSelected = bookFontSize === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.fontSizeBtn,
                      isSelected && styles.fontSizeBtnActive,
                    ]}
                    onPress={() => {
                      setBookFontSize(s.id);
                      broadcastPhotobookChange({ bookFontSize: s.id });
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.fontSizeBtnText,
                        isSelected && styles.fontSizeBtnTextActive,
                      ]}
                    >
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* 3-3. 16개 페이지 빠른 점프 그리드 모달 */}
      <Modal
        visible={!fullViewerVisible && pagePickerModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPagePickerModalVisible(false)}
      >
        <View style={styles.modalCenterBackdrop}>
          <TouchableOpacity
            style={styles.modalCenterBackdropTouch}
            activeOpacity={1}
            onPress={() => setPagePickerModalVisible(false)}
          />
          <View style={[styles.miniPickerCard, { maxWidth: 370 }]}>
            <View style={styles.miniPickerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <BookOpen size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.miniPickerTitle}>페이지 빠른 이동</Text>
              </View>
              <TouchableOpacity
                onPress={() => setPagePickerModalVisible(false)}
                style={styles.closeBtn}
              >
                <X size={18} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.pageGridIntroSub}>
              총 16페이지 낱장 중 이동할 페이지를 터치하세요:
            </Text>

            <TouchableOpacity
              style={[
                styles.pageGridCoverBanner,
                currentPageNum === 0 && styles.pageGridCoverBannerActive,
              ]}
              onPress={() => {
                handleGoToPage(0);
                setPagePickerModalVisible(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 13, marginRight: 6 }}>📘</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.pageGridCoverTitle,
                    currentPageNum === 0 && { color: colors.primary },
                  ]}
                >
                  하드커버 겉표지 (Hardcover Front)
                </Text>
                <Text style={styles.pageGridCoverSub}>
                  3대 디자인 스타일(액자형/화보형/타이포) 편집
                </Text>
              </View>
              <ChevronRight
                size={14}
                color={currentPageNum === 0 ? colors.primary : colors.text.muted}
              />
            </TouchableOpacity>

            <ScrollView style={{ maxHeight: 270 }} showsVerticalScrollIndicator={false}>
              <View style={styles.pageGridMatrix}>
                {Array.from({ length: TOTAL_PHOTOBOOK_PAGES }, (_, i) => i + 1).map(
                  (pageNum) => {
                    const isCurrent = currentPageNum === pageNum;
                    const sIdx = Math.floor((pageNum - 1) / 2);
                    const side = pageNum % 2 === 1 ? 'left' : 'right';
                    const format = getPageFormat(sIdx, side);

                    let icon = '📷';
                    let label = '사진';

                    if (format === 'photo') {
                      icon = '📷';
                      label = '사진';
                    } else if (format === 'hybrid') {
                      icon = '✨';
                      label = '사진+톡';
                    } else if (pageNum === 1) {
                      icon = '📖';
                      label = '프롤로그';
                    } else if (pageNum === 15) {
                      icon = '📊';
                      label = '리포트';
                    } else if (pageNum === TOTAL_PHOTOBOOK_PAGES) {
                      icon = '✍️';
                      label = '에필로그';
                    } else {
                      icon = '💬';
                      label = '스몰톡';
                    }

                    return (
                      <TouchableOpacity
                        key={`page-pick-${pageNum}`}
                        style={[
                          styles.pageGridCell,
                          isCurrent && styles.pageGridCellActive,
                        ]}
                        onPress={() => {
                          handleGoToPage(pageNum);
                          setPagePickerModalVisible(false);
                        }}
                        activeOpacity={0.75}
                      >
                        <View style={styles.pageGridCellTopRow}>
                          <Text style={{ fontSize: 9.5 }}>{icon}</Text>
                          <Text
                            style={[
                              styles.pageGridCellSpNum,
                              isCurrent && styles.pageGridCellSpNumActive,
                            ]}
                          >
                            P.{pageNum}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.pageGridCellPages,
                            isCurrent && styles.pageGridCellPagesActive,
                          ]}
                          numberOfLines={1}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
