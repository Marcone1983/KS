// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
};

const colors = {
  primaryGreen: '#2D7D46',
  gold: '#FFD700',
  darkBackground: '#1A1A2E',
};

// Mock ThemedView and ThemedText for web
const ThemedView: React.FC<React.PropsWithChildren<{ style?: React.CSSProperties }>> = ({ children, style }) => (
  <div style={style}>{children}</div>
);

const ThemedText: React.FC<React.PropsWithChildren<{ style?: React.CSSProperties }>> = ({ children, style }) => (
  <p style={style}>{children}</p>
);

// Mock useAsyncStorage for web
const useAsyncStorage = (key: string) => {
  return {
    getItem: async () => localStorage.getItem(key),
    setItem: async (value: string) => localStorage.setItem(key, value),
  };
};

const PremiumBadge: React.FC = () => {
  const [isPremium, setIsPremium] = useState(false);
  const { getItem, setItem } = useAsyncStorage('premiumStatus');

  useEffect(() => {
    const checkPremiumStatus = async () => {
      const storedStatus = await getItem();
      if (storedStatus) {
        setIsPremium(JSON.parse(storedStatus));
      }
    };
    checkPremiumStatus();
  }, [getItem]);

  const handlePress = () => {
    const newPremiumStatus = !isPremium;
    setIsPremium(newPremiumStatus);
    setItem(JSON.stringify(newPremiumStatus));
    if (window.navigator.vibrate) {
      window.navigator.vibrate(100);
    }
  };

  return (
    <ThemedView
      style={{
        padding: spacing.md,
        backgroundColor: colors.darkBackground,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        textAlign: 'center',
      }}
    >
      <motion.div
        onClick={handlePress}
        animate={{
          rotate: isPremium ? [0, -10, 10, -10, 0] : 0,
          scale: isPremium ? [1, 1.2, 1, 1.2, 1] : 1,
        }}
        transition={{
          duration: 1.5,
          ease: 'easeInOut',
          repeat: isPremium ? Infinity : 0,
          repeatDelay: 1,
        }}
      >
        <Crown size={48} color={isPremium ? colors.gold : 'grey'} />
      </motion.div>
      <ThemedText style={{ color: isPremium ? colors.gold : 'grey', marginTop: spacing.sm }}>
        {isPremium ? 'Premium User' : 'Standard User'}
      </ThemedText>
    </ThemedView>
  );
};

export default PremiumBadge;
