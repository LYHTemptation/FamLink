/**
 * FamLink Typography System (TypeScript)
 */
export const typography = {
  // Font Sizes
  size: {
    hero: 32,
    h1: 24,
    h2: 20,
    h3: 18,
    h4: 16,
    body: 14,
    sub: 13,
    caption: 12,
    tag: 11,
    tiny: 10,
    micro: 8.5,
  },

  // Font Weights
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
    black: '900' as const,
  },
} as const;

export type ThemeTypography = typeof typography;

export default typography;
