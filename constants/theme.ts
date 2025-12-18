/**
 * KannaSprout Mobile Theme
 * Cannabis-inspired green palette with gold accents for premium features
 */

import { Platform } from "react-native";

// Primary brand colors
const primaryGreen = "#2D7D46";
const secondaryGreen = "#4CAF50";
const goldAccent = "#FFD700";
const darkBackground = "#1A1A2E";
const cardSurface = "#252540";

export const Colors = {
  light: {
    text: "#11181C",
    textSecondary: "#606080",
    background: "#F5F5F5",
    tint: primaryGreen,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: primaryGreen,
    card: "#FFFFFF",
    border: "#E0E0E0",
    success: "#4CAF50",
    warning: "#FFC107",
    error: "#F44336",
    gold: goldAccent,
    premium: goldAccent,
  },
  dark: {
    text: "#FFFFFF",
    textSecondary: "#B0B0C0",
    background: darkBackground,
    tint: secondaryGreen,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: secondaryGreen,
    card: cardSurface,
    border: "#3A3A5A",
    success: "#4CAF50",
    warning: "#FFC107",
    error: "#F44336",
    gold: goldAccent,
    premium: goldAccent,
  },
};

// PayPal brand colors
export const PayPalColors = {
  blue: "#003087",
  lightBlue: "#009CDE",
  yellow: "#FFC439",
};

// Game-specific colors
export const GameColors = {
  health: {
    full: "#4CAF50",
    medium: "#FFC107",
    low: "#F44336",
  },
  ammo: {
    full: "#2196F3",
    low: "#FF9800",
    empty: "#F44336",
  },
  xp: "#9C27B0",
  gleaf: "#4CAF50",
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// Spacing system (8pt grid)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius
export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};
