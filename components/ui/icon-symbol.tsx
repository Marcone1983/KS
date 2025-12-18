// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * SF Symbols to Material Icons mappings for KannaSprout
 */
const MAPPING = {
  // Navigation
  "house.fill": "home",
  "gamecontroller.fill": "sports-esports",
  "cart.fill": "shopping-cart",
  "person.fill": "person",
  
  // Actions
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "xmark": "close",
  "checkmark": "check",
  
  // Game
  "leaf.fill": "eco",
  "drop.fill": "water-drop",
  "bolt.fill": "bolt",
  "star.fill": "star",
  "trophy.fill": "emoji-events",
  "heart.fill": "favorite",
  "shield.fill": "shield",
  
  // Shop
  "creditcard.fill": "credit-card",
  "gift.fill": "card-giftcard",
  "bag.fill": "shopping-bag",
  
  // Settings
  "gearshape.fill": "settings",
  "bell.fill": "notifications",
  "lock.fill": "lock",
  "info.circle.fill": "info",
  
  // Premium
  "crown.fill": "workspace-premium",
  "sparkles": "auto-awesome",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const iconName = MAPPING[name] || "help-outline";
  return <MaterialIcons color={color} size={size} name={iconName} style={style} />;
}
