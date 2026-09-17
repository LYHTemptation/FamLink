import { StyleSheet, Platform } from 'react-native';
import colors from './colors';
import typography from './typography';

/**
 * FamLink Common Reusable UI Styles
 * 모든 화면에서 중복되는 레이아웃, 헤더, 모달, 카드 공통 스타일
 */
export const commonStyles = StyleSheet.create({
  // Screen Layouts
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  flexCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  flexRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Standard Sub-header Bar
  subHeaderBar: {
    height: 64,
    paddingHorizontal: 20,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subHeaderTitle: {
    fontSize: typography.size.h2,
    fontWeight: typography.weight.extrabold,
    color: colors.text.primary,
  },
  subHeaderSub: {
    fontSize: typography.size.caption,
    color: colors.text.muted,
    marginTop: 2,
  },

  // Standard Card Styles
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  cardElevated: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  // Standard Modal Styles (Bottom Sheet & Center)
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: colors.overlayDark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBottomSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalHeaderTitle: {
    fontSize: typography.size.h3,
    fontWeight: typography.weight.extrabold,
    color: colors.text.primary,
  },
  modalInput: {
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    padding: 12,
    fontSize: typography.size.body,
    color: colors.text.primary,
    marginBottom: 14,
  },
  modalPrimaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryBtnText: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },

  // Tags & Badges
  tagPrimary: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagPrimaryText: {
    fontSize: typography.size.tiny,
    fontWeight: typography.weight.extrabold,
    color: colors.primary,
  },
});

export default commonStyles;
