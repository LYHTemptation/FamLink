import { StyleSheet, Platform } from 'react-native';
import colors from './colors';
import typography from './typography';

/**
 * FamLink Common Reusable UI Styles (Warm Cozy Living Theme)
 * 모든 화면에서 통일되게 공유하는 레이아웃, 헤더, 모달, 카드 공통 스타일
 */
export const commonStyles = StyleSheet.create({
  // 1. Screen Layouts
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 48,
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

  // 2. Standard Screen Header
  screenHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: colors.background,
  },
  screenTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screenTitle: {
    fontSize: typography.size.h1,
    fontWeight: typography.weight.extrabold,
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: typography.size.sub,
    color: colors.text.secondary,
    marginTop: 4,
    fontWeight: typography.weight.medium,
  },

  // 3. Standard Cozy Cards (곡률 20, 웜 보더 #F5F0E8)
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  cardWarm: {
    backgroundColor: colors.cardWarm,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  cardElevated: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  // 4. Standard Buttons & Inputs
  btnPrimary: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  btnPrimaryText: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },
  btnSecondary: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  btnSecondaryText: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  input: {
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    fontSize: typography.size.body,
    color: colors.text.primary,
  },

  // 5. Standard Bottom Sheet & Centered Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: colors.overlay,
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
  modalCardCenter: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeaderTitle: {
    fontSize: typography.size.h3,
    fontWeight: typography.weight.extrabold,
    color: colors.text.primary,
  },

  // 6. Tags & Pill Badges
  tagPrimary: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagPrimaryText: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  tagPurple: {
    backgroundColor: colors.petmongPurpleLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagPurpleText: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    color: colors.petmongPurple,
  },
});

export default commonStyles;
